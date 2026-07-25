import { createSocket } from 'dgram';
import { closeSync, openSync, readSync } from 'fs';
import { open } from 'fs/promises';
import { Readable } from 'node:stream';
import { resolve } from 'path';

import {
  AV_NOPTS_VALUE,
  AV_PIX_FMT_NONE,
  AV_ROUND_NEAR_INF,
  AV_ROUND_PASS_MINMAX,
  AV_TIME_BASE,
  AV_TIME_BASE_Q,
  AVERROR_EOF,
  AVERROR_EXIT,
  AVFLAG_NONE,
  AVFMT_FLAG_CUSTOM_IO,
  AVFMT_FLAG_NONBLOCK,
  AVFMT_TS_DISCONT,
  AVMEDIA_TYPE_AUDIO,
  AVMEDIA_TYPE_VIDEO,
  AVSEEK_CUR,
  AVSEEK_END,
  AVSEEK_SET,
} from '../constants/constants.js';
import { Dictionary } from '../lib/dictionary.js';
import { AVERROR_EAGAIN, FFmpegError } from '../lib/error.js';
import { FormatContext } from '../lib/format-context.js';
import { InputFormat } from '../lib/input-format.js';
import { IOContext } from '../lib/io-context.js';
import { Packet } from '../lib/packet.js';
import { Rational } from '../lib/rational.js';
import { avGetPixFmtName, avGetSampleFmtName, avRescaleQ, avRescaleQRnd, dtsPredict as nativeDtsPredict } from '../lib/utilities.js';
import { DELTA_THRESHOLD, DTS_ERROR_THRESHOLD, IO_BUFFER_SIZE, MAX_INPUT_QUEUE_SIZE } from './constants.js';
import { IOStream } from './io-stream.js';
import { StreamingUtils } from './utilities/streaming.js';

import type { RtpPacket } from 'werift';
import type { AVMediaType, AVPixelFormat, AVSampleFormat, AVSeekFlag, AVSeekWhence, DemuxerFormat, DemuxerOptionsFor } from '../constants/index.js';
import type { Stream } from '../lib/stream.js';
import type { IRational } from '../lib/types.js';
import type { IOInputCallbacks } from './io-stream.js';

// Scratch buffer for Atomics.wait() - gives packetsSync a blocking sleep for
// EAGAIN retries (mirrors FFmpeg CLI's av_usleep()) without spinning the CPU.
const SYNC_SLEEP_SIGNAL = new Int32Array(new SharedArrayBuffer(4));

/**
 * Per-stream timestamp processing state.
 * Tracks timestamp correction and prediction for each stream.
 *
 * @internal
 */
interface StreamState {
  // PTS wrap-around correction
  wrapCorrectionDone: boolean;

  // DTS prediction and tracking
  sawFirstTs: boolean;
  firstDts: bigint;
  nextDts: bigint;
  dts: bigint;
}

/**
 * Raw video data configuration.
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

/**
 * Options for Demuxer opening.
 */
export interface DemuxerOptions<F extends DemuxerFormat | (string & {}) = DemuxerFormat | (string & {})> {
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
   * When given as a literal (e.g. `'mov'`), `options` is strongly typed to that
   * demuxer's known options plus the generic AVFormatContext options.
   */
  format?: F;

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
   * Key-value pairs of FFmpeg AVFormatContext / demuxer-private / protocol
   * options, passed to avformat_open_input(). When `format` is a known literal,
   * these are typed to that demuxer's options (autocomplete + value typing);
   * arbitrary keys remain allowed so protocol options (e.g. `rtsp_transport`)
   * still pass.
   */
  options?: DemuxerOptionsFor<F>;

  /**
   * Configure the underlying format context just after the input is opened.
   *
   * Called with the input {@link FormatContext} after `avformat_open_input` and
   * `avformat_find_stream_info` (so the streams are available) and before any
   * packets are read. Use it to inspect or tweak the open input context or its
   * streams directly. Most input-side tuning (probesize, analyzeduration,
   * protocol options, …) is better passed via {@link DemuxerOptions.options},
   * which is applied at open time.
   *
   * @example
   * ```typescript
   * await Demuxer.open('input.mp4', {
   *   configure: (fmt) => {
   *     console.log(`Opened ${fmt.streams.length} streams`);
   *   },
   * });
   * ```
   */
  configure?: (context: FormatContext) => void;

  /**
   * AbortSignal for cancellation.
   *
   * When aborted, async generators stop yielding and async methods throw AbortError.
   * The demux thread is stopped automatically. Aborting also fires the native
   * interrupt callback, unblocking a blocking open (e.g. an unresponsive RTSP
   * source) or a stalled av_read_frame().
   */
  signal?: AbortSignal;
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

/**
 * High-level demuxer for reading and demuxing media files.
 *
 * Provides simplified access to media streams, packets, and metadata.
 * Handles file opening, format detection, and stream information extraction.
 * Supports files, URLs, buffers, and raw data input with automatic cleanup.
 * Essential component for media processing pipelines and transcoding.
 *
 * @example
 * ```typescript
 * import { Demuxer } from 'node-av/api';
 *
 * // Open media file
 * await using input = await Demuxer.open('video.mp4');
 * console.log(`Format: ${input.formatName}`);
 * console.log(`Duration: ${input.duration}s`);
 *
 * // Process packets
 * for await (const packet of input.packets()) {
 *   console.log(`Packet from stream ${packet.streamIndex}`);
 *   packet.free();
 * }
 * ```
 *
 * @example
 * ```typescript
 * // From buffer
 * const buffer = await fs.readFile('video.mp4');
 * await using input = await Demuxer.open(buffer);
 *
 * // Access streams
 * const videoStream = input.video();
 * const audioStream = input.audio();
 * ```
 *
 * @see {@link Muxer} For writing media files
 * @see {@link Decoder} For decoding packets to frames
 * @see {@link FormatContext} For low-level API
 */
export class Demuxer implements AsyncDisposable, Disposable {
  private formatContext: FormatContext;
  private _streams: Stream[] = [];
  private ioContext?: IOContext;
  private externalIO = false; // ioContext was supplied by the caller - may own a protocol handle from open2()
  private isClosed = false;
  private options: Required<Omit<DemuxerOptions, 'signal' | 'configure'>>;

  // Timestamp processing state (per-stream)
  private streamStates = new Map<number, StreamState>();

  // Timestamp discontinuity tracking (global)
  private tsOffsetDiscont = 0n;
  private lastTs = AV_NOPTS_VALUE;

  // Demux manager for handling multiple parallel packet generators
  private activeGenerators = 0;
  private demuxThread: Promise<void> | null = null;
  private packetQueues = new Map<number | 'all', Packet[]>(); // streamIndex or 'all' -> queue
  private packetQueueConsumers = new Map<number | 'all', number>(); // active consumer count per queue key
  private queueResolvers = new Map<number | 'all', (() => void)[]>(); // Promise resolvers for waiting consumers (multiple per key)
  private demuxThreadActive = false;
  private demuxEof = false;
  private lastError: FFmpegError | null = null; // read error that ended the demux loop (null = clean EOF)
  private signal?: AbortSignal;
  private signalCleanup?: () => void;

  /**
   * @param formatContext - Opened format context
   *
   * @param options - Media input options
   *
   * @param ioContext - Optional IO context for custom I/O (e.g., from Buffer)
   *
   * @param externalIO - Whether ioContext was supplied by the caller instead of built here
   *
   * @internal
   */
  private constructor(formatContext: FormatContext, options: Required<Omit<DemuxerOptions, 'signal' | 'configure'>>, ioContext?: IOContext, externalIO = false) {
    this.formatContext = formatContext;
    this.ioContext = ioContext;
    this.externalIO = externalIO;
    this._streams = formatContext.streams ?? [];
    this.options = options;
  }

  /**
   * Probe media format without fully opening the file.
   *
   * Detects format by analyzing file headers and content.
   * Useful for format validation before processing.
   *
   * Direct mapping to av_probe_input_format().
   *
   * @param input - File path or buffer to probe
   *
   * @returns Format information or null if unrecognized
   *
   * @example
   * ```typescript
   * const info = await Demuxer.probeFormat('video.mp4');
   * if (info) {
   *   console.log(`Format: ${info.format}`);
   *   console.log(`Confidence: ${info.confidence}%`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Probe from buffer
   * const buffer = await fs.readFile('video.webm');
   * const info = await Demuxer.probeFormat(buffer);
   * console.log(`MIME type: ${info?.mimeType}`);
   * ```
   *
   * @see {@link InputFormat.probe} For low-level probing
   */
  static async probeFormat(input: string | Buffer): Promise<{
    format: string;
    longName?: string;
    extensions?: string;
    mimeType?: string;
    confidence: number;
  } | null> {
    try {
      if (Buffer.isBuffer(input)) {
        // Probe from buffer
        const format = InputFormat.probe(input);
        if (!format) {
          return null;
        }

        return {
          format: format.name ?? 'unknown',
          longName: format.longName ?? undefined,
          extensions: format.extensions ?? undefined,
          mimeType: format.mimeType ?? undefined,
          confidence: 100, // Direct probe always has high confidence
        };
      } else {
        // For files, read first part and probe
        let fileHandle;
        try {
          fileHandle = await open(input, 'r');
          // Read first 64KB for probing
          const buffer = Buffer.alloc(65536);
          const { bytesRead } = await fileHandle.read(buffer, 0, 65536, 0);

          const probeBuffer = buffer.subarray(0, bytesRead);
          const format = InputFormat.probe(probeBuffer, input);

          if (!format) {
            return null;
          }

          return {
            format: format.name ?? 'unknown',
            longName: format.longName ?? undefined,
            extensions: format.extensions ?? undefined,
            mimeType: format.mimeType ?? undefined,
            confidence: 90, // File-based probe with filename hint
          };
        } catch {
          // If file reading fails, return null
          return null;
        } finally {
          await fileHandle?.close();
        }
      }
    } catch {
      return null;
    }
  }

  /**
   * Probe media format without fully opening the file synchronously.
   * Synchronous version of probeFormat.
   *
   * Detects format by analyzing file headers and content.
   * Useful for format validation before processing.
   *
   * Direct mapping to av_probe_input_format().
   *
   * @param input - File path or buffer to probe
   *
   * @returns Format information or null if unrecognized
   *
   * @example
   * ```typescript
   * const info = Demuxer.probeFormatSync('video.mp4');
   * if (info) {
   *   console.log(`Format: ${info.format}`);
   *   console.log(`Confidence: ${info.confidence}%`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Probe from buffer
   * const buffer = fs.readFileSync('video.webm');
   * const info = Demuxer.probeFormatSync(buffer);
   * console.log(`MIME type: ${info?.mimeType}`);
   * ```
   *
   * @see {@link probeFormat} For async version
   */
  static probeFormatSync(input: string | Buffer): {
    format: string;
    longName?: string;
    extensions?: string;
    mimeType?: string;
    confidence: number;
  } | null {
    try {
      if (Buffer.isBuffer(input)) {
        // Probe from buffer
        const format = InputFormat.probe(input);
        if (!format) {
          return null;
        }

        return {
          format: format.name ?? 'unknown',
          longName: format.longName ?? undefined,
          extensions: format.extensions ?? undefined,
          mimeType: format.mimeType ?? undefined,
          confidence: 100, // Direct probe always has high confidence
        };
      } else {
        // For files, read first part and probe
        let fd;
        try {
          fd = openSync(input, 'r');
          // Read first 64KB for probing
          const buffer = Buffer.alloc(65536);
          const bytesRead = readSync(fd, buffer, 0, 65536, 0);

          const probeBuffer = buffer.subarray(0, bytesRead);
          const format = InputFormat.probe(probeBuffer, input);

          if (!format) {
            return null;
          }

          return {
            format: format.name ?? 'unknown',
            longName: format.longName ?? undefined,
            extensions: format.extensions ?? undefined,
            mimeType: format.mimeType ?? undefined,
            confidence: 90, // File-based probe with filename hint
          };
        } catch {
          // If file reading fails, return null
          return null;
        } finally {
          if (fd !== undefined) closeSync(fd);
        }
      }
    } catch {
      return null;
    }
  }

  /**
   * Open media from file, URL, buffer, raw data, or custom I/O callbacks.
   *
   * Automatically detects format and extracts stream information.
   * Supports various input sources with flexible configuration.
   * Creates demuxer ready for packet extraction.
   * A supplied IOContext is taken over by the demuxer and released on close.
   *
   * Direct mapping to avformat_open_input() and avformat_find_stream_info().
   *
   * @param input - File path, URL, buffer, raw data descriptor, or custom I/O callbacks
   *
   * @param options - Input configuration options
   *
   * @returns Opened demuxer instance
   *
   * @throws {Error} If format not found or open fails, or format required for custom I/O
   *
   * @throws {FFmpegError} If FFmpeg operations fail
   *
   * @example
   * ```typescript
   * // Open file
   * await using input = await Demuxer.open('video.mp4');
   * ```
   *
   * @example
   * ```typescript
   * // Open URL
   * await using input = await Demuxer.open('http://example.com/stream.m3u8');
   * ```
   *
   * @example
   * ```typescript
   * // Open with options
   * await using input = await Demuxer.open('rtsp://camera.local', {
   *   format: 'rtsp',
   *   options: {
   *     rtsp_transport: 'tcp',
   *     analyzeduration: '5000000'
   *   }
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Open raw video data
   * await using input = await Demuxer.open({
   *   type: 'video',
   *   input: rawBuffer,
   *   width: 1920,
   *   height: 1080,
   *   pixelFormat: AV_PIX_FMT_YUV420P,
   *   frameRate: { num: 30, den: 1 }
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Custom I/O callbacks
   * const callbacks = {
   *   read: (size: number) => {
   *     // Read data from custom source
   *     return buffer; // or null for EOF, or negative error code
   *   },
   *   seek: (offset: bigint, whence: AVSeekWhence) => {
   *     // Seek in custom source
   *     return offset; // or negative error code
   *   }
   * };
   *
   * await using input = await Demuxer.open(callbacks, {
   *   format: 'mp4',
   *   bufferSize: 8192
   * });
   * ```
   *
   * @see {@link DemuxerOptions} For configuration options
   * @see {@link VideoRawData} For raw video data input
   * @see {@link AudioRawData} For raw audio data input
   * @see {@link IOInputCallbacks} For custom I/O interface
   */
  static async open<const F extends DemuxerFormat | (string & {}) = DemuxerFormat | (string & {})>(input: string | Buffer, options?: DemuxerOptions<F>): Promise<Demuxer>;
  static async open<const F extends DemuxerFormat | (string & {})>(input: IOInputCallbacks, options: DemuxerOptions<F> & { format: F }): Promise<Demuxer>;
  static async open<const F extends DemuxerFormat | (string & {})>(input: IOContext, options: DemuxerOptions<F> & { format: F }): Promise<Demuxer>;
  static async open<const F extends DemuxerFormat | (string & {})>(input: Readable, options: DemuxerOptions<F> & { format: F }): Promise<Demuxer>;
  static async open<const F extends DemuxerFormat | (string & {}) = DemuxerFormat | (string & {})>(
    rawData: VideoRawData | AudioRawData,
    options?: DemuxerOptions<F>,
  ): Promise<Demuxer>;
  static async open(input: string | Buffer | VideoRawData | AudioRawData | IOInputCallbacks | IOContext | Readable, options: DemuxerOptions = {}): Promise<Demuxer> {
    // Check if input is raw data
    if (typeof input === 'object' && 'type' in input && ('width' in input || 'sampleRate' in input)) {
      // Build options for raw data
      const rawOptions: DemuxerOptions & { format: string } = {
        bufferSize: options.bufferSize,
        format: options.format ?? (input.type === 'video' ? 'rawvideo' : 's16le'),
        options: {
          ...options.options,
        },
      };

      if (input.type === 'video') {
        rawOptions.options = {
          ...rawOptions.options,
          video_size: `${input.width}x${input.height}`,
          pixel_format: avGetPixFmtName(input.pixelFormat) ?? 'yuv420p',
          framerate: new Rational(input.frameRate.num, input.frameRate.den).toString(),
        };
      } else {
        rawOptions.options = {
          ...rawOptions.options,
          sample_rate: input.sampleRate,
          channels: input.channels,
          sample_fmt: avGetSampleFmtName(input.sampleFormat) ?? 's16le',
        };
      }

      input = input.input;
      options = rawOptions;
    }

    // Original implementation for non-raw data
    const formatContext = new FormatContext();
    let ioContext: IOContext | undefined;
    let externalIO = false; // caller-supplied context - released via dispose, not freeContext
    let optionsDict: Dictionary | null = null;
    let inputFormat: InputFormat | null = null;

    // Abort during the open phase: avformat_open_input()/find_stream_info()
    // block for seconds on an unresponsive network source, so the signal must
    // fire the native interrupt callback to unblock them.
    const onOpenAbort = () => formatContext.interrupt();
    if (options.signal) {
      options.signal.throwIfAborted();
      options.signal.addEventListener('abort', onOpenAbort, { once: true });
    }

    try {
      // Create options dictionary if options are provided
      if (options.options) {
        optionsDict = Dictionary.fromObject(options.options);
      }

      // Find input format if specified
      if (options.format) {
        inputFormat = InputFormat.findInputFormat(options.format);
        if (!inputFormat) {
          throw new Error(`Input format '${options.format}' not found`);
        }
      }

      if (typeof input === 'string') {
        // File path or URL - resolve relative paths to absolute
        // Skip path resolution for device inputs
        // Check if it's a URL (starts with protocol://) or a file path
        const isUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input);
        const resolvedInput = isUrl || inputFormat ? input : resolve(input);

        const ret = await formatContext.openInput(resolvedInput, inputFormat, optionsDict);
        FFmpegError.throwIfError(ret, 'Failed to open input');
        formatContext.setFlags(AVFMT_FLAG_NONBLOCK);
      } else if (Buffer.isBuffer(input)) {
        // Validate buffer is not empty
        if (input.length === 0) {
          throw new Error('Cannot open media from empty buffer');
        }
        // From buffer - allocate context first for custom I/O
        formatContext.allocContext();
        ioContext = IOStream.create(input, { bufferSize: options.bufferSize });
        formatContext.pb = ioContext;
        const ret = await formatContext.openInput('', inputFormat, optionsDict);
        FFmpegError.throwIfError(ret, 'Failed to open input from buffer');
      } else if (input instanceof IOContext) {
        if (!options.format) {
          throw new Error('Format must be specified for native IOContext input');
        }

        formatContext.allocContext();
        ioContext = input;
        externalIO = true;
        formatContext.pb = ioContext;
        formatContext.setFlags(AVFMT_FLAG_CUSTOM_IO);

        const ret = await formatContext.openInput('', inputFormat, optionsDict);
        FFmpegError.throwIfError(ret, 'Failed to open input from native IOContext');
      } else if (input instanceof Readable) {
        // Readable stream - format is required
        if (!options.format) {
          throw new Error('Format must be specified for Readable stream input');
        }

        formatContext.allocContext();
        ioContext = IOStream.create(input, { bufferSize: options.bufferSize });
        formatContext.pb = ioContext;
        formatContext.setFlags(AVFMT_FLAG_CUSTOM_IO);

        const ret = await formatContext.openInput('', inputFormat, optionsDict);
        FFmpegError.throwIfError(ret, 'Failed to open input from Readable stream');
      } else if (typeof input === 'object' && 'read' in input) {
        // Custom I/O with callbacks - format is required
        if (!options.format) {
          throw new Error('Format must be specified for custom I/O');
        }

        // Allocate context first for custom I/O
        formatContext.allocContext();

        // Setup custom I/O with callbacks
        ioContext = new IOContext();
        ioContext.allocContextWithCallbacks(options.bufferSize ?? IO_BUFFER_SIZE, 0, input.read, null, input.seek);
        formatContext.pb = ioContext;
        formatContext.setFlags(AVFMT_FLAG_CUSTOM_IO);

        const ret = await formatContext.openInput('', inputFormat, optionsDict);
        FFmpegError.throwIfError(ret, 'Failed to open input from custom I/O');
      } else {
        throw new TypeError('Invalid input type. Expected file path, URL, Buffer, IOContext, Readable, or IOInputCallbacks');
      }

      // Find stream information
      if (!options.skipStreamInfo) {
        const ret = await formatContext.findStreamInfo(null);
        FFmpegError.throwIfError(ret, 'Failed to find stream info');

        // Try to parse extradata for video streams with missing dimensions
        for (const stream of formatContext.streams ?? []) {
          if (stream.codecpar.codecType === AVMEDIA_TYPE_VIDEO) {
            const dimensionsMissing = stream.codecpar.width === 0 || stream.codecpar.height === 0;
            const invalidFormat = stream.codecpar.format === AV_PIX_FMT_NONE;
            const invalidRate = stream.codecpar.frameRate.num === 0 || stream.codecpar.frameRate.den === 0;

            const needsParsing = dimensionsMissing || invalidFormat || invalidRate;
            if (needsParsing && stream.codecpar.extradataSize > 0) {
              stream.codecpar.parseExtradata();
            }
          }
        }
      }

      options.configure?.(formatContext);

      // Determine buffer size
      let bufferSize = options.bufferSize ?? IO_BUFFER_SIZE;
      if (!ioContext && formatContext.iformat && formatContext.pb) {
        // Check if this is a streaming input (like RTSP, HTTP, etc.)
        const isStreaming = formatContext.pb.seekable === 0;
        if (isStreaming) {
          bufferSize *= 2; // double buffer size for streaming inputs
        }
      }

      // Apply defaults to options
      const fullOptions: Required<Omit<DemuxerOptions, 'signal' | 'configure'>> = {
        bufferSize,
        format: options.format ?? '',
        skipStreamInfo: options.skipStreamInfo ?? false,
        startWithKeyframe: options.startWithKeyframe ?? false,
        dtsDeltaThreshold: options.dtsDeltaThreshold ?? DELTA_THRESHOLD,
        dtsErrorThreshold: options.dtsErrorThreshold ?? DTS_ERROR_THRESHOLD,
        copyTs: options.copyTs ?? false,
        options: options.options ?? {},
      };

      const demuxer = new Demuxer(formatContext, fullOptions, ioContext, externalIO);

      if (options.signal) {
        const signal = options.signal;
        signal.removeEventListener('abort', onOpenAbort);
        demuxer.signal = signal;

        // An abort that raced the successful open must not hand out a usable
        // demuxer - tear it down and surface the abort instead.
        if (signal.aborted) {
          await demuxer.close();
          signal.throwIfAborted();
        }

        // Keep abort -> interrupt wired for the demuxer's lifetime so a
        // blocked av_read_frame() unwinds too; close() removes the listener.
        const onAbort = () => {
          demuxer.demuxThreadActive = false;
          demuxer.interrupt();
        };
        signal.addEventListener('abort', onAbort, { once: true });
        demuxer.signalCleanup = () => signal.removeEventListener('abort', onAbort);
      }

      return demuxer;
    } catch (error) {
      options.signal?.removeEventListener('abort', onOpenAbort);
      // Clean up only on error
      if (ioContext) {
        // Clear the pb reference first
        formatContext.pb = null;
        // Release the IOContext (for both custom I/O and buffer-based I/O).
        // A caller-supplied context may own a protocol handle from open2(),
        // which only dispose closes - see close().
        if (externalIO) {
          await ioContext[Symbol.asyncDispose]();
        } else {
          ioContext.freeContext();
        }
      }
      // Clean up FormatContext
      await formatContext.closeInput();
      throw error;
    } finally {
      // Clean up options dictionary
      if (optionsDict) {
        optionsDict.free();
      }
    }
  }

  /**
   * Open media from file, URL, Buffer, raw data, or custom I/O callbacks synchronously.
   * Synchronous version of open.
   *
   * Automatically detects format and extracts stream information.
   * Supports various input sources with flexible configuration.
   * Creates demuxer ready for packet extraction.
   * A supplied IOContext is taken over by the demuxer and released on close.
   *
   * Direct mapping to avformat_open_input() and avformat_find_stream_info().
   *
   * @param input - File path, URL, Buffer, raw data descriptor, or custom I/O callbacks
   *
   * @param options - Input configuration options
   *
   * @returns Opened muxer instance
   *
   * @throws {Error} If format not found or open fails, or format required for custom I/O
   *
   * @throws {FFmpegError} If FFmpeg operations fail
   *
   * @example
   * ```typescript
   * // Open file
   * using input = Demuxer.openSync('video.mp4');
   * ```
   *
   * @example
   * ```typescript
   * // Open from buffer
   * const buffer = await fs.readFile('video.mp4');
   * using input = Demuxer.openSync(buffer);
   * ```
   *
   * @example
   * ```typescript
   * // Open with options
   * using input = Demuxer.openSync('rtsp://camera.local', {
   *   format: 'rtsp',
   *   options: {
   *     rtsp_transport: 'tcp',
   *     analyzeduration: '5000000'
   *   }
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Custom I/O callbacks
   * const callbacks = {
   *   read: (size: number) => {
   *     // Read data from custom source
   *     return buffer; // or null for EOF, or negative error code
   *   },
   *   seek: (offset: bigint, whence: AVSeekWhence) => {
   *     // Seek in custom source
   *     return offset; // or negative error code
   *   }
   * };
   *
   * using input = Demuxer.openSync(callbacks, {
   *   format: 'mp4',
   *   bufferSize: 8192
   * });
   * ```
   *
   * @see {@link open} For async version
   * @see {@link IOInputCallbacks} For custom I/O interface
   */
  static openSync<const F extends DemuxerFormat | (string & {}) = DemuxerFormat | (string & {})>(input: string | Buffer, options?: DemuxerOptions<F>): Demuxer;
  static openSync<const F extends DemuxerFormat | (string & {})>(input: IOInputCallbacks, options: DemuxerOptions<F> & { format: F }): Demuxer;
  static openSync<const F extends DemuxerFormat | (string & {})>(input: IOContext, options: DemuxerOptions<F> & { format: F }): Demuxer;
  static openSync<const F extends DemuxerFormat | (string & {})>(input: Readable, options: DemuxerOptions<F> & { format: F }): Demuxer;
  static openSync<const F extends DemuxerFormat | (string & {}) = DemuxerFormat | (string & {})>(
    rawData: VideoRawData | AudioRawData,
    options?: DemuxerOptions<F>,
  ): Demuxer;
  static openSync(input: string | Buffer | VideoRawData | AudioRawData | IOInputCallbacks | IOContext | Readable, options: DemuxerOptions = {}): Demuxer {
    // Check if input is raw data
    if (typeof input === 'object' && 'type' in input && ('width' in input || 'sampleRate' in input)) {
      // Build options for raw data
      const rawOptions: DemuxerOptions & { format: string } = {
        bufferSize: options.bufferSize,
        format: options.format ?? (input.type === 'video' ? 'rawvideo' : 's16le'),
        options: {
          ...options.options,
        },
      };

      if (input.type === 'video') {
        rawOptions.options = {
          ...rawOptions.options,
          video_size: `${input.width}x${input.height}`,
          pixel_format: avGetPixFmtName(input.pixelFormat) ?? 'yuv420p',
          framerate: new Rational(input.frameRate.num, input.frameRate.den).toString(),
        };
      } else {
        rawOptions.options = {
          ...rawOptions.options,
          sample_rate: input.sampleRate,
          channels: input.channels,
          sample_fmt: avGetSampleFmtName(input.sampleFormat) ?? 's16le',
        };
      }

      input = input.input;
      options = rawOptions;
    }

    // Original implementation for non-raw data
    const formatContext = new FormatContext();
    let ioContext: IOContext | undefined;
    let externalIO = false; // caller-supplied context - released via dispose, not freeContext
    let optionsDict: Dictionary | null = null;
    let inputFormat: InputFormat | null = null;

    try {
      // Create options dictionary if options are provided
      if (options.options) {
        optionsDict = Dictionary.fromObject(options.options);
      }

      // Find input format if specified
      if (options.format) {
        inputFormat = InputFormat.findInputFormat(options.format);
        if (!inputFormat) {
          throw new Error(`Input format '${options.format}' not found`);
        }
      }

      if (typeof input === 'string') {
        // File path or URL - resolve relative paths to absolute
        // Skip path resolution for device inputs
        // Check if it's a URL (starts with protocol://) or a file path
        const isUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input);
        const resolvedInput = isUrl || inputFormat ? input : resolve(input);

        const ret = formatContext.openInputSync(resolvedInput, inputFormat, optionsDict);
        FFmpegError.throwIfError(ret, 'Failed to open input');
        formatContext.setFlags(AVFMT_FLAG_NONBLOCK);
      } else if (Buffer.isBuffer(input)) {
        // Validate buffer is not empty
        if (input.length === 0) {
          throw new Error('Cannot open media from empty buffer');
        }
        // From buffer - allocate context first for custom I/O
        formatContext.allocContext();
        ioContext = IOStream.create(input, { bufferSize: options.bufferSize });
        formatContext.pb = ioContext;
        const ret = formatContext.openInputSync('', inputFormat, optionsDict);
        FFmpegError.throwIfError(ret, 'Failed to open input from buffer');
      } else if (input instanceof IOContext) {
        if (!options.format) {
          throw new Error('Format must be specified for native IOContext input');
        }

        formatContext.allocContext();
        ioContext = input;
        externalIO = true;
        formatContext.pb = ioContext;
        formatContext.setFlags(AVFMT_FLAG_CUSTOM_IO);

        const ret = formatContext.openInputSync('', inputFormat, optionsDict);
        FFmpegError.throwIfError(ret, 'Failed to open input from native IOContext');
      } else if (input instanceof Readable) {
        // Readable stream - format is required
        if (!options.format) {
          throw new Error('Format must be specified for Readable stream input');
        }

        formatContext.allocContext();
        ioContext = IOStream.create(input, { bufferSize: options.bufferSize });
        formatContext.pb = ioContext;
        formatContext.setFlags(AVFMT_FLAG_CUSTOM_IO);

        const ret = formatContext.openInputSync('', inputFormat, optionsDict);
        FFmpegError.throwIfError(ret, 'Failed to open input from Readable stream');
      } else if (typeof input === 'object' && 'read' in input) {
        // Custom I/O with callbacks - format is required
        if (!options.format) {
          throw new Error('Format must be specified for custom I/O');
        }

        // Allocate context first for custom I/O
        formatContext.allocContext();

        // Setup custom I/O with callbacks
        ioContext = new IOContext();
        ioContext.allocContextWithCallbacks(options.bufferSize ?? IO_BUFFER_SIZE, 0, input.read, null, input.seek);
        formatContext.pb = ioContext;
        formatContext.setFlags(AVFMT_FLAG_CUSTOM_IO);

        const ret = formatContext.openInputSync('', inputFormat, optionsDict);
        FFmpegError.throwIfError(ret, 'Failed to open input from custom I/O');
      } else {
        throw new TypeError('Invalid input type. Expected file path, URL, Buffer, IOContext, Readable, or IOInputCallbacks');
      }

      // Find stream information
      if (!options.skipStreamInfo) {
        const ret = formatContext.findStreamInfoSync(null);
        FFmpegError.throwIfError(ret, 'Failed to find stream info');
      }

      options.configure?.(formatContext);

      // Determine buffer size
      let bufferSize = options.bufferSize ?? IO_BUFFER_SIZE;
      if (!ioContext && formatContext.iformat && formatContext.pb) {
        // Check if this is a streaming input (like RTSP, HTTP, etc.)
        const isStreaming = formatContext.pb.seekable === 0;
        if (isStreaming) {
          bufferSize *= 2; // double buffer size for streaming inputs
        }
      }

      // Apply defaults to options
      const fullOptions: Required<Omit<DemuxerOptions, 'signal' | 'configure'>> = {
        bufferSize,
        format: options.format ?? '',
        skipStreamInfo: options.skipStreamInfo ?? false,
        startWithKeyframe: options.startWithKeyframe ?? false,
        dtsDeltaThreshold: options.dtsDeltaThreshold ?? DELTA_THRESHOLD,
        dtsErrorThreshold: options.dtsErrorThreshold ?? DTS_ERROR_THRESHOLD,
        copyTs: options.copyTs ?? false,
        options: options.options ?? {},
      };

      const demuxer = new Demuxer(formatContext, fullOptions, ioContext, externalIO);

      if (options.signal) {
        options.signal.throwIfAborted();
        demuxer.signal = options.signal;
      }

      return demuxer;
    } catch (error) {
      // Clean up only on error
      if (ioContext) {
        // Clear the pb reference first
        formatContext.pb = null;
        // Release the IOContext (see open() for why dispose)
        if (externalIO) {
          ioContext[Symbol.dispose]();
        } else {
          ioContext.freeContext();
        }
      }
      // Clean up FormatContext
      formatContext.closeInputSync();
      throw error;
    } finally {
      // Clean up options dictionary
      if (optionsDict) {
        optionsDict.free();
      }
    }
  }

  /**
   * Open RTP/SRTP input stream via localhost UDP.
   *
   * Creates a Demuxer from SDP string received via UDP socket.
   * Opens UDP socket and configures FFmpeg to receive and parse RTP packets.
   *
   * @param sdpContent - SDP content string describing the RTP stream
   *
   * @throws {Error} If SDP parsing or socket setup fails
   *
   * @throws {FFmpegError} If FFmpeg operations fail
   *
   * @returns Promise with Demuxer, sendPacket function and cleanup
   *
   * @example
   * ```typescript
   * import { Demuxer, StreamingUtils } from 'node-av/api';
   * import { AV_CODEC_ID_OPUS } from 'node-av/constants';
   *
   * // Generate SDP for SRTP encrypted Opus
   * const sdp = StreamingUtils.createRTPInputSDP([{
   *   port: 5004,
   *   codecId: AV_CODEC_ID_OPUS,
   *   payloadType: 111,
   *   clockRate: 16000,
   *   channels: 1,
   *   srtp: { key: srtpKey, salt: srtpSalt }
   * }]);
   *
   * // Open RTP input
   * const { input, sendPacket, close } = await Demuxer.openSDP(sdp);
   *
   * // Route encrypted RTP packets from network
   * socket.on('message', (msg) => sendPacket(msg));
   *
   * // Decode audio
   * const decoder = await Decoder.create(input.audio()!);
   * for await (const packet of input.packets()) {
   *   const frame = await decoder.decode(packet);
   *   // Process frame...
   * }
   *
   * // Cleanup
   * await close();
   * ```
   *
   * @see {@link StreamingUtils.createInputSDP} to generate SDP content.
   */
  static async openSDP(sdpContent: string): Promise<RTPDemuxer> {
    // Extract all ports from SDP (supports multi-stream: video + audio)
    const ports = StreamingUtils.extractPortsFromSDP(sdpContent);
    if (ports.length === 0) {
      throw new Error('Failed to extract any ports from SDP content');
    }

    // Convert SDP to buffer for custom I/O
    const sdpBuffer = Buffer.from(sdpContent);
    let position = 0;

    // Create custom I/O callbacks for SDP content
    const callbacks: IOInputCallbacks = {
      read: (size: number) => {
        if (position >= sdpBuffer.length) {
          return null; // EOF
        }
        const chunk = sdpBuffer.subarray(position, Math.min(position + size, sdpBuffer.length));
        position += chunk.length;
        return chunk;
      },
      seek: (offset: bigint, whence: AVSeekWhence) => {
        const offsetNum = Number(offset);
        if (whence === AVSEEK_SET) {
          position = offsetNum;
        } else if (whence === AVSEEK_CUR) {
          position += offsetNum;
        } else if (whence === AVSEEK_END) {
          position = sdpBuffer.length + offsetNum;
        }
        return position;
      },
    };

    // Create UDP socket for sending packets to FFmpeg
    const udpSocket = createSocket('udp4');

    try {
      // Open Demuxer with SDP format using custom I/O
      const input = await Demuxer.open(callbacks, {
        format: 'sdp',
        skipStreamInfo: true,
        options: {
          protocol_whitelist: 'pipe,udp,rtp,file,crypto',
          listen_timeout: -1,
        },
      });

      const sendPacket = (rtpPacket: Buffer | RtpPacket, streamIndex = 0) => {
        const port = ports[streamIndex];
        if (!port) {
          throw new Error(`No port found for stream index ${streamIndex}. Available streams: ${ports.length}`);
        }
        const data = Buffer.isBuffer(rtpPacket) ? rtpPacket : rtpPacket.serialize();
        udpSocket.send(data, port, '127.0.0.1');
      };

      const close = async () => {
        await input.close();
        udpSocket.close();
      };

      const closeSync = () => {
        input.closeSync();
        udpSocket.close();
      };

      return { input, sendPacket, close, closeSync };
    } catch (error) {
      // Cleanup on error
      udpSocket.close();
      throw error;
    }
  }

  /**
   * Open RTP/SRTP input stream via localhost UDP synchronously.
   * Synchronous version of openSDP.
   *
   * Creates a Demuxer from SDP string received via UDP socket.
   * Opens UDP socket and configures FFmpeg to receive and parse RTP packets.
   *
   * @param sdpContent - SDP content string describing the RTP stream
   *
   * @throws {Error} If SDP parsing or socket setup fails
   *
   * @throws {FFmpegError} If FFmpeg operations fail
   *
   * @returns Object with Demuxer, sendPacket function and cleanup
   *
   * @example
   * ```typescript
   * import { Demuxer, StreamingUtils } from 'node-av/api';
   * import { AV_CODEC_ID_OPUS } from 'node-av/constants';
   *
   * // Generate SDP for SRTP encrypted Opus
   * const sdp = StreamingUtils.createRTPInputSDP([{
   *   port: 5004,
   *   codecId: AV_CODEC_ID_OPUS,
   *   payloadType: 111,
   *   clockRate: 16000,
   *   channels: 1,
   *   srtp: { key: srtpKey, salt: srtpSalt }
   * }]);
   *
   * // Open RTP input
   * const { input, sendPacket, closeSync } = Demuxer.openSDPSync(sdp);
   *
   * // Route encrypted RTP packets from network
   * socket.on('message', (msg) => sendPacket(msg));
   *
   * // Decode audio
   * const decoder = await Decoder.create(input.audio()!);
   * for await (const packet of input.packets()) {
   *   const frame = await decoder.decode(packet);
   *   // Process frame...
   * }
   *
   * // Cleanup synchronously
   * closeSync();
   * ```
   *
   * @see {@link StreamingUtils.createInputSDP} to generate SDP content.
   * @see {@link openSDP} For async version
   */
  static openSDPSync(sdpContent: string): RTPDemuxer {
    // Extract all ports from SDP (supports multi-stream: video + audio)
    const ports = StreamingUtils.extractPortsFromSDP(sdpContent);
    if (ports.length === 0) {
      throw new Error('Failed to extract any ports from SDP content');
    }

    // Convert SDP to buffer for custom I/O
    const sdpBuffer = Buffer.from(sdpContent);
    let position = 0;

    // Create custom I/O callbacks for SDP content
    const callbacks: IOInputCallbacks = {
      read: (size: number) => {
        if (position >= sdpBuffer.length) {
          return null; // EOF
        }
        const chunk = sdpBuffer.subarray(position, Math.min(position + size, sdpBuffer.length));
        position += chunk.length;
        return chunk;
      },
      seek: (offset: bigint, whence: AVSeekWhence) => {
        const offsetNum = Number(offset);
        if (whence === AVSEEK_SET) {
          position = offsetNum;
        } else if (whence === AVSEEK_CUR) {
          position += offsetNum;
        } else if (whence === AVSEEK_END) {
          position = sdpBuffer.length + offsetNum;
        }
        return position;
      },
    };

    // Create UDP socket for sending packets to FFmpeg
    const udpSocket = createSocket('udp4');

    try {
      // Open Demuxer with SDP format using custom I/O
      const input = Demuxer.openSync(callbacks, {
        format: 'sdp',
        skipStreamInfo: true,
        options: {
          protocol_whitelist: 'pipe,udp,rtp,file,crypto',
          listen_timeout: -1,
        },
      });

      const sendPacket = (rtpPacket: Buffer | RtpPacket, streamIndex = 0) => {
        const port = ports[streamIndex];
        if (!port) {
          throw new Error(`No port found for stream index ${streamIndex}. Available streams: ${ports.length}`);
        }
        const data = Buffer.isBuffer(rtpPacket) ? rtpPacket : rtpPacket.serialize();
        udpSocket.send(data, port, '127.0.0.1');
      };

      const close = async () => {
        await input.close();
        udpSocket.close();
      };

      const closeSync = () => {
        input.closeSync();
        udpSocket.close();
      };

      return { input, sendPacket, close, closeSync };
    } catch (error) {
      // Cleanup on error
      udpSocket.close();
      throw error;
    }
  }

  /**
   * Check if input is open.
   *
   * @example
   * ```typescript
   * if (!input.isInputOpen) {
   *   console.log('Input is not open');
   * }
   * ```
   */
  get isInputOpen(): boolean {
    return !this.isClosed;
  }

  /**
   * Get all streams in the media.
   *
   * @example
   * ```typescript
   * for (const stream of input.streams) {
   *   console.log(`Stream ${stream.index}: ${stream.codecpar.codecType}`);
   * }
   * ```
   */
  get streams(): Stream[] {
    return this._streams;
  }

  /**
   * Get media duration in seconds.
   *
   * Returns 0 if duration is unknown or not available or input is closed.
   *
   * @example
   * ```typescript
   * console.log(`Duration: ${input.duration} seconds`);
   * ```
   */
  get duration(): number {
    if (this.isClosed) {
      return 0;
    }

    const duration = this.formatContext.duration;
    if (!duration || duration <= 0) {
      return 0;
    }

    // Convert from AV_TIME_BASE (microseconds) to seconds
    return Number(duration) / 1000000;
  }

  /**
   * Get media start time in seconds.
   *
   * For device inputs (e.g., avfoundation), this reflects the system uptime
   * at capture start. Pass this value to `Muxer.open()` via the `startTime`
   * option to produce correct output timestamps.
   *
   * Returns 0 if start time is unknown or not available or input is closed.
   *
   * @example
   * ```typescript
   * await using input = await Demuxer.open(source);
   * await using output = await Muxer.open('output.mp4', { startTime: input.startTime });
   * ```
   */
  get startTime(): number {
    if (this.isClosed) {
      return 0;
    }

    const startTime = this.formatContext.startTime;
    if (!startTime || startTime <= 0n) {
      return 0;
    }

    // Convert from AV_TIME_BASE (microseconds) to seconds
    return Number(startTime) / 1000000;
  }

  /**
   * Get media bitrate in kilobits per second.
   *
   * Returns 0 if bitrate is unknown or not available or input is closed.
   *
   * @example
   * ```typescript
   * console.log(`Bitrate: ${input.bitRate} kbps`);
   * ```
   */
  get bitRate(): number {
    if (this.isClosed) {
      return 0;
    }

    const bitrate = this.formatContext.bitRate;
    if (!bitrate || bitrate <= 0) {
      return 0;
    }

    // Convert from bits per second to kilobits per second
    return Number(bitrate) / 1000;
  }

  /**
   * Get media metadata.
   *
   * Returns all metadata tags as key-value pairs.
   *
   * @example
   * ```typescript
   * const metadata = input.metadata;
   * console.log(`Title: ${metadata.title}`);
   * console.log(`Artist: ${metadata.artist}`);
   * ```
   */
  get metadata(): Record<string, string> {
    if (this.isClosed) {
      return {};
    }

    return this.formatContext.metadata?.getAll() ?? {};
  }

  /**
   * Get format name.
   *
   * Returns 'unknown' if input is closed or format is not available.
   *
   * @example
   * ```typescript
   * console.log(`Format: ${input.formatName}`); // "mov,mp4,m4a,3gp,3g2,mj2"
   * ```
   */
  get formatName(): string {
    if (this.isClosed) {
      return 'unknown';
    }

    return this.formatContext.iformat?.name ?? 'unknown';
  }

  /**
   * Get format long name.
   *
   * Returns 'Unknown Format' if input is closed or format is not available.
   *
   * @example
   * ```typescript
   * console.log(`Format: ${input.formatLongName}`); // "QuickTime / MOV"
   * ```
   */
  get formatLongName(): string {
    if (this.isClosed) {
      return 'Unknown Format';
    }

    return this.formatContext.iformat?.longName ?? 'Unknown Format';
  }

  /**
   * Get MIME type of the input format.
   *
   * Returns null if input is closed or format is not available.
   *
   * @example
   * ```typescript
   * console.log(`MIME Type: ${input.mimeType}`); // "video/mp4"
   * ```
   */
  get mimeType(): string | null {
    if (this.isClosed) {
      return null;
    }

    return this.formatContext.iformat?.mimeType ?? null;
  }

  /**
   * Get input stream by index.
   *
   * Returns the stream at the specified index.
   *
   * @param index - Stream index
   *
   * @returns Stream or undefined if index is invalid
   *
   * @example
   * ```typescript
   * const input = await Demuxer.open('input.mp4');
   *
   * // Get the input stream to inspect codec parameters
   * const stream = input.getStream(1); // Get stream at index 1
   * if (stream) {
   *   console.log(`Input codec: ${stream.codecpar.codecId}`);
   * }
   * ```
   *
   * @see {@link video} For getting video streams
   * @see {@link audio} For getting audio streams
   */
  getStream(index: number): Stream | undefined {
    const streams = this.formatContext.streams;
    if (!streams || index < 0 || index >= streams.length) {
      return undefined;
    }
    return streams[index];
  }

  /**
   * Get video stream by index.
   *
   * Returns the nth video stream (0-based index).
   * Returns undefined if stream doesn't exist.
   *
   * @param index - Video stream index (default: 0)
   *
   * @returns Video stream or undefined
   *
   * @example
   * ```typescript
   * const videoStream = input.video();
   * if (videoStream) {
   *   console.log(`Video: ${videoStream.codecpar.width}x${videoStream.codecpar.height}`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Get second video stream
   * const secondVideo = input.video(1);
   * ```
   *
   * @see {@link audio} For audio streams
   * @see {@link findBestStream} For automatic selection
   */
  video(index = 0): Stream | undefined {
    const streams = this._streams.filter((s) => s.codecpar.codecType === AVMEDIA_TYPE_VIDEO);
    return streams[index];
  }

  /**
   * Get audio stream by index.
   *
   * Returns the nth audio stream (0-based index).
   * Returns undefined if stream doesn't exist.
   *
   * @param index - Audio stream index (default: 0)
   *
   * @returns Audio stream or undefined
   *
   * @example
   * ```typescript
   * const audioStream = input.audio();
   * if (audioStream) {
   *   console.log(`Audio: ${audioStream.codecpar.sampleRate}Hz`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Get second audio stream
   * const secondAudio = input.audio(1);
   * ```
   *
   * @see {@link video} For video streams
   * @see {@link findBestStream} For automatic selection
   */
  audio(index = 0): Stream | undefined {
    const streams = this._streams.filter((s) => s.codecpar.codecType === AVMEDIA_TYPE_AUDIO);
    return streams[index];
  }

  /**
   * Get input format details.
   *
   * Returns null if input is closed or format is not available.
   *
   * @returns Input format or null
   *
   * @example
   * ```typescript
   * const inputFormat = input.inputFormat;
   * if (inputFormat) {
   *   console.log(`Input Format: ${inputFormat.name}`);
   * }
   * ```
   */
  inputFormat(): InputFormat | null {
    return this.formatContext.iformat;
  }

  /**
   * Find the best stream of a given type.
   *
   * Uses FFmpeg's stream selection algorithm.
   * Considers codec support, default flags, and quality.
   *
   * Direct mapping to av_find_best_stream().
   *
   * @param type - Media type to find
   *
   * @returns Best stream or undefined if not found or input is closed
   *
   * @example
   * ```typescript
   * import { AVMEDIA_TYPE_VIDEO } from 'node-av/constants';
   *
   * const bestVideo = input.findBestStream(AVMEDIA_TYPE_VIDEO);
   * if (bestVideo) {
   *   const decoder = await Decoder.create(bestVideo);
   * }
   * ```
   *
   * @see {@link video} For direct video stream access
   * @see {@link audio} For direct audio stream access
   */
  findBestStream(type: AVMediaType): Stream | undefined {
    if (this.isClosed) {
      return undefined;
    }

    const bestStreamIndex = this.formatContext.findBestStream(type);
    return this._streams.find((s) => s.index === bestStreamIndex);
  }

  /**
   * Read packets from media as async generator.
   *
   * Yields demuxed packets for processing.
   * Automatically handles packet memory management.
   * Optionally filters packets by stream index.
   *
   * **Supports parallel generators**: Multiple `packets()` iterators can run concurrently.
   * When multiple generators are active, an internal demux thread automatically handles
   * packet distribution to avoid race conditions.
   *
   * Direct mapping to av_read_frame().
   *
   * @param index - Optional stream index to filter
   *
   * @yields {Packet} Demuxed packets (must be freed by caller)
   *
   * @throws {FFmpegError} If reading fails with an error other than EOF (e.g. I/O failure
   * or a dropped network source) - only a real end-of-file ends the stream cleanly
   *
   * @throws {Error} If packet cloning fails
   *
   * @example
   * ```typescript
   * // Read all packets
   * for await (const packet of input.packets()) {
   *   console.log(`Packet: stream=${packet.streamIndex}, pts=${packet.pts}`);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Read only video packets
   * const videoStream = input.video();
   * for await (const packet of input.packets(videoStream.index)) {
   *   // Process video packet
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Parallel processing of video and audio streams
   * const videoGen = input.packets(videoStream.index);
   * const audioGen = input.packets(audioStream.index);
   *
   * await Promise.all([
   *   (async () => {
   *     for await (const packet of videoGen) {
   *       // Process video
   *       packet.free();
   *     }
   *   })(),
   *   (async () => {
   *     for await (const packet of audioGen) {
   *       // Process audio
   *       packet.free();
   *     }
   *   })()
   * ]);
   * ```
   *
   * @see {@link Decoder.frames} For decoding packets
   */
  async *packets(index?: number): AsyncGenerator<Packet | null> {
    // Register this generator
    this.activeGenerators++;
    const queueKey = index ?? 'all';

    // Initialize queue for this generator and count it as a consumer of the key.
    if (!this.packetQueues.has(queueKey)) {
      this.packetQueues.set(queueKey, []);
    }
    this.packetQueueConsumers.set(queueKey, (this.packetQueueConsumers.get(queueKey) ?? 0) + 1);

    // Always start demux thread (handles single and multiple generators)
    this.startDemuxThread();

    try {
      let hasSeenKeyframe = !this.options.startWithKeyframe;

      // Read from queue (demux thread is handling av_read_frame)
      const queue = this.packetQueues.get(queueKey)!;

      while (!this.isClosed) {
        if (this.signal?.aborted) {
          break;
        }

        // Try to get packet from queue
        let packet = queue.shift();

        // If queue is empty, wait for next packet
        if (!packet) {
          // Queue drained - check for end of stream. Buffered packets always
          // drain before EOF/error is honored, so successfully read data is
          // never dropped.
          if (this.demuxEof) {
            // The read loop ended with a real error (not EOF): propagate it
            // instead of ending the stream silently - a dead live source must
            // be distinguishable from a finished file.
            if (this.lastError) {
              throw this.lastError;
            }
            break; // End of stream
          }

          // Create promise and register resolver. Multiple consumers may wait
          // on the same queue key concurrently, so resolvers are collected per
          // key - a single slot would be overwritten by the second consumer,
          // parking the first one forever (whole-demuxer deadlock).
          const { promise, resolve } = Promise.withResolvers<void>();
          const resolvers = this.queueResolvers.get(queueKey);
          if (resolvers) {
            resolvers.push(resolve);
          } else {
            this.queueResolvers.set(queueKey, [resolve]);
          }

          // Wait for demux thread to add packet
          await promise;

          // Check for abort after wakeup
          if (this.signal?.aborted) {
            break;
          }

          packet = queue.shift();
          if (!packet) {
            // Woken without a packet for us - either EOF/error or another
            // consumer grabbed it. Loop back and re-evaluate.
            if (this.demuxEof) {
              if (this.lastError) {
                throw this.lastError;
              }
              break;
            }
            continue;
          }
        }

        // Apply keyframe filtering if needed
        if (!hasSeenKeyframe) {
          const stream = this._streams[packet.streamIndex];
          const isVideoStream = stream?.codecpar.codecType === AVMEDIA_TYPE_VIDEO;

          if (isVideoStream && packet.isKeyframe) {
            hasSeenKeyframe = true;
          } else if (isVideoStream && !packet.isKeyframe) {
            packet.free();
            continue;
          }
        }

        yield packet;
      }
    } finally {
      // Unregister this generator
      this.activeGenerators--;

      // Drop this consumer from its queue key. When the last consumer of a key
      // leaves, remove the queue so the demux thread stops treating it as a
      // backpressure target - otherwise a full queue whose consumer has already
      // stopped would block the read loop forever and starve the other streams
      // (teardown deadlock with multi-stream pipelines). Free any buffered packets.
      const remaining = (this.packetQueueConsumers.get(queueKey) ?? 1) - 1;
      if (remaining <= 0) {
        this.packetQueueConsumers.delete(queueKey);
        const abandoned = this.packetQueues.get(queueKey);
        this.packetQueues.delete(queueKey);
        if (abandoned) {
          for (const p of abandoned) {
            p.free();
          }
        }
      } else {
        this.packetQueueConsumers.set(queueKey, remaining);
      }

      // Stop demux thread if no more generators
      if (this.activeGenerators === 0) {
        await this.stopDemuxThread();
      }
    }

    // Only reached when the loop ended naturally (EOF, abort, close). A consumer
    // break resumes inside the finally above and completes the generator there -
    // yielding from the finally would suspend forever inside iterator.return(),
    // violating the iterator protocol.
    this.signal?.throwIfAborted();
    yield null; // Signal EOF
  }

  /**
   * Read packets from media as generator synchronously.
   * Synchronous version of packets.
   *
   * Yields demuxed packets for processing.
   * Automatically handles packet memory management.
   * Optionally filters packets by stream index.
   *
   * Direct mapping to av_read_frame().
   *
   * @param index - Optional stream index to filter
   *
   * @yields {Packet} Demuxed packets (must be freed by caller)
   *
   * @throws {FFmpegError} If reading fails with an error other than EOF (e.g. I/O failure
   * or a dropped network source) - only a real end-of-file ends the stream cleanly
   *
   * @throws {Error} If packet cloning fails
   *
   * @example
   * ```typescript
   * // Read all packets
   * for (const packet of input.packetsSync()) {
   *   console.log(`Packet: stream=${packet.streamIndex}, pts=${packet.pts}`);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Read only video packets
   * const videoStream = input.video();
   * for (const packet of input.packetsSync(videoStream.index)) {
   *   // Process video packet
   *   packet.free();
   * }
   * ```
   *
   * @see {@link packets} For async version
   */
  *packetsSync(index?: number): Generator<Packet | null> {
    using packet = new Packet();
    packet.alloc();
    let hasSeenKeyframe = !this.options.startWithKeyframe;

    while (!this.isClosed) {
      const ret = this.formatContext.readFrameSync(packet);
      if (ret < 0) {
        // No data available yet (live device capture) - blocking retry
        if (ret === AVERROR_EAGAIN) {
          Atomics.wait(SYNC_SLEEP_SIGNAL, 0, 0, 10);
          continue;
        }
        // Real read errors propagate; end-of-file and a deliberate
        // interrupt() (AVERROR_EXIT) end cleanly
        if (!FFmpegError.is(ret, AVERROR_EOF) && !FFmpegError.is(ret, AVERROR_EXIT)) {
          throw new FFmpegError(ret);
        }
        break;
      }

      // Get stream for timestamp processing
      const stream = this._streams[packet.streamIndex];
      if (stream) {
        // Set packet timebase to stream timebase
        // This must be done BEFORE any timestamp processing
        packet.timeBase = stream.timeBase;

        // Apply timestamp processing
        // 1. PTS wrap-around correction
        this.ptsWrapAroundCorrection(packet, stream);
        // 2. Timestamp discontinuity processing
        this.timestampDiscontinuityProcess(packet, stream);
        // 3. DTS prediction/update
        this.dtsPredict(packet, stream);
      }

      if (index === undefined || packet.streamIndex === index) {
        // If startWithKeyframe is enabled, skip packets until we see a keyframe
        // Only apply to video streams - audio packets should always pass through
        if (!hasSeenKeyframe) {
          const stream = this._streams[packet.streamIndex];
          const isVideoStream = stream?.codecpar.codecType === AVMEDIA_TYPE_VIDEO;

          if (isVideoStream && packet.isKeyframe) {
            hasSeenKeyframe = true;
          } else if (isVideoStream && !packet.isKeyframe) {
            // Skip video P-frames until first keyframe
            packet.unref();
            continue;
          }
          // Non-video streams (audio, etc.) always pass through
        }

        // Clone the packet for the user
        // This creates a new Packet object that shares the same data buffer
        // through reference counting. The data won't be freed until both
        // the original and the clone are unreferenced.
        const cloned = packet.clone();
        if (!cloned) {
          throw new Error('Failed to clone packet (out of memory)');
        }
        yield cloned;
      }

      // Unreference the original packet's data buffer
      // This allows us to reuse the packet object for the next readFrame()
      // The data itself is still alive because the clone has a reference
      packet.unref();
    }

    // Signal EOF
    yield null;
  }

  /**
   * Seek to timestamp in media.
   *
   * Seeks to the specified position in seconds.
   * Can seek in specific stream or globally.
   *
   * Direct mapping to av_seek_frame().
   *
   * @param timestamp - Target position in seconds
   *
   * @param streamIndex - Stream index or -1 for global (default: -1)
   *
   * @param flags - Seek flags (default: AVFLAG_NONE)
   *
   * @returns 0 on success, negative on error
   *
   * @throws {Error} If input is closed
   *
   * @example
   * ```typescript
   * // Seek to 30 seconds
   * const ret = await input.seek(30);
   * FFmpegError.throwIfError(ret, 'seek failed');
   * ```
   *
   * @example
   * ```typescript
   * import { AVSEEK_FLAG_BACKWARD } from 'node-av/constants';
   *
   * // Seek to keyframe before 60 seconds
   * await input.seek(60, -1, AVSEEK_FLAG_BACKWARD);
   * ```
   *
   * @see {@link AVSeekFlag} For seek flags
   */
  async seek(timestamp: number, streamIndex = -1, flags: AVSeekFlag = AVFLAG_NONE): Promise<number> {
    this.signal?.throwIfAborted();

    if (this.isClosed) {
      throw new Error('Cannot seek on closed input');
    }

    // Convert seconds to AV_TIME_BASE
    const ts = BigInt(Math.floor(timestamp * 1000000));
    return this.formatContext.seekFrame(streamIndex, ts, flags);
  }

  /**
   * Seek to timestamp in media synchronously.
   * Synchronous version of seek.
   *
   * Seeks to the specified position in seconds.
   * Can seek in specific stream or globally.
   *
   * Direct mapping to av_seek_frame().
   *
   * @param timestamp - Target position in seconds
   *
   * @param streamIndex - Stream index or -1 for global (default: -1)
   *
   * @param flags - Seek flags (default: AVFLAG_NONE)
   *
   * @returns 0 on success, negative on error
   *
   * @throws {Error} If input is closed
   *
   * @example
   * ```typescript
   * // Seek to 30 seconds
   * const ret = input.seekSync(30);
   * FFmpegError.throwIfError(ret, 'seek failed');
   * ```
   *
   * @example
   * ```typescript
   * import { AVSEEK_FLAG_BACKWARD } from 'node-av/constants';
   *
   * // Seek to keyframe before 60 seconds
   * input.seekSync(60, -1, AVSEEK_FLAG_BACKWARD);
   * ```
   *
   * @see {@link seek} For async version
   */
  seekSync(timestamp: number, streamIndex = -1, flags: AVSeekFlag = AVFLAG_NONE): number {
    if (this.isClosed) {
      throw new Error('Cannot seek on closed input');
    }

    // Convert seconds to AV_TIME_BASE
    const ts = BigInt(Math.floor(timestamp * 1000000));
    return this.formatContext.seekFrameSync(streamIndex, ts, flags);
  }

  /**
   * Interrupt a blocking read without closing the demuxer.
   *
   * Aborts any in-progress `av_read_frame()` (e.g. on a quiet RTSP/network source
   * that is waiting for data) and signals end-of-stream to packet consumers, so
   * an active pipeline can drain and finish. The demuxer is not freed and its
   * streams stay valid - call {@link close} afterwards to release resources.
   *
   * Mainly used by pipeline teardown: a blocking read only unblocks on close, but
   * closing while the pipeline is still draining would free the context too early,
   * so the read is interrupted first and the input closed once processing settles.
   *
   * @example
   * ```typescript
   * control.stop();
   * input.interrupt();        // unblock a stalled read so completion can resolve
   * await control.completion;
   * await input.close();
   * ```
   *
   * @see {@link close} To close and free the demuxer
   */
  interrupt(): void {
    if (this.isClosed) {
      return;
    }
    // Abort the native blocking read so readFrame() returns immediately.
    this.formatContext.interrupt();
    // Signal EOF to consumers and wake any generator parked on an empty queue.
    this.demuxEof = true;
    for (const resolvers of this.queueResolvers.values()) {
      for (const resolve of resolvers) {
        resolve();
      }
    }
    this.queueResolvers.clear();
  }

  /**
   * Start the internal demux thread for handling multiple parallel packet generators.
   * This thread reads packets from the format context and distributes them to queues.
   *
   * @internal
   */
  private startDemuxThread(): void {
    if (this.demuxThreadActive || this.demuxThread) {
      return; // Already running
    }

    this.demuxThreadActive = true;

    if (this.signal && !this.signalCleanup) {
      const handler = () => {
        this.demuxThreadActive = false;
        // Abort the native blocking read too - setting the flag alone leaves the
        // demux thread parked in av_read_frame() until data happens to arrive.
        // interrupt() also signals EOF and wakes the resolvers below.
        this.interrupt();
      };
      this.signal.addEventListener('abort', handler, { once: true });
      this.signalCleanup = () => this.signal?.removeEventListener('abort', handler);
    }

    this.demuxThread = (async () => {
      using packet = new Packet();
      packet.alloc();

      while (this.demuxThreadActive && !this.isClosed) {
        // Read next packet
        const ret = await this.formatContext.readFrame(packet);

        // IMPORTANT: Check isClosed again after await - the demuxer may have been
        // closed while we were waiting for readFrame(). If closed, the native
        // AVStreams have been freed and accessing them would cause use-after-free!
        if (this.isClosed) {
          break;
        }

        if (ret < 0) {
          // EAGAIN means no data available yet (common with live device capture)
          // Retry after a short delay instead of treating as EOF
          // Matches FFmpeg CLI behavior: av_usleep(10000) in ffmpeg_demux.c
          if (ret === AVERROR_EAGAIN) {
            await new Promise((resolve) => setTimeout(resolve, 10));
            continue;
          }
          // Anything but a genuine end-of-file is a real read error (I/O
          // failure, dropped network source, ...). Store it so consumers throw
          // instead of seeing a clean EOF - matching FFmpeg CLI, where a read
          // error ends processing with a failure, not a normal finish.
          // AVERROR_EXIT is exempt: it is how interrupt() aborts a blocking
          // read on purpose (pipeline stop/teardown), not a source failure.
          if (!FFmpegError.is(ret, AVERROR_EOF) && !FFmpegError.is(ret, AVERROR_EXIT)) {
            this.lastError = new FFmpegError(ret);
          }
          // End of stream (or error) - notify all waiting consumers
          this.demuxEof = true;
          for (const resolvers of this.queueResolvers.values()) {
            for (const resolve of resolvers) {
              resolve();
            }
          }
          this.queueResolvers.clear();
          break;
        }

        // Get stream for timestamp processing
        const stream = this._streams[packet.streamIndex];
        if (stream) {
          packet.timeBase = stream.timeBase;
          this.ptsWrapAroundCorrection(packet, stream);
          this.timestampDiscontinuityProcess(packet, stream);
          this.dtsPredict(packet, stream);
        }

        // Find which queues need this packet. Select by existence, not by
        // fullness: each consumer registers a queue for its stream and needs
        // EVERY packet of that stream. Only streams with no registered consumer
        // (e.g. a subtitle track absent from the pipeline) are skipped here.
        const allQueue = this.packetQueues.get('all');
        const streamQueue = this.packetQueues.get(packet.streamIndex);

        const targetQueues: { queue: Packet[]; key: number | 'all'; event: string }[] = [];

        if (allQueue) {
          targetQueues.push({ queue: allQueue, key: 'all', event: 'packet-all' });
        }

        // Only add stream queue if it's different from 'all' queue
        if (streamQueue && streamQueue !== allQueue) {
          targetQueues.push({ queue: streamQueue, key: packet.streamIndex, event: `packet-${packet.streamIndex}` });
        }

        if (targetQueues.length === 0) {
          // No consumer for this stream, skip it
          packet.unref();
          continue;
        }

        // Backpressure: if a target queue is full, wait until the consumer drains
        // it instead of dropping the packet. Dropping loses reference frames and
        // corrupts decoding (e.g. H.264 "missing reference picture") - the bug
        // that surfaced with multi-stream pipelines where one stream (video)
        // decodes slower than the other (audio). The read loop is paced by the
        // slowest consumer; faster consumers simply idle on an empty queue.
        //
        // Only wait on queues whose consumer is still live: when a generator stops
        // it removes its queue from packetQueues, so `get(key) !== target.queue`
        // means that consumer is gone - skip it instead of blocking forever, which
        // would starve the other streams and deadlock teardown.
        let abandoned = false;
        while (this.demuxThreadActive && !this.isClosed) {
          let queueFull = false;
          let anyLive = false;
          for (const target of targetQueues) {
            if (this.packetQueues.get(target.key) !== target.queue) {
              continue; // consumer gone - do not block on its queue
            }
            anyLive = true;
            if (target.queue.length >= MAX_INPUT_QUEUE_SIZE) {
              queueFull = true;
              break;
            }
          }
          if (!anyLive) {
            // Every target's consumer has stopped - drop this packet.
            abandoned = true;
            break;
          }
          if (!queueFull) {
            break;
          }
          await new Promise(setImmediate);
        }

        if (abandoned || !this.demuxThreadActive || this.isClosed) {
          packet.unref();
          if (abandoned) {
            continue;
          }
          break;
        }

        // Distribute to every live target queue. Each gets its own clone, which
        // shares the data buffer via reference counting. Skip any consumer that
        // vanished during the backpressure wait so its clone is not leaked into
        // an orphaned queue.
        for (const target of targetQueues) {
          if (this.packetQueues.get(target.key) !== target.queue) {
            continue; // consumer gone
          }
          const clone = packet.clone();
          if (!clone) {
            throw new Error('Failed to clone packet in demux thread (out of memory)');
          }
          target.queue.push(clone);
          // Wake every consumer waiting on this key - only one gets the packet,
          // the others re-park, but a lost wakeup would deadlock them.
          const resolvers = this.queueResolvers.get(target.key);
          if (resolvers) {
            this.queueResolvers.delete(target.key);
            for (const resolve of resolvers) {
              resolve();
            }
          }
        }

        packet.unref();
      }

      this.demuxThreadActive = false;
    })();
  }

  /**
   * Stop the internal demux thread.
   *
   * @internal
   */
  private async stopDemuxThread(): Promise<void> {
    this.demuxThreadActive = false;
    this.demuxEof = true;

    // Wake up any waiting generators
    for (const resolvers of this.queueResolvers.values()) {
      for (const resolve of resolvers) {
        resolve();
      }
    }
    this.queueResolvers.clear();

    // Wait for demux thread with timeout to avoid hanging on blocked reads
    if (this.demuxThread) {
      const threadPromise = this.demuxThread;
      let timer: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 2000);
        timer.unref();
      });
      await Promise.race([threadPromise, timeoutPromise]);
      clearTimeout(timer!);
      this.demuxThread = null;
    }

    // Clear all queues
    for (const queue of this.packetQueues.values()) {
      for (const packet of queue) {
        packet.free();
      }
      queue.length = 0;
    }
    this.packetQueues.clear();
  }

  /**
   * Get or create stream state for timestamp processing.
   *
   * @param streamIndex - Stream index
   *
   * @returns Stream state
   *
   * @internal
   */
  private getStreamState(streamIndex: number): StreamState {
    let state = this.streamStates.get(streamIndex);
    if (!state) {
      state = {
        wrapCorrectionDone: false,
        sawFirstTs: false,
        firstDts: AV_NOPTS_VALUE,
        nextDts: AV_NOPTS_VALUE,
        dts: AV_NOPTS_VALUE,
      };
      this.streamStates.set(streamIndex, state);
    }
    return state;
  }

  /**
   * PTS Wrap-Around Correction.
   *
   * Based on FFmpeg's ts_fixup().
   *
   * Corrects timestamp wrap-around for streams with limited timestamp bits.
   * DVB streams typically use 31-bit timestamps that wrap around.
   * Without correction, timestamps become negative causing playback errors.
   *
   * Handles:
   * - Detects wrap-around based on pts_wrap_bits from stream
   * - Applies correction once per stream
   * - Corrects both PTS and DTS
   *
   * @param packet - Packet to correct
   *
   * @param stream - Stream metadata
   *
   * @internal
   */
  private ptsWrapAroundCorrection(packet: Packet, stream: Stream): void {
    const state = this.getStreamState(packet.streamIndex);

    // Already corrected or no wrap bits configured
    if (state.wrapCorrectionDone || stream.ptsWrapBits >= 64) {
      return;
    }

    const startTime = this.formatContext.startTime;
    if (startTime === AV_NOPTS_VALUE) {
      return;
    }

    const ptsWrapBits = stream.ptsWrapBits;

    // Rescale start_time to packet's timebase
    // Note: packet.timeBase was set to stream.timeBase in packets() generator
    const stime = avRescaleQ(startTime, AV_TIME_BASE_Q, packet.timeBase);
    const stime2 = stime + (1n << BigInt(ptsWrapBits));

    state.wrapCorrectionDone = true;

    const wrapThreshold = stime + (1n << BigInt(ptsWrapBits - 1));

    // Check DTS for wrap-around
    if (stime2 > stime && packet.dts !== AV_NOPTS_VALUE && packet.dts > wrapThreshold) {
      packet.dts -= 1n << BigInt(ptsWrapBits);
      state.wrapCorrectionDone = false; // May wrap again
    }

    // Check PTS for wrap-around
    if (stime2 > stime && packet.pts !== AV_NOPTS_VALUE && packet.pts > wrapThreshold) {
      packet.pts -= 1n << BigInt(ptsWrapBits);
      state.wrapCorrectionDone = false; // May wrap again
    }
  }

  /**
   * DTS Prediction and Update.
   *
   * Based on FFmpeg's ist_dts_update().
   *
   * Predicts next expected DTS for frame ordering validation and discontinuity detection.
   * Uses codec-specific logic:
   * - Audio: Based on sample_rate and frame_size
   * - Video: Based on framerate or duration
   *
   * Handles:
   * - First timestamp initialization
   * - Codec-specific duration calculation
   * - DTS sequence tracking
   *
   * @param packet - Packet to process
   *
   * @param stream - Stream metadata
   *
   * @internal
   */
  private dtsPredict(packet: Packet, stream: Stream): void {
    const state = this.getStreamState(packet.streamIndex);

    // Call native implementation with native objects
    const newState = nativeDtsPredict(packet, stream, {
      sawFirstTs: state.sawFirstTs,
      dts: state.dts,
      nextDts: state.nextDts,
      firstDts: state.firstDts,
    });

    // Update state with results
    state.sawFirstTs = newState.sawFirstTs;
    state.dts = newState.dts;
    state.nextDts = newState.nextDts;
    state.firstDts = newState.firstDts;
  }

  /**
   * Timestamp Discontinuity Detection.
   *
   * Based on FFmpeg's ts_discontinuity_detect().
   *
   * Detects and corrects timestamp discontinuities in streams.
   * Handles two cases:
   * - Discontinuous formats (MPEG-TS): Apply offset correction
   * - Continuous formats (MP4): Mark timestamps as invalid
   *
   * Handles:
   * - Format-specific discontinuity handling (AVFMT_TS_DISCONT flag)
   * - PTS wrap-around detection for streams with limited timestamp bits
   * - Intra-stream discontinuity detection
   * - Inter-stream discontinuity detection
   * - Offset accumulation and application
   * - copyTs mode with selective correction
   *
   * @param packet - Packet to check for discontinuities
   *
   * @param stream - Stream metadata
   *
   * @internal
   */
  private timestampDiscontinuityDetect(packet: Packet, stream: Stream): void {
    const state = this.getStreamState(packet.streamIndex);
    const inputFormat = this.formatContext.iformat;

    // Check if format declares timestamp discontinuities
    const fmtIsDiscont = !!(inputFormat && inputFormat.flags & AVFMT_TS_DISCONT);

    // Disable correction when copyTs is enabled
    let disableDiscontinuityCorrection = this.options.copyTs;

    // Rescale packet DTS to AV_TIME_BASE for comparison
    const pktDts = avRescaleQRnd(packet.dts, packet.timeBase, AV_TIME_BASE_Q, AV_ROUND_NEAR_INF | AV_ROUND_PASS_MINMAX);

    // PTS wrap-around detection
    // Only applies when copyTs is enabled and stream has limited timestamp bits
    if (this.options.copyTs && state.nextDts !== AV_NOPTS_VALUE && fmtIsDiscont && stream.ptsWrapBits < 60) {
      // Calculate wrapped DTS by adding 2^pts_wrap_bits to packet DTS
      const wrapDts = avRescaleQRnd(packet.dts + (1n << BigInt(stream.ptsWrapBits)), packet.timeBase, AV_TIME_BASE_Q, AV_ROUND_NEAR_INF | AV_ROUND_PASS_MINMAX);

      // If wrapped DTS is closer to predicted nextDts, enable correction
      const wrapDelta = wrapDts > state.nextDts ? wrapDts - state.nextDts : state.nextDts - wrapDts;
      const normalDelta = pktDts > state.nextDts ? pktDts - state.nextDts : state.nextDts - pktDts;

      if (wrapDelta < normalDelta / 10n) {
        disableDiscontinuityCorrection = false;
      }
    }

    // Intra-stream discontinuity detection
    if (state.nextDts !== AV_NOPTS_VALUE && !disableDiscontinuityCorrection) {
      const delta = pktDts - state.nextDts;

      if (fmtIsDiscont) {
        // Discontinuous format (e.g., MPEG-TS) - apply offset correction
        const threshold = BigInt(this.options.dtsDeltaThreshold) * BigInt(AV_TIME_BASE);

        if (delta > threshold || delta < -threshold || pktDts + BigInt(AV_TIME_BASE) / 10n < state.dts) {
          this.tsOffsetDiscont -= delta;

          // Apply correction to packet
          const deltaInPktTb = avRescaleQ(delta, AV_TIME_BASE_Q, packet.timeBase);
          packet.dts -= deltaInPktTb;
          if (packet.pts !== AV_NOPTS_VALUE) {
            packet.pts -= deltaInPktTb;
          }
        }
      } else {
        // Continuous format (e.g., MP4) - mark invalid timestamps
        const threshold = BigInt(this.options.dtsErrorThreshold) * BigInt(AV_TIME_BASE);

        // Check DTS
        if (delta > threshold || delta < -threshold) {
          packet.dts = AV_NOPTS_VALUE;
        }

        // Check PTS
        if (packet.pts !== AV_NOPTS_VALUE) {
          const pktPts = avRescaleQ(packet.pts, packet.timeBase, AV_TIME_BASE_Q);
          const ptsDelta = pktPts - state.nextDts;
          if (ptsDelta > threshold || ptsDelta < -threshold) {
            packet.pts = AV_NOPTS_VALUE;
          }
        }
      }
    } else if (state.nextDts === AV_NOPTS_VALUE && !this.options.copyTs && fmtIsDiscont && this.lastTs !== AV_NOPTS_VALUE) {
      // Inter-stream discontinuity detection
      const delta = pktDts - this.lastTs;
      const threshold = BigInt(this.options.dtsDeltaThreshold) * BigInt(AV_TIME_BASE);

      if (delta > threshold || delta < -threshold) {
        this.tsOffsetDiscont -= delta;

        // Apply correction to packet
        const deltaInPktTb = avRescaleQ(delta, AV_TIME_BASE_Q, packet.timeBase);
        packet.dts -= deltaInPktTb;
        if (packet.pts !== AV_NOPTS_VALUE) {
          packet.pts -= deltaInPktTb;
        }
      }
    }

    // Update last timestamp
    this.lastTs = avRescaleQ(packet.dts, packet.timeBase, AV_TIME_BASE_Q);
  }

  /**
   * Timestamp Discontinuity Processing - main entry point.
   *
   * Based on FFmpeg's ts_discontinuity_process().
   *
   * Applies accumulated discontinuity offset and detects new discontinuities.
   * Must be called for every packet before other timestamp processing.
   *
   * Handles:
   * - Applying previously-detected offset to all streams
   * - Detecting new discontinuities for audio/video streams
   *
   * @param packet - Packet to process
   *
   * @param stream - Stream metadata
   *
   * @internal
   */
  private timestampDiscontinuityProcess(packet: Packet, stream: Stream): void {
    // Apply previously-detected discontinuity offset
    // This applies to ALL streams, not just audio/video
    const offset = avRescaleQ(this.tsOffsetDiscont, AV_TIME_BASE_Q, packet.timeBase);
    if (packet.dts !== AV_NOPTS_VALUE) {
      packet.dts += offset;
    }
    if (packet.pts !== AV_NOPTS_VALUE) {
      packet.pts += offset;
    }

    // Detect new timestamp discontinuities for audio/video
    const par = stream.codecpar;
    if ((par.codecType === AVMEDIA_TYPE_VIDEO || par.codecType === AVMEDIA_TYPE_AUDIO) && packet.dts !== AV_NOPTS_VALUE) {
      this.timestampDiscontinuityDetect(packet, stream);
    }
  }

  /**
   * Close demuxer and free resources.
   *
   * Releases format context and I/O context.
   * Safe to call multiple times.
   * Automatically called by Symbol.asyncDispose.
   *
   * Direct mapping to avformat_close_input().
   *
   * @example
   * ```typescript
   * const input = await Demuxer.open('video.mp4');
   * try {
   *   // Use input
   * } finally {
   *   await input.close();
   * }
   * ```
   *
   * @see {@link Symbol.asyncDispose} For automatic cleanup
   */
  async close(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;

    // Clean up abort signal listener
    this.signalCleanup?.();
    this.signalCleanup = undefined;

    // Signal demux thread to stop FIRST
    this.demuxThreadActive = false;

    // Set EOF flag so generators know to exit
    this.demuxEof = true;

    // Wake up all waiting generators BEFORE closing format context
    // This ensures generators can exit cleanly even if readFrame() is blocking
    for (const resolvers of this.queueResolvers.values()) {
      for (const resolve of resolvers) {
        resolve();
      }
    }
    this.queueResolvers.clear();

    // Clear pb reference to prevent use-after-free
    if (this.ioContext) {
      this.formatContext.pb = null;
    }

    // Close FormatContext - this may interrupt blocking readFrame()
    await this.formatContext.closeInput();

    // Wait for demux thread with timeout to avoid hanging on blocked reads
    if (this.demuxThread) {
      const threadPromise = this.demuxThread;
      let timer: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 2000);
        timer.unref();
      });
      await Promise.race([threadPromise, timeoutPromise]);
      clearTimeout(timer!);
      this.demuxThread = null;
    }

    // Clean up packet queues
    for (const queue of this.packetQueues.values()) {
      for (const packet of queue) {
        packet.free();
      }
      queue.length = 0;
    }
    this.packetQueues.clear();
    this.packetQueueConsumers.clear();

    // NOW we can safely release the IOContext. Contexts we built ourselves are
    // callback-backed and go through freeContext(), which IOStream hooks to
    // detach its stream listeners. A caller-supplied context may instead own a
    // protocol handle from open2(); dispose picks avio_closep() for those, as
    // freeing them alone leaks the handle and keeps the file locked on Windows.
    if (this.ioContext) {
      if (this.externalIO) {
        await this.ioContext[Symbol.asyncDispose]();
      } else {
        this.ioContext.freeContext();
      }
      this.ioContext = undefined;
    }
  }

  /**
   * Close demuxer and free resources synchronously.
   * Synchronous version of close.
   *
   * Releases format context and I/O context.
   * Safe to call multiple times.
   * Automatically called by Symbol.dispose.
   *
   * Direct mapping to avformat_close_input().
   *
   * @example
   * ```typescript
   * const input = Demuxer.openSync('video.mp4');
   * try {
   *   // Use input
   * } finally {
   *   input.closeSync();
   * }
   * ```
   *
   * @see {@link close} For async version
   */
  closeSync(): void {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;

    // Clean up abort signal listener
    this.signalCleanup?.();
    this.signalCleanup = undefined;

    // IMPORTANT: Clear pb reference FIRST to prevent use-after-free
    if (this.ioContext) {
      this.formatContext.pb = null;
    }

    // Close FormatContext
    this.formatContext.closeInputSync();

    this.demuxThreadActive = false;

    for (const queue of this.packetQueues.values()) {
      for (const packet of queue) {
        packet.free();
      }
      queue.length = 0;
    }
    this.packetQueues.clear();
    this.queueResolvers.clear();
    this.demuxEof = false;

    // NOW we can safely release the IOContext (see close() for why dispose)
    if (this.ioContext) {
      if (this.externalIO) {
        this.ioContext[Symbol.dispose]();
      } else {
        this.ioContext.freeContext();
      }
      this.ioContext = undefined;
    }
  }

  /**
   * Get underlying format context.
   *
   * Returns the internal format context for advanced operations.
   *
   * @returns Format context
   *
   * @internal
   */
  getFormatContext(): FormatContext {
    return this.formatContext;
  }

  /**
   * Dispose of demuxer.
   *
   * Implements AsyncDisposable interface for automatic cleanup.
   * Equivalent to calling close().
   *
   * @example
   * ```typescript
   * {
   *   await using input = await Demuxer.open('video.mp4');
   *   // Process media...
   * } // Automatically closed
   * ```
   *
   * @see {@link close} For manual cleanup
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  /**
   * Dispose of demuxer synchronously.
   *
   * Implements Disposable interface for automatic cleanup.
   * Equivalent to calling closeSync().
   *
   * @example
   * ```typescript
   * {
   *   using input = Demuxer.openSync('video.mp4');
   *   // Process media...
   * } // Automatically closed
   * ```
   *
   * @see {@link closeSync} For manual cleanup
   */
  [Symbol.dispose](): void {
    this.closeSync();
  }
}
