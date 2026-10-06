import assert from 'node:assert';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { PacketAgeWatchdog } from '../src/api/utilities/packet-age-watchdog.js';
import { AV_NOPTS_VALUE, Demuxer, FMP4Stream, FormatContext } from '../src/index.js';
import { getInputFile, getOutputFile, prepareTestEnvironment, stallingFrameSource, syntheticVideoFrame } from './index.js';

import type { Encoder, FMP4Data, FMP4StreamOptions, Frame, MediaFrameSource, MP4Box, Packet } from '../src/index.js';

prepareTestEnvironment();

const inputFile = getInputFile('video.mp4');

interface FMP4StreamInternals {
  processBoxMode: (chunk: Buffer) => void;
  incompleteBoxBuffer: Buffer | null;
  pendingFragment: { raw: Buffer }[];
  endFragments: () => void;
  pipeline?: {
    isStopped(): boolean;
    stop(): void;
    completion: Promise<void>;
  };
  output?: {
    close(): Promise<void>;
  };
}

const internalsOf = (stream: FMP4Stream): FMP4StreamInternals => stream as unknown as FMP4StreamInternals;

async function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

const settle = async (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/**
 * Open a test file whose video packets jump by `shiftSeconds` after the first
 * `after` video packets, as if the source restarted its clock mid-stream. With
 * `count`, only that many packets jump and the timeline then returns, like
 * packets mapped with a stale clock reference.
 */
async function openShiftedInput(file: string, shiftSeconds: number, after = 10, count = Infinity): Promise<Demuxer> {
  const input = await Demuxer.open(getInputFile(file));
  const video = input.video()!;
  const shift = BigInt(Math.round((shiftSeconds * video.timeBase.den) / video.timeBase.num));
  const packets = input.packets.bind(input) as (index?: number) => AsyncGenerator<Packet | null>;
  let seen = 0;
  const shifted = async function* (index?: number): AsyncGenerator<Packet | null> {
    for await (const packet of packets(index)) {
      if (packet?.streamIndex === video.index && seen++ >= after && seen <= after + count) {
        if (packet.dts !== AV_NOPTS_VALUE) packet.dts += shift;
        if (packet.pts !== AV_NOPTS_VALUE) packet.pts += shift;
      }
      yield packet;
    }
  };
  (input as unknown as { packets: typeof shifted }).packets = shifted;
  return input;
}

/** How a paced test input changes from a media position on. */
interface StallShape {
  /** Media time in seconds from which the shape applies. */
  from: number;
  /** Rewrite the timestamps of every video packet from `from` on. */
  video?: (packet: Packet, index: number) => void;
  /** Rewrite the timestamps of every audio packet from `from` on. */
  audio?: (packet: Packet) => void;
  /** Drop every audio packet from `from` on, as if the stream went silent. */
  silenceAudio?: boolean;
  /** Deliver nothing for this many ms of wall-clock time at `from`, then go on at the same pace. */
  pause?: number;
}

/**
 * Open a test file whose packets are delivered at `speed` times real time, so
 * wall-clock time passes like on a live source, and whose timeline takes the
 * given shape from `shape.from` seconds on.
 */
async function openPacedInput(file: string, shape: StallShape, speed = 4): Promise<Demuxer> {
  const input = await Demuxer.open(getInputFile(file));
  const video = input.video()!;
  const audio = input.audio();
  const packets = input.packets.bind(input) as (index?: number) => AsyncGenerator<Packet | null>;
  let start = Date.now();
  let videoIndex = 0;
  let paused = false;
  const paced = async function* (index?: number): AsyncGenerator<Packet | null> {
    for await (const packet of packets(index)) {
      if (packet) {
        const stream = packet.streamIndex === video.index ? video : audio;
        const ts = packet.dts !== AV_NOPTS_VALUE ? packet.dts : packet.pts;
        const seconds = stream && ts !== AV_NOPTS_VALUE ? (Number(ts) * stream.timeBase.num) / stream.timeBase.den : 0;
        if (shape.pause && !paused && seconds >= shape.from) {
          paused = true;
          await new Promise((resolve) => setTimeout(resolve, shape.pause));
          start += shape.pause;
        }
        const wait = start + (seconds * 1000) / speed - Date.now();
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        if (seconds >= shape.from) {
          if (packet.streamIndex === video.index) {
            shape.video?.(packet, videoIndex++);
          } else if (shape.silenceAudio) {
            packet.free();
            continue;
          } else {
            shape.audio?.(packet);
          }
        }
      }
      yield packet;
    }
  };
  (input as unknown as { packets: typeof paced }).packets = paced;
  return input;
}

interface SessionResult {
  stream: FMP4Stream;
  closeCalls: (Error | undefined)[];
  fragments: number;
}

/** Run a stream-copy FMP4Stream until its first onClose, then give a second onClose time to show up. */
async function runSession(input: string | Demuxer, options: FMP4StreamOptions = {}): Promise<SessionResult> {
  const closeCalls: (Error | undefined)[] = [];
  const closed = Promise.withResolvers<void>();
  let fragments = 0;
  const stream = FMP4Stream.create(input, {
    supportedCodecs: 'avc1,mp4a.40.2',
    boxMode: true,
    fragDuration: 500_000,
    onData: (_data: Buffer, info: FMP4Data) => {
      if (info.boxes.some((b) => b.type === 'moof')) fragments++;
    },
    onClose: (error) => {
      closeCalls.push(error);
      closed.resolve();
    },
    ...options,
  });
  await stream.start();
  await withTimeout(closed.promise, 15000);
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { stream, closeCalls, fragments };
}

/** Collect unhandled rejections raised while `fn` runs (plus one macrotask). */
async function withUnhandledRejections<T>(fn: () => Promise<T>): Promise<{ result: T; rejections: unknown[] }> {
  const rejections: unknown[] = [];
  const onRejection = (reason: unknown): void => {
    rejections.push(reason);
  };
  process.on('unhandledRejection', onRejection);
  try {
    const result = await fn();
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { result, rejections };
  } finally {
    process.off('unhandledRejection', onRejection);
  }
}

function box(type: string, payload: Buffer | number): Buffer {
  const body = typeof payload === 'number' ? Buffer.alloc(payload, 0xab) : payload;
  const buf = Buffer.alloc(8 + body.length);
  buf.writeUInt32BE(8 + body.length, 0);
  buf.write(type, 4, 'ascii');
  body.copy(buf, 8);
  return buf;
}

function box64(type: string, payload: Buffer | number): Buffer {
  const body = typeof payload === 'number' ? Buffer.alloc(payload, 0xcd) : payload;
  const buf = Buffer.alloc(16 + body.length);
  buf.writeUInt32BE(1, 0);
  buf.write(type, 4, 'ascii');
  buf.writeBigUInt64BE(BigInt(16 + body.length), 8);
  body.copy(buf, 16);
  return buf;
}

function mediaFragment(marker: number): Buffer {
  return Buffer.concat([box('moof', Buffer.from([marker, 0, 0, 0])), box('mdat', Buffer.from([marker, 1, 2, 3, 4, 5]))]);
}

/** Start and duration in seconds of every video sample in an fMP4 byte stream, from its moov and moof boxes. */
function videoSamples(output: Buffer): { start: number; duration: number }[] {
  const children = (buf: Buffer): { type: string; body: Buffer }[] => {
    const list: { type: string; body: Buffer }[] = [];
    for (let offset = 0; offset + 8 <= buf.length;) {
      const size = buf.readUInt32BE(offset);
      if (size < 8 || offset + size > buf.length) break;
      list.push({ type: buf.toString('latin1', offset + 4, offset + 8), body: buf.subarray(offset + 8, offset + size) });
      offset += size;
    }
    return list;
  };
  const all = (buf: Buffer, type: string): Buffer[] => children(buf).flatMap((b) => (b.type === type ? [b.body] : []));
  const one = (buf: Buffer, type: string): Buffer => all(buf, type)[0];

  let trackId = 0;
  let timescale = 1;
  const samples: { start: number; duration: number }[] = [];
  for (const top of children(output)) {
    if (top.type === 'moov') {
      for (const trak of all(top.body, 'trak')) {
        const mdia = one(trak, 'mdia');
        if (one(mdia, 'hdlr').toString('latin1', 8, 12) !== 'vide') continue;
        const tkhd = one(trak, 'tkhd');
        const mdhd = one(mdia, 'mdhd');
        trackId = tkhd.readUInt32BE(tkhd[0] === 1 ? 20 : 12);
        timescale = mdhd.readUInt32BE(mdhd[0] === 1 ? 20 : 12);
      }
    }
    for (const traf of top.type === 'moof' ? all(top.body, 'traf') : []) {
      const tfhd = one(traf, 'tfhd');
      if (tfhd.readUInt32BE(4) !== trackId) continue;
      const tfhdFlags = tfhd.readUInt32BE(0) & 0xffffff;
      const defaultDuration = tfhdFlags & 0x8 ? tfhd.readUInt32BE(8 + (tfhdFlags & 0x1 ? 8 : 0) + (tfhdFlags & 0x2 ? 4 : 0)) : 0;
      const tfdt = one(traf, 'tfdt');
      let dts = Number(tfdt[0] === 1 ? tfdt.readBigUInt64BE(4) : tfdt.readUInt32BE(4));
      for (const trun of all(traf, 'trun')) {
        const flags = trun.readUInt32BE(0) & 0xffffff;
        const fields = [0x100, 0x200, 0x400, 0x800].filter((f) => flags & f).length;
        let offset = 8 + (flags & 0x1 ? 4 : 0) + (flags & 0x4 ? 4 : 0);
        for (let i = trun.readUInt32BE(4); i > 0; i--) {
          const duration = flags & 0x100 ? trun.readUInt32BE(offset) : defaultDuration;
          samples.push({ start: dts / timescale, duration: duration / timescale });
          dts += duration;
          offset += 4 * fields;
        }
      }
    }
  }
  return samples;
}

interface ParseResult {
  types: string[];
  sizes: number[];
  groups: string[][];
  emitted: Buffer;
  leftover: Buffer;
}

function parseChunked(full: Buffer, boundaries: number[]): ParseResult {
  const emitted: Buffer[] = [];
  const types: string[] = [];
  const sizes: number[] = [];
  const groups: string[][] = [];
  const stream = FMP4Stream.create('unused', {
    boxMode: true,
    onData: (data: Buffer, info: FMP4Data) => {
      emitted.push(Buffer.from(data));
      groups.push(info.boxes.map((b) => b.type));
      for (const b of info.boxes) {
        types.push(b.type);
        sizes.push(b.size);
      }
    },
  });
  const internals = internalsOf(stream);

  let prev = 0;
  for (const boundary of [...boundaries, full.length]) {
    if (boundary > prev) {
      internals.processBoxMode(full.subarray(prev, boundary));
      prev = boundary;
    }
  }

  // Unemitted parser state, in stream order: a fragment held back for its mdat
  // comes before the trailing partial box.
  const held = internals.pendingFragment.map((p) => Buffer.from(p.raw));
  if (internals.incompleteBoxBuffer) {
    held.push(Buffer.from(internals.incompleteBoxBuffer));
  }

  return {
    types,
    sizes,
    groups,
    emitted: Buffer.concat(emitted),
    leftover: Buffer.concat(held),
  };
}

let generatedStream: Promise<Buffer> | undefined;
async function getGeneratedStream(): Promise<Buffer> {
  generatedStream ??= (async () => {
    const chunks: Buffer[] = [];
    let onClose!: (error?: Error) => void;
    const closed = new Promise<void>((resolve, reject) => {
      onClose = (error) => (error ? reject(error) : resolve());
    });

    const stream = FMP4Stream.create(inputFile, {
      supportedCodecs: 'avc1,mp4a.40.2', // Matches input - pure stream copy
      onData: (data) => chunks.push(Buffer.from(data)),
      onClose,
    });

    await stream.start();
    await withTimeout(closed, 30000);
    await stream.stop();

    const full = Buffer.concat(chunks);
    assert.ok(full.length > 0, 'Should have generated fMP4 data');
    return full;
  })();
  return generatedStream;
}

describe('FMP4Stream', () => {
  it('reopens an input with missing video dimensions before creating the MP4 header', async (t) => {
    const originalOpen = Demuxer.open.bind(Demuxer);
    let opens = 0;
    t.mock.method(Demuxer, 'open', async (...args: Parameters<typeof Demuxer.open>) => {
      const input = await originalOpen(inputFile, args[1]);
      if (++opens === 1) {
        input.video()!.codecpar.width = 0;
        input.video()!.codecpar.height = 0;
      }
      return input;
    });
    const stream = FMP4Stream.create('rtsp://test.invalid/live', { boxMode: true });
    try {
      await stream.start();
      const init = await withTimeout(stream.initSegment);
      assert.equal(opens, 2);
      assert.ok(init.length > 0);
      assert.ok(stream.getInput()!.video()!.codecpar.width > 0);
    } finally {
      await stream.stop();
    }
  });

  it('closes the first input when the refreshed RTSP description fails', async (t) => {
    const originalOpen = Demuxer.open.bind(Demuxer);
    let firstInput: Demuxer | undefined;
    let opens = 0;
    t.mock.method(Demuxer, 'open', async () => {
      if (++opens > 1) throw new Error('refresh failed');
      firstInput = await originalOpen(inputFile);
      firstInput.video()!.codecpar.width = 0;
      firstInput.video()!.codecpar.height = 0;
      return firstInput;
    });
    const stream = FMP4Stream.create('rtsp://test.invalid/live', { boxMode: true });
    try {
      await assert.rejects(stream.start(), /refresh failed/);
      assert.equal(opens, 2);
      assert.equal(firstInput!.isInputOpen, false);
    } finally {
      await stream.stop();
    }
  });

  describe('box parser', () => {
    it('should produce identical output for pathological chunkings of a real stream', async () => {
      const full = await getGeneratedStream();

      // Baseline: the entire stream in one giant chunk
      const baseline = parseChunked(full, []);
      assert.ok(baseline.types.includes('ftyp'), 'Should parse ftyp');
      assert.ok(baseline.types.includes('moov'), 'Should parse moov');
      assert.ok(baseline.types.includes('moof'), 'Should parse moof');
      assert.equal(baseline.leftover.length, 0, 'Complete stream should leave no leftover');
      assert.ok(baseline.emitted.equals(full), 'Parser must emit every byte');

      const firstBoxSize = full.readUInt32BE(0);
      const chunkings: { name: string; boundaries: number[] }[] = [];

      // Split inside the second box header at every offset 1..7
      for (let k = 1; k <= 7; k++) {
        chunkings.push({ name: `header split +${k}`, boundaries: [firstBoxSize + k] });
      }

      // Split inside a box body
      chunkings.push({ name: 'body split', boundaries: [firstBoxSize + 20] });

      // Fixed-size chunks (typical live write splits)
      for (const size of [999, 1000, 4096]) {
        const boundaries: number[] = [];
        for (let off = size; off < full.length; off += size) {
          boundaries.push(off);
        }
        chunkings.push({ name: `${size}-byte chunks`, boundaries });
      }

      for (const { name, boundaries } of chunkings) {
        const result = parseChunked(full, boundaries);
        assert.deepEqual(result.types, baseline.types, `${name}: box types must match baseline`);
        assert.deepEqual(result.sizes, baseline.sizes, `${name}: box sizes must match baseline`);
        assert.ok(result.emitted.equals(baseline.emitted), `${name}: emitted bytes must match baseline`);
        assert.equal(result.leftover.length, 0, `${name}: no bytes may be left over`);

        // Fragment alignment: no split may ever separate a moof from its mdat
        for (const group of result.groups) {
          if (group.includes('moof')) {
            assert.ok(group.includes('mdat'), `${name}: a moof emission must carry its mdat (got [${group.join(' ')}])`);
          }
          assert.ok(!(group.includes('mdat') && !group.includes('moof')), `${name}: no standalone mdat emission (got [${group.join(' ')}])`);
        }
      }
    });

    it('should lose zero bytes when fed byte-by-byte', async () => {
      const full = await getGeneratedStream();
      // Byte-by-byte over a truncated prefix (keeps runtime bounded); the last
      // box is intentionally cut so the leftover path is exercised too.
      const truncated = full.subarray(0, Math.min(full.length - 1, 20000));

      const baseline = parseChunked(truncated, []);
      const boundaries = Array.from({ length: truncated.length - 1 }, (_, i) => i + 1);
      const byteByByte = parseChunked(truncated, boundaries);

      assert.deepEqual(byteByByte.types, baseline.types, 'Box types must match giant-chunk parse');
      assert.ok(byteByByte.emitted.equals(baseline.emitted), 'Emitted bytes must match giant-chunk parse');
      assert.ok(byteByByte.leftover.equals(baseline.leftover), 'Leftover bytes must match giant-chunk parse');
      assert.ok(Buffer.concat([byteByByte.emitted, byteByByte.leftover]).equals(truncated), 'emitted + leftover must reconstruct the input');
    });

    it('should parse 64-bit boxes (size == 1 with largesize) across any split', () => {
      const payload = Buffer.alloc(100, 0x42);
      const synthetic = Buffer.concat([box('ftyp', 16), box('moov', 32), box('moof', 24), box64('mdat', payload), box('moof', 24), box('mdat', 40)]);

      const baseline = parseChunked(synthetic, []);
      assert.deepEqual(baseline.types, ['ftyp', 'moov', 'moof', 'mdat', 'moof', 'mdat']);
      assert.equal(baseline.sizes[3], 116, '64-bit mdat size should include the 16-byte header');
      assert.equal(baseline.leftover.length, 0);
      assert.ok(baseline.emitted.equals(synthetic));

      // Byte-by-byte covers every split position, including inside the 16-byte header
      const boundaries = Array.from({ length: synthetic.length - 1 }, (_, i) => i + 1);
      const byteByByte = parseChunked(synthetic, boundaries);
      assert.deepEqual(byteByByte.types, baseline.types);
      assert.deepEqual(byteByByte.sizes, baseline.sizes);
      assert.ok(byteByByte.emitted.equals(baseline.emitted));
      assert.equal(byteByByte.leftover.length, 0);
    });
  });

  describe('fragment alignment', () => {
    it('holds a moof until its mdat arrives when the write splits between them', () => {
      const groups: string[][] = [];
      const stream = FMP4Stream.create('unused', {
        boxMode: true,
        onData: (_data: Buffer, info: FMP4Data) => groups.push(info.boxes.map((b) => b.type)),
      });
      const internals = internalsOf(stream);

      const moof = box('moof', 24);
      const mdat = box('mdat', 5000);

      // avio flush boundary right after the moof (the split observed with
      // fragments larger than the muxer buffer)
      internals.processBoxMode(moof);
      assert.deepEqual(groups, [], 'A bare moof must not be emitted');
      assert.equal(internals.pendingFragment.length, 1, 'The moof must be held');

      // mdat body arrives in several chunks
      internals.processBoxMode(mdat.subarray(0, 2000));
      internals.processBoxMode(mdat.subarray(2000, 4000));
      assert.deepEqual(groups, [], 'A partial mdat must not trigger an emission');
      internals.processBoxMode(mdat.subarray(4000));

      assert.deepEqual(groups, [['moof', 'mdat']], 'moof and mdat must be emitted as one fragment');
    });

    it('emits fragment-aligned onData for a real stream with a tiny I/O buffer', async () => {
      const groups: string[][] = [];
      let onClose!: (error?: Error) => void;
      const closed = new Promise<void>((resolve, reject) => {
        onClose = (error) => (error ? reject(error) : resolve());
      });

      const stream = FMP4Stream.create(inputFile, {
        supportedCodecs: 'avc1,mp4a.40.2', // Stream copy
        boxMode: true,
        // Far below the fragment size: every fragment is split across many
        // avio flushes. Regression: consumers received a bare moof followed
        // by a detached mdat and could not play the fragment.
        bufferSize: 4096,
        onData: (_data: Buffer, info: FMP4Data) => groups.push(info.boxes.map((b) => b.type)),
        onClose,
      });

      await stream.start();
      await withTimeout(closed, 30000);
      await stream.stop();

      const fragmentGroups = groups.filter((g) => g.includes('moof'));
      assert.ok(fragmentGroups.length > 1, 'Should emit multiple media fragments');
      for (const group of fragmentGroups) {
        assert.ok(group.includes('mdat'), `Every fragment emission must carry its mdat (got [${group.join(' ')}])`);
      }
      assert.ok(!groups.some((g) => g.includes('mdat') && !g.includes('moof')), 'No standalone mdat may be emitted');
    });
  });

  describe('stalled frame source', () => {
    it('should stop when the frame source goes silent', async () => {
      const silent = Promise.withResolvers<void>();
      const stream = FMP4Stream.create(
        { video: stallingFrameSource(20, () => silent.resolve()) },
        {
          supportedCodecs: 'avc1',
          fragDuration: 1_000_000,
          video: { fps: 30, encoderOptions: { preset: 'ultrafast', tune: 'zerolatency' } },
          onData: () => {
            // drop
          },
          // Surface a pipeline failure as itself instead of as an opaque timeout.
          onClose: (error) => {
            if (error) silent.reject(error);
          },
        },
      );

      await stream.start();

      // Wait for the source to actually stall instead of guessing a delay: a
      // loaded runner needs longer to pull the frames, and stopping before the
      // source went silent would exercise nothing.
      await withTimeout(silent.promise, 30000);

      // A frame source has no demuxer for stop() to interrupt. Without an
      // interruptible pull the completion barrier in stop() never settles, so
      // the bound only has to separate "returns" from "hangs forever".
      await withTimeout(stream.stop(), 10000);
    });
  });

  describe('stop during start', () => {
    it('never leaves an orphaned pipeline producing data after stop() returned', async () => {
      for (const delayMs of [0, 1, 5]) {
        let dataAfterStop = 0;
        let stopped = false;
        const lateBoxes: string[] = [];

        const stream = FMP4Stream.create(inputFile, {
          supportedCodecs: 'avc1,mp4a.40.2',
          boxMode: true,
          onData: (_data: Buffer, info: FMP4Data) => {
            if (stopped) {
              dataAfterStop++;
              lateBoxes.push(info.boxes.map((b) => b.type).join('+'));
            }
          },
        });

        const startPromise = stream.start().catch(() => {});
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        await stream.stop();
        stopped = true;
        await startPromise;

        // an orphaned pipeline would keep emitting here
        await new Promise((resolve) => setTimeout(resolve, 250));
        const s = stream as unknown as Record<string, unknown>;
        const state = [
          `pipeline=${!!s.pipeline}`,
          `input=${!!s.input}`,
          `output=${!!s.output}`,
          `startPromise=${!!s.startPromise}`,
          `stopPromise=${!!s.stopPromise}`,
          `lateBoxes=[${lateBoxes.join(' | ')}]`,
        ].join(' ');
        assert.equal(dataAfterStop, 0, `stop() after ${delayMs}ms must not leave a running pipeline (${state})`);
      }
    });

    it('remains restartable after a stop that aborted the startup', async () => {
      const stream = FMP4Stream.create(inputFile, {
        supportedCodecs: 'avc1,mp4a.40.2',
        boxMode: true,
      });

      const first = stream.start().catch(() => {});
      await stream.stop();
      await first;

      // fresh start must run through to a working stream
      let sawFragment!: () => void;
      const fragment = new Promise<void>((resolve) => (sawFragment = resolve));
      (stream as unknown as { options: { onData: (d: Buffer, i: FMP4Data) => void } }).options.onData = (_d, info) => {
        if (info.boxes.some((b) => b.type === 'moof')) sawFragment();
      };

      await stream.start();
      await withTimeout(fragment, 15000);
      await stream.stop();
    });

    it('shares one teardown between concurrent stop() calls', async () => {
      const stream = FMP4Stream.create(inputFile, {
        supportedCodecs: 'avc1,mp4a.40.2',
        boxMode: true,
      });
      await stream.start();
      await Promise.all([stream.stop(), stream.stop(), stream.stop()]);
    });

    it('waits for an already-stopped pipeline before closing native resources', async () => {
      const stream = FMP4Stream.create('unused', { boxMode: true });
      const internals = internalsOf(stream);
      let completePipeline!: () => void;
      const completion = new Promise<void>((resolve) => {
        completePipeline = resolve;
      });
      let outputClosed = false;

      internals.pipeline = {
        isStopped: () => true,
        stop: () => assert.fail('an already-stopped pipeline must not be stopped twice'),
        completion,
      };
      internals.output = {
        close: async () => {
          outputClosed = true;
        },
      };

      const stopping = stream.stop();
      await settle();
      assert.equal(outputClosed, false, 'native output was closed while the pipeline was still unwinding');

      completePipeline();
      await stopping;
      assert.equal(outputClosed, true, 'native output should close after pipeline completion');
      assert.equal(internals.pipeline, undefined, 'completed pipeline reference should be cleared');
    });
  });

  describe('initSegment', () => {
    it('should resolve with ftyp+moov even when the header is split', () => {
      const ftyp = box('ftyp', 16);
      const moov = box('moov', 64);
      const init = Buffer.concat([ftyp, moov]);

      const stream = FMP4Stream.create('unused', { boxMode: true });
      const internals = internalsOf(stream);

      // Split inside the moov header
      internals.processBoxMode(init.subarray(0, ftyp.length + 3));
      internals.processBoxMode(init.subarray(ftyp.length + 3));

      return withTimeout(stream.initSegment).then((segment) => {
        assert.ok(segment.equals(init), 'Init segment should be exact ftyp+moov bytes');
      });
    });

    it('should reject on stop() before init segment', async () => {
      const stream = FMP4Stream.create('unused', { boxMode: true });
      const pending = stream.initSegment;

      await stream.stop();

      await assert.rejects(withTimeout(pending), /stopped before init segment/);
    });

    it('should reject when the pipeline fails to start', async () => {
      const stream = FMP4Stream.create('/nonexistent/path/does-not-exist.mp4', { boxMode: true });
      const pending = stream.initSegment;

      await assert.rejects(stream.start(), 'start() should fail for missing input');
      await assert.rejects(withTimeout(pending), 'initSegment should reject instead of hanging');
    });

    it('should throw when boxMode is disabled', () => {
      const stream = FMP4Stream.create('unused', { boxMode: false });
      assert.throws(() => stream.initSegment, /only available in box mode/);
    });
  });

  describe('fragments', () => {
    it('should bound the queue by dropping oldest fragments while retaining the init segment', async () => {
      const ftyp = box('ftyp', 16);
      const moov = box('moov', 64);
      const init = Buffer.concat([ftyp, moov]);

      const stream = FMP4Stream.create('unused', { boxMode: true, maxQueuedFragments: 3 });
      const internals = internalsOf(stream);

      // Init segment arrives first (never enters the fragment queue)
      internals.processBoxMode(init);

      const gen = stream.fragments();
      const firstPending = gen.next();
      await settle(); // Let the generator register its queue

      // First fragment is delivered directly to the waiting consumer
      internals.processBoxMode(mediaFragment(1));
      const first = await withTimeout(firstPending);
      assert.ok(!first.done, 'First fragment should be delivered');
      assert.equal(first.value.data.readUInt8(8), 1, 'First fragment should carry marker 1');

      // Consumer stalls while 6 more fragments arrive; bound is 3 -> 2,3,4 dropped
      for (let marker = 2; marker <= 7; marker++) {
        internals.processBoxMode(mediaFragment(marker));
      }
      assert.equal(stream.droppedFragments, 3, 'Oldest fragments should be dropped and counted');

      // Init segment survives the drops
      const segment = await withTimeout(stream.initSegment);
      assert.ok(segment.equals(init), 'Init segment must never be dropped');

      // Consumer resumes with the newest fragments
      const markers: number[] = [];
      for (let i = 0; i < 3; i++) {
        const result = await withTimeout(gen.next());
        assert.ok(!result.done, 'Queued fragment should be delivered');
        markers.push(result.value.data.readUInt8(8));
      }
      assert.deepEqual(markers, [5, 6, 7], 'Consumer should resume with the newest fragments');

      internals.endFragments();
      const end = await withTimeout(gen.next());
      assert.equal(end.done, true);
    });

    it('should throw on a concurrent second consumer', async () => {
      const stream = FMP4Stream.create('unused', { boxMode: true });
      const internals = internalsOf(stream);

      const gen1 = stream.fragments();
      const pending = gen1.next();
      await settle();

      const gen2 = stream.fragments();
      await assert.rejects(gen2.next(), /single consumer/);

      // First consumer is unaffected
      internals.processBoxMode(mediaFragment(9));
      const result = await withTimeout(pending);
      assert.ok(!result.done, 'First consumer should still receive fragments');
      assert.equal(result.value.data.readUInt8(8), 9);

      await gen1.return();
    });

    it('should allow a new consumer after the previous iterator finished', async () => {
      const stream = FMP4Stream.create('unused', { boxMode: true });
      const internals = internalsOf(stream);

      const gen1 = stream.fragments();
      const pending = gen1.next();
      await settle();
      internals.endFragments();
      const end = await withTimeout(pending);
      assert.equal(end.done, true);

      // Previous iterator completed - a fresh one must be accepted
      const gen2 = stream.fragments();
      const pending2 = gen2.next();
      await settle();
      internals.processBoxMode(mediaFragment(5));
      const result = await withTimeout(pending2);
      assert.equal(result.done, false);
      await gen2.return();
    });
  });

  describe('stop and restart', () => {
    it('should reset parser state on stop() so a restart parses cleanly', async () => {
      const types: string[] = [];
      const stream = FMP4Stream.create('unused', {
        boxMode: true,
        onData: (_data: Buffer, info: FMP4Data) => {
          for (const b of info.boxes) types.push(b.type);
        },
      });
      const internals = internalsOf(stream);

      // Feed ftyp plus a truncated moov - parser now holds an incomplete box
      const ftyp = box('ftyp', 16);
      const moov = box('moov', 64);
      internals.processBoxMode(Buffer.concat([ftyp, moov.subarray(0, 10)]));
      assert.ok(internals.incompleteBoxBuffer, 'Parser should hold the truncated box');
      assert.deepEqual(types, ['ftyp']);

      await stream.stop();
      assert.equal(internals.incompleteBoxBuffer, null, 'stop() must reset the parser state');

      // Restart: a clean stream must parse from the very first byte
      types.length = 0;
      internals.processBoxMode(Buffer.concat([ftyp, moov, mediaFragment(1)]));
      assert.deepEqual(types, ['ftyp', 'moov', 'moof', 'mdat'], 'Restart should produce clean boxes');
    });
  });

  describe('fragDuration', () => {
    it('should control fragment cadence via the muxer frag_duration option', async () => {
      const countMoofs = async (fragDuration: number): Promise<number> => {
        const boxes: MP4Box[] = [];
        let onClose!: (error?: Error) => void;
        const closed = new Promise<void>((resolve, reject) => {
          onClose = (error) => (error ? reject(error) : resolve());
        });

        const stream = FMP4Stream.create(inputFile, {
          supportedCodecs: 'avc1,mp4a.40.2', // Stream copy
          boxMode: true,
          fragDuration,
          // No frag_keyframe so frag_duration is the only fragment cutter
          movFlags: '+separate_moof+default_base_moof+empty_moov',
          onData: (_data: Buffer, info: FMP4Data) => boxes.push(...info.boxes),
          onClose,
        });

        await stream.start();
        await withTimeout(closed, 30000);
        await stream.stop();

        return boxes.filter((b) => b.type === 'moof').length;
      };

      // 5 second input: 500ms fragments must produce more moofs than 2.5s fragments
      const smallFragments = await countMoofs(500000);
      const largeFragments = await countMoofs(2500000);

      assert.ok(largeFragments >= 1, 'Should produce at least one fragment');
      assert.ok(smallFragments > largeFragments, `Smaller fragDuration must yield more fragments (got ${smallFragments} vs ${largeFragments})`);
    });
  });

  describe('transcode keyframe cadence', () => {
    // hevc-short.mp4: 320x240, 15fps, 4s, single keyframe (long GOP in the source).
    // Transcoding to H.264 must bound the encoder GOP to the fragment duration so
    // every fMP4 fragment starts with a keyframe - otherwise frag_duration cuts
    // fragments mid-GOP on a P-frame and strict consumers reject them.
    // Regression test for the missing gopSize on the demuxer transcode path.
    it('bounds the encoder GOP to the fragment duration when transcoding', async () => {
      const hevcInput = getInputFile('hevc-short.mp4');
      const outputFile = getOutputFile('fmp4-keyframe-cadence.mp4');

      const chunks: Buffer[] = [];
      let onClose!: (error?: Error) => void;
      const closed = new Promise<void>((resolve, reject) => {
        onClose = (error) => (error ? reject(error) : resolve());
      });

      const stream = FMP4Stream.create(hevcInput, {
        supportedCodecs: 'avc1.640029', // H.264 only -> HEVC source is transcoded
        boxMode: true,
        fragDuration: 1_000_000, // 1s; source GOP would otherwise be ~250 frames
        movFlags: 'frag_keyframe+empty_moov+default_base_moof',
        onData: (data) => chunks.push(Buffer.from(data)),
        onClose,
      });

      await stream.start();
      await withTimeout(closed, 30000);
      await stream.stop();

      writeFileSync(outputFile, Buffer.concat(chunks));

      try {
        const keyframeTimes: number[] = [];
        await using media = await Demuxer.open(outputFile);
        const videoStream = media.video();
        assert.ok(videoStream, 'transcoded output has a video stream');
        const tb = videoStream.timeBase;

        for await (using packet of media.packets(videoStream.index)) {
          if (!packet) continue;
          if (packet.isKeyframe && packet.pts !== null) {
            keyframeTimes.push((Number(packet.pts) * tb.num) / tb.den);
          }
        }

        // 4s of video at 1s fragments -> ~4 keyframes. Without the GOP fix the
        // encoder keeps the 250-frame default and emits a single keyframe.
        assert.ok(keyframeTimes.length >= 3, `Expected keyframes at the fragment cadence, got ${keyframeTimes.length}: ${keyframeTimes.join(', ')}`);

        // Consecutive keyframes must be roughly one fragment apart, not one long GOP.
        for (let i = 1; i < keyframeTimes.length; i++) {
          const gap = keyframeTimes[i] - keyframeTimes[i - 1];
          assert.ok(gap <= 2, `Keyframe interval ${gap.toFixed(2)}s exceeds the fragment duration (GOP not bounded)`);
        }
      } finally {
        if (existsSync(outputFile)) unlinkSync(outputFile);
      }
    });

    it('sets the encoder GOP to the fragment duration, and to 2 s when fragments are shorter than 0.5 s', async () => {
      const gopOf = async (input: string | MediaFrameSource, options: FMP4StreamOptions): Promise<number | undefined> => {
        let gop: number | undefined;
        const closed = Promise.withResolvers<void>();
        const stream: FMP4Stream = FMP4Stream.create(input, {
          supportedCodecs: 'avc1.640029',
          ...options,
          // The encoder applies its settings on the first frame, before the first output.
          onData: () => {
            gop ??= (stream as unknown as { videoEncoder?: Encoder }).videoEncoder?.getCodecContext()?.gopSize;
          },
          onClose: (error) => (error ? closed.reject(error) : closed.resolve()),
        });
        await stream.start();
        await withTimeout(closed.promise, 30000);
        await stream.stop();
        return gop;
      };
      const frames = async function* (): AsyncGenerator<Frame> {
        for (let i = 0; i < 10; i++) yield syntheticVideoFrame(i);
      };

      // hevc-short.mp4 runs at 15 fps, a frame source at the 30 fps default. The default
      // fragDuration of 1 µs flushes after every frame and used to make every frame a keyframe,
      // and fragments of a few frames made nearly every frame one.
      for (const [label, options, fileGop, framesGop] of [
        ['default', {}, 30, 60],
        ['0', { fragDuration: 0 }, 30, 60],
        ['0.4 s', { fragDuration: 400_000 }, 30, 60],
        ['0.5 s', { fragDuration: 500_000 }, 8, 15],
        ['4 s', { fragDuration: 4_000_000 }, 60, 120],
      ] as const) {
        assert.equal(await gopOf(getInputFile('hevc-short.mp4'), options), fileGop, `transcoded input, fragDuration ${label}`);
        assert.equal(await gopOf({ video: frames() }, options), framesGop, `frame source, fragDuration ${label}`);
      }
    });
  });

  describe('timestamp discontinuities', () => {
    for (const [label, file] of [
      ['two streams, background write queue', 'video.mp4'],
      ['one stream, direct write', 'test.mp4'],
    ] as const) {
      it(`ends with exactly one onClose(error) and releases the input on an 11s backward jump (${label})`, async () => {
        const { result, rejections } = await withUnhandledRejections(async () => {
          const input = await openShiftedInput(file, -11);
          const session = await runSession(input);
          return { ...session, input };
        });
        const { stream, closeCalls, input } = result;

        assert.equal(closeCalls.length, 1, 'onClose must fire exactly once');
        assert.match(closeCalls[0]?.message ?? '', /Timestamp discontinuity on output stream \d+: DTS jumped back 10\.9\d{2}s, more than dtsBackwardThreshold \(10s\)/);
        assert.equal(input.isInputOpen, false, 'the input must be closed before onClose');
        const s = stream as unknown as Record<string, unknown>;
        assert.deepEqual([s.input, s.output, s.pipeline], [undefined, undefined, undefined], 'no resource may outlive the failed session');
        await withTimeout(stream.stop(), 5000);
        assert.equal(rejections.length, 0, `unhandled rejections: ${String(rejections[0])}`);
      });
    }

    it('skips the trailer when a session fails, and writes it when the session ends cleanly', async () => {
      const original: (this: FormatContext) => Promise<number> = Reflect.get(FormatContext.prototype, 'writeTrailer');
      let trailers = 0;
      FormatContext.prototype.writeTrailer = async function (this: FormatContext): Promise<number> {
        trailers++;
        return original.call(this);
      };
      try {
        const failed = await runSession(await openShiftedInput('video.mp4', -11));
        assert.match(failed.closeCalls[0]?.message ?? '', /DTS jumped back/);
        await failed.stream.stop();
        assert.equal(trailers, 0, 'the output of a failed session is discarded, trailer included');

        const clean = await runSession(inputFile);
        assert.deepEqual(clean.closeCalls, [undefined]);
        await clean.stream.stop();
        assert.equal(trailers, 1);
      } finally {
        FormatContext.prototype.writeTrailer = original;
      }
    });

    it('clamps a 9s backward jump and ends cleanly', async () => {
      const input = await openShiftedInput('video.mp4', -9);
      const { stream, closeCalls } = await runSession(input);
      assert.deepEqual(closeCalls, [undefined]);
      await stream.stop();
    });

    it('clamps an 11s backward jump when dtsBackwardThreshold is 0', async () => {
      const input = await openShiftedInput('video.mp4', -11);
      const { stream, closeCalls } = await runSession(input, { dtsBackwardThreshold: 0 });
      assert.deepEqual(closeCalls, [undefined]);
      await stream.stop();
    });

    for (const [label, file] of [
      ['two streams, background write queue', 'video.mp4'],
      ['one stream, direct write', 'test.mp4'],
    ] as const) {
      it(`ends with onClose(error) instead of aborting on a forward step mp4 cannot store (${label})`, async () => {
        // 200000s is past INT_MAX ticks at the 1/12288 and 1/15360 output time bases
        const { result, rejections } = await withUnhandledRejections(async () => {
          const input = await openShiftedInput(file, 200_000);
          return { ...(await runSession(input)), input };
        });
        const { stream, closeCalls, input } = result;
        assert.equal(closeCalls.length, 1, 'onClose must fire exactly once');
        assert.match(closeCalls[0]?.message ?? '', /Timestamp discontinuity on output stream \d+: DTS jumped forward \d+ ticks/);
        assert.equal(input.isInputOpen, false, 'the input must be closed before onClose');
        await withTimeout(stream.stop(), 5000);
        assert.equal(rejections.length, 0, `unhandled rejections: ${String(rejections[0])}`);
      });
    }

    for (const [label, fragDuration] of [
      ['fragments cut at keyframes', 0],
      ['default fragments', 1],
    ] as const) {
      for (const boxMode of [true, false]) {
        it(`emits nothing the muxer still held when a session fails (${label}, ${boxMode ? 'box' : 'chunk'} mode)`, async () => {
          // Six video packets 1800s ahead, then the timeline returns and the backward check ends the session.
          const input = await openShiftedInput('video.mp4', 1800, 39, 6);
          const output: Buffer[] = [];
          const { stream, closeCalls } = await runSession(input, { boxMode, fragDuration, onData: (data: Buffer) => output.push(Buffer.from(data)) });
          assert.match(closeCalls[0]?.message ?? '', /DTS jumped back 1799\.9\d+s/);

          const samples = videoSamples(Buffer.concat(output));
          assert.ok(samples.length > 0, 'the video before the jump must be emitted');
          assert.deepEqual(
            samples.filter((s) => s.start >= 10),
            [],
            'no sample placed ahead by the jump may reach onData',
          );
          // With a fragment duration, the audio closes a fragment while the first packet ahead waits
          // in the muxer, and movenc takes the last video sample's duration from that packet: the
          // sample spanning the jump has left before the session fails. Keyframe cuts keep it queued.
          if (fragDuration === 0) {
            assert.deepEqual(
              samples.filter((s) => s.duration >= 10),
              [],
              'no sample may span the jump',
            );
          }
          await stream.stop();
        });
      }
    }

    for (const [label, fragDuration] of [
      ['fragments cut at keyframes', 0],
      ['default fragments', 1],
    ] as const) {
      for (const [jump, both] of [
        ['a forward jump of the video', false],
        ['an equal forward jump of both streams', true],
      ] as const) {
        it(`leaves no sample spanning ${jump} that the forward check rejects (${label})`, async () => {
          // Read in real time (4x) so both streams reach the jump together, as from a live source.
          const shift = (packet: Packet): void => {
            const tb = input.streams[packet.streamIndex].timeBase;
            const ticks = BigInt(Math.round((1800 * tb.den) / tb.num));
            packet.dts += ticks;
            packet.pts += ticks;
          };
          const input = await openPacedInput('video.mp4', { from: 2, video: shift, audio: both ? shift : undefined });
          const output: Buffer[] = [];
          const { stream, closeCalls } = await runSession(input, { fragDuration, dtsForwardThreshold: 10, onData: (data: Buffer) => output.push(Buffer.from(data)) });
          assert.equal(closeCalls.length, 1, 'onClose must fire exactly once');
          assert.match(closeCalls[0]?.message ?? '', /DTS jumped forward 1800\.\d{3}s while \d+\.\d{3}s passed, more than dtsForwardThreshold \(10s\)/);

          // Unlike the backward check above, the jump never reaches libavformat, so movenc
          // cannot take it as the duration of the last sample before it.
          const samples = videoSamples(Buffer.concat(output));
          assert.ok(samples.length > 0, 'the video before the jump must be emitted');
          assert.deepEqual(
            samples.filter((s) => s.start >= 10 || s.duration >= 10),
            [],
            'no sample may span or follow the jump',
          );
          await stream.stop();
        });
      }
    }

    it('still emits the muxer backlog and trailer on a deliberate stop', async () => {
      const input = await openPacedInput('video.mp4', { from: Infinity });
      const afterStop: string[] = [];
      let stopping = false;
      const stream = FMP4Stream.create(input, {
        supportedCodecs: 'avc1,mp4a.40.2',
        boxMode: true,
        fragDuration: 0,
        onData: (_data: Buffer, info: FMP4Data) => {
          if (stopping) afterStop.push(...info.boxes.map((b) => b.type));
        },
      });
      await stream.start();
      await new Promise((resolve) => setTimeout(resolve, 400));
      stopping = true;
      await withTimeout(stream.stop(), 5000);
      assert.ok(afterStop.includes('moof'), `the open fragment must be flushed, got [${afterStop.join(', ')}]`);
      assert.equal(afterStop.at(-1), 'mfra', 'the trailer must be written');
    });

    it('runs a fresh session normally after a failed one', async () => {
      const failed = await runSession(await openShiftedInput('video.mp4', -11));
      assert.ok(failed.closeCalls[0], 'the first session must fail');

      const fresh = await runSession(inputFile);
      assert.deepEqual(fresh.closeCalls, [undefined]);
      assert.ok(fresh.fragments > 0, 'the fresh session must produce fragments');
      await fresh.stream.stop();
    });

    it('rejects an invalid dtsBackwardThreshold', () => {
      for (const value of [-1, NaN, Infinity]) {
        assert.throws(() => FMP4Stream.create(inputFile, { dtsBackwardThreshold: value }), RangeError);
      }
    });

    it('checks forward jumps by default only for live inputs', async () => {
      const thresholdOf = (input: string | Demuxer | MediaFrameSource, options: FMP4StreamOptions = {}): number =>
        (FMP4Stream.create(input, options) as unknown as { options: { dtsForwardThreshold: number } }).options.dtsForwardThreshold;

      const live = [
        'rtsp://127.0.0.1/cam',
        'RTSP://cam/stream?video',
        'rtmp://host/app',
        'rtp://127.0.0.1:5004',
        'udp://0.0.0.0:1234',
        'srt://host:9000',
        'tcp://host:1',
        'sctp://host:1',
        'rtsps://unifi:7441/stream',
        'rtmps://host/app',
        'rtmpt://host/app',
        'rtmpe://host/app',
        'rtmpte://host/app',
        'rtmpts://host/app',
        'srtp://127.0.0.1:5004',
        'tls://host:1',
      ];
      assert.deepEqual(
        live.map((url) => thresholdOf(url)),
        live.map(() => 10),
      );
      // Live inputs also get the low-latency input options.
      const inputOptionsOf = (url: string): Record<string, unknown> =>
        (FMP4Stream.create(url) as unknown as { inputOptions: { options: Record<string, unknown> } }).inputOptions.options;
      assert.deepEqual(
        live.map((url) => inputOptionsOf(url).fflags),
        live.map(() => 'nobuffer'),
      );
      await using demuxer = await Demuxer.open(inputFile);
      const notLive: (string | Demuxer | MediaFrameSource)[] = [
        inputFile,
        'https://host/video.mp4',
        'http://host/live.m3u8',
        'rtmpx://host/app',
        'file:rtsp.mp4',
        demuxer,
        { video: stallingFrameSource(0, () => {}) },
      ];
      assert.deepEqual(
        notLive.map((input) => thresholdOf(input)),
        notLive.map(() => 0),
      );
      assert.equal(thresholdOf(inputFile, { dtsForwardThreshold: 5 }), 5);
      assert.equal(thresholdOf('rtsp://127.0.0.1/cam', { dtsForwardThreshold: 0 }), 0);
      for (const value of [-1, NaN, Infinity]) {
        assert.throws(() => FMP4Stream.create('rtsp://127.0.0.1/cam', { dtsForwardThreshold: value }), /^RangeError: dtsForwardThreshold must be/);
      }
    });

    for (const [label, file, from] of [
      ['two streams, background write queue', 'video.mp4', 2],
      ['one stream, direct write', 'test.mp4', 0.5],
    ] as const) {
      for (const boxMode of [true, false]) {
        it(`ends with exactly one onClose(error) on a forward jump of a source read in real time (${label}, ${boxMode ? 'box' : 'chunk'} mode)`, async () => {
          // Delivered at 4x real time: every step runs ahead by 3/4 of a frame, a jump by 1800 s.
          const input = await openPacedInput(file, {
            from,
            video: (packet: Packet) => {
              const shift = 1800n * BigInt(input.video()!.timeBase.den);
              packet.dts += shift;
              packet.pts += shift;
            },
          });
          const output: Buffer[] = [];
          const { result, rejections } = await withUnhandledRejections(async () =>
            runSession(input, { boxMode, dtsForwardThreshold: 10, onData: (data: Buffer) => output.push(Buffer.from(data)) }),
          );
          const { stream, closeCalls } = result;

          assert.equal(closeCalls.length, 1, 'onClose must fire exactly once');
          assert.match(
            closeCalls[0]?.message ?? '',
            /^Timestamp discontinuity on output stream \d: DTS jumped forward 1800\.0\d\ds while \d+\.\d{3}s passed, more than dtsForwardThreshold \(10s\)$/,
          );
          assert.equal(input.isInputOpen, false, 'the input must be closed before onClose');
          if (boxMode) {
            const samples = videoSamples(Buffer.concat(output));
            assert.ok(samples.length > 0, 'the video before the jump must be emitted');
            assert.deepEqual(
              samples.filter((s) => s.start >= 10 || s.duration >= 10),
              [],
              'no sample may span or follow the jump',
            );
          }
          await withTimeout(stream.stop(), 5000);
          assert.equal(rejections.length, 0, `unhandled rejections: ${String(rejections[0])}`);
        });
      }
    }

    it('runs a session read in real time to the end with the forward check on, also across a pause', async () => {
      for (const shape of [{ from: Infinity }, { from: 1, pause: 3000 }]) {
        const input = await openPacedInput('video.mp4', shape);
        const { stream, closeCalls, fragments } = await runSession(input, { dtsForwardThreshold: 10 });
        assert.deepEqual(closeCalls, [undefined], `shape ${JSON.stringify(shape)}`);
        assert.ok(fragments > 0);
        await stream.stop();
      }
    });

    it('leaves a forward jump of a file to the muxer by default', async () => {
      const input = await openShiftedInput('test.mp4', 1800);
      const output: Buffer[] = [];
      const { stream, closeCalls } = await runSession(input, { onData: (data: Buffer) => output.push(Buffer.from(data)) });
      assert.deepEqual(closeCalls, [undefined]);
      assert.ok(
        videoSamples(Buffer.concat(output)).some((s) => s.duration >= 1799),
        'without the check the step stays in the timeline',
      );
      await stream.stop();
    });
  });

  describe('teardown after a pipeline error', () => {
    interface TeardownInternals {
      attachCompletion(completion: Promise<void>): void;
      pipeline?: { isStopped(): boolean; stop(): void; completion: Promise<void> };
      output?: { close(): Promise<void>; discardOnClose(): void };
      videoDecoder?: { close(): void };
      input?: { close(): Promise<void> };
    }

    it('releases every resource and reports the error once when closing the output rethrows it', async () => {
      const failure = new Error('write worker failed');
      const closeCalls: (Error | undefined)[] = [];
      const closed: string[] = [];
      const stream = FMP4Stream.create('unused', { onClose: (error) => closeCalls.push(error) });
      const internals = stream as unknown as TeardownInternals;

      const completion = Promise.reject(failure);
      completion.catch(() => {});
      internals.pipeline = { isStopped: () => true, stop: () => {}, completion };
      internals.output = {
        close: async () => {
          closed.push('output');
          throw failure;
        },
        discardOnClose: () => closed.push('discard'),
      };
      internals.videoDecoder = { close: () => closed.push('decoder') };
      internals.input = {
        close: async () => {
          closed.push('input');
        },
      };

      const { rejections } = await withUnhandledRejections(async () => {
        internals.attachCompletion(completion);
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      assert.deepEqual(closed, ['discard', 'output', 'decoder', 'input'], 'a failing output close must not skip the rest of the teardown');
      assert.deepEqual(closeCalls, [failure]);
      assert.equal(rejections.length, 0, `unhandled rejections: ${String(rejections[0])}`);
      await withTimeout(stream.stop(), 1000);
    });

    it('calls a throwing onClose once, logs its error and leaves no rejected promise', async () => {
      for (const outcome of ['resolved', 'rejected'] as const) {
        let calls = 0;
        const stream = FMP4Stream.create('unused', {
          onClose: () => {
            calls++;
            throw new Error('owner callback failed');
          },
        });
        const internals = stream as unknown as TeardownInternals;
        const completion = outcome === 'resolved' ? Promise.resolve() : Promise.reject(new Error('pipeline failed'));
        completion.catch(() => {});

        const logged: unknown[][] = [];
        const origError = console.error;
        console.error = (...args: unknown[]) => logged.push(args);
        let rejections: unknown[];
        try {
          ({ rejections } = await withUnhandledRejections(async () => {
            internals.attachCompletion(completion);
            await new Promise((resolve) => setTimeout(resolve, 20));
          }));
        } finally {
          console.error = origError;
        }

        assert.equal(calls, 1, `onClose must fire exactly once (${outcome})`);
        assert.equal(rejections.length, 0, `unhandled rejections (${outcome}): ${String(rejections[0])}`);
        assert.deepEqual(
          logged.map(([prefix, error]) => [prefix, (error as Error).message]),
          [['[FMP4Stream] onClose callback threw:', 'owner callback failed']],
          `the callback error must be logged once (${outcome})`,
        );
      }
    });
  });

  describe('maxPacketAge', () => {
    const fullBox = (type: string, version: number, flags: number, body: Buffer): Buffer => {
      const header = Buffer.alloc(4);
      header.writeUInt32BE(((version & 0xff) << 24) | (flags & 0xffffff), 0);
      return box(type, Buffer.concat([header, body]));
    };
    const u32 = (...values: number[]): Buffer => {
      const buf = Buffer.alloc(values.length * 4);
      values.forEach((v, i) => buf.writeUInt32BE(v, i * 4));
      return buf;
    };
    // trun with data offset and per-sample sizes, like movenc writes it
    const trun = (count: number): Buffer => fullBox('trun', 0, 0x000201, u32(count, 0, ...new Array<number>(count).fill(100)));
    const traf = (trackId: number, ...counts: number[]): Buffer =>
      box('traf', Buffer.concat([fullBox('tfhd', 0, 0x020000, u32(trackId)), fullBox('tfdt', 1, 0, Buffer.alloc(8)), ...counts.map(trun)]));
    const moof = (...trafs: Buffer[]): Buffer => box('moof', Buffer.concat([fullBox('mfhd', 0, 0, u32(1)), ...trafs]));
    // moov whose sample tables carry `samples` per track (a first fragment written without empty_moov)
    const moov = (...tracks: [number, number][]): Buffer => {
      const traks = tracks.map(([trackId, samples]) => {
        const tkhd = fullBox('tkhd', 0, 3, Buffer.concat([u32(0, 0, trackId), Buffer.alloc(68)]));
        const stbl = box('stbl', Buffer.concat([box('stsd', 16), fullBox('stsz', 0, 0, u32(0, samples, ...new Array<number>(samples).fill(100)))]));
        return box('trak', Buffer.concat([tkhd, box('mdia', Buffer.concat([box('mdhd', 24), box('hdlr', 24), box('minf', stbl)]))]));
      });
      return box('moov', Buffer.concat([box('mvhd', 100), ...traks]));
    };
    const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
    const pending = (watchdog: PacketAgeWatchdog): number[] => [0, 1].map((i) => watchdog.pendingPackets(i));
    const announce = (watchdog: PacketAgeWatchdog, video: number, audio: number): void => {
      for (let i = 0; i < video; i++) watchdog.onPacket(0);
      for (let i = 0; i < audio; i++) watchdog.onPacket(1);
    };

    it('drains pending packets by the trun sample counts of each track', () => {
      const watchdog = new PacketAgeWatchdog(60, () => '');
      announce(watchdog, 6, 4);
      // several truns per traf: movenc splits a run when the sample data is not contiguous
      watchdog.consumeBox(moof(traf(1, 3, 2), traf(2, 4)));
      assert.deepEqual(pending(watchdog), [1, 0]);
      // more samples than recorded packets are not credited to later packets
      watchdog.consumeBox(moof(traf(1, 5)));
      watchdog.onPacket(0);
      assert.deepEqual(pending(watchdog), [1, 0]);
      // tracks movenc adds itself (no stream behind them) are ignored
      watchdog.consumeBox(moof(traf(7, 3)));
      assert.deepEqual(pending(watchdog), [1, 0]);
    });

    it('drains samples a moov carries when the first fragment is written without empty_moov', () => {
      const watchdog = new PacketAgeWatchdog(60, () => '');
      announce(watchdog, 5, 3);
      watchdog.consumeBox(moov([1, 4], [2, 3]));
      assert.deepEqual(pending(watchdog), [1, 0]);
    });

    it('frames raw output chunks across any split, including 64-bit boxes', () => {
      const output = Buffer.concat([
        box('ftyp', 16),
        moov([1, 2], [2, 0]),
        moof(traf(1, 3), traf(2, 2)),
        box('mdat', 5000),
        moof(traf(1, 1)),
        box64('mdat', 700),
        moof(traf(2, 4)),
        box('mdat', 10),
      ]);
      const chunkings: number[][] = [[output.length], Array.from({ length: output.length }, () => 1), [5, 9, 100, 333, 4096, 7, 11, 2048]];
      for (const sizes of chunkings) {
        const watchdog = new PacketAgeWatchdog(60, () => '');
        announce(watchdog, 7, 7);
        let offset = 0;
        for (let i = 0; offset < output.length; i++) {
          const size = sizes[i % sizes.length];
          watchdog.consumeChunk(output.subarray(offset, offset + size));
          offset += size;
        }
        assert.deepEqual(pending(watchdog), [1, 1], `chunk sizes ${sizes.slice(0, 8).join(',')}`);
      }
    });

    it('fails the next packet once a pending packet is older than the limit', async () => {
      const watchdog = new PacketAgeWatchdog(0.02, (index) => (index === 0 ? 'video' : 'audio'));
      watchdog.onPacket(0);
      watchdog.onPacket(1);
      watchdog.consumeBox(moof(traf(2, 1)));
      await sleep(40);
      // the stalled stream is caught by a packet of the stream that still flows
      assert.throws(
        () => watchdog.onPacket(1),
        /^Error: Muxer stall on output stream 0 \(video\): the oldest of 1 pending packets has waited \d+\.\ds .*maxPacketAge \(0\.02s\)$/,
      );
    });

    it('forgets packets libavformat rejected', async () => {
      const watchdog = new PacketAgeWatchdog(0.02, () => '');
      watchdog.onPacket(0);
      watchdog.onPacketRejected(0);
      await sleep(40);
      assert.doesNotThrow(() => watchdog.onPacket(0));
    });

    it('stops judging and recording once the output framing is lost', async () => {
      const watchdog = new PacketAgeWatchdog(0.02, () => '');
      announce(watchdog, 3, 2);
      // a box of size 0 cannot be framed in a stream
      watchdog.consumeChunk(Buffer.concat([box('ftyp', 8), Buffer.from([0, 0, 0, 0, 0x6d, 0x6f, 0x6f, 0x66])]));
      assert.deepEqual(pending(watchdog), [0, 0], 'a blind watchdog must drop what it recorded');
      await sleep(40);
      assert.doesNotThrow(() => announce(watchdog, 1000, 1000));
      watchdog.onPacketRejected(0);
      assert.deepEqual(pending(watchdog), [0, 0], 'a blind watchdog must not grow');
    });

    it('counts a pause of the whole input as at most 2 s', (t) => {
      let now = 1000;
      t.mock.method(performance, 'now', () => now);
      const watchdog = new PacketAgeWatchdog(5, () => '');
      watchdog.onPacket(0);
      watchdog.onPacket(1);
      watchdog.consumeBox(moof(traf(2, 1)));
      // an hour without any packet, e.g. a stalled source or a suspended host
      now += 3_600_000;
      assert.equal(watchdog.pendingAge(0), 2000);
      assert.doesNotThrow(() => watchdog.onPacket(1));
      // while packets flow, the time between them counts in full
      for (let i = 0; i < 75; i++) {
        now += 40;
        watchdog.onPacket(1);
        watchdog.consumeBox(moof(traf(2, 1)));
      }
      assert.equal(watchdog.pendingAge(0), 5000);
      now += 40;
      assert.throws(() => watchdog.onPacket(1), /^Error: Muxer stall on output stream 0: the oldest of 1 pending packets has waited 5\.0s /);
    });

    const constant = (): ((packet: Packet) => void) => {
      let dts: bigint | undefined;
      return (packet) => {
        dts ??= packet.dts;
        packet.dts = dts;
        packet.pts = dts;
      };
    };

    for (const [label, shape, options] of [
      ['constant timestamps', (): StallShape => ({ from: 1, video: constant(), silenceAudio: true }), {}],
      [
        'missing timestamps',
        (): StallShape => ({
          from: 1,
          video: (packet: Packet) => {
            packet.dts = AV_NOPTS_VALUE;
            packet.pts = AV_NOPTS_VALUE;
          },
          silenceAudio: true,
        }),
        {},
      ],
      [
        // #351: one packet far ahead latches the stream while the other goes silent
        'a forward spike with dtsBackwardThreshold 0',
        (): StallShape => ({
          from: 1,
          video: (packet: Packet, index: number) => {
            if (index === 0) {
              packet.dts += 20000n * 12288n;
              packet.pts += 20000n * 12288n;
            }
          },
          silenceAudio: true,
        }),
        { dtsBackwardThreshold: 0 },
      ],
    ] as const) {
      for (const boxMode of [true, false]) {
        it(`ends with onClose(error) when packets pile up behind ${label} and a silent stream (${boxMode ? 'box' : 'chunk'} mode)`, async () => {
          const { result, rejections } = await withUnhandledRejections(async () => {
            const input = await openPacedInput('video.mp4', shape());
            return { ...(await runSession(input, { fragDuration: 1, maxPacketAge: 0.25, boxMode, ...options })), input };
          });
          const { stream, closeCalls, input } = result;
          assert.equal(closeCalls.length, 1, 'onClose must fire exactly once');
          assert.match(closeCalls[0]?.message ?? '', /^Muxer stall on output stream \d \((video|audio)\): .* more than maxPacketAge \(0\.25s\)$/);
          assert.equal(input.isInputOpen, false, 'the input must be closed before onClose');
          await withTimeout(stream.stop(), 5000);
          assert.equal(rejections.length, 0, `unhandled rejections: ${String(rejections[0])}`);
        });
      }
    }

    it('runs a paced healthy session to the end', async () => {
      // Normal ages here are a few ms; the margin absorbs a slow machine.
      const input = await openPacedInput('video.mp4', { from: Infinity });
      const { stream, closeCalls, fragments } = await runSession(input, { fragDuration: 1, maxPacketAge: 1 });
      assert.deepEqual(closeCalls, [undefined]);
      assert.ok(fragments > 0);
      await stream.stop();
    });

    it('runs to the end when the whole input pauses for longer than maxPacketAge', async () => {
      // A few packets are always pending; the pause must not age them past the limit.
      const input = await openPacedInput('video.mp4', { from: 1, pause: 5000 });
      const { stream, closeCalls, fragments } = await runSession(input, { maxPacketAge: 4 });
      assert.deepEqual(closeCalls, [undefined]);
      assert.ok(fragments > 0);
      await stream.stop();
    });

    it('lets packets pile up when maxPacketAge is 0', async () => {
      const input = await openPacedInput('video.mp4', { from: 1, video: constant(), silenceAudio: true });
      const { stream, closeCalls } = await runSession(input, { fragDuration: 1, maxPacketAge: 0 });
      assert.deepEqual(closeCalls, [undefined]);
      await stream.stop();
    });

    for (const [label, options] of [
      ['default options, box mode', {}],
      ['chunk mode, small I/O buffer', { boxMode: false, bufferSize: 4096 }],
      ['moov carrying the first fragment', { movFlags: '+frag_keyframe' }],
      ['fragments only at keyframes', { fragDuration: 0 }],
      ['a fragment per frame', { movFlags: '+frag_every_frame+empty_moov' }],
    ] as const) {
      it(`leaves no packet pending after a normal session (${label})`, async () => {
        const { stream, closeCalls } = await runSession(inputFile, options);
        assert.deepEqual(closeCalls, [undefined]);
        const watchdog = (stream as unknown as { packetAgeWatchdog: PacketAgeWatchdog }).packetAgeWatchdog;
        assert.deepEqual(pending(watchdog), [0, 0]);
        await stream.stop();
      });
    }

    it('rejects an invalid maxPacketAge', () => {
      for (const value of [-1, NaN, Infinity]) {
        assert.throws(() => FMP4Stream.create(inputFile, { maxPacketAge: value }), RangeError);
      }
    });
  });
});
