import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AV_PIX_FMT_YUV420P, AVCOL_RANGE_JPEG, Decoder, Demuxer, HardwareContext, Scaler } from '../src/index.js';
import { Frame, Rational } from '../src/lib/index.js';
import { getInputFile, prepareTestEnvironment, skipInCI } from './index.js';

prepareTestEnvironment();

const inputFile = getInputFile('demux.mp4');

// Create a full-range yuv420p frame with the Y plane split vertically:
// left half `leftY`, right half `rightY` (neutral chroma).
function halfFrame(width: number, height: number, leftY: number, rightY: number): Frame {
  const frame = new Frame();
  frame.alloc();
  frame.width = width;
  frame.height = height;
  frame.format = AV_PIX_FMT_YUV420P;
  frame.colorRange = AVCOL_RANGE_JPEG;
  frame.pts = 0n;
  frame.timeBase = new Rational(1, 25);
  frame.getBuffer();

  const planes = frame.data!;
  const linesize = frame.linesize[0];
  const half = width >> 1;
  for (let row = 0; row < height; row++) {
    planes[0].fill(leftY, row * linesize, row * linesize + half);
    planes[0].fill(rightY, row * linesize + half, row * linesize + width);
  }
  planes[1].fill(128);
  planes[2].fill(128);
  return frame;
}

// Create a full-range yuv420p frame filled with a single luma value.
function solidFrame(width: number, height: number, y: number): Frame {
  return halfFrame(width, height, y, y);
}

// Decode a JPEG buffer and return its dimensions and mean luma.
async function decodeJpeg(jpeg: Buffer): Promise<{ mean: number; width: number; height: number }> {
  const input = await Demuxer.open(jpeg);
  const video = input.video();
  assert.ok(video, 'No video stream in JPEG');
  const decoder = await Decoder.create(video);
  try {
    for await (const packet of input.packets(video.index)) {
      for await (const frame of decoder.frames(packet)) {
        if (frame) {
          const width = frame.width;
          const height = frame.height;
          const linesize = frame.linesize[0];
          const yPlane = frame.data![0];
          let sum = 0;
          for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
              sum += yPlane[row * linesize + col];
            }
          }
          frame.free();
          return { mean: sum / (width * height), width, height };
        }
      }
    }
    throw new Error('No frame decoded from JPEG');
  } finally {
    decoder.close();
    await input.close();
  }
}

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

    it('encodes hardware frames to JPEG (GPU scale + download)', skipInCI, async () => {
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

  describe('concurrency', () => {
    it('keeps concurrent scales on one cached graph from mixing up outputs', async () => {
      using scaler = new Scaler();
      // Same source dims + same output config -> all eight calls share one cached
      // graph and one pooled encoder; each output must still match its own input.
      const lumas = Array.from({ length: 8 }, (_, i) => 40 + i * 25);
      const frames = lumas.map((y) => solidFrame(640, 480, y));
      try {
        const jpegs = await Promise.all(frames.map(async (frame) => await scaler.toJpeg(frame, { resize: { width: 320, height: 240 } })));

        for (let i = 0; i < jpegs.length; i++) {
          const { mean, width, height } = await decodeJpeg(jpegs[i]);
          assert.strictEqual(width, 320);
          assert.strictEqual(height, 240);
          assert.ok(Math.abs(mean - lumas[i]) <= 3, `output ${i}: mean luma ${mean} should match input luma ${lumas[i]}`);
        }
      } finally {
        for (const frame of frames) {
          frame.free();
        }
      }
    });

    it('survives concurrent scales under cache pressure (maxCacheSize 1)', async () => {
      using scaler = new Scaler({ maxCacheSize: 1 });
      // Four distinct output sizes on a cache of one: every call evicts another
      // call's graph (and pooled encoder) while it may still be in flight.
      const sizes = [
        { width: 320, height: 240 },
        { width: 160, height: 120 },
        { width: 200, height: 150 },
        { width: 128, height: 96 },
      ];
      const jobs = Array.from({ length: 16 }, (_, i) => ({ size: sizes[i % sizes.length], luma: 30 + i * 12 }));
      const frames = jobs.map((job) => solidFrame(640, 480, job.luma));
      try {
        const jpegs = await Promise.all(frames.map(async (frame, i) => await scaler.toJpeg(frame, { resize: jobs[i].size })));

        for (let i = 0; i < jpegs.length; i++) {
          const { mean, width, height } = await decodeJpeg(jpegs[i]);
          assert.strictEqual(width, jobs[i].size.width, `output ${i} width`);
          assert.strictEqual(height, jobs[i].size.height, `output ${i} height`);
          assert.ok(Math.abs(mean - jobs[i].luma) <= 3, `output ${i}: mean luma ${mean} should match input luma ${jobs[i].luma}`);
        }
      } finally {
        for (const frame of frames) {
          frame.free();
        }
      }
    });

    it('a sync call while an async call is in flight corrupts neither', async () => {
      using scaler = new Scaler();
      using a = solidFrame(640, 480, 60);
      using b = solidFrame(640, 480, 180);

      // The async call has already claimed the cached graph when the sync call
      // lands; the sync call must detour around it instead of interleaving.
      const pending = scaler.toJpeg(a, { resize: { width: 320, height: 240 } });
      const syncJpeg = scaler.toJpegSync(b, { resize: { width: 320, height: 240 } });
      const asyncJpeg = await pending;

      const asyncResult = await decodeJpeg(asyncJpeg);
      const syncResult = await decodeJpeg(syncJpeg);
      assert.ok(Math.abs(asyncResult.mean - 60) <= 3, `async output mean ${asyncResult.mean} should be ~60`);
      assert.ok(Math.abs(syncResult.mean - 180) <= 3, `sync output mean ${syncResult.mean} should be ~180`);
    });
  });

  describe('crop across source changes', () => {
    it('applies the current crop after a source dimension change rebuilds the graph', async () => {
      using scaler = new Scaler();
      // Left half dark (50), right half bright (200) - the decoded mean tells us
      // which region was actually cropped.
      using small = halfFrame(640, 480, 50, 200);
      using large = halfFrame(960, 720, 50, 200);
      const resize = { width: 160, height: 120 };

      // Establish the graph; this first crop is baked into the graph description.
      const first = await scaler.toJpeg(small, { crop: { x: 320, y: 0, width: 320, height: 480 }, resize });
      assert.ok(Math.abs((await decodeJpeg(first)).mean - 200) <= 3, 'first crop should isolate the bright right half');

      // Re-aim to the left half via runtime command.
      const second = await scaler.toJpeg(small, { crop: { x: 0, y: 0, width: 320, height: 480 }, resize });
      assert.ok(Math.abs((await decodeJpeg(second)).mean - 50) <= 3, 'second crop should isolate the dark left half');

      // Source dimensions change (camera renegotiation): the rebuilt graph must
      // use THIS crop, not the one baked in at build time.
      const third = await scaler.toJpeg(large, { crop: { x: 480, y: 0, width: 480, height: 720 }, resize });
      assert.ok(Math.abs((await decodeJpeg(third)).mean - 200) <= 3, 'crop after source change should isolate the bright right half');

      // And a different crop on the new source still works.
      const fourth = await scaler.toJpeg(large, { crop: { x: 0, y: 0, width: 480, height: 720 }, resize });
      assert.ok(Math.abs((await decodeJpeg(fourth)).mean - 50) <= 3, 'subsequent crop on the new source should isolate the dark left half');
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
    it('processes hardware frames on the GPU (with hardware context)', skipInCI, async () => {
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

    it('downloads hardware frames when no hardware context is given (fallback)', skipInCI, async () => {
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
