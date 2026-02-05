import { isRtcp, RtpPacket } from 'werift';

import { AV_HWDEVICE_TYPE_NONE } from '../constants/constants.js';
import { FF_ENCODER_LIBOPUS, FF_ENCODER_LIBX264, FF_ENCODER_LIBX265 } from '../constants/encoders.js';
import { Codec } from '../lib/codec.js';
import { MAX_PACKET_SIZE } from './constants.js';
import { Decoder } from './decoder.js';
import { Demuxer } from './demuxer.js';
import { Encoder } from './encoder.js';
import { FilterPreset } from './filter-presets.js';
import { FilterAPI } from './filter.js';
import { HardwareContext } from './hardware.js';
import { Muxer } from './muxer.js';
import { pipeline } from './pipeline.js';

import type { AVCodecID, AVHWDeviceType, AVSampleFormat, FFAudioEncoder, FFHWDeviceType, FFVideoEncoder } from '../constants/index.js';
import type { DemuxerOptions } from './demuxer.js';
import type { EncoderOptions } from './encoder.js';
import type { PipelineControl } from './pipeline.js';

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
  private signal?: AbortSignal;
  private supportedVideoCodecs: Set<AVCodecID | FFVideoEncoder>;
  private supportedAudioCodecs: Set<AVCodecID | FFAudioEncoder>;

  /**
   * @param input - Media input URL or pre-opened Demuxer
   *
   * @param options - Stream configuration options
   *
   * Use {@link create} factory method
   *
   * @internal
   */
  private constructor(input: string | Demuxer, options: RTPStreamOptions) {
    if (typeof input === 'string') {
      this.inputUrl = input;
    } else {
      this.inputUrl = null;
      this.input = input;
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
        fps: options.video?.fps ?? 20,
        width: options.video?.width,
        height: options.video?.height,
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
  static create(input: string | Demuxer, options: RTPStreamOptions = {}): RTPStream {
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
    if (this.pipeline) {
      return;
    }

    this.signal?.throwIfAborted();
    this.signal?.addEventListener('abort', () => this.stop(), { once: true });

    if (!this.input) {
      if (!this.inputUrl) {
        throw new Error('No input URL or Demuxer provided');
      }
      this.input = await Demuxer.open(this.inputUrl, this.inputOptions);
    }

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
          filterChain.fps(this.options.video.fps!);
        }

        this.videoFilter = FilterAPI.create(filterChain.build(), {
          hardware: this.hardwareContext,
        });
      }

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

      let encoderOptions: EncoderOptions['options'] = {};
      if (encoderCodec.name === FF_ENCODER_LIBX264 || encoderCodec.name === FF_ENCODER_LIBX265) {
        encoderOptions.preset = 'ultrafast';
        encoderOptions.tune = 'zerolatency';
      }

      encoderOptions = {
        ...encoderOptions,
        ...this.options.video.encoderOptions,
      };

      this.videoEncoder = await Encoder.create(encoderCodec, {
        decoder: this.videoDecoder,
        maxBFrames: 0,
        options: encoderOptions,
      });
    }

    // Initialize RTP sequence numbers and timestamps
    let videoSequenceNumber = Math.floor(Math.random() * 0xffff);
    let videoTimestamp = Math.floor(Math.random() * 0xffffffff) >>> 0; // unsigned 32-bit
    let audioSequenceNumber = Math.floor(Math.random() * 0xffff);

    // Calculate video timestamp increment
    const videoStreamFps = videoStream ? videoStream.avgFrameRate.num / videoStream.avgFrameRate.den : 20;
    let fps = this.options.video.fps ?? videoStreamFps;
    if (!isFinite(fps) || fps <= 0 || isNaN(fps)) {
      fps = 20; // Default to 20 FPS if invalid
    }

    const videoTimestampIncrement = 90000 / fps;

    // Setup video output
    this.videoOutput = await Muxer.open(
      {
        write: (buffer: Buffer) => {
          if (isRtcp(buffer)) {
            // Ignore RTCP packets
            return buffer.length;
          }

          const rtpPacket = RtpPacket.deSerialize(buffer);

          // Set SSRC (synchronization source identifier)
          if (this.options.video.ssrc !== undefined) {
            rtpPacket.header.ssrc = this.options.video.ssrc;
          }

          // Set payload type
          if (this.options.video.payloadType !== undefined) {
            rtpPacket.header.payloadType = this.options.video.payloadType;
          }

          // Fix sequence number - ensure continuous sequence
          rtpPacket.header.sequenceNumber = videoSequenceNumber;
          videoSequenceNumber = (videoSequenceNumber + 1) & 0xffff; // Wrap at 16-bit

          // Fix timestamp - calculate based on FPS
          // All packets in same frame have same timestamp (marker=false)
          // Only increment timestamp when frame ends (marker=true)
          rtpPacket.header.timestamp = videoTimestamp;

          // Increment timestamp for next frame when current frame ends
          if (rtpPacket.header.marker) {
            videoTimestamp = (videoTimestamp + videoTimestampIncrement) >>> 0; // Unsigned 32-bit wrap
          }

          this.options.onVideoPacket(rtpPacket);
          return buffer.length;
        },
      },
      {
        input: this.input,
        copyInitialNonkeyframes: true,
        format: 'rtp',
        maxPacketSize: this.options.video.mtu,
      },
    );

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
    }

    // Setup audio output if available
    if (audioStream) {
      this.audioOutput = await Muxer.open(
        {
          write: (buffer: Buffer) => {
            if (isRtcp(buffer)) {
              // Ignore RTCP packets
              return buffer.length;
            }

            const rtpPacket = RtpPacket.deSerialize(buffer);

            // Set SSRC (synchronization source identifier)
            if (this.options.audio.ssrc !== undefined) {
              rtpPacket.header.ssrc = this.options.audio.ssrc;
            }

            // Set payload type
            if (this.options.audio.payloadType !== undefined) {
              rtpPacket.header.payloadType = this.options.audio.payloadType;
            }

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
        },
      );
    }

    // Start pipeline in background (don't await)
    this.runPipeline()
      .then(() => {
        // Pipeline completed successfully
        this.options.onClose?.();
      })
      .catch(async (error) => {
        console.error('[RTPStream] Pipeline error:', error);
        await this.stop();
        this.options.onClose?.(error);
      });
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
    // Stop pipeline if running and wait for completion
    if (this.pipeline && !this.pipeline.isStopped()) {
      this.pipeline.stop();
      await this.pipeline.completion;
      this.pipeline = undefined;
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
   * Select the best supported sample format from codec.
   *
   * Returns the first supported format, or null if none available.
   * This follows FFmpeg's approach of using the first supported format.
   *
   * @param codec - Audio encoder codec
   *
   * @param desiredFormat - Desired sample format
   *
   * @returns First supported sample format or null
   *
   * @internal
   */
  private selectSampleFormat(codec: Codec, desiredFormat: AVSampleFormat): AVSampleFormat {
    const supportedFormats = codec.sampleFormats;
    if (!supportedFormats || supportedFormats.length === 0) {
      return desiredFormat; // should normally not happen
    }

    if (supportedFormats.includes(desiredFormat)) {
      return desiredFormat;
    }

    return supportedFormats[0];
  }

  /**
   * Select the best supported sample rate from codec.
   *
   * Returns the closest supported rate to the desired rate.
   * If no rates are specified by the codec, returns the desired rate.
   *
   * @param codec - Audio encoder codec
   *
   * @param desiredRate - Desired sample rate
   *
   * @returns Best matching sample rate
   *
   * @internal
   */
  private selectSampleRate(codec: Codec, desiredRate: number): number {
    const supportedRates = codec.supportedSamplerates;
    if (!supportedRates || supportedRates.length === 0) {
      return desiredRate; // should normally not happen
    }

    let bestSampleRate = supportedRates[0];
    for (const rate of supportedRates) {
      if (Math.abs(desiredRate - rate) < Math.abs(desiredRate - bestSampleRate)) {
        bestSampleRate = rate;
      }
    }

    return bestSampleRate;
  }

  /**
   * Select the best supported channel layout from codec.
   *
   * Returns a layout matching the desired channel count, or the first supported layout.
   *
   * @param codec - Audio encoder codec
   *
   * @param desiredChannels - Desired number of channels
   *
   * @returns Best matching channel layout string
   *
   * @internal
   */
  private selectChannelLayout(codec: Codec, desiredChannels: number): string {
    const supportedLayouts = codec.channelLayouts;
    if (!supportedLayouts || supportedLayouts.length === 0) {
      return desiredChannels === 1 ? 'mono' : 'stereo'; // should normally not happen
    }

    // Try to find exact match
    for (const layout of supportedLayouts) {
      if (layout.nbChannels === desiredChannels) {
        // Use standard names for common layouts
        if (desiredChannels === 1) return 'mono';
        if (desiredChannels === 2) return 'stereo';
        // For other channel counts, use the mask
        return layout.mask.toString();
      }
    }

    // No exact match, return first supported
    const firstLayout = supportedLayouts[0];
    if (firstLayout.nbChannels === 1) return 'mono';
    if (firstLayout.nbChannels === 2) return 'stereo';

    return firstLayout.mask.toString();
  }
}
