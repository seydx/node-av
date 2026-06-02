import { avcodecFindBestPixFmtOfList, avGetBytesPerSample, avSampleFmtIsPlanar } from '../../lib/utilities.js';

import type { AVPixelFormat, AVSampleFormat } from '../../constants/index.js';
import type { ChannelLayout } from '../../lib/types.js';

/**
 * Pick a codec-supported sample rate, keeping the input rate when accepted and
 * otherwise choosing the numerically nearest supported one.
 *
 * @param rate - Input sample rate in Hz
 *
 * @param supported - Codec's supported sample rates, or null when unrestricted
 *
 * @returns A sample rate the codec accepts
 *
 * @example
 * ```typescript
 * pickSupportedRate(48000, [44100, 48000]); // 48000 (kept)
 * pickSupportedRate(96000, [44100, 48000]); // 48000 (nearest supported)
 * pickSupportedRate(48000, null);           // 48000 (codec unrestricted)
 * ```
 */
export function pickSupportedRate(rate: number, supported: number[] | null): number {
  if (!supported || supported.length === 0 || supported.includes(rate)) {
    return rate;
  }
  return supported.reduce((best, r) => (Math.abs(r - rate) < Math.abs(best - rate) ? r : best), supported[0]);
}

/**
 * Pick a codec-supported sample format, keeping the input when accepted.
 *
 * When the input format is unsupported, prefers the lowest-precision supported
 * format that still meets the input's bit depth (so converting incurs no silent
 * precision loss); if none reach it, takes the highest-precision one available.
 * Ties break toward matching planar/packed layout. This improves on FFmpeg CLI's
 * naive "first supported format" fallback without any downside.
 *
 * @param fmt - Input sample format
 *
 * @param supported - Codec's supported sample formats, or null when unrestricted
 *
 * @returns A sample format the codec accepts
 *
 * @example
 * ```typescript
 * import { AV_SAMPLE_FMT_S32, AV_SAMPLE_FMT_S16, AV_SAMPLE_FMT_FLTP } from 'node-av/constants';
 *
 * // s32 input: prefer fltp (preserves bit depth) over the lossy s16 a naive pick would take
 * pickSupportedSampleFormat(AV_SAMPLE_FMT_S32, [AV_SAMPLE_FMT_S16, AV_SAMPLE_FMT_FLTP]); // fltp
 * ```
 */
export function pickSupportedSampleFormat(fmt: AVSampleFormat, supported: AVSampleFormat[] | null): AVSampleFormat {
  if (!supported || supported.length === 0 || supported.includes(fmt)) {
    return fmt;
  }
  const inBytes = avGetBytesPerSample(fmt);
  const inPlanar = avSampleFmtIsPlanar(fmt);
  // Reaching the input's bit depth dominates the score; among those the smallest
  // excess wins (and among formats that fall short, the highest depth). The planar
  // match is a final tie-break.
  const score = (cand: AVSampleFormat): number => {
    const bytes = avGetBytesPerSample(cand);
    const planar = avSampleFmtIsPlanar(cand) === inPlanar ? 1 : 0;
    return (bytes >= inBytes ? 1_000_000 - (bytes - inBytes) * 1000 : bytes * 1000) + planar;
  };
  return supported.reduce((best, cand) => (score(cand) > score(best) ? cand : best), supported[0]);
}

/**
 * Pick a codec-supported channel layout.
 *
 * Keeps the input layout when the codec accepts its channel count, otherwise picks
 * the supported layout with the nearest channel count (rather than blindly the
 * first), minimizing how much up/down-mixing the resampler must perform.
 *
 * @param layout - Input channel layout
 *
 * @param supported - Codec's supported channel layouts, or null when unrestricted
 *
 * @returns A channel layout the codec accepts
 *
 * @example
 * ```typescript
 * import { avChannelLayoutDefault } from 'node-av';
 *
 * // 7.1 (8ch) input into a codec supporting stereo + 5.1 -> nearest count is 5.1 (6ch)
 * const picked = pickSupportedLayout(avChannelLayoutDefault(8), [avChannelLayoutDefault(2), avChannelLayoutDefault(6)]);
 * console.log(picked.nbChannels); // 6
 * ```
 */
export function pickSupportedLayout(layout: ChannelLayout, supported: ChannelLayout[] | null): ChannelLayout {
  if (!supported || supported.length === 0 || supported.some((l) => l.nbChannels === layout.nbChannels)) {
    return layout;
  }
  return supported.reduce((best, l) => (Math.abs(l.nbChannels - layout.nbChannels) < Math.abs(best.nbChannels - layout.nbChannels) ? l : best), supported[0]);
}

/**
 * Pick a codec-supported pixel format, keeping the input when accepted and
 * otherwise the least-loss supported format (via `avcodec_find_best_pix_fmt_of_list`,
 * which weighs color depth, chroma subsampling, and alpha).
 *
 * @param fmt - Input pixel format
 *
 * @param supported - Codec's supported pixel formats, or null when unrestricted
 *
 * @returns A pixel format the codec accepts
 *
 * @example
 * ```typescript
 * import { AV_PIX_FMT_RGB24, AV_PIX_FMT_YUV420P, AV_PIX_FMT_YUV444P } from 'node-av/constants';
 *
 * // rgb24 into a codec's formats -> yuv444p (least chroma loss, not the first entry)
 * pickSupportedPixelFormat(AV_PIX_FMT_RGB24, [AV_PIX_FMT_YUV420P, AV_PIX_FMT_YUV444P]); // yuv444p
 * ```
 */
export function pickSupportedPixelFormat(fmt: AVPixelFormat, supported: AVPixelFormat[] | null): AVPixelFormat {
  if (!supported || supported.length === 0 || supported.includes(fmt)) {
    return fmt;
  }
  return avcodecFindBestPixFmtOfList(supported, fmt);
}
