import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_PIX_FMT_RGB24,
  AV_PIX_FMT_YUV420P,
  AV_PIX_FMT_YUV422P,
  AV_PIX_FMT_YUV444P,
  AV_SAMPLE_FMT_DBL,
  AV_SAMPLE_FMT_FLT,
  AV_SAMPLE_FMT_FLTP,
  AV_SAMPLE_FMT_S16,
  AV_SAMPLE_FMT_S32,
} from '../src/index.js';
import { avChannelLayoutDefault } from '../src/lib/index.js';
import { pickSupportedLayout, pickSupportedPixelFormat, pickSupportedRate, pickSupportedSampleFormat } from '../src/api/utilities/codec-format.js';

describe('codec-format negotiation helpers', () => {
  describe('pickSupportedRate', () => {
    it('keeps the input rate when the codec accepts it', () => {
      assert.equal(pickSupportedRate(48000, [44100, 48000]), 48000);
    });

    it('picks the numerically nearest rate otherwise', () => {
      assert.equal(pickSupportedRate(96000, [44100, 48000]), 48000);
      assert.equal(pickSupportedRate(8000, [44100, 48000]), 44100);
    });

    it('passes through when the codec is unrestricted', () => {
      assert.equal(pickSupportedRate(48000, null), 48000);
    });
  });

  describe('pickSupportedSampleFormat', () => {
    it('keeps the input format when the codec accepts it', () => {
      assert.equal(pickSupportedSampleFormat(AV_SAMPLE_FMT_FLTP, [AV_SAMPLE_FMT_S16, AV_SAMPLE_FMT_FLTP]), AV_SAMPLE_FMT_FLTP);
    });

    it('prefers a format that preserves the input bit depth over a lossy first one', () => {
      // Input s32 (4 bytes) into [s16 (2), fltp (4)]: naive [0] would pick s16 and
      // drop precision; the helper picks fltp because it meets the input depth.
      assert.equal(pickSupportedSampleFormat(AV_SAMPLE_FMT_S32, [AV_SAMPLE_FMT_S16, AV_SAMPLE_FMT_FLTP]), AV_SAMPLE_FMT_FLTP);
    });

    it('falls back to the highest-precision format when none reach the input depth', () => {
      // Input dbl (8 bytes) into [s16 (2), flt (4)]: none reach 8, so pick the deepest.
      assert.equal(pickSupportedSampleFormat(AV_SAMPLE_FMT_DBL, [AV_SAMPLE_FMT_S16, AV_SAMPLE_FMT_FLT]), AV_SAMPLE_FMT_FLT);
    });

    it('passes through when the codec is unrestricted', () => {
      assert.equal(pickSupportedSampleFormat(AV_SAMPLE_FMT_S16, null), AV_SAMPLE_FMT_S16);
    });
  });

  describe('pickSupportedLayout', () => {
    it('keeps the input layout when the codec accepts its channel count', () => {
      const stereo = avChannelLayoutDefault(2);
      const picked = pickSupportedLayout(stereo, [avChannelLayoutDefault(1), avChannelLayoutDefault(2)]);
      assert.equal(picked.nbChannels, 2);
    });

    it('picks the nearest channel count rather than the first when unsupported', () => {
      // Input 7.1 (8ch) into [stereo (2), 5.1 (6)]: nearest count is 6, not the first (2).
      const picked = pickSupportedLayout(avChannelLayoutDefault(8), [avChannelLayoutDefault(2), avChannelLayoutDefault(6)]);
      assert.equal(picked.nbChannels, 6);
    });

    it('passes through when the codec is unrestricted', () => {
      const mono = avChannelLayoutDefault(1);
      assert.equal(pickSupportedLayout(mono, null).nbChannels, 1);
    });
  });

  describe('pickSupportedPixelFormat', () => {
    it('keeps the input format when the codec accepts it', () => {
      assert.equal(pickSupportedPixelFormat(AV_PIX_FMT_YUV420P, [AV_PIX_FMT_YUV420P, AV_PIX_FMT_YUV444P]), AV_PIX_FMT_YUV420P);
    });

    it('picks the least-loss format otherwise (rgb24 -> yuv444p)', () => {
      assert.equal(pickSupportedPixelFormat(AV_PIX_FMT_RGB24, [AV_PIX_FMT_YUV420P, AV_PIX_FMT_YUV422P, AV_PIX_FMT_YUV444P]), AV_PIX_FMT_YUV444P);
    });

    it('passes through when the codec is unrestricted', () => {
      assert.equal(pickSupportedPixelFormat(AV_PIX_FMT_YUV420P, null), AV_PIX_FMT_YUV420P);
    });
  });
});
