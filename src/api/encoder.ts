import {
  AV_CODEC_CAP_ENCODER_REORDERED_OPAQUE,
  AV_CODEC_CAP_PARAM_CHANGE,
  AV_CODEC_FLAG_COPY_OPAQUE,
  AV_CODEC_FLAG_FRAME_DURATION,
  AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX,
  AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX,
  AV_PICTURE_TYPE_NONE,
  AV_PIX_FMT_NONE,
  AV_PKT_FLAG_TRUSTED,
  AVCHROMA_LOC_UNSPECIFIED,
  AVERROR_EAGAIN,
  AVERROR_ENCODER_NOT_FOUND,
  AVERROR_EOF,
  AVMEDIA_TYPE_AUDIO,
  AVMEDIA_TYPE_VIDEO,
  EOF,
} from '../constants/constants.js';
import { CodecContext } from '../lib/codec-context.js';
import { Codec } from '../lib/codec.js';
import { Dictionary } from '../lib/dictionary.js';
import { FFmpegError } from '../lib/error.js';
import { Frame } from '../lib/frame.js';
import { Packet } from '../lib/packet.js';
import { Rational } from '../lib/rational.js';
import { avRescaleQ } from '../lib/utilities.js';
import { AudioFrameBuffer } from './audio-frame-buffer.js';
import { FRAME_THREAD_QUEUE_SIZE, PACKET_THREAD_QUEUE_SIZE } from './constants.js';
import { AsyncQueue } from './utilities/async-queue.js';
import { SchedulerControl } from './utilities/scheduler.js';
import { parseBitrate } from './utils.js';

import type { AVCodecFlag, AVCodecID, AVPixelFormat, AVSampleFormat, AVThreadType, EncoderOptionsFor, EOFSignal, FFEncoderCodec } from '../constants/index.js';
import type { Decoder } from './decoder.js';
import type { FilterComplexAPI } from './filter-complex.js';
import type { FilterAPI } from './filter.js';
import type { Muxer } from './muxer.js';
import type { SchedulableComponent } from './utilities/scheduler.js';

/**
 * Options for encoder creation.
 */
export interface EncoderOptions<C = unknown> {
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
   * Number of threads to use for encoding.
   *
   * Set to 0 to auto-detect based on CPU cores.
   *
   * @default 1
   */
  threadCount?: number;

  /**
   * Type of threading to use for encoding.
   *
   * - `FF_THREAD_FRAME` (1): Encode multiple frames in parallel.
   *   Higher throughput but adds latency (1 frame delay per thread).
   *
   * - `FF_THREAD_SLICE` (2): Encode parts of a single frame in parallel.
   *   Lower latency, suitable for real-time encoding.
   *
   * @default FFmpeg default (both methods, codec chooses best)
   */
  threadType?: AVThreadType;

  /**
   * Additional codec-specific options.
   *
   * Key-value pairs of FFmpeg private codec options, passed directly to the encoder.
   * When the codec is created from a branded constant (e.g. `FF_ENCODER_LIBX264`),
   * these are strongly typed to that codec's known options (autocomplete + validation);
   * otherwise any string/number/boolean values are accepted.
   */
  options?: EncoderOptionsFor<C>;

  /**
   * AbortSignal for cancellation.
   *
   * When aborted, async generators stop yielding and async methods throw AbortError.
   */
  signal?: AbortSignal;
}

/**
 * High-level encoder for audio and video streams.
 *
 * Provides a simplified interface for encoding media frames to packets.
 * Handles codec initialization, hardware acceleration setup, and packet management.
 * Supports both synchronous frame-by-frame encoding and async iteration over packets.
 * Essential component in media processing pipelines for converting raw frames to compressed data.
 *
 * @example
 * ```typescript
 * import { Encoder } from 'node-av/api';
 * import { AV_CODEC_ID_H264, FF_ENCODER_LIBX264 } from 'node-av/constants';
 *
 * // Create H.264 encoder
 * const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
 *   type: 'video',
 *   width: 1920,
 *   height: 1080,
 *   pixelFormat: AV_PIX_FMT_YUV420P,
 *   timeBase: { num: 1, den: 30 },
 *   frameRate: { num: 30, den: 1 }
 * }, {
 *   bitrate: '5M',
 *   gopSize: 60
 * });
 *
 * // Encode frames
 * const packet = await encoder.encode(frame);
 * if (packet) {
 *   await output.writePacket(packet);
 *   packet.free();
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Hardware-accelerated encoding with lazy initialization
 * import { HardwareContext } from 'node-av/api';
 * import { FF_ENCODER_H264_VIDEOTOOLBOX } from 'node-av/constants';
 *
 * const hw = HardwareContext.auto();
 * const encoderCodec = hw?.getEncoderCodec('h264') ?? FF_ENCODER_H264_VIDEOTOOLBOX;
 * const encoder = await Encoder.create(encoderCodec, {
 *   timeBase: video.timeBase,
 *   bitrate: '10M'
 * });
 *
 * // Hardware context will be detected from first frame's hw_frames_ctx
 * for await (const packet of encoder.packets(frames)) {
 *   await output.writePacket(packet);
 *   packet.free();
 * }
 * ```
 *
 * @see {@link Decoder} For decoding packets to frames
 * @see {@link Muxer} For writing encoded packets
 * @see {@link HardwareContext} For GPU acceleration
 */
export class Encoder implements Disposable {
  private codecContext: CodecContext;
  private packet: Packet;
  private codec: Codec;
  private initializePromise: Promise<void> | null = null;
  private initialized = false;
  private isClosed = false;
  private opts?: Dictionary | null;
  private options: EncoderOptions;
  private audioFrameBuffer?: AudioFrameBuffer;

  // Worker pattern for push-based processing
  private inputQueue: AsyncQueue<Frame>;
  private outputQueue: AsyncQueue<Packet>;
  private workerPromise: Promise<void> | null = null;
  private pipeToPromise: Promise<void> | null = null;
  private signal?: AbortSignal;

  /**
   * @param codecContext - Configured codec context
   *
   * @param codec - Encoder codec
   *
   * @param options - Encoder options
   *
   * @param opts - Encoder options as Dictionary
   *
   * @internal
   */
  private constructor(codecContext: CodecContext, codec: Codec, options: EncoderOptions, opts?: Dictionary | null) {
    this.codecContext = codecContext;
    this.codec = codec;
    this.options = options;
    this.opts = opts;

    this.packet = new Packet();
    this.packet.alloc();
    this.inputQueue = new AsyncQueue<Frame>(FRAME_THREAD_QUEUE_SIZE, (f) => f.free());
    this.outputQueue = new AsyncQueue<Packet>(PACKET_THREAD_QUEUE_SIZE, (p) => p.free());
  }

  /**
   * Create an encoder with specified codec and options.
   *
   * Initializes an encoder with the appropriate codec and configuration.
   * Uses lazy initialization - encoder is opened when first frame is received.
   * Hardware context will be automatically detected from first frame if not provided.
   *
   * Direct mapping to avcodec_find_encoder_by_name() or avcodec_find_encoder().
   *
   * @param encoderCodec - Codec name, ID, or instance to use for encoding
   *
   * @param options - Optional encoder configuration options including required timeBase
   *
   * @returns Configured encoder instance
   *
   * @throws {Error} If encoder not found
   *
   * @example
   * ```typescript
   * // From decoder stream info
   * const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
   *   timeBase: video.timeBase,
   *   bitrate: '5M',
   *   gopSize: 60,
   *   options: {
   *     preset: 'fast',
   *     crf: '23'
   *   }
   * });
   * ```
   *
   * @example
   * ```typescript
   * // With custom stream info
   * const encoder = await Encoder.create(FF_ENCODER_AAC, {
   *   timeBase: audio.timeBase,
   *   bitrate: '192k'
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Hardware encoder
   * const hw = HardwareContext.auto();
   * const encoderCodec = hw?.getEncoderCodec('h264') ?? FF_ENCODER_H264_VIDEOTOOLBOX;
   * const encoder = await Encoder.create(encoderCodec, {
   *   timeBase: video.timeBase,
   *   bitrate: '8M'
   * });
   * ```
   *
   * @see {@link EncoderOptions} For configuration options
   * @see {@link createSync} For synchronous version
   */
  static async create<const C extends FFEncoderCodec | AVCodecID | Codec>(encoderCodec: C, options: EncoderOptions<C> = {}): Promise<Encoder> {
    let codec: Codec | null = null;

    if (encoderCodec instanceof Codec) {
      codec = encoderCodec;
    } else if (typeof encoderCodec === 'string') {
      codec = Codec.findEncoderByName(encoderCodec);
    } else {
      codec = Codec.findEncoder(encoderCodec);
    }

    if (!codec) {
      throw new FFmpegError(AVERROR_ENCODER_NOT_FOUND);
    }

    // Allocate codec context
    const codecContext = new CodecContext();
    codecContext.allocContext3(codec);

    // Apply encoder-specific options
    if (options.gopSize !== undefined) {
      codecContext.gopSize = options.gopSize;
    }

    if (options.maxBFrames !== undefined) {
      codecContext.maxBFrames = options.maxBFrames;
    }

    // Apply common options with codec-type-specific defaults
    if (options.bitrate === undefined) {
      // Set codec-type-specific default bitrate
      const isAudio = codec.type === AVMEDIA_TYPE_AUDIO;
      options.bitrate = isAudio ? 128_000 : 1_000_000;
    }

    const bitrate = typeof options.bitrate === 'string' ? parseBitrate(options.bitrate) : BigInt(options.bitrate);
    codecContext.bitRate = bitrate;

    if (options.minRate !== undefined) {
      const minRate = typeof options.minRate === 'string' ? parseBitrate(options.minRate) : BigInt(options.minRate);
      codecContext.rcMinRate = minRate;
    }

    if (options.maxRate !== undefined) {
      const maxRate = typeof options.maxRate === 'string' ? parseBitrate(options.maxRate) : BigInt(options.maxRate);
      codecContext.rcMaxRate = maxRate;
    }

    if (options.bufSize !== undefined) {
      const bufSize = typeof options.bufSize === 'string' ? parseBitrate(options.bufSize) : BigInt(options.bufSize);
      codecContext.rcBufferSize = Number(bufSize);
    }

    // Thread parameters need to be set before open
    codecContext.threadCount = options.threadCount ?? 0;
    if (options.threadType !== undefined) {
      codecContext.threadType = options.threadType;
    }

    // Loose view for internal use: the public signature narrows `options` to the
    // codec, but internally codec options are handled as a generic dictionary.
    const looseOptions = options as EncoderOptions;
    const opts = looseOptions.options ? Dictionary.fromObject(looseOptions.options) : undefined;

    const encoder = new Encoder(codecContext, codec, looseOptions, opts);

    if (options.signal) {
      options.signal.throwIfAborted();
      encoder.signal = options.signal;
    }

    return encoder;
  }

  /**
   * Create an encoder with specified codec and options synchronously.
   * Synchronous version of create.
   *
   * Initializes an encoder with the appropriate codec and configuration.
   * Uses lazy initialization - encoder is opened when first frame is received.
   * Hardware context will be automatically detected from first frame if not provided.
   *
   * Direct mapping to avcodec_find_encoder_by_name() or avcodec_find_encoder().
   *
   * @param encoderCodec - Codec name, ID, or instance to use for encoding
   *
   * @param options - Optional encoder configuration options including required timeBase
   *
   * @returns Configured encoder instance
   *
   * @throws {Error} If encoder not found or timeBase not provided
   *
   * @throws {FFmpegError} If codec allocation fails
   *
   * @example
   * ```typescript
   * // From decoder stream info
   * const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
   *   timeBase: video.timeBase,
   *   bitrate: '5M',
   *   gopSize: 60,
   *   options: {
   *     preset: 'fast',
   *     crf: '23'
   *   }
   * });
   * ```
   *
   * @example
   * ```typescript
   * // With custom stream info
   * const encoder = await Encoder.create(FF_ENCODER_AAC, {
   *   timeBase: audio.timeBase,
   *   bitrate: '192k'
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Hardware encoder
   * const hw = HardwareContext.auto();
   * const encoderCodec = hw?.getEncoderCodec('h264') ?? FF_ENCODER_H264_VIDEOTOOLBOX;
   * const encoder = await Encoder.create(encoderCodec, {
   *   timeBase: video.timeBase,
   *   bitrate: '8M'
   * });
   * ```
   *
   * @see {@link EncoderOptions} For configuration options
   * @see {@link create} For async version
   */
  static createSync<const C extends FFEncoderCodec | AVCodecID | Codec>(encoderCodec: C, options: EncoderOptions<C> = {}): Encoder {
    let codec: Codec | null = null;

    if (encoderCodec instanceof Codec) {
      codec = encoderCodec;
    } else if (typeof encoderCodec === 'string') {
      codec = Codec.findEncoderByName(encoderCodec);
    } else {
      codec = Codec.findEncoder(encoderCodec);
    }

    if (!codec) {
      throw new FFmpegError(AVERROR_ENCODER_NOT_FOUND);
    }

    // Allocate codec context

    const codecContext = new CodecContext();
    codecContext.allocContext3(codec);

    // Apply common options with codec-type-specific defaults
    if (options.bitrate === undefined) {
      // Set codec-type-specific default bitrate
      const isAudio = codec.type === AVMEDIA_TYPE_AUDIO;
      options.bitrate = isAudio ? 128_000 : 1_000_000;
    }

    const bitrate = typeof options.bitrate === 'string' ? parseBitrate(options.bitrate) : BigInt(options.bitrate);
    codecContext.bitRate = bitrate;

    if (options.gopSize !== undefined) {
      codecContext.gopSize = options.gopSize;
    }

    if (options.maxBFrames !== undefined) {
      codecContext.maxBFrames = options.maxBFrames;
    }

    if (options.minRate !== undefined) {
      const minRate = typeof options.minRate === 'string' ? parseBitrate(options.minRate) : BigInt(options.minRate);
      codecContext.rcMinRate = minRate;
    }

    if (options.maxRate !== undefined) {
      const maxRate = typeof options.maxRate === 'string' ? parseBitrate(options.maxRate) : BigInt(options.maxRate);
      codecContext.rcMaxRate = maxRate;
    }

    if (options.bufSize !== undefined) {
      const bufSize = typeof options.bufSize === 'string' ? parseBitrate(options.bufSize) : BigInt(options.bufSize);
      codecContext.rcBufferSize = Number(bufSize);
    }

    // Thread parameters need to be set before open
    codecContext.threadCount = options.threadCount ?? 0;
    if (options.threadType !== undefined) {
      codecContext.threadType = options.threadType;
    }

    // Loose view for internal use: the public signature narrows `options` to the
    // codec, but internally codec options are handled as a generic dictionary.
    const looseOptions = options as EncoderOptions;
    const opts = looseOptions.options ? Dictionary.fromObject(looseOptions.options) : undefined;

    const encoder = new Encoder(codecContext, codec, looseOptions, opts);

    if (options.signal) {
      options.signal.throwIfAborted();
      encoder.signal = options.signal;
    }

    return encoder;
  }

  /**
   * Encode a single frame into a self-contained image buffer.
   *
   * One-shot, stateless helper for intra-only image codecs (MJPEG, PNG, WebP, ...).
   * Creates a fresh encoder, encodes the frame, flushes and frees everything in one call.
   * The encoder adopts dimensions, pixel format and hardware context from the frame,
   * so any frame size works without reconfiguration.
   *
   * @param encoderCodec - Encoder codec (name, ID, branded constant, or Codec)
   *
   * @param frame - Frame to encode
   *
   * @param options - Optional encoder configuration (e.g. `{ options: { q: 3 } }` for MJPEG quality)
   *
   * @returns Encoded image bytes
   *
   * @throws {FFmpegError} If the encoder is not found or encoding fails
   *
   * @throws {Error} If the encoder produced no output
   *
   * @example
   * ```typescript
   * const jpeg = await Encoder.encodeOne(FF_ENCODER_MJPEG, frame, { options: { q: 3 } });
   * ```
   *
   * @see {@link EncoderPool} For reusing encoders across recurring resolutions
   */
  static async encodeOne<const C extends FFEncoderCodec | AVCodecID | Codec>(encoderCodec: C, frame: Frame, options: EncoderOptions<C> = {}): Promise<Buffer> {
    using encoder = await Encoder.create(encoderCodec, options);

    const packets = [...(await encoder.encodeAll(frame)), ...(await encoder.encodeAll(null))];
    try {
      const data = packets[0]?.data;
      if (!data) {
        throw new Error(`Encoder '${encoder.getCodec().name}' produced no output for frame`);
      }
      return data;
    } finally {
      for (const packet of packets) {
        packet.free();
      }
    }
  }

  /**
   * Encode a single frame into a self-contained image buffer synchronously.
   * Synchronous version of encodeOne.
   *
   * One-shot, stateless helper for intra-only image codecs (MJPEG, PNG, WebP, ...).
   * Creates a fresh encoder, encodes the frame, flushes and frees everything in one call.
   * The encoder adopts dimensions, pixel format and hardware context from the frame,
   * so any frame size works without reconfiguration.
   *
   * @param encoderCodec - Encoder codec (name, ID, branded constant, or Codec)
   *
   * @param frame - Frame to encode
   *
   * @param options - Optional encoder configuration (e.g. `{ options: { q: 3 } }` for MJPEG quality)
   *
   * @returns Encoded image bytes
   *
   * @throws {FFmpegError} If the encoder is not found or encoding fails
   *
   * @throws {Error} If the encoder produced no output
   *
   * @example
   * ```typescript
   * const jpeg = Encoder.encodeOneSync(FF_ENCODER_MJPEG, frame, { options: { q: 3 } });
   * ```
   *
   * @see {@link encodeOne} For async version
   * @see {@link EncoderPool} For reusing encoders across recurring resolutions
   */
  static encodeOneSync<const C extends FFEncoderCodec | AVCodecID | Codec>(encoderCodec: C, frame: Frame, options: EncoderOptions<C> = {}): Buffer {
    using encoder = Encoder.createSync(encoderCodec, options);

    const packets = [...encoder.encodeAllSync(frame), ...encoder.encodeAllSync(null)];
    try {
      const data = packets[0]?.data;
      if (!data) {
        throw new Error(`Encoder '${encoder.getCodec().name}' produced no output for frame`);
      }
      return data;
    } finally {
      for (const packet of packets) {
        packet.free();
      }
    }
  }

  /**
   * Check if encoder is open.
   *
   * @example
   * ```typescript
   * if (encoder.isEncoderOpen) {
   *   const packet = await encoder.encode(frame);
   * }
   * ```
   */
  get isEncoderOpen(): boolean {
    return !this.isClosed;
  }

  /**
   * Check if encoder has been initialized.
   *
   * Returns true after first frame has been processed and encoder opened.
   * Useful for checking if encoder has received frame properties.
   *
   * @returns true if encoder has been initialized with frame data
   *
   * @example
   * ```typescript
   * if (!encoder.isEncoderInitialized) {
   *   console.log('Encoder will initialize on first frame');
   * }
   * ```
   */
  get isEncoderInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Codec flags.
   *
   * @returns Current codec flags
   *
   * @throws {Error} If encoder is closed
   *
   * @example
   * ```typescript
   * const flags = encoder.codecFlags;
   * console.log('Current flags:', flags);
   * ```
   *
   * @see {@link setCodecFlags} To set flags
   * @see {@link clearCodecFlags} To clear flags
   * @see {@link hasCodecFlags} To check flags
   */
  get codecFlags(): AVCodecFlag {
    if (this.isClosed) {
      throw new Error('Cannot get flags on closed encoder');
    }
    return this.codecContext.flags;
  }

  /**
   * Set codec flags.
   *
   * @param flags - One or more flag values to set
   *
   * @throws {Error} If encoder is already initialized or closed
   *
   * @example
   * ```typescript
   * import { AV_CODEC_FLAG_GLOBAL_HEADER, AV_CODEC_FLAG_QSCALE } from 'node-av/constants';
   *
   * // Set multiple flags before initialization
   * encoder.setCodecFlags(AV_CODEC_FLAG_GLOBAL_HEADER, AV_CODEC_FLAG_QSCALE);
   * ```
   *
   * @see {@link clearCodecFlags} To clear flags
   * @see {@link hasCodecFlags} To check flags
   * @see {@link codecFlags} For direct flag access
   */
  setCodecFlags(...flags: AVCodecFlag[]): void {
    if (this.isClosed) {
      throw new Error('Cannot set flags on closed encoder');
    }
    if (this.initialized) {
      throw new Error('Cannot set flags on already initialized encoder');
    }
    this.codecContext.setFlags(...flags);
  }

  /**
   * Clear codec flags.
   *
   * @param flags - One or more flag values to clear
   *
   * @throws {Error} If encoder is already initialized or closed
   *
   * @example
   * ```typescript
   * import { AV_CODEC_FLAG_QSCALE } from 'node-av/constants';
   *
   * // Clear specific flag before initialization
   * encoder.clearCodecFlags(AV_CODEC_FLAG_QSCALE);
   * ```
   *
   * @see {@link setCodecFlags} To set flags
   * @see {@link hasCodecFlags} To check flags
   * @see {@link codecFlags} For direct flag access
   */
  clearCodecFlags(...flags: AVCodecFlag[]): void {
    if (this.isClosed) {
      throw new Error('Cannot clear flags on closed encoder');
    }
    if (this.initialized) {
      throw new Error('Cannot clear flags on already initialized encoder');
    }
    this.codecContext.clearFlags(...flags);
  }

  /**
   * Check if codec has specific flags.
   *
   * Tests whether all specified codec flags are set using bitwise AND.
   *
   * @param flags - One or more flag values to check
   *
   * @returns true if all specified flags are set, false otherwise
   *
   * @throws {Error} If encoder is closed
   *
   * @example
   * ```typescript
   * import { AV_CODEC_FLAG_GLOBAL_HEADER } from 'node-av/constants';
   *
   * if (encoder.hasCodecFlags(AV_CODEC_FLAG_GLOBAL_HEADER)) {
   *   console.log('Global header flag is set');
   * }
   * ```
   *
   * @see {@link setCodecFlags} To set flags
   * @see {@link clearCodecFlags} To clear flags
   * @see {@link codecFlags} For direct flag access
   */
  hasCodecFlags(...flags: AVCodecFlag[]): boolean {
    if (this.isClosed) {
      throw new Error('Cannot check flags on closed encoder');
    }
    return this.codecContext.hasFlags(...flags);
  }

  /**
   * Check if encoder uses hardware acceleration.
   *
   * @returns true if hardware-accelerated
   *
   * @example
   * ```typescript
   * if (encoder.isHardware()) {
   *   console.log('Using GPU acceleration');
   * }
   * ```
   *
   * @see {@link HardwareContext} For hardware setup
   */
  isHardware(): boolean {
    return this.codec.isHardwareAcceleratedEncoder();
  }

  /**
   * Check if encoder is ready for processing.
   *
   * @returns true if initialized and ready
   *
   * @example
   * ```typescript
   * if (encoder.isReady()) {
   *   const packet = await encoder.encode(frame);
   * }
   * ```
   */
  isReady(): boolean {
    return this.initialized && !this.isClosed;
  }

  /**
   * Send a frame to the encoder.
   *
   * Sends a raw frame to the encoder for encoding.
   * Does not return encoded packets - use {@link receive} to retrieve packets.
   * On first frame, automatically initializes encoder with frame properties.
   * A single frame can produce zero, one, or multiple packets depending on codec buffering.
   *
   * **Important**: This method only SENDS the frame to the encoder.
   * You must call {@link receive} separately (potentially multiple times) to get encoded packets.
   *
   * Direct mapping to avcodec_send_frame().
   *
   * @param frame - Raw frame to send to encoder, or null to flush
   *
   * @throws {FFmpegError} If sending frame fails
   *
   * @example
   * ```typescript
   * // Send frame and receive packets
   * await encoder.encode(frame);
   *
   * // Receive all available packets
   * while (true) {
   *   const packet = await encoder.receive();
   *   if (!packet) break;
   *   console.log(`Encoded packet with PTS: ${packet.pts}`);
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * for await (const frame of decoder.frames(input.packets())) {
   *   // Send frame
   *   await encoder.encode(frame);
   *
   *   // Receive available packets
   *   let packet;
   *   while ((packet = await encoder.receive())) {
   *     await output.writePacket(packet);
   *     packet.free();
   *   }
   *   frame.free();
   * }
   * ```
   *
   * @see {@link receive} For receiving encoded packets
   * @see {@link encodeAll} For combined send+receive operation
   * @see {@link packets} For automatic frame iteration
   * @see {@link flush} For end-of-stream handling
   * @see {@link encodeSync} For synchronous version
   */
  async encode(frame: Frame | null): Promise<void> {
    this.signal?.throwIfAborted();

    if (this.isClosed) {
      return;
    }

    // Null frame = flush encoder
    if (frame === null) {
      await this.flush();
      return;
    }

    // Open encoder if not already done
    this.initializePromise ??= this.initialize(frame);
    await this.initializePromise;

    // Prepare frame for encoding (set quality, validate channel count)
    this.prepareFrameForEncoding(frame);

    const encode = async (newFrame: Frame) => {
      const sendRet = await this.codecContext.sendFrame(newFrame);
      if (sendRet < 0 && sendRet !== AVERROR_EOF) {
        FFmpegError.throwIfError(sendRet, 'Failed to send frame to encoder');
        return;
      }
    };

    if (this.audioFrameBuffer) {
      // Push frame into buffer - actual sending happens in receive()
      await this.audioFrameBuffer.push(frame);
    } else {
      await encode(frame);
    }
  }

  /**
   * Send a frame to the encoder synchronously.
   * Synchronous version of encode.
   *
   * Sends a raw frame to the encoder for encoding.
   * Does not return encoded packets - use {@link receiveSync} to retrieve packets.
   * On first frame, automatically initializes encoder with frame properties.
   * A single frame can produce zero, one, or multiple packets depending on codec buffering.
   *
   * **Important**: This method only SENDS the frame to the encoder.
   * You must call {@link receiveSync} separately (potentially multiple times) to get encoded packets.
   *
   * Direct mapping to avcodec_send_frame().
   *
   * @param frame - Raw frame to send to encoder, or null to flush
   *
   * @throws {FFmpegError} If sending frame fails
   *
   * @example
   * ```typescript
   * // Send frame and receive packets
   * encoder.encodeSync(frame);
   *
   * // Receive all available packets
   * let packet;
   * while ((packet = encoder.receiveSync())) {
   *   console.log(`Encoded packet with PTS: ${packet.pts}`);
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link receiveSync} For receiving encoded packets
   * @see {@link encodeAllSync} For combined send+receive operation
   * @see {@link packetsSync} For automatic frame iteration
   * @see {@link flushSync} For end-of-stream handling
   * @see {@link encode} For async version
   */
  encodeSync(frame: Frame | null): void {
    if (this.isClosed) {
      return;
    }

    // Null frame = flush encoder
    if (frame === null) {
      this.flushSync();
      return;
    }

    // Open encoder if not already done
    if (!this.initialized) {
      this.initializeSync(frame);
    }

    // Prepare frame for encoding (set quality, validate channel count)
    this.prepareFrameForEncoding(frame);

    const encode = (newFrame: Frame) => {
      const sendRet = this.codecContext.sendFrameSync(newFrame);
      if (sendRet < 0 && sendRet !== AVERROR_EOF) {
        FFmpegError.throwIfError(sendRet, 'Failed to send frame to encoder');
        return;
      }
    };

    if (this.audioFrameBuffer) {
      // Push frame into buffer - actual sending happens in receiveSync()
      this.audioFrameBuffer.pushSync(frame);
    } else {
      encode(frame);
    }
  }

  /**
   * Encode a frame to packets.
   *
   * Sends a frame to the encoder and receives all available encoded packets.
   * Returns array of packets - may be empty if encoder needs more data.
   * On first frame, automatically initializes encoder with frame properties.
   * One frame can produce zero, one, or multiple packets depending on codec.
   *
   * Direct mapping to avcodec_send_frame() and avcodec_receive_packet().
   *
   * @param frame - Raw frame to encode (or null to flush)
   *
   * @returns Array of encoded packets (empty if more data needed or encoder is closed)
   *
   * @throws {FFmpegError} If encoding fails
   *
   * @example
   * ```typescript
   * const packets = await encoder.encodeAll(frame);
   * for (const packet of packets) {
   *   console.log(`Encoded packet with PTS: ${packet.pts}`);
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Encode loop
   * for await (const frame of decoder.frames(input.packets())) {
   *   const packets = await encoder.encodeAll(frame);
   *   for (const packet of packets) {
   *     await output.writePacket(packet);
   *     packet.free();
   *   }
   *   frame.free();
   * }
   * ```
   *
   * @see {@link encode} For single packet encoding
   * @see {@link packets} For automatic frame iteration
   * @see {@link flush} For end-of-stream handling
   * @see {@link encodeAllSync} For synchronous version
   */
  async encodeAll(frame: Frame | null): Promise<Packet[]> {
    this.signal?.throwIfAborted();
    await this.encode(frame);

    // Receive all available packets
    const packets: Packet[] = [];
    while (true) {
      const packet = await this.receive();
      if (!packet) break; // Stop on EAGAIN or EOF
      packets.push(packet); // Only push actual packets
    }
    return packets;
  }

  /**
   * Encode a frame to packets synchronously.
   * Synchronous version of encodeAll.
   *
   * Sends a frame to the encoder and receives all available encoded packets.
   * Returns array of packets - may be empty if encoder needs more data.
   * On first frame, automatically initializes encoder with frame properties.
   * One frame can produce zero, one, or multiple packets depending on codec.
   *
   * Direct mapping to avcodec_send_frame() and avcodec_receive_packet().
   *
   * @param frame - Raw frame to encode (or null to flush)
   *
   * @returns Array of encoded packets (empty if more data needed or encoder is closed)
   *
   * @throws {FFmpegError} If encoding fails
   *
   * @example
   * ```typescript
   * const packets = encoder.encodeAllSync(frame);
   * for (const packet of packets) {
   *   console.log(`Encoded packet with PTS: ${packet.pts}`);
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Encode loop
   * for (const frame of decoder.framesSync(packets)) {
   *   const packets = encoder.encodeAllSync(frame);
   *   for (const packet of packets) {
   *     output.writePacketSync(packet);
   *     packet.free();
   *   }
   *   frame.free();
   * }
   * ```
   *
   * @see {@link encodeSync} For single packet encoding
   * @see {@link packetsSync} For automatic frame iteration
   * @see {@link flushSync} For end-of-stream handling
   * @see {@link encodeAll} For async version
   */
  encodeAllSync(frame: Frame | null): Packet[] {
    this.encodeSync(frame);

    // Receive all available packets
    const packets: Packet[] = [];
    while (true) {
      const packet = this.receiveSync();
      if (!packet) break; // Stop on EAGAIN or EOF
      packets.push(packet); // Only push actual packets
    }
    return packets;
  }

  /**
   * Encode frame stream to packet stream.
   *
   * High-level async generator for complete encoding pipeline.
   * Encoder is only flushed when EOF (null) signal is explicitly received.
   * Primary interface for stream-based encoding.
   *
   * **EOF Handling:**
   * - Send null to flush encoder and get remaining buffered packets
   * - Generator yields null after flushing when null is received
   * - No automatic flushing - encoder stays open until EOF or close()
   *
   * @param frames - Async iterable of frames, single frame, or null to flush
   *
   * @yields {Packet | null} Encoded packets, followed by null when explicitly flushed
   *
   * @throws {FFmpegError} If encoding fails
   *
   * @example
   * ```typescript
   * // Stream of frames with automatic EOF propagation
   * for await (const packet of encoder.packets(decoder.frames(input.packets()))) {
   *   if (packet === null) {
   *     console.log('Encoder flushed');
   *     break;
   *   }
   *   await output.writePacket(packet);
   *   packet.free(); // Must free output packets
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Single frame - no automatic flush
   * for await (const packet of encoder.packets(singleFrame)) {
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * // Encoder remains open, buffered packets not flushed
   * ```
   *
   * @example
   * ```typescript
   * // Explicit flush with EOF
   * for await (const packet of encoder.packets(null)) {
   *   if (packet === null) {
   *     console.log('All buffered packets flushed');
   *     break;
   *   }
   *   console.log('Buffered packet:', packet.pts);
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link encode} For single frame encoding
   * @see {@link Decoder.frames} For frame source
   * @see {@link packetsSync} For sync version
   */
  async *packets(frames: AsyncIterable<Frame | null> | Frame | null): AsyncGenerator<Packet | null> {
    const self = this;

    const processFrame = async function* (frame: Frame) {
      await self.encode(frame);

      while (true) {
        const packet = await self.receive();
        if (!packet) break;
        yield packet;
      }
    }.bind(this);

    const finalize = async function* () {
      for await (const remaining of self.flushPackets()) {
        yield remaining;
      }
      yield null;
    }.bind(this);

    if (frames === null) {
      yield* finalize();
      return;
    }

    if (frames instanceof Frame) {
      yield* processFrame(frames);
      return;
    }

    for await (using frame of frames) {
      this.signal?.throwIfAborted();

      if (frame === null) {
        yield* finalize();
        return;
      }

      yield* processFrame(frame);
    }
  }

  /**
   * Encode frame stream to packet stream synchronously.
   * Synchronous version of packets.
   *
   * High-level sync generator for complete encoding pipeline.
   * Encoder is only flushed when EOF (null) signal is explicitly received.
   * Primary interface for stream-based encoding.
   *
   * **EOF Handling:**
   * - Send null to flush encoder and get remaining buffered packets
   * - Generator yields null after flushing when null is received
   * - No automatic flushing - encoder stays open until EOF or close()
   *
   * @param frames - Iterable of frames, single frame, or null to flush
   *
   * @yields {Packet | null} Encoded packets, followed by null when explicitly flushed
   *
   * @throws {FFmpegError} If encoding fails
   *
   * @example
   * ```typescript
   * // Stream of frames with automatic EOF propagation
   * for (const packet of encoder.packetsSync(decoder.framesSync(packets))) {
   *   if (packet === null) {
   *     console.log('Encoder flushed');
   *     break;
   *   }
   *   output.writePacketSync(packet);
   *   packet.free(); // Must free output packets
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Single frame - no automatic flush
   * for (const packet of encoder.packetsSync(singleFrame)) {
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * // Encoder remains open, buffered packets not flushed
   * ```
   *
   * @example
   * ```typescript
   * // Explicit flush with EOF
   * for (const packet of encoder.packetsSync(null)) {
   *   if (packet === null) {
   *     console.log('All buffered packets flushed');
   *     break;
   *   }
   *   console.log('Buffered packet:', packet.pts);
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link encodeSync} For single frame encoding
   * @see {@link Decoder.framesSync} For frame source
   * @see {@link packets} For async version
   */
  *packetsSync(frames: Iterable<Frame | null> | Frame | null): Generator<Packet | null> {
    const self = this;

    // Helper: Encode frame and yield all available packets (filters out EAGAIN nulls and EOF)
    const processFrame = function* (frame: Frame) {
      self.encodeSync(frame);

      // Receive ALL packets (filter out null/EAGAIN and EOF)
      while (true) {
        const packet = self.receiveSync();
        if (!packet) break; // EAGAIN or EOF - no more packets available
        yield packet; // Only yield actual packets
      }
    }.bind(this);

    // Helper: Flush encoder and signal EOF
    const finalize = function* () {
      for (const remaining of self.flushPacketsSync()) {
        yield remaining; // Only yield actual packets
      }
      yield null; // Signal end-of-stream
    }.bind(this);

    // Case 1: EOF input -> flush only
    if (frames === null) {
      yield* finalize();
      return;
    }

    // Case 2: Single frame - NO AUTOMATIC FLUSH
    if (frames instanceof Frame) {
      yield* processFrame(frames);
      return; // No finalize() call!
    }

    // Case 3: Iterable of frames
    for (using frame of frames) {
      // Check for EOF signal from upstream
      if (frame === null) {
        yield* finalize();
        return;
      }

      yield* processFrame(frame);
    }
    // No fallback flush - only flush on explicit EOF
  }

  /**
   * Flush encoder and signal end-of-stream.
   *
   * Sends null frame to encoder to signal end-of-stream.
   * Does nothing if encoder was never initialized or is closed.
   * Must call receive() to get remaining buffered packets.
   *
   * Direct mapping to avcodec_send_frame(NULL).
   *
   * @example
   * ```typescript
   * // Signal end of stream
   * await encoder.flush();
   *
   * // Then get remaining packets
   * let packet;
   * while ((packet = await encoder.receive()) !== null) {
   *   console.log('Got buffered packet');
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link flushPackets} For async iteration
   * @see {@link receive} For getting buffered packets
   * @see {@link flushSync} For synchronous version
   */
  async flush(): Promise<void> {
    this.signal?.throwIfAborted();

    if (this.isClosed || !this.initialized) {
      return;
    }

    // If using AudioFrameBuffer, flush remaining buffered samples first
    if (this.audioFrameBuffer && this.audioFrameBuffer.size > 0) {
      // Pull any remaining partial frame (may be less than frameSize)
      // For the final frame, we pad or truncate as needed
      let _bufferedFrame;
      while (!this.isClosed && (_bufferedFrame = await this.audioFrameBuffer.pull()) !== null) {
        using bufferedFrame = _bufferedFrame;
        await this.codecContext.sendFrame(bufferedFrame);
      }
    }

    // Send flush frame (null)
    const ret = await this.codecContext.sendFrame(null);
    if (ret < 0 && ret !== AVERROR_EOF) {
      if (ret !== AVERROR_EAGAIN) {
        FFmpegError.throwIfError(ret, 'Failed to flush encoder');
      }
    }
  }

  /**
   * Flush encoder and signal end-of-stream synchronously.
   * Synchronous version of flush.
   *
   * Sends null frame to encoder to signal end-of-stream.
   * Does nothing if encoder was never initialized or is closed.
   * Must call receiveSync() to get remaining buffered packets.
   *
   * Direct mapping to avcodec_send_frame(NULL).
   *
   * @example
   * ```typescript
   * // Signal end of stream
   * encoder.flushSync();
   *
   * // Then get remaining packets
   * let packet;
   * while ((packet = encoder.receiveSync()) !== null) {
   *   console.log('Got buffered packet');
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link flushPacketsSync} For sync iteration
   * @see {@link receiveSync} For getting buffered packets
   * @see {@link flush} For async version
   */
  flushSync(): void {
    if (this.isClosed || !this.initialized) {
      return;
    }

    // If using AudioFrameBuffer, flush remaining buffered samples first
    if (this.audioFrameBuffer && this.audioFrameBuffer.size > 0) {
      // Pull any remaining partial frame (may be less than frameSize)
      // For the final frame, we pad or truncate as needed
      let _bufferedFrame;
      while (!this.isClosed && (_bufferedFrame = this.audioFrameBuffer.pullSync()) !== null) {
        using bufferedFrame = _bufferedFrame;
        this.codecContext.sendFrameSync(bufferedFrame);
      }
    }

    // Send flush frame (null)
    const ret = this.codecContext.sendFrameSync(null);
    if (ret < 0 && ret !== AVERROR_EOF) {
      if (ret !== AVERROR_EAGAIN) {
        FFmpegError.throwIfError(ret, 'Failed to flush encoder');
      }
    }
  }

  /**
   * Flush all buffered packets as async generator.
   *
   * Convenient async iteration over remaining packets.
   * Automatically handles flush and repeated receive calls.
   * Returns immediately if encoder was never initialized or is closed.
   *
   * @yields {Packet} Buffered packets
   *
   * @example
   * ```typescript
   * // Flush at end of encoding
   * for await (const packet of encoder.flushPackets()) {
   *   console.log('Processing buffered packet');
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link encode} For sending frames and receiving packets
   * @see {@link flush} For signaling end-of-stream
   * @see {@link flushPacketsSync} For synchronous version
   */
  async *flushPackets(): AsyncGenerator<Packet> {
    // Send flush signal
    await this.flush();

    // Yield all remaining packets (filter out null/EAGAIN and EOF)
    while (true) {
      const packet = await this.receive();
      if (!packet) break; // Stop on EAGAIN or EOF
      yield packet; // Only yield actual packets
    }
  }

  /**
   * Flush all buffered packets as generator synchronously.
   * Synchronous version of flushPackets.
   *
   * Convenient sync iteration over remaining packets.
   * Automatically handles flush and repeated receive calls.
   * Returns immediately if encoder was never initialized or is closed.
   *
   * @yields {Packet} Buffered packets
   *
   * @example
   * ```typescript
   * // Flush at end of encoding
   * for (const packet of encoder.flushPacketsSync()) {
   *   console.log('Processing buffered packet');
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link encodeSync} For sending frames and receiving packets
   * @see {@link flushSync} For signaling end-of-stream
   * @see {@link flushPackets} For async version
   */
  *flushPacketsSync(): Generator<Packet> {
    // Send flush signal
    this.flushSync();

    // Yield all remaining packets (filter out null/EAGAIN and EOF)
    while (true) {
      const packet = this.receiveSync();
      if (!packet) break; // Stop on EAGAIN or EOF
      yield packet; // Only yield actual packets
    }
  }

  /**
   * Receive packet from encoder.
   *
   * Gets encoded packets from the codec's internal buffer.
   * Handles packet cloning and error checking.
   * Implements FFmpeg's send/receive pattern.
   *
   * **Return Values:**
   * - `Packet` - Successfully encoded packet (AVERROR >= 0)
   * - `null` - Need more input frames (AVERROR_EAGAIN), or encoder not initialized
   * - `undefined` - End of stream reached (AVERROR_EOF), or encoder is closed
   *
   * Direct mapping to avcodec_receive_packet().
   *
   * @returns Cloned packet, null if need more data, or undefined if stream ended
   *
   * @throws {FFmpegError} If receive fails with error other than AVERROR_EAGAIN or AVERROR_EOF
   *
   * @throws {Error} If packet cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * // Process all buffered packets
   * while (true) {
   *   const packet = await encoder.receive();
   *   if (!packet) break; // Stop on EAGAIN or EOF
   *   console.log(`Got packet with PTS: ${packet.pts}`);
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Handle each return value explicitly
   * const packet = await encoder.receive();
   * if (packet === EOF) {
   *   console.log('Encoder stream ended');
   * } else if (packet === null) {
   *   console.log('Need more input frames');
   * } else {
   *   console.log(`Got packet: pts=${packet.pts}`);
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link encode} For sending frames and receiving packets
   * @see {@link flush} For signaling end-of-stream
   * @see {@link receiveSync} For synchronous version
   * @see {@link EOF} For end-of-stream signal
   */
  async receive(): Promise<Packet | EOFSignal | null> {
    if (this.isClosed) {
      return EOF;
    }

    if (!this.initialized) {
      return null;
    }

    // Clear previous packet data
    this.packet.unref();

    if (this.audioFrameBuffer?.hasFrame()) {
      using bufferedFrame = await this.audioFrameBuffer.pull();
      if (bufferedFrame) {
        await this.codecContext.sendFrame(bufferedFrame);
      }
    }

    const ret = await this.codecContext.receivePacket(this.packet);

    if (ret === 0) {
      // Set packet timebase to codec timebase
      this.packet.timeBase = this.codecContext.timeBase;

      // Mark packet as trusted (from encoder)
      this.packet.setFlags(AV_PKT_FLAG_TRUSTED);

      // Got a packet, clone it for the user
      const cloned = this.packet.clone();
      if (!cloned) {
        throw new Error('Failed to clone packet (out of memory)');
      }
      return cloned;
    } else if (ret === AVERROR_EAGAIN) {
      // Need more data
      return null;
    } else if (ret === AVERROR_EOF) {
      // End of stream
      return EOF;
    } else {
      // Error
      FFmpegError.throwIfError(ret, 'Failed to receive packet');
      return null;
    }
  }

  /**
   * Receive packet from encoder synchronously.
   * Synchronous version of receive.
   *
   * Gets encoded packets from the codec's internal buffer.
   * Handles packet cloning and error checking.
   * Implements FFmpeg's send/receive pattern.
   *
   * **Return Values:**
   * - `Packet` - Successfully encoded packet (AVERROR >= 0)
   * - `null` - Need more input frames (AVERROR_EAGAIN), or encoder not initialized
   * - `undefined` - End of stream reached (AVERROR_EOF), or encoder is closed
   *
   * Direct mapping to avcodec_receive_packet().
   *
   * @returns Cloned packet, null if need more data, or undefined if stream ended
   *
   * @throws {FFmpegError} If receive fails with error other than AVERROR_EAGAIN or AVERROR_EOF
   *
   * @throws {Error} If packet cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * // Process all buffered packets
   * while (true) {
   *   const packet = encoder.receiveSync();
   *   if (!packet) break; // Stop on EAGAIN or EOF
   *   console.log(`Got packet with PTS: ${packet.pts}`);
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Handle each return value explicitly
   * const packet = encoder.receiveSync();
   * if (packet === EOF) {
   *   console.log('Encoder stream ended');
   * } else if (packet === null) {
   *   console.log('Need more input frames');
   * } else {
   *   console.log(`Got packet: pts=${packet.pts}`);
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link encodeSync} For sending frames and receiving packets
   * @see {@link flushSync} For signaling end-of-stream
   * @see {@link receive} For async version
   * @see {@link EOF} For end-of-stream signal
   */
  receiveSync(): Packet | EOFSignal | null {
    if (this.isClosed) {
      return EOF;
    }

    if (!this.initialized) {
      return null;
    }

    // Clear previous packet data
    this.packet.unref();

    if (this.audioFrameBuffer?.hasFrame()) {
      using bufferedFrame = this.audioFrameBuffer.pullSync();
      if (bufferedFrame) {
        this.codecContext.sendFrameSync(bufferedFrame);
      }
    }

    const ret = this.codecContext.receivePacketSync(this.packet);

    if (ret === 0) {
      // Set packet timebase to codec timebase
      this.packet.timeBase = this.codecContext.timeBase;

      // Mark packet as trusted (from encoder)
      this.packet.setFlags(AV_PKT_FLAG_TRUSTED);

      // Got a packet, clone it for the user
      const cloned = this.packet.clone();
      if (!cloned) {
        throw new Error('Failed to clone packet (out of memory)');
      }
      return cloned;
    } else if (ret === AVERROR_EAGAIN) {
      // Need more data
      return null;
    } else if (ret === AVERROR_EOF) {
      // End of stream
      return EOF;
    } else {
      // Error
      FFmpegError.throwIfError(ret, 'Failed to receive packet');
      return null;
    }
  }

  /**
   * Pipe encoded packets to muxer.
   *
   * @param target - Media output component to write packets to
   *
   * @param streamIndex - Stream index to write packets to
   *
   * @returns Scheduler for continued chaining
   *
   * @example
   * ```typescript
   * decoder.pipeTo(filter).pipeTo(encoder)
   * ```
   */
  pipeTo(target: Muxer, streamIndex: number): SchedulerControl<Frame> {
    // Start worker if not already running
    this.workerPromise ??= this.runWorker();

    // Start pipe task: encoder.outputQueue -> output
    this.pipeToPromise = (async () => {
      while (true) {
        const packet = await this.receiveFromQueue();
        if (!packet) break;
        await target.writePacket(packet, streamIndex);
      }
    })();

    // Return control without pipeTo (terminal stage)
    return new SchedulerControl<Frame>(this as unknown as SchedulableComponent<Frame>);
  }

  /**
   * Close encoder and free resources.
   *
   * Releases codec context and internal packet buffer.
   * Safe to call multiple times.
   * Automatically called by Symbol.dispose.
   *
   * @example
   * ```typescript
   * const encoder = await Encoder.create(FF_ENCODER_LIBX264, { ... });
   * try {
   *   // Use encoder
   * } finally {
   *   encoder.close();
   * }
   * ```
   *
   * @see {@link Symbol.dispose} For automatic cleanup
   */
  close(): void {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;

    // Close queues
    this.inputQueue.close();
    this.outputQueue.close();

    // Free any frames/packets left buffered on an aborted/early-closed pipeline.
    this.inputQueue.clear();
    this.outputQueue.clear();

    this.packet.free();
    this.codecContext.freeContext();

    // Release the audio frame buffer (owns a native Frame + AudioFifo) used by
    // fixed-frame-size audio encoders.
    this.audioFrameBuffer?.[Symbol.dispose]();
    this.audioFrameBuffer = undefined;

    this.initialized = false;
  }

  /**
   * Get encoder codec.
   *
   * Returns the codec used by this encoder.
   * Useful for checking codec capabilities and properties.
   *
   * @returns Codec instance
   *
   * @internal
   *
   * @see {@link Codec} For codec details
   */
  getCodec(): Codec {
    return this.codec;
  }

  /**
   * Get underlying codec context.
   *
   * Returns the codec context for advanced operations.
   * Useful for accessing low-level codec properties and settings.
   * Returns null if encoder is closed or not initialized.
   *
   * @returns Codec context or null if closed/not initialized
   *
   * @internal
   *
   * @see {@link CodecContext} For context details
   */
  getCodecContext(): CodecContext | null {
    return !this.isClosed && this.initialized ? this.codecContext : null;
  }

  /**
   * Worker loop for push-based processing.
   *
   * @internal
   */
  private async runWorker(): Promise<void> {
    try {
      // Outer loop - receive frames
      while (!this.inputQueue.isClosed) {
        using frame = await this.inputQueue.receive();
        if (!frame) break;

        // Open encoder if not already done
        if (!this.initialized) {
          this.initializePromise ??= this.initialize(frame);
        }

        await this.initializePromise;

        // Prepare frame for encoding (set quality, validate channel count)
        this.prepareFrameForEncoding(frame);

        await this.encode(frame);

        // Receive packets
        while (!this.outputQueue.isClosed) {
          const packet = await this.receive();
          if (!packet) break; // Stop on EAGAIN or EOF
          await this.outputQueue.send(packet); // Only send actual packets
        }
      }

      // Flush encoder at end
      await this.flush();
      while (!this.outputQueue.isClosed) {
        const packet = await this.receive();
        if (!packet) break; // Stop on EAGAIN or EOF
        await this.outputQueue.send(packet); // Only send actual packets
      }
    } catch (error) {
      // Propagate error to both queues so upstream and downstream know
      const err = error instanceof Error ? error : new Error(String(error));
      this.inputQueue?.closeWithError(err);
      this.outputQueue?.closeWithError(err);
    } finally {
      // Close output queue when done (if not already closed with error)
      this.outputQueue?.close();
    }
  }

  /**
   * Send frame to input queue or flush the pipeline.
   *
   * When frame is provided, queues it for encoding.
   * When null is provided, triggers flush sequence:
   * - Closes input queue
   * - Waits for worker completion
   * - Flushes encoder and sends remaining packets to output queue
   * - Closes output queue
   * - Waits for pipeTo task completion (writes to muxer)
   *
   * Used by scheduler system for pipeline control.
   *
   * @param frame - Frame to send, or null to flush
   *
   * @internal
   */
  private async sendToQueue(frame: Frame | null): Promise<void> {
    if (frame) {
      await this.inputQueue.send(frame);
    } else {
      // Close input queue to signal end of stream to worker
      this.inputQueue.close();

      // Wait for worker to finish processing all frames (if exists)
      if (this.workerPromise) {
        await this.workerPromise;
      }

      // Flush encoder at end
      await this.flush();

      while (true) {
        const packet = await this.receive();
        if (!packet) break; // Stop on EAGAIN or EOF
        await this.outputQueue.send(packet); // Only send actual packets
      }

      if (this.pipeToPromise) {
        await this.pipeToPromise;
      }
    }
  }

  /**
   * Receive packet from output queue.
   *
   * @returns Packet from output queue
   *
   * @internal
   */
  private async receiveFromQueue(): Promise<Packet | null> {
    return await this.outputQueue.receive();
  }

  /**
   * Initialize encoder from first frame.
   *
   * Sets codec context parameters from frame properties.
   * Configures hardware context if present in frame.
   * Opens encoder with accumulated options.
   *
   * @param frame - First frame to encode
   *
   * @throws {FFmpegError} If encoder open fails
   *
   * @internal
   */
  private async initialize(frame: Frame): Promise<void> {
    // Get bits_per_raw_sample from decoder if available
    if (this.options.decoder) {
      const decoderCtx = this.options.decoder.getCodecContext();
      if (decoderCtx && decoderCtx.bitsPerRawSample > 0) {
        this.codecContext.bitsPerRawSample = decoderCtx.bitsPerRawSample;
      }
    }

    // Get framerate from filter if available, otherwise from decoder
    // This matches FFmpeg CLI behavior where encoder gets frame_rate_filter from FrameData
    if (this.options.filter && frame.isVideo()) {
      const filterFrameRate = this.options.filter.frameRate;
      if (filterFrameRate) {
        this.codecContext.framerate = new Rational(filterFrameRate.num, filterFrameRate.den);
      }
    }

    // If no filter framerate, try to get from decoder stream
    if ((!this.codecContext.framerate || this.codecContext.framerate.num === 0) && this.options.decoder && frame.isVideo()) {
      const decoderCtx = this.options.decoder.getCodecContext();
      if (decoderCtx?.framerate && decoderCtx.framerate.num > 0) {
        this.codecContext.framerate = decoderCtx.framerate;
      }
    }

    if (frame.isVideo()) {
      // FFmpeg CLI sets encoder time_base to 1/framerate (inverse of framerate)
      // This allows encoder to produce sequential PTS (0, 1, 2, 3...) which enables
      // proper B-frame DTS generation (negative DTS values)
      if (this.codecContext.framerate && this.codecContext.framerate.num > 0) {
        // Use inverse of framerate (e.g., framerate=30/1 → timebase=1/30)
        this.codecContext.timeBase = new Rational(this.codecContext.framerate.den, this.codecContext.framerate.num);
      } else {
        // Fallback: use frame timebase if framerate not available
        this.codecContext.timeBase = frame.timeBase;
      }
      this.codecContext.width = frame.width;
      this.codecContext.height = frame.height;
      this.codecContext.pixelFormat = frame.format as AVPixelFormat;
      this.codecContext.sampleAspectRatio = frame.sampleAspectRatio;
      this.codecContext.colorRange = frame.colorRange;
      this.codecContext.colorPrimaries = frame.colorPrimaries;
      this.codecContext.colorTrc = frame.colorTrc;
      this.codecContext.colorSpace = frame.colorSpace;

      // Only set chroma location if unspecified
      if (this.codecContext.chromaLocation === AVCHROMA_LOC_UNSPECIFIED) {
        this.codecContext.chromaLocation = frame.chromaLocation;
      }
    } else {
      // Audio: Always use frame timebase (which is typically 1/sample_rate)
      // This ensures correct PTS progression for audio frames
      this.codecContext.timeBase = frame.timeBase;

      this.codecContext.sampleRate = frame.sampleRate;
      this.codecContext.sampleFormat = frame.format as AVSampleFormat;
      this.codecContext.channelLayout = frame.channelLayout;
    }

    // Setup hardware acceleration with validation
    this.setupHardwareAcceleration(frame);

    // AV_CODEC_FLAG_COPY_OPAQUE: Copy opaque data from frames to packets if supported
    if (this.codec.hasCapabilities(AV_CODEC_CAP_ENCODER_REORDERED_OPAQUE)) {
      this.codecContext.setFlags(AV_CODEC_FLAG_COPY_OPAQUE);
    }

    // AV_CODEC_FLAG_FRAME_DURATION: Signal that frame duration matters for timestamps
    this.codecContext.setFlags(AV_CODEC_FLAG_FRAME_DURATION);

    // Open codec
    const openRet = await this.codecContext.open2(this.codec, this.opts);
    if (openRet < 0) {
      this.codecContext.freeContext();
      FFmpegError.throwIfError(openRet, 'Failed to open encoder');
    }

    // Check if encoder requires fixed frame size (e.g., Opus, AAC, MP3)
    // If so, create AudioFrameBuffer to automatically chunk frames
    if (frame.isAudio() && this.codecContext.frameSize > 0) {
      this.audioFrameBuffer = AudioFrameBuffer.create(
        this.codecContext.frameSize,
        this.codecContext.sampleFormat,
        this.codecContext.sampleRate,
        this.codecContext.channelLayout,
        this.codecContext.channels,
      );
    }

    this.initialized = true;
  }

  /**
   * Initialize encoder from first frame synchronously.
   * Synchronous version of initialize.
   *
   * Sets codec context parameters from frame properties.
   * Configures hardware context if present in frame.
   * Opens encoder with accumulated options.
   *
   * @param frame - First frame to encode
   *
   * @throws {FFmpegError} If encoder open fails
   *
   * @internal
   *
   * @see {@link initialize} For async version
   */
  private initializeSync(frame: Frame): void {
    // Get bits_per_raw_sample from decoder if available
    if (this.options.decoder) {
      const decoderCtx = this.options.decoder.getCodecContext();
      if (decoderCtx && decoderCtx.bitsPerRawSample > 0) {
        this.codecContext.bitsPerRawSample = decoderCtx.bitsPerRawSample;
      }
    }

    // Get framerate from filter if available, otherwise from decoder
    // This matches FFmpeg CLI behavior where encoder gets frame_rate_filter from FrameData
    if (this.options.filter && frame.isVideo()) {
      const filterFrameRate = this.options.filter.frameRate;
      if (filterFrameRate) {
        this.codecContext.framerate = new Rational(filterFrameRate.num, filterFrameRate.den);
      }
    }

    // If no filter framerate, try to get from decoder stream
    if ((!this.codecContext.framerate || this.codecContext.framerate.num === 0) && this.options.decoder && frame.isVideo()) {
      const decoderCtx = this.options.decoder.getCodecContext();
      if (decoderCtx?.framerate && decoderCtx.framerate.num > 0) {
        this.codecContext.framerate = decoderCtx.framerate;
      }
    }

    if (frame.isVideo()) {
      // FFmpeg CLI sets encoder time_base to 1/framerate (inverse of framerate)
      // This allows encoder to produce sequential PTS (0, 1, 2, 3...) which enables
      // proper B-frame DTS generation (negative DTS values)
      if (this.codecContext.framerate && this.codecContext.framerate.num > 0) {
        // Use inverse of framerate (e.g., framerate=30/1 → timebase=1/30)
        this.codecContext.timeBase = new Rational(this.codecContext.framerate.den, this.codecContext.framerate.num);
      } else {
        // Fallback: use frame timebase if framerate not available
        this.codecContext.timeBase = frame.timeBase;
      }
      this.codecContext.width = frame.width;
      this.codecContext.height = frame.height;
      this.codecContext.pixelFormat = frame.format as AVPixelFormat;
      this.codecContext.sampleAspectRatio = frame.sampleAspectRatio;
      this.codecContext.colorRange = frame.colorRange;
      this.codecContext.colorPrimaries = frame.colorPrimaries;
      this.codecContext.colorTrc = frame.colorTrc;
      this.codecContext.colorSpace = frame.colorSpace;

      // Only set chroma location if unspecified
      if (this.codecContext.chromaLocation === AVCHROMA_LOC_UNSPECIFIED) {
        this.codecContext.chromaLocation = frame.chromaLocation;
      }
    } else {
      // Audio: Always use frame timebase (which is typically 1/sample_rate)
      // This ensures correct PTS progression for audio frames
      this.codecContext.timeBase = frame.timeBase;

      this.codecContext.sampleRate = frame.sampleRate;
      this.codecContext.sampleFormat = frame.format as AVSampleFormat;
      this.codecContext.channelLayout = frame.channelLayout;
    }

    // Setup hardware acceleration with validation
    this.setupHardwareAcceleration(frame);

    // Set codec flags
    // AV_CODEC_FLAG_COPY_OPAQUE: Copy opaque data from frames to packets if supported
    if (this.codec.hasCapabilities(AV_CODEC_CAP_ENCODER_REORDERED_OPAQUE)) {
      this.codecContext.setFlags(AV_CODEC_FLAG_COPY_OPAQUE);
    }

    // AV_CODEC_FLAG_FRAME_DURATION: Signal that frame duration matters for timestamps
    this.codecContext.setFlags(AV_CODEC_FLAG_FRAME_DURATION);

    // Open codec
    const openRet = this.codecContext.open2Sync(this.codec, this.opts);
    if (openRet < 0) {
      this.codecContext.freeContext();
      FFmpegError.throwIfError(openRet, 'Failed to open encoder');
    }

    // Check if encoder requires fixed frame size (e.g., Opus, AAC, MP3)
    // If so, create AudioFrameBuffer to automatically chunk frames
    if (frame.isAudio() && this.codecContext.frameSize > 0) {
      this.audioFrameBuffer = AudioFrameBuffer.create(
        this.codecContext.frameSize,
        this.codecContext.sampleFormat,
        this.codecContext.sampleRate,
        this.codecContext.channelLayout,
        this.codecContext.channels,
      );
    }

    this.initialized = true;
  }

  /**
   * Setup hardware acceleration for encoder.
   *
   * Implements FFmpeg's hw_device_setup_for_encode logic.
   * Validates hardware frames context format and codec support.
   * Falls back to device context if frames context is incompatible.
   *
   * @param frame - Frame to get hardware context from
   *
   * @internal
   */
  private setupHardwareAcceleration(frame: Frame): void {
    if (!frame.hwFramesCtx) {
      // Software encoding
      return;
    }

    const hwFramesCtx = frame.hwFramesCtx;
    const framesFormat = hwFramesCtx.format;
    const encoderFormat = this.codecContext.pixelFormat;

    // Check 1: Format validation
    if (framesFormat !== encoderFormat) {
      this.codecContext.hwDeviceCtx = hwFramesCtx.deviceRef;
      this.codecContext.hwFramesCtx = null;
      return;
    }

    // Check 2: Codec supports HW_FRAMES_CTX?
    let supportsFramesCtx = false;
    for (let i = 0; ; i++) {
      const config = this.codec.getHwConfig(i);
      if (!config) break;

      // Check if codec supports HW_FRAMES_CTX method
      if (config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX) {
        // Check if pixel format matches or is unspecified
        if (config.pixFmt === AV_PIX_FMT_NONE || config.pixFmt === encoderFormat) {
          supportsFramesCtx = true;
          break;
        }
      }
    }

    if (supportsFramesCtx) {
      // Use hw_frames_ctx (best performance - zero copy)
      this.codecContext.hwFramesCtx = hwFramesCtx;
      this.codecContext.hwDeviceCtx = hwFramesCtx.deviceRef;
    } else {
      // Fallback to hw_device_ctx (still uses HW, but may copy)
      // Check if codec supports HW_DEVICE_CTX as fallback
      let supportsDeviceCtx = false;
      for (let i = 0; ; i++) {
        const config = this.codec.getHwConfig(i);
        if (!config) break;

        if (config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX) {
          supportsDeviceCtx = true;
          break;
        }
      }

      if (supportsDeviceCtx) {
        this.codecContext.hwDeviceCtx = hwFramesCtx.deviceRef;
        this.codecContext.hwFramesCtx = null;
      } else {
        // No hardware support at all - software encoding
        this.codecContext.hwDeviceCtx = null;
        this.codecContext.hwFramesCtx = null;
      }
    }
  }

  /**
   * Prepare frame for encoding.
   *
   * Implements FFmpeg's frame_encode() pre-encoding logic:
   * 1. Video: Sets frame.quality from encoder's globalQuality (like -qscale)
   * 2. Audio: Validates channel count consistency for encoders without PARAM_CHANGE capability
   *
   * This matches FFmpeg CLI behavior where these properties are automatically managed.
   *
   * @param frame - Frame to prepare for encoding
   *
   * @throws {Error} If audio channel count changed and encoder doesn't support parameter changes
   *
   * @internal
   */
  private prepareFrameForEncoding(frame: Frame): void {
    // Clear pict_type - encoder will determine frame types based on its own settings
    // Input stream's frame type hints are irrelevant when re-encoding
    frame.pictType = AV_PICTURE_TYPE_NONE;

    // Adjust frame PTS and timebase to encoder timebase
    // This matches FFmpeg's adjust_frame_pts_to_encoder_tb() behavior which:
    // 1. Converts PTS from frame's timebase to encoder's timebase (av_rescale_q)
    // 2. Sets frame->time_base = tb_dst (so encoder gets correct timebase)

    // Note: prepareFrameForEncoding is always called AFTER initialize(),
    // so codecContext.timeBase is already set correctly:
    // - Video: 1/framerate (if available)
    // - Audio: frame.timeBase from first frame (typically 1/sample_rate)
    const encoderTimebase = this.codecContext.timeBase;
    const oldTimebase = frame.timeBase;

    // IMPORTANT: Calculate duration BEFORE converting frame timebase
    // This matches FFmpeg's video_sync_process() which calculates:
    //   duration = frame->duration * av_q2d(frame->time_base) / av_q2d(ofp->tb_out)
    // We need the OLD timebase to convert duration properly
    let frameDuration: bigint;

    if (frame.duration && frame.duration > 0n) {
      // Convert duration from frame timebase to encoder timebase
      // This ensures encoder gets correct frame duration for timestamps
      frameDuration = avRescaleQ(frame.duration, oldTimebase, encoderTimebase);
    } else {
      // Default to 1 (constant frame rate behavior)
      // Matches FFmpeg's CFR mode: frame->duration = 1
      frameDuration = 1n;
    }

    if (frame.pts !== null && frame.pts !== undefined) {
      // Convert PTS to encoder timebase
      frame.pts = avRescaleQ(frame.pts, oldTimebase, encoderTimebase);

      // IMPORTANT: Set frame timebase to encoder timebase
      // FFmpeg does this in adjust_frame_pts_to_encoder_tb(): frame->time_base = tb_dst
      // This ensures encoder gets frames with correct timebase (1/framerate for video, 1/sample_rate for audio)
      frame.timeBase = encoderTimebase;
    }

    // Set frame duration in encoder timebase
    // This matches FFmpeg's video_sync_process() which sets frame->duration
    // based on vsync_method (CFR: 1, VFR: calculated, PASSTHROUGH: calculated)
    // Since we don't have automatic filter like FFmpeg, we always set it here
    frame.duration = frameDuration;

    if (this.codecContext.codecType === AVMEDIA_TYPE_VIDEO) {
      // Video: Set frame quality from encoder's global quality
      // Only set if encoder has globalQuality configured and frame doesn't already have quality set
      if (this.codecContext.globalQuality > 0 && frame.quality <= 0) {
        frame.quality = this.codecContext.globalQuality;
      }
    } else if (this.codecContext.codecType === AVMEDIA_TYPE_AUDIO) {
      // Audio: Validate channel count consistency
      // If encoder doesn't support AV_CODEC_CAP_PARAM_CHANGE, channel count must remain constant
      const supportsParamChange = this.codec.hasCapabilities(AV_CODEC_CAP_PARAM_CHANGE);

      if (!supportsParamChange) {
        const encoderChannels = this.codecContext.channelLayout.nbChannels;
        const frameChannels = frame.channelLayout?.nbChannels ?? 0;

        if (encoderChannels !== frameChannels) {
          throw new Error(`Audio channel count changed (${encoderChannels} -> ${frameChannels}) and encoder '${this.codec.name}' does not support parameter changes`);
        }
      }
    }
  }

  /**
   * Dispose of encoder.
   *
   * Implements Disposable interface for automatic cleanup.
   * Equivalent to calling close().
   *
   * @example
   * ```typescript
   * {
   *   using encoder = await Encoder.create(FF_ENCODER_LIBX264, { ... });
   *   // Encode frames...
   * } // Automatically closed
   * ```
   *
   * @see {@link close} For manual cleanup
   */
  [Symbol.dispose](): void {
    this.close();
  }
}
