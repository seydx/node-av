import type { RtpPacket } from 'werift';
import type { AVMediaType, AVPixelFormat, AVSampleFormat, AVSeekWhence } from '../constants/index.js';
import type { IRational } from '../lib/types.js';
import type { Decoder } from './decoder.js';
import type { Demuxer } from './demuxer.js';
import type { FilterComplexAPI } from './filter-complex.js';
import type { FilterAPI } from './filter.js';
import type { HardwareContext } from './hardware.js';

/**
 * Base codec names supported across different hardware types.
 */
export type BaseCodecName =
  | 'av1' // AV1 codec (amf, mediacodec, nvenc, qsv, vaapi)
  | 'h264' // H.264/AVC (amf, mediacodec, nvenc, qsv, vaapi, v4l2m2m, mf, omx, rkmpp, videotoolbox, vulkan)
  | 'hevc' // H.265/HEVC (amf, mediacodec, nvenc, qsv, vaapi, v4l2m2m, mf, rkmpp, videotoolbox, d3d12va, vulkan)
  | 'h263' // H.263 (v4l2m2m)
  | 'mpeg2' // MPEG-2 (qsv, vaapi)
  | 'mpeg4' // MPEG-4 Part 2 (mediacodec, v4l2m2m, omx)
  | 'vp8' // VP8 (mediacodec, vaapi, v4l2m2m)
  | 'vp9' // VP9 (mediacodec, qsv, vaapi)
  | 'mjpeg' // Motion JPEG (qsv, vaapi, rkmpp, videotoolbox)
  | 'prores'; // ProRes (videotoolbox only)

/**
 * Raw video data configuration.
 *
 * Specifies parameters for opening raw video files like YUV.
 */
export interface VideoRawData {
  /**
   * Type discriminator for TypeScript.
   *
   * Must be set to 'video' to identify this as video raw data.
   */
  type: 'video';

  /**
   * Raw video input source.
   *
   * Can be a file path, Buffer containing raw video data, or custom I/O callbacks.
   */
  input: string | Buffer | IOInputCallbacks;

  /**
   * Video frame width in pixels.
   *
   * Must match the actual width of the raw video data.
   */
  width: number;

  /**
   * Video frame height in pixels.
   *
   * Must match the actual height of the raw video data.
   */
  height: number;

  /**
   * Pixel format of the raw video data.
   *
   * Specifies how pixel data is stored (e.g., YUV420P, NV12, RGB24).
   */
  pixelFormat: AVPixelFormat;

  /**
   * Frame rate of the raw video.
   *
   * Specified as a rational number (numerator/denominator).
   */
  frameRate: IRational;
}

/**
 * Raw audio data configuration.
 *
 * Specifies parameters for opening raw audio files like PCM.
 */
export interface AudioRawData {
  /**
   * Type discriminator for TypeScript.
   *
   * Must be set to 'audio' to identify this as audio raw data.
   */
  type: 'audio';

  /**
   * Raw audio input source.
   *
   * Can be a file path, Buffer containing raw audio data, or custom I/O callbacks.
   */
  input: string | Buffer | IOInputCallbacks;

  /**
   * Sample rate in Hz.
   *
   * Number of audio samples per second (e.g., 44100, 48000).
   */
  sampleRate: number;

  /**
   * Number of audio channels.
   *
   * Typical values: 1 (mono), 2 (stereo), 6 (5.1 surround).
   */
  channels: number;

  /**
   * Sample format of the raw audio data.
   *
   * Specifies how audio samples are stored (e.g., S16, FLT, S32).
   */
  sampleFormat: AVSampleFormat;
}

export type RawData = VideoRawData | AudioRawData;

/**
 * Options for Demuxer opening.
 *
 * Configures how media files are opened and packets are read.
 * Supports format detection, buffering, and FFmpeg options.
 */
export interface DemuxerOptions {
  /**
   * Buffer size for reading/writing operations.
   *
   * This option allows you to specify the buffer size used for I/O operations.
   *
   * @default 65536
   *
   */
  bufferSize?: number;

  /**
   * Force specific input format.
   *
   * Use this to specify the input format explicitly instead of auto-detection.
   * Useful for raw formats like 'rawvideo', 'rawaudio', etc.
   *
   */
  format?: string;

  /**
   * Skip reading stream information on open.
   *
   * If true, stream info (codecs, formats, etc.) will not be read during opening.
   * This can speed up opening time for certain use cases where stream info is not needed.
   *
   * @default false
   */
  skipStreamInfo?: boolean;

  /**
   * Start reading packets from the first keyframe.
   *
   * When enabled, all packets before the first keyframe will be skipped.
   * Useful for seeking and trimming operations.
   *
   * @default false
   */
  startWithKeyframe?: boolean;

  /**
   * DTS delta threshold in seconds.
   *
   * Timestamp discontinuity detection threshold for formats with AVFMT_TS_DISCONT flag.
   * When DTS delta exceeds this value, it's considered a discontinuity.
   *
   * Matches FFmpeg CLI's -dts_delta_threshold option.
   *
   * @default 10
   */
  dtsDeltaThreshold?: number;

  /**
   * DTS error threshold in seconds.
   *
   * Timestamp discontinuity detection threshold for continuous formats (without AVFMT_TS_DISCONT).
   * When DTS delta exceeds this value, it's considered a timestamp error.
   *
   * Matches FFmpeg CLI's -dts_error_threshold option.
   *
   * @default 108000 (30 hours)
   */
  dtsErrorThreshold?: number;

  /**
   * Copy timestamps from input to output.
   *
   * When enabled, timestamps are passed through without modification.
   * This disables most timestamp discontinuity corrections except for
   * PTS wrap-around detection in discontinuous formats.
   *
   * Matches FFmpeg CLI's -copyts option.
   *
   * @default false
   */
  copyTs?: boolean;

  /**
   * FFmpeg format options passed directly to the input.
   *
   * Key-value pairs of FFmpeg AVFormatContext options.
   * These are passed directly to avformat_open_input().
   */
  options?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Options for Muxer creation.
 *
 * Configures output container format and buffering.
 */
export interface MuxerOptions {
  /**
   * Input media for automatic metadata and property copying.
   *
   * When provided, Muxer will automatically copy:
   * - Container-level metadata (title, artist, etc.)
   * - Stream-level metadata
   * - Disposition flags (DEFAULT, FORCED, etc.)
   * - Duration hints for encoding
   *
   * This matches FFmpeg CLI behavior which copies metadata by default.
   */
  input?: Demuxer | RTPDemuxer;

  /**
   * Preferred output format.
   *
   * If not specified, format is guessed from file extension.
   * Use this to override automatic format detection.
   *
   * Matches FFmpeg CLI's -f option.
   */
  format?: string;

  /**
   * Buffer size for I/O operations.
   *
   * This option controls the size of the internal buffer used for
   * reading and writing data.
   *
   * @default 32768 (32 KB, matches FFmpeg CLI default)
   */
  bufferSize?: number;

  /**
   * Maximum packet size for I/O operations.
   *
   * This option controls the maximum size of individual packets
   * for protocols that require specific packet sizes (e.g., RTP with MTU constraints).
   *
   * Matches FFmpeg's max_packet_size in AVIOContext.
   *
   * @default 1200
   */
  maxPacketSize?: number;

  /**
   * Exit immediately on first write error.
   *
   * When enabled, the muxer will terminate on the first write error.
   * When disabled, errors are logged but processing continues.
   *
   * @default true
   */
  exitOnError?: boolean;

  /**
   * Maximum number of packets to buffer per stream in the sync queue.
   *
   * Matches FFmpeg CLI's -max_muxing_queue_size option.
   * Limits memory usage when encoders are still initializing.
   * Takes effect after muxingQueueDataThreshold is reached.
   * If exceeded, an error is thrown.
   *
   * @default 128 (same as FFmpeg CLI)
   */
  maxMuxingQueueSize?: number;

  /**
   * Threshold in bytes after which maxMuxingQueueSize takes effect.
   *
   * Matches FFmpeg CLI's -muxing_queue_data_threshold option.
   * Once this threshold is reached, maxMuxingQueueSize limit applies.
   * This is an intelligent system: small streams (audio) can buffer many packets,
   * large streams (video) are limited by packet count.
   *
   * @default 52428800 (50 MB, same as FFmpeg CLI)
   */
  muxingQueueDataThreshold?: number;

  /**
   * Maximum buffering duration in seconds for sync queue interleaving.
   *
   * Matches FFmpeg CLI's -shortest_buf_duration option.
   * Controls how much buffering is allowed in the native sync queue
   * for packet interleaving across multiple streams.
   *
   * @default 10 (same as FFmpeg CLI)
   */
  syncQueueBufferDuration?: number;

  /**
   * Start time offset in seconds for output timestamps.
   *
   * Matches FFmpeg CLI's -ss (output) option.
   * Subtracts this offset from all packet timestamps.
   * Use for trimming from start of stream.
   *
   * @default AV_NOPTS_VALUE (no offset)
   */
  startTime?: number;

  /**
   * Whether to copy initial non-keyframe packets in streamcopy mode.
   *
   * Matches FFmpeg CLI's -copyinkf option.
   * If false (default), packets before first keyframe are skipped.
   * If true, all packets from start are copied.
   *
   * @default false
   */
  copyInitialNonkeyframes?: boolean;

  /**
   * Copy or discard frames before start time.
   *
   * Matches FFmpeg CLI's -copypriorss option.
   * Controls whether packets before the start time are copied:
   * - -1 (default): Use FFmpeg's internal ts_copy_start calculation
   * - 0: Discard packets before start time
   * - 1: Copy all packets regardless of start time
   *
   * @default -1
   */
  copyPriorStart?: number;

  /**
   * Use synchronous packet queue for interleaving.
   *
   * When true and there are stream copy streams present, enables FFmpeg's
   * sync queue for proper interleaving of packets based on timestamps.
   *
   * The sync queue is only activated when both conditions are met:
   * - `useSyncQueue` is `true`
   * - Output contains at least one stream copy stream
   *
   * This includes scenarios with:
   * - Only stream copy streams (e.g., 1 streamcopy stream)
   * - Mixed streams (e.g., 1 streamcopy + 1 encoded stream)
   *
   * For outputs with only encoded streams, the sync queue is not used.
   *
   * @default true
   */
  useSyncQueue?: boolean;

  /**
   * Use asynchronous write queue to prevent race conditions.
   *
   * When true and there are multiple streams (> 1), all write operations
   * are serialized through an async queue, preventing concurrent access
   * to AVFormatContext which can cause "Packet duration out of range"
   * errors with parallel encoding.
   *
   * The async queue is only activated when both conditions are met:
   * - `useAsyncWrite` is `true`
   * - Output has more than one stream
   *
   * For single-stream outputs, writes are performed directly without
   * queuing, regardless of this setting.
   *
   * @default true
   */
  useAsyncWrite?: boolean;

  /**
   * FFmpeg format options passed directly to the output.
   *
   * Key-value pairs of FFmpeg AVFormatContext options.
   * These are passed directly to avformat_write_header().
   */
  options?: Record<string, string | number | boolean | bigint | undefined | null>;
}

/**
 * Options for decoder creation.
 *
 * Configuration parameters for initializing a media decoder.
 * Supports hardware acceleration and threading configuration.
 */
export interface DecoderOptions {
  /**
   * Exit immediately on first decode error.
   *
   * When enabled, the decoder will terminate on the first decode error.
   * When disabled, errors are logged but decoding continues with next packet.
   *
   * @default true
   */
  exitOnError?: boolean;

  /**
   * Hardware acceleration context.
   *
   * Pass a HardwareContext instance to enable hardware-accelerated decoding.
   * Set to null to disable hardware acceleration.
   */
  hardware?: HardwareContext | null;

  /**
   * Number of extra hardware frames to allocate.
   *
   * Useful for hardware decoders requiring additional frame buffering.
   * Some hardware decoders need extra frames for reference or look-ahead.
   */
  extraHWFrames?: number;

  /**
   * Hardware frame output format.
   *
   * When set, hardware frames will be automatically transferred to this software pixel format.
   * Useful when you need software frames for further processing but want to use hardware decoding.
   */
  hwaccelOutputFormat?: AVPixelFormat;

  /**
   * Force constant framerate mode.
   *
   * When set, ignores all timestamps and generates frames at a constant rate.
   * Sets frame PTS to AV_NOPTS_VALUE, duration to 1, and time_base to 1/framerate.
   * Matches FFmpeg CLI's DECODER_FLAG_FRAMERATE_FORCED behavior.
   */
  forcedFramerate?: IRational;

  /**
   * Override sample aspect ratio.
   *
   * When set, overrides the frame's sample_aspect_ratio with this value.
   * Useful for fixing incorrect SAR in source material.
   */
  sarOverride?: IRational;

  /**
   * Apply cropping from frame metadata.
   *
   * When true, automatically crops frames based on their crop metadata.
   * Uses av_frame_apply_cropping() with AV_FRAME_CROP_UNALIGNED flag.
   * Useful for streams with letterboxing/pillarboxing metadata.
   *
   * @default false
   */
  applyCropping?: boolean;

  /**
   * Number of threads to use for decoding.
   *
   * Set to 0 to auto-detect based on CPU cores.
   *
   * @default 1
   */
  threadCount?: number;

  /**
   * Type of threading to use for decoding.
   *
   * Set to FF_THREAD_FRAME for frame-level threading.
   * Set to FF_THREAD_SLICE for slice-level threading.
   *
   * @default 0 (auto-detect)
   */
  threadType?: number;

  /**
   * Additional codec-specific options.
   *
   * Key-value pairs of FFmpeg AVCodecContext options.
   * These are passed directly to the decoder.
   */
  options?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Options for encoder creation.
 *
 * Encoder-specific configuration options.
 * Stream parameters (width, height, format, etc.) are taken from the provided stream.
 */
export interface EncoderOptions {
  /**
   * Target bitrate.
   *
   * Can be specified as number, bigint, or string with suffix (e.g., '5M', '128k').
   * Used for rate control in video and audio encoding.
   *
   * @default 128k for audio, 1M for video
   */
  bitrate?: number | bigint | string;

  /**
   * Minimum bitrate for rate control.
   *
   * Can be specified as number, bigint, or string with suffix (e.g., '5M', '128k').
   * Used with variable bitrate encoding to enforce quality floor.
   */
  minRate?: number | bigint | string;

  /**
   * Maximum bitrate for rate control.
   *
   * Can be specified as number, bigint, or string with suffix (e.g., '5M', '128k').
   * Used with variable bitrate encoding to enforce bitrate ceiling.
   */
  maxRate?: number | bigint | string;

  /**
   * Rate control buffer size.
   *
   * Can be specified as number, bigint, or string with suffix (e.g., '5M', '128k').
   * Determines the decoder buffer model size for rate control.
   */
  bufSize?: number | bigint | string;

  /**
   * Group of Pictures (GOP) size.
   *
   * Number of frames between keyframes.
   * Larger GOP improves compression but reduces seekability.
   */
  gopSize?: number;

  /**
   * Maximum number of consecutive B-frames.
   *
   * B-frames improve compression but increase encoding complexity.
   * Maximum B-frames allowed between I or P frames.
   */
  maxBFrames?: number;

  /**
   * Optional decoder reference for metadata extraction.
   *
   * Used to extract bits_per_raw_sample and other decoder-specific properties.
   * Helps maintain quality during transcoding.
   */
  decoder?: Decoder;

  /**
   * Optional filter reference for metadata extraction.
   *
   * Used to extract filter output parameters.
   * Ensures encoder matches filter output characteristics.
   */
  filter?: FilterAPI | FilterComplexAPI;

  /**
   * Additional codec-specific options.
   *
   * Key-value pairs of FFmpeg AVCodecContext options.
   * These are passed directly to the encoder.
   */
  options?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Options for creating a filter instance.
 */
export interface FilterOptions {
  /**
   * Number of threads for parallel processing.
   *
   * Controls the number of threads used for filter processing.
   * Set to 0 to auto-detect based on CPU cores.
   *
   * @default 0 (auto-detect)
   */
  threads?: number;

  /**
   * Software scaler options for video filters.
   *
   * Options passed to libswscale when scaling video within filters.
   * Maps to AVFilterGraph->scale_sws_opts.
   */
  scaleSwsOpts?: string;

  /**
   * Audio resampler options for audio filters.
   *
   * Options passed to libswresample when resampling audio within filters.
   * Maps to AVFilterGraph->aresample_swr_opts.
   */
  audioResampleOpts?: string;

  /**
   * Hardware acceleration context.
   *
   * Pass a HardwareContext instance to enable hardware-accelerated filtering.
   * Set to null to disable hardware acceleration.
   */
  hardware?: HardwareContext | null;

  /**
   * Number of extra hardware frames to allocate.
   *
   * Useful for hardware filters requiring additional frame buffering.
   * Some hardware filters need extra frames for look-ahead or reference.
   */
  extraHWFrames?: number;

  /**
   * Force constant framerate mode (CFR).
   *
   * When true, timeBase is automatically set to 1/framerate (like FFmpeg CLI -fps_mode cfr).
   * When false (default), timeBase is taken from frame.timeBase (VFR mode).
   *
   * Maps to FFmpeg's IFILTER_FLAG_CFR.
   * Requires `framerate` to be set when enabled.
   *
   * @default false (VFR mode)
   */
  cfr?: boolean;

  /**
   * Framerate for CFR mode or as hint for buffer source.
   *
   * Required when `cfr=true` to calculate timeBase = 1/framerate.
   * Also passed to AVBufferSrcParameters->frame_rate.
   *
   * Maps to FFmpeg's InputFilterOptions->framerate.
   */
  framerate?: IRational;

  /**
   * Drop frames on format/parameter changes instead of reinitializing filtergraph.
   *
   * When true, frames with changed properties (resolution, format, etc.) are dropped
   * instead of triggering filtergraph reinitialization. Useful for live streams
   * with unstable properties.
   *
   * Maps to FFmpeg's IFILTER_FLAG_DROPCHANGED.
   *
   * @default false
   */
  dropOnChange?: boolean;

  /**
   * Allow filtergraph reinitialization when frame parameters change.
   *
   * When false, parameter changes (resolution, format) will cause errors
   * instead of reinitializing the filtergraph.
   * When true (default), filtergraph is reinitialized on parameter changes.
   *
   * Maps to FFmpeg's IFILTER_FLAG_REINIT.
   *
   * @default true
   */
  allowReinit?: boolean;
}

/**
 * Input configuration for FilterComplexAPI.
 */
export interface FilterComplexInput {
  /**
   * Input label identifier.
   *
   * Matches labels in filter_complex description (e.g., '0:v', '1:v', '0:a').
   * Used to identify which buffersrc filter to send frames to via process() method.
   */
  label: string;
}

/**
 * Output configuration for FilterComplexAPI.
 */
export interface FilterComplexOutput {
  /**
   * Output label identifier.
   *
   * Matches labels in filter_complex description (e.g., 'out', 'thumb', 'main').
   * Used to identify which buffersink to read from via output() method.
   */
  label: string;

  /**
   * Media type for this output.
   *
   * If not specified, defaults to the media type of the first input.
   * Set to 'AVMEDIA_TYPE_VIDEO' or 'AVMEDIA_TYPE_AUDIO' explicitly if needed (e.g., for audio extraction filters).
   *
   * @default Inferred from first input
   */
  mediaType?: AVMediaType;
}

/**
 * Options for creating a complex filter graph.
 */
export interface FilterComplexOptions extends FilterOptions {
  /**
   * Input sources for the filter graph.
   *
   * Array of labeled frame sources that feed into the filter graph.
   * Labels must match those referenced in the description string.
   */
  inputs: FilterComplexInput[];

  /**
   * Output labels from the filter graph.
   *
   * Array of output identifiers that can be consumed via output() method.
   * Labels must match those defined in the description string.
   */
  outputs: FilterComplexOutput[];
}

/**
 * Hardware acceleration configuration options.
 *
 * Parameters for configuring hardware-accelerated encoding/decoding.
 * Supports device selection and initialization options.
 *
 */
export interface HardwareOptions {
  /**
   * Device path or index (e.g., '0' for first GPU).
   */
  device?: string;

  /**
   * Device initialization options.
   */
  options?: Record<string, string>;
}

/**
 * Custom I/O callbacks for implementing custom input sources.
 *
 * Defines callback functions for custom read operations with FFmpeg.
 * Used by IOStream.create() for custom input protocols.
 *
 */
export interface IOInputCallbacks {
  /**
   * Read callback - called when FFmpeg needs to read data.
   *
   * Can be synchronous or async (return a Promise).
   *
   * @param size - Number of bytes to read
   *
   * @returns Buffer with data, null for EOF, negative error code, or Promise resolving to same
   */
  read: (size: number) => Buffer | null | number | Promise<Buffer | null | number>;

  /**
   * Seek callback - called when FFmpeg needs to seek in the stream.
   *
   * Can be synchronous or async (return a Promise).
   *
   * @param offset - Offset to seek to
   *
   * @param whence - Seek origin (AVSEEK_SET, AVSEEK_CUR, AVSEEK_END, or AVSEEK_SIZE)
   *
   * @returns New position, negative error code, or Promise resolving to same
   */
  seek?: (offset: bigint, whence: AVSeekWhence) => bigint | number | Promise<bigint | number>;
}

/**
 * Custom I/O callbacks for implementing custom output targets.
 *
 * Defines callback functions for custom write operations with FFmpeg.
 * Used internally by Muxer for custom output protocols.
 *
 * @example
 * ```typescript
 * // Async callback example - streaming to web destination
 * const callbacks: IOOutputCallbacks = {
 *   write: async (buffer) => {
 *     await streamWriter.write(buffer);
 *     return buffer.length;
 *   }
 * };
 *
 * await using muxer = await Muxer.open(callbacks, { format: 'mp4' });
 * ```
 *
 * @example
 * ```typescript
 * // Sync callback example - buffering for later processing
 * const chunks: Buffer[] = [];
 *
 * const callbacks: IOOutputCallbacks = {
 *   write: (buffer) => {
 *     chunks.push(Buffer.from(buffer));
 *     return buffer.length;
 *   }
 * };
 * ```
 *
 * **Note:** The buffer passed to callbacks may be reused by FFmpeg after the
 * callback returns. If you need to keep the data, copy it with `Buffer.from(buffer)`.
 *
 */
export interface IOOutputCallbacks {
  /**
   * Write callback - called when FFmpeg needs to write data.
   *
   * Can be synchronous or async (return a Promise).
   * The buffer may be reused by FFmpeg after the callback completes,
   * so copy it if you need to keep the data.
   *
   * @param buffer - Buffer containing data to write
   *
   * @returns Number of bytes written, void (assumes all bytes written), or Promise resolving to same
   */
  write: (buffer: Buffer) => number | void | Promise<number | void>;

  /**
   * Seek callback - called when FFmpeg needs to seek in the output.
   *
   * Can be synchronous or async (return a Promise).
   *
   * @param offset - Offset to seek to
   *
   * @param whence - Seek origin (AVSEEK_SET, AVSEEK_CUR, AVSEEK_END)
   *
   * @returns New position, negative error code, or Promise resolving to same
   */
  seek?: (offset: bigint, whence: AVSeekWhence) => bigint | number | Promise<bigint | number>;

  /**
   * Read callback - some formats may need to read back data.
   *
   * Can be synchronous or async (return a Promise).
   *
   * @param size - Number of bytes to read
   *
   * @returns Buffer with data, null for EOF, negative error code, or Promise resolving to same
   */
  read?: (size: number) => Buffer | null | number | Promise<Buffer | null | number>;
}

/**
 * RTP Demuxer interface.
 */
export interface RTPDemuxer {
  /**
   * Demuxer configured for RTP/SRTP reception.
   *
   * Receives RTP packets via localhost UDP and feeds them to FFmpeg for decoding.
   */
  input: Demuxer;

  /**
   * Send RTP packet to FFmpeg for decoding.
   *
   * @param rtpPacket - RTP packet as Buffer or RtpPacket object
   *
   * @param streamIndex - Optional stream index for multiplexed RTP
   */
  sendPacket: (rtpPacket: Buffer | RtpPacket, streamIndex?: number) => void;

  /**
   * Cleanup function.
   *
   * Closes the demuxer and UDP socket asynchronously.
   */
  close: () => Promise<void>;

  /**
   * Synchronous cleanup function.
   *
   * Closes the demuxer and UDP socket synchronously.
   */
  closeSync: () => void;
}
