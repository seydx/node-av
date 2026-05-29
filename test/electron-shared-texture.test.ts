import assert from 'node:assert';
import { describe, it } from 'node:test';

import { SharedTexture, mapColorSpace, resolveMappingSwFormat } from '../src/api/utilities/electron-shared-texture.js';
import {
  AVCOL_PRI_BT2020,
  AVCOL_PRI_BT709,
  AVCOL_PRI_UNSPECIFIED,
  AVCOL_RANGE_JPEG,
  AVCOL_RANGE_MPEG,
  AVCOL_SPC_RGB,
  AVCOL_SPC_UNSPECIFIED,
  AVCOL_TRC_ARIB_STD_B67,
  AVCOL_TRC_IEC61966_2_1,
  AVCOL_TRC_SMPTE2084,
  AVCOL_TRC_UNSPECIFIED,
  AV_PIX_FMT_BGRA,
  AV_PIX_FMT_NV12,
  Frame,
  HardwareContext,
  HardwareFramesContext,
} from '../src/index.js';
import { prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

describe('SharedTexture (Electron)', () => {
  // These run without any GPU/Electron runtime.
  describe('mapColorSpace', () => {
    it('falls back to BGRA/sRGB defaults when no color space is given', () => {
      const c = mapColorSpace(undefined);
      assert.strictEqual(c.colorRange, AVCOL_RANGE_JPEG);
      assert.strictEqual(c.colorPrimaries, AVCOL_PRI_BT709);
      assert.strictEqual(c.colorTrc, AVCOL_TRC_IEC61966_2_1);
      assert.strictEqual(c.colorSpace, AVCOL_SPC_RGB);
    });

    it('maps known SDR color strings to FFmpeg enums', () => {
      const c = mapColorSpace({ range: 'limited', primaries: 'bt709', transfer: 'srgb', matrix: 'rgb' });
      assert.strictEqual(c.colorRange, AVCOL_RANGE_MPEG);
      assert.strictEqual(c.colorPrimaries, AVCOL_PRI_BT709);
      assert.strictEqual(c.colorTrc, AVCOL_TRC_IEC61966_2_1);
      assert.strictEqual(c.colorSpace, AVCOL_SPC_RGB);
    });

    it('maps HDR transfer functions (PQ, HLG)', () => {
      assert.strictEqual(mapColorSpace({ transfer: 'pq' }).colorTrc, AVCOL_TRC_SMPTE2084);
      assert.strictEqual(mapColorSpace({ transfer: 'hlg' }).colorTrc, AVCOL_TRC_ARIB_STD_B67);
      assert.strictEqual(mapColorSpace({ primaries: 'bt2020' }).colorPrimaries, AVCOL_PRI_BT2020);
    });

    it('maps full range and unknown values to UNSPECIFIED', () => {
      const c = mapColorSpace({ range: 'full', primaries: 'bogus', transfer: 'bogus', matrix: 'bogus' });
      assert.strictEqual(c.colorRange, AVCOL_RANGE_JPEG);
      assert.strictEqual(c.colorPrimaries, AVCOL_PRI_UNSPECIFIED);
      assert.strictEqual(c.colorTrc, AVCOL_TRC_UNSPECIFIED);
      assert.strictEqual(c.colorSpace, AVCOL_SPC_UNSPECIFIED);
    });
  });

  describe('resolveMappingSwFormat', () => {
    it('uses the fallback for a bare frame without an hwframe context', () => {
      // Mirrors the Windows D3D11 / Linux DMA-BUF path: imported frames carry no
      // hw_frames_ctx, so the mapping software format must come from the fallback
      // (the layout used at import), never the frame's hardware wrapper format.
      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;

      assert.strictEqual(frame.hwFramesCtx, null, 'Bare frame should have no hwframe context');
      assert.strictEqual(resolveMappingSwFormat(frame, AV_PIX_FMT_BGRA), AV_PIX_FMT_BGRA);
      assert.strictEqual(resolveMappingSwFormat(frame, AV_PIX_FMT_NV12), AV_PIX_FMT_NV12);
    });

    it("prefers the frame's own hwframe context software format when present", () => {
      // Mirrors the macOS IOSurface path: the imported frame carries an
      // hw_frames_ctx whose sw_format is authoritative and overrides the fallback.
      const hw = HardwareContext.auto();
      if (!hw) {
        console.log('No hardware acceleration available - skipping hwframe-context branch');
        return;
      }

      try {
        const frames = new HardwareFramesContext();
        frames.alloc(hw.deviceContext);
        frames.format = hw.devicePixelFormat;
        frames.swFormat = AV_PIX_FMT_NV12;
        frames.width = 64;
        frames.height = 64;

        using frame = new Frame();
        frame.alloc();
        frame.width = 64;
        frame.height = 64;
        frame.hwFramesCtx = frames;

        // Fallback is BGRA, but the frame's own context says NV12 -> NV12 wins.
        assert.strictEqual(resolveMappingSwFormat(frame, AV_PIX_FMT_BGRA), AV_PIX_FMT_NV12);

        frames.free();
      } finally {
        hw.dispose();
      }
    });
  });

  describe('create() validation', () => {
    it('throws without a valid hardware context', () => {
      assert.throws(() => SharedTexture.create(null as never), /requires a valid/);
    });
  });

  describe('instance behavior', () => {
    it('exposes configured dimensions, disposes idempotently, and guards use after dispose', () => {
      const hw = HardwareContext.auto();
      if (!hw) {
        console.log('No hardware acceleration available - skipping instance behavior');
        return;
      }

      try {
        const texture = SharedTexture.create(hw, { width: 1280, height: 720, swFormat: AV_PIX_FMT_NV12 });
        assert.strictEqual(texture.width, 1280);
        assert.strictEqual(texture.height, 720);
        assert.strictEqual(texture.hardware, hw);

        // Empty handle (no ioSurface/ntHandle/nativePixmap) is rejected before any GPU work.
        assert.throws(() => texture.importHandle({}, { width: 64, height: 64 }), /no valid handle/);

        texture.dispose();
        texture.dispose(); // idempotent

        assert.throws(() => texture.importHandle({}, { width: 64, height: 64 }), /disposed/);
      } finally {
        hw.dispose();
      }
    });
  });
});
