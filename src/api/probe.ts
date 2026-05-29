import { AVMEDIA_TYPE_ATTACHMENT, AVMEDIA_TYPE_AUDIO, AVMEDIA_TYPE_DATA, AVMEDIA_TYPE_SUBTITLE, AVMEDIA_TYPE_VIDEO } from '../constants/constants.js';
import { Codec } from '../lib/codec.js';
import { avGetPixFmtName, avGetSampleFmtName } from '../lib/utilities.js';
import { Demuxer } from './demuxer.js';

import type { AVCodecID, AVPixelFormat, AVSampleFormat, DemuxerFormat } from '../constants/index.js';
import type { Stream } from '../lib/stream.js';
import type { DemuxerOptions } from './demuxer.js';

/**
 * Stream type as a readable string.
 */
export type ProbeStreamType = 'video' | 'audio' | 'subtitle' | 'data' | 'attachment' | 'unknown';

/**
 * Structured information about a single media stream.
 */
export interface ProbeStream {
  /** Stream index within the container. */
  index: number;
  /** Stream type. */
  type: ProbeStreamType;
  /** Codec short name (e.g. `'h264'`), or `'unknown'`. */
  codec: string;
  /** Codec long name (e.g. `'H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10'`). */
  codecLongName: string;
  /** Raw `AVCodecID`. */
  codecId: AVCodecID;
  /** Stream bitrate in bits per second, or 0 if unknown. */
  bitrate: number;
  /** Stream-level metadata tags. */
  metadata: Record<string, string>;
  /** Language tag (from metadata), if present. */
  language?: string;
  /** True if this stream is marked as default. */
  default: boolean;

  // Video-only
  /** Video width in pixels. */
  width?: number;
  /** Video height in pixels. */
  height?: number;
  /** Pixel format name (e.g. `'yuv420p'`). */
  pixelFormat?: string;
  /** Average frame rate in frames per second. */
  frameRate?: number;
  /** Sample aspect ratio. */
  sampleAspectRatio?: { num: number; den: number };

  // Audio-only
  /** Audio sample rate in Hz. */
  sampleRate?: number;
  /** Number of audio channels. */
  channels?: number;
  /** Sample format name (e.g. `'fltp'`). */
  sampleFormat?: string;
}

/**
 * Structured result of {@link probe}.
 */
export interface ProbeResult {
  /** Container format short name (e.g. `'mov,mp4,m4a,3gp,3g2,mj2'`). */
  format: string;
  /** Container format long name (e.g. `'QuickTime / MOV'`). */
  formatLongName: string;
  /** Total duration in seconds, or 0 if unknown. */
  duration: number;
  /** Start time in seconds, or 0 if unknown. */
  startTime: number;
  /** Overall bitrate in bits per second, or 0 if unknown. */
  bitrate: number;
  /** Number of streams. */
  nbStreams: number;
  /** All streams in container order. */
  streams: ProbeStream[];
  /** Container-level metadata tags. */
  metadata: Record<string, string>;
  /** First video stream, if any (convenience). */
  video?: ProbeStream;
  /** First audio stream, if any (convenience). */
  audio?: ProbeStream;
}

/**
 * Options for {@link probe} and {@link probeSync}.
 *
 * Same shape as {@link DemuxerOptions}: when `format` is a known literal, the
 * `options` bag is typed to that demuxer's options.
 */
export type ProbeOptions<F extends DemuxerFormat | (string & {}) = DemuxerFormat | (string & {})> = DemuxerOptions<F>;

/**
 * Map an `AVMediaType` to a readable stream type.
 *
 * @param codecType - The `AVMediaType` value
 *
 * @returns Readable stream type
 *
 * @internal
 */
function mediaTypeToString(codecType: number): ProbeStreamType {
  switch (codecType) {
    case AVMEDIA_TYPE_VIDEO:
      return 'video';
    case AVMEDIA_TYPE_AUDIO:
      return 'audio';
    case AVMEDIA_TYPE_SUBTITLE:
      return 'subtitle';
    case AVMEDIA_TYPE_DATA:
      return 'data';
    case AVMEDIA_TYPE_ATTACHMENT:
      return 'attachment';
    default:
      return 'unknown';
  }
}

/**
 * Build a {@link ProbeStream} from a low-level stream.
 *
 * @param stream - The low-level stream to summarize
 *
 * @returns Structured stream info
 *
 * @internal
 */
function buildProbeStream(stream: Stream): ProbeStream {
  const par = stream.codecpar;
  const type = mediaTypeToString(par.codecType);
  const codec = Codec.findDecoder(par.codecId);
  const metadata = stream.metadata?.getAll() ?? {};

  const info: ProbeStream = {
    index: stream.index,
    type,
    codec: codec?.name ?? 'unknown',
    codecLongName: codec?.longName ?? '',
    codecId: par.codecId,
    bitrate: par.bitRate > 0n ? Number(par.bitRate) : 0,
    metadata,
    language: metadata.language,
    default: (stream.disposition & 0x0001) !== 0,
  };

  if (type === 'video') {
    info.width = par.width;
    info.height = par.height;
    info.pixelFormat = avGetPixFmtName(par.format as AVPixelFormat) ?? undefined;
    const fr = stream.avgFrameRate;
    info.frameRate = fr && fr.den > 0 ? fr.num / fr.den : 0;
    const sar = par.sampleAspectRatio;
    if (sar && sar.num > 0 && sar.den > 0) {
      info.sampleAspectRatio = { num: sar.num, den: sar.den };
    }
  } else if (type === 'audio') {
    info.sampleRate = par.sampleRate;
    info.channels = par.channels;
    info.sampleFormat = avGetSampleFmtName(par.format as AVSampleFormat) ?? undefined;
  }

  return info;
}

/**
 * Build the full {@link ProbeResult} from an open demuxer.
 *
 * @param demuxer - An open demuxer with stream info read
 *
 * @returns Structured probe result
 *
 * @internal
 */
function buildProbeResult(demuxer: Demuxer): ProbeResult {
  const streams = demuxer.streams.map(buildProbeStream);

  return {
    format: demuxer.formatName,
    formatLongName: demuxer.formatLongName,
    duration: demuxer.duration,
    startTime: demuxer.startTime,
    bitrate: Math.round(demuxer.bitRate * 1000),
    nbStreams: streams.length,
    streams,
    metadata: demuxer.metadata,
    video: streams.find((s) => s.type === 'video'),
    audio: streams.find((s) => s.type === 'audio'),
  };
}

/**
 * Probe a media source and return structured metadata.
 *
 * Opens the input, reads stream information, builds a typed summary, and closes
 * the input again. Equivalent to `ffprobe -show_format -show_streams`, but as a
 * plain object.
 *
 * @param input - Media source: a file path/URL or an in-memory buffer
 *
 * @param options - Optional format hint and demuxer options
 *
 * @returns Structured probe result
 *
 * @throws {FFmpegError} If the input cannot be opened or has no stream info
 *
 * @example
 * ```typescript
 * const info = await probe('input.mkv');
 * if (info.video) {
 *   console.log(`${info.video.codec} ${info.video.width}x${info.video.height} @ ${info.video.frameRate}fps`);
 * }
 * ```
 *
 * @see {@link probeSync} For the synchronous version
 * @see {@link Demuxer} For full streaming access
 */
// eslint-disable-next-line space-before-function-paren
export async function probe<const F extends DemuxerFormat | (string & {}) = DemuxerFormat | (string & {})>(
  input: string | Buffer,
  options?: ProbeOptions<F>,
): Promise<ProbeResult> {
  await using demuxer = await Demuxer.open(input, options);
  return buildProbeResult(demuxer);
}

/**
 * Probe a media source and return structured metadata synchronously.
 * Synchronous version of {@link probe}.
 *
 * @param input - Media source: a file path/URL or an in-memory buffer
 *
 * @param options - Optional format hint and demuxer options
 *
 * @returns Structured probe result
 *
 * @throws {FFmpegError} If the input cannot be opened or has no stream info
 *
 * @example
 * ```typescript
 * const info = probeSync('input.mkv');
 * console.log(info.duration, info.streams.length);
 * ```
 *
 * @see {@link probe} For the asynchronous version
 */
// eslint-disable-next-line space-before-function-paren
export function probeSync<const F extends DemuxerFormat | (string & {}) = DemuxerFormat | (string & {})>(input: string | Buffer, options?: ProbeOptions<F>): ProbeResult {
  using demuxer = Demuxer.openSync(input, options);
  return buildProbeResult(demuxer);
}
