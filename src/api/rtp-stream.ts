import { isRtcp, RtpPacket } from 'werift';

import { AV_HWDEVICE_TYPE_NONE, AV_PICTURE_TYPE_I, AV_PIX_FMT_YUV420P, AV_SAMPLE_FMT_FLTP } from '../constants/constants.js';
import { FF_ENCODER_LIBOPUS, FF_ENCODER_LIBX264, FF_ENCODER_LIBX265 } from '../constants/encoders.js';
import { Codec } from '../lib/codec.js';
import { Rational } from '../lib/rational.js';
import { avChannelLayoutDefault, avGetPixFmtName } from '../lib/utilities.js';
import { MAX_PACKET_SIZE } from './constants.js';
import { Decoder } from './decoder.js';
import { Demuxer } from './demuxer.js';
import { Encoder } from './encoder.js';
import { FilterPreset } from './filter-presets.js';
import { FilterAPI } from './filter.js';
import { HardwareContext } from './hardware.js';
import { Muxer } from './muxer.js';
import { pipeline } from './pipeline.js';
import { pickSupportedLayout, pickSupportedPixelFormat, pickSupportedRate, pickSupportedSampleFormat } from './utilities/codec-format.js';

import type { AVCodecID, AVHWDeviceType, AVPixelFormat, AVSampleFormat, FFAudioEncoder, FFHWDeviceType, FFVideoEncoder } from '../constants/index.js';
import type { CodecContext } from '../lib/codec-context.js';
import type { Frame } from '../lib/frame.js';
import type { DemuxerOptions } from './demuxer.js';
import type { EncoderOptions } from './encoder.js';
import type { PipelineControl, PipelineProgress } from './pipeline.js';
import type { MediaFrameSource } from './types.js';

/**
 * Options for configuring RTP streaming.
 */
export interface RTPStreamOptions {
  /**
   * Callback invoked for each video RTP packet.
   * Use this to send packets to your RTP implementation.
   *
   * @param packet - Serialized RTP packet ready for transmission
   */
  onVideoPacket?: (packet: RtpPacket) => void;

  /**
   * Callback invoked for each audio RTP packet.
   * Use this to send packets to your RTP implementation.
   *
   * @param packet - Serialized RTP packet ready for transmission
   */
  onAudioPacket?: (packet: RtpPacket) => void;

  /**
   * Callback invoked when the stream is closed or encounters an error.
   *
   * @param error - Optional error if stream closed due to an error
   */
  onClose?: (error?: Error) => void;

  /**
   * Supported video codec IDs for transcoding decisions.
   * If not provided or empty, all video codecs are supported (passthrough only, no transcoding).
   * If provided, only the specified codecs are supported and transcoding will be performed if needed.
   */
  supportedVideoCodecs?: (AVCodecID | FFVideoEncoder)[];

  /**
   * Supported audio codec IDs for transcoding decisions.
   * If not provided or empty, all audio codecs are supported (passthrough only, no transcoding).
   * If provided, only the specified codecs are supported and transcoding will be performed if needed.
   */
  supportedAudioCodecs?: (AVCodecID | FFAudioEncoder)[];

  /**
   * Hardware acceleration configuration.
   *
   * - `'auto'` - Automatically detect and use available hardware acceleration
   * - Object with deviceType - Manually specify hardware acceleration type
   *
   * @default { deviceType: AV_HWDEVICE_TYPE_NONE }
   */
  hardware?: 'auto' | { deviceType: AVHWDeviceType | FFHWDeviceType; device?: string; options?: Record<string, string> };

  /**
   * Input media options passed to Demuxer.
   */
  inputOptions?: DemuxerOptions;

  /**
   * Video stream configuration.
   */
  video?: {
    ssrc?: number;
    payloadType?: number;
    mtu?: number;
    fps?: number;
    width?: number;
    height?: number;
    bitrate?: number;
    encoderOptions?: EncoderOptions['options'];
  };

  /**
   * Audio stream configuration.
   */
  audio?: {
    ssrc?: number;
    payloadType?: number;
    mtu?: number;
    sampleFormat?: AVSampleFormat;
    sampleRate?: number;
    channels?: number;
    encoderOptions?: EncoderOptions['options'];
  };

  /**
   * AbortSignal for cancellation.
   *
   * When aborted, the stream stops gracefully, equivalent to calling stop().
   * If already aborted when start() is called, throws AbortError.
   */
  signal?: AbortSignal;
}

/**
 * Check whether a streaming-class input is a frame source (not a URL or Demuxer).
 *
 * @param input - The input passed to `create()`
 *
 * @returns True if `input` is a {@link MediaFrameSource}
 *
 * @internal
 */
export function isMediaFrameSource(input: string | Demuxer | MediaFrameSource): input is MediaFrameSource {
  return typeof input !== 'string' && !(input instanceof Demuxer);
}

/**
 * Combine one or two pipeline controls behind a single {@link PipelineControl}.
 *
 * The frame-source path runs separate video/audio pipelines; this presents them
 * as one control so `stop()`/`completion` work uniformly.
 *
 * @internal
 */
class CombinedPipelineControl implements PipelineControl {
  constructor(private readonly controls: PipelineControl[]) {}

  stop(): void {
    for (const control of this.controls) {
      control.stop();
    }
  }

  isStopped(): boolean {
    return this.controls.every((control) => control.isStopped());
  }

  get completion(): Promise<void> {
    return Promise.all(this.controls.map((control) => control.completion)).then(() => undefined);
  }

  get progress(): PipelineProgress {
    // Delegate to the first control (video when present) - a merged view is not
    // meaningful across independently-clocked streams.
    return this.controls[0]?.progress ?? { frames: 0, bytes: 0, time: 0, fps: 0, bitrate: 0, speed: 0, elapsed: 0 };
  }
}

/**
 * Generic RTP streaming with automatic codec detection and transcoding.
 *
 * Provides library-agnostic RTP streaming for various applications.
 * Automatically detects input codecs and transcodes non-compatible formats.
 * Supports hardware acceleration for video transcoding.
 * Essential component for building RTP streaming servers.
 *
 * @example
 * ```typescript
 * import { RTPStream } from 'node-av/api';
 *
 * // Create stream with RTP packet callbacks
 * const stream = RTPStream.create('rtsp://camera.local/stream', {
 *   mtu: 1200,
 *   hardware: 'auto',
 *   onVideoPacket: (rtp) => {
 *     // Send RTP packet
 *     sendRtpPacket(rtp);
 *   },
 *   onAudioPacket: (rtp) => {
 *     sendRtpPacket(rtp);
 *   }
 * });
 *
 * // Start streaming
 * await stream.start();
 * ```
 *
 * @see {@link Demuxer} For input media handling
 * @see {@link HardwareContext} For GPU acceleration
 */
export class RTPStream {
  private options: Required<Omit<RTPStreamOptions, 'signal'>>;
  private inputUrl: string | null;
  private inputOptions: DemuxerOptions;
  private input?: Demuxer;
  private source?: MediaFrameSource;
  private videoOutput?: Muxer;
  private audioOutput?: Muxer;
  private hardwareContext?: HardwareContext | null;
  private videoDecoder?: Decoder;
  private videoFilter?: FilterAPI;
  private videoEncoder?: Encoder;
  private audioDecoder?: Decoder;
  private audioFilter?: FilterAPI;
  private audioEncoder?: Encoder;
  private pipeline?: PipelineControl;
  private startPromise?: Promise<void>;
  private signal?: AbortSignal;
  private supportedVideoCodecs: Set<AVCodecID | FFVideoEncoder>;
  private supportedAudioCodecs: Set<AVCodecID | FFAudioEncoder>;
  private videoKeyframeRequested = false;
  private abortHandler?: () => void;
  private stopRequested = false;
  private stopPromise?: Promise<void>;
  private startAbort?: AbortController;

  /**
   * @param input - Media input URL or pre-opened Demuxer
   *
   * @param options - Stream configuration options
   *
   * Use {@link create} factory method
   *
   * @internal
   */
  private constructor(input: string | Demuxer | MediaFrameSource, options: RTPStreamOptions) {
    if (typeof input === 'string') {
      this.inputUrl = input;
    } else if (input instanceof Demuxer) {
      this.inputUrl = null;
      this.input = input;
    } else {
      this.inputUrl = null;
      this.source = input;
    }

    const inputUrl = this.inputUrl ?? '';
    this.inputOptions = {
      ...options.inputOptions,
      options: {
        flags: 'low_delay',
        // fflags: 'nobuffer',
        analyzeduration: 0,
        probesize: 32,
        timeout: 10000000,
        rtsp_transport: inputUrl.toLowerCase().startsWith('rtsp') ? 'tcp' : undefined,
        ...options.inputOptions?.options,
      },
    };

    this.signal = options.signal;

    options.supportedVideoCodecs = options.supportedVideoCodecs?.filter(Boolean);
    options.supportedAudioCodecs = options.supportedAudioCodecs?.filter(Boolean);

    // If no supported codecs specified, empty set means ALL codecs are supported (passthrough only)
    this.supportedVideoCodecs = new Set(options.supportedVideoCodecs && options.supportedVideoCodecs.length > 0 ? options.supportedVideoCodecs : []);
    this.supportedAudioCodecs = new Set(options.supportedAudioCodecs && options.supportedAudioCodecs.length > 0 ? options.supportedAudioCodecs : []);

    this.options = {
      onVideoPacket: options.onVideoPacket ?? (() => {}),
      onAudioPacket: options.onAudioPacket ?? (() => {}),
      onClose: options.onClose ?? (() => {}),
      supportedVideoCodecs: Array.from(this.supportedVideoCodecs),
      supportedAudioCodecs: Array.from(this.supportedAudioCodecs),
      hardware: options.hardware ?? { deviceType: AV_HWDEVICE_TYPE_NONE },
      inputOptions: options.inputOptions!,
      video: {
        ssrc: options.video?.ssrc,
        payloadType: options.video?.payloadType,
        mtu: options.video?.mtu ?? MAX_PACKET_SIZE,
        fps: options.video?.fps,
        width: options.video?.width,
        height: options.video?.height,
        bitrate: options.video?.bitrate,
        encoderOptions: options.video?.encoderOptions ?? {},
      },
      audio: {
        ssrc: options.audio?.ssrc,
        payloadType: options.audio?.payloadType,
        mtu: options.audio?.mtu ?? MAX_PACKET_SIZE,
        sampleRate: options.audio?.sampleRate,
        channels: options.audio?.channels,
        encoderOptions: options.audio?.encoderOptions,
        sampleFormat: options.audio?.sampleFormat,
      },
    };
  }

  /**
   * Create an RTP stream from a media source.
   *
   * Configures the stream with input URL and options. The input is not opened
   * until start() is called, allowing the stream to be reused after stop().
   *
   * @param input - Media source URL (RTSP, file path, HTTP, etc.) or a pre-opened {@link Demuxer}
   *
   * @param options - Stream configuration options
   *
   * @returns Configured RTP stream instance
   *
   * @example
   * ```typescript
   * // Stream from RTSP camera
   * const stream = RTPStream.create('rtsp://camera.local/stream', {
   *   mtu: 1200,
   *   onVideoPacket: (rtp) => sendPacket(rtp),
   *   onAudioPacket: (rtp) => sendPacket(rtp)
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Stream file with auto hardware acceleration
   * const stream = RTPStream.create('video.mp4', {
   *   hardware: 'auto'
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Stream from a pre-opened Demuxer (e.g. Device.openScreen())
   * const demuxer = await Device.openScreen({ frameRate: 30 });
   * const stream = RTPStream.create(demuxer, {
   *   hardware: 'auto',
   *   onVideoPacket: (rtp) => sendPacket(rtp)
   * });
   * ```
   */
  static create(input: string | Demuxer | MediaFrameSource, options: RTPStreamOptions = {}): RTPStream {
    return new RTPStream(input, options);
  }

  /**
   * Check if the stream is active.
   *
   * @returns True if the stream is active, false otherwise
   */
  get isStreamActive(): boolean {
    return this.pipeline !== undefined && !this.pipeline.isStopped();
  }

  /**
   * Get the demuxer instance.
   *
   * Used for accessing the underlying demuxer.
   * Only available after start() is called.
   *
   * @returns Demuxer instance or undefined if not started
   *
   * @example
   * ```typescript
   * const stream = RTPStream.create('input.mp4', {
   *   onVideoPacket: (rtp) => sendRtp(rtp)
   * });
   * await stream.start();
   * const input = stream.getInput();
   * console.log('Bitrate:', input?.bitRate);
   * ```
   */
  getInput(): Demuxer | undefined {
    return this.input;
  }

  /**
   * Request that the next encoded video frame is a keyframe.
   *
   * Used to answer receiver feedback (e.g. a WebRTC PLI) so a receiver that
   * missed the stream start or lost packets can resync without waiting for the
   * next scheduled GOP keyframe. Currently effective for frame-source inputs
   * ({@link MediaFrameSource}); for demuxer inputs the encoder's regular GOP
   * cadence applies.
   *
   * @example
   * ```typescript
   * transceiver.sender.onPictureLossIndication.subscribe(() => {
   *   stream.requestVideoKeyframe();
   * });
   * ```
   */
  requestVideoKeyframe(): void {
    this.videoKeyframeRequested = true;
  }

  /**
   * Pass video frames through, forcing a keyframe when one was requested.
   *
   * Sets `pictType = I` on the next frame after {@link requestVideoKeyframe};
   * combined with the encoder's `forced-idr` option this produces an IDR the
   * receiver can resync on.
   *
   * @param src - The user-provided video frame source
   *
   * @yields {Frame | null} The unchanged frames (with pictType forced when requested)
   *
   * @internal
   */
  private async *wrapVideoSource(src: AsyncIterable<Frame | null>): AsyncGenerator<Frame | null> {
    for await (const frame of src) {
      if (frame && this.videoKeyframeRequested) {
        this.videoKeyframeRequested = false;
        frame.pictType = AV_PICTURE_TYPE_I;
      }
      yield frame;
    }
  }

  /**
   * Start streaming media to RTP packets.
   *
   * Begins the media processing pipeline, reading packets from input,
   * transcoding if necessary, and invoking RTP packet callbacks.
   * Automatically handles video and audio streams in parallel.
   * This method returns immediately after starting the pipeline.
   *
   * @returns Promise that resolves when pipeline is started
   *
   * @throws {Error} If no video stream found in input
   *
   * @throws {FFmpegError} If setup fails
   *
   * @example
   * ```typescript
   * const stream = RTPStream.create('rtsp://camera.local/stream', {
   *   onVideoPacket: (rtp) => sendRtp(rtp)
   * });
   *
   * // Start streaming (returns immediately)
   * await stream.start();
   *
   * // Later: stop streaming
   * await stream.stop();
   * ```
   */
  async start(): Promise<void> {
    // Idempotent: concurrent and repeated calls share a single startup (e.g.
    // an explicit start() racing WebRTCStream.setOffer()'s automatic one).
    this.startPromise ??= this.doStart().catch((error: unknown) => {
      this.startPromise = undefined;
      throw error;
    });
    await this.startPromise;
  }

  /**
   * Perform the actual startup (see {@link start}).
   *
   * @internal
   */
  private async doStart(): Promise<void> {
    // A start racing an in-flight stop() waits for the teardown to finish,
    // otherwise it would build the pipeline on top of freed resources.
    if (this.stopPromise) {
      await this.stopPromise;
    }

    if (this.pipeline) {
      return;
    }

    this.signal?.throwIfAborted();
    if (this.signal && !this.abortHandler) {
      // Stop on abort. Keep a reference so stop() can detach the listener again,
      // otherwise restarts would stack one listener per start(). Errors from the
      // async stop() are swallowed here; they already surface via onClose(error).
      this.abortHandler = () => {
        this.abortHandler = undefined;
        this.stop().catch(() => {});
      };
      this.signal.addEventListener('abort', this.abortHandler, { once: true });
    }

    // Lets stop() interrupt a startup that is blocked in the input open
    // (an RTSP connect can take seconds).
    this.startAbort = new AbortController();

    // Frame-source path: encode pre-composited frames directly (no demuxer/decoder).
    if (this.source) {
      await this.startFromFrames();
      return;
    }

    if (!this.input) {
      if (!this.inputUrl) {
        throw new Error('No input URL or Demuxer provided');
      }
      const openSignal = this.signal ? AbortSignal.any([this.signal, this.startAbort.signal]) : this.startAbort.signal;
      this.input = await Demuxer.open(this.inputUrl, { ...this.inputOptions, signal: openSignal });
    }
    this.throwIfStopRequested();

    const videoStream = this.input.video();
    const audioStream = this.input.audio();

    // Setup video transcoding if needed
    if (videoStream && !this.isVideoCodecSupported(videoStream.codecpar.codecId)) {
      // Check if we need hardware acceleration
      if (this.options.hardware === 'auto') {
        this.hardwareContext = HardwareContext.auto();
      } else if (this.options.hardware.deviceType !== AV_HWDEVICE_TYPE_NONE) {
        this.hardwareContext = HardwareContext.create(this.options.hardware.deviceType, this.options.hardware.device, this.options.hardware.options);
      }

      this.videoDecoder = await Decoder.create(videoStream, {
        exitOnError: false,
        hardware: this.hardwareContext,
      });

      // Determine if we need filters by comparing with current stream properties
      const currentWidth = videoStream.codecpar.width;
      const currentHeight = videoStream.codecpar.height;
      const currentFps = videoStream.avgFrameRate.num / videoStream.avgFrameRate.den;

      const needsScale =
        (this.options.video.width !== undefined && this.options.video.width !== currentWidth) ||
        (this.options.video.height !== undefined && this.options.video.height !== currentHeight);

      const needsFps = this.options.video.fps !== undefined && isFinite(currentFps) && this.options.video.fps !== currentFps;

      // Get first supported codec
      const targetCodecId = this.options.supportedVideoCodecs[0];
      if (!targetCodecId) {
        throw new Error('No supported video codec specified for transcoding');
      }

      let encoderCodec: Codec | null = null;
      if (typeof targetCodecId === 'string') {
        encoderCodec = Codec.findEncoderByName(targetCodecId);
      } else {
        encoderCodec = this.hardwareContext?.getEncoderCodec(targetCodecId) ?? Codec.findEncoder(targetCodecId);
      }

      if (!encoderCodec) {
        throw new Error(`No encoder found for codec ID ${targetCodecId}`);
      }

      // Create filter chain only if needed
      if (needsScale || needsFps) {
        const filterChain = FilterPreset.chain(this.hardwareContext);

        // Add scale filter if dimensions differ
        if (needsScale) {
          const targetWidth = this.options.video.width ?? -1;
          const targetHeight = this.options.video.height ?? -1;
          filterChain.scale(targetWidth, targetHeight);
        }

        // Add fps filter if fps differs
        if (needsFps) {
          filterChain.filter('fps', { fps: this.options.video.fps! });
        }

        // Software scaling leaves the graph output format unconstrained, so swscale keeps the
        // source format on both sides of the scale. Packed formats like yuyv422 can't be scaled
        // in place (yuyv422 -> yuyv422 fails with ENOSYS), and the encoder wouldn't accept them
        // anyway. Pin the output to yuv420p so the graph negotiates a real conversion: it is the
        // one format every browser/player can decode over WebRTC (unlike e.g. the 4:2:2 High
        // profile that a least-loss pick would choose for a yuyv422 source). Fall back to a
        // codec-supported format only if the encoder genuinely can't take yuv420p. Hardware chains
        // negotiate their format through the frames context instead.
        if (needsScale && !this.hardwareContext) {
          const formats = encoderCodec.pixelFormats;
          const targetFmt =
            !formats || formats.includes(AV_PIX_FMT_YUV420P) ? AV_PIX_FMT_YUV420P : pickSupportedPixelFormat(videoStream.codecpar.format as AVPixelFormat, formats);
          const targetFmtName = avGetPixFmtName(targetFmt);
          if (targetFmtName) {
            filterChain.filter('format', { pix_fmts: targetFmtName });
          }
        }

        this.videoFilter = FilterAPI.create(filterChain.build(), {
          hardware: this.hardwareContext,
        });
      }

      let encoderOptions: EncoderOptions['options'] = {};
      if (encoderCodec.name === FF_ENCODER_LIBX264 || encoderCodec.name === FF_ENCODER_LIBX265) {
        encoderOptions.preset = 'ultrafast';
        encoderOptions.tune = 'zerolatency';
      }

      encoderOptions = {
        ...encoderOptions,
        ...this.options.video.encoderOptions,
      };

      const bitrate = this.options.video.bitrate;
      this.videoEncoder = await Encoder.create(encoderCodec, {
        decoder: this.videoDecoder,
        maxBFrames: 0,
        options: encoderOptions,
        configure: (ctx) => {
          this.applyBitrate(ctx, bitrate);
        },
      });
      this.throwIfStopRequested();
    }

    // Setup video output
    this.videoOutput = await this.createVideoOutput();
    this.throwIfStopRequested();

    // Setup audio if available and needs transcoding
    if (audioStream && !this.isAudioCodecSupported(audioStream.codecpar.codecId)) {
      this.audioDecoder = await Decoder.create(audioStream, {
        exitOnError: false,
      });

      // Get first supported audio codec
      const targetCodecId = this.options.supportedAudioCodecs[0];
      if (!targetCodecId) {
        throw new Error('No supported audio codec specified for transcoding');
      }

      let encoderCodec: Codec | null = null;
      if (typeof targetCodecId === 'string') {
        encoderCodec = Codec.findEncoderByName(targetCodecId);
      } else {
        encoderCodec = Codec.findEncoder(targetCodecId);
      }

      if (!encoderCodec) {
        throw new Error(`No encoder found for codec ID ${targetCodecId}`);
      }

      // Determine target audio parameters from options
      const desiredSampleFormat = this.options.audio?.sampleFormat ?? (audioStream.codecpar.format as AVSampleFormat);
      const desiredSampleRate = this.options.audio?.sampleRate ?? (audioStream.codecpar.sampleRate > 0 ? audioStream.codecpar.sampleRate : 48000);
      const desiredChannels = this.options.audio?.channels ?? (audioStream.codecpar.channels > 0 ? audioStream.codecpar.channels : 2);

      // Select best supported parameters from codec
      const targetSampleFormat = this.selectSampleFormat(encoderCodec, desiredSampleFormat);
      const targetSampleRate = this.selectSampleRate(encoderCodec, desiredSampleRate);
      const channelLayoutStr = this.selectChannelLayout(encoderCodec, desiredChannels);

      // Create audio filter for resampling
      const filterChain = FilterPreset.chain().aformat(targetSampleFormat, targetSampleRate, channelLayoutStr).build();

      // FilterAPI now auto-calculates timeBase from first frame (FFmpeg behavior)
      this.audioFilter = FilterAPI.create(filterChain);

      let encoderOptions: EncoderOptions['options'] = {};
      if (encoderCodec.name === FF_ENCODER_LIBOPUS) {
        encoderOptions.application = 'lowdelay';
        encoderOptions.frame_duration = 20;
      }

      encoderOptions = {
        ...encoderOptions,
        ...this.options.audio.encoderOptions,
      };

      this.audioEncoder = await Encoder.create(encoderCodec, {
        decoder: this.audioDecoder,
        filter: this.audioFilter,
        options: encoderOptions,
      });
      this.throwIfStopRequested();
    }

    // Setup audio output if available
    if (audioStream) {
      this.audioOutput = await this.createAudioOutput();
      this.throwIfStopRequested();
    }

    // Start pipeline in background (don't await)
    this.attachCompletion(this.runPipeline());
  }

  /**
   * Abort an in-flight startup once stop() was requested.
   *
   * Checked after every await in the startup path: the resources created so
   * far are all assigned to instance fields, so the stop() that is waiting on
   * this startup tears them down the moment it unwinds.
   *
   * @throws {Error} If stop() was called while starting
   *
   * @internal
   */
  private throwIfStopRequested(): void {
    if (this.stopRequested) {
      throw new Error('RTPStream stopped during start');
    }
  }

  /**
   * Cap the video bitrate on the encoder context.
   *
   * Sets the target bitrate together with a VBV cap (maxrate + a 1s buffer).
   * Encoder.create() always seeds a default target bitrate (1 Mbps for video),
   * so the target MUST be lowered along with the cap.
   *
   * @param ctx - Encoder codec context
   *
   * @param bitrate - Maximum bitrate in bits per second, or undefined
   *
   * @internal
   */
  private applyBitrate(ctx: CodecContext, bitrate: number | undefined): void {
    if (!bitrate || bitrate <= 0) {
      return;
    }
    const rate = Math.round(bitrate);
    ctx.bitRate = BigInt(rate);
    ctx.rcMaxRate = BigInt(rate);
    ctx.rcBufferSize = rate;
  }

  /**
   * Wire the pipeline completion to the onClose/error callbacks.
   *
   * On success invokes `onClose()`; on error stops the stream and invokes
   * `onClose(error)`. Runs in the background (not awaited).
   *
   * @param completion - The pipeline completion promise
   *
   * @internal
   */
  private attachCompletion(completion: Promise<void>): void {
    completion
      .then(() => {
        // Pipeline completed successfully
        this.options.onClose?.();
      })
      .catch(async (error) => {
        // A stop() in flight or an aborted signal means the owner is tearing
        // the stream down - the pipeline unwinding with an AbortError (or an
        // interrupted FFmpeg call) is the expected shutdown path, not a failure.
        if (this.isDeliberateStop(error)) {
          await this.stop().catch(() => {});
          this.options.onClose?.();
          return;
        }
        console.error('[RTPStream] Pipeline error:', error);
        await this.stop();
        this.options.onClose?.(error);
      });
  }

  /**
   * Whether a pipeline rejection was caused by an intentional shutdown.
   *
   * @param error - The pipeline rejection reason
   *
   * @returns True when stop() is in flight or the owner's signal aborted
   *
   * @internal
   */
  private isDeliberateStop(error: unknown): boolean {
    return this.stopRequested || this.stopPromise !== undefined || this.signal?.aborted === true || (error instanceof Error && error.name === 'AbortError');
  }

  /**
   * Set up encoders and RTP outputs for a pre-composited frame source and start
   * encoding. No demuxer or decoder is involved - the provided frames are encoded
   * straight to RTP. Video and audio (whichever are present) run as separate
   * pipelines combined behind a single control.
   *
   * @throws {Error} If the source has neither video nor audio frames
   *
   * @internal
   */
  private async startFromFrames(): Promise<void> {
    const source = this.source!;
    if (!source.video && !source.audio) {
      throw new Error('Frame source must provide video and/or audio frames');
    }

    const controls: PipelineControl[] = [];
    const opts = this.signal ? { signal: this.signal } : undefined;

    // Video
    if (source.video) {
      if (this.options.hardware === 'auto') {
        this.hardwareContext = HardwareContext.auto();
      } else if (this.options.hardware.deviceType !== AV_HWDEVICE_TYPE_NONE) {
        this.hardwareContext = HardwareContext.create(this.options.hardware.deviceType, this.options.hardware.device, this.options.hardware.options);
      }

      const targetCodecId = this.options.supportedVideoCodecs[0] ?? FF_ENCODER_LIBX264;
      let encoderCodec: Codec | null = null;
      if (typeof targetCodecId === 'string') {
        encoderCodec = Codec.findEncoderByName(targetCodecId);
      } else {
        encoderCodec = this.hardwareContext?.getEncoderCodec(targetCodecId) ?? Codec.findEncoder(targetCodecId);
      }
      if (!encoderCodec) {
        throw new Error(`No encoder found for video codec ${String(targetCodecId)}`);
      }

      let encoderOptions: EncoderOptions['options'] = {};
      if (encoderCodec.name === FF_ENCODER_LIBX264 || encoderCodec.name === FF_ENCODER_LIBX265) {
        encoderOptions.preset = 'ultrafast';
        encoderOptions.tune = 'zerolatency';
        // Make a requested keyframe (frame.pictType = I) an actual IDR, so a
        // receiver that missed the stream start can resync (PLI handling).
        encoderOptions['forced-idr'] = true;
      }
      encoderOptions = { ...encoderOptions, ...this.options.video.encoderOptions };

      let fps = this.options.video.fps ?? 20;
      if (!isFinite(fps) || fps <= 0 || isNaN(fps)) {
        fps = 20;
      }

      // No decoder/filter: the encoder adopts width/height/pixelFormat/timeBase
      // from the first composited frame. Set the framerate explicitly, otherwise
      // the encoder infers it from the frame timebase (often a fine-grained tick
      // like 1/12800), which makes x264 pick an absurd level (huge MB rate) that
      // browsers can't decode over WebRTC. Bound the GOP to ~2s: live receivers
      // that join (or lose) mid-stream must get a keyframe quickly - the x264
      // default of 250 frames leaves them waiting for many seconds.
      const bitrate = this.options.video.bitrate;
      this.videoEncoder = await Encoder.create(encoderCodec, {
        maxBFrames: 0,
        options: encoderOptions,
        configure: (ctx) => {
          ctx.framerate = new Rational(Math.round(fps), 1);
          ctx.gopSize = Math.max(1, Math.round(fps * 2));
          this.applyBitrate(ctx, bitrate);
        },
      });

      this.videoOutput = await this.createVideoOutput();
      this.throwIfStopRequested();
      controls.push(pipeline(this.wrapVideoSource(source.video), this.videoEncoder, this.videoOutput, opts));
    }

    // Audio
    if (source.audio) {
      const targetCodecId = this.options.supportedAudioCodecs[0] ?? FF_ENCODER_LIBOPUS;
      let encoderCodec: Codec | null = null;
      if (typeof targetCodecId === 'string') {
        encoderCodec = Codec.findEncoderByName(targetCodecId);
      } else {
        encoderCodec = Codec.findEncoder(targetCodecId);
      }
      if (!encoderCodec) {
        throw new Error(`No encoder found for audio codec ${String(targetCodecId)}`);
      }

      // There is no input stream to derive formats from - resample to the desired
      // (or codec-preferred) sample format/rate/layout via an aformat filter.
      const desiredSampleFormat = this.options.audio?.sampleFormat ?? AV_SAMPLE_FMT_FLTP;
      const desiredSampleRate = this.options.audio?.sampleRate ?? 48000;
      const desiredChannels = this.options.audio?.channels ?? 2;
      const targetSampleFormat = this.selectSampleFormat(encoderCodec, desiredSampleFormat);
      const targetSampleRate = this.selectSampleRate(encoderCodec, desiredSampleRate);
      const channelLayoutStr = this.selectChannelLayout(encoderCodec, desiredChannels);

      this.audioFilter = FilterAPI.create(FilterPreset.chain().aformat(targetSampleFormat, targetSampleRate, channelLayoutStr).build());

      let encoderOptions: EncoderOptions['options'] = {};
      if (encoderCodec.name === FF_ENCODER_LIBOPUS) {
        encoderOptions.application = 'lowdelay';
        encoderOptions.frame_duration = 20;
      }
      encoderOptions = { ...encoderOptions, ...this.options.audio.encoderOptions };

      this.audioEncoder = await Encoder.create(encoderCodec, {
        filter: this.audioFilter,
        options: encoderOptions,
      });

      this.audioOutput = await this.createAudioOutput();
      this.throwIfStopRequested();
      controls.push(pipeline(source.audio, this.audioFilter, this.audioEncoder, this.audioOutput, opts));
    }

    this.pipeline = new CombinedPipelineControl(controls);
    this.attachCompletion(this.pipeline.completion);
  }

  /**
   * Create the RTP video output muxer.
   *
   * Rewrites RTP sequence numbers (continuous) and rebases the PTS-derived
   * timestamps (90 kHz) onto a random initial value in the write callback, then
   * forwards each packet to `onVideoPacket`. Uses `this.input` when present
   * (demuxer path) and no input for the frame-source path.
   *
   * @returns The configured video muxer
   *
   * @internal
   */
  private async createVideoOutput(): Promise<Muxer> {
    let videoSequenceNumber = Math.floor(Math.random() * 0xffff);
    const videoTimestampBase = Math.floor(Math.random() * 0xffffffff) >>> 0; // unsigned 32-bit
    let videoTimestampOffset: number | undefined;

    const videoMuxerOptions: Record<string, string | number> = {};
    if (this.options.video.ssrc !== undefined) {
      videoMuxerOptions.ssrc = this.options.video.ssrc;
    }
    if (this.options.video.payloadType !== undefined) {
      videoMuxerOptions.payload_type = this.options.video.payloadType;
    }

    return await Muxer.open(
      {
        write: (buffer: Buffer) => {
          if (isRtcp(buffer)) {
            // Ignore RTCP packets
            return buffer.length;
          }

          const rtpPacket = RtpPacket.deSerialize(buffer);

          // Fix sequence number - ensure continuous sequence
          rtpPacket.header.sequenceNumber = videoSequenceNumber;
          videoSequenceNumber = (videoSequenceNumber + 1) & 0xffff; // Wrap at 16-bit

          // Rebase the timestamp onto our own random initial value. FFmpeg's RTP
          // muxer derives it from the packet PTS in the 90 kHz clock (plus its own
          // random base), so the deltas carry the real presentation times -
          // including B-frame reordering and VFR cadence. Only the base is swapped;
          // modular uint32 arithmetic keeps wrap-around intact, and packets of the
          // same frame keep sharing a timestamp.
          videoTimestampOffset ??= (videoTimestampBase - rtpPacket.header.timestamp) >>> 0;
          rtpPacket.header.timestamp = (rtpPacket.header.timestamp + videoTimestampOffset) >>> 0;

          this.options.onVideoPacket(rtpPacket);
          return buffer.length;
        },
      },
      {
        input: this.input,
        copyInitialNonkeyframes: true,
        format: 'rtp',
        maxPacketSize: this.options.video.mtu,
        options: videoMuxerOptions,
      },
    );
  }

  /**
   * Create the RTP audio output muxer.
   *
   * Rewrites RTP sequence numbers (continuous) in the write callback and forwards
   * each packet to `onAudioPacket`. Uses `this.input` when present (demuxer path)
   * and no input for the frame-source path.
   *
   * @returns The configured audio muxer
   *
   * @internal
   */
  private async createAudioOutput(): Promise<Muxer> {
    let audioSequenceNumber = Math.floor(Math.random() * 0xffff);

    const audioMuxerOptions: Record<string, string | number> = {};
    if (this.options.audio.ssrc !== undefined) {
      audioMuxerOptions.ssrc = this.options.audio.ssrc;
    }
    if (this.options.audio.payloadType !== undefined) {
      audioMuxerOptions.payload_type = this.options.audio.payloadType;
    }

    return await Muxer.open(
      {
        write: (buffer: Buffer) => {
          if (isRtcp(buffer)) {
            // Ignore RTCP packets
            return buffer.length;
          }

          const rtpPacket = RtpPacket.deSerialize(buffer);

          // Fix sequence number - ensure continuous sequence
          rtpPacket.header.sequenceNumber = audioSequenceNumber;
          audioSequenceNumber = (audioSequenceNumber + 1) & 0xffff; // Wrap at 16-bit

          this.options.onAudioPacket(rtpPacket);
          return buffer.length;
        },
      },
      {
        input: this.input,
        copyInitialNonkeyframes: true,
        format: 'rtp',
        maxPacketSize: this.options.audio.mtu,
        options: audioMuxerOptions,
      },
    );
  }

  /**
   * Run the streaming pipeline until completion or stopped.
   *
   * @internal
   */
  private async runPipeline(): Promise<void> {
    if (!this.input) {
      return;
    }

    const hasVideo = this.input.video() !== undefined && this.videoOutput !== undefined;
    const hasAudio = this.input.audio() !== undefined && this.audioOutput !== undefined;
    const opts = this.signal ? { signal: this.signal } : undefined;

    if (hasAudio && hasVideo) {
      this.pipeline = pipeline(
        this.input,
        {
          video: [this.videoDecoder, this.videoFilter, this.videoEncoder],
          audio: [this.audioDecoder, this.audioFilter, this.audioEncoder],
        },
        {
          video: this.videoOutput!,
          audio: this.audioOutput!,
        },
        opts,
      );
    } else if (hasVideo) {
      this.pipeline = pipeline(
        this.input,
        {
          video: [this.videoDecoder, this.videoFilter, this.videoEncoder],
        },
        this.videoOutput!,
        opts,
      );
    } else if (hasAudio) {
      this.pipeline = pipeline(
        this.input,
        {
          audio: [this.audioDecoder, this.audioFilter, this.audioEncoder],
        },
        this.audioOutput!,
        opts,
      );
    } else {
      throw new Error('No audio or video streams found in input');
    }

    await this.pipeline.completion;
    this.pipeline = undefined;
  }

  /**
   * Stop streaming gracefully and clean up all resources.
   *
   * Stops the pipeline, closes output, and releases all FFmpeg resources.
   * Safe to call multiple times. After stopping, you can call start() again
   * to restart the stream.
   *
   * @example
   * ```typescript
   * const stream = RTPStream.create('input.mp4', {
   *   onVideoPacket: (rtp) => sendRtp(rtp)
   * });
   * await stream.start();
   *
   * // Stop after 10 seconds
   * setTimeout(async () => await stream.stop(), 10000);
   * ```
   */
  async stop(): Promise<void> {
    // Memoized: concurrent stop() calls share one teardown instead of
    // double-closing native resources.
    this.stopPromise ??= this.doStop().finally(() => {
      this.stopPromise = undefined;
    });
    await this.stopPromise;
  }

  /**
   * Perform the actual teardown (see {@link stop}).
   *
   * @internal
   */
  private async doStop(): Promise<void> {
    // An in-flight start() must unwind before teardown - otherwise it would
    // keep building the pipeline on top of freed resources and leave an
    // orphaned transcode running forever. The flag makes doStart() bail at its
    // next checkpoint, the abort unblocks a startup stuck in the input open.
    this.stopRequested = true;
    this.startAbort?.abort();
    this.startAbort = undefined;

    const inflightStart = this.startPromise;
    // Allow a fresh start() after stopping.
    this.startPromise = undefined;
    if (inflightStart) {
      try {
        await inflightStart;
      } catch {
        // Aborted or failed startup - resources are torn down below either way.
      }
    }

    try {
      // Detach the abort listener so it cannot fire for a torn-down session and
      // does not accumulate across start()/stop() cycles.
      if (this.abortHandler) {
        this.signal?.removeEventListener('abort', this.abortHandler);
        this.abortHandler = undefined;
      }

      // Stop pipeline if running and wait for completion. pipeline.stop() interrupts
      // the source demuxer's read (frame-source pipelines unwind via iterator.return
      // instead). Swallow a rejected completion here - the error is already surfaced
      // to the caller via the onClose(error) path; we just need cleanup to proceed.
      const pipeline = this.pipeline;
      if (pipeline) {
        if (!pipeline.isStopped()) {
          pipeline.stop();
        }
        try {
          await pipeline.completion;
        } catch {
          // Pipeline errored - proceed with teardown regardless.
        }
        if (this.pipeline === pipeline) {
          this.pipeline = undefined;
        }
      }

      // Close all resources
      await this.videoOutput?.close();
      this.videoOutput = undefined;
      await this.audioOutput?.close();
      this.audioOutput = undefined;

      this.videoEncoder?.close();
      this.videoEncoder = undefined;
      this.videoFilter?.close();
      this.videoFilter = undefined;
      this.videoDecoder?.close();
      this.videoDecoder = undefined;

      this.audioEncoder?.close();
      this.audioEncoder = undefined;
      this.audioFilter?.close();
      this.audioFilter = undefined;
      this.audioDecoder?.close();
      this.audioDecoder = undefined;

      this.hardwareContext?.dispose();
      this.hardwareContext = undefined;

      await this.input?.close();
      this.input = undefined;
    } finally {
      this.stopRequested = false;
    }
  }

  /**
   * Check if the given audio codec is supported.
   *
   * @param codecId - The AVCodecID to check
   *
   * @returns True if the codec is supported, false otherwise
   *
   * @internal
   */
  private isAudioCodecSupported(codecId: AVCodecID): boolean {
    // Empty set means all codecs are supported (passthrough only)
    if (this.supportedAudioCodecs.size === 0) {
      return true;
    }

    const isSupported = this.supportedAudioCodecs.has(codecId);

    if (!isSupported) {
      try {
        const ffEncoderCodecs = Array.from(this.supportedAudioCodecs).filter((c) => typeof c === 'string');
        for (const encoderName of ffEncoderCodecs) {
          const encoderCodec = Codec.findEncoderByName(encoderName);
          if (encoderCodec?.id === codecId) {
            return true;
          }
        }
      } catch {
        // Ignore errors
      }
    }

    return isSupported;
  }

  /**
   * Check if the given video codec is supported.
   *
   * @param codecId - The AVCodecID to check
   *
   * @returns True if the codec is supported, false otherwise
   *
   * @internal
   */
  private isVideoCodecSupported(codecId: AVCodecID): boolean {
    // Empty set means all codecs are supported (passthrough only)
    if (this.supportedVideoCodecs.size === 0) {
      return true;
    }

    const isSupported = this.supportedVideoCodecs.has(codecId);

    if (!isSupported) {
      try {
        const ffEncoderCodecs = Array.from(this.supportedVideoCodecs).filter((c) => typeof c === 'string');
        for (const encoderName of ffEncoderCodecs) {
          const encoderCodec = Codec.findEncoderByName(encoderName);
          if (encoderCodec?.id === codecId) {
            return true;
          }
        }
      } catch {
        // Ignore errors
      }
    }

    return isSupported;
  }

  /**
   * Select a codec-supported sample format for the desired one.
   *
   * Delegates to the shared {@link pickSupportedSampleFormat} so the RTP path and
   * the encoder negotiate formats identically.
   *
   * @param codec - Audio encoder codec
   *
   * @param desiredFormat - Desired sample format
   *
   * @returns A sample format the codec accepts
   *
   * @internal
   */
  private selectSampleFormat(codec: Codec, desiredFormat: AVSampleFormat): AVSampleFormat {
    return pickSupportedSampleFormat(desiredFormat, codec.sampleFormats);
  }

  /**
   * Select a codec-supported sample rate for the desired one.
   *
   * Delegates to the shared {@link pickSupportedRate} (keeps the desired rate when
   * accepted, otherwise the nearest supported one).
   *
   * @param codec - Audio encoder codec
   *
   * @param desiredRate - Desired sample rate
   *
   * @returns A sample rate the codec accepts
   *
   * @internal
   */
  private selectSampleRate(codec: Codec, desiredRate: number): number {
    return pickSupportedRate(desiredRate, codec.supportedSamplerates);
  }

  /**
   * Select a codec-supported channel layout for the desired channel count, as an
   * SDP layout string.
   *
   * Delegates the choice to the shared {@link pickSupportedLayout} (nearest channel
   * count when the exact count is unsupported), then renders it as `'mono'`,
   * `'stereo'`, or the layout mask.
   *
   * @param codec - Audio encoder codec
   *
   * @param desiredChannels - Desired number of channels
   *
   * @returns Channel layout string the codec accepts
   *
   * @internal
   */
  private selectChannelLayout(codec: Codec, desiredChannels: number): string {
    const supportedLayouts = codec.channelLayouts;
    if (!supportedLayouts || supportedLayouts.length === 0) {
      return desiredChannels === 1 ? 'mono' : 'stereo'; // should normally not happen
    }

    const picked = pickSupportedLayout(avChannelLayoutDefault(desiredChannels), supportedLayouts);
    if (picked.nbChannels === 1) return 'mono';
    if (picked.nbChannels === 2) return 'stereo';
    return picked.mask.toString();
  }
}
