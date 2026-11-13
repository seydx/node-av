import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AVCOL_RANGE_JPEG,
  AV_CHANNEL_LAYOUT_MONO,
  AV_CHANNEL_LAYOUT_STEREO,
  AV_CHANNEL_ORDER_UNSPEC,
  AV_NOPTS_VALUE,
  AV_PICTURE_TYPE_I,
  AV_PIX_FMT_RGB24,
  AV_PIX_FMT_YUV420P,
  AV_PIX_FMT_YUV422P,
  AV_PIX_FMT_YUV444P,
  AV_SAMPLE_FMT_FLTP,
  Decoder,
  Demuxer,
  Encoder,
  AV_SAMPLE_FMT_S16,
  FF_ENCODER_AAC,
  FF_ENCODER_ADPCM_G726,
  FF_ENCODER_LIBMP3LAME,
  FF_ENCODER_LIBX264,
  FF_ENCODER_LIBX265,
  FF_ENCODER_MJPEG,
  HardwareContext,
} from '../src/index.js';
import { Frame, Rational, avcodecFindBestPixFmtOfList } from '../src/lib/index.js';
import { encodeFrame, encodeFrameSync, getInputFile, needsX264, syntheticVideoFrame } from './index.js';

import type { Packet } from '../src/lib/index.js';

// Check for JPEG magic bytes: SOI (FFD8) at the start and EOI (FFD9) at the end.
function isJpeg(buf: Buffer): boolean {
  return buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
}

// Create an MJPEG-compatible test frame (full-range YUV) filled with a gradient.
function createMjpegFrame(width: number, height: number): Frame {
  const frame = new Frame();
  frame.alloc();
  frame.width = width;
  frame.height = height;
  frame.format = AV_PIX_FMT_YUV420P;
  frame.colorRange = AVCOL_RANGE_JPEG; // mjpeg requires full-range YUV
  frame.pts = 0n;
  frame.timeBase = new Rational(1, 25);
  frame.getBuffer();

  // Hoist the native data getter out of the loops (it allocates on every access).
  const planes = frame.data;
  if (planes?.[0]) {
    const y = planes[0];
    for (let i = 0; i < width * height; i++) {
      y[i] = i % 256;
    }
    if (planes[1] && planes[2]) {
      const u = planes[1];
      const v = planes[2];
      const chromaSize = (width * height) / 4;
      for (let i = 0; i < chromaSize; i++) {
        u[i] = 128;
        v[i] = 128;
      }
    }
  }

  return frame;
}

describe('Encoder', () => {
  describe('create', () => {
    it('should create video encoder (async)', needsX264, async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        bitrate: '1M',
        gopSize: 30,
      });

      assert.ok(encoder);
      assert.equal(encoder.isEncoderOpen, true);
      assert.equal(encoder.getCodec().name, FF_ENCODER_LIBX264);

      encoder.close();
    });

    it('should create audio encoder (async)', async () => {
      const encoder = await Encoder.create(FF_ENCODER_AAC, {
        bitrate: '128k',
      });

      assert.ok(encoder);
      assert.equal(encoder.isEncoderOpen, true);
      assert.equal(encoder.getCodec().name, FF_ENCODER_AAC);

      encoder.close();
    });

    it('should create encoder with codec options (async)', needsX264, async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        options: {
          preset: 'fast',
          crf: 23,
        },
      });

      assert.ok(encoder);
      encoder.close();
    });

    it('should parse various bitrate formats (async)', async () => {
      const testCases = [
        { input: '128k', desc: 'kilobits' },
        { input: '5M', desc: 'megabits' },
        { input: '1.5M', desc: 'decimal megabits' },
        { input: 192000, desc: 'number' },
        { input: 192000n, desc: 'bigint' },
      ];

      for (const { input, desc } of testCases) {
        const encoder = await Encoder.create(FF_ENCODER_AAC, {
          bitrate: input,
        });

        assert.ok(encoder, `Should create encoder with ${desc} bitrate`);
        encoder.close();
      }
    });

    it('should throw for unknown encoder (async)', async () => {
      await assert.rejects(async () => await Encoder.create('unknown_encoder' as any), /not found/);
    });

    it('should throw for invalid bitrate format (async)', async () => {
      await assert.rejects(
        async () =>
          await Encoder.create(FF_ENCODER_AAC, {
            bitrate: 'invalid',
          }),
        /Invalid bitrate/,
      );
    });

    it('should create video encoder (sync)', needsX264, () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264, {
        bitrate: '1M',
        gopSize: 30,
      });

      assert.ok(encoder);
      assert.equal(encoder.isEncoderOpen, true);
      assert.equal(encoder.getCodec().name, FF_ENCODER_LIBX264);

      encoder.close();
    });

    it('should create audio encoder (sync)', () => {
      const encoder = Encoder.createSync(FF_ENCODER_AAC, {
        bitrate: '128k',
      });

      assert.ok(encoder);
      assert.equal(encoder.isEncoderOpen, true);
      assert.equal(encoder.getCodec().name, FF_ENCODER_AAC);

      encoder.close();
    });

    it('should create encoder with codec options (sync)', needsX264, () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264, {
        options: {
          preset: 'fast',
          crf: 23,
        },
      });

      assert.ok(encoder);
      encoder.close();
    });

    it('should parse various bitrate formats (sync)', () => {
      const testCases = [
        { input: '128k', desc: 'kilobits' },
        { input: '5M', desc: 'megabits' },
        { input: '1.5M', desc: 'decimal megabits' },
        { input: 192000, desc: 'number' },
        { input: 192000n, desc: 'bigint' },
      ];

      for (const { input, desc } of testCases) {
        const encoder = Encoder.createSync(FF_ENCODER_AAC, {
          bitrate: input,
        });

        assert.ok(encoder, `Should create encoder with ${desc} bitrate`);
        encoder.close();
      }
    });

    it('should throw for unknown encoder (sync)', () => {
      assert.throws(() => Encoder.createSync('unknown_encoder' as any), /not found/);
    });

    it('should throw for invalid bitrate format (sync)', () => {
      assert.throws(
        () =>
          Encoder.createSync(FF_ENCODER_AAC, {
            bitrate: 'invalid',
          }),
        /Invalid bitrate/,
      );
    });
  });

  describe('encode', () => {
    it('should encode video frames (async)', needsX264, async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        bitrate: '500k',
        gopSize: 10,
      });

      // Create test frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 320;
      frame.height = 240;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 25);

      const ret = frame.getBuffer();
      assert.equal(ret, 0, 'Should allocate frame buffer');

      // Fill with test data (hoist the native data getter out of the loops)
      const planes = frame.data;
      if (planes?.[0]) {
        // Y plane - gradient
        const y = planes[0];
        for (let i = 0; i < 320 * 240; i++) {
          y[i] = i % 256;
        }
        // U and V planes - gray
        if (planes[1] && planes[2]) {
          const u = planes[1];
          const v = planes[2];
          const chromaSize = (320 * 240) / 4;
          for (let i = 0; i < chromaSize; i++) {
            u[i] = 128;
            v[i] = 128;
          }
        }
      }

      // Encode frame and drain packets using helper
      for await (using _packet of encodeFrame(encoder, frame)) {
        // drain packets
      }

      encoder.close();
    });

    // Encode `count` gradient frames through `encoder`, requesting a forced
    // keyframe on frame `forceAt` via pictType = I, and return the indices of
    // the output packets that came out as keyframes.
    async function keyframeIndices(encoder: Encoder, count: number, forceAt: number): Promise<number[]> {
      const keyframes: number[] = [];
      let outIdx = 0;
      const drain = async (frame: Frame | null): Promise<void> => {
        for await (using pkt of encodeFrame(encoder, frame)) {
          if (pkt.isKeyframe) keyframes.push(outIdx);
          outIdx++;
        }
      };
      for (let i = 0; i < count; i++) {
        using frame = new Frame();
        frame.alloc();
        frame.width = 320;
        frame.height = 240;
        frame.format = AV_PIX_FMT_YUV420P;
        frame.pts = BigInt(i);
        frame.timeBase = new Rational(1, 30);
        assert.equal(frame.getBuffer(), 0, 'Should allocate frame buffer');
        const planes = frame.data;
        if (planes?.[0]) {
          const y = planes[0];
          for (let p = 0; p < 320 * 240; p++) y[p] = (p + i) % 256;
          if (planes[1] && planes[2]) {
            const chromaSize = (320 * 240) / 4;
            for (let p = 0; p < chromaSize; p++) {
              planes[1][p] = 128;
              planes[2][p] = 128;
            }
          }
        }
        if (i === forceAt) frame.pictType = AV_PICTURE_TYPE_I;
        await drain(frame);
      }
      await drain(null); // flush
      return keyframes;
    }

    // A long GOP means the only keyframes are the initial IDR and any forced
    // one, so the forced keyframe is unambiguous.
    const forcedKeyframeEncoder = () =>
      Encoder.create(FF_ENCODER_LIBX264, {
        gopSize: 1000,
        maxBFrames: 0,
        options: { preset: 'ultrafast', tune: 'zerolatency', 'forced-idr': true },
      });

    it('should not force a keyframe from pictType by default', needsX264, async () => {
      const encoder = await forcedKeyframeEncoder();
      const keyframes = await keyframeIndices(encoder, 10, 5);
      encoder.close();
      // Only the initial IDR; the request on frame 5 is cleared before encoding.
      assert.deepEqual(keyframes, [0], `expected only the initial keyframe, got [${keyframes}]`);
    });

    it('should force a keyframe from pictType when preserveFramePictType is set', needsX264, async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        gopSize: 1000,
        maxBFrames: 0,
        preserveFramePictType: true,
        options: { preset: 'ultrafast', tune: 'zerolatency', 'forced-idr': true },
      });
      const keyframes = await keyframeIndices(encoder, 10, 5);
      encoder.close();
      assert.ok(keyframes.includes(5), `expected a forced keyframe at frame 5, got [${keyframes}]`);
    });

    it('should encode video frames (sync)', needsX264, () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264, {
        bitrate: '500k',
        gopSize: 10,
      });

      // Create test frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 320;
      frame.height = 240;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 25);

      const ret = frame.getBuffer();
      assert.equal(ret, 0, 'Should allocate frame buffer');

      // Fill with test data (hoist the native data getter out of the loops)
      const planes = frame.data;
      if (planes?.[0]) {
        // Y plane - gradient
        const y = planes[0];
        for (let i = 0; i < 320 * 240; i++) {
          y[i] = i % 256;
        }
        // U and V planes - gray
        if (planes[1] && planes[2]) {
          const u = planes[1];
          const v = planes[2];
          const chromaSize = (320 * 240) / 4;
          for (let i = 0; i < chromaSize; i++) {
            u[i] = 128;
            v[i] = 128;
          }
        }
      }

      // Encode frame and drain packets using sync helper
      for (using _packet of encodeFrameSync(encoder, frame)) {
        // drain packets
      }

      encoder.close();
    });

    it('should encode audio frames (async)', async () => {
      const encoder = await Encoder.create(FF_ENCODER_AAC, {
        bitrate: '128k',
      });

      // Create test frame with typical AAC frame size
      using frame = new Frame();
      frame.alloc();
      frame.nbSamples = 1024; // Typical AAC frame size
      frame.sampleRate = 44100;
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 44100);

      const ret = frame.getBuffer();
      assert.equal(ret, 0, 'Should allocate frame buffer');
      for (const plane of frame.data ?? []) {
        plane.fill(0);
      }

      // Encode frame and drain packets using helper
      for await (using _packet of encodeFrame(encoder, frame)) {
        // drain packets
      }

      encoder.close();
    });

    it('should encode audio frames (sync)', () => {
      const encoder = Encoder.createSync(FF_ENCODER_AAC, {
        bitrate: '128k',
      });

      // Create test frame with typical AAC frame size
      using frame = new Frame();
      frame.alloc();
      frame.nbSamples = 1024; // Typical AAC frame size
      frame.sampleRate = 44100;
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 44100);

      const ret = frame.getBuffer();
      assert.equal(ret, 0, 'Should allocate frame buffer');
      for (const plane of frame.data ?? []) {
        plane.fill(0);
      }

      // Encode frame and drain packets using sync helper
      for (using _packet of encodeFrameSync(encoder, frame)) {
        // drain packets
      }

      encoder.close();
    });

    function makeAudioFrame(sampleRate: number, pts: bigint): Frame {
      const frame = new Frame();
      frame.alloc();
      frame.nbSamples = 1152;
      frame.sampleRate = sampleRate;
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.pts = pts;
      frame.timeBase = new Rational(1, sampleRate);
      assert.equal(frame.getBuffer(), 0, 'Should allocate frame buffer');
      // getBuffer() leaves the sample data uninitialized; zero it to silence so the
      // encoder gets valid floats (garbage NaN/Inf samples trip libmp3lame's psymodel).
      for (const plane of frame.data ?? []) {
        plane.fill(0);
      }
      return frame;
    }

    it('autoResample converts an unsupported input rate so the codec accepts it', { timeout: 30000 }, () => {
      // libmp3lame does NOT support 96000 Hz - autoResample should convert to a supported rate.
      const encoder = Encoder.createSync(FF_ENCODER_LIBMP3LAME, { bitrate: '128k', autoResample: true });
      try {
        let packets = 0;
        for (let i = 0; i < 10; i++) {
          using frame = makeAudioFrame(96000, BigInt(i * 1152));
          for (const p of encoder.encodeAllSync(frame)) {
            packets++;
            p.free();
          }
        }
        encoder.flushSync();
        let pkt;
        while ((pkt = encoder.receiveSync())) {
          packets++;
          pkt.free();
        }

        assert.ok(packets > 0, 'should produce MP3 packets from a 96 kHz input');
        assert.equal(encoder.getCodecContext()?.sampleRate, 48000, 'encoder should have resampled to a supported rate');
      } finally {
        encoder.close();
      }
    });

    it('autoResample rate conversion keeps real-time packet timestamps', { timeout: 30000 }, () => {
      // 96 kHz input resampled to 48 kHz: packet timing must follow the codec rate
      // (timebase 1/48000), not the input timebase. Previously the 48 kHz sample
      // counters were stamped in the input timebase, so audio played at the wrong
      // speed and drifted progressively out of sync.
      const encoder = Encoder.createSync(FF_ENCODER_LIBMP3LAME, { bitrate: '128k', autoResample: true });
      try {
        const inputFrames = 20;
        let lastEndSeconds = 0;
        const collect = (packets: Packet[]) => {
          for (const p of packets) {
            lastEndSeconds = (Number(p.pts + p.duration) * p.timeBase.num) / p.timeBase.den;
            p.free();
          }
        };

        for (let i = 0; i < inputFrames; i++) {
          using frame = makeAudioFrame(96000, BigInt(i * 1152));
          collect(encoder.encodeAllSync(frame));
        }

        const ctx = encoder.getCodecContext();
        assert.equal(ctx?.timeBase.num, 1, 'codec timebase numerator should be 1');
        assert.equal(ctx?.timeBase.den, 48000, 'codec timebase must be 1/target rate, not the input timebase');

        collect(encoder.encodeAllSync(null)); // flush

        // 20 frames x 1152 samples at 96 kHz = 0.24 s of audio; the encoded stream
        // must end at that point in real time (within a frame of silence padding).
        const expectedSeconds = (inputFrames * 1152) / 96000;
        const frameSeconds = 1152 / 48000;
        assert.ok(
          Math.abs(lastEndSeconds - expectedSeconds) <= 2 * frameSeconds,
          `encoded duration ${lastEndSeconds}s should match real-time input duration ${expectedSeconds}s`,
        );
      } finally {
        encoder.close();
      }
    });

    it('autoResample rate conversion keeps the input start time', { timeout: 30000 }, () => {
      // The resampled frames used to be stamped from 0, so a stream starting at 1 s
      // lost its offset against the other streams of the output.
      const encoder = Encoder.createSync(FF_ENCODER_LIBMP3LAME, { bitrate: '128k', autoResample: true });
      try {
        const starts: number[] = [];
        for (let i = 0; i < 20; i++) {
          using frame = makeAudioFrame(96000, BigInt(96000 + i * 1152));
          for (const p of encoder.encodeAllSync(frame)) {
            starts.push((Number(p.pts) * p.timeBase.num) / p.timeBase.den);
            p.free();
          }
        }
        for (const p of encoder.encodeAllSync(null)) {
          starts.push((Number(p.pts) * p.timeBase.num) / p.timeBase.den);
          p.free();
        }

        // Encoder delay shifts the first packet back by less than a frame
        const frameSeconds = 1152 / 48000;
        assert.ok(starts.length > 0, 'should produce packets');
        assert.ok(Math.abs(starts[0] - 1) <= frameSeconds, `first packet at ${starts[0]}s should start near the input start of 1s`);
      } finally {
        encoder.close();
      }
    });

    it('fixed-frame-size audio keeps the input timing across offsets and gaps', async () => {
      // AAC needs 1024-sample frames, so the input runs through the frame buffer.
      // Before, its output was re-stamped from 0 by sample count: the 2 s start
      // offset and the 3 s gap were lost and audio ran ahead of the other streams.
      const rate = 44100;
      const encoder = await Encoder.create(FF_ENCODER_AAC, { bitrate: '128k' });
      try {
        const makeFrame = (pts: number): Frame => {
          const frame = new Frame();
          frame.alloc();
          frame.nbSamples = 1000;
          frame.sampleRate = rate;
          frame.format = AV_SAMPLE_FMT_FLTP;
          frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
          frame.pts = BigInt(pts);
          frame.timeBase = new Rational(1, rate);
          assert.equal(frame.getBuffer(), 0, 'Should allocate frame buffer');
          for (const plane of frame.data ?? []) {
            plane.fill(0);
          }
          return frame;
        };

        const first = 2 * rate;
        const resume = first + 20000 + 3 * rate;
        const starts = [...Array.from({ length: 20 }, (_, i) => first + i * 1000), ...Array.from({ length: 20 }, (_, i) => resume + i * 1000)];

        const pts: bigint[] = [];
        for (const start of starts) {
          using frame = makeFrame(start);
          for (const p of await encoder.encodeAll(frame)) {
            pts.push(p.pts);
            p.free();
          }
        }
        for (const p of await encoder.encodeAll(null)) {
          pts.push(p.pts);
          p.free();
        }

        // A priming packet (1024 samples for AAC) precedes the packet of the first input sample
        assert.equal(pts[0], BigInt(first - 1024), `first packet at ${pts[0]} should start at the input start ${first} minus the AAC priming`);
        assert.equal(pts[1], BigInt(first));

        // The gap counts once it persisted over 0.2 s of resumed input (9 frames here): the frames
        // before the confirming one continue the old timeline, then the partial output frame is
        // padded with silence and output restarts at the input timestamp of the confirming frame
        const early = (Math.ceil((0.2 * rate) / 1000) - 1) * 1000;
        const restartIndex = Math.ceil((20000 + early) / 1024) * 1024;
        const steps = pts.slice(1).map((p, i) => p - pts[i]);
        const jumps = steps.map((step, i) => ({ step, i })).filter(({ step }) => step !== 1024n);
        assert.equal(jumps.length, 1, `only the gap should break the 1024-sample cadence, got ${jumps.map((j) => j.step).join(', ')}`);
        assert.equal(jumps[0].step, BigInt(resume + early - (first + restartIndex - 1024)), 'the gap is kept in the packet timestamps');
        assert.equal(pts[jumps[0].i + 1], BigInt(resume + early), 'output restarts at the input timestamp');
      } finally {
        encoder.close();
      }
    });

    it('passes audioFrameBuffer options to the frame buffer', async () => {
      await assert.rejects(Encoder.create(FF_ENCODER_AAC, { audioFrameBuffer: { maxGapFill: -1 } }), RangeError);
      assert.throws(() => Encoder.createSync(FF_ENCODER_AAC, { audioFrameBuffer: { maxGapFill: Number.NaN } }), RangeError);

      // timestamps: 'samples' ignores the 2 s input offset and counts from 0
      const rate = 44100;
      const encoder = await Encoder.create(FF_ENCODER_AAC, { bitrate: '128k', audioFrameBuffer: { timestamps: 'samples' } });
      try {
        const pts: bigint[] = [];
        for (let i = 0; i < 10; i++) {
          using frame = new Frame();
          frame.alloc();
          frame.nbSamples = 1000;
          frame.sampleRate = rate;
          frame.format = AV_SAMPLE_FMT_FLTP;
          frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
          frame.pts = BigInt(2 * rate + i * 1000);
          frame.timeBase = new Rational(1, rate);
          assert.equal(frame.getBuffer(), 0, 'Should allocate frame buffer');
          // getBuffer() leaves the samples uninitialized; garbage NaN/Inf makes aac reject frames
          for (const plane of frame.data ?? []) {
            plane.fill(0);
          }
          for (const p of await encoder.encodeAll(frame)) {
            pts.push(p.pts);
            p.free();
          }
        }
        assert.equal(pts[0], -1024n, 'priming packet before the first frame at 0');
        assert.equal(pts[1], 0n);
      } finally {
        encoder.close();
      }
    });

    it('throws a descriptive error for an unsupported input rate when autoResample is off (default)', () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBMP3LAME, { bitrate: '128k' });
      try {
        using frame = makeAudioFrame(96000, 0n);
        assert.throws(() => encoder.encodeSync(frame), /autoResample|does not support/i);
      } finally {
        encoder.close();
      }
    });

    it('accepts an unspecified channel layout (PCM) by normalizing it', () => {
      // PCM/raw frames carry an unspecified layout (order UNSPEC, mask 0). The encoder
      // must normalize it to a concrete native layout, otherwise avcodec_open2 rejects
      // it with "Invalid argument". 44100 Hz fltp stereo needs no resampling here, so
      // this isolates the layout handling.
      const makeUnspecFrame = (pts: bigint): Frame => {
        const frame = new Frame();
        frame.alloc();
        frame.nbSamples = 1024;
        frame.sampleRate = 44100;
        frame.format = AV_SAMPLE_FMT_FLTP;
        frame.channelLayout = { order: AV_CHANNEL_ORDER_UNSPEC, nbChannels: 2, mask: 0n };
        frame.pts = pts;
        frame.timeBase = new Rational(1, 44100);
        assert.equal(frame.getBuffer(), 0, 'Should allocate frame buffer');
        for (const plane of frame.data ?? []) {
          plane.fill(0);
        }
        return frame;
      };

      const encoder = Encoder.createSync(FF_ENCODER_AAC, { bitrate: '128k' });
      try {
        let packets = 0;
        for (let i = 0; i < 10; i++) {
          using frame = makeUnspecFrame(BigInt(i * 1024));
          for (const p of encoder.encodeAllSync(frame)) {
            packets++;
            p.free();
          }
        }
        encoder.flushSync();
        let pkt;
        while ((pkt = encoder.receiveSync())) {
          packets++;
          pkt.free();
        }
        assert.ok(packets > 0, 'should encode frames carrying an unspecified layout');
      } finally {
        encoder.close();
      }
    });

    it('passes AV_NOPTS_VALUE frame pts through without rescaling it into garbage', () => {
      // Rescaling AV_NOPTS_VALUE (INT64_MIN) produces a huge negative timestamp
      // instead of the "unset" marker; the encoder must leave it untouched so the
      // codec can apply its own fallback.
      const encoder = Encoder.createSync(FF_ENCODER_MJPEG, {});
      try {
        using frame = createMjpegFrame(64, 64);
        frame.pts = AV_NOPTS_VALUE;

        const packets = [...encoder.encodeAllSync(frame), ...encoder.encodeAllSync(null)];
        assert.ok(packets.length > 0, 'should produce a packet');
        for (const p of packets) {
          assert.ok(p.pts === AV_NOPTS_VALUE || p.pts >= 0n, `packet pts must be NOPTS or a sane fallback, got ${p.pts}`);
          p.free();
        }
      } finally {
        encoder.close();
      }
    });

    it('should handle null packets gracefully (async)', needsX264, async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      // Create and encode frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 320;
      frame.height = 240;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 25);
      frame.getBuffer();

      // Drain any available packets using helper
      for await (using _packet of encodeFrame(encoder, frame)) {
        // drain packets
      }

      encoder.close();
    });

    it('should handle null packets gracefully (sync)', needsX264, () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264);

      // Create and encode frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 320;
      frame.height = 240;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 25);
      frame.getBuffer();

      // Drain any available packets using sync helper
      for (using _packet of encodeFrameSync(encoder, frame)) {
        // drain packets
      }

      encoder.close();
    });

    it('should not throw when encoder is closed (async)', needsX264, async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      // Initialize encoder with a frame first
      using initFrame = new Frame();
      initFrame.alloc();
      initFrame.width = 320;
      initFrame.height = 240;
      initFrame.format = AV_PIX_FMT_YUV420P;
      initFrame.pts = 0n;
      initFrame.timeBase = new Rational(1, 25);
      initFrame.getBuffer();
      // Drain any available packets using helper
      for await (using _packet of encodeFrame(encoder, initFrame)) {
        // drain packets
      }

      encoder.close();

      using frame = new Frame();
      frame.alloc();
      frame.width = 320;
      frame.height = 240;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 25);

      await assert.doesNotReject(async () => await encoder.encode(frame));
    });

    it('should not throw when encoder is closed (sync)', needsX264, () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264);

      // Initialize encoder with a frame first
      using initFrame = new Frame();
      initFrame.alloc();
      initFrame.width = 320;
      initFrame.height = 240;
      initFrame.format = AV_PIX_FMT_YUV420P;
      initFrame.pts = 0n;
      initFrame.timeBase = new Rational(1, 25);
      initFrame.getBuffer();
      // Drain any available packets using sync helper
      for (using _packet of encodeFrameSync(encoder, initFrame)) {
        // drain packets
      }

      encoder.close();

      using frame = new Frame();
      frame.alloc();
      frame.width = 320;
      frame.height = 240;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 25);

      assert.doesNotThrow(() => encoder.encodeSync(frame));
    });
  });

  describe('autoFormat', () => {
    // RGB24 is not in libx264's supported pixel format list, so it exercises the
    // pixel-format negotiation path (the input must be converted to planar YUV).
    const makeRgbFrame = (pts: bigint): Frame => {
      const frame = new Frame();
      frame.alloc();
      frame.width = 320;
      frame.height = 240;
      frame.format = AV_PIX_FMT_RGB24;
      frame.pts = pts;
      frame.timeBase = new Rational(1, 25);
      assert.equal(frame.getBuffer(), 0, 'Should allocate frame buffer');
      // Hoist the native data getter out of the loop (it marshals the plane buffers
      // on every access); fill the single RGB plane with a gradient in one pass.
      const plane = frame.data?.[0];
      if (plane) {
        for (let i = 0; i < 320 * 240 * 3; i++) {
          plane[i] = i % 256;
        }
      }
      return frame;
    };

    it('picks the least-loss supported format (rgb24 -> yuv444p)', () => {
      // Naively picking the first supported format (yuv420p) would throw away chroma
      // when a fuller format is available; avcodec_find_best_pix_fmt_of_list keeps it.
      const best = avcodecFindBestPixFmtOfList([AV_PIX_FMT_YUV420P, AV_PIX_FMT_YUV422P, AV_PIX_FMT_YUV444P], AV_PIX_FMT_RGB24);
      assert.equal(best, AV_PIX_FMT_YUV444P, 'should pick the full-chroma format for an RGB source');
    });

    it('throws a descriptive error on an unsupported pixel format when disabled (async)', needsX264, async () => {
      using encoder = await Encoder.create(FF_ENCODER_LIBX264, { bitrate: '500k' });
      using frame = makeRgbFrame(0n);
      await assert.rejects(() => encoder.encode(frame), /does not support the input pixel format \(rgb24\)/);
    });

    it('converts an unsupported pixel format to a codec-supported one when enabled (async)', needsX264, async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, { bitrate: '500k', autoFormat: true });
      try {
        let packets = 0;
        for (let i = 0; i < 10; i++) {
          using frame = makeRgbFrame(BigInt(i));
          for await (using _p of encoder.packets(frame)) {
            packets++;
          }
        }
        for await (using _p of encoder.packets(null)) {
          packets++;
        }
        assert.ok(packets > 0, 'should encode frames whose pixel format needed conversion');
      } finally {
        encoder.close();
      }
    });

    it('converts an unsupported pixel format to a codec-supported one when enabled (sync)', needsX264, () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264, { bitrate: '500k', autoFormat: true });
      try {
        let packets = 0;
        for (let i = 0; i < 10; i++) {
          using frame = makeRgbFrame(BigInt(i));
          for (const p of encoder.encodeAllSync(frame)) {
            packets++;
            p.free();
          }
        }
        encoder.flushSync();
        let pkt;
        while ((pkt = encoder.receiveSync())) {
          packets++;
          pkt.free();
        }
        assert.ok(packets > 0, 'should encode frames whose pixel format needed conversion');
      } finally {
        encoder.close();
      }
    });
  });

  describe('configure', needsX264, () => {
    const makeYuvFrame = (pts: bigint): Frame => {
      const frame = new Frame();
      frame.alloc();
      frame.width = 320;
      frame.height = 240;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = pts;
      frame.timeBase = new Rational(1, 25);
      assert.equal(frame.getBuffer(), 0, 'Should allocate frame buffer');
      return frame;
    };

    it('applies the context option bag before open (async)', async () => {
      using encoder = await Encoder.create(FF_ENCODER_LIBX265, { context: { bitRate: '500k', gopSize: 42, maxBFrames: 0 } });
      using frame = makeYuvFrame(0n);
      await encoder.encode(frame);
      const ctx = encoder.getCodecContext();
      assert.equal(ctx?.gopSize, 42, 'context.gopSize should be applied');
      assert.equal(ctx?.maxBFrames, 0, 'context.maxBFrames should be applied');
    });

    it('parses rate-control strings in the context bag (async)', async () => {
      using encoder = await Encoder.create(FF_ENCODER_LIBX265, { context: { bitRate: '5M', rcBufferSize: '2M', rcMaxRate: 8_000_000 } });
      using frame = makeYuvFrame(0n);
      await encoder.encode(frame);
      const ctx = encoder.getCodecContext();
      assert.equal(ctx?.bitRate, 5_000_000n, "context.bitRate '5M' should parse to bits/s");
      assert.equal(ctx?.rcBufferSize, 2_000_000, "context.rcBufferSize '2M' should parse to a number");
      assert.equal(ctx?.rcMaxRate, 8_000_000n, 'context.rcMaxRate number should coerce to bigint');
    });

    it('runs the configure hook to set context fields before open (async)', async () => {
      let called = false;
      using encoder = await Encoder.create(FF_ENCODER_LIBX265, {
        bitrate: '500k',
        configure: (ctx) => {
          called = true;
          ctx.codecTag = 'hvc1';
        },
      });
      using frame = makeYuvFrame(0n);
      await encoder.encode(frame);
      assert.ok(called, 'configure should be invoked');
      assert.equal(encoder.getCodecContext()?.codecTagString, 'hvc1', 'configure mutations should take effect before open');
    });

    it('runs the configure hook to set context fields before open (sync)', () => {
      let called = false;
      using encoder = Encoder.createSync(FF_ENCODER_LIBX265, {
        bitrate: '500k',
        configure: (ctx) => {
          called = true;
          ctx.codecTag = 'hvc1';
        },
      });
      using frame = makeYuvFrame(0n);
      encoder.encodeSync(frame);
      assert.ok(called, 'configure should be invoked');
      assert.equal(encoder.getCodecContext()?.codecTagString, 'hvc1', 'configure mutations should take effect before open');
    });
  });

  describe('encodeOne', () => {
    it('should encode a single frame to JPEG (async)', async () => {
      using frame = createMjpegFrame(320, 240);

      const jpeg = await Encoder.encodeOne(FF_ENCODER_MJPEG, frame);

      assert.ok(Buffer.isBuffer(jpeg));
      assert.ok(jpeg.length > 0, 'should produce bytes');
      assert.ok(isJpeg(jpeg), 'should be a valid JPEG');
    });

    it('should encode a single frame to JPEG (sync)', () => {
      using frame = createMjpegFrame(320, 240);

      const jpeg = Encoder.encodeOneSync(FF_ENCODER_MJPEG, frame);

      assert.ok(isJpeg(jpeg), 'should be a valid JPEG');
    });

    it('should handle varying dimensions without reconfiguration (async)', async () => {
      using small = createMjpegFrame(100, 100);
      using large = createMjpegFrame(256, 144);

      const a = await Encoder.encodeOne(FF_ENCODER_MJPEG, small);
      const b = await Encoder.encodeOne(FF_ENCODER_MJPEG, large);

      assert.ok(isJpeg(a), 'small frame should be a valid JPEG');
      assert.ok(isJpeg(b), 'large frame should be a valid JPEG');
    });

    it('should handle varying dimensions without reconfiguration (sync)', () => {
      using small = createMjpegFrame(100, 100);
      using large = createMjpegFrame(256, 144);

      const a = Encoder.encodeOneSync(FF_ENCODER_MJPEG, small);
      const b = Encoder.encodeOneSync(FF_ENCODER_MJPEG, large);

      assert.ok(isJpeg(a), 'small frame should be a valid JPEG');
      assert.ok(isJpeg(b), 'large frame should be a valid JPEG');
    });

    it('should not mutate the input frame pts (async)', async () => {
      using frame = createMjpegFrame(320, 240);
      frame.pts = 42n;

      await Encoder.encodeOne(FF_ENCODER_MJPEG, frame);

      assert.equal(frame.pts, 42n, 'frame pts should be preserved');
    });
  });

  describe('flush', () => {
    it('should flush remaining packets (async)', needsX264, async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        gopSize: 10,
      });

      // Encode some frames first
      for (let i = 0; i < 5; i++) {
        using frame = new Frame();
        frame.alloc();
        frame.width = 320;
        frame.height = 240;
        frame.format = AV_PIX_FMT_YUV420P;
        frame.pts = BigInt(i);
        frame.timeBase = new Rational(1, 25);
        frame.getBuffer();

        // Drain available packets using helper after each encode
        for await (using _packet of encodeFrame(encoder, frame)) {
          // drain packets
        }
      }

      // Flush encoder
      let flushCount = 0;
      for await (using _packet of encoder.flushPackets()) {
        flushCount++;
        if (flushCount > 20) {
          break; // Safety limit
        }
      }

      encoder.close();
    });

    it('should flush remaining packets (sync)', needsX264, () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264, {
        gopSize: 10,
      });

      // Encode some frames first
      for (let i = 0; i < 5; i++) {
        using frame = new Frame();
        frame.alloc();
        frame.width = 320;
        frame.height = 240;
        frame.format = AV_PIX_FMT_YUV420P;
        frame.pts = BigInt(i);
        frame.timeBase = new Rational(1, 25);
        frame.getBuffer();

        // Drain available packets using sync helper after each encode
        for (using _packet of encodeFrameSync(encoder, frame)) {
          // drain packets
        }
      }

      // Flush encoder
      let flushCount = 0;
      for (using _packet of encoder.flushPacketsSync()) {
        flushCount++;
        if (flushCount > 20) break; // Safety limit
      }

      encoder.close();
    });

    // AAC uses a fixed frame size of 1024 samples, so input that isn't a multiple
    // of it exercises the FIFO partial-drain path at flush.
    const makePartialAudioFrame = (nbSamples: number, pts: bigint): Frame => {
      const frame = new Frame();
      frame.alloc();
      frame.nbSamples = nbSamples;
      frame.sampleRate = 44100;
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.pts = pts;
      frame.timeBase = new Rational(1, 44100);
      assert.equal(frame.getBuffer(), 0, 'Should allocate frame buffer');
      for (const plane of frame.data ?? []) {
        plane.fill(0);
      }
      return frame;
    };

    it('encodes the final partial FIFO frame instead of dropping it (async)', async () => {
      const encoder = await Encoder.create(FF_ENCODER_AAC, { bitrate: '128k' });
      try {
        const inputSamples = 3 * 500; // 1500 samples: 1 full 1024 frame + a 476-sample tail
        let streamEnd = 0n;

        // Track the end position via pts + duration instead of summing durations:
        // the AAC encoder prepends priming samples (negative pts), which shift the
        // stream start but not the end coverage.
        const track = (p: { pts: bigint; duration: bigint; free: () => void }): void => {
          if (p.pts + p.duration > streamEnd) {
            streamEnd = p.pts + p.duration;
          }
          p.free();
        };

        for (let i = 0; i < 3; i++) {
          using frame = makePartialAudioFrame(500, BigInt(i * 500));
          for (const p of await encoder.encodeAll(frame)) {
            track(p);
          }
        }
        for (const p of await encoder.encodeAll(null)) {
          track(p);
        }

        // Previously the tail was silently dropped (stream ended at 1024 < 1500);
        // now it is padded with silence, covering the input within one frame.
        assert.ok(streamEnd >= BigInt(inputSamples), `stream end ${streamEnd} should cover the ${inputSamples} input samples`);
        assert.ok(streamEnd <= BigInt(inputSamples + 1024), 'silence padding should not exceed one frame');
      } finally {
        encoder.close();
      }
    });

    it('encodes the final partial FIFO frame instead of dropping it (sync)', () => {
      const encoder = Encoder.createSync(FF_ENCODER_AAC, { bitrate: '128k' });
      try {
        const inputSamples = 3 * 500;
        let streamEnd = 0n;

        const track = (p: { pts: bigint; duration: bigint; free: () => void }): void => {
          if (p.pts + p.duration > streamEnd) {
            streamEnd = p.pts + p.duration;
          }
          p.free();
        };

        for (let i = 0; i < 3; i++) {
          using frame = makePartialAudioFrame(500, BigInt(i * 500));
          for (const p of encoder.encodeAllSync(frame)) {
            track(p);
          }
        }
        for (const p of encoder.encodeAllSync(null)) {
          track(p);
        }

        assert.ok(streamEnd >= BigInt(inputSamples), `stream end ${streamEnd} should cover the ${inputSamples} input samples`);
        assert.ok(streamEnd <= BigInt(inputSamples + 1024), 'silence padding should not exceed one frame');
      } finally {
        encoder.close();
      }
    });

    it('should handle flush when encoder is closed (async)', needsX264, async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      encoder.close();

      // flush() returns void now and doesn't throw when closed
      await encoder.flush(); // Should not throw
    });

    it('should handle flush when encoder is closed (sync)', needsX264, () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264);

      encoder.close();

      // flushSync() returns void now and doesn't throw when closed
      encoder.flushSync(); // Should not throw
    });
  });

  describe('async iterator', needsX264, () => {
    it('should encode frames using iterator (async)', async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        bitrate: '500k',
        gopSize: 10,
      });

      // Create test frames
      async function* generateFrames() {
        for (let i = 0; i < 5; i++) {
          const frame = new Frame();
          frame.alloc();
          frame.width = 320;
          frame.height = 240;
          frame.format = AV_PIX_FMT_YUV420P;
          frame.pts = BigInt(i);
          frame.timeBase = new Rational(1, 25);
          frame.getBuffer();
          yield frame;
          // Frame will be freed by caller
        }
      }

      let packetCount = 0;
      for await (using packet of encoder.packets(generateFrames())) {
        if (!packet) {
          break;
        }
        assert.ok(packet);
        packetCount++;
      }

      // May get more or fewer packets due to B-frames
      assert.ok(packetCount >= 0, 'Should produce packets');

      encoder.close();
    });

    it('should encode frames using iterator (sync)', () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264, {
        bitrate: '500k',
        gopSize: 10,
      });

      // Create test frames
      function* generateFrames() {
        for (let i = 0; i < 5; i++) {
          const frame = new Frame();
          frame.alloc();
          frame.width = 320;
          frame.height = 240;
          frame.format = AV_PIX_FMT_YUV420P;
          frame.pts = BigInt(i);
          frame.getBuffer();
          frame.timeBase = new Rational(1, 25);
          yield frame;
          // Frame will be freed by caller
        }
      }

      let packetCount = 0;
      for (using packet of encoder.packetsSync(generateFrames())) {
        if (!packet) {
          break;
        }
        assert.ok(packet);
        packetCount++;
      }

      // May get more or fewer packets due to B-frames
      assert.ok(packetCount >= 0, 'Should produce packets');

      encoder.close();
    });

    it('should handle empty frame stream (async)', async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      // Empty async generator
      async function* emptyFrames() {
        // No frames
      }

      let packetCount = 0;
      for await (using _packet of encoder.packets(emptyFrames())) {
        if (!_packet) {
          break;
        }
        packetCount++;
      }

      assert.equal(packetCount, 0, 'Should not produce packets from empty stream');

      encoder.close();
    });

    it('should handle empty frame stream (sync)', () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264);

      // Empty generator
      function* emptyFrames() {
        // No frames
      }

      let packetCount = 0;
      for (using _packet of encoder.packetsSync(emptyFrames())) {
        if (!_packet) {
          break;
        }
        packetCount++;
      }

      assert.equal(packetCount, 0, 'Should not produce packets from empty stream');

      encoder.close();
    });
  });

  describe('hardware encoding', () => {
    it('should create hardware encoder with hardware context', async () => {
      // Try to get hardware context
      const hw = HardwareContext.auto();
      if (!hw) {
        return;
      }

      // Get hardware encoder codec name
      const encoderCodec = hw.getEncoderCodec('h264', true);
      if (!encoderCodec) {
        hw.dispose();
        return;
      }

      try {
        const encoder = await Encoder.create(encoderCodec, {
          bitrate: '1M',
        });

        assert.ok(encoder);
        assert.equal(encoder.isEncoderOpen, true);
        assert.equal(encoder.getCodec().name, encoderCodec.name);

        encoder.close();
      } catch (error) {
        // Hardware encoder creation might fail on some systems
        console.log('Hardware encoder creation failed:', error.message);
      }

      hw.dispose();
    });
  });

  describe('resource management', needsX264, () => {
    it('should support Symbol.dispose', async () => {
      {
        using encoder = await Encoder.create(FF_ENCODER_LIBX264);
        assert.equal(encoder.isEncoderOpen, true);
        // Encoder will be closed automatically
      }
    });

    it('should handle multiple close calls', async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      // Should not throw
      encoder.close();
      encoder.close();
      encoder.close();

      assert.equal(encoder.isEncoderOpen, false);
    });

    it('should return null codec context before initialization', async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      // Before initialization, codec context should be null
      assert.equal(encoder.getCodecContext(), null);

      encoder.close();
    });

    it('should return null codec context when closed', async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      // Initialize encoder with a frame first
      using frame = new Frame();
      frame.alloc();
      frame.width = 320;
      frame.height = 240;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 25);
      frame.getBuffer();
      await encoder.encode(frame);

      // Now codec context should be available
      assert.ok(encoder.getCodecContext());
      encoder.close();
      assert.equal(encoder.getCodecContext(), null);
    });
  });

  describe('AbortSignal', needsX264, () => {
    it('should reject create with pre-aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();
      await assert.rejects(() => Encoder.create(FF_ENCODER_LIBX264, { signal: controller.signal }), { name: 'AbortError' });
    });

    it('should abort encode with signal', async () => {
      const controller = new AbortController();
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, { signal: controller.signal });

      controller.abort();

      const frame = new Frame();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 320;
      frame.height = 240;
      frame.alloc();
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 30);

      await assert.rejects(() => encoder.encode(frame), { name: 'AbortError' });
      frame.free();
      encoder.close();
    });
  });

  describe('options object', needsX264, () => {
    it('should leave the options object it was given unchanged', async () => {
      const options = { gopSize: 30 };
      const audio = await Encoder.create(FF_ENCODER_AAC, options);
      const video = Encoder.createSync(FF_ENCODER_LIBX264, options);
      // bitrate used to be written back as a default, so the audio encoder's
      // 128k ended up in the video encoder
      assert.deepEqual(options, { gopSize: 30 });
      video.close();
      audio.close();
    });
  });

  describe('frame rate', needsX264, () => {
    it("should take the stream's guessed frame rate when the decoder has none", async () => {
      // VP9 carries no frame rate in its bitstream: the decoder reports 0/1, the
      // WebM stream 30 fps. Without a framerate the encoder would fall back to
      // the frames' 1/1000 time base and read it as 1000 fps
      await using media = await Demuxer.open(getInputFile('video-vp9.webm'));
      const video = media.video()!;
      using decoder = await Decoder.create(video);
      assert.equal(decoder.getCodecContext()!.framerate.num, 0);
      using encoder = await Encoder.create(FF_ENCODER_LIBX264, { decoder, options: { preset: 'ultrafast' } });

      for await (using frame of decoder.frames(media.packets(video.index))) {
        if (!frame) continue;
        (await encoder.encodeAll(frame)).forEach((p) => p.free());
        break;
      }

      const ctx = encoder.getCodecContext()!;
      assert.deepEqual({ ...ctx.framerate }, { num: 30, den: 1 });
      assert.deepEqual({ ...ctx.timeBase }, { num: 1, den: 30 });
    });

    it('should not take a briefly probed stream clock as frame rate', async () => {
      // The cover picture runs on a 1/90000 clock. Probed like RTPStream does, the
      // guess is that clock: 90000 fps, as for MJPEG over RTSP
      await using media = await Demuxer.open(getInputFile('audio-cover.mp3'), { options: { analyzeduration: 0, probesize: 32 } });
      const video = media.video()!;
      using decoder = await Decoder.create(video);
      assert.deepEqual({ ...decoder.getGuessedFrameRate() }, { num: 90000, den: 1 });
      using encoder = await Encoder.create(FF_ENCODER_LIBX264, { decoder, autoFormat: true, options: { preset: 'ultrafast' } });

      for await (using frame of decoder.frames(media.packets(video.index))) {
        if (!frame) continue;
        (await encoder.encodeAll(frame)).forEach((p) => p.free());
        break;
      }

      const ctx = encoder.getCodecContext()!;
      assert.deepEqual({ ...ctx.framerate }, { num: 25, den: 1 }, 'declares the fallback rate');
      assert.deepEqual({ ...ctx.timeBase }, { num: 1, den: 90000 }, 'keeps the clock for the timestamps');
    });

    it('should declare 25 fps for frames on a clock without a rate', async () => {
      using encoder = await Encoder.create(FF_ENCODER_LIBX264, { options: { preset: 'ultrafast' } });
      using frame = syntheticVideoFrame(0);
      frame.timeBase = new Rational(1, 90000);
      (await encoder.encodeAll(frame)).forEach((p) => p.free());

      const ctx = encoder.getCodecContext()!;
      assert.deepEqual({ ...ctx.framerate }, { num: 25, den: 1 });
      assert.deepEqual({ ...ctx.timeBase }, { num: 1, den: 90000 });
    });

    it('should read a frame-rate time base as the rate', () => {
      using encoder = Encoder.createSync(FF_ENCODER_LIBX264, { options: { preset: 'ultrafast' } });
      using frame = syntheticVideoFrame(0);
      encoder.encodeAllSync(frame).forEach((p) => p.free());

      const ctx = encoder.getCodecContext()!;
      assert.equal(ctx.framerate.num, 0, 'nothing declared');
      assert.deepEqual({ ...ctx.timeBase }, { num: 1, den: 30 });
    });
  });

  describe('audio bitrate', () => {
    it("should leave the bitrate to the codec's default", async () => {
      // G.726 derives its bits per sample from the bitrate: a fixed 128k default
      // gave G.726-40 instead of the standard 32k
      using encoder = await Encoder.create(FF_ENCODER_ADPCM_G726);
      using frame = new Frame();
      frame.alloc();
      frame.format = AV_SAMPLE_FMT_S16;
      frame.sampleRate = 8000;
      frame.channelLayout = AV_CHANNEL_LAYOUT_MONO;
      frame.nbSamples = 160;
      frame.getBuffer();
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 8000);
      (await encoder.encodeAll(frame)).forEach((p) => p.free());
      assert.equal(encoder.getCodecContext()!.bitRate, 32000n);
    });
  });

  describe('video timestamps', needsX264, () => {
    // Encodes 320x240 frames with the given pts (time base 1/25) and returns the packets
    const encodeAt = async (encoder: Encoder, frames: { pts: bigint; key?: boolean }[]): Promise<{ pts: bigint; key: boolean }[]> => {
      const out: { pts: bigint; key: boolean }[] = [];
      const collect = (packets: Packet[]) => {
        for (const packet of packets) {
          out.push({ pts: packet.pts, key: packet.isKeyframe });
          packet.free();
        }
      };
      for (const { pts, key } of frames) {
        using frame = new Frame();
        frame.alloc();
        frame.width = 320;
        frame.height = 240;
        frame.format = AV_PIX_FMT_YUV420P;
        frame.getBuffer();
        frame.pts = pts;
        frame.timeBase = new Rational(1, 25);
        if (key) {
          frame.pictType = AV_PICTURE_TYPE_I;
        }
        collect(await encoder.encodeAll(frame));
      }
      for await (const packet of encoder.flushPackets()) {
        collect([packet]);
      }
      return out.sort((a, b) => Number(a.pts - b.pts));
    };

    it('should keep pts strictly increasing like the ffmpeg CLI', async () => {
      // A burst rounding onto one tick: the second frame still reaches tick 1,
      // the next two end before tick 2 and are dropped
      using encoder = await Encoder.create(FF_ENCODER_LIBX264, { options: { preset: 'ultrafast' } });
      const packets = await encodeAt(
        encoder,
        [0n, 0n, 0n, 0n, 2n, 3n, 5n].map((pts) => ({ pts })),
      );
      assert.deepEqual(
        packets.map((p) => p.pts),
        [0n, 1n, 2n, 3n, 5n],
      );
    });

    it('should move a requested keyframe on to the next frame when it is dropped', async () => {
      using encoder = await Encoder.create(FF_ENCODER_LIBX264, { gopSize: 250, preserveFramePictType: true, options: { preset: 'ultrafast' } });
      const packets = await encodeAt(encoder, [{ pts: 0n }, { pts: 1n }, { pts: 2n }, { pts: 1n, key: true }, { pts: 3n }]);
      assert.deepEqual(
        packets.map((p) => [p.pts, p.key]),
        [
          [0n, true],
          [1n, false],
          [2n, false],
          [3n, true],
        ],
      );
    });
  });
});
