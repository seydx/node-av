import {
  AV_CHANNEL_ORDER_UNSPEC,
  AV_CODEC_FLAG_COPY_OPAQUE,
  AV_FRAME_FLAG_CORRUPT,
  AV_HWFRAME_TRANSFER_DIRECTION_FROM,
  AV_NOPTS_VALUE,
  AV_PIX_FMT_NONE,
  AV_ROUND_UP,
  AVERROR_DECODER_NOT_FOUND,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  AVERROR_INVALIDDATA,
  AVMEDIA_TYPE_AUDIO,
  AVMEDIA_TYPE_VIDEO,
  EOF,
  INT_MAX,
  SWS_BILINEAR,
} from '../constants/constants.js';
import { CodecContext } from '../lib/codec-context.js';
import { Codec } from '../lib/codec.js';
import { Dictionary } from '../lib/dictionary.js';
import { FFmpegError } from '../lib/error.js';
import { Frame } from '../lib/frame.js';
import { Packet } from '../lib/packet.js';
import { Rational } from '../lib/rational.js';
import { SoftwareResampleContext } from '../lib/software-resample-context.js';
import { SoftwareScaleContext } from '../lib/software-scale-context.js';
import { avChannelLayoutDefault, avGcd, avInvQ, avMulQ, avRescaleDelta, avRescaleQ, avRescaleQRnd } from '../lib/utilities.js';
import { FRAME_THREAD_QUEUE_SIZE, PACKET_THREAD_QUEUE_SIZE } from './constants.js';
import { AsyncQueue } from './utilities/async-queue.js';
import { Scheduler } from './utilities/scheduler.js';

import type { AVCodecID, AVPixelFormat, AVSampleFormat, AVThreadType, DecoderOptionsFor, EOFSignal, FFDecoderCodec } from '../constants/index.js';
import type { Stream } from '../lib/stream.js';
import type { ChannelLayout, IRational } from '../lib/types.js';
import type { Encoder } from './encoder.js';
import type { FilterAPI } from './filter.js';
import type { HardwareContext } from './hardware.js';
import type { SchedulableComponent } from './utilities/scheduler.js';

/**
 * Options for decoder creation.
 */
export interface DecoderOptions<C = unknown> {
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
   * Resample decoded audio to a target format (audio only).
   *
   * When set, decoded audio frames are transparently converted to the requested
   * sample rate, sample format, and/or channel layout before they are returned —
   * the audio mirror of {@link rescale}. Any omitted field keeps the decoded
   * value, and conversion is skipped entirely when the source already matches the
   * target. Useful when a capture device delivers a rate you cannot control (e.g.
   * avfoundation ignoring a microphone sample-rate request) and you want every
   * downstream stage to receive the rate you asked for.
   *
   * @example
   * ```typescript
   * // Guarantee 48 kHz frames regardless of the device's actual rate
   * const decoder = await Decoder.create(stream, { resample: { sampleRate: 48000 } });
   * ```
   */
  resample?: {
    sampleRate?: number;
    sampleFormat?: AVSampleFormat;
    channelLayout?: ChannelLayout;
  };

  /**
   * Rescale decoded video to a target pixel format and/or size (video only).
   *
   * When set, decoded video frames are transparently converted to the requested
   * pixel format and/or dimensions before they are returned — the video mirror of
   * {@link resample}. Any omitted field keeps the decoded value, and conversion is
   * skipped entirely when the source already matches the target.
   *
   * Hardware frames are automatically transferred to a supported software format
   * first and then converted to the requested one; software frames are converted
   * directly. Hardware frames are left untouched (kept on the GPU, zero-copy) when
   * `rescale` is not set. This replaces the former `hwaccelOutputFormat` option:
   * use `rescale: { pixelFormat }` to get decoded frames in a fixed software format.
   *
   * Useful to normalize a heterogeneous set of sources (e.g. RTSP cameras that each
   * deliver a different pixel format) so every downstream stage receives a uniform
   * format/size, regardless of whether a stream was hardware- or software-decoded.
   *
   * @example
   * ```typescript
   * // Normalize any source to yuv420p, whether it was hardware- or software-decoded
   * const decoder = await Decoder.create(stream, { hardware: hw, rescale: { pixelFormat: AV_PIX_FMT_YUV420P } });
   * ```
   */
  rescale?: {
    width?: number;
    height?: number;
    pixelFormat?: AVPixelFormat;
  };

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
   * - `FF_THREAD_FRAME` (1): Decode multiple frames in parallel.
   *   Higher throughput but adds latency (1 frame delay per thread).
   *   Not recommended for live streaming where future frames are unavailable.
   *
   * - `FF_THREAD_SLICE` (2): Decode parts of a single frame in parallel.
   *   No additional latency, suitable for real-time/live streaming.
   *
   * @default FFmpeg default (both methods, codec chooses best)
   */
  threadType?: AVThreadType;

  /**
   * Additional codec-specific options.
   *
   * Key-value pairs of FFmpeg private codec options, passed directly to the decoder.
   * When the codec is created from a branded constant (e.g. `FF_DECODER_H264_CUVID`),
   * these are strongly typed to that codec's known options (autocomplete + validation);
   * otherwise any string/number/boolean values are accepted.
   */
  options?: DecoderOptionsFor<C>;

  /**
   * AbortSignal for cancellation.
   *
   * When aborted, async generators stop yielding and async methods throw AbortError.
   */
  signal?: AbortSignal;
}

/**
 * High-level decoder for audio and video streams.
 *
 * Provides a simplified interface for decoding media streams from packets to frames.
 * Handles codec initialization, hardware acceleration setup, and frame management.
 * Supports both synchronous packet-by-packet decoding and async iteration over frames.
 * Essential component in media processing pipelines for converting compressed data to raw frames.
 *
 * @example
 * ```typescript
 * import { Demuxer, Decoder } from 'node-av/api';
 *
 * // Open media and create decoder
 * await using input = await Demuxer.open('video.mp4');
 * using decoder = await Decoder.create(input.video());
 *
 * // Decode frames
 * for await (const frame of decoder.frames(input.packets())) {
 *   console.log(`Decoded frame: ${frame.width}x${frame.height}`);
 *   frame.free();
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { HardwareContext } from 'node-av/api';
 * import { AV_HWDEVICE_TYPE_CUDA } from 'node-av/constants';
 *
 * // Setup hardware acceleration
 * const hw = HardwareContext.create(AV_HWDEVICE_TYPE_CUDA);
 * using decoder = await Decoder.create(stream, { hardware: hw });
 *
 * // Frames will be decoded on GPU
 * for await (const frame of decoder.frames(packets)) {
 *   // frame.hwFramesCtx contains GPU memory reference
 * }
 * ```
 *
 * @see {@link Encoder} For encoding frames to packets
 * @see {@link Demuxer} For reading media files
 * @see {@link HardwareContext} For GPU acceleration
 */
export class Decoder implements Disposable {
  private codecContext: CodecContext;
  private codec: Codec;
  private frame: Frame;
  private stream: Stream;
  private initialized = true;
  private isClosed = false;
  private options: DecoderOptions;

  // Frame tracking for PTS/duration estimation
  private lastFramePts = AV_NOPTS_VALUE;
  private lastFrameDurationEst = 0n;
  private lastFrameTb: Rational;

  // Audio-specific frame tracking
  private lastFrameSampleRate = 0;
  private lastFilterInRescaleDelta = AV_NOPTS_VALUE;

  // Audio output resampling
  private audioResampler?: SoftwareResampleContext;
  private resampledFrame?: Frame;
  private resampleTarget?: { rate: number; fmt: AVSampleFormat; layout: ChannelLayout };
  private resampleInputLayout?: ChannelLayout;
  private audioResamplerSetup = false;
  private audioResamplerDrained = false;

  // Video output rescaling
  private videoScaler?: SoftwareScaleContext;
  private scaledFrame?: Frame;
  private hwTransferFormat?: AVPixelFormat;

  // Worker pattern for push-based processing
  private inputQueue: AsyncQueue<Packet>;
  private outputQueue: AsyncQueue<Frame>;
  private workerPromise: Promise<void> | null = null;
  private nextComponent: SchedulableComponent<Frame> | null = null;
  private pipeToPromise: Promise<void> | null = null;
  private signal?: AbortSignal;

  /**
   * @param codecContext - Configured codec context
   *
   * @param codec - Codec being used
   *
   * @param stream - Media stream being decoded
   *
   * @param options - Decoder options
   *
   * Use {@link create} factory method
   *
   * @internal
   */
  private constructor(codecContext: CodecContext, codec: Codec, stream: Stream, options: DecoderOptions = {}) {
    this.codecContext = codecContext;
    this.codec = codec;
    this.stream = stream;
    this.options = options;
    this.frame = new Frame();
    this.frame.alloc();
    this.lastFrameTb = new Rational(0, 1);
    this.inputQueue = new AsyncQueue<Packet>(PACKET_THREAD_QUEUE_SIZE, (p) => p.free());
    this.outputQueue = new AsyncQueue<Frame>(FRAME_THREAD_QUEUE_SIZE, (f) => f.free());
  }

  /**
   * Create a decoder for a media stream.
   *
   * Initializes a decoder with the appropriate codec and configuration.
   * Automatically detects and configures hardware acceleration if provided.
   * Applies custom codec options and threading configuration.
   *
   * @param stream - Media stream to decode
   *
   * @param options - Decoder configuration options
   *
   * @returns Configured decoder instance
   *
   * @throws {FFmpegError} If codec initialization fails
   *
   * @example
   * ```typescript
   * import { Demuxer, Decoder } from 'node-av/api';
   *
   * await using input = await Demuxer.open('video.mp4');
   * using decoder = await Decoder.create(input.video());
   * ```
   *
   * @example
   * ```typescript
   * using decoder = await Decoder.create(stream, {
   *   threads: 4,
   *   options: {
   *     'refcounted_frames': '1',
   *     'skip_frame': 'nonkey'  // Only decode keyframes
   *   }
   * });
   * ```
   *
   * @example
   * ```typescript
   * const hw = HardwareContext.auto();
   * using decoder = await Decoder.create(stream, {
   *   hardware: hw,
   *   threads: 0  // Auto-detect thread count
   *   exitOnError: false     // Continue on decode errors (default: true)
   * });
   * ```
   *
   * @example
   * ```typescript
   * using decoder = await Decoder.create(stream, FF_DECODER_H264_AMF, {
   *   hardware: hw,
   *   threads: 2,
   * });
   * ```
   *
   * @see {@link HardwareContext} For GPU acceleration setup
   * @see {@link DecoderOptions} For configuration options
   * @see {@link createSync} For synchronous version
   */
  static async create(stream: Stream, options?: DecoderOptions): Promise<Decoder>;
  static async create<const C extends FFDecoderCodec | AVCodecID | Codec>(stream: Stream, decoderCodec: C, options?: DecoderOptions<C>): Promise<Decoder>;
  static async create(stream: Stream, optionsOrCodec?: DecoderOptions | FFDecoderCodec | AVCodecID | Codec, maybeOptions?: DecoderOptions): Promise<Decoder> {
    // Parse arguments
    let options: DecoderOptions = {};
    let explicitCodec: FFDecoderCodec | AVCodecID | Codec | undefined;

    if (optionsOrCodec !== undefined) {
      // Check if first argument is a codec or options
      if (
        typeof optionsOrCodec === 'string' || // FFDecoderCodec
        typeof optionsOrCodec === 'number' || // AVCodecID
        optionsOrCodec instanceof Codec // Codec instance
      ) {
        // First argument is a codec
        explicitCodec = optionsOrCodec;
        options = maybeOptions ?? {};
      } else {
        // First argument is options
        options = optionsOrCodec;
      }
    }

    let codec: Codec | null = null;

    // If explicit codec provided, use it
    if (explicitCodec !== undefined) {
      if (typeof explicitCodec === 'object' && 'id' in explicitCodec) {
        // Already a Codec instance
        codec = explicitCodec;
      } else if (typeof explicitCodec === 'string') {
        // FFDecoderCodec string
        codec = Codec.findDecoderByName(explicitCodec);
        if (!codec) {
          throw new FFmpegError(AVERROR_DECODER_NOT_FOUND);
        }
      } else {
        // AVCodecID number
        codec = Codec.findDecoder(explicitCodec);
        if (!codec) {
          throw new FFmpegError(AVERROR_DECODER_NOT_FOUND);
        }
      }
    } else {
      // No explicit codec - use auto-detection logic
      // If hardware acceleration requested, try to find hardware decoder first
      if (options.hardware) {
        codec = options.hardware.getDecoderCodec(stream.codecpar.codecId);
        if (!codec) {
          // No hardware decoder available, fall back to software
          options.hardware = undefined;
        }
      }

      // If no hardware decoder or no hardware requested, use software decoder
      if (!codec) {
        codec = Codec.findDecoder(stream.codecpar.codecId);
        if (!codec) {
          throw new FFmpegError(AVERROR_DECODER_NOT_FOUND);
        }
      }
    }

    // Allocate and configure codec context
    const codecContext = new CodecContext();
    codecContext.allocContext3(codec);

    // Copy codec parameters to context
    const ret = codecContext.parametersToContext(stream.codecpar);
    if (ret < 0) {
      codecContext.freeContext();
      FFmpegError.throwIfError(ret, 'Failed to copy codec parameters');
    }

    // Set packet time base
    codecContext.pktTimebase = stream.timeBase;

    // Check if this decoder supports hardware acceleration
    // Only apply hardware acceleration if the decoder supports it
    // Silently ignore hardware for software decoders
    const isHWDecoder = codec.isHardwareAcceleratedDecoder();
    if (isHWDecoder && options.hardware) {
      codecContext.hwDeviceCtx = options.hardware.deviceContext;

      // Set hardware pixel format
      codecContext.setHardwarePixelFormat(options.hardware.devicePixelFormat);

      // Set extra_hw_frames if specified
      if (options.extraHWFrames !== undefined && options.extraHWFrames > 0) {
        codecContext.extraHWFrames = options.extraHWFrames;
      }
    } else {
      options.hardware = undefined;
    }

    options.exitOnError = options.exitOnError ?? true;

    // Enable COPY_OPAQUE flag to copy packet.opaque to frame.opaque
    codecContext.setFlags(AV_CODEC_FLAG_COPY_OPAQUE);

    // Thread parameters need to be set before open2
    codecContext.threadCount = options.threadCount ?? 0;
    if (options.threadType !== undefined) {
      codecContext.threadType = options.threadType;
    }

    const opts = options.options ? Dictionary.fromObject(options.options) : undefined;

    // Open codec
    const openRet = await codecContext.open2(codec, opts);
    if (openRet < 0) {
      codecContext.freeContext();
      FFmpegError.throwIfError(openRet, 'Failed to open codec');
    }

    // Adjust extra_hw_frames for queuing
    // This is done AFTER open2 because the decoder validates extra_hw_frames during open
    if (isHWDecoder && options.hardware) {
      const currentExtraFrames = codecContext.extraHWFrames;
      if (currentExtraFrames >= 0) {
        codecContext.extraHWFrames = currentExtraFrames + FRAME_THREAD_QUEUE_SIZE;
      } else {
        codecContext.extraHWFrames = 1;
      }
    }

    const decoder = new Decoder(codecContext, codec, stream, options);

    if (options.signal) {
      options.signal.throwIfAborted();
      decoder.signal = options.signal;
    }

    return decoder;
  }

  /**
   * Create a decoder for a media stream synchronously.
   * Synchronous version of create.
   *
   * Initializes a decoder with the appropriate codec and configuration.
   * Automatically detects and configures hardware acceleration if provided.
   * Applies custom codec options and threading configuration.
   *
   * @param stream - Media stream to decode
   *
   * @param options - Decoder configuration options
   *
   * @returns Configured decoder instance
   *
   * @throws {FFmpegError} If codec initialization fails
   *
   * @example
   * ```typescript
   * import { Demuxer, Decoder } from 'node-av/api';
   *
   * await using input = await Demuxer.open('video.mp4');
   * using decoder = Decoder.createSync(input.video());
   * ```
   *
   * @example
   * ```typescript
   * using decoder = Decoder.createSync(stream, {
   *   threads: 4,
   *   options: {
   *     'refcounted_frames': '1',
   *     'skip_frame': 'nonkey'  // Only decode keyframes
   *   }
   * });
   * ```
   *
   * @example
   * ```typescript
   * const hw = HardwareContext.auto();
   * using decoder = Decoder.createSync(stream, {
   *   hardware: hw,
   *   threads: 0  // Auto-detect thread count
   * });
   * ```
   *
   * @example
   * ```typescript
   * using decoder = Decoder.createSync(stream, FF_DECODER_H264_NVDEC, {
   *   hardware: hw
   * });
   * ```
   *
   * @see {@link HardwareContext} For GPU acceleration setup
   * @see {@link DecoderOptions} For configuration options
   * @see {@link create} For async version
   */
  static createSync(stream: Stream, options?: DecoderOptions): Decoder;
  static createSync<const C extends FFDecoderCodec | AVCodecID | Codec>(stream: Stream, decoderCodec: C, options?: DecoderOptions<C>): Decoder;
  static createSync(stream: Stream, optionsOrCodec?: DecoderOptions | FFDecoderCodec | AVCodecID | Codec, maybeOptions?: DecoderOptions): Decoder {
    // Parse arguments
    let options: DecoderOptions = {};
    let explicitCodec: FFDecoderCodec | AVCodecID | Codec | undefined;

    if (optionsOrCodec !== undefined) {
      // Check if first argument is a codec or options
      if (
        typeof optionsOrCodec === 'string' || // FFDecoderCodec
        typeof optionsOrCodec === 'number' || // AVCodecID
        optionsOrCodec instanceof Codec // Codec instance
      ) {
        // First argument is a codec
        explicitCodec = optionsOrCodec;
        options = maybeOptions ?? {};
      } else {
        // First argument is options
        options = optionsOrCodec;
      }
    }

    let codec: Codec | null = null;

    // If explicit codec provided, use it
    if (explicitCodec !== undefined) {
      if (typeof explicitCodec === 'object' && 'id' in explicitCodec) {
        // Already a Codec instance
        codec = explicitCodec;
      } else if (typeof explicitCodec === 'string') {
        // FFDecoderCodec string
        codec = Codec.findDecoderByName(explicitCodec);
        if (!codec) {
          throw new FFmpegError(AVERROR_DECODER_NOT_FOUND);
        }
      } else {
        // AVCodecID number
        codec = Codec.findDecoder(explicitCodec);
        if (!codec) {
          throw new FFmpegError(AVERROR_DECODER_NOT_FOUND);
        }
      }
    } else {
      // No explicit codec - use auto-detection logic
      // If hardware acceleration requested, try to find hardware decoder first
      if (options.hardware) {
        codec = options.hardware.getDecoderCodec(stream.codecpar.codecId);
        if (!codec) {
          // No hardware decoder available, fall back to software
          options.hardware = undefined;
        }
      }

      // If no hardware decoder or no hardware requested, use software decoder
      if (!codec) {
        codec = Codec.findDecoder(stream.codecpar.codecId);
        if (!codec) {
          throw new FFmpegError(AVERROR_DECODER_NOT_FOUND);
        }
      }
    }

    // Allocate and configure codec context
    const codecContext = new CodecContext();
    codecContext.allocContext3(codec);

    // Copy codec parameters to context
    const ret = codecContext.parametersToContext(stream.codecpar);
    if (ret < 0) {
      codecContext.freeContext();
      FFmpegError.throwIfError(ret, 'Failed to copy codec parameters');
    }

    // Set packet time base
    codecContext.pktTimebase = stream.timeBase;

    // Check if this decoder supports hardware acceleration
    // Only apply hardware acceleration if the decoder supports it
    // Silently ignore hardware for software decoders
    const isHWDecoder = codec.isHardwareAcceleratedDecoder();
    if (isHWDecoder && options.hardware) {
      codecContext.hwDeviceCtx = options.hardware.deviceContext;

      // Set hardware pixel format and get_format callback
      codecContext.setHardwarePixelFormat(options.hardware.devicePixelFormat);

      // Set extra_hw_frames if specified
      if (options.extraHWFrames !== undefined && options.extraHWFrames > 0) {
        codecContext.extraHWFrames = options.extraHWFrames;
      }
    } else {
      options.hardware = undefined;
    }

    options.exitOnError = options.exitOnError ?? true;

    // Enable COPY_OPAQUE flag to copy packet.opaque to frame.opaque
    // codecContext.setFlags(AV_CODEC_FLAG_COPY_OPAQUE);

    // Thread parameters need to be set before open2
    codecContext.threadCount = options.threadCount ?? 0;
    if (options.threadType !== undefined) {
      codecContext.threadType = options.threadType;
    }

    const opts = options.options ? Dictionary.fromObject(options.options) : undefined;

    // Open codec synchronously
    const openRet = codecContext.open2Sync(codec, opts);
    if (openRet < 0) {
      codecContext.freeContext();
      FFmpegError.throwIfError(openRet, 'Failed to open codec');
    }

    // Adjust extra_hw_frames for queuing
    // This is done AFTER open2 because the decoder validates extra_hw_frames during open
    if (isHWDecoder && options.hardware) {
      const currentExtraFrames = codecContext.extraHWFrames;
      if (currentExtraFrames >= 0) {
        codecContext.extraHWFrames = currentExtraFrames + FRAME_THREAD_QUEUE_SIZE;
      } else {
        codecContext.extraHWFrames = 1;
      }
    }

    const decoder = new Decoder(codecContext, codec, stream, options);

    if (options.signal) {
      options.signal.throwIfAborted();
      decoder.signal = options.signal;
    }

    return decoder;
  }

  /**
   * Check if decoder is open.
   *
   * @returns true if decoder is open and ready
   *
   * @example
   * ```typescript
   * if (decoder.isDecoderOpen) {
   *   const frame = await decoder.decode(packet);
   * }
   * ```
   */
  get isDecoderOpen(): boolean {
    return !this.isClosed;
  }

  /**
   * Check if decoder has been initialized.
   *
   * Returns true if decoder is initialized (true by default for decoders).
   * Decoders are pre-initialized from stream parameters.
   *
   * @returns true if decoder has been initialized
   *
   * @example
   * ```typescript
   * if (decoder.isDecoderInitialized) {
   *   console.log('Decoder is ready to process frames');
   * }
   * ```
   */
  get isDecoderInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if decoder uses hardware acceleration.
   *
   * @returns true if hardware-accelerated
   *
   * @example
   * ```typescript
   * if (decoder.isHardware()) {
   *   console.log('Using GPU acceleration');
   * }
   * ```
   *
   * @see {@link HardwareContext} For hardware setup
   */
  isHardware(): boolean {
    return !!this.options.hardware && this.codec.isHardwareAcceleratedDecoder();
  }

  /**
   * Check if decoder is ready for processing.
   *
   * @returns true if initialized and ready
   *
   * @example
   * ```typescript
   * if (decoder.isReady()) {
   *   const frame = await decoder.decode(packet);
   * }
   * ```
   */
  isReady(): boolean {
    return this.initialized && !this.isClosed;
  }

  /**
   * Send a packet to the decoder.
   *
   * Sends a compressed packet to the decoder for decoding.
   * Does not return decoded frames - use {@link receive} to retrieve frames.
   * A single packet can produce zero, one, or multiple frames depending on codec buffering.
   * Automatically manages decoder state and error recovery.
   *
   * **Important**: This method only SENDS the packet to the decoder.
   * You must call {@link receive} separately (potentially multiple times) to get decoded frames.
   *
   * Direct mapping to avcodec_send_packet().
   *
   * @param packet - Compressed packet to send to decoder, or null to flush
   *
   * @throws {FFmpegError} If sending packet fails
   *
   * @example
   * ```typescript
   * // Send packet and receive frames
   * await decoder.decode(packet);
   *
   * // Receive all available frames
   * while (true) {
   *   const frame = await decoder.receive();
   *   if (!frame) break;
   *   console.log(`Decoded frame with PTS: ${frame.pts}`);
   *   frame.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * for await (const packet of input.packets()) {
   *   // packet is null at end of stream - automatically flushes decoder
   *   await decoder.decode(packet);
   *
   *   // Receive available frames
   *   let frame;
   *   while ((frame = await decoder.receive())) {
   *     await processFrame(frame);
   *     frame.free();
   *   }
   * }
   * ```
   *
   * @see {@link receive} For receiving decoded frames
   * @see {@link decodeAll} For combined send+receive operation
   * @see {@link frames} For automatic packet iteration
   * @see {@link flush} For end-of-stream handling
   * @see {@link decodeSync} For synchronous version
   */
  async decode(packet: Packet | null): Promise<void> {
    this.signal?.throwIfAborted();

    if (this.isClosed) {
      return;
    }

    // Null packet = flush decoder
    if (packet === null) {
      await this.flush();
      return;
    }

    if (packet.streamIndex !== this.stream.index) {
      return;
    }

    // Skip 0-sized packets
    if (packet.size === 0) {
      return;
    }

    // Send packet to decoder
    const sendRet = await this.codecContext.sendPacket(packet);

    // EAGAIN during send_packet is a decoder bug (FFmpeg treats this as AVERROR_BUG)
    // We read all decoded frames with receive() until done, so decoder should never be full
    if (sendRet === AVERROR_EAGAIN) {
      FFmpegError.throwIfError(sendRet, 'Decoder returned EAGAIN on send - this is a decoder bug');
    }

    // Handle send errors
    if (sendRet < 0 && sendRet !== AVERROR_EOF) {
      if (this.options.exitOnError) {
        FFmpegError.throwIfError(sendRet, 'Failed to send packet to decoder');
      }
      // exitOnError=false: Continue to receive loop to drain any buffered frames
    }
  }

  /**
   * Send a packet to the decoder synchronously.
   * Synchronous version of decode.
   *
   * Sends a compressed packet to the decoder for decoding.
   * Does not return decoded frames - use {@link receiveSync} to retrieve frames.
   * A single packet can produce zero, one, or multiple frames depending on codec buffering.
   * Automatically manages decoder state and error recovery.
   *
   * **Important**: This method only SENDS the packet to the decoder.
   * You must call {@link receiveSync} separately (potentially multiple times) to get decoded frames.
   *
   * Direct mapping to avcodec_send_packet().
   *
   * @param packet - Compressed packet to send to decoder, or null to flush
   *
   * @throws {FFmpegError} If sending packet fails
   *
   * @example
   * ```typescript
   * // Send packet and receive frames
   * decoder.decodeSync(packet);
   *
   * // Receive all available frames
   * while (true) {
   *   const frame = decoder.receiveSync();
   *   if (!frame) break;
   *   console.log(`Decoded frame with PTS: ${frame.pts}`);
   *   frame.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * for (const packet of input.packetsSync()) {
   *   // packet is null at end of stream - automatically flushes decoder
   *   decoder.decodeSync(packet);
   *
   *   // Receive available frames
   *   let frame;
   *   while ((frame = decoder.receiveSync())) {
   *     processFrame(frame);
   *     frame.free();
   *   }
   * }
   * ```
   *
   * @see {@link receiveSync} For receiving decoded frames
   * @see {@link decodeAllSync} For combined send+receive operation
   * @see {@link framesSync} For automatic packet iteration
   * @see {@link flushSync} For end-of-stream handling
   * @see {@link decode} For async version
   */
  decodeSync(packet: Packet | null): void {
    if (this.isClosed) {
      return;
    }

    // Null packet = flush decoder
    if (packet === null) {
      this.flushSync();
      return;
    }

    if (packet.streamIndex !== this.stream.index) {
      return;
    }

    // Skip 0-sized packets
    if (packet.size === 0) {
      return;
    }

    // Send packet to decoder
    const sendRet = this.codecContext.sendPacketSync(packet);

    // EAGAIN during send_packet is a decoder bug (FFmpeg treats this as AVERROR_BUG)
    // We read all decoded frames with receive() until done, so decoder should never be full
    if (sendRet === AVERROR_EAGAIN) {
      FFmpegError.throwIfError(AVERROR_EAGAIN, 'Decoder returned EAGAIN on send - this is a decoder bug');
    }

    // Handle send errors
    if (sendRet < 0 && sendRet !== AVERROR_EOF) {
      if (this.options.exitOnError) {
        FFmpegError.throwIfError(sendRet, 'Failed to send packet to decoder');
      }
      // exitOnError=false: Continue to receive loop to drain any buffered frames
    }
  }

  /**
   * Decode a packet to frames.
   *
   * Sends a packet to the decoder and receives all available decoded frames.
   * Returns array of frames - may be empty if decoder needs more data.
   * One packet can produce zero, one, or multiple frames depending on codec.
   * Automatically manages decoder state and error recovery.
   *
   * Direct mapping to avcodec_send_packet() and avcodec_receive_frame().
   *
   * @param packet - Compressed packet to decode
   *
   * @returns Array of decoded frames (empty if more data needed or decoder is closed)
   *
   * @throws {FFmpegError} If decoding fails
   *
   * @example
   * ```typescript
   * const frames = await decoder.decodeAll(packet);
   * for (const frame of frames) {
   *   console.log(`Decoded frame with PTS: ${frame.pts}`);
   *   frame.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * for await (const packet of input.packets()) {
   *   const frames = await decoder.decodeAll(packet);
   *   for (const frame of frames) {
   *     await processFrame(frame);
   *     frame.free();
   *   }
   *   packet.free();
   * }
   * ```
   *
   * @see {@link decode} For single packet decoding
   * @see {@link frames} For automatic packet iteration
   * @see {@link flush} For end-of-stream handling
   * @see {@link decodeAllSync} For synchronous version
   */
  async decodeAll(packet: Packet | null): Promise<Frame[]> {
    this.signal?.throwIfAborted();
    await this.decode(packet);

    // Receive all available frames
    const frames: Frame[] = [];
    while (true) {
      const remaining = await this.receive();
      if (!remaining) break;
      frames.push(remaining);
    }

    return frames;
  }

  /**
   * Decode a packet to frames synchronously.
   * Synchronous version of decodeAll.
   *
   * Sends packet to decoder and receives all available decoded frames.
   * Returns array of frames - may be empty if decoder needs more data.
   * One packet can produce zero, one, or multiple frames depending on codec.
   *
   * @param packet - Compressed packet to decode
   *
   * @returns Array of decoded frames (empty if more data needed or decoder is closed)
   *
   * @throws {FFmpegError} If decoding fails
   *
   * @example
   * ```typescript
   * const frames = decoder.decodeAllSync(packet);
   * for (const frame of frames) {
   *   console.log(`Decoded: ${frame.width}x${frame.height}`);
   *   frame.free();
   * }
   *
   * @example
   * ```typescript
   * for (const packet of input.packetsSync()) {
   *   const frames = await decoder.decodeAllSync(packet);
   *   for (const frame of frames) {
   *     processFrame(frame);
   *     frame.free();
   *   }
   *   packet.free();
   * }
   * ```
   *
   * @see {@link decodeSync} For single packet decoding
   * @see {@link framesSync} For automatic packet iteration
   * @see {@link flushSync} For end-of-stream handling
   * @see {@link decodeAll} For async version
   */
  decodeAllSync(packet: Packet | null): Frame[] {
    this.decodeSync(packet);

    // Receive all available frames
    const frames: Frame[] = [];
    while (true) {
      const remaining = this.receiveSync();
      if (!remaining) break;
      frames.push(remaining);
    }

    return frames;
  }

  /**
   * Decode packet stream to frame stream.
   *
   * High-level async generator for complete decoding pipeline.
   * Decoder is only flushed when EOF (null) signal is explicitly received.
   * Primary interface for stream-based decoding.
   *
   * **EOF Handling:**
   * - Send null to flush decoder and get remaining buffered frames
   * - Generator yields null after flushing when null is received
   * - No automatic flushing - decoder stays open until EOF or close()
   *
   * @param packets - Async iterable of packets, single packet, or null to flush
   *
   * @yields {Frame | null} Decoded frames, followed by null when explicitly flushed
   *
   * @throws {Error} If decoder is closed
   *
   * @throws {FFmpegError} If decoding fails
   *
   * @example
   * ```typescript
   * // Stream of packets with automatic EOF propagation
   * await using input = await Demuxer.open('video.mp4');
   * using decoder = await Decoder.create(input.video());
   *
   * for await (const frame of decoder.frames(input.packets())) {
   *   if (frame === null) {
   *     console.log('Decoding complete');
   *     break;
   *   }
   *   console.log(`Frame: ${frame.width}x${frame.height}`);
   *   frame.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Single packet (no automatic flush)
   * for await (const frame of decoder.frames(singlePacket)) {
   *   await encoder.encode(frame);
   *   frame.free();
   * }
   * // Decoder still has buffered frames - send null to flush
   * for await (const frame of decoder.frames(null)) {
   *   if (frame === null) break;
   *   await encoder.encode(frame);
   *   frame.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Explicit flush with EOF
   * for await (const frame of decoder.frames(null)) {
   *   if (frame === null) {
   *     console.log('All buffered frames flushed');
   *     break;
   *   }
   *   console.log('Buffered frame:', frame.pts);
   *   frame.free();
   * }
   * ```
   *
   * @see {@link decode} For single packet decoding
   * @see {@link Demuxer.packets} For packet source
   * @see {@link framesSync} For sync version
   */
  async *frames(packets: AsyncIterable<Packet | null> | Packet | null): AsyncGenerator<Frame | null> {
    const self = this;

    const processPacket = async function* (packet: Packet) {
      await self.decode(packet);

      while (true) {
        const frame = await self.receive();
        if (!frame) break;
        yield frame;
      }
    }.bind(this);

    const finalize = async function* () {
      for await (const remaining of self.flushFrames()) {
        yield remaining;
      }
      yield null;
    }.bind(this);

    if (packets === null) {
      yield* finalize();
      return;
    }

    if (packets instanceof Packet) {
      yield* processPacket(packets);
      return;
    }

    for await (using packet of packets) {
      this.signal?.throwIfAborted();

      if (packet === null) {
        yield* finalize();
        return;
      }

      yield* processPacket(packet);
    }
  }

  /**
   * Decode packet stream to frame stream synchronously.
   * Synchronous version of frames.
   *
   * High-level async generator for complete decoding pipeline.
   * Decoder is only flushed when EOF (null) signal is explicitly received.
   * Primary interface for stream-based decoding.
   *
   * **EOF Handling:**
   * - Send null to flush decoder and get remaining buffered frames
   * - Generator yields null after flushing when null is received
   * - No automatic flushing - decoder stays open until EOF or close()
   *
   * @param packets - Iterable of packets, single packet, or null to flush
   *
   * @yields {Frame | null} Decoded frames, followed by null when explicitly flushed
   *
   * @throws {Error} If decoder is closed
   *
   * @throws {FFmpegError} If decoding fails
   *
   * @example
   * ```typescript
   * // Stream of packets with automatic EOF propagation
   * await using input = await Demuxer.open('video.mp4');
   * using decoder = await Decoder.create(input.video());
   *
   * for (const frame of decoder.framesSync(input.packetsSync())) {
   *   if (frame === null) {
   *     console.log('Decoding complete');
   *     break;
   *   }
   *   console.log(`Frame: ${frame.width}x${frame.height}`);
   *   frame.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Single packet (no automatic flush)
   * for (const frame of decoder.framesSync(singlePacket)) {
   *   encoder.encodeSync(frame);
   *   frame.free();
   * }
   * // Decoder still has buffered frames - send null to flush
   * for (const frame of decoder.framesSync(null)) {
   *   if (frame === null) break;
   *   encoder.encodeSync(frame);
   *   frame.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Explicit flush with EOF
   * for (const frame of decoder.framesSync(null)) {
   *   if (frame === null) {
   *     console.log('All buffered frames flushed');
   *     break;
   *   }
   *   console.log('Buffered frame:', frame.pts);
   *   frame.free();
   * }
   * ```
   */
  *framesSync(packets: Iterable<Packet | null> | Packet | null): Generator<Frame | null> {
    const self = this;

    const processPacket = function* (packet: Packet) {
      self.decodeSync(packet);

      while (true) {
        const frame = self.receiveSync();
        if (!frame) break;
        yield frame;
      }
    }.bind(this);

    const finalize = function* () {
      for (const remaining of self.flushFramesSync()) {
        yield remaining;
      }
      yield null;
    }.bind(this);

    if (packets === null) {
      yield* finalize();
      return;
    }

    if (packets instanceof Packet) {
      yield* processPacket(packets);
      return;
    }

    for (using packet of packets) {
      if (packet === null) {
        yield* finalize();
        return;
      }

      yield* processPacket(packet);
    }
  }

  /**
   * Flush decoder and signal end-of-stream.
   *
   * Sends null packet to decoder to signal end-of-stream.
   * Does nothing if decoder is closed.
   * Must use receive() or flushFrames() to get remaining buffered frames.
   *
   * Direct mapping to avcodec_send_packet(NULL).
   *
   * @throws {FFmpegError} If flush fails
   *
   * @example
   * ```typescript
   * // Signal end of stream
   * await decoder.flush();
   *
   * // Then get remaining frames
   * let frame;
   * while ((frame = await decoder.receive()) !== null) {
   *   console.log('Got buffered frame');
   *   frame.free();
   * }
   * ```
   *
   * @see {@link flushFrames} For convenient async iteration
   * @see {@link receive} For getting buffered frames
   * @see {@link flushSync} For synchronous version
   */
  async flush(): Promise<void> {
    this.signal?.throwIfAborted();

    if (this.isClosed) {
      return;
    }

    // Send flush packet (null)
    const ret = await this.codecContext.sendPacket(null);
    if (ret < 0 && ret !== AVERROR_EOF) {
      if (ret !== AVERROR_EAGAIN) {
        FFmpegError.throwIfError(ret, 'Failed to flush decoder');
      }
    }
  }

  /**
   * Flush decoder and signal end-of-stream synchronously.
   * Synchronous version of flush.
   *
   * Send null packet to signal end of input stream.
   * Decoder may still have buffered frames.
   * Call receiveSync() repeatedly to get remaining frames.
   *
   * @throws {FFmpegError} If flush fails
   *
   * @example
   * ```typescript
   * decoder.flushSync();
   * // Get remaining frames
   * let frame;
   * while ((frame = decoder.receiveSync()) !== null) {
   *   console.log('Buffered frame');
   * }
   * ```
   *
   * @see {@link flushFramesSync} For convenient sync iteration
   * @see {@link receiveSync} For getting buffered frames
   * @see {@link flush} For async version
   */
  flushSync(): void {
    if (this.isClosed) {
      return;
    }

    // Send flush packet (null)
    const ret = this.codecContext.sendPacketSync(null);
    if (ret < 0 && ret !== AVERROR_EOF) {
      if (ret !== AVERROR_EAGAIN) {
        FFmpegError.throwIfError(ret, 'Failed to flush decoder');
      }
    }
  }

  /**
   * Flush all buffered frames as async generator.
   *
   * Convenient async iteration over remaining frames.
   * Automatically sends flush signal and retrieves buffered frames.
   * Useful for end-of-stream processing.
   *
   * @yields {Frame} Buffered frames
   *
   * @example
   * ```typescript
   * // Flush at end of decoding
   * for await (const frame of decoder.flushFrames()) {
   *   console.log('Processing buffered frame');
   *   await encoder.encode(frame);
   *   frame.free();
   * }
   * ```
   *
   * @see {@link decode} For sending packets and receiving frames
   * @see {@link flush} For signaling end-of-stream
   * @see {@link flushFramesSync} For synchronous version
   */
  async *flushFrames(): AsyncGenerator<Frame> {
    // Send flush signal
    await this.flush();

    while (true) {
      const remaining = await this.receive();
      if (!remaining) break;
      yield remaining;
    }
  }

  /**
   * Flush all buffered frames as generator synchronously.
   * Synchronous version of flushFrames.
   *
   * Convenient sync iteration over remaining frames.
   * Automatically sends flush signal and retrieves buffered frames.
   * Useful for end-of-stream processing.
   *
   * @yields {Frame} Buffered frames
   *
   * @example
   * ```typescript
   * // Flush at end of decoding
   * for (const frame of decoder.flushFramesSync()) {
   *   console.log('Processing buffered frame');
   *   encoder.encodeSync(frame);
   *   frame.free();
   * }
   * ```
   *
   * @see {@link decodeSync} For sending packets and receiving frames
   * @see {@link flushSync} For signaling end-of-stream
   * @see {@link flushFrames} For async version
   */
  *flushFramesSync(): Generator<Frame> {
    // Send flush signal
    this.flushSync();

    while (true) {
      const remaining = this.receiveSync();
      if (!remaining) break;
      yield remaining;
    }
  }

  /**
   * Receive frame from decoder.
   *
   * Gets decoded frames from the codec's internal buffer.
   * Handles frame cloning and error checking.
   * Hardware frames include hw_frames_ctx reference.
   * Call repeatedly to drain all buffered frames.
   *
   * **Return Values:**
   * - `Frame` - Successfully decoded frame
   * - `null` - No frame available (AVERROR_EAGAIN), send more packets
   * - `undefined` - End of stream reached (AVERROR_EOF), decoder flushed
   *
   * Direct mapping to avcodec_receive_frame().
   *
   * @returns Decoded frame, null (need more data), or undefined (end of stream)
   *
   * @throws {FFmpegError} If receive fails with error other than AVERROR_EAGAIN or AVERROR_EOF
   *
   * @throws {Error} If frame cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * const frame = await decoder.receive();
   * if (frame === EOF) {
   *   console.log('Decoder flushed, no more frames');
   * } else if (frame) {
   *   console.log('Got decoded frame');
   *   frame.free();
   * } else {
   *   console.log('Need more packets');
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Drain all buffered frames (stop on null or EOF)
   * let frame;
   * while ((frame = await decoder.receive()) && frame !== EOF) {
   *   console.log(`Frame PTS: ${frame.pts}`);
   *   frame.free();
   * }
   * ```
   *
   * @see {@link decode} For sending packets
   * @see {@link flush} For signaling end-of-stream
   * @see {@link receiveSync} For synchronous version
   * @see {@link EOF} For end-of-stream signal
   */
  async receive(): Promise<Frame | EOFSignal | null> {
    if (this.isClosed) {
      return EOF;
    }

    // Clear previous frame data
    this.frame.unref();

    const ret = await this.codecContext.receiveFrame(this.frame);

    if (ret === 0) {
      // Set frame time_base to decoder's packet timebase
      this.frame.timeBase = this.codecContext.pktTimebase;

      // Check for corrupt frame
      if (this.frame.decodeErrorFlags || this.frame.hasFlags(AV_FRAME_FLAG_CORRUPT)) {
        if (this.options.exitOnError) {
          throw new FFmpegError(AVERROR_INVALIDDATA);
        }
        // exitOnError=false: skip corrupt frame
        return null;
      }

      // Handles PTS assignment, duration estimation, and frame tracking
      if (this.codecContext.codecType === AVMEDIA_TYPE_VIDEO) {
        this.processVideoFrame(this.frame);
      }

      // Handles timestamp extrapolation, sample rate changes, and duration calculation
      if (this.codecContext.codecType === AVMEDIA_TYPE_AUDIO) {
        this.processAudioFrame(this.frame);

        if (!this.audioResamplerSetup) {
          this.setupAudioResampler(this.frame);
        }
        if (this.audioResampler) {
          // null = resampler buffered the input without emitting; caller feeds more
          return this.resampleAudioClone(this.frame);
        }
      }

      // Got a frame, clone it for the user
      const cloned = this.frame.clone();
      if (!cloned) {
        throw new Error('Failed to clone frame (out of memory)');
      }
      return cloned;
    } else if (ret === AVERROR_EAGAIN) {
      // Need more data
      return null;
    } else if (ret === AVERROR_EOF) {
      // Flush any samples buffered inside the resampler before signaling EOF
      if (this.audioResampler && !this.audioResamplerDrained) {
        const drained = this.drainResamplerClone();
        if (drained) {
          return drained;
        }
        this.audioResamplerDrained = true;
      }
      // End of stream
      return EOF;
    } else {
      // Error during receive
      if (this.options.exitOnError) {
        FFmpegError.throwIfError(ret, 'Failed to receive frame');
      }
      // exitOnError=false: return null, caller can retry if desired
      return null;
    }
  }

  /**
   * Receive frame from decoder synchronously.
   * Synchronous version of receive.
   *
   * Gets decoded frames from the codec's internal buffer.
   * Handles frame cloning and error checking.
   * Hardware frames include hw_frames_ctx reference.
   * Call repeatedly to drain all buffered frames.
   *
   * **Return Values:**
   * - `Frame` - Successfully decoded frame
   * - `null` - No frame available (AVERROR_EAGAIN), send more packets
   * - `undefined` - End of stream reached (AVERROR_EOF), decoder flushed
   *
   * Direct mapping to avcodec_receive_frame().
   *
   * @returns Decoded frame, null (need more data), or undefined (end of stream)
   *
   * @throws {FFmpegError} If receive fails with error other than AVERROR_EAGAIN or AVERROR_EOF
   *
   * @throws {Error} If frame cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * const frame = decoder.receiveSync();
   * if (frame === EOF) {
   *   console.log('Decoder flushed, no more frames');
   * } else if (frame) {
   *   console.log('Got decoded frame');
   *   frame.free();
   * } else {
   *   console.log('Need more packets');
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Drain all buffered frames (stop on null or EOF)
   * let frame;
   * while ((frame = decoder.receiveSync()) && frame !== EOF) {
   *   console.log(`Frame PTS: ${frame.pts}`);
   *   frame.free();
   * }
   * ```
   *
   * @see {@link decodeSync} For sending packets
   * @see {@link flushSync} For signaling end-of-stream
   * @see {@link receive} For async version
   * @see {@link EOF} For end-of-stream signal
   */
  receiveSync(): Frame | EOFSignal | null {
    if (this.isClosed) {
      return EOF;
    }

    // Clear previous frame data
    this.frame.unref();

    const ret = this.codecContext.receiveFrameSync(this.frame);

    if (ret === 0) {
      // Set frame time_base to decoder's packet timebase
      this.frame.timeBase = this.codecContext.pktTimebase;

      // Check for corrupt frame
      if (this.frame.decodeErrorFlags || this.frame.hasFlags(AV_FRAME_FLAG_CORRUPT)) {
        if (this.options.exitOnError) {
          throw new FFmpegError(AVERROR_INVALIDDATA);
        }
        // exitOnError=false: skip corrupt frame
        return null;
      }

      // Process video frame
      // Handles PTS assignment, duration estimation, and frame tracking
      if (this.codecContext.codecType === AVMEDIA_TYPE_VIDEO) {
        this.processVideoFrame(this.frame);
      }

      // Process audio frame
      // Handles timestamp extrapolation, sample rate changes, and duration calculation
      if (this.codecContext.codecType === AVMEDIA_TYPE_AUDIO) {
        this.processAudioFrame(this.frame);

        if (!this.audioResamplerSetup) {
          this.setupAudioResampler(this.frame);
        }
        if (this.audioResampler) {
          // null = resampler buffered the input without emitting; caller feeds more
          return this.resampleAudioClone(this.frame);
        }
      }

      // Got a frame, clone it for the user
      const cloned = this.frame.clone();
      if (!cloned) {
        throw new Error('Failed to clone frame (out of memory)');
      }
      return cloned;
    } else if (ret === AVERROR_EAGAIN) {
      // Need more data
      return null;
    } else if (ret === AVERROR_EOF) {
      // Flush any samples buffered inside the resampler before signaling EOF
      if (this.audioResampler && !this.audioResamplerDrained) {
        const drained = this.drainResamplerClone();
        if (drained) {
          return drained;
        }
        this.audioResamplerDrained = true;
      }
      // End of stream
      return EOF;
    } else {
      // Error during receive
      if (this.options.exitOnError) {
        FFmpegError.throwIfError(ret, 'Failed to receive frame');
      }
      // exitOnError=false: return null, caller can retry if desired
      return null;
    }
  }

  /**
   * Pipe decoded frames to a filter component or encoder.
   *
   * @param target - Filter to receive frames or encoder to encode frames
   *
   * @returns Scheduler for continued chaining
   *
   * @example
   * ```typescript
   * decoder.pipeTo(filter).pipeTo(encoder)
   * ```
   */
  pipeTo(target: FilterAPI): Scheduler<Packet>;
  pipeTo(target: Encoder): Scheduler<Packet>;
  pipeTo(target: FilterAPI | Encoder): Scheduler<Packet> {
    const t = target as unknown as SchedulableComponent<Frame>;

    // Store reference to next component for flush propagation
    this.nextComponent = t;

    // Start worker if not already running
    this.workerPromise ??= this.runWorker();

    // Start pipe task: decoder.outputQueue -> target.inputQueue (via target.send)
    this.pipeToPromise = (async () => {
      while (true) {
        const frame = await this.receiveFromQueue();
        if (!frame) break;
        await t.sendToQueue(frame);
      }
    })();

    // Return scheduler for chaining (target is now the last component)
    return new Scheduler<Packet>(this as unknown as SchedulableComponent<Packet>, t);
  }

  /**
   * Close decoder and free resources.
   *
   * Releases codec context and internal frame buffer.
   * Safe to call multiple times.
   * Automatically called by Symbol.dispose.
   *
   * @example
   * ```typescript
   * const decoder = await Decoder.create(stream);
   * try {
   *   // Use decoder
   * } finally {
   *   decoder.close();
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

    this.inputQueue?.close();
    this.outputQueue?.close();

    this.inputQueue?.clear();
    this.outputQueue?.clear();

    this.frame.free();

    this.audioResampler?.[Symbol.dispose]();
    this.audioResampler = undefined;
    this.resampledFrame?.free();
    this.resampledFrame = undefined;

    this.videoScaler?.[Symbol.dispose]();
    this.videoScaler = undefined;
    this.scaledFrame?.free();
    this.scaledFrame = undefined;

    this.codecContext.freeContext();

    this.initialized = false;
  }

  /**
   * Get stream object.
   *
   * Returns the underlying stream being decoded.
   * Provides access to stream metadata and parameters.
   *
   * @returns Stream object
   *
   * @internal
   *
   * @see {@link Stream} For stream details
   */
  getStream(): Stream {
    return this.stream;
  }

  /**
   * Get decoder codec.
   *
   * Returns the codec used by this decoder.
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
   * Returns null if decoder is closed.
   *
   * @returns Codec context or null if closed
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
      // Outer loop - receive packets
      while (!this.inputQueue.isClosed) {
        using packet = await this.inputQueue.receive();
        if (!packet) break;

        // Skip packets for other streams
        if (packet.streamIndex !== this.stream.index) {
          continue;
        }

        if (packet.size === 0) {
          continue;
        }

        await this.decode(packet);

        // Receive ALL available frames immediately
        // This ensures frames are yielded ASAP without latency
        while (!this.outputQueue.isClosed) {
          const frame = await this.receive();
          if (!frame) break; // EAGAIN or EOF
          await this.outputQueue.send(frame);
        }
      }

      // Flush decoder at end
      await this.flush();
      while (!this.outputQueue.isClosed) {
        const frame = await this.receive();
        if (!frame) break;
        await this.outputQueue.send(frame);
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
   * Send packet to input queue or flush the pipeline.
   *
   * When packet is provided, queues it for processing.
   * When null is provided, triggers flush sequence:
   * - Closes input queue
   * - Waits for worker completion
   * - Flushes decoder and sends remaining frames to output queue
   * - Closes output queue
   * - Waits for pipeTo task completion
   * - Propagates flush to next component (if any)
   *
   * Used by scheduler system for pipeline control.
   *
   * @param packet - Packet to send, or null to flush
   *
   * @internal
   */
  private async sendToQueue(packet: Packet | null): Promise<void> {
    if (packet) {
      await this.inputQueue.send(packet);
    } else {
      // Close input queue to signal end of stream to worker
      this.inputQueue.close();

      // Wait for worker to finish processing all packets (if exists)
      if (this.workerPromise) {
        await this.workerPromise;
      }

      // Flush decoder at end
      await this.flush();

      // Send all flushed frames to output queue
      while (true) {
        const frame = await this.receive();
        if (!frame) break;
        await this.outputQueue.send(frame);
      }

      // Close output queue to signal end of stream to pipeTo() task
      this.outputQueue.close();

      // Wait for pipeTo() task to finish processing all frames (if exists)
      if (this.pipeToPromise) {
        await this.pipeToPromise;
      }

      // Then propagate flush to next component
      if (this.nextComponent) {
        await this.nextComponent.sendToQueue(null);
      }
    }
  }

  /**
   * Receive frame from output queue.
   *
   * @returns Frame from output queue or null if closed
   *
   * @internal
   */
  private async receiveFromQueue(): Promise<Frame | null> {
    return await this.outputQueue.receive();
  }

  /**
   * Estimate video frame duration.
   *
   * Implements FFmpeg CLI's video_duration_estimate() logic.
   * Uses multiple heuristics to determine frame duration when not explicitly available:
   * 1. Frame duration from container (if reliable)
   * 2. Duration from codec framerate
   * 3. PTS difference between frames
   * 4. Stream framerate
   * 5. Last frame's estimated duration
   *
   * @param frame - Frame to estimate duration for
   *
   * @returns Estimated duration in frame's timebase units
   *
   * @internal
   */
  private estimateVideoDuration(frame: Frame): bigint {
    // Difference between this and last frame's timestamps
    const tsDiff = frame.pts !== AV_NOPTS_VALUE && this.lastFramePts !== AV_NOPTS_VALUE ? frame.pts - this.lastFramePts : -1n;

    // Frame duration is unreliable (typically guessed by lavf) when it is equal
    // to 1 and the actual duration of the last frame is more than 2x larger
    const durationUnreliable = frame.duration === 1n && tsDiff > 2n * frame.duration;

    // Prefer frame duration for containers with timestamps
    if (frame.duration > 0n && !durationUnreliable) {
      return frame.duration;
    }

    // Calculate codec duration from framerate
    let codecDuration = 0n;
    const framerate = this.codecContext.framerate;
    if (framerate && framerate.den > 0 && framerate.num > 0) {
      const fields = (frame.repeatPict ?? 0) + 2;
      const fieldRate = avMulQ(framerate, { num: 2, den: 1 });
      codecDuration = avRescaleQ(fields, avInvQ(fieldRate), frame.timeBase);
    }

    // When timestamps are available, repeat last frame's actual duration
    if (tsDiff > 0n) {
      return tsDiff;
    }

    // Try frame/codec duration
    if (frame.duration > 0n) {
      return frame.duration;
    }
    if (codecDuration > 0n) {
      return codecDuration;
    }

    // Try stream framerate
    const streamFramerate = this.stream.avgFrameRate ?? this.stream.rFrameRate;
    if (streamFramerate && streamFramerate.num > 0 && streamFramerate.den > 0) {
      const d = avRescaleQ(1, avInvQ(streamFramerate), frame.timeBase);
      if (d > 0n) {
        return d;
      }
    }

    // Last resort is last frame's estimated duration, and 1
    return this.lastFrameDurationEst > 0n ? this.lastFrameDurationEst : 1n;
  }

  /**
   * Process video frame after decoding.
   *
   * Implements FFmpeg CLI's video_frame_process() logic.
   * Handles:
   * - Hardware frame transfer to software format
   * - PTS assignment from best_effort_timestamp
   * - PTS extrapolation when missing
   * - Duration estimation
   * - Frame tracking for next frame
   *
   * @param frame - Decoded frame to process
   *
   * @internal
   */
  private processVideoFrame(frame: Frame): void {
    // Video output rescaling (DecoderOptions.rescale). Replaces the former
    // hwaccelOutputFormat: hardware frames are first transferred to a supported
    // software format (swscale can't read GPU surfaces), then converted to the
    // requested pixel format / size on the CPU. Hardware frames are left untouched
    // (kept on the GPU) when rescale is not set.
    if (this.options.rescale) {
      if (frame.isHwFrame()) {
        if (!this.transferHwFrameToSoftware(frame)) {
          return; // transfer failed and exitOnError is off - leave the frame as-is
        }
      }
      // Only software frames can be converted with swscale; a still-hardware frame
      // (transfer above is the only path to software) is left untouched.
      if (!frame.isHwFrame()) {
        this.rescaleVideoInPlace(frame);
      }
    }

    // Set PTS from best_effort_timestamp
    frame.pts = frame.bestEffortTimestamp;

    // DECODER_FLAG_FRAMERATE_FORCED: Ignores all timestamps and generates constant framerate
    if (this.options.forcedFramerate) {
      frame.pts = AV_NOPTS_VALUE;
      frame.duration = 1n;
      const invFramerate = avInvQ(this.options.forcedFramerate);
      frame.timeBase = new Rational(invFramerate.num, invFramerate.den);
    }

    // No timestamp available - extrapolate from previous frame duration
    if (frame.pts === AV_NOPTS_VALUE) {
      frame.pts = this.lastFramePts === AV_NOPTS_VALUE ? 0n : this.lastFramePts + this.lastFrameDurationEst;
    }

    // Update timestamp history
    this.lastFrameDurationEst = this.estimateVideoDuration(frame);
    this.lastFramePts = frame.pts;
    this.lastFrameTb = new Rational(frame.timeBase.num, frame.timeBase.den);

    // SAR override
    if (this.options.sarOverride) {
      frame.sampleAspectRatio = new Rational(this.options.sarOverride.num, this.options.sarOverride.den);
    }

    // Apply cropping
    if (this.options.applyCropping) {
      const ret = frame.applyCropping(1); // AV_FRAME_CROP_UNALIGNED = 1
      if (ret < 0) {
        if (this.options.exitOnError) {
          FFmpegError.throwIfError(ret, 'Error applying decoder cropping');
        }
      }
    }
  }

  /**
   * Audio samplerate update - handles sample rate changes.
   *
   * Based on FFmpeg's audio_samplerate_update().
   *
   * On sample rate change, chooses a new internal timebase that can represent
   * timestamps from all sample rates seen so far. Uses GCD to find minimal
   * common timebase, with fallback to LCM of common sample rates (28224000).
   *
   * Handles:
   * - Sample rate change detection
   * - Timebase calculation via GCD
   * - Overflow detection and fallback
   * - Frame timebase optimization
   * - Rescaling existing timestamps
   *
   * @param frame - Audio frame to process
   *
   * @returns Timebase to use for this frame
   *
   * @internal
   */
  private audioSamplerateUpdate(frame: Frame): IRational {
    const prev = this.lastFrameTb.den;
    const sr = frame.sampleRate;

    // No change - return existing timebase
    if (frame.sampleRate === this.lastFrameSampleRate) {
      return this.lastFrameTb;
    }

    // Calculate GCD to find minimal common timebase
    const gcd = avGcd(prev, sr);

    let tbNew: IRational;

    // Check for overflow
    if (Number(prev) / Number(gcd) >= INT_MAX / sr) {
      // LCM of 192000, 44100 - represents all common sample rates
      tbNew = { num: 1, den: 28224000 };
    } else {
      // Normal case
      tbNew = { num: 1, den: (Number(prev) / Number(gcd)) * sr };
    }

    // Keep frame's timebase if strictly better
    // "Strictly better" means: num=1, den > tbNew.den, and tbNew.den divides den evenly
    if (frame.timeBase.num === 1 && frame.timeBase.den > tbNew.den && frame.timeBase.den % tbNew.den === 0) {
      tbNew = { num: frame.timeBase.num, den: frame.timeBase.den };
    }

    // Rescale existing timestamps to new timebase
    if (this.lastFramePts !== AV_NOPTS_VALUE) {
      this.lastFramePts = avRescaleQ(this.lastFramePts, this.lastFrameTb, tbNew);
    }

    this.lastFrameDurationEst = avRescaleQ(this.lastFrameDurationEst, this.lastFrameTb, tbNew);

    this.lastFrameTb = new Rational(tbNew.num, tbNew.den);
    this.lastFrameSampleRate = frame.sampleRate;

    return this.lastFrameTb;
  }

  /**
   * Audio timestamp processing - handles audio frame timestamps.
   *
   * Based on FFmpeg's audio_ts_process().
   *
   * Processes audio frame timestamps with:
   * - Sample rate change handling via audioSamplerateUpdate()
   * - PTS extrapolation when missing (pts_pred)
   * - Gap detection (resets av_rescale_delta state)
   * - Smooth timestamp conversion via av_rescale_delta
   * - Duration calculation from nb_samples
   * - Conversion to filtering timebase {1, sample_rate}
   *
   * Handles:
   * - Dynamic sample rate changes
   * - Missing timestamps (AV_NOPTS_VALUE)
   * - Timestamp gaps/discontinuities
   * - Sample-accurate timestamp generation
   * - Frame duration calculation
   *
   * @param frame - Decoded audio frame to process
   *
   * @internal
   */
  private processAudioFrame(frame: Frame): void {
    // Filtering timebase is always {1, sample_rate} for audio
    const tbFilter: IRational = { num: 1, den: frame.sampleRate };

    // Handle sample rate change - updates internal timebase
    const tb = this.audioSamplerateUpdate(frame);

    // Predict next PTS based on last frame + duration
    const ptsPred = this.lastFramePts === AV_NOPTS_VALUE ? 0n : this.lastFramePts + this.lastFrameDurationEst;

    // No timestamp - use predicted value
    if (frame.pts === AV_NOPTS_VALUE) {
      frame.pts = ptsPred;
      frame.timeBase = new Rational(tb.num, tb.den);
    } else if (this.lastFramePts !== AV_NOPTS_VALUE) {
      // Detect timestamp gap - compare with predicted timestamp
      const ptsPredInFrameTb = avRescaleQRnd(ptsPred, tb, frame.timeBase, AV_ROUND_UP);
      if (frame.pts > ptsPredInFrameTb) {
        // Gap detected - reset rescale_delta state for smooth conversion
        this.lastFilterInRescaleDelta = AV_NOPTS_VALUE;
      }
    }

    // Smooth timestamp conversion with av_rescale_delta
    // This maintains fractional sample accuracy across timebase conversions
    // avRescaleDelta modifies lastRef in place (simulates C's &last_filter_in_rescale_delta)
    const lastRef = { value: this.lastFilterInRescaleDelta };
    frame.pts = avRescaleDelta(frame.timeBase, frame.pts, tb, frame.nbSamples, lastRef, tb);
    this.lastFilterInRescaleDelta = lastRef.value;

    // Update frame tracking
    this.lastFramePts = frame.pts;
    this.lastFrameDurationEst = avRescaleQ(BigInt(frame.nbSamples), tbFilter, tb);

    // Convert to filtering timebase
    frame.pts = avRescaleQ(frame.pts, tb, tbFilter);
    frame.duration = BigInt(frame.nbSamples);
    frame.timeBase = new Rational(tbFilter.num, tbFilter.den);
  }

  /**
   * Lazily configure the audio output resampler from the first decoded frame.
   *
   * Reads the source format from the frame, resolves the target from
   * `options.resample` (omitted fields keep the source value), and builds a
   * `SoftwareResampleContext` only when something actually differs. Runs once.
   *
   * @param frame - First decoded audio frame
   *
   * @throws {FFmpegError} If the resampler cannot be configured or initialized
   *
   * @internal
   */
  private setupAudioResampler(frame: Frame): void {
    this.audioResamplerSetup = true;

    const cfg = this.options.resample;
    if (!cfg) {
      return;
    }

    const inRate = frame.sampleRate;
    const inFmt = frame.format as AVSampleFormat;

    // swr requires a concrete layout on both sides. Decoded PCM frames often carry
    // an unspecified layout (order UNSPEC, mask 0); normalize it to the canonical
    // native layout and re-apply it to each input frame so swr's input matches.
    let inLayout = frame.channelLayout;
    if (inLayout.order === AV_CHANNEL_ORDER_UNSPEC) {
      inLayout = avChannelLayoutDefault(inLayout.nbChannels);
      this.resampleInputLayout = inLayout;
    }

    const targetRate = cfg.sampleRate ?? inRate;
    const targetFmt = cfg.sampleFormat ?? inFmt;
    const targetLayout = cfg.channelLayout ?? inLayout;

    const needsResample = targetRate !== inRate || targetFmt !== inFmt || targetLayout.nbChannels !== inLayout.nbChannels;
    if (!needsResample) {
      this.resampleInputLayout = undefined;
      return;
    }

    this.resampleTarget = { rate: targetRate, fmt: targetFmt, layout: targetLayout };
    const swr = new SoftwareResampleContext();
    FFmpegError.throwIfError(swr.allocSetOpts2(targetLayout, targetFmt, targetRate, inLayout, inFmt, inRate), 'Failed to configure audio resampler');
    FFmpegError.throwIfError(swr.init(), 'Failed to initialize audio resampler');
    this.audioResampler = swr;
  }

  /**
   * Lazily allocate the reused resampler output frame.
   *
   * @returns The allocated output frame
   *
   * @internal
   */
  private getResampleFrame(): Frame {
    if (!this.resampledFrame) {
      this.resampledFrame = new Frame();
      this.resampledFrame.alloc();
    }
    return this.resampledFrame;
  }

  /**
   * Resample a decoded audio frame to the target format and clone it for the user.
   *
   * `swr_convert_frame` allocates/sizes the output buffer; the sample timestamp
   * (carried in the frame's own timebase) is preserved, while `nb_samples` and
   * `sample_rate` reflect the new rate. Returns null when the resampler buffered
   * the input without emitting samples yet (caller should feed more).
   *
   * @param frame - Decoded source audio frame
   *
   * @returns Cloned resampled frame owned by the caller, or null if none emitted
   *
   * @throws {FFmpegError} If resampling fails
   *
   * @internal
   */
  private resampleAudioClone(frame: Frame): Frame | null {
    // Give swr the concrete layout it was configured with when the source is unspecified.
    if (this.resampleInputLayout) {
      frame.channelLayout = this.resampleInputLayout;
    }
    const out = this.getResampleFrame();
    out.unref();
    out.format = this.resampleTarget!.fmt;
    out.sampleRate = this.resampleTarget!.rate;
    out.channelLayout = this.resampleTarget!.layout;
    FFmpegError.throwIfError(this.audioResampler!.convertFrame(out, frame), 'Failed to resample audio frame');
    if (out.nbSamples <= 0) {
      return null;
    }
    // Keep the frame self-consistent: audio timebase is 1/sampleRate, so the
    // output carries the target rate's timebase with the pts rescaled into it
    // (and the duration in the same units), not the source frame's timebase.
    const outTb = new Rational(1, this.resampleTarget!.rate);
    out.timeBase = outTb;
    out.pts = frame.pts === AV_NOPTS_VALUE ? AV_NOPTS_VALUE : avRescaleQ(frame.pts, frame.timeBase, outTb);
    out.duration = BigInt(out.nbSamples);
    const cloned = out.clone();
    if (!cloned) {
      throw new Error('Failed to clone resampled frame (out of memory)');
    }
    return cloned;
  }

  /**
   * Drain samples buffered inside the resampler (rate-conversion delay) at EOF.
   *
   * @returns Cloned drained frame owned by the caller, or null when empty
   *
   * @throws {FFmpegError} If draining fails
   *
   * @internal
   */
  private drainResamplerClone(): Frame | null {
    const out = this.getResampleFrame();
    out.unref();
    out.format = this.resampleTarget!.fmt;
    out.sampleRate = this.resampleTarget!.rate;
    out.channelLayout = this.resampleTarget!.layout;
    const ret = this.audioResampler!.convertFrame(out, null);
    if (ret < 0 || out.nbSamples <= 0) {
      return null;
    }
    out.timeBase = new Rational(1, this.resampleTarget!.rate);
    out.pts = AV_NOPTS_VALUE;
    out.duration = BigInt(out.nbSamples);
    const cloned = out.clone();
    if (!cloned) {
      throw new Error('Failed to clone resampled frame (out of memory)');
    }
    return cloned;
  }

  /**
   * Resolve (once, then cache) the software format to download hardware frames to.
   *
   * When `rescale.pixelFormat` is set and the frame's hardware frames context can
   * transfer directly to it, that format is used so the subsequent swscale can be
   * skipped entirely (when no resize is requested) or stay format-preserving. When
   * it cannot, `AV_PIX_FMT_NONE` is returned so `av_hwframe_transfer_data` picks a
   * supported format and the swscale handles the final conversion. Cached because
   * the hardware frames context is stable for the lifetime of the decoder.
   *
   * @param frame - First hardware frame (used to read the hardware frames context)
   *
   * @returns The download format, or `AV_PIX_FMT_NONE` to let FFmpeg choose
   *
   * @internal
   */
  private resolveHwTransferFormat(frame: Frame): AVPixelFormat {
    if (this.hwTransferFormat !== undefined) {
      return this.hwTransferFormat;
    }

    let chosen: AVPixelFormat = AV_PIX_FMT_NONE;
    const target = this.options.rescale?.pixelFormat;
    const hwCtx = frame.hwFramesCtx;
    if (target !== undefined && hwCtx) {
      const formats = hwCtx.transferGetFormats(AV_HWFRAME_TRANSFER_DIRECTION_FROM);
      if (Array.isArray(formats) && formats.includes(target)) {
        chosen = target;
      }
    }

    this.hwTransferFormat = chosen;
    return chosen;
  }

  /**
   * Transfer a hardware frame down to system memory, replacing it in place.
   *
   * The destination software format is the requested one when the GPU can transfer
   * to it directly (see {@link resolveHwTransferFormat}), otherwise one chosen
   * automatically by FFmpeg. The downloaded data replaces the hardware frame's
   * contents so the rest of the pipeline operates on a software frame.
   *
   * @param frame - Hardware frame to download (modified in place)
   *
   * @returns True on success; false when the transfer failed and `exitOnError` is off
   *
   * @throws {FFmpegError} If the transfer fails and `exitOnError` is enabled
   *
   * @internal
   */
  private transferHwFrameToSoftware(frame: Frame): boolean {
    const swFrame = new Frame();
    swFrame.alloc();
    // Transfer straight to the requested pixel format when the GPU supports it (so
    // the later swscale can be skipped); otherwise let FFmpeg pick a supported one.
    swFrame.format = this.resolveHwTransferFormat(frame);

    const ret = frame.hwframeTransferDataSync(swFrame, 0);
    if (ret < 0) {
      swFrame.free();
      if (this.options.exitOnError) {
        FFmpegError.throwIfError(ret, 'Failed to transfer hardware frame data');
      }
      return false;
    }

    swFrame.copyProps(frame);
    frame.unref();
    const refRet = frame.ref(swFrame);
    swFrame.free();

    if (refRet < 0) {
      if (this.options.exitOnError) {
        FFmpegError.throwIfError(refRet, 'Failed to reference software frame');
      }
      return false;
    }
    return true;
  }

  /**
   * Lazily allocate the reused rescaler output frame.
   *
   * @returns The allocated output frame
   *
   * @internal
   */
  private getScaledFrame(): Frame {
    if (!this.scaledFrame) {
      this.scaledFrame = new Frame();
      this.scaledFrame.alloc();
    }
    return this.scaledFrame;
  }

  /**
   * Convert a (software) video frame to the requested `rescale` pixel format and/or
   * size, replacing it in place.
   *
   * Each omitted target field keeps the source value, and the conversion is skipped
   * entirely when the frame already matches. The swscale context is configured
   * lazily from the first frame that needs conversion. `sws_scale_frame` copies the
   * frame properties (timing, colorimetry, aspect ratio).
   *
   * @param frame - Software video frame to convert (modified in place)
   *
   * @throws {FFmpegError} If the rescaler fails to configure or convert and `exitOnError` is enabled
   *
   * @internal
   */
  private rescaleVideoInPlace(frame: Frame): void {
    const srcW = frame.width;
    const srcH = frame.height;
    const srcFmt = frame.format as AVPixelFormat;
    const dstW = this.options.rescale!.width ?? srcW;
    const dstH = this.options.rescale!.height ?? srcH;
    const dstFmt = this.options.rescale!.pixelFormat ?? srcFmt;

    // Already in the requested shape - nothing to do.
    if (dstW === srcW && dstH === srcH && dstFmt === srcFmt) {
      return;
    }

    if (!this.videoScaler) {
      const sws = new SoftwareScaleContext();
      sws.getContext(srcW, srcH, srcFmt, dstW, dstH, dstFmt, SWS_BILINEAR);
      FFmpegError.throwIfError(sws.initContext(), 'Failed to configure video rescaler');
      this.videoScaler = sws;
    }

    const out = this.getScaledFrame();
    out.unref();
    out.format = dstFmt;
    out.width = dstW;
    out.height = dstH;
    const ret = this.videoScaler.scaleFrameSync(out, frame);
    if (ret < 0) {
      if (this.options.exitOnError) {
        FFmpegError.throwIfError(ret, 'Failed to rescale video frame');
      }
      return; // leave the original frame untouched on failure
    }

    // Move the converted result back into `frame` so the rest of processVideoFrame
    // (and the caller) sees it (mirrors the hardware-transfer replace above).
    frame.unref();
    frame.ref(out);
  }

  /**
   * Dispose of decoder.
   *
   * Implements Disposable interface for automatic cleanup.
   * Equivalent to calling close().
   *
   * @example
   * ```typescript
   * {
   *   using decoder = await Decoder.create(stream);
   *   // Decode frames...
   * } // Automatically closed
   * ```
   *
   * @see {@link close} For manual cleanup
   */
  [Symbol.dispose](): void {
    this.close();
  }
}
