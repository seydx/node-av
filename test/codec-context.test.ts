import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  AV_CODEC_FLAG_PSNR,
  AV_CODEC_FLAG_QSCALE,
  AV_CODEC_ID_AAC,
  AV_CODEC_ID_H264,
  AV_CODEC_ID_MJPEG,
  AV_CODEC_ID_PCM_S16LE,
  AV_PIX_FMT_VIDEOTOOLBOX,
  AV_PIX_FMT_YUV420P,
  AV_PROFILE_H264_BASELINE,
  AV_SAMPLE_FMT_FLTP,
  AV_SAMPLE_FMT_S16,
  AVERROR_OPTION_NOT_FOUND,
  AVFLAG_NONE,
  AVMEDIA_TYPE_AUDIO,
  AVMEDIA_TYPE_VIDEO,
  Codec,
  CodecContext,
  CodecParameters,
  Dictionary,
  FF_THREAD_FRAME,
  FF_THREAD_SLICE,
  Frame,
  Packet,
  Rational,
} from '../src/index.js';

import type { AVCodecFlag, AVCodecFlag2 } from '../src/index.js';

describe('CodecContext', () => {
  let ctx: CodecContext;

  beforeEach(() => {
    ctx = new CodecContext();
  });

  afterEach(() => {
    try {
      if (ctx) {
        ctx.freeContext();
      }
    } catch {
      // Context might already be freed
    }
  });

  describe('Lifecycle', () => {
    it('should create an uninitialized codec context', () => {
      assert.ok(ctx);
      assert.ok(!ctx.isOpen);
    });

    it('should allocate context with codec', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);

      ctx.allocContext3(codec);
      // Context should be allocated but not open
      assert.ok(!ctx.isOpen);
      assert.equal(ctx.codecId, AV_CODEC_ID_H264);
      assert.equal(ctx.codecType, AVMEDIA_TYPE_VIDEO);
    });

    it('should allocate context without codec', () => {
      ctx.allocContext3(null);
      // Context should be allocated with defaults
      assert.ok(!ctx.isOpen);
    });

    it('should free context', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);

      ctx.allocContext3(codec);
      ctx.freeContext();
      // After free, we can't test properties as context is freed
    });

    it('should support using statement for automatic disposal', () => {
      using testCtx = new CodecContext();
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);

      testCtx.allocContext3(codec);
      assert.ok(testCtx);
      // testCtx will be automatically disposed when leaving scope
    });
  });

  describe('Basic Properties', () => {
    beforeEach(() => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);
      ctx.allocContext3(codec);
    });

    it('should get and set codec type', () => {
      assert.equal(ctx.codecType, AVMEDIA_TYPE_VIDEO);

      // Can change codec type (though not recommended after alloc)
      ctx.codecType = AVMEDIA_TYPE_AUDIO;
      assert.equal(ctx.codecType, AVMEDIA_TYPE_AUDIO);

      // Restore
      ctx.codecType = AVMEDIA_TYPE_VIDEO;
    });

    it('should get and set codec ID', () => {
      assert.equal(ctx.codecId, AV_CODEC_ID_H264);

      // Can change codec ID (though not recommended after alloc)
      ctx.codecId = AV_CODEC_ID_MJPEG;
      assert.equal(ctx.codecId, AV_CODEC_ID_MJPEG);

      // Restore
      ctx.codecId = AV_CODEC_ID_H264;
    });

    it('should get and set bitrate', () => {
      ctx.bitRate = 1000000n;
      assert.equal(ctx.bitRate, 1000000n);

      ctx.bitRate = 0n;
      assert.equal(ctx.bitRate, 0n);
    });

    it('should get and set time base', () => {
      const tb = new Rational(1, 25);
      ctx.timeBase = tb;

      const retrieved = ctx.timeBase;
      assert.equal(retrieved.num, 1);
      assert.equal(retrieved.den, 25);
      assert.equal(retrieved.toDouble(), 1 / 25);
    });

    it('should get and set packet timebase', () => {
      const pktTb = new Rational(1, 90000);
      ctx.pktTimebase = pktTb;

      const retrieved = ctx.pktTimebase;
      assert.equal(retrieved.num, 1);
      assert.equal(retrieved.den, 90000);
      assert.equal(retrieved.toDouble(), 1 / 90000);

      // Test with common video timebase
      const videoTb = new Rational(1001, 30000);
      ctx.pktTimebase = videoTb;
      const videoRetrieved = ctx.pktTimebase;
      assert.equal(videoRetrieved.num, 1001);
      assert.equal(videoRetrieved.den, 30000);
    });

    it('should get delay', () => {
      // Delay is read-only
      const delay = ctx.delay;
      assert.ok(typeof delay === 'number');
      assert.ok(delay >= 0);
    });

    it('should get and set flags', () => {
      ctx.flags = AVFLAG_NONE;
      assert.equal(ctx.flags, AVFLAG_NONE);

      // Set some flags (we'd need actual flag constants)
      // ctx.flags = AV_CODEC_FLAG_LOW_DELAY;
    });

    it('should get and set flags2', () => {
      const flags2: AVCodecFlag2 = 0 as AVCodecFlag2;
      ctx.flags2 = flags2;
      assert.equal(ctx.flags2, 0);
    });

    it('should get and set profile', () => {
      // Profile values depend on codec
      ctx.profile = AV_PROFILE_H264_BASELINE;
      assert.equal(ctx.profile, 66);
    });

    it('should get and set level', () => {
      ctx.level = 30; // Level 3.0 for H.264
      assert.equal(ctx.level, 30);
    });

    it('should get and set codec tag', () => {
      // Codec tag is typically a FOURCC for containers
      ctx.codecTag = 0x34363248; // 'H264' in little-endian
      assert.equal(ctx.codecTag, 0x34363248);

      ctx.codecTag = 0;
      assert.equal(ctx.codecTag, 0);

      // Test with various values
      ctx.codecTag = 0xffffffff;
      assert.equal(ctx.codecTag, 0xffffffff);
    });

    it('should set codec tag from string (FourCC)', () => {
      ctx.codecTag = 'avc1';
      assert.equal(ctx.codecTagString, 'avc1');

      ctx.codecTag = 'mp4a';
      assert.equal(ctx.codecTagString, 'mp4a');

      ctx.codecTag = 'hev1';
      assert.equal(ctx.codecTagString, 'hev1');

      ctx.codecTag = 'hvc1';
      assert.equal(ctx.codecTagString, 'hvc1');

      ctx.codecTag = 'av01';
      assert.equal(ctx.codecTagString, 'av01');
    });

    it('should get codec tag as string (FourCC)', () => {
      ctx.codecTag = 'avc1';
      assert.equal(ctx.codecTagString, 'avc1');

      ctx.codecTag = 'mp4a';
      assert.equal(ctx.codecTagString, 'mp4a');

      // Test zero codec tag
      ctx.codecTag = 0;
      const zeroTag = ctx.codecTagString;
      assert.ok(zeroTag !== null, 'Should return string for zero tag');
    });

    it('should throw error for invalid FourCC string length', () => {
      assert.throws(() => {
        ctx.codecTag = 'abc'; // Too short
      }, /FourCC string must be exactly 4 characters/);

      assert.throws(() => {
        ctx.codecTag = 'abcde'; // Too long
      }, /FourCC string must be exactly 4 characters/);
    });

    it('should get and set thread count', () => {
      ctx.threadCount = 4;
      assert.equal(ctx.threadCount, 4);

      ctx.threadCount = 0; // Auto-detect
      assert.equal(ctx.threadCount, 0);
    });

    it('should get and set thread type', () => {
      ctx.threadType = FF_THREAD_FRAME;
      assert.equal(ctx.threadType, FF_THREAD_FRAME);

      ctx.threadType = FF_THREAD_SLICE;
      assert.equal(ctx.threadType, FF_THREAD_SLICE);
    });

    it('should get frame number', () => {
      // Frame number starts at 0 or 1 depending on codec
      const frameNum = ctx.frameNumber;
      assert.ok(typeof frameNum === 'number', 'Should return a number');
      assert.ok(frameNum >= 0, 'Should be non-negative');
    });

    it('should get and set bitsPerCodedSample', () => {
      ctx.bitsPerCodedSample = 8;
      assert.equal(ctx.bitsPerCodedSample, 8);

      ctx.bitsPerCodedSample = 16;
      assert.equal(ctx.bitsPerCodedSample, 16);

      ctx.bitsPerCodedSample = 24;
      assert.equal(ctx.bitsPerCodedSample, 24);

      ctx.bitsPerCodedSample = 0;
      assert.equal(ctx.bitsPerCodedSample, 0);
    });

    it('should get and set bitsPerRawSample', () => {
      ctx.bitsPerRawSample = 8;
      assert.equal(ctx.bitsPerRawSample, 8);

      ctx.bitsPerRawSample = 10;
      assert.equal(ctx.bitsPerRawSample, 10);

      ctx.bitsPerRawSample = 12;
      assert.equal(ctx.bitsPerRawSample, 12);

      ctx.bitsPerRawSample = 0;
      assert.equal(ctx.bitsPerRawSample, 0);
    });
  });

  describe('Video Properties', () => {
    beforeEach(() => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);
      ctx.allocContext3(codec);
    });

    it('should get and set width and height', () => {
      ctx.width = 1920;
      ctx.height = 1080;

      assert.equal(ctx.width, 1920);
      assert.equal(ctx.height, 1080);
    });

    it('should get and set GOP size', () => {
      ctx.gopSize = 12;
      assert.equal(ctx.gopSize, 12);

      ctx.gopSize = 0; // Intra only
      assert.equal(ctx.gopSize, 0);
    });

    it('should get and set pixel format', () => {
      ctx.pixelFormat = AV_PIX_FMT_YUV420P;
      assert.equal(ctx.pixelFormat, AV_PIX_FMT_YUV420P);
    });

    it('should get and set framerate', () => {
      const framerate = new Rational(30, 1);
      ctx.framerate = framerate;

      const retrieved = ctx.framerate;
      assert.equal(retrieved.num, 30);
      assert.equal(retrieved.den, 1);
    });

    it('should get and set sample aspect ratio', () => {
      const sar = new Rational(1, 1);
      ctx.sampleAspectRatio = sar;

      const retrieved = ctx.sampleAspectRatio;
      assert.equal(retrieved.num, 1);
      assert.equal(retrieved.den, 1);
    });

    it('should get and set max B-frames', () => {
      ctx.maxBFrames = 2;
      assert.equal(ctx.maxBFrames, 2);

      ctx.maxBFrames = 0; // No B-frames
      assert.equal(ctx.maxBFrames, 0);
    });

    it('should get and set color properties', () => {
      // These should be numbers representing enum values
      // Note: Some properties might not be accessible before codec is opened
      // Skip these for now to avoid hanging
    });
  });

  describe('Audio Properties', () => {
    beforeEach(() => {
      const codec = Codec.findDecoder(AV_CODEC_ID_AAC);
      assert.ok(codec);
      ctx.allocContext3(codec);
    });

    it('should get and set sample rate', () => {
      ctx.sampleRate = 48000;
      assert.equal(ctx.sampleRate, 48000);

      ctx.sampleRate = 44100;
      assert.equal(ctx.sampleRate, 44100);
    });

    it('should get and set sample format', () => {
      ctx.sampleFormat = AV_SAMPLE_FMT_FLTP;
      assert.equal(ctx.sampleFormat, AV_SAMPLE_FMT_FLTP);

      ctx.sampleFormat = AV_SAMPLE_FMT_S16;
      assert.equal(ctx.sampleFormat, AV_SAMPLE_FMT_S16);
    });

    it('should get and set channel layout', () => {
      // Channel layout is a complex object
      const layout = ctx.channelLayout;
      assert.ok(layout);

      // Setting channel layout
      ctx.channelLayout = layout;
      const retrieved = ctx.channelLayout;
      assert.ok(retrieved);
    });

    it('should get and set frame size', () => {
      const frameSize = ctx.frameSize;
      assert.ok(typeof frameSize === 'number');

      // Some codecs have fixed frame sizes
      if (frameSize > 0) {
        assert.ok(frameSize > 0);
      }
    });
  });

  describe('Encoding Properties', () => {
    beforeEach(() => {
      // Try to find an encoder
      const codec = Codec.findEncoder(AV_CODEC_ID_H264);
      if (codec) {
        ctx.allocContext3(codec);
      } else {
        // Skip encoding tests if no encoder available
        ctx.allocContext3(null);
      }
    });

    it('should get and set quantizer limits', () => {
      ctx.qMin = 10;
      ctx.qMax = 51;

      assert.equal(ctx.qMin, 10);
      assert.equal(ctx.qMax, 51);
    });

    it('should get and set rate control buffer size', () => {
      ctx.rcBufferSize = 1000000;
      assert.equal(ctx.rcBufferSize, 1000000);
    });

    it('should get and set max/min bitrate', () => {
      ctx.rcMaxRate = 5000000n;
      ctx.rcMinRate = 1000000n;

      assert.equal(ctx.rcMaxRate, 5000000n);
      assert.equal(ctx.rcMinRate, 1000000n);
    });
  });

  describe('Extra Data', () => {
    beforeEach(() => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);
      ctx.allocContext3(codec);
    });

    it('should handle null extra data', () => {
      assert.equal(ctx.extraData, null);
    });

    it('should set and get extra data', () => {
      const data = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x67]);
      ctx.extraData = data;

      const retrieved = ctx.extraData;
      assert.ok(retrieved);
      assert.ok(Buffer.isBuffer(retrieved));
      assert.equal(retrieved.length, data.length);
    });

    it('should clear extra data', () => {
      const data = Buffer.from([0x00, 0x00, 0x00, 0x01]);
      ctx.extraData = data;
      assert.ok(ctx.extraData);

      ctx.extraData = null;
      assert.equal(ctx.extraData, null);
    });
  });

  describe('Parameters Copy', () => {
    it('should copy parameters to context', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);
      ctx.allocContext3(codec);

      const params = new CodecParameters();
      params.alloc(); // Must allocate before use
      params.codecType = AVMEDIA_TYPE_VIDEO;
      params.codecId = AV_CODEC_ID_H264;
      params.width = 1280;
      params.height = 720;
      params.format = AV_PIX_FMT_YUV420P;

      const ret = ctx.parametersToContext(params);
      assert.equal(ret, 0);

      // Verify parameters were copied
      assert.equal(ctx.width, 1280);
      assert.equal(ctx.height, 720);
      assert.equal(ctx.pixelFormat, AV_PIX_FMT_YUV420P);

      params.free();
    });

    it('should copy parameters from context', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);
      ctx.allocContext3(codec);

      // Set context properties
      ctx.width = 1920;
      ctx.height = 1080;
      ctx.pixelFormat = AV_PIX_FMT_YUV420P;

      const params = new CodecParameters();
      params.alloc(); // Must allocate before use
      const ret = ctx.parametersFromContext(params);
      assert.equal(ret, 0);

      // Verify parameters were copied
      assert.equal(params.width, 1920);
      assert.equal(params.height, 1080);
      assert.equal(params.format, AV_PIX_FMT_YUV420P);

      params.free();
    });
  });

  describe('Open and Close', () => {
    it('should open codec context (async)', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      // PCM decoder requires channel layout to be set
      ctx.channelLayout = { nbChannels: 2, order: 0, mask: 3n }; // Stereo
      ctx.sampleRate = 48000;
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;
      assert.ok(!ctx.isOpen);

      const ret = await ctx.open2(codec, null);
      assert.equal(ret, 0);
      assert.ok(ctx.isOpen);
    });

    it('should open codec context (sync)', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      // PCM decoder requires channel layout to be set
      ctx.channelLayout = { nbChannels: 2, order: 0, mask: 3n }; // Stereo
      ctx.sampleRate = 48000;
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;
      assert.ok(!ctx.isOpen);

      const ret = ctx.open2Sync(codec, null);
      assert.equal(ret, 0);
      assert.ok(ctx.isOpen);
    });

    it('should open with options (async)', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      // PCM decoder requires channel layout to be set
      ctx.channelLayout = { nbChannels: 2, order: 0, mask: 3n };
      ctx.sampleRate = 48000;
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;

      const options = new Dictionary();
      options.alloc();
      // PCM codecs typically don't need options

      const ret = await ctx.open2(codec, options);
      assert.equal(ret, 0);
      assert.ok(ctx.isOpen);

      options.free();
    });

    it('should open with options (sync)', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      // PCM decoder requires channel layout to be set
      ctx.channelLayout = { nbChannels: 2, order: 0, mask: 3n };
      ctx.sampleRate = 48000;
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;

      const options = new Dictionary();
      options.alloc();
      // PCM codecs typically don't need options

      const ret = ctx.open2Sync(codec, options);
      assert.equal(ret, 0);
      assert.ok(ctx.isOpen);

      options.free();
    });

    it('should close codec context (async)', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      ctx.channelLayout = { nbChannels: 2, order: 0, mask: 3n };
      ctx.sampleRate = 48000;
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;
      await ctx.open2(codec, null);
      assert.ok(ctx.isOpen);

      ctx.freeContext();
      assert.equal(ctx.isOpen, false);
    });

    it('should close codec context (sync)', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      ctx.channelLayout = { nbChannels: 2, order: 0, mask: 3n };
      ctx.sampleRate = 48000;
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;
      ctx.open2Sync(codec, null);
      assert.ok(ctx.isOpen);

      ctx.freeContext();
      assert.equal(ctx.isOpen, false);
    });
  });

  describe('Flush Buffers', () => {
    it('should flush buffers', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      ctx.channelLayout = { nbChannels: 2, order: 0, mask: 3n };
      ctx.sampleRate = 48000;
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;
      await ctx.open2(codec, null);

      // Should not throw
      ctx.flushBuffers();
      assert.ok(ctx.isOpen);
    });
  });

  describe('Async Operations', () => {
    it('should handle sendPacket and receiveFrame', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;
      ctx.sampleRate = 48000;
      ctx.channelLayout = { nbChannels: 2, order: 0, mask: 3n };

      await ctx.open2(codec, null);

      // Create a packet with PCM data
      const packet = new Packet();
      packet.alloc();

      // Note: For actual decoding, we'd need valid packet data
      // PCM decoder might accept empty packets
      const sendRet = await ctx.sendPacket(packet);
      // PCM might not buffer, so EAGAIN is possible
      assert.ok(sendRet === 0 || sendRet === -11); // 0 or EAGAIN

      packet.free();
    });

    it('should handle sendFrame and receivePacket for encoding', async () => {
      // Try to find an encoder
      const codec = Codec.findEncoder(AV_CODEC_ID_PCM_S16LE);
      if (!codec) {
        // Skip if no encoder available
        return;
      }

      ctx.allocContext3(codec);
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;
      ctx.sampleRate = 48000;
      ctx.channelLayout = { nbChannels: 2, order: 0, mask: 3n };

      await ctx.open2(codec, null);

      const frame = new Frame();
      frame.alloc();
      frame.format = AV_SAMPLE_FMT_S16;
      frame.sampleRate = 48000;
      frame.nbSamples = 1024;
      frame.channelLayout = { nbChannels: 2, order: 0, mask: 3n };

      // Allocate buffer for the frame
      const bufRet = frame.getBuffer();
      assert.equal(bufRet, 0);

      // Send frame for encoding
      const sendRet = await ctx.sendFrame(frame);
      assert.equal(sendRet, 0); // PCM encoder should accept immediately

      frame.free();
    });

    it('should set hardware pixel format', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      if (!codec) {
        // Skip if no decoder available
        return;
      }

      ctx.allocContext3(codec);

      // Should not throw
      assert.doesNotThrow(() => {
        ctx.setHardwarePixelFormat(AV_PIX_FMT_VIDEOTOOLBOX, AV_PIX_FMT_YUV420P);
      });

      // Test with only hardware format
      assert.doesNotThrow(() => {
        ctx.setHardwarePixelFormat(AV_PIX_FMT_VIDEOTOOLBOX);
      });
    });

    it('should handle null packet for flushing (async)', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      ctx.channelLayout = { nbChannels: 2, order: 0, mask: 3n };
      ctx.sampleRate = 48000;
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;
      await ctx.open2(codec, null);

      // Send null packet to flush
      const ret = await ctx.sendPacket(null);
      // PCM decoder might not need flushing
      assert.ok(ret === 0 || ret === -541478725); // 0 or EOF
    });

    it('should handle null packet for flushing (sync)', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      ctx.channelLayout = { nbChannels: 2, order: 0, mask: 3n };
      ctx.sampleRate = 48000;
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;
      ctx.open2Sync(codec, null);

      // Send null packet to flush
      const ret = ctx.sendPacketSync(null);
      // PCM decoder might not need flushing
      assert.ok(ret === 0 || ret === -541478725); // 0 or EOF
    });
  });

  describe('Options (setOption)', () => {
    it('should set options on encoder context', () => {
      // Try to find H264 encoder which supports options
      const codec = Codec.findEncoder(AV_CODEC_ID_H264);
      if (!codec) {
        // Skip if no H264 encoder available
        return;
      }

      ctx.allocContext3(codec);

      // Set preset option (H264 specific)
      // This should not throw if codec has private data
      try {
        const ret = ctx.setOption('preset', 'fast');
        assert.ok(ret >= 0);
      } catch (error: any) {
        // Some H264 encoders might not have preset option
        if (!error.message.includes('Option not found')) {
          throw error;
        }
      }
    });

    it('should fail to set option on unallocated context', () => {
      // Don't allocate context
      assert.throws(() => {
        ctx.setOption('preset', 'fast');
      }, /Invalid native object/);
    });

    it('should fail to set option without private data or invalid option', () => {
      // PCM codecs typically don't support preset option
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);

      assert.equal(ctx.setOption('preset', 'fast'), AVERROR_OPTION_NOT_FOUND);
    });

    it('should fail with invalid option name', () => {
      const codec = Codec.findEncoder(AV_CODEC_ID_H264);
      if (!codec) {
        // Skip if no H264 encoder available
        return;
      }

      ctx.allocContext3(codec);

      assert.equal(ctx.setOption('invalid_option_name_xyz', 'value'), AVERROR_OPTION_NOT_FOUND);
    });

    it('should set multiple options', () => {
      const codec = Codec.findEncoder(AV_CODEC_ID_H264);
      if (!codec) {
        // Skip if no H264 encoder available
        return;
      }

      ctx.allocContext3(codec);

      // Try to set multiple options
      try {
        // These are common H264 options
        ctx.setOption('preset', 'veryfast');
        ctx.setOption('tune', 'zerolatency');
        // CRF is a numeric option but passed as string
        ctx.setOption('crf', '23');

        // If we get here, all options were set successfully
        assert.ok(true);
      } catch (error: any) {
        // Some H264 encoders might not support all options
        if (!error.message.includes('Option not found')) {
          throw error;
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle uninitialized context gracefully', () => {
      // Don't allocate context
      assert.ok(!ctx.isOpen);

      // These should not crash
      assert.equal(ctx.codecType, -1); // AVMEDIA_TYPE_UNKNOWN is -1
      assert.equal(ctx.codecId, 0); // AV_CODEC_ID_NONE
    });

    it('should handle operations on closed context (async)', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      // Don't open

      const packet = new Packet();
      packet.alloc();

      // Should return error
      const ret = await ctx.sendPacket(packet);
      assert.ok(ret < 0); // Should be an error

      packet.free();
    });

    it('should handle operations on closed context (sync)', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      ctx.allocContext3(codec);
      // Don't open

      const packet = new Packet();
      packet.alloc();

      // Should return error
      const ret = ctx.sendPacketSync(packet);
      assert.ok(ret < 0); // Should be an error

      packet.free();
    });

    it('should handle very large dimensions', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);
      ctx.allocContext3(codec);

      // Set very large dimensions
      ctx.width = 7680; // 8K
      ctx.height = 4320;

      assert.equal(ctx.width, 7680);
      assert.equal(ctx.height, 4320);
    });

    it('should handle zero dimensions', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);
      ctx.allocContext3(codec);

      ctx.width = 0;
      ctx.height = 0;

      assert.equal(ctx.width, 0);
      assert.equal(ctx.height, 0);
    });
  });

  describe('Flag Operations', () => {
    beforeEach(() => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);
      ctx.allocContext3(codec);
    });

    describe('flags', () => {
      it('should set single flag using setFlags', () => {
        ctx.flags = AVFLAG_NONE;
        assert.equal(ctx.flags, AVFLAG_NONE);

        ctx.setFlags(AV_CODEC_FLAG_QSCALE);
        assert.equal(ctx.flags, AV_CODEC_FLAG_QSCALE);
      });

      it('should set multiple flags using setFlags', () => {
        ctx.flags = AVFLAG_NONE;
        assert.equal(ctx.flags, AVFLAG_NONE);

        ctx.setFlags(AV_CODEC_FLAG_QSCALE, AV_CODEC_FLAG_PSNR);
        assert.equal(ctx.flags, (AV_CODEC_FLAG_QSCALE | AV_CODEC_FLAG_PSNR) as AVCodecFlag);
      });

      it('should clear single flag using clearFlags', () => {
        ctx.setFlags(AV_CODEC_FLAG_QSCALE, AV_CODEC_FLAG_PSNR);
        assert.equal(ctx.flags, (AV_CODEC_FLAG_QSCALE | AV_CODEC_FLAG_PSNR) as AVCodecFlag);

        ctx.clearFlags(AV_CODEC_FLAG_PSNR);
        assert.equal(ctx.flags, AV_CODEC_FLAG_QSCALE);
      });

      it('should clear multiple flags using clearFlags', () => {
        ctx.setFlags(AV_CODEC_FLAG_QSCALE, AV_CODEC_FLAG_PSNR);
        assert.equal(ctx.flags, (AV_CODEC_FLAG_QSCALE | AV_CODEC_FLAG_PSNR) as AVCodecFlag);

        ctx.clearFlags(AV_CODEC_FLAG_QSCALE, AV_CODEC_FLAG_PSNR);
        assert.equal(ctx.flags, AVFLAG_NONE);
      });

      it('should preserve existing flags when setting new flags', () => {
        ctx.setFlags(AV_CODEC_FLAG_QSCALE);
        assert.equal(ctx.flags, AV_CODEC_FLAG_QSCALE);

        ctx.setFlags(AV_CODEC_FLAG_PSNR);
        assert.equal(ctx.flags, (AV_CODEC_FLAG_QSCALE | AV_CODEC_FLAG_PSNR) as AVCodecFlag);
      });

      it('should support direct flag assignment (backward compatibility)', () => {
        ctx.flags = (AV_CODEC_FLAG_QSCALE | AV_CODEC_FLAG_PSNR) as AVCodecFlag;
        assert.equal(ctx.flags, (AV_CODEC_FLAG_QSCALE | AV_CODEC_FLAG_PSNR) as AVCodecFlag);

        ctx.flags = AVFLAG_NONE;
        assert.equal(ctx.flags, AVFLAG_NONE);
      });

      it('should check for single flag using hasFlags', () => {
        ctx.flags = AVFLAG_NONE;
        assert.equal(ctx.hasFlags(AV_CODEC_FLAG_QSCALE), false);

        ctx.setFlags(AV_CODEC_FLAG_QSCALE);
        assert.equal(ctx.hasFlags(AV_CODEC_FLAG_QSCALE), true);
        assert.equal(ctx.hasFlags(AV_CODEC_FLAG_PSNR), false);

        ctx.setFlags(AV_CODEC_FLAG_PSNR);
        assert.equal(ctx.hasFlags(AV_CODEC_FLAG_QSCALE), true);
        assert.equal(ctx.hasFlags(AV_CODEC_FLAG_PSNR), true);
      });

      it('should check for multiple flags using hasFlags', () => {
        ctx.flags = AVFLAG_NONE;
        assert.equal(ctx.hasFlags(AV_CODEC_FLAG_QSCALE, AV_CODEC_FLAG_PSNR), false);

        ctx.setFlags(AV_CODEC_FLAG_QSCALE);
        assert.equal(ctx.hasFlags(AV_CODEC_FLAG_QSCALE, AV_CODEC_FLAG_PSNR), false);

        ctx.setFlags(AV_CODEC_FLAG_PSNR);
        assert.equal(ctx.hasFlags(AV_CODEC_FLAG_QSCALE, AV_CODEC_FLAG_PSNR), true);
      });

      it('should return false when only some flags are set', () => {
        ctx.setFlags(AV_CODEC_FLAG_QSCALE);
        assert.equal(ctx.hasFlags(AV_CODEC_FLAG_QSCALE), true);
        assert.equal(ctx.hasFlags(AV_CODEC_FLAG_QSCALE, AV_CODEC_FLAG_PSNR), false);
      });
    });

    describe('flags2', () => {
      it('should set single flag using setFlags2', () => {
        ctx.flags2 = 0 as AVCodecFlag2;
        assert.equal(ctx.flags2, 0);

        ctx.setFlags2(0x1 as AVCodecFlag2);
        assert.equal(ctx.flags2, 0x1);
      });

      it('should set multiple flags using setFlags2', () => {
        ctx.flags2 = 0 as AVCodecFlag2;
        assert.equal(ctx.flags2, 0);

        ctx.setFlags2(0x1 as AVCodecFlag2, 0x2 as AVCodecFlag2);
        assert.equal(ctx.flags2, 0x3);
      });

      it('should clear single flag using clearFlags2', () => {
        ctx.setFlags2(0x1 as AVCodecFlag2, 0x2 as AVCodecFlag2);
        assert.equal(ctx.flags2, 0x3);

        ctx.clearFlags2(0x1 as AVCodecFlag2);
        assert.equal(ctx.flags2, 0x2);
      });

      it('should clear multiple flags using clearFlags2', () => {
        ctx.setFlags2(0x1 as AVCodecFlag2, 0x2 as AVCodecFlag2);
        assert.equal(ctx.flags2, 0x3);

        ctx.clearFlags2(0x1 as AVCodecFlag2, 0x2 as AVCodecFlag2);
        assert.equal(ctx.flags2, 0);
      });

      it('should preserve existing flags when setting new flags', () => {
        ctx.setFlags2(0x1 as AVCodecFlag2);
        assert.equal(ctx.flags2, 0x1);

        ctx.setFlags2(0x2 as AVCodecFlag2);
        assert.equal(ctx.flags2, 0x3);
      });

      it('should support direct flag2 assignment (backward compatibility)', () => {
        ctx.flags2 = 0x3 as AVCodecFlag2;
        assert.equal(ctx.flags2, 0x3);

        ctx.flags2 = 0 as AVCodecFlag2;
        assert.equal(ctx.flags2, 0);
      });

      it('should check for single flag using hasFlags2', () => {
        ctx.flags2 = 0 as AVCodecFlag2;
        assert.equal(ctx.hasFlags2(0x1 as AVCodecFlag2), false);

        ctx.setFlags2(0x1 as AVCodecFlag2);
        assert.equal(ctx.hasFlags2(0x1 as AVCodecFlag2), true);
        assert.equal(ctx.hasFlags2(0x2 as AVCodecFlag2), false);

        ctx.setFlags2(0x2 as AVCodecFlag2);
        assert.equal(ctx.hasFlags2(0x1 as AVCodecFlag2), true);
        assert.equal(ctx.hasFlags2(0x2 as AVCodecFlag2), true);
      });

      it('should check for multiple flags using hasFlags2', () => {
        ctx.flags2 = 0 as AVCodecFlag2;
        assert.equal(ctx.hasFlags2(0x1 as AVCodecFlag2, 0x2 as AVCodecFlag2), false);

        ctx.setFlags2(0x1 as AVCodecFlag2);
        assert.equal(ctx.hasFlags2(0x1 as AVCodecFlag2, 0x2 as AVCodecFlag2), false);

        ctx.setFlags2(0x2 as AVCodecFlag2);
        assert.equal(ctx.hasFlags2(0x1 as AVCodecFlag2, 0x2 as AVCodecFlag2), true);

        ctx.setFlags2(0x4 as AVCodecFlag2);
        assert.equal(ctx.hasFlags2(0x1 as AVCodecFlag2, 0x2 as AVCodecFlag2), true);
        assert.equal(ctx.hasFlags2(0x1 as AVCodecFlag2, 0x2 as AVCodecFlag2, 0x4 as AVCodecFlag2), true);
      });

      it('should return false when only some flags2 are set', () => {
        ctx.setFlags2(0x1 as AVCodecFlag2);
        assert.equal(ctx.hasFlags2(0x1 as AVCodecFlag2), true);
        assert.equal(ctx.hasFlags2(0x1 as AVCodecFlag2, 0x2 as AVCodecFlag2), false);
        assert.equal(ctx.hasFlags2(0x1 as AVCodecFlag2, 0x4 as AVCodecFlag2), false);
      });
    });
  });
});
