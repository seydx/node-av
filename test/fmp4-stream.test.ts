import assert from 'node:assert';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { Demuxer, FMP4Stream } from '../src/index.js';
import { getInputFile, getOutputFile, prepareTestEnvironment } from './index.js';

import type { FMP4Data, MP4Box } from '../src/index.js';

prepareTestEnvironment();

const inputFile = getInputFile('video.mp4');

interface FMP4StreamInternals {
  processBoxMode: (chunk: Buffer) => void;
  incompleteBoxBuffer: Buffer | null;
  pendingFragment: { raw: Buffer }[];
  endFragments: () => void;
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
  });
});
