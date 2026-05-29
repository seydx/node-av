import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AVCOL_RANGE_JPEG, AV_PIX_FMT_YUV420P, EncoderPool, FF_ENCODER_MJPEG } from '../src/index.js';
import { Frame, Rational } from '../src/lib/index.js';

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
