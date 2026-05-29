import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Decoder, Demuxer, HardwareContext, Scaler } from '../src/index.js';
import { getInputFile, prepareTestEnvironment } from './index.js';

import type { Frame } from '../src/lib/index.js';

prepareTestEnvironment();

const inputFile = getInputFile('demux.mp4');

// Decode the first video frame from the test file.
async function firstFrame(hardware?: HardwareContext | null): Promise<{ frame: Frame; width: number; height: number; close: () => Promise<void> }> {
  const input = await Demuxer.open(inputFile);
  const video = input.video();
  assert.ok(video, 'No video stream');
  const decoder = await Decoder.create(video, hardware ? { hardware } : {});

  for await (const packet of input.packets(video.index)) {
    for await (const frame of decoder.frames(packet)) {
      if (frame) {
        const width = frame.width;
        const height = frame.height;
        return {
          frame,
          width,
          height,
          close: async () => {
            frame.free();
            decoder.close();
            await input.close();
          },
        };
      }
    }
  }
  decoder.close();
  await input.close();
  throw new Error('No frame decoded');
}

describe('Scaler', () => {
  describe('scale + convert', () => {
    it('produces correctly sized buffers for each output format', async () => {
      const { frame, close } = await firstFrame();
      using scaler = new Scaler();

      try {
        const rgb = await scaler.toBuffer(frame, { resize: { width: 640, height: 360 }, format: 'rgb' });
        assert.strictEqual(rgb.length, 640 * 360 * 3, 'rgb24 = w*h*3');

        const rgba = await scaler.toBuffer(frame, { resize: { width: 320, height: 180 }, format: 'rgba' });
        assert.strictEqual(rgba.length, 320 * 180 * 4, 'rgba = w*h*4');

        const gray = await scaler.toBuffer(frame, { resize: { width: 320, height: 180 }, format: 'gray' });
        assert.strictEqual(gray.length, 320 * 180, 'gray8 = w*h');

        const nv12 = await scaler.toBuffer(frame, { resize: { width: 320, height: 180 }, format: 'nv12' });
        assert.strictEqual(nv12.length, (320 * 180 * 3) / 2, 'nv12 = w*h*1.5');

        const yuv = await scaler.toBuffer(frame, { resize: { width: 160, height: 120 }, format: 'yuv420p' });
        assert.strictEqual(yuv.length, (160 * 120 * 3) / 2, 'yuv420p = w*h*1.5');
      } finally {
        await close();
      }
    });

    it('keeps source dimensions when no resize is given', async () => {
      const { frame, width, height, close } = await firstFrame();
      using scaler = new Scaler();
      try {
        const rgb = await scaler.toBuffer(frame, { format: 'rgb' });
        assert.strictEqual(rgb.length, width * height * 3);
      } finally {
        await close();
      }
    });

    it('the sync variant matches the async result', async () => {
      const { frame, close } = await firstFrame();
      using scaler = new Scaler();
      try {
        const asyncBuf = await scaler.toBuffer(frame, { resize: { width: 320, height: 180 }, format: 'rgb' });
        const syncBuf = scaler.toBufferSync(frame, { resize: { width: 320, height: 180 }, format: 'rgb' });
        assert.ok(asyncBuf.equals(syncBuf), 'sync and async buffers must be identical');
      } finally {
        await close();
      }
    });
  });

  describe('crop', () => {
    it('crops + scales to the requested size', async () => {
      const { frame, close } = await firstFrame();
      using scaler = new Scaler();
      try {
        const out = await scaler.toBuffer(frame, { crop: { x: 16, y: 16, width: 128, height: 96 }, resize: { width: 64, height: 48 }, format: 'rgb' });
        assert.strictEqual(out.length, 64 * 48 * 3);
      } finally {
        await close();
      }
    });

    it('crops without resize (output = crop size)', async () => {
      const { frame, close } = await firstFrame();
      using scaler = new Scaler();
      try {
        const out = await scaler.toBuffer(frame, { crop: { x: 0, y: 0, width: 64, height: 64 }, format: 'rgb' });
        assert.strictEqual(out.length, 64 * 64 * 3);
      } finally {
        await close();
      }
    });

    it('a top-left crop differs from a bottom-right crop (actually crops)', async () => {
      const { frame, width, height, close } = await firstFrame();
      using scaler = new Scaler();
      try {
        const cw = Math.min(64, width >> 1);
        const ch = Math.min(64, height >> 1);
        const tl = await scaler.toBuffer(frame, { crop: { x: 0, y: 0, width: cw, height: ch }, format: 'rgb' });
        const br = await scaler.toBuffer(frame, { crop: { x: width - cw, y: height - ch, width: cw, height: ch }, format: 'rgb' });
        assert.strictEqual(tl.length, br.length);
        assert.ok(!tl.equals(br), 'Different crop regions should yield different pixels');
      } finally {
        await close();
      }
    });

    it('rejects an out-of-bounds crop', async () => {
      const { frame, width, height, close } = await firstFrame();
      using scaler = new Scaler();
      try {
        await assert.rejects(scaler.toBuffer(frame, { crop: { x: width - 10, y: 0, width: 100, height: 10 } }), /crop/i);
        await assert.rejects(scaler.toBuffer(frame, { crop: { x: 0, y: 0, width: 10, height: height + 10 } }), /crop/i);
      } finally {
        await close();
      }
    });
  });

  describe('toJpeg / toPng', () => {
    it('encodes a valid JPEG and respects quality', async () => {
      const { frame, close } = await firstFrame();
      using scaler = new Scaler();
      try {
        const hi = await scaler.toJpeg(frame, { resize: { width: 320, height: 240 }, quality: 95 });
        const lo = await scaler.toJpeg(frame, { resize: { width: 320, height: 240 }, quality: 10 });

        // SOI + EOI markers
        assert.strictEqual(hi[0], 0xff);
        assert.strictEqual(hi[1], 0xd8);
        assert.strictEqual(hi[hi.length - 2], 0xff);
        assert.strictEqual(hi[hi.length - 1], 0xd9);

        // Higher quality => larger file. A single pooled encoder serves both.
        assert.ok(hi.length > lo.length, `q95 (${hi.length}) should exceed q10 (${lo.length})`);
      } finally {
        await close();
      }
    });

    it('encodes a cropped region to JPEG', async () => {
      const { frame, width, height, close } = await firstFrame();
      using scaler = new Scaler();
      try {
        const jpg = await scaler.toJpeg(frame, { crop: { x: 0, y: 0, width: width >> 1, height: height >> 1 }, resize: { width: 160, height: 120 } });
        assert.strictEqual(jpg[0], 0xff);
        assert.strictEqual(jpg[1], 0xd8);
        assert.ok(jpg.length > 0);
      } finally {
        await close();
      }
    });

    it('encodes a valid PNG (rgb and gray)', async () => {
      const { frame, close } = await firstFrame();
      using scaler = new Scaler();
      try {
        const rgb = await scaler.toPng(frame, { resize: { width: 200, height: 150 } });
        const gray = await scaler.toPng(frame, { resize: { width: 200, height: 150 }, format: 'gray' });
        // PNG signature
        for (const png of [rgb, gray]) {
          assert.deepStrictEqual([png[0], png[1], png[2], png[3]], [0x89, 0x50, 0x4e, 0x47]);
        }
        // Gray has one channel; for the same dimensions it should be smaller than rgb.
        assert.ok(gray.length < rgb.length, `gray (${gray.length}) should be smaller than rgb (${rgb.length})`);
      } finally {
        await close();
      }
    });

    it('the sync JPEG variant produces a valid image', async () => {
      const { frame, close } = await firstFrame();
      using scaler = new Scaler();
      try {
        const jpg = scaler.toJpegSync(frame, { resize: { width: 320, height: 240 }, quality: 80 });
        assert.strictEqual(jpg[0], 0xff);
        assert.strictEqual(jpg[1], 0xd8);
        assert.strictEqual(jpg[jpg.length - 1], 0xd9);
      } finally {
        await close();
      }
    });

    it('encodes hardware frames to JPEG (GPU scale + download)', async () => {
      const hw = HardwareContext.auto();
      if (!hw) {
        console.log('No hardware acceleration available - skipping HW toJpeg test');
        return;
      }
      try {
        const { frame, close } = await firstFrame(hw);
        using scaler = new Scaler({ hardware: hw });
        try {
          if (!frame.isHwFrame()) {
            return;
          }
          const jpg = await scaler.toJpeg(frame, { resize: { width: 320, height: 240 }, quality: 80 });
          assert.strictEqual(jpg[0], 0xff);
          assert.strictEqual(jpg[1], 0xd8);
          assert.strictEqual(jpg[jpg.length - 1], 0xd9);
        } finally {
          await close();
        }
      } finally {
        hw.dispose();
      }
    });
  });

  describe('lifecycle', () => {
    it('rejects after dispose', async () => {
      const { frame, close } = await firstFrame();
      const scaler = new Scaler();
      try {
        await scaler.toBuffer(frame, { format: 'rgb' });
        scaler.close();
        scaler.close(); // idempotent
        await assert.rejects(scaler.toBuffer(frame, { format: 'rgb' }), /disposed/);
      } finally {
        await close();
      }
    });
  });

  describe('hardware', () => {
    it('processes hardware frames on the GPU (with hardware context)', async () => {
      const hw = HardwareContext.auto();
      if (!hw) {
        console.log('No hardware acceleration available - skipping HW scaler test');
        return;
      }

      try {
        const { frame, width, height, close } = await firstFrame(hw);
        using scaler = new Scaler({ hardware: hw });
        try {
          if (!frame.isHwFrame()) {
            console.log('Decoder produced a software frame - skipping GPU-specific assertions');
            return;
          }
          // GPU scale + convert, download small result.
          const rgb = await scaler.toBuffer(frame, { resize: { width: 320, height: 180 }, format: 'rgb' });
          assert.strictEqual(rgb.length, 320 * 180 * 3);

          // GPU crop + scale, cached per config (reused on repeat).
          const cw = width >> 1;
          const ch = height >> 1;
          const a = await scaler.toBuffer(frame, { crop: { x: 0, y: 0, width: cw, height: ch }, resize: { width: 224, height: 224 }, format: 'rgb' });
          const a2 = await scaler.toBuffer(frame, { crop: { x: 0, y: 0, width: cw, height: ch }, resize: { width: 224, height: 224 }, format: 'rgb' });
          assert.strictEqual(a.length, 224 * 224 * 3);
          assert.ok(a.equals(a2), 'Cached GPU graph should be stable across identical calls');

          // Same output size, different crop regions: one shared graph reconfigured
          // per frame via sendCommand must yield different pixels.
          const tl = await scaler.toBuffer(frame, { crop: { x: 0, y: 0, width: cw, height: ch }, resize: { width: 128, height: 128 }, format: 'rgb' });
          const br = await scaler.toBuffer(frame, { crop: { x: width - cw, y: height - ch, width: cw, height: ch }, resize: { width: 128, height: 128 }, format: 'rgb' });
          assert.strictEqual(tl.length, br.length);
          assert.ok(!tl.equals(br), 'Different crops (via sendCommand on one graph) should yield different pixels');

          // Re-aiming back to the original crop must reproduce the original result.
          const tl2 = await scaler.toBuffer(frame, { crop: { x: 0, y: 0, width: cw, height: ch }, resize: { width: 128, height: 128 }, format: 'rgb' });
          assert.ok(tl.equals(tl2), 'Re-aiming the crop back must reproduce identical pixels');

          // Rejects an out-of-bounds crop on the hardware path too.
          await assert.rejects(scaler.toBuffer(frame, { crop: { x: width - 4, y: 0, width: 64, height: 16 } }), /crop/i);
        } finally {
          await close();
        }
      } finally {
        hw.dispose();
      }
    });

    it('downloads hardware frames when no hardware context is given (fallback)', async () => {
      const hw = HardwareContext.auto();
      if (!hw) {
        console.log('No hardware acceleration available - skipping HW fallback test');
        return;
      }

      try {
        const { frame, close } = await firstFrame(hw);
        using scaler = new Scaler(); // no hardware context -> download fallback
        try {
          if (!frame.isHwFrame()) {
            return;
          }
          const rgb = await scaler.toBuffer(frame, { resize: { width: 320, height: 180 }, format: 'rgb' });
          assert.strictEqual(rgb.length, 320 * 180 * 3);
        } finally {
          await close();
        }
      } finally {
        hw.dispose();
      }
    });
  });
});
