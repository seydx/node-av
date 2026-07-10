import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AVCOL_RANGE_JPEG, AV_PIX_FMT_YUV420P, Decoder, Demuxer, EncoderPool, FF_ENCODER_MJPEG } from '../src/index.js';
import { Frame, Rational } from '../src/lib/index.js';

// Check for JPEG magic bytes: SOI (FFD8) at the start and EOI (FFD9) at the end.
function isJpeg(buf: Buffer): boolean {
  return buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
}

// Create an MJPEG-compatible test frame filled with a single luma value.
function createSolidFrame(width: number, height: number, y: number): Frame {
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
  planes[0].fill(y);
  planes[1].fill(128);
  planes[2].fill(128);
  return frame;
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

describe('EncoderPool', () => {
  describe('create', () => {
    it('should create an empty pool with default maxSize', () => {
      using pool = new EncoderPool(FF_ENCODER_MJPEG);
      assert.equal(pool.size, 0);
    });

    it('should throw for maxSize less than 1', () => {
      assert.throws(() => new EncoderPool(FF_ENCODER_MJPEG, { maxSize: 0 }), /maxSize must be at least 1/);
    });
  });

  describe('encode', () => {
    it('should encode a frame to JPEG (async)', async () => {
      using pool = new EncoderPool(FF_ENCODER_MJPEG);
      using frame = createMjpegFrame(320, 240);

      const jpeg = await pool.encode(frame);

      assert.ok(isJpeg(jpeg), 'should be a valid JPEG');
      assert.equal(pool.size, 1);
    });

    it('should encode a frame to JPEG (sync)', () => {
      using pool = new EncoderPool(FF_ENCODER_MJPEG);
      using frame = createMjpegFrame(320, 240);

      const jpeg = pool.encodeSync(frame);

      assert.ok(isJpeg(jpeg), 'should be a valid JPEG');
      assert.equal(pool.size, 1);
    });

    it('should reuse a single encoder across repeated frames of the same size (async)', async () => {
      using pool = new EncoderPool(FF_ENCODER_MJPEG);
      using frame = createMjpegFrame(320, 240);

      // Regression: a reused encoder requires monotonically increasing PTS. The pool
      // assigns it internally, so encoding the same (pts=0) frame repeatedly must work.
      for (let i = 0; i < 5; i++) {
        const jpeg = await pool.encode(frame);
        assert.ok(isJpeg(jpeg), `iteration ${i} should be a valid JPEG`);
      }

      assert.equal(pool.size, 1, 'the same size reuses one encoder');
    });

    it('should keep one encoder per distinct resolution (async)', async () => {
      using pool = new EncoderPool(FF_ENCODER_MJPEG);
      using a = createMjpegFrame(320, 240);
      using b = createMjpegFrame(160, 120);

      await pool.encode(a);
      await pool.encode(b);

      assert.equal(pool.size, 2);
    });

    it('should evict the least-recently-used encoder past maxSize (async)', async () => {
      using pool = new EncoderPool(FF_ENCODER_MJPEG, { maxSize: 2 });
      using a = createMjpegFrame(320, 240);
      using b = createMjpegFrame(160, 120);
      using c = createMjpegFrame(640, 480);

      await pool.encode(a); // [a]
      await pool.encode(b); // [a, b]
      await pool.encode(a); // touch a -> [b, a]
      await pool.encode(c); // exceeds maxSize -> evict LRU (b) -> [a, c]

      assert.equal(pool.size, 2);

      // b was evicted, so encoding it again creates a fresh encoder (and evicts a).
      const jpeg = await pool.encode(b);
      assert.ok(isJpeg(jpeg), 'should re-encode an evicted resolution');
      assert.equal(pool.size, 2);
    });

    it('should not mutate the input frame pts (async)', async () => {
      using pool = new EncoderPool(FF_ENCODER_MJPEG);
      using frame = createMjpegFrame(320, 240);
      frame.pts = 99n;

      await pool.encode(frame);

      assert.equal(frame.pts, 99n, 'frame pts should be preserved');
    });
  });

  describe('concurrency', () => {
    it('keeps concurrent encodes on the same key from mixing up outputs', async () => {
      using pool = new EncoderPool(FF_ENCODER_MJPEG);
      // Same dimensions -> all eight calls share one pooled encoder; each caller
      // must still get the packet for its own frame.
      const lumas = Array.from({ length: 8 }, (_, i) => 16 + i * 28);
      const frames = lumas.map((y) => createSolidFrame(320, 240, y));
      try {
        const jpegs = await Promise.all(frames.map(async (frame) => await pool.encode(frame)));

        assert.equal(pool.size, 1, 'the same size shares one encoder');
        for (let i = 0; i < jpegs.length; i++) {
          assert.ok(isJpeg(jpegs[i]), `output ${i} should be a valid JPEG`);
          const { mean, width, height } = await decodeJpeg(jpegs[i]);
          assert.equal(width, 320);
          assert.equal(height, 240);
          assert.ok(Math.abs(mean - lumas[i]) <= 3, `output ${i}: mean luma ${mean} should match input luma ${lumas[i]}`);
        }
      } finally {
        for (const frame of frames) {
          frame.free();
        }
      }
    });

    it('completes all in-flight encodes under eviction pressure (maxSize 1)', async () => {
      using pool = new EncoderPool(FF_ENCODER_MJPEG, { maxSize: 1 });
      // Four distinct sizes on a pool of one: every creation evicts an encoder
      // that may still have an encode in flight.
      const sizes = [
        { width: 320, height: 240 },
        { width: 160, height: 120 },
        { width: 640, height: 480 },
        { width: 128, height: 96 },
      ];
      const jobs = Array.from({ length: 8 }, (_, i) => ({ size: sizes[i % sizes.length], luma: 40 + i * 25 }));
      const frames = jobs.map((job) => createSolidFrame(job.size.width, job.size.height, job.luma));
      try {
        const jpegs = await Promise.all(frames.map(async (frame) => await pool.encode(frame)));

        assert.equal(pool.size, 1, 'the pool stays bounded');
        for (let i = 0; i < jpegs.length; i++) {
          assert.ok(isJpeg(jpegs[i]), `output ${i} should be a valid JPEG`);
          const { mean, width, height } = await decodeJpeg(jpegs[i]);
          assert.equal(width, jobs[i].size.width, `output ${i} width`);
          assert.equal(height, jobs[i].size.height, `output ${i} height`);
          assert.ok(Math.abs(mean - jobs[i].luma) <= 3, `output ${i}: mean luma ${mean} should match input luma ${jobs[i].luma}`);
        }
      } finally {
        for (const frame of frames) {
          frame.free();
        }
      }
    });

    it('close() with encodes in flight lets them complete', async () => {
      const pool = new EncoderPool(FF_ENCODER_MJPEG);
      using warm = createMjpegFrame(320, 240);
      await pool.encode(warm); // populate so the concurrent encodes hold the entry

      const frames = Array.from({ length: 4 }, (_, i) => createSolidFrame(320, 240, 50 + i * 40));
      try {
        const pending = frames.map(async (frame) => await pool.encode(frame));
        pool.close();

        const jpegs = await Promise.all(pending);
        assert.equal(pool.size, 0);
        for (const jpeg of jpegs) {
          assert.ok(isJpeg(jpeg), 'in-flight encode should still produce a valid JPEG');
        }
      } finally {
        for (const frame of frames) {
          frame.free();
        }
      }
    });
  });

  describe('dispose', () => {
    it('should close all encoders and clear the pool on close()', async () => {
      const pool = new EncoderPool(FF_ENCODER_MJPEG);
      using a = createMjpegFrame(320, 240);
      using b = createMjpegFrame(160, 120);

      await pool.encode(a);
      await pool.encode(b);
      assert.equal(pool.size, 2);

      pool.close();
      assert.equal(pool.size, 0);
    });
  });
});
