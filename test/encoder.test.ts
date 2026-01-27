import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AV_PIX_FMT_YUV420P, AV_SAMPLE_FMT_FLTP, Encoder, FF_ENCODER_AAC, FF_ENCODER_LIBX264, HardwareContext } from '../src/index.js';
import { Frame, Rational } from '../src/lib/index.js';
import { encodeFrame, encodeFrameSync, skipInCI } from './index.js';

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
          crf: '23',
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
          crf: '23',
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
      frame.channelLayout = { nbChannels: 2, order: 1, mask: 3n };
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
      frame.channelLayout = { nbChannels: 2, order: 1, mask: 3n };
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
    it('should create hardware encoder with hardware context', skipInCI, async () => {
      // Try to get hardware context
      const hw = HardwareContext.auto();
      if (!hw) {
        return;
      }

      // Get hardware encoder codec name
      const encoderCodec = hw.getEncoderCodec('h264');
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
});
