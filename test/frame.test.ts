import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  AV_CHANNEL_LAYOUT_5POINT1_BACK,
  AV_CHANNEL_LAYOUT_7POINT1,
  AV_CHANNEL_LAYOUT_STEREO,
  AV_FRAME_DATA_A53_CC,
  AV_FRAME_DATA_MASTERING_DISPLAY_METADATA,
  AV_FRAME_DATA_MOTION_VECTORS,
  AV_FRAME_DATA_STEREO3D,
  AV_HWDEVICE_TYPE_VIDEOTOOLBOX,
  AV_NOPTS_VALUE,
  AV_PICTURE_TYPE_I,
  AV_PICTURE_TYPE_P,
  AV_PIX_FMT_RGB24,
  AV_PIX_FMT_VIDEOTOOLBOX,
  AV_PIX_FMT_YUV420P,
  AV_SAMPLE_FMT_FLT,
  AV_SAMPLE_FMT_FLTP,
  AV_SAMPLE_FMT_S16,
  AVCHROMA_LOC_LEFT,
  AVCOL_PRI_BT709,
  AVCOL_RANGE_JPEG,
  AVCOL_SPC_BT709,
  AVCOL_TRC_BT709,
  AVMEDIA_TYPE_VIDEO,
  Codec,
  CodecContext,
  Decoder,
  Demuxer,
  FormatContext,
  Frame,
  HardwareContext,
  Packet,
  Rational,
} from '../src/index.js';

import { getInputFile, skipInCI } from './index.js';

describe('Frame', () => {
  let frame: Frame;

  beforeEach(() => {
    frame = new Frame();
  });

  afterEach(() => {
    // Clean up if frame is still allocated
    try {
      frame.free();
    } catch {
      // Frame might already be freed
    }
  });

  describe('Lifecycle', () => {
    it('should create an uninitialized frame', () => {
      assert.ok(frame);
      // Frame should not have data before alloc
      assert.equal(frame.data, null);
    });

    it('should allocate and free a frame', () => {
      frame.alloc();
      // After alloc, frame should still not have data buffers
      assert.equal(frame.data, null);

      frame.free();
      // After free, frame should not be usable
      // NOTE: Skipping re-alloc test as it crashes
    });

    it('should support using statement for automatic disposal', () => {
      {
        using testFrame = new Frame();
        testFrame.alloc();
        assert.ok(testFrame);
      }
      // Frame should be automatically disposed here
    });
  });

  describe('Video Frame Properties', () => {
    beforeEach(() => {
      frame.alloc();
    });

    it('should set and get video format properties', () => {
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 1920;
      frame.height = 1080;

      assert.equal(frame.format, AV_PIX_FMT_YUV420P);
      assert.equal(frame.width, 1920);
      assert.equal(frame.height, 1080);
    });

    it('should allocate video frame buffer', () => {
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 640;
      frame.height = 480;

      const ret = frame.getBuffer();
      assert.equal(ret, 0, 'getBuffer should return 0 on success');

      // After buffer allocation, data should be available
      assert.notEqual(frame.data, null);
      assert.ok(Array.isArray(frame.data));
      assert.ok(frame.data.length > 0);

      // Check linesize is set
      const linesize = frame.linesize;
      assert.ok(Array.isArray(linesize));
      assert.ok(linesize[0] > 0); // Y plane should have linesize
    });

    it('should allocate RGB24 frame buffer', () => {
      frame.format = AV_PIX_FMT_RGB24;
      frame.width = 320;
      frame.height = 240;

      const ret = frame.allocBuffer();
      assert.equal(ret, 0);

      assert.notEqual(frame.data, null);
      assert.ok(frame.data![0] instanceof Buffer);
    });

    it('should allocate frame buffer with alignment', () => {
      frame.format = AV_PIX_FMT_RGB24;
      frame.width = 320;
      frame.height = 240;

      // Test with specific alignment (e.g., 32 for SIMD)
      const ret = frame.getBuffer(32);
      assert.equal(ret, 0, 'getBuffer with align should return 0 on success');

      assert.notEqual(frame.data, null);
      assert.ok(frame.data![0] instanceof Buffer);
    });

    it('should set and get color properties', () => {
      frame.colorRange = AVCOL_RANGE_JPEG;
      frame.colorPrimaries = AVCOL_PRI_BT709;
      frame.colorTrc = AVCOL_TRC_BT709;
      frame.colorSpace = AVCOL_SPC_BT709;
      frame.chromaLocation = AVCHROMA_LOC_LEFT;

      assert.equal(frame.colorRange, AVCOL_RANGE_JPEG);
      assert.equal(frame.colorPrimaries, AVCOL_PRI_BT709);
      assert.equal(frame.colorTrc, AVCOL_TRC_BT709);
      assert.equal(frame.colorSpace, AVCOL_SPC_BT709);
      assert.equal(frame.chromaLocation, AVCHROMA_LOC_LEFT);
    });

    it('should set and get picture type', () => {
      frame.pictType = AV_PICTURE_TYPE_I;
      assert.equal(frame.pictType, AV_PICTURE_TYPE_I);

      frame.pictType = AV_PICTURE_TYPE_P;
      assert.equal(frame.pictType, AV_PICTURE_TYPE_P);
    });

    it('should set and get sample aspect ratio', () => {
      const sar = new Rational(16, 9);
      frame.sampleAspectRatio = sar;

      const retrieved = frame.sampleAspectRatio;
      assert.equal(retrieved.num, 16);
      assert.equal(retrieved.den, 9);
    });
  });

  describe('Frame Flags', () => {
    beforeEach(() => {
      frame.alloc();
    });

    it('should set and get flags', () => {
      frame.flags = 0;
      assert.equal(frame.flags, 0);

      frame.flags = 0x1;
      assert.equal(frame.flags, 0x1);

      frame.flags = 0x3;
      assert.equal(frame.flags, 0x3);
    });

    it('should set and get decodeErrorFlags', () => {
      frame.decodeErrorFlags = 0;
      assert.equal(frame.decodeErrorFlags, 0);

      frame.decodeErrorFlags = 0x1;
      assert.equal(frame.decodeErrorFlags, 0x1);

      frame.decodeErrorFlags = 0x2;
      assert.equal(frame.decodeErrorFlags, 0x2);
    });

    it('should set single flag using setFlags', () => {
      frame.flags = 0;
      frame.setFlags(0x1);
      assert.equal(frame.flags, 0x1);

      frame.setFlags(0x2);
      assert.equal(frame.flags, 0x3); // Both flags set
    });

    it('should set multiple flags using setFlags', () => {
      frame.flags = 0;
      frame.setFlags(0x1, 0x4);
      assert.equal(frame.flags, 0x5); // Both 0x1 and 0x4
    });

    it('should clear single flag using clearFlags', () => {
      frame.flags = 0x7; // Set flags 0x1, 0x2, 0x4
      frame.clearFlags(0x2);
      assert.equal(frame.flags, 0x5); // Only 0x1 and 0x4 remain
    });

    it('should clear multiple flags using clearFlags', () => {
      frame.flags = 0x7; // Set flags 0x1, 0x2, 0x4
      frame.clearFlags(0x1, 0x4);
      assert.equal(frame.flags, 0x2); // Only 0x2 remains
    });

    it('should check for single flag using hasFlags', () => {
      frame.flags = 0x5; // Flags 0x1 and 0x4 set
      assert.equal(frame.hasFlags(0x1), true);
      assert.equal(frame.hasFlags(0x4), true);
      assert.equal(frame.hasFlags(0x2), false);
    });

    it('should check for multiple flags using hasFlags', () => {
      frame.flags = 0x7; // Flags 0x1, 0x2, 0x4 set
      assert.equal(frame.hasFlags(0x1, 0x2), true);
      assert.equal(frame.hasFlags(0x1, 0x4), true);
      assert.equal(frame.hasFlags(0x1, 0x2, 0x4), true);

      // One flag missing
      assert.equal(frame.hasFlags(0x1, 0x8), false);
    });

    it('should check for decode error flags using hasDecodeErrorFlags', () => {
      frame.decodeErrorFlags = 0x3; // Flags 0x1 and 0x2 set
      assert.equal(frame.hasDecodeErrorFlags(0x1), true);
      assert.equal(frame.hasDecodeErrorFlags(0x2), true);
      assert.equal(frame.hasDecodeErrorFlags(0x4), false);
    });

    it('should check for multiple decode error flags using hasDecodeErrorFlags', () => {
      frame.decodeErrorFlags = 0x7; // Flags 0x1, 0x2, 0x4 set
      assert.equal(frame.hasDecodeErrorFlags(0x1, 0x2), true);
      assert.equal(frame.hasDecodeErrorFlags(0x1, 0x4), true);

      // One flag missing
      assert.equal(frame.hasDecodeErrorFlags(0x1, 0x8), false);
    });
  });

  describe('Audio Frame Properties', () => {
    beforeEach(() => {
      frame.alloc();
    });

    it('should set and get audio format properties', () => {
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.sampleRate = 48000;
      frame.nbSamples = 1024;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;

      assert.equal(frame.format, AV_SAMPLE_FMT_FLTP);
      assert.equal(frame.sampleRate, 48000);
      assert.equal(frame.nbSamples, 1024);
      assert.equal(frame.channelLayout.nbChannels, 2);
    });

    it('should allocate audio frame buffer', () => {
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.sampleRate = 44100;
      frame.nbSamples = 1024;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;

      const ret = frame.getBuffer();
      assert.equal(ret, 0);

      // For planar audio, we should have separate buffers per channel
      assert.notEqual(frame.data, null);
      assert.ok(Array.isArray(frame.data));
      assert.equal(frame.data.length, 2); // 2 channels
      assert.ok(frame.data[0] instanceof Buffer);
      assert.ok(frame.data[1] instanceof Buffer);
    });

    it('should allocate interleaved audio frame buffer', () => {
      frame.format = AV_SAMPLE_FMT_S16;
      frame.sampleRate = 48000;
      frame.nbSamples = 512;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;

      const ret = frame.allocBuffer();
      assert.equal(ret, 0);

      // For interleaved audio, we should have a single buffer
      assert.notEqual(frame.data, null);
      assert.ok(frame.data![0] instanceof Buffer);
    });

    it('should get number of channels', () => {
      frame.channelLayout = AV_CHANNEL_LAYOUT_5POINT1_BACK;

      assert.equal(frame.channels, 6);
    });

    it('should access extendedData for audio frames', () => {
      // Set up audio frame
      frame.format = AV_SAMPLE_FMT_S16;
      frame.sampleRate = 44100;
      frame.nbSamples = 1024;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;

      const ret = frame.allocBuffer();
      assert.equal(ret, 0);

      // extendedData should contain audio data buffers
      const extData = frame.extendedData;
      assert.notEqual(extData, null, 'Should have extended data');
      assert.ok(Array.isArray(extData), 'Should be an array');
      assert.ok(extData.length >= 1, 'Should have at least one buffer');
      assert.ok(extData[0] instanceof Buffer, 'Should contain Buffer objects');

      // For audio frames, we should be able to access the data
      // The actual buffer content may differ, but both should exist
      assert.ok(frame.data, 'Should have data array');
      assert.ok(frame.data[0] instanceof Buffer, 'data[0] should be a Buffer');
    });
  });

  describe('Timestamps and Timing', () => {
    beforeEach(() => {
      frame.alloc();
    });

    it('should set and get pts', () => {
      frame.pts = 12345n;
      assert.equal(frame.pts, 12345n);

      frame.pts = AV_NOPTS_VALUE;
      assert.equal(frame.pts, AV_NOPTS_VALUE);
    });

    it('should set and get pktDts', () => {
      frame.pktDts = 67890n;
      assert.equal(frame.pktDts, 67890n);
    });

    it('should set and get time base', () => {
      const timeBase = new Rational(1, 25);
      frame.timeBase = timeBase;

      const retrieved = frame.timeBase;
      assert.equal(retrieved.num, 1);
      assert.equal(retrieved.den, 25);
    });

    it('should set and get keyFrame flag', () => {
      frame.keyFrame = 1;
      assert.equal(frame.keyFrame, 1);

      frame.keyFrame = 0;
      assert.equal(frame.keyFrame, 0);
    });

    it('should get bestEffortTimestamp', () => {
      // Set various timestamp values
      frame.pts = 1000n;
      frame.pktDts = 900n;

      // bestEffortTimestamp should return the best timestamp available
      const best = frame.bestEffortTimestamp;
      assert.ok(typeof best === 'bigint', 'Should return bigint');
      // The actual value depends on FFmpeg's internal logic
      // We just verify it returns a valid bigint
    });

    it('should set and get duration', () => {
      frame.duration = 0n;
      assert.equal(frame.duration, 0n);

      frame.duration = 1000n;
      assert.equal(frame.duration, 1000n);

      frame.duration = 3003n;
      assert.equal(frame.duration, 3003n);
    });

    it('should set and get repeatPict', () => {
      frame.repeatPict = 0;
      assert.equal(frame.repeatPict, 0);

      frame.repeatPict = 1;
      assert.equal(frame.repeatPict, 1);

      frame.repeatPict = 2;
      assert.equal(frame.repeatPict, 2);
    });
  });

  describe('Frame Operations', () => {
    let srcFrame: Frame;

    beforeEach(() => {
      srcFrame = new Frame();
      srcFrame.alloc();
    });

    afterEach(() => {
      try {
        srcFrame.free();
      } catch {
        // Frame might already be freed
      }
    });

    it('should clone a frame', () => {
      // Set up source frame
      srcFrame.format = AV_PIX_FMT_YUV420P;
      srcFrame.width = 320;
      srcFrame.height = 240;
      srcFrame.pts = 1000n;
      srcFrame.allocBuffer();

      // Clone the frame
      const cloned = srcFrame.clone();
      assert.ok(cloned);

      // Verify properties are copied
      assert.equal(cloned.format, srcFrame.format);
      assert.equal(cloned.width, srcFrame.width);
      assert.equal(cloned.height, srcFrame.height);
      assert.equal(cloned.pts, srcFrame.pts);

      // Clean up
      cloned.free();
    });

    it('should unreference a frame', () => {
      frame.alloc(); // Need to allocate first
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 1920;
      frame.height = 1080;
      frame.allocBuffer();

      assert.notEqual(frame.data, null);

      // Unreference should clear the data
      frame.unref();
      assert.equal(frame.data, null);
      assert.equal(frame.width, 0);
      assert.equal(frame.height, 0);
    });

    it('should copy frame properties', () => {
      frame.alloc(); // Need to allocate destination frame

      srcFrame.format = AV_PIX_FMT_YUV420P;
      srcFrame.width = 800;
      srcFrame.height = 600;
      srcFrame.pts = 5000n;
      srcFrame.keyFrame = 1;
      srcFrame.pictType = AV_PICTURE_TYPE_I;
      srcFrame.colorRange = AVCOL_RANGE_JPEG;

      const ret = frame.copyProps(srcFrame);
      assert.ok(ret >= 0);

      // Properties should be copied
      assert.equal(frame.pts, srcFrame.pts);
      assert.equal(frame.keyFrame, srcFrame.keyFrame);
      assert.equal(frame.pictType, srcFrame.pictType);
      assert.equal(frame.colorRange, srcFrame.colorRange);
    });

    it('should copy frame data', () => {
      frame.alloc(); // Need to allocate destination frame first

      // Set up source frame with data
      srcFrame.format = AV_PIX_FMT_RGB24;
      srcFrame.width = 100;
      srcFrame.height = 100;
      srcFrame.allocBuffer();

      // Set up destination with same parameters
      frame.format = srcFrame.format;
      frame.width = srcFrame.width;
      frame.height = srcFrame.height;
      frame.allocBuffer();

      // Copy the data
      const ret = frame.copy(srcFrame);
      assert.ok(ret >= 0);

      // Both frames should have data
      assert.notEqual(srcFrame.data, null);
      assert.notEqual(frame.data, null);
    });

    it('should make frame writable', () => {
      srcFrame.format = AV_PIX_FMT_YUV420P;
      srcFrame.width = 320;
      srcFrame.height = 240;
      srcFrame.allocBuffer();

      // Make it writable
      const ret = srcFrame.makeWritable();
      assert.ok(ret >= 0);

      // Should now be writable
      assert.ok(srcFrame.isWritable);
    });

    it('should apply cropping to frame', () => {
      // Set up a video frame
      srcFrame.format = AV_PIX_FMT_YUV420P;
      srcFrame.width = 1920;
      srcFrame.height = 1080;
      srcFrame.allocBuffer();

      // applyCropping returns 0 on success or negative error
      // Note: This may return an error if there's no crop metadata
      // The important thing is that the method exists and returns a number
      const ret = srcFrame.applyCropping();
      assert.ok(typeof ret === 'number', 'applyCropping should return a number');
    });

    it('should apply cropping with flags', () => {
      srcFrame.format = AV_PIX_FMT_YUV420P;
      srcFrame.width = 640;
      srcFrame.height = 480;
      srcFrame.allocBuffer();

      // Test with flags parameter (0 for default behavior)
      const ret = srcFrame.applyCropping(0);
      assert.ok(typeof ret === 'number', 'applyCropping with flags should return a number');
    });
  });

  describe('Extended Data', () => {
    beforeEach(() => {
      frame.alloc();
    });

    it('should handle extended data for multi-channel audio', () => {
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.sampleRate = 48000;
      frame.nbSamples = 1024;
      frame.channelLayout = AV_CHANNEL_LAYOUT_7POINT1;

      const ret = frame.getBuffer();
      assert.equal(ret, 0);

      // Should have extended data for > 8 channels
      const extData = frame.extendedData;
      assert.notEqual(extData, null);
      assert.ok(Array.isArray(extData));
      assert.equal(extData.length, 8);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      frame.alloc();
    });

    it('should fail to allocate buffer without format', () => {
      // No format set
      frame.width = 640;
      frame.height = 480;

      const ret = frame.getBuffer();
      assert.notEqual(ret, 0, 'Should fail without format');
      assert.ok(ret < 0, 'Should return negative error code');
    });

    it('should fail to allocate video buffer without dimensions', () => {
      frame.format = AV_PIX_FMT_YUV420P;
      // No width/height set

      const ret = frame.getBuffer();
      assert.notEqual(ret, 0, 'Should fail without dimensions');
      assert.ok(ret < 0, 'Should return negative error code');
    });

    it('should fail to allocate audio buffer without samples', () => {
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      // No nbSamples set

      const ret = frame.getBuffer();
      assert.notEqual(ret, 0, 'Should fail without nbSamples');
      assert.ok(ret < 0, 'Should return negative error code');
    });

    it('should fail to copy frames with different formats', () => {
      const srcFrame = new Frame();
      srcFrame.alloc();
      srcFrame.format = AV_PIX_FMT_YUV420P;
      srcFrame.width = 640;
      srcFrame.height = 480;
      srcFrame.allocBuffer();

      frame.format = AV_PIX_FMT_RGB24; // Different format
      frame.width = 640;
      frame.height = 480;
      frame.allocBuffer();

      const ret = frame.copy(srcFrame);
      assert.ok(ret < 0, 'Should fail to copy frames with different formats');

      srcFrame.free();
    });
  });

  describe('Hardware Acceleration', () => {
    it('should get and set null hardware frames context', () => {
      frame.alloc();

      // Initially should be null
      assert.equal(frame.hwFramesCtx, null);

      // Should be able to set to null
      frame.hwFramesCtx = null;
      assert.equal(frame.hwFramesCtx, null);
    });

    it('should detect software frame correctly', () => {
      frame.alloc();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 640;
      frame.height = 480;
      frame.allocBuffer();

      // Software frame should have data but no hw_frames_ctx
      assert.equal(frame.isSwFrame(), true, 'Should be a software frame');
      assert.equal(frame.isHwFrame(), false, 'Should not be a hardware frame');
    });

    it('should detect unallocated frame as neither hw nor sw', () => {
      frame.alloc();

      // Unallocated frame has neither data nor hw_frames_ctx
      assert.equal(frame.isSwFrame(), false, 'Unallocated frame should not be software');
      assert.equal(frame.isHwFrame(), false, 'Unallocated frame should not be hardware');
    });

    it('should return null from exportIOSurface for a software frame', () => {
      frame.alloc();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 640;
      frame.height = 480;
      frame.allocBuffer();

      // Software (non-VideoToolbox) frames have no backing IOSurface.
      // On non-macOS platforms this is also null. The positive path requires
      // an actual hardware-decoded VideoToolbox frame.
      assert.equal(frame.exportIOSurface(), null, 'Software frame should not expose an IOSurface');
    });

    it('should return null from exportIOSurface for an unallocated frame', () => {
      frame.alloc();
      assert.equal(frame.exportIOSurface(), null, 'Unallocated frame should not expose an IOSurface');
    });

    it('should export an IOSurface from a decoded VideoToolbox frame', skipInCI, async () => {
      using hw = HardwareContext.create(AV_HWDEVICE_TYPE_VIDEOTOOLBOX);
      if (!hw) {
        console.log('VideoToolbox not available - skipping');
        return;
      }

      await using input = await Demuxer.open(getInputFile('video.mp4'));
      const videoStream = input.video();
      assert.ok(videoStream, 'Should have video stream');

      using decoder = await Decoder.create(videoStream, { hardware: hw });

      let handle: Buffer | null = null;
      for await (using decoded of decoder.frames(input.packets(videoStream.index))) {
        if (decoded?.format === AV_PIX_FMT_VIDEOTOOLBOX) {
          handle = decoded.exportIOSurface();
          break;
        }
      }

      assert.ok(handle, 'Should export an IOSurface from a VideoToolbox frame');
      assert.equal(handle.length, 8, 'IOSurface handle should be an 8-byte pointer');
    });

    it('should transfer data between frames (async)', async () => {
      const srcFrame = new Frame();
      srcFrame.alloc();
      srcFrame.format = AV_PIX_FMT_YUV420P;
      srcFrame.width = 640;
      srcFrame.height = 480;
      srcFrame.allocBuffer();

      frame.alloc();

      // Note: This will likely fail without proper hardware context
      // but we test that the method exists and returns a number
      const ret = await frame.hwframeTransferData(srcFrame, 0);
      assert.ok(typeof ret === 'number', 'Should return a number');

      srcFrame.free();
    });

    it('should transfer data between frames (sync)', () => {
      const srcFrame = new Frame();
      srcFrame.alloc();
      srcFrame.format = AV_PIX_FMT_YUV420P;
      srcFrame.width = 640;
      srcFrame.height = 480;
      srcFrame.allocBuffer();

      frame.alloc();

      // Note: This will likely fail without proper hardware context
      // but we test that the method exists and returns a number
      const ret = frame.hwframeTransferDataSync(srcFrame, 0);
      assert.ok(typeof ret === 'number', 'Should return a number');

      srcFrame.free();
    });
  });

  describe('Side Data', () => {
    beforeEach(() => {
      frame.alloc();
    });

    it('should get null for non-existent side data', () => {
      const data = frame.getSideData(AV_FRAME_DATA_A53_CC);
      assert.equal(data, null);
    });

    it('should allocate and retrieve side data', () => {
      const size = 128;
      const buffer = frame.newSideData(AV_FRAME_DATA_STEREO3D, size);

      assert.ok(buffer, 'Should allocate side data buffer');
      assert.ok(Buffer.isBuffer(buffer), 'Should be a Buffer');
      assert.equal(buffer.length, size, 'Should have correct size');

      // Write some data
      buffer.fill(0x42);

      // Retrieve and verify
      const retrieved = frame.getSideData(AV_FRAME_DATA_STEREO3D);
      assert.ok(retrieved, 'Should retrieve side data');
      assert.equal(retrieved.length, size, 'Should have same size');
      assert.equal(retrieved[0], 0x42, 'Should contain written data');
    });

    it('should remove specific side data', () => {
      // Add side data
      const buffer = frame.newSideData(AV_FRAME_DATA_MOTION_VECTORS, 64);
      buffer.fill(0xff);

      // Verify it exists
      let data = frame.getSideData(AV_FRAME_DATA_MOTION_VECTORS);
      assert.ok(data, 'Should have side data before removal');

      // Remove it
      frame.removeSideData(AV_FRAME_DATA_MOTION_VECTORS);

      // Verify it's gone
      data = frame.getSideData(AV_FRAME_DATA_MOTION_VECTORS);
      assert.equal(data, null, 'Should have no side data after removal');
    });

    it('should handle multiple side data types', () => {
      // Add different types of side data
      const ccBuffer = frame.newSideData(AV_FRAME_DATA_A53_CC, 32);
      ccBuffer.fill(0xcc);

      const hdrBuffer = frame.newSideData(AV_FRAME_DATA_MASTERING_DISPLAY_METADATA, 24);
      hdrBuffer.fill(0xdd);

      // Retrieve both
      const cc = frame.getSideData(AV_FRAME_DATA_A53_CC);
      const hdr = frame.getSideData(AV_FRAME_DATA_MASTERING_DISPLAY_METADATA);

      assert.ok(cc, 'Should have CC side data');
      assert.ok(hdr, 'Should have HDR side data');
      assert.equal(cc.length, 32, 'CC data should have correct size');
      assert.equal(hdr.length, 24, 'HDR data should have correct size');
      assert.equal(cc[0], 0xcc, 'CC data should be intact');

      // Remove one type
      frame.removeSideData(AV_FRAME_DATA_A53_CC);

      // Verify only one was removed
      assert.equal(frame.getSideData(AV_FRAME_DATA_A53_CC), null, 'CC data should be removed');
      assert.ok(frame.getSideData(AV_FRAME_DATA_MASTERING_DISPLAY_METADATA), 'HDR data should remain');
    });

    it('should persist side data through frame operations', () => {
      // Set up frame with video data
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 640;
      frame.height = 480;
      frame.allocBuffer();

      // Add side data
      const metaBuffer = frame.newSideData(AV_FRAME_DATA_STEREO3D, 16);
      metaBuffer.writeUInt32LE(0x12345678, 0);

      // Verify it persists
      const retrieved = frame.getSideData(AV_FRAME_DATA_STEREO3D);
      assert.ok(retrieved, 'Should have side data after buffer allocation');
      assert.equal(retrieved.readUInt32LE(0), 0x12345678, 'Data should be intact');
    });
  });

  describe('fromBuffer', () => {
    it('should fill video frame from buffer', () => {
      frame.alloc();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 320;
      frame.height = 240;
      frame.allocBuffer();

      // YUV420P: Y plane (320*240) + U plane (160*120) + V plane (160*120)
      const ySize = frame.width * frame.height;
      const uvSize = (frame.width / 2) * (frame.height / 2);
      const totalSize = ySize + uvSize * 2;

      // Create test buffer with pattern
      const buffer = Buffer.alloc(totalSize);
      // Fill Y plane with gradient
      for (let i = 0; i < ySize; i++) {
        buffer[i] = i % 256;
      }
      // Fill U plane
      for (let i = 0; i < uvSize; i++) {
        buffer[ySize + i] = 128;
      }
      // Fill V plane
      for (let i = 0; i < uvSize; i++) {
        buffer[ySize + uvSize + i] = 128;
      }

      const ret = frame.fromBuffer(buffer);
      assert.ok(ret >= 0, 'fromBuffer should succeed');

      // Verify data was written
      const data = frame.data;
      assert.ok(data, 'Frame should have data');
      assert.ok(data[0] instanceof Buffer, 'Y plane should be a Buffer');

      // Check if some data was actually written (first few bytes)
      const yPlane = data[0];
      assert.equal(yPlane[0], 0, 'First Y value should match');
      assert.equal(yPlane[1], 1, 'Second Y value should match');
    });

    it('should fill audio frame from buffer', () => {
      frame.alloc();
      frame.format = AV_SAMPLE_FMT_FLT;
      frame.nbSamples = 1024;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.allocBuffer();

      // Float32 stereo: 1024 samples * 2 channels * 4 bytes
      const samplesSize = frame.nbSamples * 2 * 4;
      const buffer = Buffer.alloc(samplesSize);

      // Fill with test pattern (alternating values)
      const floatArray = new Float32Array(buffer.buffer);
      for (let i = 0; i < floatArray.length; i++) {
        floatArray[i] = i % 2 === 0 ? 0.5 : -0.5;
      }

      const ret = frame.fromBuffer(buffer);
      assert.equal(ret, 0, 'fromBuffer should succeed for audio');

      // Verify data was written
      const data = frame.data;
      assert.ok(data, 'Frame should have data');
      assert.ok(data[0] instanceof Buffer, 'Audio data should be a Buffer');
    });

    it('should fail with unallocated frame', () => {
      const buffer = Buffer.alloc(100);

      assert.throws(() => {
        frame.fromBuffer(buffer);
      }, /Frame not allocated/);
    });

    it('should fail with buffer too small', () => {
      frame.alloc();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 1920;
      frame.height = 1080;
      frame.allocBuffer();

      // Buffer way too small for HD video
      const buffer = Buffer.alloc(100);

      assert.throws(() => {
        frame.fromBuffer(buffer);
      }, /Buffer too small/);
    });

    it('should fail with invalid input', () => {
      frame.alloc();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 320;
      frame.height = 240;
      frame.allocBuffer();

      assert.throws(() => {
        // @ts-expect-error Testing invalid input
        frame.fromBuffer('not a buffer');
      }, /Buffer required/);

      assert.throws(() => {
        // @ts-expect-error Testing invalid input
        frame.fromBuffer(null);
      }, /Buffer required/);
    });
  });

  describe('Factory Methods', () => {
    describe('fromVideoBuffer', () => {
      it('should create video frame from buffer', () => {
        const width = 320;
        const height = 240;
        const format = AV_PIX_FMT_RGB24;
        const bufferSize = width * height * 3; // RGB24 = 3 bytes per pixel
        const buffer = Buffer.alloc(bufferSize);

        // Fill with some test data
        for (let i = 0; i < bufferSize; i += 3) {
          buffer[i] = 255; // R
          buffer[i + 1] = 128; // G
          buffer[i + 2] = 64; // B
        }

        using videoFrame = Frame.fromVideoBuffer(buffer, {
          width,
          height,
          format,
        });

        assert.strictEqual(videoFrame.width, width);
        assert.strictEqual(videoFrame.height, height);
        assert.strictEqual(videoFrame.format, format);
        assert.notEqual(videoFrame.data, null);

        // Verify data was copied
        const outputBuffer = videoFrame.toBuffer();
        assert.strictEqual(outputBuffer.length, bufferSize);
        assert.strictEqual(outputBuffer[0], 255);
        assert.strictEqual(outputBuffer[1], 128);
        assert.strictEqual(outputBuffer[2], 64);
      });

      it('should set optional properties', () => {
        const buffer = Buffer.alloc(320 * 240 * 3);
        using videoFrame = Frame.fromVideoBuffer(buffer, {
          width: 320,
          height: 240,
          format: AV_PIX_FMT_RGB24,
          timeBase: { num: 1, den: 30 },
          sampleAspectRatio: { num: 1, den: 1 },
          pts: 42n,
        });

        assert.strictEqual(videoFrame.timeBase.num, 1);
        assert.strictEqual(videoFrame.timeBase.den, 30);
        assert.strictEqual(videoFrame.sampleAspectRatio.num, 1);
        assert.strictEqual(videoFrame.sampleAspectRatio.den, 1);
        assert.strictEqual(videoFrame.pts, 42n);
      });

      it('should throw on invalid buffer size', () => {
        const tooSmallBuffer = Buffer.alloc(100); // Way too small

        assert.throws(() => {
          Frame.fromVideoBuffer(tooSmallBuffer, {
            width: 1920,
            height: 1080,
            format: AV_PIX_FMT_YUV420P,
          });
        });
      });
    });

    describe('fromAudioBuffer', () => {
      it('should create audio frame from buffer', () => {
        const nbSamples = 960;
        const channels = 2;
        const format = AV_SAMPLE_FMT_FLT;
        const sampleRate = 48000;
        const channelLayout = AV_CHANNEL_LAYOUT_STEREO;
        const bufferSize = nbSamples * channels * 4; // float32 = 4 bytes per sample
        const buffer = Buffer.alloc(bufferSize);

        // Fill with some test audio data
        for (let i = 0; i < bufferSize; i += 4) {
          buffer.writeFloatLE(Math.sin(i / 100), i);
        }

        using audioFrame = Frame.fromAudioBuffer(buffer, {
          nbSamples,
          format,
          sampleRate,
          channelLayout,
        });

        assert.strictEqual(audioFrame.nbSamples, nbSamples);
        assert.strictEqual(audioFrame.format, format);
        assert.strictEqual(audioFrame.sampleRate, sampleRate);
        assert.deepStrictEqual(audioFrame.channelLayout, channelLayout);
        assert.notEqual(audioFrame.data, null);

        // Verify data was copied
        const outputBuffer = audioFrame.toBuffer();
        assert.ok(outputBuffer.length > 0);
      });

      it('should set optional properties', () => {
        const buffer = Buffer.alloc(960 * 2 * 4); // 960 samples, stereo, float32
        using audioFrame = Frame.fromAudioBuffer(buffer, {
          nbSamples: 960,
          format: AV_SAMPLE_FMT_FLT,
          sampleRate: 48000,
          channelLayout: AV_CHANNEL_LAYOUT_STEREO,
          timeBase: { num: 1, den: 48000 },
          pts: 100n,
        });

        assert.strictEqual(audioFrame.timeBase.num, 1);
        assert.strictEqual(audioFrame.timeBase.den, 48000);
        assert.strictEqual(audioFrame.pts, 100n);
      });

      it('should throw on invalid buffer size', () => {
        const tooSmallBuffer = Buffer.alloc(100);

        assert.throws(() => {
          Frame.fromAudioBuffer(tooSmallBuffer, {
            nbSamples: 960,
            format: AV_SAMPLE_FMT_FLT,
            sampleRate: 48000,
            channelLayout: AV_CHANNEL_LAYOUT_STEREO,
          });
        });
      });
    });
  });

  describe('data cache', () => {
    // The data/extendedData getters cache the JS plane array and drop it whenever
    // the frame's buffers may have changed. Cache hits are observable via identity.
    function allocVideoFrame(target: Frame): void {
      target.alloc();
      target.width = 64;
      target.height = 48;
      target.format = AV_PIX_FMT_YUV420P;
      assert.equal(target.getBuffer(), 0, 'Should allocate frame buffer');
    }

    it('returns the same array on repeated access', () => {
      allocVideoFrame(frame);
      const a = frame.data;
      assert.ok(a, 'frame has data');
      assert.strictEqual(frame.data, a, 'repeated data access serves the cached array');
      const ext = frame.extendedData;
      assert.ok(ext, 'frame has extended data');
      assert.strictEqual(frame.extendedData, ext, 'repeated extendedData access serves the cached array');
    });

    it('writes through the cached planes are visible on re-access', () => {
      allocVideoFrame(frame);
      const a = frame.data;
      assert.ok(a?.[0]);
      a[0][0] = 42;
      const b = frame.data;
      assert.ok(b?.[0]);
      assert.equal(b[0][0], 42, 'cached buffers view the same native memory');
    });

    it('invalidates when the buffers change (unref + getBuffer)', () => {
      allocVideoFrame(frame);
      const a = frame.data;
      assert.ok(a);
      frame.unref();
      assert.equal(frame.data, null, 'no data after unref');
      frame.width = 64;
      frame.height = 48;
      frame.format = AV_PIX_FMT_YUV420P;
      assert.equal(frame.getBuffer(), 0);
      const b = frame.data;
      assert.ok(b);
      assert.notStrictEqual(b, a, 'new buffers produce a new plane array');
    });

    it('invalidates when ref() re-points the planes', () => {
      allocVideoFrame(frame);
      const a = frame.data;
      assert.ok(a);

      using other = new Frame();
      allocVideoFrame(other);

      frame.unref();
      assert.equal(frame.ref(other), 0, 'Should ref the other frame');
      const b = frame.data;
      assert.ok(b);
      assert.notStrictEqual(b, a, 'ref() drops the cached planes');
    });

    it('invalidates on applyCropping and fromBuffer', () => {
      allocVideoFrame(frame);
      const a = frame.data;
      assert.ok(a);
      // av_frame_apply_cropping can shift the data pointers without changing buf[],
      // so the cache must be dropped even for a zero crop.
      assert.equal(frame.applyCropping(1), 0);
      const b = frame.data;
      assert.notStrictEqual(b, a, 'applyCropping drops the cached planes');

      using rgb = new Frame();
      rgb.alloc();
      rgb.width = 64;
      rgb.height = 48;
      rgb.format = AV_PIX_FMT_RGB24;
      assert.equal(rgb.getBuffer(), 0);
      const c = rgb.data;
      assert.ok(c);
      const raw = Buffer.alloc(64 * 48 * 3, 7);
      assert.ok(rgb.fromBuffer(raw) >= 0, 'fromBuffer succeeds');
      const d = rgb.data;
      assert.notStrictEqual(d, c, 'fromBuffer re-points the planes and drops the cache');
    });

    it('hands out fresh planes after each native fill (receiveFrame)', async () => {
      // Critical invalidation path: avcodec_receive_frame refills the SAME reused
      // frame object - the cache must never hand out the previous frame's views.
      await using fmt = new FormatContext();
      await fmt.openInput(getInputFile('demux.mp4'), null, null);
      await fmt.findStreamInfo(null);
      const vIdx = fmt.findBestStream(AVMEDIA_TYPE_VIDEO, -1, -1);
      assert.ok(vIdx >= 0, 'found a video stream');
      const stream = fmt.streams[vIdx];
      const dec = Codec.findDecoder(stream.codecpar.codecId);
      assert.ok(dec, 'found a decoder');

      using codecContext = new CodecContext();
      codecContext.allocContext3(dec);
      codecContext.parametersToContext(stream.codecpar);
      await codecContext.open2(dec, null);

      using packet = new Packet();
      packet.alloc();
      using decoded = new Frame();
      decoded.alloc();

      let prev: Buffer[] | null = null;
      let frames = 0;
      for (let i = 0; i < 200 && frames < 2; i++) {
        if ((await fmt.readFrame(packet)) < 0) break;
        if (packet.streamIndex !== vIdx) {
          packet.unref();
          continue;
        }
        if ((await codecContext.sendPacket(packet)) < 0) {
          packet.unref();
          continue;
        }
        packet.unref();

        while (frames < 2) {
          const ret = await codecContext.receiveFrame(decoded);
          if (ret < 0) break;
          const data = decoded.data;
          assert.ok(data, 'decoded frame has data');
          assert.strictEqual(decoded.data, data, 'repeated access within one frame is cached');
          if (prev) {
            assert.notStrictEqual(data, prev, 'each native fill drops the previous cache');
          }
          prev = data;
          frames++;
        }
      }
      assert.equal(frames, 2, 'decoded two frames');
    });
  });
});
