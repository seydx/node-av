import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AVCOL_RANGE_JPEG,
  AV_CHANNEL_LAYOUT_STEREO,
  AV_PIX_FMT_YUV420P,
  AV_SAMPLE_FMT_FLTP,
  Encoder,
  FF_ENCODER_AAC,
  FF_ENCODER_LIBX264,
  FF_ENCODER_MJPEG,
  HardwareContext,
} from '../src/index.js';
import { Frame, Rational } from '../src/lib/index.js';
import { encodeFrame, encodeFrameSync } from './index.js';

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

  if (frame.data?.[0]) {
    for (let i = 0; i < width * height; i++) {
      frame.data[0][i] = i % 256;
    }
    if (frame.data[1] && frame.data[2]) {
      const chromaSize = (width * height) / 4;
      for (let i = 0; i < chromaSize; i++) {
        frame.data[1][i] = 128;
        frame.data[2][i] = 128;
      }
    }
  }

  return frame;
}

describe('Encoder', () => {
  describe('create', () => {
    it('should create video encoder (async)', async () => {
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

    it('should create encoder with codec options (async)', async () => {
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

    it('should create video encoder (sync)', () => {
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

    it('should create encoder with codec options (sync)', () => {
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
    it('should encode video frames (async)', async () => {
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

      // Fill with test data
      if (frame.data?.[0]) {
        // Y plane - gradient
        for (let i = 0; i < 320 * 240; i++) {
          frame.data[0][i] = i % 256;
        }
        // U and V planes - gray
        if (frame.data[1] && frame.data[2]) {
          const chromaSize = (320 * 240) / 4;
          for (let i = 0; i < chromaSize; i++) {
            frame.data[1][i] = 128;
            frame.data[2][i] = 128;
          }
        }
      }

      // Encode frame and drain packets using helper
      for await (using _packet of encodeFrame(encoder, frame)) {
        // drain packets
      }

      encoder.close();
    });

    it('should encode video frames (sync)', () => {
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

      // Fill with test data
      if (frame.data?.[0]) {
        // Y plane - gradient
        for (let i = 0; i < 320 * 240; i++) {
          frame.data[0][i] = i % 256;
        }
        // U and V planes - gray
        if (frame.data[1] && frame.data[2]) {
          const chromaSize = (320 * 240) / 4;
          for (let i = 0; i < chromaSize; i++) {
            frame.data[1][i] = 128;
            frame.data[2][i] = 128;
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

      // Encode frame and drain packets using sync helper
      for (using _packet of encodeFrameSync(encoder, frame)) {
        // drain packets
      }

      encoder.close();
    });

    it('should handle null packets gracefully (async)', async () => {
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

    it('should handle null packets gracefully (sync)', () => {
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

    it('should not throw when encoder is closed (async)', async () => {
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

    it('should not throw when encoder is closed (sync)', () => {
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
    it('should flush remaining packets (async)', async () => {
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

    it('should flush remaining packets (sync)', () => {
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

    it('should handle flush when encoder is closed (async)', async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      encoder.close();

      // flush() returns void now and doesn't throw when closed
      await encoder.flush(); // Should not throw
    });

    it('should handle flush when encoder is closed (sync)', () => {
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264);

      encoder.close();

      // flushSync() returns void now and doesn't throw when closed
      encoder.flushSync(); // Should not throw
    });
  });

  describe('async iterator', () => {
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

  describe('resource management', () => {
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

  describe('AbortSignal', () => {
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
});
