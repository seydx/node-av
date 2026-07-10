import { mkdirSync } from 'fs';
import { mkdir } from 'fs/promises';
import { Writable } from 'node:stream';
import { dirname, resolve } from 'path';

import {
  AV_CODEC_FLAG_GLOBAL_HEADER,
  AV_DISPOSITION_ATTACHED_PIC,
  AV_DISPOSITION_DEFAULT,
  AV_NOPTS_VALUE,
  AV_TIME_BASE_Q,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  AVFMT_FLAG_CUSTOM_IO,
  AVFMT_GLOBALHEADER,
  AVFMT_NOFILE,
  AVFMT_TS_NONSTRICT,
  AVIO_FLAG_WRITE,
  AVMEDIA_TYPE_AUDIO,
  AVMEDIA_TYPE_VIDEO,
} from '../constants/constants.js';
import { Dictionary } from '../lib/dictionary.js';
import { FFmpegError } from '../lib/error.js';
import { FormatContext } from '../lib/format-context.js';
import { IOContext } from '../lib/io-context.js';
import { Packet } from '../lib/packet.js';
import { Rational } from '../lib/rational.js';
import { SyncQueue, SyncQueueType } from '../lib/sync-queue.js';
import { avAddQ, avCompareTs, avGetAudioFrameDuration2, avRescaleDelta, avRescaleQ } from '../lib/utilities.js';
import { MAX_MUXING_QUEUE_SIZE, MUXING_QUEUE_DATA_THRESHOLD, SYNC_BUFFER_DURATION } from './constants.js';
import { Encoder } from './encoder.js';
import { IOStream } from './io-stream.js';
import { AsyncQueue } from './utilities/async-queue.js';
import { applyContextOptions } from './utilities/context-options.js';

import type { MuxerFormat, MuxerOptionsFor } from '../constants/index.js';
import type { IRational, OutputFormat, Stream } from '../lib/index.js';
import type { BitStreamFilterAPI } from './bitstream-filter.js';
import type { Demuxer, RTPDemuxer } from './demuxer.js';
import type { IOOutputCallbacks } from './io-stream.js';
import type { ContextOptions } from './utilities/context-options.js';

/**
 * Per-stream muxing state: output stream, encoder/bitstream filter, and the
 * timestamp/pre-mux bookkeeping used while writing.
 *
 * @internal
 */
interface StreamDescription {
  initialized: boolean;
  inputStream?: Stream; // Source stream for metadata/properties (optional in encoder-only mode)
  outputStream: Stream;
  encoder?: Encoder;
  bsf?: BitStreamFilterAPI; // Trailing bitstream filter whose output parameters override the encoder's

  timeBase?: IRational;
  sourceTimeBase?: IRational;
  isStreamCopy: boolean;
  sqIdxMux: number; // Index in sync queue, -1 if not using sync queue
  preMuxQueue: (Packet | null)[]; // PreMuxQueue: Buffered packets (or NULL for EOF marker) before muxer starts
  preMuxQueueDataSize: number;
  eofReceived: boolean; // Track if EOF (NULL packet) was received for this stream
  lastMuxDts: bigint;
  tsRescaleDeltaLast: { value: bigint }; // For av_rescale_delta (audio streamcopy)
  streamcopyStarted: boolean; // Track if streamcopy has started for this stream
  startTimeOffset?: bigint; // Effective per-stream startTime offset (decided on the first packet)
}

/**
 * A queued packet write: the packet, its stream state, and stream index.
 *
 * @internal
 */
interface WriteJob {
  pkt: Packet;
  streamInfo: StreamDescription;
  streamIndex: number;
}

/**
 * Options for Muxer creation.
 */
export interface MuxerOptions<F extends MuxerFormat | (string & {}) = MuxerFormat | (string & {})> {
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
   *
   * When given as a literal (e.g. `'mp4'`), `options` is strongly typed to that
   * muxer's known options plus the generic AVFormatContext options.
   */
  format?: F;

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
   * Key-value pairs of FFmpeg AVFormatContext / muxer-private options, applied
   * before avformat_write_header(). When `format` is a known literal, these are
   * typed to that muxer's options (autocomplete + value typing); arbitrary keys
   * remain allowed so protocol/other options still pass.
   */
  options?: MuxerOptionsFor<F>;

  /**
   * Configure the underlying format context just before the header is written.
   *
   * Called with the output {@link FormatContext} once, after all streams have
   * been initialized (their parameters, metadata, and disposition copied from
   * the source) and immediately before `avformat_write_header`. Use it to set
   * any container- or stream-level field with full type safety — for example
   * per-stream metadata (language/title) or disposition that should not be
   * overwritten by the source. Settings applied here take precedence because
   * they run after the source values are copied.
   *
   * @example
   * ```typescript
   * import { Dictionary } from 'node-av';
   *
   * await Muxer.open('out.mp4', {
   *   configure: (fmt) => {
   *     fmt.streams[1].metadata = Dictionary.fromObject({ language: 'eng' });
   *   },
   * });
   * ```
   */
  configure?: (context: FormatContext) => void;

  /**
   * Fields to set on the underlying format context.
   *
   * A typed, declarative bag for any writable {@link FormatContext} field. Applied
   * once, after all streams are initialized (their parameters, metadata and
   * disposition copied from the source) and immediately before
   * `avformat_write_header`, so values here take precedence. The allowed keys are
   * derived from the class, so every writable field is available and correctly
   * typed. For per-stream or computed changes use {@link MuxerOptions.configure}.
   *
   * @example
   * ```typescript
   * await Muxer.open('out.mp4', {
   *   context: {
   *     startTime: 0n,
   *   },
   * });
   * ```
   */
  context?: ContextOptions<FormatContext>;

  /**
   * AbortSignal for cancellation.
   *
   * When aborted, async methods throw AbortError.
   */
  signal?: AbortSignal;
}

/**
 * High-level muxer for writing and muxing media files.
 *
 * Provides simplified access to media muxing and file writing operations.
 * Automatically manages header and trailer writing - header is written on first packet,
 * trailer is written on close. Supports lazy initialization for both encoders and streams.
 * Handles stream configuration, packet writing, and format management.
 * Supports files, URLs, and custom I/O with automatic cleanup.
 * Essential component for media encoding pipelines and transcoding.
 *
 * @example
 * ```typescript
 * import { Muxer } from 'node-av/api';
 *
 * // Create output file
 * await using output = await Muxer.open('output.mp4');
 *
 * // Add streams from encoders
 * const videoIdx = output.addStream(videoEncoder);
 * const audioIdx = output.addStream(audioEncoder);
 *
 * // Write packets - header written automatically on first packet
 * await output.writePacket(packet, videoIdx);
 *
 * // Close - trailer written automatically
 * // (automatic with await using)
 * ```
 *
 * @example
 * ```typescript
 * // Stream copy
 * await using input = await Demuxer.open('input.mp4');
 * await using output = await Muxer.open('output.mp4');
 *
 * // Copy stream configuration
 * const videoIdx = output.addStream(input.video());
 *
 * // Process packets - header/trailer handled automatically
 * for await (const packet of input.packets()) {
 *   await output.writePacket(packet, videoIdx);
 *   packet.free();
 * }
 * ```
 *
 * @see {@link Demuxer} For reading media files
 * @see {@link Encoder} For encoding frames to packets
 * @see {@link FormatContext} For low-level API
 */
export class Muxer implements AsyncDisposable, Disposable {
  private formatContext: FormatContext;
  private options: MuxerOptions;
  private _streams = new Map<number, StreamDescription>();
  private ioContext?: IOContext;
  private headerWritten = false;
  private headerWritePromise?: Promise<void>;
  private trailerWritten = false;
  private isClosed = false;
  private syncQueue?: SyncQueue; // FFmpeg's native sync queue for packet interleaving
  private sqPacket?: Packet; // Reusable packet for sync queue receive
  private containerMetadataCopied = false; // Track if container metadata has been copied
  private writeQueue?: AsyncQueue<WriteJob>; // Optional async queue for serialized writes
  private writeWorkerPromise?: Promise<void>; // Background worker promise
  private writeWorkerError?: Error; // First error from the write worker - poisons subsequent writes and close()
  private signal?: AbortSignal;

  /**
   * @param options - Media output options
   *
   * @internal
   */
  private constructor(options?: MuxerOptions) {
    this.options = {
      copyInitialNonkeyframes: false,
      exitOnError: true,
      useSyncQueue: true,
      useAsyncWrite: true,
      ...options,
    };

    this.formatContext = new FormatContext();
  }

  /**
   * Open muxer for writing.
   *
   * Creates and configures output context for muxing.
   * Automatically creates directories for file output.
   * Supports files, URLs, and custom I/O callbacks.
   *
   * Direct mapping to avformat_alloc_output_context2() and avio_open2().
   *
   * @param target - File path, URL, or I/O callbacks
   *
   * @param options - Output configuration options
   *
   * @returns Opened muxer instance
   *
   * @throws {Error} If format required for custom I/O
   *
   * @throws {FFmpegError} If allocation or opening fails
   *
   * @example
   * ```typescript
   * // Create file output
   * await using output = await Muxer.open('output.mp4');
   * ```
   *
   * @example
   * ```typescript
   * // Create output with specific format
   * await using output = await Muxer.open('output.ts', {
   *   format: 'mpegts'
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Custom I/O callbacks - async streaming to web destination
   * const callbacks = {
   *   write: async (buffer: Buffer) => {
   *     await streamWriter.write(buffer);
   *     return buffer.length;
   *   }
   * };
   *
   * await using output = await Muxer.open(callbacks, {
   *   format: 'mp4',
   *   bufferSize: 8192
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Custom I/O callbacks - synchronous buffering
   * const chunks: Buffer[] = [];
   * const callbacks = {
   *   write: (buffer: Buffer) => {
   *     chunks.push(Buffer.from(buffer));
   *     return buffer.length;
   *   }
   * };
   *
   * await using output = await Muxer.open(callbacks, { format: 'mp4' });
   * ```
   *
   * @see {@link MuxerOptions} For configuration options
   * @see {@link IOOutputCallbacks} For custom I/O interface
   */
  static async open<const F extends MuxerFormat | (string & {}) = MuxerFormat | (string & {})>(target: string, options?: MuxerOptions<F>): Promise<Muxer>;
  static async open<const F extends MuxerFormat | (string & {})>(target: IOOutputCallbacks, options: MuxerOptions<F> & { format: F }): Promise<Muxer>;
  static async open<const F extends MuxerFormat | (string & {})>(target: Writable, options: MuxerOptions<F> & { format: F }): Promise<Muxer>;
  static async open(target: string | IOOutputCallbacks | Writable, options?: MuxerOptions): Promise<Muxer> {
    const output = new Muxer(options);

    try {
      if (typeof target === 'string') {
        // File or stream URL - resolve relative paths and create directories
        // Check if it's a URL (starts with protocol://) or a file path
        const isUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(target);
        const resolvedTarget = isUrl ? target : resolve(target);

        // Create directory structure for local files (not URLs)
        if (!isUrl && target !== '') {
          const dir = dirname(resolvedTarget);
          await mkdir(dir, { recursive: true });
        }
        // Allocate output context
        const ret = output.formatContext.allocOutputContext2(null, options?.format ?? null, resolvedTarget === '' ? null : resolvedTarget);
        FFmpegError.throwIfError(ret, 'Failed to allocate output context');

        // Set format options if provided
        if (options?.options) {
          for (const [key, value] of Object.entries(options.options)) {
            const ret = output.formatContext.setOption(key, value);
            FFmpegError.throwIfError(ret, `Failed to set muxer option '${key}'`);
          }
        }

        // Check if we need to open IO
        const oformat = output.formatContext.oformat;
        if (resolvedTarget && oformat && !oformat.hasFlags(AVFMT_NOFILE)) {
          // For file-based formats, we need to open the file using avio_open2
          // FFmpeg will manage the AVIOContext internally
          output.ioContext = new IOContext();
          const openRet = await output.ioContext.open2(resolvedTarget, AVIO_FLAG_WRITE);
          FFmpegError.throwIfError(openRet, `Failed to open output file: ${resolvedTarget}`);
          output.formatContext.pb = output.ioContext;
        }
      } else if (target instanceof Writable) {
        // Writable stream - format is required
        if (!options?.format) {
          throw new Error('Format must be specified for Writable stream output');
        }

        const ret = output.formatContext.allocOutputContext2(null, options.format, null);
        FFmpegError.throwIfError(ret, 'Failed to allocate output context');

        // Set format options if provided
        if (options?.options) {
          for (const [key, value] of Object.entries(options.options)) {
            const ret = output.formatContext.setOption(key, value);
            FFmpegError.throwIfError(ret, `Failed to set muxer option '${key}'`);
          }
        }

        output.ioContext = IOStream.createOutput(target, options);
        output.formatContext.pb = output.ioContext;
        output.formatContext.setFlags(AVFMT_FLAG_CUSTOM_IO);
      } else {
        // Custom IO with callbacks - format is required
        if (!options?.format) {
          throw new Error('Format must be specified for custom IO');
        }

        const ret = output.formatContext.allocOutputContext2(null, options.format, null);
        FFmpegError.throwIfError(ret, 'Failed to allocate output context');

        // Set format options if provided
        if (options?.options) {
          for (const [key, value] of Object.entries(options.options)) {
            const ret = output.formatContext.setOption(key, value);
            FFmpegError.throwIfError(ret, `Failed to set muxer option '${key}'`);
          }
        }

        output.ioContext = IOStream.createOutput(target, options);
        output.formatContext.pb = output.ioContext;
        output.formatContext.setFlags(AVFMT_FLAG_CUSTOM_IO);
      }

      if (options?.signal) {
        options.signal.throwIfAborted();
        output.signal = options.signal;
      }

      return output;
    } catch (error) {
      // Cleanup on error
      if (output.ioContext) {
        try {
          const isCustomIO = output.formatContext.hasFlags(AVFMT_FLAG_CUSTOM_IO);
          if (isCustomIO) {
            // Clear the pb reference first
            output.formatContext.pb = null;
            // For custom IO with callbacks, free the context
            output.ioContext.freeContext();
          } else {
            // For file-based IO, close the file handle
            await output.ioContext.closep();
          }
        } catch {
          // Ignore errors
        }
      }
      if (output.formatContext) {
        try {
          output.formatContext.freeContext();
        } catch {
          // Ignore errors
        }
      }
      throw error;
    }
  }

  /**
   * Open muxer for writing synchronously.
   * Synchronous version of open.
   *
   * Creates and configures output context for muxing.
   * Automatically creates directories for file output.
   * Supports files, URLs, and custom I/O callbacks.
   *
   * Direct mapping to avformat_alloc_output_context2() and avio_open2().
   *
   * @param target - File path, URL, or I/O callbacks
   *
   * @param options - Output configuration options
   *
   * @returns Opened muxer instance
   *
   * @throws {Error} If format required for custom I/O
   *
   * @throws {FFmpegError} If allocation or opening fails
   *
   * @example
   * ```typescript
   * // Create file output
   * using output = Muxer.openSync('output.mp4');
   * ```
   *
   * @example
   * ```typescript
   * // Create output with specific format
   * using output = Muxer.openSync('output.ts', {
   *   format: 'mpegts'
   * });
   * ```
   *
   * @see {@link open} For async version
   */
  static openSync<const F extends MuxerFormat | (string & {}) = MuxerFormat | (string & {})>(target: string, options?: MuxerOptions<F>): Muxer;
  static openSync<const F extends MuxerFormat | (string & {})>(target: IOOutputCallbacks, options: MuxerOptions<F> & { format: F }): Muxer;
  static openSync<const F extends MuxerFormat | (string & {})>(target: Writable, options: MuxerOptions<F> & { format: F }): Muxer;
  static openSync(target: string | IOOutputCallbacks | Writable, options?: MuxerOptions): Muxer {
    const output = new Muxer(options);

    try {
      if (typeof target === 'string') {
        // File or stream URL - resolve relative paths and create directories
        // Check if it's a URL (starts with protocol://) or a file path
        const isUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(target);
        const resolvedTarget = isUrl ? target : resolve(target);

        // Create directory structure for local files (not URLs)
        if (!isUrl && target !== '') {
          const dir = dirname(resolvedTarget);
          mkdirSync(dir, { recursive: true });
        }
        // Allocate output context
        const ret = output.formatContext.allocOutputContext2(null, options?.format ?? null, resolvedTarget === '' ? null : resolvedTarget);
        FFmpegError.throwIfError(ret, 'Failed to allocate output context');

        // Set format options if provided
        if (options?.options) {
          for (const [key, value] of Object.entries(options.options)) {
            const ret = output.formatContext.setOption(key, value);
            FFmpegError.throwIfError(ret, `Failed to set muxer option '${key}'`);
          }
        }

        // Check if we need to open IO
        const oformat = output.formatContext.oformat;
        if (resolvedTarget && oformat && !oformat.hasFlags(AVFMT_NOFILE)) {
          // For file-based formats, we need to open the file using avio_open2
          // FFmpeg will manage the AVIOContext internally
          output.ioContext = new IOContext();
          const openRet = output.ioContext.open2Sync(resolvedTarget, AVIO_FLAG_WRITE);
          FFmpegError.throwIfError(openRet, `Failed to open output file: ${resolvedTarget}`);
          output.formatContext.pb = output.ioContext;
        }
      } else if (target instanceof Writable) {
        // Writable stream - format is required
        if (!options?.format) {
          throw new Error('Format must be specified for Writable stream output');
        }

        const ret = output.formatContext.allocOutputContext2(null, options.format, null);
        FFmpegError.throwIfError(ret, 'Failed to allocate output context');

        // Set format options if provided
        if (options?.options) {
          for (const [key, value] of Object.entries(options.options)) {
            const ret = output.formatContext.setOption(key, value);
            FFmpegError.throwIfError(ret, `Failed to set muxer option '${key}'`);
          }
        }

        output.ioContext = IOStream.createOutput(target, options);
        output.formatContext.pb = output.ioContext;
        output.formatContext.setFlags(AVFMT_FLAG_CUSTOM_IO);
      } else {
        // Custom IO with callbacks - format is required
        if (!options?.format) {
          throw new Error('Format must be specified for custom IO');
        }

        const ret = output.formatContext.allocOutputContext2(null, options.format, null);
        FFmpegError.throwIfError(ret, 'Failed to allocate output context');

        // Set format options if provided
        if (options?.options) {
          for (const [key, value] of Object.entries(options.options)) {
            const ret = output.formatContext.setOption(key, value);
            FFmpegError.throwIfError(ret, `Failed to set muxer option '${key}'`);
          }
        }

        output.ioContext = IOStream.createOutput(target, options);
        output.formatContext.pb = output.ioContext;
        output.formatContext.setFlags(AVFMT_FLAG_CUSTOM_IO);
      }

      if (options?.signal) {
        options.signal.throwIfAborted();
        output.signal = options.signal;
      }

      return output;
    } catch (error) {
      // Cleanup on error
      if (output.ioContext) {
        try {
          const isCustomIO = output.formatContext.hasFlags(AVFMT_FLAG_CUSTOM_IO);
          if (isCustomIO) {
            // Clear the pb reference first
            output.formatContext.pb = null;
            // For custom IO with callbacks, free the context
            output.ioContext.freeContext();
          } else {
            // For file-based IO, close the file handle
            output.ioContext.closepSync();
          }
        } catch {
          // Ignore errors
        }
      }
      if (output.formatContext) {
        try {
          output.formatContext.freeContext();
        } catch {
          // Ignore errors
        }
      }
      throw error;
    }
  }

  /**
   * Check if output is open.
   *
   * @example
   * ```typescript
   * if (!output.isOutputOpen) {
   *   console.log('Output is not open');
   * }
   * ```
   */
  get isOpen(): boolean {
    return !this.isClosed;
  }

  /**
   * Check if output is initialized.
   *
   * All streams have been initialized.
   * This occurs after the first packet has been written to each stream.
   *
   * @example
   * ```typescript
   * if (!output.isOutputInitialized) {
   *   console.log('Output is not initialized');
   * }
   * ```
   */
  get streamsInitialized(): boolean {
    if (this._streams.size === 0) {
      return false;
    }

    if (this.isClosed) {
      return false;
    }

    return Array.from(this._streams).every(([_, stream]) => stream.initialized);
  }

  /**
   * Get all streams in the media.
   *
   * @example
   * ```typescript
   * for (const stream of output.streams) {
   *   console.log(`Stream ${stream.index}: ${stream.codecpar.codecType}`);
   * }
   * ```
   */
  get streams(): Stream[] {
    return this.formatContext.streams;
  }

  /**
   * Get format name.
   *
   * Returns 'unknown' if output is closed or format is not available.
   *
   * @example
   * ```typescript
   * console.log(`Format: ${output.formatName}`); // "mov,mp4,m4a,3gp,3g2,mj2"
   * ```
   */
  get formatName(): string {
    if (this.isClosed) {
      return 'unknown';
    }

    return this.formatContext.oformat?.name ?? 'unknown';
  }

  /**
   * Get format long name.
   *
   * Returns 'Unknown Format' if output is closed or format is not available.
   *
   * @example
   * ```typescript
   * console.log(`Format: ${output.formatLongName}`); // "QuickTime / MOV"
   * ```
   */
  get formatLongName(): string {
    if (this.isClosed) {
      return 'Unknown Format';
    }

    return this.formatContext.oformat?.longName ?? 'Unknown Format';
  }

  /**
   * Get MIME type of the output format.
   *
   * Returns format's native MIME type.
   * Returns null if output is closed or format is not available.
   *
   * @example
   * ```typescript
   * console.log(mp4Output.mimeType); // "video/mp4"
   * ```
   */
  get mimeType(): string | null {
    if (this.isClosed) {
      return null;
    }

    return this.formatContext.oformat?.mimeType ?? null;
  }

  /**
   * Add a stream to the output (encoder-only mode).
   *
   * Configures output stream from encoder. Stream is initialized lazily from first encoded frame.
   * Use this when generating frames programmatically without an input stream.
   *
   * @param encoder - Encoder for encoding frames to packets
   *
   * @param options - Stream configuration options
   *
   * @param options.inputStream - Optional input stream for metadata/properties
   *
   * @returns Stream index for packet writing
   *
   * @throws {Error} If called after packets have been written or output closed
   *
   * @example
   * ```typescript
   * // Encoder-only (e.g., frame generator)
   * const encoder = await Encoder.create(FF_ENCODER_LIBX264);
   * const streamIdx = output.addStream(encoder);
   * ```
   *
   * @example
   * ```typescript
   * // Encoder with input stream for metadata
   * const streamIdx = output.addStream(encoder, {
   *   inputStream: input.video()
   * });
   * ```
   */
  addStream(encoder: Encoder, options?: { inputStream?: Stream; bsf?: BitStreamFilterAPI }): number;

  /**
   * Add a stream to the output (stream copy or transcoding mode).
   *
   * Configures output stream from input stream and optional encoder.
   * Must be called before writing any packets.
   * Returns stream index for packet writing.
   *
   * Automatically copies from input stream:
   * - Codec parameters (stream copy mode)
   * - Metadata
   * - Disposition flags
   * - Frame rates and aspect ratios
   * - Duration hints
   * - HDR/Dolby Vision side data (coded_side_data)
   *
   * When encoder is provided:
   * - Stream is initialized lazily from first encoded frame
   * - Metadata and disposition copied from input stream
   * - Duration hint used for muxer
   *
   * Direct mapping to avformat_new_stream().
   *
   * @param stream - Input stream (source for properties/metadata)
   *
   * @param options - Stream configuration options
   *
   * @param options.encoder - Optional encoder for transcoding
   *
   * @returns Stream index for packet writing
   *
   * @throws {Error} If called after packets have been written or output closed
   *
   * @example
   * ```typescript
   * // Stream copy
   * const videoIdx = output.addStream(input.video());
   * const audioIdx = output.addStream(input.audio());
   * ```
   *
   * @example
   * ```typescript
   * // With encoding
   * const videoIdx = output.addStream(input.video(), {
   *   encoder: videoEncoder
   * });
   * ```
   *
   * @see {@link writePacket} For writing packets to streams
   * @see {@link Encoder} For transcoding source
   */
  addStream(stream: Stream, options?: { encoder?: Encoder; bsf?: BitStreamFilterAPI }): number;
  addStream(streamOrEncoder: Stream | Encoder, options?: { encoder?: Encoder; inputStream?: Stream; bsf?: BitStreamFilterAPI }): number {
    if (this.isClosed) {
      throw new Error('Muxer is closed');
    }

    if (this.headerWritten) {
      throw new Error('Cannot add streams after packets have been written');
    }

    const outStream = this.formatContext.newStream(null);
    if (!outStream) {
      throw new Error('Failed to create new stream');
    }

    // Determine if first parameter is Encoder or Stream
    const isEncoderFirst = streamOrEncoder instanceof Encoder;

    let stream: Stream | undefined;
    let encoder: Encoder | undefined;

    if (isEncoderFirst) {
      // First parameter is Encoder
      encoder = streamOrEncoder;
      stream = options?.inputStream;
    } else {
      // First parameter is Stream
      stream = streamOrEncoder;
      encoder = options?.encoder;
    }

    const isStreamCopy = !encoder;

    // Auto-set GLOBAL_HEADER flag if format requires it
    if (encoder) {
      const oformat = this.formatContext.oformat;
      if (oformat?.hasFlags(AVFMT_GLOBALHEADER)) {
        encoder.setCodecFlags(AV_CODEC_FLAG_GLOBAL_HEADER);
      }
    }

    // For stream copy, initialize immediately since we have all the info
    if (isStreamCopy) {
      if (!stream) {
        throw new Error('Stream copy mode requires an input stream');
      }

      const ret = stream.codecpar.copy(outStream.codecpar);
      FFmpegError.throwIfError(ret, 'Failed to copy codec parameters');

      // Set the timebases
      const sourceTimeBase = stream.timeBase;

      outStream.timeBase = new Rational(stream.timeBase.num, stream.timeBase.den);

      // Copy frame rates and aspect ratios
      outStream.avgFrameRate = stream.avgFrameRate;
      if (stream.sampleAspectRatio.num > 0) {
        outStream.sampleAspectRatio = stream.sampleAspectRatio;
      }
      outStream.rFrameRate = stream.rFrameRate;

      // Copy duration
      if (stream.duration > 0n) {
        outStream.duration = stream.duration;
      }

      // Copy metadata
      const metadata = stream.metadata;
      if (metadata) {
        outStream.metadata = metadata;
      }

      // Copy disposition
      outStream.disposition = stream.disposition;

      // Copy coded_side_data (HDR/Dolby Vision)
      // Iterate over all side_data entries and copy them
      const allSideData = stream.codecpar.getAllCodedSideData();
      for (const sd of allSideData) {
        outStream.codecpar.addCodedSideData(sd.type, sd.data);
      }

      this._streams.set(outStream.index, {
        initialized: true,
        outputStream: outStream,
        inputStream: stream,
        encoder: undefined,
        sourceTimeBase,
        isStreamCopy: true,
        sqIdxMux: -1, // Will be set if sync queue is needed
        preMuxQueue: [],
        preMuxQueueDataSize: 0,
        eofReceived: false,
        lastMuxDts: AV_NOPTS_VALUE,
        tsRescaleDeltaLast: { value: AV_NOPTS_VALUE },
        streamcopyStarted: false,
      });
    } else {
      // Encoding path - lazy initialization
      // stream is optional here - if provided, we copy metadata/disposition
      // If not provided (encoder-only mode), stream will be initialized from first encoded frame
      this._streams.set(outStream.index, {
        initialized: false,
        outputStream: outStream,
        inputStream: stream,
        encoder,
        bsf: options?.bsf,
        sourceTimeBase: undefined, // Will be set on initialization
        isStreamCopy: false,
        sqIdxMux: -1, // Will be set if sync queue is needed
        preMuxQueue: [],
        preMuxQueueDataSize: 0,
        eofReceived: false,
        lastMuxDts: AV_NOPTS_VALUE,
        tsRescaleDeltaLast: { value: AV_NOPTS_VALUE },
        streamcopyStarted: false,
      });
    }

    return outStream.index;
  }

  /**
   * Get output stream by index.
   *
   * Returns the stream at the specified index.
   * Use the stream index returned by addStream().
   *
   * @param index - Stream index (returned by addStream)
   *
   * @returns Stream or undefined if index is invalid
   *
   * @example
   * ```typescript
   * const output = await Muxer.open('output.mp4');
   * const videoIdx = output.addStream(encoder);
   *
   * // Get the output stream to inspect codec parameters
   * const stream = output.getStream(videoIdx);
   * if (stream) {
   *   console.log(`Output codec: ${stream.codecpar.codecId}`);
   * }
   * ```
   *
   * @see {@link addStream} For adding streams
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
   * const output = await Muxer.open('output.mp4');
   * output.addStream(videoEncoder);
   *
   * // Get first video stream
   * const videoStream = output.video();
   * if (videoStream) {
   *   console.log(`Video output: ${videoStream.codecpar.width}x${videoStream.codecpar.height}`);
   * }
   * ```
   *
   * @see {@link audio} For audio streams
   * @see {@link getStream} For direct stream access
   */
  video(index = 0): Stream | undefined {
    const streams = this.formatContext.streams;
    if (!streams) return undefined;
    const videoStreams = streams.filter((s) => s.codecpar.codecType === AVMEDIA_TYPE_VIDEO);
    return videoStreams[index];
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
   * const output = await Muxer.open('output.mp4');
   * output.addStream(audioEncoder);
   *
   * // Get first audio stream
   * const audioStream = output.audio();
   * if (audioStream) {
   *   console.log(`Audio output: ${audioStream.codecpar.sampleRate}Hz`);
   * }
   * ```
   *
   * @see {@link video} For video streams
   * @see {@link getStream} For direct stream access
   */
  audio(index = 0): Stream | undefined {
    const streams = this.formatContext.streams;
    if (!streams) return undefined;
    const audioStreams = streams.filter((s) => s.codecpar.codecType === AVMEDIA_TYPE_AUDIO);
    return audioStreams[index];
  }

  /**
   * Get output format.
   *
   * Returns the output format used for muxing.
   * May be null if format context not initialized.
   *
   * @returns Output format or null
   *
   * @example
   * ```typescript
   * const output = await Muxer.open('output.mp4');
   * const format = output.outputFormat();
   * if (format) {
   *   console.log(`Output format: ${format.name}`);
   * }
   * ```
   *
   * @see {@link OutputFormat} For format details
   */
  outputFormat(): OutputFormat | null {
    return this.formatContext.oformat;
  }

  /**
   * Write a packet to the output.
   *
   * Writes muxed packet to the specified stream.
   * Automatically handles:
   * - Stream initialization on first packet (lazy initialization)
   * - Codec parameter configuration from encoder or input stream
   * - Header writing on first packet
   * - Timestamp rescaling between source and output timebases
   * - Sync queue for proper interleaving
   *
   * For encoder sources, the encoder must have processed at least one frame
   * before packets can be written (encoder must be initialized).
   *
   * Uses FFmpeg CLI's sync queue pattern: buffers packets per stream and writes
   * them in DTS order using av_compare_ts for timebase-aware comparison.
   *
   * To signal EOF for a stream, pass null as the packet.
   * This tells the muxer that no more packets will be sent for this stream.
   * The trailer is written only when close() is called.
   *
   * Direct mapping to avformat_write_header() (on first packet) and av_interleaved_write_frame().
   *
   * @param packet - Packet to write (or null to signal EOF for the stream)
   *
   * @param streamIndex - Target stream index
   *
   * @throws {Error} If stream invalid or encoder not initialized
   *
   * @throws {FFmpegError} If write fails
   *
   * @example
   * ```typescript
   * // Write encoded packet - header written automatically on first packet
   * const packet = await encoder.encode(frame);
   * if (packet) {
   *   await output.writePacket(packet, videoIdx);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Stream copy with packet processing
   * for await (const packet of input.packets()) {
   *   if (packet.streamIndex === inputVideoIdx) {
   *     await output.writePacket(packet, outputVideoIdx);
   *   }
   *   packet.free();
   * }
   * ```
   *
   * @see {@link addStream} For adding streams
   */
  async writePacket(packet: Packet | null | undefined, streamIndex: number): Promise<void> {
    this.signal?.throwIfAborted();

    // A previous background write failed - surface it instead of buffering more packets
    if (this.writeWorkerError) {
      throw this.writeWorkerError;
    }

    if (this.isClosed) {
      throw new Error('Muxer is closed');
    }

    if (this.trailerWritten) {
      throw new Error('Cannot write packets after output is finalized');
    }

    if (!this._streams.get(streamIndex)) {
      throw new Error(`Invalid stream index: ${streamIndex}`);
    }

    // Initialize any encoder streams that are ready
    for (const streamInfo of this._streams.values()) {
      if (!streamInfo.initialized && streamInfo.encoder) {
        const encoder = streamInfo.encoder;
        const codecContext = encoder.getCodecContext();

        // Skip if encoder not ready yet
        if (!encoder.isEncoderInitialized || !codecContext) {
          continue;
        }

        // If a trailing bitstream filter is present, wait until it is initialized
        // so its output parameters (e.g. modified extradata) are available.
        if (streamInfo.bsf && !streamInfo.bsf.isInitialized) {
          continue;
        }

        // This encoder is ready, initialize it now
        // Read codecType from codecContext, not from stream (which is still uninitialized)
        // const codecType = codecContext.codecType;

        // 1. Set stream timebase
        if (streamInfo.outputStream.timeBase.num <= 0 || streamInfo.outputStream.timeBase.den <= 0) {
          const tb = avAddQ(codecContext.timeBase, { num: 0, den: 1 });
          streamInfo.outputStream.timeBase = new Rational(tb.num, tb.den);
        }

        // 2. Set stream avg_frame_rate, r_frame_rate and sample_aspect_ratio
        const fr = codecContext.framerate;
        streamInfo.outputStream.avgFrameRate = new Rational(fr.num, fr.den);
        streamInfo.outputStream.sampleAspectRatio = codecContext.sampleAspectRatio;

        // 3. Copy codec parameters from encoder context
        const ret = streamInfo.outputStream.codecpar.fromContext(codecContext);
        FFmpegError.throwIfError(ret, 'Failed to copy codec parameters from encoder');

        // 3b. Overlay the trailing bitstream filter's output parameters, so
        // container-level fields (e.g. extradata/level rewritten by h264_metadata)
        // reflect the filter's output rather than the raw encoder output.
        const bsfParams = streamInfo.bsf?.outputCodecParameters;
        if (bsfParams) {
          const bsfRet = bsfParams.copy(streamInfo.outputStream.codecpar);
          FFmpegError.throwIfError(bsfRet, 'Failed to copy codec parameters from bitstream filter');
        }

        // 4. Copy metadata from input stream
        if (streamInfo.inputStream) {
          const metadata = streamInfo.inputStream.metadata;
          if (metadata) {
            streamInfo.outputStream.metadata = metadata;
          }

          // 5. Copy disposition from input stream
          streamInfo.outputStream.disposition = streamInfo.inputStream.disposition;

          // 5b. Copy coded_side_data from input stream (display matrix / rotation,
          // HDR mastering display & content light level). The encoder path only
          // copied codec parameters, so without this these are lost on transcode
          // (e.g. a portrait phone video would play sideways). Mirrors the stream
          // copy path.
          const inputSideData = streamInfo.inputStream.codecpar.getAllCodedSideData();
          for (const sd of inputSideData) {
            streamInfo.outputStream.codecpar.addCodedSideData(sd.type, sd.data);
          }

          // 6. Copy duration hint from input stream
          if (streamInfo.inputStream.duration > 0n) {
            const inputTb = streamInfo.inputStream.timeBase;
            const outputTb = streamInfo.outputStream.timeBase;
            const rescaledDuration = avRescaleQ(streamInfo.inputStream.duration, inputTb, outputTb);
            streamInfo.outputStream.duration = rescaledDuration;
          }
        }

        // Update the source timebase for timestamp rescaling
        streamInfo.sourceTimeBase = codecContext.timeBase;

        // Mark as initialized
        streamInfo.initialized = true;
      }
    }

    const streamInfo = this._streams.get(streamIndex)!;

    // Handle NULL packet - signals EOF for this stream (FFmpeg pattern: av_interleaved_write_frame(s, NULL))
    // FFmpeg's behavior:
    // - If muxer not started (uninitialized streams), buffer NULL in PreMuxQueue as EOF marker
    // - If muxer started, send NULL to SyncQueue to signal EOF and flush
    if (!packet) {
      // Mark stream as EOF received
      streamInfo.eofReceived = true;

      // Check if any streams are still uninitialized (PreMuxQueue phase)
      const uninitialized = Array.from(this._streams.values()).some((s) => !s.initialized);

      // PHASE 1: Before muxer starts - buffer NULL packet in PreMuxQueue
      // This matches FFmpeg's mux_queue_packet() which writes NULL to PreMuxQueue FIFO
      if (uninitialized || this.headerWritePromise) {
        // Buffer NULL as EOF marker (no size contribution)
        streamInfo.preMuxQueue.push(null);
        return;
      }

      // PHASE 2: After muxer started - send EOF to SyncQueue and flush
      if (!this.headerWritten) {
        return;
      }

      // If using SyncQueue, send EOF for this stream
      if (this.syncQueue && streamInfo.sqIdxMux >= 0) {
        // Send NULL to signal EOF to sync queue
        // Native side handles null correctly (sets sqframe.p = nullptr)
        const ret = this.syncQueue.send(streamInfo.sqIdxMux, null);

        if (ret < 0 && ret !== AVERROR_EOF) {
          if (this.options.exitOnError) {
            FFmpegError.throwIfError(ret, 'Failed to send EOF to sync queue');
          }
        }

        // Receive and write any remaining packets from sync queue
        while (!this.isClosed) {
          const recvRet = this.syncQueue.receive(-1, this.sqPacket!);
          if (recvRet === AVERROR_EAGAIN) {
            break; // No more packets ready
          }
          if (recvRet === AVERROR_EOF) {
            break; // All streams finished
          }
          if (recvRet >= 0) {
            const recvStreamInfo = this._streams.get(recvRet)!;
            const pkt = this.sqPacket!.clone();
            if (!pkt) {
              throw new Error('Failed to clone packet from sync queue');
            }
            pkt.streamIndex = recvRet;
            await this.write(pkt, recvStreamInfo, recvRet);
          }
        }
      }

      return; // EOF signaled, nothing more to do
    }

    // Clone packet immediately - we will modify it and caller retains ownership
    const clonedPacket = packet.clone();
    if (!clonedPacket) {
      throw new Error('Failed to clone packet for writing');
    }

    // Apply streamcopy filtering BEFORE buffering
    // This ensures rejected packets never enter the queue/buffer
    if (streamInfo.isStreamCopy) {
      const shouldWrite = this.ofStreamcopy(clonedPacket, streamInfo, streamIndex);
      if (!shouldWrite) {
        clonedPacket.free(); // Free the clone since we won't use it
        return;
      }
    } else if (this.options.startTime !== undefined) {
      // For encoded (non-streamcopy) streams, strip the device's startTime base.
      this.applyStartTimeOffset(clonedPacket, streamInfo);
    }

    // Check if any streams are still uninitialized or header is being written
    const uninitialized = Array.from(this._streams.values()).some((s) => !s.initialized);

    // PHASE 1: Before header write - ALWAYS buffer in PreMuxQueue
    // PreMuxQueue is used during initialization phase ONLY (regardless of SyncQueue presence)
    // After header write, PreMuxQueue is flushed in DTS-sorted order
    if (uninitialized || this.headerWritePromise) {
      // Check PreMuxQueue limits
      const maxPackets = this.options.maxMuxingQueueSize ?? MAX_MUXING_QUEUE_SIZE;
      const dataThreshold = this.options.muxingQueueDataThreshold ?? MUXING_QUEUE_DATA_THRESHOLD;

      const currentPackets = streamInfo.preMuxQueue.length;
      const currentBytes = streamInfo.preMuxQueueDataSize;
      const packetSize = clonedPacket.size;

      const thresholdReached = currentBytes + packetSize > dataThreshold;
      const effectiveMaxPackets = thresholdReached ? maxPackets : Number.MAX_SAFE_INTEGER;

      // Check if we would exceed packet limit (only if threshold reached)
      if (currentPackets >= effectiveMaxPackets) {
        clonedPacket.free(); // Free the clone since we can't buffer it
        throw new Error(
          // eslint-disable-next-line @stylistic/max-len
          `Too many packets buffered for output stream ${streamIndex} (packets: ${currentPackets}, bytes: ${currentBytes}, threshold: ${dataThreshold}, max: ${maxPackets})`,
        );
      }

      // Buffer in PreMuxQueue (per-stream FIFO)
      streamInfo.preMuxQueue.push(clonedPacket);
      streamInfo.preMuxQueueDataSize += packetSize;

      return; // Don't proceed to header write yet
    }
    // Automatically write header if not written yet
    if (!this.headerWritten) {
      this.headerWritePromise ??= (async () => {
        this.startWriteWorker();
        this.prepareHeaderWrite();

        const ret = await this.formatContext.writeHeader();
        FFmpegError.throwIfError(ret, 'Failed to write header');

        this.headerWritten = true;

        // PHASE 2: Flush PreMuxQueue in DTS-sorted order (once after header write)
        // Packets go: PreMuxQueue → SyncQueue (if present) → Muxer
        await this.flushPreMuxQueues();
      })();

      await this.headerWritePromise;

      if (this.headerWritten) {
        this.headerWritePromise = undefined;
      }
    }

    // PHASE 3: Write packet - normal muxing after header
    if (this.syncQueue && streamInfo.sqIdxMux >= 0) {
      // Use SyncQueue for packet interleaving
      // NOTE: Do NOT set clonedPacket.timeBase here!
      // Packet must keep its source timebase (encoder timebase) so muxFixupTs can rescale correctly

      // Send packet to sync queue
      const ret = this.syncQueue.send(streamInfo.sqIdxMux, clonedPacket);

      // Handle errors from sq_send
      if (ret < 0) {
        if (ret === AVERROR_EOF) {
          // Stream finished - this is normal, just return
          return;
        }

        if (this.options.exitOnError) {
          FFmpegError.throwIfError(ret, 'Failed to send packet to sync queue');
        }
        return;
      }

      // Receive synchronized packets from queue and write to muxer
      while (!this.isClosed) {
        const recvRet = this.syncQueue.receive(-1, this.sqPacket!);
        if (recvRet === AVERROR_EAGAIN) {
          break; // No more packets ready
        }
        if (recvRet === AVERROR_EOF) {
          break; // All streams finished
        }
        if (recvRet >= 0) {
          // recvRet is the stream index
          const recvStreamInfo = this._streams.get(recvRet)!;

          // Clone packet before writing (muxer takes ownership and will unref it)
          // We need to keep sqPacket alive for the next receive() call
          const pkt = this.sqPacket!.clone();
          if (!pkt) {
            throw new Error('Failed to clone packet from sync queue');
          }
          pkt.streamIndex = recvRet;

          // Write packet (muxer takes ownership)
          await this.write(pkt, recvStreamInfo, recvRet);
        }
      }
    } else {
      // No sync queue needed - write directly
      clonedPacket.streamIndex = streamIndex;
      await this.write(clonedPacket, streamInfo, streamIndex);
    }
  }

  /**
   * Write a packet to the output synchronously.
   * Synchronous version of writePacket.
   *
   * Writes muxed packet to the specified stream.
   * Automatically handles:
   * - Stream initialization on first packet (lazy initialization)
   * - Codec parameter configuration from encoder or input stream
   * - Header writing on first packet
   * - Timestamp rescaling between source and output timebases
   * - Sync queue for proper interleaving
   *
   * For encoder sources, the encoder must have processed at least one frame
   * before packets can be written (encoder must be initialized).
   *
   * Uses FFmpeg CLI's sync queue pattern: buffers packets per stream and writes
   * them in DTS order using av_compare_ts for timebase-aware comparison.
   *
   * To signal EOF for a stream, pass null as the packet.
   * This tells the muxer that no more packets will be sent for this stream.
   * The trailer is written only when close() is called.
   *
   * Direct mapping to avformat_write_header() (on first packet) and av_interleaved_write_frame().
   *
   * @param packet - Packet to write (or null/undefined to signal EOF)
   *
   * @param streamIndex - Target stream index
   *
   * @throws {Error} If stream invalid or encoder not initialized
   *
   * @throws {FFmpegError} If write fails
   *
   * @example
   * ```typescript
   * // Write encoded packet - header written automatically on first packet
   * const packet = encoder.encodeSync(frame);
   * if (packet) {
   *   output.writePacketSync(packet, videoIdx);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Stream copy with packet processing
   * for (const packet of input.packetsSync()) {
   *   if (packet.streamIndex === inputVideoIdx) {
   *     output.writePacketSync(packet, outputVideoIdx);
   *   }
   *   packet.free();
   * }
   * ```
   *
   * @see {@link writePacket} For async version
   */
  writePacketSync(packet: Packet | null | undefined, streamIndex: number): void {
    if (this.isClosed) {
      throw new Error('Muxer is closed');
    }

    if (this.trailerWritten) {
      throw new Error('Cannot write packets after output is finalized');
    }

    if (!this._streams.get(streamIndex)) {
      throw new Error(`Invalid stream index: ${streamIndex}`);
    }

    // Initialize any encoder streams that are ready
    for (const streamInfo of this._streams.values()) {
      if (!streamInfo.initialized && streamInfo.encoder) {
        const encoder = streamInfo.encoder;
        const codecContext = encoder.getCodecContext();

        // Skip if encoder not ready yet
        if (!encoder.isEncoderInitialized || !codecContext) {
          continue;
        }

        // If a trailing bitstream filter is present, wait until it is initialized
        // so its output parameters (e.g. modified extradata) are available.
        if (streamInfo.bsf && !streamInfo.bsf.isInitialized) {
          continue;
        }

        // This encoder is ready, initialize it now
        // Read codecType from codecContext, not from stream (which is still uninitialized)
        const codecType = codecContext.codecType;

        // 1. Set stream timebase
        // Use encoder's timebase unless user specified custom timebase
        if (streamInfo.timeBase) {
          // User specified custom timebase
          streamInfo.outputStream.timeBase = new Rational(streamInfo.timeBase.num, streamInfo.timeBase.den);
        } else {
          // Use encoder's timebase directly
          // The encoder timebase is already set from the first frame in Encoder.initialize()
          streamInfo.outputStream.timeBase = new Rational(codecContext.timeBase.num, codecContext.timeBase.den);
        }

        // 2. Set stream avg_frame_rate, r_frame_rate and sample_aspect_ratio
        if (codecType === AVMEDIA_TYPE_VIDEO) {
          const fr = codecContext.framerate;
          streamInfo.outputStream.avgFrameRate = new Rational(fr.num, fr.den);
          streamInfo.outputStream.rFrameRate = new Rational(fr.num, fr.den);
          streamInfo.outputStream.sampleAspectRatio = codecContext.sampleAspectRatio;
        }

        // 3. Copy codec parameters from encoder context
        const ret = streamInfo.outputStream.codecpar.fromContext(codecContext);
        FFmpegError.throwIfError(ret, 'Failed to copy codec parameters from encoder');

        // 3b. Overlay the trailing bitstream filter's output parameters, so
        // container-level fields (e.g. extradata/level rewritten by h264_metadata)
        // reflect the filter's output rather than the raw encoder output.
        const bsfParams = streamInfo.bsf?.outputCodecParameters;
        if (bsfParams) {
          const bsfRet = bsfParams.copy(streamInfo.outputStream.codecpar);
          FFmpegError.throwIfError(bsfRet, 'Failed to copy codec parameters from bitstream filter');
        }

        // 4. Copy metadata from input stream
        if (streamInfo.inputStream) {
          const metadata = streamInfo.inputStream.metadata;
          if (metadata) {
            streamInfo.outputStream.metadata = metadata;
          }

          // 5. Copy disposition from input stream
          streamInfo.outputStream.disposition = streamInfo.inputStream.disposition;

          // 5b. Copy coded_side_data from input stream (display matrix / rotation,
          // HDR mastering display & content light level). The encoder path only
          // copied codec parameters, so without this these are lost on transcode
          // (e.g. a portrait phone video would play sideways). Mirrors the stream
          // copy path.
          const inputSideData = streamInfo.inputStream.codecpar.getAllCodedSideData();
          for (const sd of inputSideData) {
            streamInfo.outputStream.codecpar.addCodedSideData(sd.type, sd.data);
          }

          // 6. Copy duration hint from input stream
          if (streamInfo.inputStream.duration > 0n) {
            const inputTb = streamInfo.inputStream.timeBase;
            const outputTb = streamInfo.outputStream.timeBase;
            const rescaledDuration = avRescaleQ(streamInfo.inputStream.duration, inputTb, outputTb);
            streamInfo.outputStream.duration = rescaledDuration;
          }
        }

        // Update the source timebase for timestamp rescaling
        streamInfo.sourceTimeBase = codecContext.timeBase;

        // Mark as initialized
        streamInfo.initialized = true;
      }
    }

    const streamInfo = this._streams.get(streamIndex)!;

    // Handle NULL packet - signals EOF for this stream (FFmpeg pattern: av_interleaved_write_frame(s, NULL))
    // FFmpeg's behavior:
    // - If muxer not started (uninitialized streams), buffer NULL in PreMuxQueue as EOF marker
    // - If muxer started, send NULL to SyncQueue to signal EOF and flush
    if (!packet) {
      // Mark stream as EOF received
      streamInfo.eofReceived = true;

      // Check if any streams are still uninitialized (PreMuxQueue phase)
      const uninitialized = Array.from(this._streams.values()).some((s) => !s.initialized);

      // PHASE 1: Before muxer starts - buffer NULL packet in PreMuxQueue
      // This matches FFmpeg's mux_queue_packet() which writes NULL to PreMuxQueue FIFO
      if (uninitialized || this.headerWritePromise) {
        // Buffer NULL as EOF marker (no size contribution)
        streamInfo.preMuxQueue.push(null);
        return;
      }

      // PHASE 2: After muxer started - send EOF to SyncQueue and flush
      if (!this.headerWritten) {
        return;
      }

      // If using SyncQueue, send EOF for this stream
      if (this.syncQueue && streamInfo.sqIdxMux >= 0) {
        // Send NULL to signal EOF to sync queue
        // Native side handles null correctly (sets sqframe.p = nullptr)
        const ret = this.syncQueue.send(streamInfo.sqIdxMux, null);

        if (ret < 0 && ret !== AVERROR_EOF) {
          if (this.options.exitOnError) {
            FFmpegError.throwIfError(ret, 'Failed to send EOF to sync queue');
          }
        }

        // Receive and write any remaining packets from sync queue
        while (!this.isClosed) {
          const recvRet = this.syncQueue.receive(-1, this.sqPacket!);
          if (recvRet === AVERROR_EAGAIN) {
            break; // No more packets ready
          }
          if (recvRet === AVERROR_EOF) {
            break; // All streams finished
          }
          if (recvRet >= 0) {
            const recvStreamInfo = this._streams.get(recvRet)!;
            const pkt = this.sqPacket!.clone();
            if (!pkt) {
              throw new Error('Failed to clone packet from sync queue');
            }
            pkt.streamIndex = recvRet;
            this.writeSync(pkt, recvStreamInfo, recvRet);
          }
        }
      }

      return; // EOF signaled, nothing more to do
    }

    // Clone packet immediately - we will modify it and caller retains ownership
    const clonedPacket = packet.clone();
    if (!clonedPacket) {
      throw new Error('Failed to clone packet for writing');
    }

    // Apply streamcopy filtering BEFORE buffering
    // This ensures rejected packets never enter the queue/buffer
    if (streamInfo.isStreamCopy) {
      const shouldWrite = this.ofStreamcopy(clonedPacket, streamInfo, streamIndex);
      if (!shouldWrite) {
        clonedPacket.free(); // Free the clone since we won't use it
        return;
      }
    } else if (this.options.startTime !== undefined) {
      // For encoded (non-streamcopy) streams, strip the device's startTime base.
      this.applyStartTimeOffset(clonedPacket, streamInfo);
    }

    // Check if any streams are still uninitialized
    const uninitialized = Array.from(this._streams.values()).some((s) => !s.initialized);

    // PHASE 1: Before header write - ALWAYS buffer in PreMuxQueue
    // PreMuxQueue is used during initialization phase ONLY (regardless of SyncQueue presence)
    // After header write, PreMuxQueue is flushed in DTS-sorted order
    if (uninitialized) {
      // Check PreMuxQueue limits
      const maxPackets = this.options.maxMuxingQueueSize ?? MAX_MUXING_QUEUE_SIZE;
      const dataThreshold = this.options.muxingQueueDataThreshold ?? MUXING_QUEUE_DATA_THRESHOLD;

      const currentPackets = streamInfo.preMuxQueue.length;
      const currentBytes = streamInfo.preMuxQueueDataSize;
      const packetSize = clonedPacket.size;

      const thresholdReached = currentBytes + packetSize > dataThreshold;
      const effectiveMaxPackets = thresholdReached ? maxPackets : Number.MAX_SAFE_INTEGER;

      // Check if we would exceed packet limit (only if threshold reached)
      if (currentPackets >= effectiveMaxPackets) {
        clonedPacket.free(); // Free the clone since we can't buffer it
        throw new Error(
          // eslint-disable-next-line @stylistic/max-len
          `Too many packets buffered for output stream ${streamIndex} (packets: ${currentPackets}, bytes: ${currentBytes}, threshold: ${dataThreshold}, max: ${maxPackets})`,
        );
      }

      // Buffer in PreMuxQueue (per-stream FIFO)
      streamInfo.preMuxQueue.push(clonedPacket);
      streamInfo.preMuxQueueDataSize += packetSize;

      return; // Don't proceed to header write yet
    }

    // Automatically write header if not written yet
    if (!this.headerWritten) {
      this.prepareHeaderWrite();

      const ret = this.formatContext.writeHeaderSync();
      FFmpegError.throwIfError(ret, 'Failed to write header');
      this.headerWritten = true;

      // PHASE 2: Flush PreMuxQueue in DTS-sorted order (once after header write)
      // Packets go: PreMuxQueue → SyncQueue (if present) → Muxer
      this.flushPreMuxQueuesSync();
    }

    // PHASE 3: Write packet - normal muxing after header
    if (this.syncQueue && streamInfo.sqIdxMux >= 0) {
      // Use SyncQueue for packet interleaving
      // NOTE: Do NOT set clonedPacket.timeBase here!
      // Packet must keep its source timebase (encoder timebase) so muxFixupTs can rescale correctly

      // Send packet to sync queue
      const ret = this.syncQueue.send(streamInfo.sqIdxMux, clonedPacket);

      // Handle errors from sq_send
      if (ret < 0) {
        if (ret === AVERROR_EOF) {
          // Stream finished - this is normal, just return
          return;
        }

        if (this.options.exitOnError) {
          FFmpegError.throwIfError(ret, 'Failed to send packet to sync queue');
        }
        return;
      }

      // Receive synchronized packets from queue and write to muxer
      while (!this.isClosed) {
        const recvRet = this.syncQueue.receive(-1, this.sqPacket!);
        if (recvRet === AVERROR_EAGAIN) {
          break; // No more packets ready
        }
        if (recvRet === AVERROR_EOF) {
          break; // All streams finished
        }
        if (recvRet >= 0) {
          // recvRet is the stream index
          const recvStreamInfo = this._streams.get(recvRet)!;

          // Clone packet before writing (muxer takes ownership and will unref it)
          // We need to keep sqPacket alive for the next receive() call
          const pkt = this.sqPacket!.clone();
          if (!pkt) {
            throw new Error('Failed to clone packet from sync queue');
          }
          pkt.streamIndex = recvRet;

          // Write packet (muxer takes ownership)
          this.writeSync(pkt, recvStreamInfo, recvRet);
        }
      }
    } else {
      // No sync queue needed - write directly
      clonedPacket.streamIndex = streamIndex;
      this.writeSync(clonedPacket, streamInfo, streamIndex);
    }
  }

  /**
   * Close muxer and free resources.
   *
   * Automatically writes trailer if header was written.
   * Closes the output file and releases all resources.
   * Safe to call multiple times.
   * Automatically called by Symbol.asyncDispose.
   *
   * @example
   * ```typescript
   * const output = await Muxer.open('output.mp4');
   * try {
   *   // Use output - trailer written automatically on close
   * } finally {
   *   await output.close();
   * }
   * ```
   *
   * @throws {Error} If a background write failed and was not yet observed by the caller (resources are still released; a second close() is a no-op)
   *
   * @see {@link Symbol.asyncDispose} For automatic cleanup
   */
  async close(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;

    // Close write queue and wait for worker to finish.
    // The worker catches its own errors, but guard the await anyway so a
    // failed worker can never abort cleanup - resources below must always
    // be freed even after a write failure.
    if (this.writeQueue) {
      this.writeQueue.close();
      try {
        await this.writeWorkerPromise;
      } catch (error) {
        this.writeWorkerError ??= error instanceof Error ? error : new Error(String(error));
      }
      this.writeQueue.clear(); // Free any job packet the worker never consumed
    }

    // Free PreMuxQueue packets
    for (const streamInfo of this._streams.values()) {
      // Free any packets in PreMuxQueue
      for (const pkt of streamInfo.preMuxQueue) {
        pkt?.free();
      }
      streamInfo.preMuxQueue = [];
    }

    // Free sync queue resources
    if (this.sqPacket) {
      this.sqPacket.free();
      this.sqPacket = undefined;
    }
    if (this.syncQueue) {
      this.syncQueue.free();
      this.syncQueue = undefined;
    }

    // Try to write trailer if header was written but trailer wasn't
    try {
      if (this.headerWritten && !this.trailerWritten) {
        await this.formatContext.writeTrailer();
        this.trailerWritten = true;
      }
    } catch {
      // Ignore errors
    }

    // Clear pb reference first to prevent use-after-free
    if (this.ioContext) {
      this.formatContext.pb = null;
    }

    // Determine if this is custom IO before freeing format context
    const isCustomIO = this.formatContext.hasFlags(AVFMT_FLAG_CUSTOM_IO);

    // For file-based IO, close the file handle via closep
    // For custom IO, the context will be freed below
    if (this.ioContext && !isCustomIO) {
      try {
        await this.ioContext.closep();
      } catch {
        // Ignore errors
      }
    }

    // Free format context
    if (this.formatContext) {
      try {
        this.formatContext.freeContext();
      } catch {
        // Ignore errors
      }
    }

    // Now free custom IO context if present
    if (this.ioContext && isCustomIO) {
      try {
        this.ioContext.freeContext();
      } catch {
        // Ignore errors
      }
    }

    // Surface a background write failure the caller may not have observed yet.
    // Thrown only after all resources are freed - a second close() is a no-op.
    if (this.writeWorkerError) {
      throw this.writeWorkerError;
    }
  }

  /**
   * Close muxer and free resources synchronously.
   * Synchronous version of close.
   *
   * Automatically writes trailer if header was written.
   * Closes the output file and releases all resources.
   * Safe to call multiple times.
   * Automatically called by Symbol.dispose.
   *
   * @example
   * ```typescript
   * const output = Muxer.openSync('output.mp4');
   * try {
   *   // Use output - trailer written automatically on close
   * } finally {
   *   output.closeSync();
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

    // Free PreMuxQueue packets
    for (const streamInfo of this._streams.values()) {
      // Free any packets in PreMuxQueue
      for (const pkt of streamInfo.preMuxQueue) {
        pkt?.free();
      }
      streamInfo.preMuxQueue = [];
    }

    // Free sync queue resources
    if (this.sqPacket) {
      this.sqPacket.free();
      this.sqPacket = undefined;
    }
    if (this.syncQueue) {
      this.syncQueue.free();
      this.syncQueue = undefined;
    }

    // Try to write trailer if header was written but trailer wasn't
    try {
      if (this.headerWritten && !this.trailerWritten) {
        this.formatContext.writeTrailerSync();
        this.trailerWritten = true;
      }
    } catch {
      // Ignore errors
    }

    // Clear pb reference first to prevent use-after-free
    if (this.ioContext) {
      this.formatContext.pb = null;
    }

    // Determine if this is custom IO before freeing format context
    const isCustomIO = this.formatContext.hasFlags(AVFMT_FLAG_CUSTOM_IO);

    // For file-based IO, close the file handle via closep
    // For custom IO, the context will be freed below
    if (this.ioContext && !isCustomIO) {
      try {
        this.ioContext.closepSync();
      } catch {
        // Ignore errors
      }
    }

    // Free format context
    if (this.formatContext) {
      try {
        this.formatContext.freeContext();
      } catch {
        // Ignore errors
      }
    }

    // Now free custom IO context if present
    if (this.ioContext && isCustomIO) {
      try {
        this.ioContext.freeContext();
      } catch {
        // Ignore errors
      }
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
   * Apply shared pre-header setup for writePacket and writePacketSync.
   *
   * Configures sync queues, dispositions and container metadata, then applies
   * user-provided context options and the configure callback. Must run
   * immediately before writing the header so both variants stay in sync.
   *
   * @internal
   */
  private prepareHeaderWrite(): void {
    this.setupSyncQueues();
    this.updateDefaultDisposition();
    this.copyContainerMetadata();

    applyContextOptions(this.formatContext, this.options.context);
    this.options.configure?.(this.formatContext);
  }

  /**
   * Setup sync queues based on stream configuration.
   *
   * Called before writing header.
   * Muxing sync queue is created only if nb_interleaved > nb_av_enc
   * (i.e., when there are streamcopy streams).
   *
   * All streams are added as non-limiting (FFmpeg default without -shortest),
   * which means no timestamp-based synchronization - frames are output immediately.
   *
   * @internal
   */
  private setupSyncQueues(): void {
    const nbInterleaved = this._streams.size; // All streams are interleaved (no attachments)
    const nbAvEnc = Array.from(this._streams.values()).filter((s) => !s.isStreamCopy).length;

    // FFmpeg's condition: if there are streamcopy streams (nb_interleaved > nb_av_enc),
    // then ALL streams use the sync queue (but as non-limiting, so no actual sync happens)
    const needsSyncQueue = this.options.useSyncQueue && nbInterleaved > nbAvEnc;

    if (needsSyncQueue && !this.syncQueue) {
      // Create sync queue
      const bufDurationSec = this.options.syncQueueBufferDuration ?? SYNC_BUFFER_DURATION;
      const bufSizeUs = bufDurationSec * 1000000; // Convert to microseconds
      this.syncQueue = SyncQueue.create(SyncQueueType.PACKETS, bufSizeUs);
      this.sqPacket = new Packet();
      this.sqPacket.alloc();

      // Add all streams to sync queue
      // FFmpeg standard (without -shortest): limiting = 0 (non-limiting)
      // This means frames are output immediately without synchronization
      for (const streamInfo of this._streams.values()) {
        streamInfo.sqIdxMux = this.syncQueue.addStream(0); // 0 = non-limiting
      }
    } else if (!needsSyncQueue && this.syncQueue) {
      // Free sync queue if we don't need it anymore
      this.sqPacket?.free();
      this.sqPacket = undefined;
      this.syncQueue.free();
      this.syncQueue = undefined;

      // Reset all sqIdxMux to -1
      for (const streamInfo of this._streams.values()) {
        streamInfo.sqIdxMux = -1;
      }
    }
  }

  /**
   * Flush all PreMuxQueues in DTS-sorted order.
   *
   * Implements FFmpeg's PreMuxQueue flush algorithm from mux_task_start().
   * Repeatedly finds the stream with the earliest DTS packet and sends it:
   * - WITH SyncQueue: Sends to SyncQueue for interleaving
   * - WITHOUT SyncQueue: Writes directly to muxer
   * NULL packets (EOF markers) and packets with AV_NOPTS_VALUE have priority (sent first).
   *
   * @internal
   */
  private async flushPreMuxQueues(): Promise<void> {
    while (true) {
      let minStreamInfo: StreamDescription | null = null;
      let minStreamIndex = -1;
      let minDts = AV_NOPTS_VALUE;
      let minTimeBase: IRational = { num: 1, den: 1 };

      // 1. Find stream with earliest DTS across all PreMuxQueues
      // FFmpeg logic: NULL packets and AV_NOPTS_VALUE packets have priority
      for (const [streamIndex, streamInfo] of this._streams) {
        if (streamInfo.preMuxQueue.length === 0) {
          continue;
        }

        const pkt = streamInfo.preMuxQueue[0]; // Peek at first packet (can be null)

        // NULL packets (EOF markers) have highest priority (FFmpeg: if (!pkt) -> priority)
        // Packets with AV_NOPTS_VALUE also have priority
        if (!pkt || pkt.dts === AV_NOPTS_VALUE) {
          minStreamInfo = streamInfo;
          minStreamIndex = streamIndex;
          break;
        }

        // Compare DTS with current minimum
        if (minDts === AV_NOPTS_VALUE || avCompareTs(pkt.dts, pkt.timeBase, minDts, minTimeBase) < 0) {
          minStreamInfo = streamInfo;
          minStreamIndex = streamIndex;
          minDts = pkt.dts;
          minTimeBase = pkt.timeBase;
        }
      }

      // 2. No more packets - all queues empty
      if (!minStreamInfo) {
        break;
      }

      // 3. Take packet from stream with earliest DTS (or NULL for EOF)
      const pkt = minStreamInfo.preMuxQueue.shift()!;

      // 4. Handle NULL packet (EOF marker)
      // FFmpeg: if (pkt) { send packet } else { tq_send_finish() }
      if (!pkt) {
        // Signal EOF to SyncQueue for this stream
        if (this.syncQueue && minStreamInfo.sqIdxMux >= 0) {
          const ret = this.syncQueue.send(minStreamInfo.sqIdxMux, null);
          if (ret < 0 && ret !== AVERROR_EOF) {
            if (this.options.exitOnError) {
              FFmpegError.throwIfError(ret, 'Failed to send EOF to sync queue during PreMuxQueue flush');
            }
          }
        }
        // If not using SyncQueue, nothing to do - stream finished without data
        continue;
      }

      // 5. Normal packet - update data size and send
      minStreamInfo.preMuxQueueDataSize -= pkt.size;

      // 6. Send to SyncQueue or write directly
      pkt.streamIndex = minStreamIndex;
      if (this.syncQueue && minStreamInfo.sqIdxMux >= 0) {
        // Send to SyncQueue for interleaving
        // NOTE: Do NOT set pkt.timeBase here!
        // Packet must keep its source timebase so muxFixupTs can rescale correctly
        // pkt.timeBase = minStreamInfo.stream.timeBase;  // ❌ WRONG!
        const ret = this.syncQueue.send(minStreamInfo.sqIdxMux, pkt);
        if (ret < 0 && ret !== AVERROR_EOF) {
          if (this.options.exitOnError) {
            FFmpegError.throwIfError(ret, 'Failed to send packet to sync queue during PreMuxQueue flush');
          }
        }
      } else {
        // Write directly to muxer
        await this.write(pkt, minStreamInfo, minStreamIndex);
      }
    }

    // If using SyncQueue, receive and write all interleaved packets
    if (this.syncQueue) {
      while (!this.isClosed) {
        const recvRet = this.syncQueue.receive(-1, this.sqPacket!);
        if (recvRet === AVERROR_EAGAIN) {
          break; // No more packets ready
        }
        if (recvRet === AVERROR_EOF) {
          break; // All streams finished
        }
        if (recvRet >= 0) {
          // recvRet is the stream index
          const recvStreamInfo = this._streams.get(recvRet)!;

          // Clone packet before writing (muxer takes ownership and will unref it)
          const pkt = this.sqPacket!.clone();
          if (!pkt) {
            throw new Error('Failed to clone packet from sync queue during PreMuxQueue flush');
          }
          pkt.streamIndex = recvRet;

          // Write packet (muxer takes ownership)
          await this.write(pkt, recvStreamInfo, recvRet);
        }
      }
    }
  }

  /**
   * Flush all PreMuxQueues in DTS-sorted order (synchronous version).
   *
   * Implements FFmpeg's PreMuxQueue flush algorithm from mux_task_start().
   * Repeatedly finds the stream with the earliest DTS packet and sends it:
   * - WITH SyncQueue: Sends to SyncQueue for interleaving
   * - WITHOUT SyncQueue: Writes directly to muxer
   * NULL packets (EOF markers) and packets with AV_NOPTS_VALUE have priority (sent first).
   *
   * @internal
   */
  private flushPreMuxQueuesSync(): void {
    while (true) {
      let minStreamInfo: StreamDescription | null = null;
      let minStreamIndex = -1;
      let minDts = AV_NOPTS_VALUE;
      let minTimeBase: IRational = { num: 1, den: 1 };

      // 1. Find stream with earliest DTS across all PreMuxQueues
      // FFmpeg logic: NULL packets and AV_NOPTS_VALUE packets have priority
      for (const [streamIndex, streamInfo] of this._streams) {
        if (streamInfo.preMuxQueue.length === 0) continue;

        const pkt = streamInfo.preMuxQueue[0]; // Peek at first packet (can be null)

        // NULL packets (EOF markers) have highest priority (FFmpeg: if (!pkt) -> priority)
        // Packets with AV_NOPTS_VALUE also have priority
        if (!pkt || pkt.dts === AV_NOPTS_VALUE) {
          minStreamInfo = streamInfo;
          minStreamIndex = streamIndex;
          break;
        }

        // Compare DTS with current minimum
        if (minDts === AV_NOPTS_VALUE || avCompareTs(pkt.dts, pkt.timeBase, minDts, minTimeBase) < 0) {
          minStreamInfo = streamInfo;
          minStreamIndex = streamIndex;
          minDts = pkt.dts;
          minTimeBase = pkt.timeBase;
        }
      }

      // 2. No more packets - all queues empty
      if (!minStreamInfo) break;

      // 3. Take packet from stream with earliest DTS (or NULL for EOF)
      const pkt = minStreamInfo.preMuxQueue.shift()!;

      // 4. Handle NULL packet (EOF marker)
      // FFmpeg: if (pkt) { send packet } else { tq_send_finish() }
      if (!pkt) {
        // Signal EOF to SyncQueue for this stream
        if (this.syncQueue && minStreamInfo.sqIdxMux >= 0) {
          const ret = this.syncQueue.send(minStreamInfo.sqIdxMux, null);
          if (ret < 0 && ret !== AVERROR_EOF) {
            if (this.options.exitOnError) {
              FFmpegError.throwIfError(ret, 'Failed to send EOF to sync queue during PreMuxQueue flush');
            }
          }
        }
        // If not using SyncQueue, nothing to do - stream finished without data
        continue;
      }

      // 5. Normal packet - update data size and send
      minStreamInfo.preMuxQueueDataSize -= pkt.size;

      // 6. Send to SyncQueue or write directly
      pkt.streamIndex = minStreamIndex;
      if (this.syncQueue && minStreamInfo.sqIdxMux >= 0) {
        // Send to SyncQueue for interleaving
        // NOTE: Do NOT set pkt.timeBase here!
        // Packet must keep its source timebase so muxFixupTs can rescale correctly
        // pkt.timeBase = minStreamInfo.stream.timeBase;  // ❌ WRONG!
        const ret = this.syncQueue.send(minStreamInfo.sqIdxMux, pkt);
        if (ret < 0 && ret !== AVERROR_EOF) {
          if (this.options.exitOnError) {
            FFmpegError.throwIfError(ret, 'Failed to send packet to sync queue during PreMuxQueue flush');
          }
        }
      } else {
        // Write directly to muxer
        this.writeSync(pkt, minStreamInfo, minStreamIndex);
      }
    }

    // If using SyncQueue, receive and write all interleaved packets
    if (this.syncQueue) {
      while (!this.isClosed) {
        const recvRet = this.syncQueue.receive(-1, this.sqPacket!);
        if (recvRet === AVERROR_EAGAIN) {
          break; // No more packets ready
        }
        if (recvRet === AVERROR_EOF) {
          break; // All streams finished
        }
        if (recvRet >= 0) {
          // recvRet is the stream index
          const recvStreamInfo = this._streams.get(recvRet)!;

          // Clone packet before writing (muxer takes ownership and will unref it)
          const pkt = this.sqPacket!.clone();
          if (!pkt) {
            throw new Error('Failed to clone packet from sync queue during PreMuxQueue flush');
          }
          pkt.streamIndex = recvRet;

          // Write packet (muxer takes ownership)
          this.writeSync(pkt, recvStreamInfo, recvRet);
        }
      }
    }
  }

  /**
   * Write a packet to the output.
   *
   * @param pkt - Packet to write
   *
   * @param streamInfo - Stream description
   *
   * @param streamIndex - Stream index
   *
   * @internal
   */
  private async write(pkt: Packet, streamInfo: StreamDescription, streamIndex: number): Promise<void> {
    if (this.writeQueue) {
      // Use async queue for serialized writes.
      // If the worker died with a write error, the queue is poisoned and send()
      // rethrows that error - free the clone since it never reaches the worker.
      try {
        await this.writeQueue.send({ pkt, streamInfo, streamIndex });
      } catch (error) {
        pkt.free();
        throw error;
      }
    } else {
      // Direct write without serialization
      await this.writeInternal(pkt, streamInfo, streamIndex);
    }
  }

  /**
   * Internal write implementation.
   * Called either directly or through the write worker.
   *
   * @param pkt - Packet to write
   *
   * @param streamInfo - Stream description
   *
   * @param streamIndex - Stream index
   *
   * @internal
   */
  private async writeInternal(pkt: Packet, streamInfo: StreamDescription, streamIndex: number): Promise<void> {
    // Fix timestamps (rescale, DTS>PTS fix, monotonic DTS enforcement)
    this.muxFixupTs(pkt, streamInfo, streamIndex);

    // Write the packet (muxer takes ownership and will unref it)
    // NOTE: Caller must clone packet if they need to keep it (e.g., for SyncQueue)
    const ret = await this.formatContext.interleavedWriteFrame(pkt);

    // Handle write errors
    if (ret < 0 && ret !== AVERROR_EOF) {
      if (this.options.exitOnError) {
        FFmpegError.throwIfError(ret, 'Failed to write packet');
      }
    }
  }

  /**
   * Start background worker for async write queue.
   * Processes write jobs sequentially to prevent race conditions.
   *
   * @internal
   */
  private startWriteWorker(): void {
    if (!this.options.useAsyncWrite || this._streams.size <= 1) {
      return;
    }

    this.writeQueue ??= new AsyncQueue<WriteJob>(1, (job) => job.pkt.free()); // size=1 for strict serialization

    this.writeWorkerPromise ??= (async () => {
      try {
        while (true) {
          const job = await this.writeQueue!.receive();
          if (!job) break; // Queue closed
          await this.writeInternal(job.pkt, job.streamInfo, job.streamIndex);
        }
      } catch (error) {
        // A write failure kills the worker. Without propagation the next send()
        // would block forever on a queue nobody drains (pipeline deadlock), so
        // store the error and poison the queue: pending and future send() calls
        // throw it instead of hanging. close() surfaces it after cleanup.
        const err = error instanceof Error ? error : new Error(String(error));
        this.writeWorkerError = err;
        this.writeQueue?.closeWithError(err);
        this.writeQueue?.clear(); // Free any job packet still buffered
      }
    })();
  }

  /**
   * Write a packet to the output synchronously.
   * Synchronous version of write.
   *
   * @param pkt - Packet to write
   *
   * @param streamInfo - Stream description
   *
   * @param streamIndex - Stream index
   *
   * @internal
   */
  private writeSync(pkt: Packet, streamInfo: StreamDescription, streamIndex: number): void {
    // Fix timestamps (rescale, DTS>PTS fix, monotonic DTS enforcement)
    this.muxFixupTs(pkt, streamInfo, streamIndex);

    // Write the packet (muxer takes ownership and will unref it)
    // NOTE: Caller must clone packet if they need to keep it (e.g., for SyncQueue)
    const ret = this.formatContext.interleavedWriteFrameSync(pkt);

    FFmpegError.throwIfError(ret, 'Failed to write packet');
  }

  /**
   * Streamcopy packet filtering and timestamp offset.
   *
   * Applies streamcopy-specific logic before muxing:
   * 1. Recording time limit check
   * 2. Skip non-keyframe packets at start (unless copyInitialNonkeyframes)
   * 3. Skip packets before ts_copy_start (unless copyPriorStart)
   * 4. Skip packets before startTime
   * 5. Apply start_time timestamp offset
   *
   * @param pkt - Packet to process
   *
   * @param streamInfo - Stream description
   *
   * @param streamIndex - Stream index
   *
   * @returns true if packet should be written, false if packet should be skipped
   *
   * @throws {Error} If recording time limit reached
   *
   * @internal
   */

  /**
   * Apply the configured `startTime` offset to an encoded packet, per stream.
   *
   * `startTime` exists to strip a device's boot-relative timestamp base (e.g. the
   * mach uptime avfoundation reports). But audio encoders re-stamp their output to
   * a ~0 baseline, so subtracting a large device startTime from them would push the
   * timestamps hugely negative and produce a broken/overflowed edit list that strict
   * players (QuickTime) reject. The effective offset is therefore decided once on the
   * stream's first packet and clamped to what the stream actually carries —
   * `min(startTime, max(0, firstPts))`: boot-relative streams normalize to zero,
   * already-zero-based streams are left untouched.
   *
   * @param packet - Cloned packet to adjust in place
   *
   * @param streamInfo - Per-stream muxing state
   *
   * @internal
   */
  private applyStartTimeOffset(packet: Packet, streamInfo: StreamDescription): void {
    if (this.options.startTime === undefined) {
      return;
    }

    if (streamInfo.startTimeOffset === undefined) {
      const startTimeUs = BigInt(Math.floor(this.options.startTime * 1000000));
      const requested = avRescaleQ(startTimeUs, AV_TIME_BASE_Q, packet.timeBase);
      const firstTs = packet.pts !== AV_NOPTS_VALUE ? packet.pts : packet.dts;
      const carried = firstTs !== AV_NOPTS_VALUE && firstTs > 0n ? firstTs : 0n;
      streamInfo.startTimeOffset = requested < carried ? requested : carried;
    }

    const offset = streamInfo.startTimeOffset;
    if (offset === 0n) {
      return;
    }
    if (packet.pts !== AV_NOPTS_VALUE) {
      packet.pts -= offset;
    }
    if (packet.dts !== AV_NOPTS_VALUE) {
      packet.dts -= offset;
    }
  }

  private ofStreamcopy(pkt: Packet, streamInfo: StreamDescription, streamIndex: number): boolean {
    const outputStream = this.formatContext.streams[streamIndex];
    if (!outputStream) {
      return false;
    }

    // Get DTS in AV_TIME_BASE for comparison
    // Use packet DTS directly
    const dts = pkt.dts !== AV_NOPTS_VALUE ? avRescaleQ(pkt.dts, pkt.timeBase, AV_TIME_BASE_Q) : AV_NOPTS_VALUE;
    const startTimeUs = this.options.startTime !== undefined ? BigInt(Math.floor(this.options.startTime * 1000000)) : AV_NOPTS_VALUE;

    // 1. Skip non-keyframes at start
    const copyInitialNonkeyframes = this.options.copyInitialNonkeyframes ?? false;
    if (!streamInfo.streamcopyStarted && !pkt.isKeyframe && !copyInitialNonkeyframes) {
      return false; // skip packet
    }

    // 2. Copy from specific start point
    if (!streamInfo.streamcopyStarted) {
      const copyPriorStart = this.options.copyPriorStart ?? -1;

      // Calculate ts_copy_start
      // Since we don't have input file timestamps, ts_copy_start is simply startTime or 0
      const tsCopyStart = startTimeUs !== AV_NOPTS_VALUE ? startTimeUs : 0n;

      // Only check ts_copy_start if copyPriorStart is not set (0 or -1)
      if (copyPriorStart !== 1 && tsCopyStart > 0n) {
        const pktTsUs = pkt.pts !== AV_NOPTS_VALUE ? avRescaleQ(pkt.pts, pkt.timeBase, AV_TIME_BASE_Q) : dts;

        if (pktTsUs !== AV_NOPTS_VALUE && pktTsUs < tsCopyStart) {
          return false; // skip packet
        }
      }

      // 3. Skip packets before startTime
      if (startTimeUs !== AV_NOPTS_VALUE && dts !== AV_NOPTS_VALUE && dts < startTimeUs) {
        return false; // skip packet
      }
    }

    // 4. Apply start_time timestamp offset
    // FFmpeg uses: start_time = (of->start_time == AV_NOPTS_VALUE) ? 0 : of->start_time
    const startForOffset = startTimeUs !== AV_NOPTS_VALUE ? startTimeUs : 0n;
    const tsOffset = avRescaleQ(startForOffset, AV_TIME_BASE_Q, pkt.timeBase);

    if (pkt.pts !== AV_NOPTS_VALUE) {
      pkt.pts -= tsOffset;
    }

    if (pkt.dts === AV_NOPTS_VALUE) {
      // If DTS missing, use our estimated DTS
      if (dts !== AV_NOPTS_VALUE) {
        pkt.dts = avRescaleQ(dts, AV_TIME_BASE_Q, pkt.timeBase);
      }
    } else if (outputStream.codecpar.codecType === AVMEDIA_TYPE_AUDIO) {
      // Audio: PTS = DTS - ts_offset
      pkt.pts = pkt.dts - tsOffset;
    }

    if (pkt.dts !== AV_NOPTS_VALUE) {
      pkt.dts -= tsOffset;
    }

    // Mark streamcopy as started
    streamInfo.streamcopyStarted = true;

    return true; // Packet should be written
  }

  /**
   * Fix packet timestamps before muxing.
   *
   * Performs timestamp corrections:
   * 1. Rescales timestamps to output timebase (av_rescale_delta for audio streamcopy)
   * 2. Sets pkt.timeBase to output stream timebase
   * 3. Fixes invalid DTS > PTS relationships
   * 4. Enforces monotonic DTS (never decreasing)
   *
   * @param pkt - Packet to fix
   *
   * @param streamInfo - Stream description
   *
   * @param streamIndex - Stream index
   *
   * @internal
   */
  private muxFixupTs(pkt: Packet, streamInfo: StreamDescription, streamIndex: number): void {
    const outputStream = this.formatContext.streams[streamIndex];
    if (!outputStream) return;

    const codecType = streamInfo.outputStream.codecpar.codecType;
    const dstTb = outputStream.timeBase;
    // const srcTb = streamInfo.sourceTimeBase!;

    // Check if timestamps are valid before rescaling
    // FFmpeg's av_rescale_q/av_rescale_delta don't accept AV_NOPTS_VALUE
    if (pkt.dts === AV_NOPTS_VALUE && pkt.pts === AV_NOPTS_VALUE) {
      // Set packet timebase anyway for muxer
      pkt.timeBase = dstTb;
      return;
    }

    // 1. Rescale timestamps to the stream timebase
    if (codecType === AVMEDIA_TYPE_AUDIO && streamInfo.isStreamCopy) {
      let duration = avGetAudioFrameDuration2(streamInfo.outputStream.codecpar, pkt.size);
      if (!duration) {
        duration = streamInfo.outputStream.codecpar.frameSize;
      }

      const srcTb = streamInfo.sourceTimeBase!;
      const sampleRate = streamInfo.outputStream.codecpar.sampleRate;
      const fsTb: IRational = { num: 1, den: sampleRate };

      pkt.dts = avRescaleDelta(srcTb, pkt.dts, fsTb, duration, streamInfo.tsRescaleDeltaLast, dstTb);
      pkt.pts = pkt.dts;

      pkt.duration = avRescaleQ(pkt.duration, srcTb, dstTb);
    } else {
      // For video or encoded audio, use regular rescaling
      const srcTb = streamInfo.sourceTimeBase!;
      pkt.rescaleTs(srcTb, dstTb);
    }

    // 2. Set packet timeBase
    // av_interleaved_write_frame uses this for sorting!
    pkt.timeBase = dstTb;

    // 3. Fix DTS > PTS (invalid relationship)
    // FFmpeg formula: median of (pts, dts, last_mux_dts+1)
    if (pkt.dts !== AV_NOPTS_VALUE && pkt.pts !== AV_NOPTS_VALUE && pkt.dts > pkt.pts) {
      const last = streamInfo.lastMuxDts !== AV_NOPTS_VALUE ? streamInfo.lastMuxDts + 1n : 0n;
      const min = pkt.pts < pkt.dts ? (pkt.pts < last ? pkt.pts : last) : pkt.dts < last ? pkt.dts : last;
      const max = pkt.pts > pkt.dts ? (pkt.pts > last ? pkt.pts : last) : pkt.dts > last ? pkt.dts : last;
      const median = pkt.pts + pkt.dts + last - min - max;
      pkt.pts = median;
      pkt.dts = median;
    }

    // 4. Enforce monotonic DTS
    if ((codecType === AVMEDIA_TYPE_AUDIO || codecType === AVMEDIA_TYPE_VIDEO) && pkt.dts !== AV_NOPTS_VALUE && streamInfo.lastMuxDts !== AV_NOPTS_VALUE) {
      // FFmpeg: max = last_mux_dts + !(oformat->flags & AVFMT_TS_NONSTRICT)
      // AVFMT_TS_NONSTRICT allows non-strict monotonic timestamps (equal DTS is OK)
      const tsNonStrict = this.formatContext.oformat?.hasFlags(AVFMT_TS_NONSTRICT) ?? false;
      const max = streamInfo.lastMuxDts + (tsNonStrict ? 0n : 1n);
      if (pkt.dts < max) {
        // Adjust PTS if it would create invalid relationship
        if (pkt.pts !== AV_NOPTS_VALUE && pkt.pts >= pkt.dts) {
          pkt.pts = pkt.pts > max ? pkt.pts : max;
        }
        pkt.dts = max;
      }
    }

    // 5. Update last mux DTS for next packet
    streamInfo.lastMuxDts = pkt.dts;
  }

  /**
   * Copy container metadata from input to output.
   *
   * Automatically copies global metadata from input Demuxer to output format context.
   * Only copies once (on first call). Removes duration/creation_time metadata.
   *
   * @internal
   */
  private copyContainerMetadata(): void {
    if (this.containerMetadataCopied || !this.options.input) {
      return;
    }

    const demuxer = 'input' in this.options.input ? this.options.input.input : this.options.input;
    const inputFormatContext = demuxer.getFormatContext();
    const inputMetadata = inputFormatContext.metadata;

    if (inputMetadata) {
      // Keys that FFmpeg removes after copying
      const keysToSkip = new Set(['duration', 'creation_time', 'company_name', 'product_name', 'product_version']);

      // Get all input metadata entries
      const entries = inputMetadata.getAll();

      // Filter out keys that should be skipped
      const filteredEntries: Record<string, string> = {};
      for (const [key, value] of Object.entries(entries)) {
        if (!keysToSkip.has(key)) {
          filteredEntries[key] = value;
        }
      }

      // Create new dictionary with filtered entries
      const metadata = Dictionary.fromObject(filteredEntries);

      // Set metadata to format context. The setter copies the content via
      // av_dict_copy, so the local dictionary must be freed afterwards.
      try {
        this.formatContext.metadata = metadata;
      } finally {
        metadata.free();
      }
    }

    this.containerMetadataCopied = true;
  }

  /**
   * Auto-set DEFAULT disposition for first stream of each type.
   *
   * FFmpeg automatically sets DEFAULT flag for the first stream of each type
   * if no stream of that type has DEFAULT set yet.
   *
   * @internal
   */
  private updateDefaultDisposition(): void {
    // Group streams by media type
    const streamsByType = new Map<number, Stream[]>();

    for (const streamInfo of this._streams.values()) {
      const codecType = streamInfo.outputStream.codecpar.codecType;
      if (!streamsByType.has(codecType)) {
        streamsByType.set(codecType, []);
      }
      streamsByType.get(codecType)!.push(streamInfo.outputStream);
    }

    // For each media type, check if any stream has DEFAULT disposition
    // If not, set DEFAULT on first stream
    for (const [_, streams] of streamsByType.entries()) {
      // Skip if only one stream of this type
      if (streams.length < 2) {
        continue;
      }

      // Check if any stream already has DEFAULT disposition
      const hasDefault = streams.some((s) => s.hasDisposition(AV_DISPOSITION_DEFAULT));

      if (!hasDefault) {
        // Find first stream that is not an attached picture
        const firstNonAttachedPic = streams.find((s) => !s.hasDisposition(AV_DISPOSITION_ATTACHED_PIC));

        if (firstNonAttachedPic) {
          // Set DEFAULT on first non-attached-picture stream
          firstNonAttachedPic.setDisposition(AV_DISPOSITION_DEFAULT);
        }
      }
    }
  }

  /**
   * Dispose of muxer.
   *
   * Implements AsyncDisposable interface for automatic cleanup.
   * Equivalent to calling close().
   *
   * @example
   * ```typescript
   * {
   *   await using output = await Muxer.open('output.mp4');
   *   // Use output...
   * } // Automatically closed
   * ```
   *
   * @see {@link close} For manual cleanup
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  /**
   * Dispose of muxer synchronously.
   *
   * Implements Disposable interface for automatic cleanup.
   * Equivalent to calling closeSync().
   *
   * @example
   * ```typescript
   * {
   *   using output = Muxer.openSync('output.mp4');
   *   // Use output...
   * } // Automatically closed
   * ```
   *
   * @see {@link closeSync} For manual cleanup
   */
  [Symbol.dispose](): void {
    this.closeSync();
  }
}
