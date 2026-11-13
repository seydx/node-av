import assert from 'node:assert';
import { writeFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  AV_CODEC_ID_H264,
  AV_PIX_FMT_NV12,
  AV_PIX_FMT_YUV420P,
  avGetPixFmtName,
  Decoder,
  Demuxer,
  Encoder,
  FF_ENCODER_LIBOPUS,
  FF_ENCODER_LIBX264,
  FilterAPI,
  Muxer,
  pipeline,
} from '../src/index.js';
import { encoderInputFormat, getInputFile, getOutputFile, prepareTestEnvironment, stallingFrameSource, syntheticVideoFrame, yuvj422pSource } from './index.js';

import type { RtpPacket } from 'werift';
import type { AVPixelFormat, Frame } from '../src/index.js';
import type { RTPStreamOptions } from '../src/webrtc/index.js';

prepareTestEnvironment();

const weriftAvailable = await import('werift').then(
  () => true,
  () => false,
);
const skipWerift = { skip: weriftAvailable ? false : 'werift not installed (optional dependency)' };

interface VideoRtpInfo {
  timestamp: number;
  marker: boolean;
}

async function collectVideoRtp(input: string, options: RTPStreamOptions = {}): Promise<VideoRtpInfo[]> {
  const { RTPStream } = await import('../src/webrtc/index.js');
  const packets: VideoRtpInfo[] = [];
  let resolveClosed!: () => void;
  let rejectClosed!: (error: Error) => void;
  const closed = new Promise<void>((resolve, reject) => {
    resolveClosed = resolve;
    rejectClosed = reject;
  });

  const stream = RTPStream.create(input, {
    ...options,
    onVideoPacket: (rtp: RtpPacket) => {
      packets.push({ timestamp: rtp.header.timestamp, marker: rtp.header.marker });
    },
    onClose: (error) => (error ? rejectClosed(error) : resolveClosed()),
  });

  await stream.start();
  await closed;
  await stream.stop();
  return packets;
}

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

function frameTimestamps(packets: VideoRtpInfo[]): number[] {
  return packets.filter((p) => p.marker).map((p) => p.timestamp);
}

function rtpDelta(from: number, to: number): number {
  const delta = (to - from) >>> 0;
  return delta > 0x7fffffff ? delta - 0x100000000 : delta;
}

function increments(timestamps: number[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    result.push(rtpDelta(timestamps[i - 1], timestamps[i]));
  }
  return result;
}

describe('RTPStream', skipWerift, () => {
  describe('RTP timestamps', () => {
    it('derives passthrough timestamps from packet PTS (24 fps input, not the old 20 fps default)', async () => {
      // video.mp4: h264, 24 fps, no B-frames => exactly 3750 ticks per frame.
      const packets = await collectVideoRtp(getInputFile('video.mp4'));
      const frames = frameTimestamps(packets);
      assert.ok(frames.length >= 24, `expected at least 24 frames, got ${frames.length}`);

      for (const inc of increments(frames)) {
        assert.strictEqual(inc, 3750, `expected 90000/24 = 3750 ticks per frame, got ${inc}`);
      }
    });

    it('keeps presentation times for B-frame passthrough (uniform 30 fps cadence)', async () => {
      // demux.mp4: h264 with B-frames, 30 fps. Packets leave in decode order, so
      // timestamps are not monotonic - but sorted by presentation time they must
      // be spaced exactly 90000/30 = 3000 ticks apart.
      const packets = await collectVideoRtp(getInputFile('demux.mp4'));
      const frames = frameTimestamps(packets);
      assert.ok(frames.length >= 30, `expected at least 30 frames, got ${frames.length}`);

      const base = frames[0];
      const relative = frames.map((t) => rtpDelta(base, t)).sort((a, b) => a - b);
      for (let i = 1; i < relative.length; i++) {
        assert.strictEqual(relative[i] - relative[i - 1], 3000, `expected uniform 3000-tick presentation spacing, got ${relative[i] - relative[i - 1]}`);
      }
    });
  });

  describe('fps fallback', () => {
    it('keeps the input frame rate when transcoding without an fps option', async () => {
      // video-vp8.webm: 30 fps in a 1/1000 timebase (33/34 ms per frame), forced
      // to transcode via libx264. Without an explicit fps option no fps filter
      // may be inserted - increments must track the input cadence (~3000 ticks),
      // not the removed 20 fps default (4500 ticks).
      const packets = await collectVideoRtp(getInputFile('video-vp8.webm'), {
        supportedVideoCodecs: [FF_ENCODER_LIBX264],
      });
      const frames = frameTimestamps(packets);
      assert.ok(frames.length >= 5, `expected at least 5 frames, got ${frames.length}`);

      for (const inc of increments(frames)) {
        assert.ok(inc >= 2900 && inc <= 3100, `expected ~3000 ticks (30 fps input), got ${inc}`);
      }
    });

    it('applies an explicit fps option when transcoding', async () => {
      const packets = await collectVideoRtp(getInputFile('video-vp8.webm'), {
        supportedVideoCodecs: [FF_ENCODER_LIBX264],
        video: { fps: 10 },
      });
      const frames = frameTimestamps(packets);
      assert.ok(frames.length >= 3, `expected at least 3 frames, got ${frames.length}`);

      for (const inc of increments(frames)) {
        assert.ok(Math.abs(inc - 9000) <= 90, `expected ~9000 ticks (10 fps option), got ${inc}`);
      }
    });
  });

  describe('scaling', () => {
    it('transcodes and scales a packed yuyv422 source (issue #294)', async () => {
      // A yuyv422 (packed 4:2:2) source fed through scale=WxH used to fail: swscale can't
      // scale packed yuyv422 in place (yuyv422 -> yuyv422 => ENOSYS on some builds) and
      // libx264 rejects yuyv422 outright. The scale chain must pin the output to yuv420p.
      // Synthesize a few frames of gray yuyv422 rawvideo - the exact pixel values don't
      // matter, only that the demuxer reads them as yuyv422 and the graph has to convert.
      const width = 320;
      const height = 240;
      const frames = 6;
      const frame = Buffer.alloc(width * height * 2, 0x80);
      const raw = Buffer.concat(Array.from({ length: frames }, () => frame));
      const rawPath = getOutputFile('issue-294-yuyv422.raw');
      writeFileSync(rawPath, raw);

      const packets = await collectVideoRtp(rawPath, {
        supportedVideoCodecs: [FF_ENCODER_LIBX264],
        inputOptions: { format: 'rawvideo', options: { pixel_format: 'yuyv422', video_size: `${width}x${height}`, framerate: '12' } },
        video: { width: 160, height: 120 },
      });

      assert.ok(packets.length > 0, 'expected RTP packets from the scaled yuyv422 source');
    });
  });

  describe('forced transcode', () => {
    async function videoEncoderWidth(options: RTPStreamOptions): Promise<number | undefined> {
      const { RTPStream } = await import('../src/webrtc/index.js');

      let sawPacket!: () => void;
      const firstPacket = new Promise<void>((resolve) => (sawPacket = resolve));

      // video.mp4: h264, 320x180
      const stream = RTPStream.create(getInputFile('video.mp4'), {
        ...options,
        supportedVideoCodecs: [AV_CODEC_ID_H264],
        onVideoPacket: () => sawPacket(),
      });

      await stream.start();
      try {
        await withTimeout(firstPacket, 15000);
        const encoder = (stream as unknown as { videoEncoder?: unknown }).videoEncoder;
        return (encoder as { codecContext: { width: number } } | undefined)?.codecContext.width;
      } finally {
        await stream.stop();
      }
    }

    it('transcodes a supported codec when transcode is set', async () => {
      assert.equal(await videoEncoderWidth({ video: { transcode: true, width: 160 } }), 160);
    });

    it('passes a supported codec through without transcode', async () => {
      assert.equal(await videoEncoderWidth({ video: { width: 160 } }), undefined);
    });

    // stereo, the RTP payload format for opus carries at most two channels
    async function opusFile(): Promise<string> {
      const file = getOutputFile('rtp-opus.mka');
      await using input = await Demuxer.open(getInputFile('audio-speech.wav'));
      using decoder = await Decoder.create(input.audio()!);
      using filter = FilterAPI.create('aformat=sample_rates=48000:sample_fmts=s16:channel_layouts=stereo');
      using encoder = await Encoder.create(FF_ENCODER_LIBOPUS);
      const output = await Muxer.open(file);
      await pipeline(input, decoder, filter, encoder, output).completion;
      await output.close();
      return file;
    }

    async function audioDecoderName(options: RTPStreamOptions): Promise<string | null | undefined> {
      const { RTPStream } = await import('../src/webrtc/index.js');

      let sawPacket!: () => void;
      const firstPacket = new Promise<void>((resolve) => (sawPacket = resolve));

      const stream = RTPStream.create(await opusFile(), {
        ...options,
        supportedAudioCodecs: [FF_ENCODER_LIBOPUS],
        onAudioPacket: () => sawPacket(),
      });

      await stream.start();
      try {
        await withTimeout(firstPacket, 15000);
        return (stream as unknown as { audioDecoder?: Decoder }).audioDecoder?.getCodec().name;
      } finally {
        await stream.stop();
      }
    }

    it('transcodes a supported audio codec when transcode is set, decoding opus with libopus', async () => {
      assert.equal(await audioDecoderName({ audio: { transcode: true, channels: 1 } }), 'libopus');
    });

    it('passes a supported audio codec through without transcode', async () => {
      assert.equal(await audioDecoderName({}), undefined);
    });
  });

  describe('transcode pixel format', () => {
    // 4:2:2 JPEG cameras decode to yuvj422p: x264 took it as is and wrote High 4:2:2,
    // which browsers cannot decode, hardware encoders rejected it outright
    for (const hardware of [undefined, 'auto'] as const) {
      it(`hands the encoder 8-bit 4:2:0 for a 4:2:2 source (${hardware ?? 'software'})`, async () => {
        const { RTPStream } = await import('../src/webrtc/index.js');
        const { file, inputOptions } = yuvj422pSource('rtp-yuvj422p.raw');
        let format: AVPixelFormat | undefined;
        const closed = Promise.withResolvers<void>();
        const stream = RTPStream.create(file, {
          supportedVideoCodecs: [AV_CODEC_ID_H264],
          inputOptions,
          hardware,
          onVideoPacket: () => {
            format ??= encoderInputFormat((stream as unknown as { videoEncoder?: Encoder }).videoEncoder);
          },
          onClose: (error) => (error ? closed.reject(error) : closed.resolve()),
        });
        await stream.start();
        await withTimeout(closed.promise, 30000);
        await stream.stop();
        assert.ok(format === AV_PIX_FMT_YUV420P || format === AV_PIX_FMT_NV12, `encoder input ${format === undefined ? 'none' : avGetPixFmtName(format)}`);
      });
    }
  });

  describe('bitrate cap', () => {
    it('applies the negotiated bitrate as a VBV cap on the transcode path', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');

      let sawPacket!: () => void;
      const firstPacket = new Promise<void>((resolve) => (sawPacket = resolve));

      const stream = RTPStream.create(getInputFile('hevc-short.mp4'), {
        supportedVideoCodecs: [FF_ENCODER_LIBX264], // HEVC source -> forced transcode
        video: { bitrate: 300_000 },
        onVideoPacket: () => sawPacket(),
      });

      await stream.start();
      try {
        // the encoder configures itself lazily on the first frame
        await withTimeout(firstPacket, 15000);

        const encoder = (stream as unknown as { videoEncoder?: unknown }).videoEncoder;
        assert.ok(encoder, 'transcode path must create a video encoder');
        const ctx = (encoder as { codecContext: { bitRate: bigint; rcMaxRate: bigint; rcBufferSize: number } }).codecContext;
        assert.equal(ctx.bitRate, 300000n, 'target must be lowered to the cap, VAAPI rejects target > maxrate');
        assert.equal(ctx.rcMaxRate, 300000n, 'bitrate must land as VBV maxrate');
        assert.equal(ctx.rcBufferSize, 300000, 'VBV buffer must bound bursts to ~1s');
      } finally {
        await stream.stop();
      }
    });

    it('derives the bitrate from picture size and frame rate when none is given', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');

      let sawPacket!: () => void;
      const firstPacket = new Promise<void>((resolve) => (sawPacket = resolve));

      const stream = RTPStream.create(getInputFile('hevc-short.mp4'), {
        supportedVideoCodecs: [FF_ENCODER_LIBX264],
        onVideoPacket: () => sawPacket(),
      });

      await stream.start();
      try {
        await withTimeout(firstPacket, 15000);

        const encoder = (stream as unknown as { videoEncoder?: unknown }).videoEncoder;
        const ctx = (encoder as { codecContext: { bitRate: bigint; rcMaxRate: bigint; width: number; height: number; framerate: { num: number; den: number } } })
          .codecContext;
        // libx264 keeps whole kbit/s
        const expected = Math.round((ctx.width * ctx.height * (ctx.framerate.num / ctx.framerate.den) * 0.1) / 1000);
        assert.equal(Math.round(Number(ctx.bitRate) / 1000), expected, 'target must follow the source picture, not the 1 Mbps seed');
        assert.equal(Math.round(Number(ctx.rcMaxRate) / 1000), expected);
      } finally {
        await stream.stop();
      }
    });

    it('sets a keyframe every 2 seconds', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');

      let sawPacket!: () => void;
      const firstPacket = new Promise<void>((resolve) => (sawPacket = resolve));

      const stream = RTPStream.create(getInputFile('hevc-short.mp4'), {
        supportedVideoCodecs: [FF_ENCODER_LIBX264],
        onVideoPacket: () => sawPacket(),
      });

      await stream.start();
      try {
        await withTimeout(firstPacket, 15000);

        const encoder = (stream as unknown as { videoEncoder?: unknown }).videoEncoder;
        const ctx = (encoder as { codecContext: { gopSize: number; framerate: { num: number; den: number } } }).codecContext;
        assert.equal(ctx.gopSize, Math.round((ctx.framerate.num / ctx.framerate.den) * 2));
      } finally {
        await stream.stop();
      }
    });

    it('keeps the source size instead of scaling up', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');

      let sawPacket!: () => void;
      const firstPacket = new Promise<void>((resolve) => (sawPacket = resolve));

      const stream = RTPStream.create(getInputFile('hevc-short.mp4'), {
        supportedVideoCodecs: [FF_ENCODER_LIBX264],
        video: { width: 7680 },
        onVideoPacket: () => sawPacket(),
      });

      await stream.start();
      try {
        await withTimeout(firstPacket, 15000);

        const source = stream.getInput()!.video()!.codecpar;
        const encoder = (stream as unknown as { videoEncoder?: unknown }).videoEncoder;
        const ctx = (encoder as { codecContext: { width: number; height: number } }).codecContext;
        assert.equal(ctx.width, source.width);
        assert.equal(ctx.height, source.height);
      } finally {
        await stream.stop();
      }
    });
  });

  describe('abort handling', () => {
    it('aborts via signal without unhandled rejections', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');
      const rejections: unknown[] = [];
      const onRejection = (reason: unknown) => rejections.push(reason);
      process.on('unhandledRejection', onRejection);

      try {
        const controller = new AbortController();
        const stream = RTPStream.create(getInputFile('video.mp4'), { signal: controller.signal });
        await stream.start();
        controller.abort();

        const deadline = Date.now() + 5000;
        while (stream.isStreamActive && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        assert.ok(!stream.isStreamActive, 'stream must stop after abort');

        await stream.stop();
        await new Promise((resolve) => setImmediate(resolve));
        assert.strictEqual(rejections.length, 0, `unhandled rejections after abort: ${String(rejections[0])}`);
      } finally {
        process.off('unhandledRejection', onRejection);
      }
    });

    it('reports a deliberate stop as a clean close, not a pipeline error', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');

      const closeArgs: (Error | undefined)[] = [];
      const consoleErrors: string[] = [];
      const origError = console.error;
      console.error = (...args: unknown[]) => {
        consoleErrors.push(args.map(String).join(' '));
      };

      let sawPacket!: () => void;
      const firstPacket = new Promise<void>((resolve) => (sawPacket = resolve));

      try {
        const controller = new AbortController();
        const stream = RTPStream.create(getInputFile('hevc-short.mp4'), {
          signal: controller.signal,
          supportedVideoCodecs: [FF_ENCODER_LIBX264], // forced transcode keeps the pipeline busy mid-stop
          onVideoPacket: () => sawPacket(),
          onClose: (error) => closeArgs.push(error),
        });

        await stream.start();
        await withTimeout(firstPacket, 15000);
        controller.abort();

        const deadline = Date.now() + 5000;
        while (stream.isStreamActive && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        await stream.stop();
        await new Promise((resolve) => setTimeout(resolve, 100));

        assert.ok(
          closeArgs.every((error) => error === undefined),
          `onClose must not receive an error on deliberate shutdown: ${String(closeArgs.find(Boolean))}`,
        );
        assert.strictEqual(consoleErrors.filter((line) => line.includes('Pipeline error')).length, 0, 'a deliberate stop must not log a pipeline error');
      } finally {
        console.error = origError;
      }
    });

    it('removes the abort listener on stop and does not accumulate listeners across restarts', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');
      const rejections: unknown[] = [];
      const onRejection = (reason: unknown) => rejections.push(reason);
      process.on('unhandledRejection', onRejection);

      const warnings: Error[] = [];
      const onWarning = (warning: Error) => warnings.push(warning);
      process.on('warning', onWarning);

      try {
        const controller = new AbortController();
        const stream = RTPStream.create(getInputFile('video.mp4'), { signal: controller.signal });

        // One abort listener per start() would trip MaxListenersExceededWarning here.
        for (let i = 0; i < 15; i++) {
          await stream.start();
          await stream.stop();
        }

        // Aborting after stop() must be a no-op (listener already detached).
        controller.abort();
        await new Promise((resolve) => setImmediate(resolve));

        assert.strictEqual(rejections.length, 0, `unhandled rejections: ${String(rejections[0])}`);
        assert.ok(!warnings.some((w) => w.name === 'MaxListenersExceededWarning'), 'abort listeners accumulated across restarts');
      } finally {
        process.off('unhandledRejection', onRejection);
        process.off('warning', onWarning);
      }
    });
  });

  describe('keyframe request', () => {
    // Start of an IDR picture in an H.264 RTP payload: single NAL, FU-A start or inside a STAP-A
    const startsIdr = (payload: Buffer): boolean => {
      const type = payload[0] & 0x1f;
      if (type === 5) return true;
      if (type === 28) return (payload[1] & 0x80) !== 0 && (payload[1] & 0x1f) === 5;
      if (type === 24) {
        for (let offset = 1; offset + 2 < payload.length; offset += 2 + payload.readUInt16BE(offset)) {
          if ((payload[offset + 2] & 0x1f) === 5) return true;
        }
      }
      return false;
    };

    it('should encode a requested keyframe for a frame source', skipWerift, async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');
      let idrs = 0;
      const closed = Promise.withResolvers<void>();
      // 30 fps keeps the next scheduled keyframe 60 frames away, past the end
      async function* frames(): AsyncGenerator<Frame | null> {
        for (let i = 0; i < 40; i++) {
          if (i === 20) stream.requestVideoKeyframe();
          yield syntheticVideoFrame(i);
        }
        yield null;
      }
      const stream = RTPStream.create(
        { video: frames() },
        {
          video: { fps: 30 },
          onVideoPacket: (rtp: RtpPacket) => {
            if (startsIdr(rtp.payload)) idrs++;
          },
          onClose: (error) => (error ? closed.reject(error) : closed.resolve()),
        },
      );
      await stream.start();
      await closed.promise;
      await stream.stop();
      assert.equal(idrs, 2, 'the first frame and the requested one');
    });

    it('should encode a requested keyframe for a transcoded input', skipWerift, async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');
      // x264 splits each frame into slices, count the frames by timestamp
      const idrs = new Set<number>();
      let frames = 0;
      let timestamp: number | undefined;
      const closed = Promise.withResolvers<void>();
      // 60 frames at 15 fps, the 2 s GOP adds a keyframe at frame 30
      const stream = RTPStream.create(getInputFile('hevc-short.mp4'), {
        supportedVideoCodecs: [FF_ENCODER_LIBX264],
        onVideoPacket: (rtp: RtpPacket) => {
          if (rtp.header.timestamp !== timestamp) {
            timestamp = rtp.header.timestamp;
            if (++frames === 10) stream.requestVideoKeyframe();
          }
          if (startsIdr(rtp.payload)) idrs.add(rtp.header.timestamp);
        },
        onClose: (error) => (error ? closed.reject(error) : closed.resolve()),
      });
      await stream.start();
      await withTimeout(closed.promise, 15000);
      await stream.stop();
      assert.equal(idrs.size, 3, 'the first frame, the requested one and the GOP keyframe');
    });
  });

  describe('stalled frame source', () => {
    it('should stop when the frame source goes silent', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');

      const silent = Promise.withResolvers<void>();
      const stream = RTPStream.create(
        { video: stallingFrameSource(20, () => silent.resolve()) },
        {
          video: { fps: 30, encoderOptions: { preset: 'ultrafast', tune: 'zerolatency' } },
          onVideoPacket: () => {
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
    it('never leaves an orphaned pipeline producing packets after stop() returned', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');

      for (const delayMs of [0, 1, 5]) {
        let packetsAfterStop = 0;
        let stopped = false;

        const stream = RTPStream.create(getInputFile('video.mp4'), {
          onVideoPacket: () => {
            if (stopped) packetsAfterStop++;
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
        assert.equal(packetsAfterStop, 0, `stop() after ${delayMs}ms must not leave a running pipeline`);
      }
    });

    it('remains restartable after a stop that aborted the startup', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');

      let sawPacket!: () => void;
      const packet = new Promise<void>((resolve) => (sawPacket = resolve));
      const stream = RTPStream.create(getInputFile('video.mp4'), {
        onVideoPacket: () => sawPacket(),
      });

      const first = stream.start().catch(() => {});
      await stream.stop();
      await first;

      await stream.start();
      await packet;
      await stream.stop();
    });

    it('waits for an already-stopped pipeline before closing native resources', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');
      const stream = RTPStream.create(getInputFile('video.mp4'));
      const internals = stream as unknown as {
        pipeline?: {
          isStopped(): boolean;
          stop(): void;
          completion: Promise<void>;
        };
        videoOutput?: {
          close(): Promise<void>;
        };
      };
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
      internals.videoOutput = {
        close: async () => {
          outputClosed = true;
        },
      };

      const stopping = stream.stop();
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(outputClosed, false, 'native output was closed while the pipeline was still unwinding');

      completePipeline();
      await stopping;
      assert.equal(outputClosed, true, 'native output should close after pipeline completion');
      assert.equal(internals.pipeline, undefined, 'completed pipeline reference should be cleared');
    });
  });

  describe('teardown after a pipeline error', () => {
    interface TeardownInternals {
      attachCompletion(completion: Promise<void>): void;
      pipeline?: { isStopped(): boolean; stop(): void; completion: Promise<void> };
      videoOutput?: { close(): Promise<void> };
      audioOutput?: { close(): Promise<void> };
      videoDecoder?: { close(): void };
      input?: { close(): Promise<void> };
    }

    /** Run `fn` with console.error captured, collecting unhandled rejections (plus one macrotask). */
    async function quietly(fn: () => Promise<void>): Promise<{ rejections: unknown[]; logged: unknown[][] }> {
      const rejections: unknown[] = [];
      const logged: unknown[][] = [];
      const onRejection = (reason: unknown): void => {
        rejections.push(reason);
      };
      const origError = console.error;
      console.error = (...args: unknown[]) => logged.push(args);
      process.on('unhandledRejection', onRejection);
      try {
        await fn();
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { rejections, logged };
      } finally {
        process.off('unhandledRejection', onRejection);
        console.error = origError;
      }
    }

    it('closes the input when a codec refuses to close', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');
      const failure = new Error('CodecContext is busy');
      const closed: string[] = [];
      const stream = RTPStream.create(getInputFile('video.mp4'));
      const internals = stream as unknown as TeardownInternals;
      internals.videoDecoder = {
        close: () => {
          throw failure;
        },
      };
      internals.input = {
        close: async () => {
          closed.push('input');
        },
      };

      await assert.rejects(stream.stop(), failure);
      assert.deepEqual(closed, ['input']);
      assert.equal(internals.input, undefined);
    });

    it('releases every resource and reports the error once when closing an output rethrows it', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');
      const failure = new Error('write failed');
      const closeCalls: (Error | undefined)[] = [];
      const closed: string[] = [];
      const stream = RTPStream.create(getInputFile('video.mp4'), { onClose: (error) => closeCalls.push(error) });
      const internals = stream as unknown as TeardownInternals;

      const completion = Promise.reject(failure);
      completion.catch(() => {});
      internals.pipeline = { isStopped: () => true, stop: () => {}, completion };
      internals.videoOutput = {
        close: async () => {
          closed.push('video output');
          throw failure;
        },
      };
      internals.audioOutput = {
        close: async () => {
          closed.push('audio output');
        },
      };
      internals.videoDecoder = { close: () => closed.push('decoder') };
      internals.input = {
        close: async () => {
          closed.push('input');
        },
      };

      const { rejections } = await quietly(async () => internals.attachCompletion(completion));

      assert.deepEqual(closed, ['video output', 'audio output', 'decoder', 'input'], 'a failing output close must not skip the rest of the teardown');
      assert.deepEqual(closeCalls, [failure]);
      assert.strictEqual(rejections.length, 0, `unhandled rejections: ${String(rejections[0])}`);
      await withTimeout(stream.stop(), 1000);
    });

    it('calls a throwing onClose once, logs its error and leaves no rejected promise', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');
      for (const outcome of ['resolved', 'rejected'] as const) {
        let calls = 0;
        const stream = RTPStream.create(getInputFile('video.mp4'), {
          onClose: () => {
            calls++;
            throw new Error('owner callback failed');
          },
        });
        const internals = stream as unknown as TeardownInternals;
        const completion = outcome === 'resolved' ? Promise.resolve() : Promise.reject(new Error('pipeline failed'));
        completion.catch(() => {});

        const { rejections, logged } = await quietly(async () => internals.attachCompletion(completion));

        assert.strictEqual(calls, 1, `onClose must fire exactly once (${outcome})`);
        assert.strictEqual(rejections.length, 0, `unhandled rejections (${outcome}): ${String(rejections[0])}`);
        const callbackLogs = logged.filter(([prefix]) => prefix === '[RTPStream] onClose callback threw:');
        assert.deepEqual(
          callbackLogs.map(([, error]) => (error as Error).message),
          ['owner callback failed'],
          `the callback error must be logged once (${outcome})`,
        );
      }
    });
  });
});
