import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  AV_CH_LAYOUT_MONO,
  AV_CH_LAYOUT_STEREO,
  AV_CHANNEL_LAYOUT_MONO,
  AV_CHANNEL_LAYOUT_STEREO,
  AV_CHANNEL_ORDER_NATIVE,
  AV_CODEC_ID_AAC,
  AV_CODEC_ID_H264,
  AV_CODEC_ID_MJPEG,
  AV_CODEC_ID_PCM_S16LE,
  AV_PIX_FMT_RGB24,
  AV_PIX_FMT_YUV420P,
  AV_PROFILE_AAC_LOW,
  AV_PROFILE_H264_BASELINE,
  AV_PROFILE_H264_HIGH,
  AV_SAMPLE_FMT_FLTP,
  AV_SAMPLE_FMT_S16,
  AVCHROMA_LOC_CENTER,
  AVCHROMA_LOC_LEFT,
  AVCOL_PRI_BT709,
  AVCOL_RANGE_JPEG,
  AVCOL_RANGE_MPEG,
  AVCOL_SPC_BT709,
  AVCOL_TRC_BT709,
  AVMEDIA_TYPE_AUDIO,
  AVMEDIA_TYPE_VIDEO,
  Codec,
  CodecContext,
  CodecParameters,
  Rational,
} from '../src/index.js';

describe('CodecParameters', () => {
  let params: CodecParameters;

  beforeEach(() => {
    params = new CodecParameters();
  });

  afterEach(() => {
    try {
      if (params) {
        params.free();
      }
    } catch {
      // Already freed
    }
  });

  describe('Lifecycle', () => {
    it('should create uninitialized parameters', () => {
      assert.ok(params);
      // Parameters exist but are not allocated
    });

    it('should allocate parameters', () => {
      params.alloc();
      // Parameters are now allocated with default values
      assert.equal(params.codecType, -1); // AVMEDIA_TYPE_UNKNOWN is -1
    });

    it('should free parameters', () => {
      params.alloc();
      params.free();
      // After free, parameters are invalid
    });

    it('should support using statement for automatic disposal', () => {
      using testParams = new CodecParameters();
      testParams.alloc();
      assert.ok(testParams);
      // testParams will be automatically disposed when leaving scope
    });
  });

  describe('General Properties', () => {
    beforeEach(() => {
      params.alloc();
    });

    it('should get and set codec type', () => {
      params.codecType = AVMEDIA_TYPE_VIDEO;
      assert.equal(params.codecType, AVMEDIA_TYPE_VIDEO);

      params.codecType = AVMEDIA_TYPE_AUDIO;
      assert.equal(params.codecType, AVMEDIA_TYPE_AUDIO);
    });

    it('should get and set codec ID', () => {
      params.codecId = AV_CODEC_ID_H264;
      assert.equal(params.codecId, AV_CODEC_ID_H264);

      params.codecId = AV_CODEC_ID_AAC;
      assert.equal(params.codecId, AV_CODEC_ID_AAC);
    });

    it('should get and set codec tag', () => {
      // Codec tag is typically a FOURCC for AVI containers
      params.codecTag = 0x34363248; // 'H264' in little-endian
      assert.equal(params.codecTag, 0x34363248);

      params.codecTag = 0;
      assert.equal(params.codecTag, 0);

      // Test with various values
      params.codecTag = 0xffffffff;
      assert.equal(params.codecTag, 0xffffffff);
    });

    it('should get codec tag as string (FourCC)', () => {
      params.alloc();

      params.codecTag = 'avc1';
      assert.equal(params.codecTagString, 'avc1');

      params.codecTag = 'mp4a';
      assert.equal(params.codecTagString, 'mp4a');

      params.codecTag = 'hev1';
      assert.equal(params.codecTagString, 'hev1');

      params.codecTag = 'hvc1';
      assert.equal(params.codecTagString, 'hvc1');

      params.codecTag = 'av01';
      assert.equal(params.codecTagString, 'av01');

      // Test zero codec tag
      params.codecTag = 0;
      const zeroTag = params.codecTagString;
      assert.ok(zeroTag !== null, 'Should return string for zero tag');
    });

    it('should throw error for invalid FourCC string length', () => {
      params.alloc();

      assert.throws(() => {
        params.codecTag = 'abc'; // Too short
      }, /FourCC string must be exactly 4 characters/);

      assert.throws(() => {
        params.codecTag = 'abcde'; // Too long
      }, /FourCC string must be exactly 4 characters/);
    });

    it('should get and set bitrate', () => {
      params.bitRate = 1000000n;
      assert.equal(params.bitRate, 1000000n);

      params.bitRate = 0n;
      assert.equal(params.bitRate, 0n);
    });

    it('should get and set profile', () => {
      params.profile = AV_PROFILE_H264_BASELINE;
      assert.equal(params.profile, AV_PROFILE_H264_BASELINE);

      params.profile = AV_PROFILE_H264_HIGH;
      assert.equal(params.profile, AV_PROFILE_H264_HIGH);
    });

    it('should get and set level', () => {
      params.level = 30; // Level 3.0 for H.264
      assert.equal(params.level, 30);

      params.level = 51; // Level 5.1
      assert.equal(params.level, 51);
    });

    it('should get and set format', () => {
      // For video (pixel format)
      params.format = AV_PIX_FMT_YUV420P;
      assert.equal(params.format, AV_PIX_FMT_YUV420P);

      // For audio (sample format)
      params.format = AV_SAMPLE_FMT_S16;
      assert.equal(params.format, AV_SAMPLE_FMT_S16);
    });

    it('should get and set bitsPerCodedSample', () => {
      params.bitsPerCodedSample = 8;
      assert.equal(params.bitsPerCodedSample, 8);

      params.bitsPerCodedSample = 16;
      assert.equal(params.bitsPerCodedSample, 16);

      params.bitsPerCodedSample = 24;
      assert.equal(params.bitsPerCodedSample, 24);

      params.bitsPerCodedSample = 0;
      assert.equal(params.bitsPerCodedSample, 0);
    });

    it('should get and set bitsPerRawSample', () => {
      params.bitsPerRawSample = 8;
      assert.equal(params.bitsPerRawSample, 8);

      params.bitsPerRawSample = 10;
      assert.equal(params.bitsPerRawSample, 10);

      params.bitsPerRawSample = 12;
      assert.equal(params.bitsPerRawSample, 12);

      params.bitsPerRawSample = 0;
      assert.equal(params.bitsPerRawSample, 0);
    });
  });

  describe('Video Properties', () => {
    beforeEach(() => {
      params.alloc();
      params.codecType = AVMEDIA_TYPE_VIDEO;
    });

    it('should get and set width and height', () => {
      params.width = 1920;
      params.height = 1080;

      assert.equal(params.width, 1920);
      assert.equal(params.height, 1080);
    });

    it('should get and set sample aspect ratio', () => {
      const sar = new Rational(1, 1);
      params.sampleAspectRatio = sar;

      const retrieved = params.sampleAspectRatio;
      assert.equal(retrieved.num, 1);
      assert.equal(retrieved.den, 1);
    });

    it('should get and set frame rate', () => {
      params.alloc();

      // Test common frame rates
      const frameRate30 = new Rational(30, 1); // 30 fps
      params.frameRate = frameRate30;
      assert.equal(params.frameRate.num, 30);
      assert.equal(params.frameRate.den, 1);

      // Test NTSC frame rate (29.97 fps)
      const frameRateNTSC = new Rational(30000, 1001);
      params.frameRate = frameRateNTSC;
      assert.equal(params.frameRate.num, 30000);
      assert.equal(params.frameRate.den, 1001);

      // Test PAL frame rate (25 fps)
      const frameRatePAL = new Rational(25, 1);
      params.frameRate = frameRatePAL;
      assert.equal(params.frameRate.num, 25);
      assert.equal(params.frameRate.den, 1);

      // Test cinema frame rate (24 fps)
      const frameRate24 = new Rational(24, 1);
      params.frameRate = frameRate24;
      assert.equal(params.frameRate.num, 24);
      assert.equal(params.frameRate.den, 1);

      // Test high frame rate (60 fps)
      const frameRate60 = new Rational(60, 1);
      params.frameRate = frameRate60;
      assert.equal(params.frameRate.num, 60);
      assert.equal(params.frameRate.den, 1);
    });

    it('should handle non-square pixels', () => {
      const sar = new Rational(4, 3);
      params.sampleAspectRatio = sar;

      const retrieved = params.sampleAspectRatio;
      assert.equal(retrieved.num, 4);
      assert.equal(retrieved.den, 3);
    });

    it('should get and set color range', () => {
      params.colorRange = AVCOL_RANGE_MPEG;
      assert.equal(params.colorRange, AVCOL_RANGE_MPEG);

      params.colorRange = AVCOL_RANGE_JPEG;
      assert.equal(params.colorRange, AVCOL_RANGE_JPEG);
    });

    it('should get and set color primaries', () => {
      params.colorPrimaries = AVCOL_PRI_BT709;
      assert.equal(params.colorPrimaries, AVCOL_PRI_BT709);
    });

    it('should get and set color transfer characteristic', () => {
      params.colorTrc = AVCOL_TRC_BT709;
      assert.equal(params.colorTrc, AVCOL_TRC_BT709);
    });

    it('should get and set color space', () => {
      params.colorSpace = AVCOL_SPC_BT709;
      assert.equal(params.colorSpace, AVCOL_SPC_BT709);
    });

    it('should get and set chroma location', () => {
      params.chromaLocation = AVCHROMA_LOC_LEFT;
      assert.equal(params.chromaLocation, AVCHROMA_LOC_LEFT);

      params.chromaLocation = AVCHROMA_LOC_CENTER;
      assert.equal(params.chromaLocation, AVCHROMA_LOC_CENTER);
    });

    it('should get and set videoDelay', () => {
      params.videoDelay = 0;
      assert.equal(params.videoDelay, 0);

      params.videoDelay = 1;
      assert.equal(params.videoDelay, 1);

      params.videoDelay = 2;
      assert.equal(params.videoDelay, 2);

      // Reset to 0
      params.videoDelay = 0;
      assert.equal(params.videoDelay, 0);
    });
  });

  describe('Audio Properties', () => {
    beforeEach(() => {
      params.alloc();
      params.codecType = AVMEDIA_TYPE_AUDIO;
    });

    it('should get and set sample rate', () => {
      params.sampleRate = 48000;
      assert.equal(params.sampleRate, 48000);

      params.sampleRate = 44100;
      assert.equal(params.sampleRate, 44100);
    });

    it('should get and set channel count', () => {
      params.channels = 2;
      assert.equal(params.channels, 2);

      params.channels = 6; // 5.1 surround
      assert.equal(params.channels, 6);
    });

    it('should get and set channel layout', () => {
      const layout = AV_CHANNEL_LAYOUT_STEREO; // Stereo
      params.channelLayout = layout;

      const retrieved = params.channelLayout;
      assert.equal(retrieved.nbChannels, 2);
      assert.equal(retrieved.order, AV_CHANNEL_ORDER_NATIVE);
      assert.equal(retrieved.mask, AV_CH_LAYOUT_STEREO);
    });

    it('should handle mono channel layout', () => {
      const layout = AV_CHANNEL_LAYOUT_MONO;
      params.channelLayout = layout;

      const retrieved = params.channelLayout;
      assert.equal(retrieved.nbChannels, 1);
      assert.equal(retrieved.order, AV_CHANNEL_ORDER_NATIVE);
      assert.equal(retrieved.mask, AV_CH_LAYOUT_MONO);
    });

    it('should get and set frameSize', () => {
      // Common audio frame sizes
      params.frameSize = 1024; // AAC
      assert.equal(params.frameSize, 1024);

      params.frameSize = 1152; // MP3
      assert.equal(params.frameSize, 1152);

      params.frameSize = 960; // Opus
      assert.equal(params.frameSize, 960);

      // Variable frame size codecs
      params.frameSize = 0;
      assert.equal(params.frameSize, 0);
    });
  });

  describe('Extra Data', () => {
    beforeEach(() => {
      params.alloc();
    });

    it('should handle null extra data', () => {
      assert.equal(params.extradata, null);
      assert.equal(params.extradataSize, 0);
    });

    it('should set and get extra data', () => {
      const data = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x67]);
      params.extradata = data;

      const retrieved = params.extradata;
      assert.ok(retrieved);
      assert.ok(Buffer.isBuffer(retrieved));
      assert.equal(retrieved.length, data.length);
      assert.deepEqual(retrieved, data);
    });

    it('should get extra data size', () => {
      const data = Buffer.from([0x00, 0x00, 0x00, 0x01]);
      params.extradata = data;
      assert.equal(params.extradataSize, 4);
    });

    it('should clear extra data', () => {
      const data = Buffer.from([0x00, 0x00, 0x00, 0x01]);
      params.extradata = data;
      assert.ok(params.extradata);

      params.extradata = null;
      assert.equal(params.extradata, null);
      assert.equal(params.extradataSize, 0);
    });
  });

  describe('Copy Operations', () => {
    it('should copy parameters to another instance', () => {
      params.alloc();
      params.codecType = AVMEDIA_TYPE_VIDEO;
      params.codecId = AV_CODEC_ID_H264;
      params.width = 1280;
      params.height = 720;
      params.format = AV_PIX_FMT_YUV420P;
      params.bitRate = 2000000n;

      const dst = new CodecParameters();
      dst.alloc();

      const ret = params.copy(dst);
      assert.equal(ret, 0);

      // Verify copy
      assert.equal(dst.codecType, AVMEDIA_TYPE_VIDEO);
      assert.equal(dst.codecId, AV_CODEC_ID_H264);
      assert.equal(dst.width, 1280);
      assert.equal(dst.height, 720);
      assert.equal(dst.format, AV_PIX_FMT_YUV420P);
      assert.equal(dst.bitRate, 2000000n);

      dst.free();
    });

    it('should copy audio parameters', () => {
      params.alloc();
      params.codecType = AVMEDIA_TYPE_AUDIO;
      params.codecId = AV_CODEC_ID_AAC;
      params.sampleRate = 48000;
      params.channels = 2;
      params.format = AV_SAMPLE_FMT_FLTP;

      const dst = new CodecParameters();
      dst.alloc();

      const ret = params.copy(dst);
      assert.equal(ret, 0);

      assert.equal(dst.codecType, AVMEDIA_TYPE_AUDIO);
      assert.equal(dst.codecId, AV_CODEC_ID_AAC);
      assert.equal(dst.sampleRate, 48000);
      assert.equal(dst.channels, 2);
      assert.equal(dst.format, AV_SAMPLE_FMT_FLTP);

      dst.free();
    });

    it('should copy extra data', () => {
      params.alloc();
      const data = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x67]);
      params.extradata = data;

      const dst = new CodecParameters();
      dst.alloc();

      const ret = params.copy(dst);
      assert.equal(ret, 0);

      const dstExtra = dst.extradata;
      assert.ok(dstExtra);
      assert.deepEqual(dstExtra, data);

      dst.free();
    });
  });

  describe('Context Integration', () => {
    it('should copy from codec context', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);
      ctx.width = 640;
      ctx.height = 480;
      ctx.pixelFormat = AV_PIX_FMT_YUV420P;

      params.alloc();
      const ret = params.fromContext(ctx);
      assert.equal(ret, 0);

      // Verify parameters were copied from context
      assert.equal(params.codecType, AVMEDIA_TYPE_VIDEO);
      assert.equal(params.codecId, AV_CODEC_ID_H264);
      assert.equal(params.width, 640);
      assert.equal(params.height, 480);
      assert.equal(params.format, AV_PIX_FMT_YUV420P);

      ctx.freeContext();
    });

    it('should copy to codec context', () => {
      params.alloc();
      params.codecType = AVMEDIA_TYPE_VIDEO;
      params.codecId = AV_CODEC_ID_MJPEG;
      params.width = 800;
      params.height = 600;
      params.format = AV_PIX_FMT_RGB24;

      const codec = Codec.findDecoder(AV_CODEC_ID_MJPEG);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      const ret = params.toContext(ctx);
      assert.equal(ret, 0);

      // Verify context was updated
      assert.equal(ctx.width, 800);
      assert.equal(ctx.height, 600);
      assert.equal(ctx.pixelFormat, AV_PIX_FMT_RGB24);

      ctx.freeContext();
    });

    it('should handle audio context', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);
      ctx.sampleRate = 44100;
      ctx.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      ctx.sampleFormat = AV_SAMPLE_FMT_S16;

      params.alloc();
      const ret = params.fromContext(ctx);
      assert.equal(ret, 0);

      assert.equal(params.codecType, AVMEDIA_TYPE_AUDIO);
      assert.equal(params.codecId, AV_CODEC_ID_PCM_S16LE);
      assert.equal(params.sampleRate, 44100);
      assert.equal(params.format, AV_SAMPLE_FMT_S16);

      ctx.freeContext();
    });
  });

  describe('Copy Operations', () => {
    it('should copy video parameters', () => {
      params.alloc();
      params.codecType = AVMEDIA_TYPE_VIDEO;
      params.codecId = AV_CODEC_ID_H264;
      params.width = 1920;
      params.height = 1080;
      params.bitRate = 5000000n;
      params.format = AV_PIX_FMT_YUV420P;
      params.profile = AV_PROFILE_H264_HIGH;
      params.level = 41;
      params.colorRange = AVCOL_RANGE_MPEG;
      params.colorPrimaries = AVCOL_PRI_BT709;
      params.colorTrc = AVCOL_TRC_BT709;
      params.colorSpace = AVCOL_SPC_BT709;
      params.chromaLocation = AVCHROMA_LOC_LEFT;
      params.frameRate = new Rational(30, 1);

      const dst = new CodecParameters();
      dst.alloc();

      const ret = params.copy(dst);
      assert.equal(ret, 0);

      // Verify all parameters were copied
      assert.equal(dst.codecType, AVMEDIA_TYPE_VIDEO);
      assert.equal(dst.codecId, AV_CODEC_ID_H264);
      assert.equal(dst.width, 1920);
      assert.equal(dst.height, 1080);
      assert.equal(dst.bitRate, 5000000n);
      assert.equal(dst.format, AV_PIX_FMT_YUV420P);
      assert.equal(dst.profile, AV_PROFILE_H264_HIGH);
      assert.equal(dst.level, 41);
      assert.equal(dst.colorRange, AVCOL_RANGE_MPEG);
      assert.equal(dst.colorPrimaries, AVCOL_PRI_BT709);
      assert.equal(dst.colorTrc, AVCOL_TRC_BT709);
      assert.equal(dst.colorSpace, AVCOL_SPC_BT709);
      assert.equal(dst.chromaLocation, AVCHROMA_LOC_LEFT);
      assert.equal(dst.frameRate.num, 30);
      assert.equal(dst.frameRate.den, 1);

      dst.free();
    });

    it('should copy audio parameters', () => {
      params.alloc();
      params.codecType = AVMEDIA_TYPE_AUDIO;
      params.codecId = AV_CODEC_ID_AAC;
      params.bitRate = 128000n;
      params.sampleRate = 48000;
      params.format = AV_SAMPLE_FMT_FLTP;
      params.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      params.profile = AV_PROFILE_AAC_LOW;

      const dst = new CodecParameters();
      dst.alloc();

      const ret = params.copy(dst);
      assert.equal(ret, 0);

      // Verify all parameters were copied
      assert.equal(dst.codecType, AVMEDIA_TYPE_AUDIO);
      assert.equal(dst.codecId, AV_CODEC_ID_AAC);
      assert.equal(dst.bitRate, 128000n);
      assert.equal(dst.sampleRate, 48000);
      assert.equal(dst.format, AV_SAMPLE_FMT_FLTP);
      assert.equal(dst.channelLayout.nbChannels, 2);
      assert.equal(dst.channelLayout.mask, 3n);
      assert.equal(dst.profile, AV_PROFILE_AAC_LOW);

      dst.free();
    });

    it('should overwrite existing parameters on copy', () => {
      params.alloc();
      params.codecType = AVMEDIA_TYPE_VIDEO;
      params.codecId = AV_CODEC_ID_H264;
      params.width = 1920;
      params.height = 1080;

      const dst = new CodecParameters();
      dst.alloc();
      // Set different values in destination
      dst.codecType = AVMEDIA_TYPE_AUDIO;
      dst.codecId = AV_CODEC_ID_AAC;
      dst.width = 640;
      dst.height = 480;

      const ret = params.copy(dst);
      assert.equal(ret, 0);

      // Verify parameters were overwritten
      assert.equal(dst.codecType, AVMEDIA_TYPE_VIDEO);
      assert.equal(dst.codecId, AV_CODEC_ID_H264);
      assert.equal(dst.width, 1920);
      assert.equal(dst.height, 1080);

      dst.free();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero dimensions', () => {
      params.alloc();
      params.width = 0;
      params.height = 0;

      assert.equal(params.width, 0);
      assert.equal(params.height, 0);
    });

    it('should handle very large dimensions', () => {
      params.alloc();
      params.width = 7680; // 8K
      params.height = 4320;

      assert.equal(params.width, 7680);
      assert.equal(params.height, 4320);
    });

    it('should handle zero bitrate', () => {
      params.alloc();
      params.bitRate = 0n;
      assert.equal(params.bitRate, 0n);
    });

    it('should handle very large bitrate', () => {
      params.alloc();
      params.bitRate = 100000000n; // 100 Mbps
      assert.equal(params.bitRate, 100000000n);
    });

    it('should handle zero sample rate', () => {
      params.alloc();
      params.sampleRate = 0;
      assert.equal(params.sampleRate, 0);
    });

    it('should handle high sample rates', () => {
      params.alloc();
      params.sampleRate = 192000;
      assert.equal(params.sampleRate, 192000);
    });

    it('should handle undefined aspect ratio', () => {
      params.alloc();
      const sar = new Rational(0, 1); // Undefined
      params.sampleAspectRatio = sar;

      const retrieved = params.sampleAspectRatio;
      assert.equal(retrieved.num, 0);
      assert.equal(retrieved.den, 1);
    });
  });
});
