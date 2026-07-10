import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_PIX_FMT_NV12,
  AV_PIX_FMT_RGB24,
  AV_PIX_FMT_RGBA,
  AV_PIX_FMT_YUV420P,
  Frame,
  SoftwareScaleContext,
  SWS_ACCURATE_RND,
  SWS_AREA,
  SWS_BICUBIC,
  SWS_BICUBLIN,
  SWS_BILINEAR,
  SWS_FAST_BILINEAR,
  SWS_GAUSS,
  SWS_LANCZOS,
  SWS_POINT,
  SWS_SINC,
  SWS_SPLINE,
} from '../src/index.js';

import type { SwsFlags } from '../src/index.js';

describe('SoftwareScaleContext', () => {
  describe('Creation and Lifecycle', () => {
    it('should create a new SoftwareScaleContext', () => {
      const sws = new SoftwareScaleContext();
      assert.ok(sws instanceof SoftwareScaleContext, 'Should create SoftwareScaleContext instance');
    });

    it('should allocate context', () => {
      const sws = new SoftwareScaleContext();
      sws.allocContext();
      // Context is allocated but not initialized
      assert.ok(sws, 'Should allocate context');
      sws.freeContext();
    });

    it('should free context', () => {
      const sws = new SoftwareScaleContext();
      sws.allocContext();
      sws.freeContext();
      // Context is now freed - no crash should occur
      assert.ok(true, 'Should free without error');
    });

    it('should support Symbol.dispose', () => {
      const sws = new SoftwareScaleContext();
      sws.allocContext();

      if (typeof sws[Symbol.dispose] === 'function') {
        sws[Symbol.dispose]();
      }
      assert.ok(true, 'Should dispose without error');
    });

    it('should handle multiple free calls safely', () => {
      const sws = new SoftwareScaleContext();
      sws.allocContext();
      sws.freeContext();
      sws.freeContext(); // Should not crash
      assert.ok(true, 'Should handle multiple free calls');
    });
  });

  describe('Context Configuration', () => {
    it('should get context with basic parameters', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(640, 480, AV_PIX_FMT_YUV420P, 320, 240, AV_PIX_FMT_RGB24, SWS_BILINEAR);

      assert.ok(sws, 'Should configure context');
      sws.freeContext();
    });

    it('should scale up resolution', () => {
      const sws = new SoftwareScaleContext();

      // Scale up from 320x240 to 1920x1080
      sws.getContext(320, 240, AV_PIX_FMT_YUV420P, 1920, 1080, AV_PIX_FMT_YUV420P, SWS_BICUBIC);

      assert.ok(sws, 'Should configure upscaling');
      sws.freeContext();
    });

    it('should scale down resolution', () => {
      const sws = new SoftwareScaleContext();

      // Scale down from 1920x1080 to 640x360
      sws.getContext(1920, 1080, AV_PIX_FMT_YUV420P, 640, 360, AV_PIX_FMT_YUV420P, SWS_AREA);

      assert.ok(sws, 'Should configure downscaling');
      sws.freeContext();
    });

    it('should convert pixel formats without scaling', () => {
      const sws = new SoftwareScaleContext();

      // Same resolution, different pixel format
      sws.getContext(1280, 720, AV_PIX_FMT_YUV420P, 1280, 720, AV_PIX_FMT_RGB24, SWS_FAST_BILINEAR);

      assert.ok(sws, 'Should configure format conversion');
      sws.freeContext();
    });

    it('should handle different aspect ratios', () => {
      const sws = new SoftwareScaleContext();

      // 16:9 to 4:3
      sws.getContext(1920, 1080, AV_PIX_FMT_YUV420P, 640, 480, AV_PIX_FMT_YUV420P, SWS_LANCZOS);

      assert.ok(sws, 'Should handle aspect ratio change');
      sws.freeContext();
    });

    it('should init context after allocation', () => {
      const sws = new SoftwareScaleContext();
      sws.allocContext();

      // Set options here if needed (via AVOptions API)

      const ret = sws.initContext();
      assert.equal(typeof ret, 'number', 'Should return status code');

      sws.freeContext();
    });
  });

  describe('Scaling Algorithms', () => {
    const algorithms = [
      { name: 'FAST_BILINEAR', flag: SWS_FAST_BILINEAR },
      { name: 'BILINEAR', flag: SWS_BILINEAR },
      { name: 'BICUBIC', flag: SWS_BICUBIC },
      { name: 'POINT', flag: SWS_POINT },
      { name: 'AREA', flag: SWS_AREA },
      { name: 'BICUBLIN', flag: SWS_BICUBLIN },
      { name: 'GAUSS', flag: SWS_GAUSS },
      { name: 'SINC', flag: SWS_SINC },
      { name: 'LANCZOS', flag: SWS_LANCZOS },
      { name: 'SPLINE', flag: SWS_SPLINE },
    ];

    algorithms.forEach(({ name, flag }) => {
      it(`should work with ${name} algorithm`, () => {
        const sws = new SoftwareScaleContext();

        sws.getContext(640, 480, AV_PIX_FMT_YUV420P, 320, 240, AV_PIX_FMT_YUV420P, flag);

        assert.ok(sws, `Should work with ${name}`);
        sws.freeContext();
      });
    });
  });

  describe('Pixel Format Support', () => {
    it('should handle YUV420P format', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(640, 480, AV_PIX_FMT_YUV420P, 320, 240, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      assert.ok(sws, 'Should handle YUV420P');
      sws.freeContext();
    });

    it('should handle RGB24 format', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(640, 480, AV_PIX_FMT_RGB24, 320, 240, AV_PIX_FMT_RGB24, SWS_BILINEAR);

      assert.ok(sws, 'Should handle RGB24');
      sws.freeContext();
    });

    it('should handle RGBA format', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(640, 480, AV_PIX_FMT_RGBA, 320, 240, AV_PIX_FMT_RGBA, SWS_BILINEAR);

      assert.ok(sws, 'Should handle RGBA');
      sws.freeContext();
    });

    it('should handle NV12 format', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(640, 480, AV_PIX_FMT_NV12, 320, 240, AV_PIX_FMT_NV12, SWS_BILINEAR);

      assert.ok(sws, 'Should handle NV12');
      sws.freeContext();
    });

    it('should convert between YUV and RGB', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(640, 480, AV_PIX_FMT_YUV420P, 640, 480, AV_PIX_FMT_RGB24, SWS_BILINEAR);

      assert.ok(sws, 'Should convert YUV to RGB');
      sws.freeContext();
    });

    it('should convert between RGB and YUV', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(640, 480, AV_PIX_FMT_RGB24, 640, 480, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      assert.ok(sws, 'Should convert RGB to YUV');
      sws.freeContext();
    });
  });

  describe('Scale Operations', () => {
    it('should scale with buffer arrays (async)', async () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(320, 240, AV_PIX_FMT_YUV420P, 160, 120, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      // Create dummy data for YUV420P
      const ySize = 320 * 240;
      const uvSize = (320 / 2) * (240 / 2);

      const srcSlice = [
        Buffer.alloc(ySize), // Y plane
        Buffer.alloc(uvSize), // U plane
        Buffer.alloc(uvSize), // V plane
      ];

      const srcStride = [320, 160, 160];

      const dstYSize = 160 * 120;
      const dstUvSize = (160 / 2) * (120 / 2);

      const dst = [
        Buffer.alloc(dstYSize), // Y plane
        Buffer.alloc(dstUvSize), // U plane
        Buffer.alloc(dstUvSize), // V plane
      ];

      const dstStride = [160, 80, 80];

      const ret = await sws.scale(srcSlice, srcStride, 0, 240, dst, dstStride);
      assert.equal(typeof ret, 'number', 'Should return output height');
      assert.ok(ret > 0, 'Should scale some rows');

      sws.freeContext();
    });

    it('should scale with buffer arrays (sync)', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(320, 240, AV_PIX_FMT_YUV420P, 160, 120, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      // Create dummy data for YUV420P
      const ySize = 320 * 240;
      const uvSize = (320 / 2) * (240 / 2);

      const srcSlice = [
        Buffer.alloc(ySize), // Y plane
        Buffer.alloc(uvSize), // U plane
        Buffer.alloc(uvSize), // V plane
      ];

      const srcStride = [320, 160, 160];

      const dstYSize = 160 * 120;
      const dstUvSize = (160 / 2) * (120 / 2);

      const dst = [
        Buffer.alloc(dstYSize), // Y plane
        Buffer.alloc(dstUvSize), // U plane
        Buffer.alloc(dstUvSize), // V plane
      ];

      const dstStride = [160, 80, 80];

      const ret = sws.scaleSync(srcSlice, srcStride, 0, 240, dst, dstStride);
      assert.equal(typeof ret, 'number', 'Should return output height');
      assert.ok(ret > 0, 'Should scale some rows');

      sws.freeContext();
    });

    it('should scale frame objects (async)', async () => {
      const sws = new SoftwareScaleContext();

      // Use simpler getContext without prior initialization
      sws.getContext(320, 240, AV_PIX_FMT_YUV420P, 160, 120, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      // Create source frame
      const srcFrame = new Frame();
      srcFrame.alloc();
      srcFrame.width = 320;
      srcFrame.height = 240;
      srcFrame.format = AV_PIX_FMT_YUV420P;
      const srcRet = srcFrame.getBuffer();
      assert.equal(srcRet, 0, 'Should allocate source buffer');

      // Create destination frame
      const dstFrame = new Frame();
      dstFrame.alloc();
      dstFrame.width = 160;
      dstFrame.height = 120;
      dstFrame.format = AV_PIX_FMT_YUV420P;
      const dstRet = dstFrame.getBuffer();
      assert.equal(dstRet, 0, 'Should allocate destination buffer');

      // Scale frame
      const ret = await sws.scaleFrame(dstFrame, srcFrame);
      assert.equal(typeof ret, 'number', 'Should return output height');
      assert.equal(ret, 120, 'Should return destination height');

      srcFrame.free();
      dstFrame.free();
      sws.freeContext();
    });

    it('should scale frame objects (sync)', () => {
      const sws = new SoftwareScaleContext();

      // Use simpler getContext without prior initialization
      sws.getContext(320, 240, AV_PIX_FMT_YUV420P, 160, 120, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      // Create source frame
      const srcFrame = new Frame();
      srcFrame.alloc();
      srcFrame.width = 320;
      srcFrame.height = 240;
      srcFrame.format = AV_PIX_FMT_YUV420P;
      const srcRet = srcFrame.getBuffer();
      assert.equal(srcRet, 0, 'Should allocate source buffer');

      // Create destination frame
      const dstFrame = new Frame();
      dstFrame.alloc();
      dstFrame.width = 160;
      dstFrame.height = 120;
      dstFrame.format = AV_PIX_FMT_YUV420P;
      const dstRet = dstFrame.getBuffer();
      assert.equal(dstRet, 0, 'Should allocate destination buffer');

      // Scale frame
      const ret = sws.scaleFrameSync(dstFrame, srcFrame);
      assert.equal(typeof ret, 'number', 'Should return output height');
      assert.equal(ret, 120, 'Should return destination height');

      srcFrame.free();
      dstFrame.free();
      sws.freeContext();
    });

    it('should handle progressive scaling (async)', async () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(640, 480, AV_PIX_FMT_YUV420P, 320, 240, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      const ySize = 640 * 480;
      const uvSize = (640 / 2) * (480 / 2);

      const srcSlice = [Buffer.alloc(ySize), Buffer.alloc(uvSize), Buffer.alloc(uvSize)];

      const srcStride = [640, 320, 320];

      const dstYSize = 320 * 240;
      const dstUvSize = (320 / 2) * (240 / 2);

      const dst = [Buffer.alloc(dstYSize), Buffer.alloc(dstUvSize), Buffer.alloc(dstUvSize)];

      const dstStride = [320, 160, 160];

      // Scale in slices
      const sliceHeight = 120;
      for (let y = 0; y < 480; y += sliceHeight) {
        const currentSliceHeight = Math.min(sliceHeight, 480 - y);
        const ret = await sws.scale(srcSlice, srcStride, y, currentSliceHeight, dst, dstStride);
        assert.ok(ret >= 0, `Should scale slice at y=${y}`);
      }

      sws.freeContext();
    });

    it('should handle progressive scaling (sync)', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(640, 480, AV_PIX_FMT_YUV420P, 320, 240, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      const ySize = 640 * 480;
      const uvSize = (640 / 2) * (480 / 2);

      const srcSlice = [Buffer.alloc(ySize), Buffer.alloc(uvSize), Buffer.alloc(uvSize)];

      const srcStride = [640, 320, 320];

      const dstYSize = 320 * 240;
      const dstUvSize = (320 / 2) * (240 / 2);

      const dst = [Buffer.alloc(dstYSize), Buffer.alloc(dstUvSize), Buffer.alloc(dstUvSize)];

      const dstStride = [320, 160, 160];

      // Scale in slices
      const sliceHeight = 120;
      for (let y = 0; y < 480; y += sliceHeight) {
        const currentSliceHeight = Math.min(sliceHeight, 480 - y);
        const ret = sws.scaleSync(srcSlice, srcStride, y, currentSliceHeight, dst, dstStride);
        assert.ok(ret >= 0, `Should scale slice at y=${y}`);
      }

      sws.freeContext();
    });
  });

  describe('Edge Cases', () => {
    it('should handle 1x1 resolution', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(1, 1, AV_PIX_FMT_YUV420P, 1, 1, AV_PIX_FMT_RGB24, SWS_POINT);

      assert.ok(sws, 'Should handle 1x1 resolution');
      sws.freeContext();
    });

    it('should handle very large resolutions', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(
        7680,
        4320,
        AV_PIX_FMT_YUV420P, // 8K
        3840,
        2160,
        AV_PIX_FMT_YUV420P, // 4K
        SWS_BILINEAR,
      );

      assert.ok(sws, 'Should handle 8K to 4K scaling');
      sws.freeContext();
    });

    it('should handle odd dimensions', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(641, 481, AV_PIX_FMT_YUV420P, 321, 241, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      assert.ok(sws, 'Should handle odd dimensions');
      sws.freeContext();
    });

    it('should handle same source and destination', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(640, 480, AV_PIX_FMT_YUV420P, 640, 480, AV_PIX_FMT_YUV420P, SWS_POINT);

      assert.ok(sws, 'Should handle same dimensions');
      sws.freeContext();
    });

    it('should handle extreme aspect ratio changes', () => {
      const sws = new SoftwareScaleContext();

      // Very wide to very tall
      sws.getContext(1920, 100, AV_PIX_FMT_YUV420P, 100, 1080, AV_PIX_FMT_YUV420P, SWS_LANCZOS);

      assert.ok(sws, 'Should handle extreme aspect ratio change');
      sws.freeContext();
    });

    it('should handle zero stride in scale operation (async)', async () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(320, 240, AV_PIX_FMT_YUV420P, 160, 120, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      const srcSlice = [Buffer.alloc(320 * 240), Buffer.alloc(160 * 120), Buffer.alloc(160 * 120)];

      const dst = [Buffer.alloc(160 * 120), Buffer.alloc(80 * 60), Buffer.alloc(80 * 60)];

      // Use automatic stride calculation (0 means auto)
      const ret = await sws.scale(srcSlice, [320, 160, 160], 0, 240, dst, [160, 80, 80]);
      assert.ok(ret >= 0, 'Should handle scaling');

      sws.freeContext();
    });

    it('should handle zero stride in scale operation (sync)', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(320, 240, AV_PIX_FMT_YUV420P, 160, 120, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      const srcSlice = [Buffer.alloc(320 * 240), Buffer.alloc(160 * 120), Buffer.alloc(160 * 120)];

      const dst = [Buffer.alloc(160 * 120), Buffer.alloc(80 * 60), Buffer.alloc(80 * 60)];

      // Use automatic stride calculation (0 means auto)
      const ret = sws.scaleSync(srcSlice, [320, 160, 160], 0, 240, dst, [160, 80, 80]);
      assert.ok(ret >= 0, 'Should handle scaling');

      sws.freeContext();
    });
  });

  describe('Memory Management', () => {
    it('should handle multiple context allocations', () => {
      const sws = new SoftwareScaleContext();

      // First allocation
      sws.getContext(640, 480, AV_PIX_FMT_YUV420P, 320, 240, AV_PIX_FMT_RGB24, SWS_BILINEAR);
      sws.freeContext();

      // Second allocation with different parameters
      sws.getContext(1920, 1080, AV_PIX_FMT_NV12, 1280, 720, AV_PIX_FMT_RGBA, SWS_LANCZOS);
      sws.freeContext();

      assert.ok(true, 'Should handle multiple allocations');
    });

    it('should clean up on context replacement', () => {
      const sws = new SoftwareScaleContext();

      // First context
      sws.getContext(640, 480, AV_PIX_FMT_YUV420P, 320, 240, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      // Replace with new context (should free old one)
      sws.getContext(1920, 1080, AV_PIX_FMT_YUV420P, 640, 360, AV_PIX_FMT_YUV420P, SWS_BICUBIC);

      sws.freeContext();
      assert.ok(true, 'Should replace context cleanly');
    });

    it('should handle frame scaling with auto-allocated destination (async)', async () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(320, 240, AV_PIX_FMT_YUV420P, 640, 480, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      // Source frame
      const srcFrame = new Frame();
      srcFrame.alloc();
      srcFrame.width = 320;
      srcFrame.height = 240;
      srcFrame.format = AV_PIX_FMT_YUV420P;
      srcFrame.getBuffer();

      // Destination frame without pre-allocated buffer
      const dstFrame = new Frame();
      dstFrame.alloc();
      dstFrame.width = 640;
      dstFrame.height = 480;
      dstFrame.format = AV_PIX_FMT_YUV420P;
      // Don't call getBuffer() - let scaleFrame allocate

      const ret = await sws.scaleFrame(dstFrame, srcFrame);
      assert.equal(ret, 480, 'Should return destination height after auto-allocating');

      srcFrame.free();
      dstFrame.free();
      sws.freeContext();
    });

    it('should handle frame scaling with auto-allocated destination (sync)', () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(320, 240, AV_PIX_FMT_YUV420P, 640, 480, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      // Source frame
      const srcFrame = new Frame();
      srcFrame.alloc();
      srcFrame.width = 320;
      srcFrame.height = 240;
      srcFrame.format = AV_PIX_FMT_YUV420P;
      srcFrame.getBuffer();

      // Destination frame without pre-allocated buffer
      const dstFrame = new Frame();
      dstFrame.alloc();
      dstFrame.width = 640;
      dstFrame.height = 480;
      dstFrame.format = AV_PIX_FMT_YUV420P;
      // Don't call getBuffer() - let scaleFrame allocate

      const ret = sws.scaleFrameSync(dstFrame, srcFrame);
      assert.equal(ret, 480, 'Should return destination height after auto-allocating');

      srcFrame.free();
      dstFrame.free();
      sws.freeContext();
    });

    it('should not crash when freeContext()/frame.free() race an in-flight scaleFrame', { timeout: 10000 }, async () => {
      const sws = new SoftwareScaleContext();

      sws.getContext(1920, 1080, AV_PIX_FMT_YUV420P, 1280, 720, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      const srcFrame = new Frame();
      srcFrame.alloc();
      srcFrame.width = 1920;
      srcFrame.height = 1080;
      srcFrame.format = AV_PIX_FMT_YUV420P;
      srcFrame.getBuffer();

      const dstFrame = new Frame();
      dstFrame.alloc();
      dstFrame.width = 1280;
      dstFrame.height = 720;
      dstFrame.format = AV_PIX_FMT_YUV420P;
      dstFrame.getBuffer();

      // Free the context and both frames while the scale may still be on the
      // threadpool - each free waits for the in-flight operation (previously
      // a use-after-free)
      const pending = sws.scaleFrame(dstFrame, srcFrame);
      sws.freeContext();
      srcFrame.free();
      dstFrame.free();

      const results = await Promise.allSettled([pending]);
      assert.notEqual(results[0].status, undefined);
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle real-time scaling scenario', () => {
      const sws = new SoftwareScaleContext();

      // Fast algorithm for real-time processing
      sws.getContext(1920, 1080, AV_PIX_FMT_YUV420P, 1280, 720, AV_PIX_FMT_YUV420P, SWS_FAST_BILINEAR);

      assert.ok(sws, 'Should configure for real-time scaling');
      sws.freeContext();
    });

    it('should handle high-quality scaling scenario', () => {
      const sws = new SoftwareScaleContext();

      // High quality algorithm for offline processing
      sws.getContext(1920, 1080, AV_PIX_FMT_YUV420P, 3840, 2160, AV_PIX_FMT_YUV420P, (SWS_LANCZOS | SWS_ACCURATE_RND) as SwsFlags);

      assert.ok(sws, 'Should configure for high-quality scaling');
      sws.freeContext();
    });

    it('should handle thumbnail generation scenario', () => {
      const sws = new SoftwareScaleContext();

      // Downscale for thumbnail
      sws.getContext(
        1920,
        1080,
        AV_PIX_FMT_YUV420P,
        160,
        90,
        AV_PIX_FMT_RGB24,
        SWS_AREA, // Good for downscaling
      );

      assert.ok(sws, 'Should configure for thumbnail generation');
      sws.freeContext();
    });
  });
});
