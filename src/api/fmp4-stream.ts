import {
  AV_CODEC_ID_AAC,
  AV_CODEC_ID_AV1,
  AV_CODEC_ID_FLAC,
  AV_CODEC_ID_H264,
  AV_CODEC_ID_HEVC,
  AV_CODEC_ID_OPUS,
  AV_HWDEVICE_TYPE_NONE,
  AV_SAMPLE_FMT_FLTP,
} from '../constants/constants.js';
import { FF_ENCODER_AAC, FF_ENCODER_LIBX264 } from '../constants/encoders.js';
import { Codec } from '../lib/codec.js';
import { avGetCodecString } from '../lib/utilities.js';
import { Decoder } from './decoder.js';
import { Demuxer } from './demuxer.js';
import { Encoder } from './encoder.js';
import { FilterPreset } from './filter-presets.js';
import { FilterAPI } from './filter.js';
import { HardwareContext } from './hardware.js';
import { Muxer } from './muxer.js';
import { pipeline } from './pipeline.js';

import type { AVCodecID, AVHWDeviceType, FFHWDeviceType } from '../constants/index.js';
import type { DemuxerOptions } from './demuxer.js';
import type { EncoderOptions } from './encoder.js';
import type { IOOutputCallbacks } from './io-stream.js';
import type { PipelineControl } from './pipeline.js';

export type MP4BoxType =
  // Top-level structure
  | 'ftyp'
  | 'styp' // File/Segment Type
  | 'moov'
  | 'moof' // Movie/Fragment containers
  | 'mdat' // Media Data
  | 'free'
  | 'skip' // Free space

  // DASH-specific
  | 'sidx' // Segment Index
  | 'emsg' // Event Message

  // Movie box children
  | 'mvhd' // Movie Header
  | 'trak' // Track
  | 'mvex' // Movie Extends
  | 'trex' // Track Extends
  | 'mehd' // Movie Extends Header

  // Fragment box children
  | 'mfhd' // Movie Fragment Header
  | 'traf' // Track Fragment
  | 'tfhd' // Track Fragment Header
  | 'tfdt' // Track Fragment Decode Time
  | 'trun' // Track Fragment Run
  | 'sdtp' // Sample Dependency Type

  // Track box children (rarely needed in fMP4 with empty_moov)
  | 'tkhd' // Track Header
  | 'mdia' // Media
  | 'minf' // Media Information
  | 'stbl' // Sample Table

  // Metadata
  | 'meta' // Metadata
  | 'udta' // User Data

  // Catch-all for unknown/custom boxes
  | (string & {});

/**
 * MP4 box information.
 */
export interface MP4Box {
  /** Four-character code identifying the box type (e.g., 'ftyp', 'moov', 'moof') */
  type: MP4BoxType;

  /** Total size of the box in bytes (including 8-byte header) */
  size: number;

  /** Box payload data (excluding the 8-byte header) */
  data: Buffer;

  /** Offset of this box in the original buffer */
  offset: number;
}

/**
 * A fragment of fMP4 data yielded by {@link FMP4Stream.fragments}.
 */
export interface FMP4Fragment {
  /** fMP4 data buffer */
  data: Buffer;
  /** Box information (complete boxes, parsed box details) */
  info: FMP4Data;
}

/**
 * fMP4 data information provided in onData callback.
 */
export interface FMP4Data {
  /**
   * True if data contains complete MP4 boxes, false if raw chunks.
   * When boxMode is enabled, this is always true.
   */
  isComplete: boolean;

  /**
   * Parsed MP4 boxes (only available when isComplete is true).
   * Array is empty when isComplete is false.
   */
  boxes: MP4Box[];
}

/**
 * Options for configuring fMP4 streaming.
 */
export interface FMP4StreamOptions {
  /**
   * Callback invoked for fMP4 data (chunks or complete boxes).
   *
   * @param data - fMP4 data information with buffer and box details
   */
  onData?: (data: Buffer, info: FMP4Data) => void;

  /**
   * Callback invoked when the stream is closed or encounters an error.
   *
   * @param error - Optional error if stream closed due to an error
   */
  onClose?: (error?: Error) => void;

  /**
   * Supported codec strings from client.
   * Comma-separated list (e.g., "avc1.640029,hvc1.1.6.L153.B0,mp4a.40.2,flac,opus").
   *
   * @example "avc1.640029,mp4a.40.2"
   */
  supportedCodecs?: string;

  /**
   * Fragment duration in microseconds.
   * Smaller values reduce latency but increase overhead.
   * Set to 1 to send data as soon as possible.
   *
   * @default 1
   */
  fragDuration?: number;

  /**
   * Hardware acceleration configuration for video transcoding.
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
    fps?: number;
    width?: number;
    height?: number;
    encoderOptions?: EncoderOptions['options'];
  };

  /**
   * Audio stream configuration.
   */
  audio?: {
    encoderOptions?: EncoderOptions['options'];
  };

  /**
   * Buffer size for I/O operations in bytes (output).
   *
   * @default 2 MB
   */
  bufferSize?: number;

  /**
   * Enable box mode - buffers data until complete MP4 boxes are available.
   * When true, onData receives complete boxes with parsed box information.
   * When false, onData receives raw chunks as they arrive from FFmpeg.
   *
   * @default false
   */
  boxMode?: boolean;

  /**
   * MOV flags for fragmented MP4 output.
   *
   * @default '+frag_keyframe+separate_moof+default_base_moof+empty_moov'
   */
  movFlags?: string;

  /**
   * AbortSignal for cancellation.
   *
   * When aborted, the stream stops gracefully, equivalent to calling stop().
   * If already aborted when start() is called, throws AbortError.
   */
  signal?: AbortSignal;
}

/**
 * Target codec strings for fMP4 streaming.
 */
export const FMP4_CODECS = {
  H264: 'avc1.640029',
  H265: 'hvc1.1.6.L153.B0',
  AV1: 'av01.0.00M.08',
  AAC: 'mp4a.40.2',
  FLAC: 'flac',
  OPUS: 'opus',
} as const;

/**
 * High-level fMP4 streaming with automatic codec detection and transcoding.
 *
 * Provides fragmented MP4 streaming for clients.
 * Automatically transcodes video to H.264 and audio to AAC if not supported by client.
 * Client sends supported codecs, server transcodes accordingly.
 * Essential component for building adaptive streaming servers.
 *
 * @example
 * ```typescript
 * import { FMP4Stream } from 'node-av/api';
 *
 * // Client sends supported codecs
 * const supportedCodecs = 'avc1.640029,hvc1.1.6.L153.B0,mp4a.40.2,flac';
 *
 * // Create stream with codec negotiation
 * const stream = FMP4Stream.create('rtsp://camera.local/stream', {
 *   supportedCodecs,
 *   onData: (data) => ws.send(data.data)
 * });
 *
 * // Start streaming (auto-transcodes if needed)
 * await stream.start();
 *
 * // Stop when done
 * await stream.stop();
 * ```
 *
 * @example
 * ```typescript
 * // Stream with hardware acceleration
 * const stream = FMP4Stream.create('input.mp4', {
 *   supportedCodecs: 'avc1.640029,mp4a.40.2',
 *   hardware: 'auto',
 *   fragDuration: 1,
 *   onData: (data) => sendToClient(data.data)
 * });
 *
 * await stream.start();
 * await stream.stop();
 * ```
 */
export class FMP4Stream {
  private options: Required<Omit<FMP4StreamOptions, 'signal'>>;
  private inputUrl: string | null;
  private inputOptions: DemuxerOptions;
  private input?: Demuxer;
  private output?: Muxer;
  private hardwareContext?: HardwareContext | null;
  private videoDecoder?: Decoder;
  private videoFilter?: FilterAPI;
  private videoEncoder?: Encoder;
  private audioDecoder?: Decoder;
  private audioFilter?: FilterAPI;
  private audioEncoder?: Encoder;
  private pipeline?: PipelineControl;
  private signal?: AbortSignal;
  private supportedCodecs: Set<string>;
  private incompleteBoxBuffer: Buffer | null = null;
  private fragmentQueue: {
    queue: FMP4Fragment[];
    resolve: ((value: IteratorResult<FMP4Fragment>) => void) | null;
    done: boolean;
  } | null = null;

  private _initSegment: Buffer | null = null;
  private _initSegmentResolve: ((value: Buffer) => void) | null = null;
  private _initSegmentPromise: Promise<Buffer> | null = null;
  private _ftypData: Buffer | null = null;
  private _moovData: Buffer | null = null;

  /**
   * @param input - Media input URL or pre-opened Demuxer
   *
   * @param options - Stream configuration options
   *
   * Use {@link create} factory method
   *
   * @internal
   */
  private constructor(input: string | Demuxer, options: FMP4StreamOptions) {
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
        fflags: 'nobuffer',
        // analyzeduration: 0,
        // probesize: 32,
        timeout: 10000000,
        rtsp_transport: inputUrl.toLowerCase().startsWith('rtsp') ? 'tcp' : undefined,
        ...options.inputOptions?.options,
      },
    };

    this.options = {
      onData: options.onData ?? (() => {}),
      onClose: options.onClose ?? (() => {}),
      supportedCodecs: options.supportedCodecs ?? '',
      fragDuration: options.fragDuration ?? 1,
      hardware: options.hardware ?? { deviceType: AV_HWDEVICE_TYPE_NONE },
      inputOptions: options.inputOptions!,
      video: {
        fps: options.video?.fps,
        width: options.video?.width,
        height: options.video?.height,
        encoderOptions: options.video?.encoderOptions ?? {},
      },
      audio: {
        encoderOptions: options.audio?.encoderOptions ?? {},
      },
      bufferSize: options.bufferSize ?? 2 * 1024 * 1024,
      boxMode: options.boxMode ?? false,
      movFlags: options.movFlags ?? '+frag_keyframe+separate_moof+default_base_moof+empty_moov',
    };

    this.signal = options.signal;

    // Parse supported codecs
    this.supportedCodecs = new Set(
      this.options.supportedCodecs
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    );
  }

  /**
   * Create a fMP4 stream from a media source.
   *
   * Configures the stream with input URL and options. The input is not opened
   * until start() is called, allowing the stream to be reused after stop().
   *
   * @param input - Media source URL (RTSP, file path, HTTP, etc.) or a pre-opened {@link Demuxer}
   *
   * @param options - Stream configuration options with supported codecs
   *
   * @returns Configured fMP4 stream instance
   *
   * @example
   * ```typescript
   * // Stream from file with codec negotiation
   * const stream = FMP4Stream.create('video.mp4', {
   *   supportedCodecs: 'avc1.640029,mp4a.40.2',
   *   onData: (data) => ws.send(data.data)
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Stream from RTSP with auto hardware acceleration
   * const stream = FMP4Stream.create('rtsp://camera.local/stream', {
   *   supportedCodecs: 'avc1.640029,hvc1.1.6.L153.B0,mp4a.40.2',
   *   hardware: 'auto',
   *   fragDuration: 0.5
   * });
   * ```
   */
  static create(input: string | Demuxer, options: FMP4StreamOptions = {}): FMP4Stream {
    return new FMP4Stream(input, options);
  }

  /**
   * Promise that resolves with the init segment (ftyp+moov).
   *
   * Only available when boxMode is enabled.
   * Resolves once the first ftyp and moov boxes have been received.
   *
   * @throws {Error} If boxMode is not enabled
   */
  get initSegment(): Promise<Buffer> {
    if (!this.options.boxMode) {
      throw new Error('initSegment is only available in box mode');
    }
    this._initSegmentPromise ??= new Promise<Buffer>((resolve) => {
      if (this._initSegment) {
        resolve(this._initSegment);
      } else {
        this._initSegmentResolve = resolve;
      }
    });
    return this._initSegmentPromise;
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
   * const stream = FMP4Stream.create('input.mp4', {
   * const input = stream.getInput();
   * console.log('Bitrate:', input?.bitRate);
   * ```
   */
  getInput(): Demuxer | undefined {
    return this.input;
  }

  /**
   * Get the codec string that will be used by client.
   *
   * Returns the MIME type codec string based on input codecs and transcoding decisions.
   * Call this after start() is called to know what codec string to use for addSourceBuffer().
   *
   * @returns MIME type codec string (e.g., "avc1.640029,mp4a.40.2")
   *
   * @throws {Error} If called before start() is called
   *
   * @example
   * ```typescript
   * const stream = await FMP4Stream.create('input.mp4', {
   *   supportedCodecs: 'avc1.640029,mp4a.40.2'
   * });
   *
   * await stream.start(); // Must start first
   * const codecString = stream.getCodecString();
   * console.log(codecString); // "avc1.640029,mp4a.40.2"
   * // Use this for: sourceBuffer = mediaSource.addSourceBuffer(`video/mp4; codecs="${codecString}"`);
   * ```
   */
  getCodecString(): string {
    if (!this.input) {
      throw new Error('Input not opened. Call start() first to open the input.');
    }

    const videoStream = this.input.video();
    const audioStream = this.input.audio();

    const videoCodecId = videoStream?.codecpar.codecId;
    const audioCodecId = audioStream?.codecpar.codecId;

    // Determine video codec string
    let videoCodec: string | null = null;
    if (videoCodecId) {
      const needsVideoTranscode = !this.isVideoCodecSupported(videoCodecId);

      if (needsVideoTranscode) {
        // Transcoding to H.264
        videoCodec = FMP4_CODECS.H264;
      } else if (videoCodecId === AV_CODEC_ID_H264) {
        // H.264 - use RFC 6381 codec string from input
        const codecString = avGetCodecString(videoStream.codecpar);
        videoCodec = codecString ?? FMP4_CODECS.H264;
      } else if (videoCodecId === AV_CODEC_ID_HEVC) {
        // H.265 - use RFC 6381 codec string from input
        const codecString = avGetCodecString(videoStream.codecpar);
        videoCodec = codecString ?? FMP4_CODECS.H265;
      } else if (videoCodecId === AV_CODEC_ID_AV1) {
        // AV1 - use RFC 6381 codec string from input
        const codecString = avGetCodecString(videoStream.codecpar);
        videoCodec = codecString ?? FMP4_CODECS.AV1;
      } else {
        // Fallback to H.264 (should not happen as we transcode unsupported codecs)
        videoCodec = FMP4_CODECS.H264;
      }
    }

    // Determine audio codec string
    let audioCodec: string | null = null;
    if (audioCodecId) {
      const needsAudioTranscode = !this.isAudioCodecSupported(audioCodecId);

      if (needsAudioTranscode) {
        // Transcoding to AAC
        audioCodec = FMP4_CODECS.AAC;
      } else if (audioCodecId === AV_CODEC_ID_AAC) {
        // AAC - use fixed codec string
        audioCodec = FMP4_CODECS.AAC;
      } else if (audioCodecId === AV_CODEC_ID_FLAC) {
        // FLAC
        audioCodec = FMP4_CODECS.FLAC;
      } else if (audioCodecId === AV_CODEC_ID_OPUS) {
        // Opus
        audioCodec = FMP4_CODECS.OPUS;
      } else {
        // Fallback to AAC (should not happen as we transcode unsupported codecs)
        audioCodec = FMP4_CODECS.AAC;
      }
    }

    // Combine video and audio codec strings
    return [videoCodec, audioCodec].filter(Boolean).join(',');
  }

  /**
   * Start streaming media to fMP4 chunks.
   *
   * Begins the media processing pipeline, reading packets from input,
   * transcoding based on supported codecs, and generating fMP4 chunks.
   * Video transcodes to H.264 if H.264/H.265 not supported.
   * Audio transcodes to AAC if AAC/FLAC/Opus not supported.
   * This method returns immediately after starting the pipeline.
   *
   * @returns Promise that resolves when pipeline is started
   *
   * @throws {FFmpegError} If setup fails
   *
   * @example
   * ```typescript
   * const stream = await FMP4Stream.create('input.mp4', {
   *   supportedCodecs: 'avc1.640029,mp4a.40.2',
   *   onData: (data) => sendToClient(data.data)
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

    // Open input if not already open
    if (!this.input) {
      if (!this.inputUrl) {
        throw new Error('No input URL or Demuxer provided');
      }
      this.input = await Demuxer.open(this.inputUrl, this.inputOptions);
    }

    const videoStream = this.input.video();
    const audioStream = this.input.audio();

    // Check if video needs transcoding
    const needsVideoTranscode = videoStream && !this.isVideoCodecSupported(videoStream.codecpar.codecId);

    if (needsVideoTranscode) {
      // Check if we need hardware acceleration
      if (this.options.hardware === 'auto') {
        this.hardwareContext = HardwareContext.auto();
      } else if (this.options.hardware.deviceType !== AV_HWDEVICE_TYPE_NONE) {
        this.hardwareContext = HardwareContext.create(this.options.hardware.deviceType, this.options.hardware.device, this.options.hardware.options);
      }

      // Transcode to H.264
      this.videoDecoder = await Decoder.create(videoStream, {
        hardware: this.hardwareContext,
        exitOnError: false,
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
          filterChain.filter('fps', { fps: this.options.video.fps! });
        }

        this.videoFilter = FilterAPI.create(filterChain.build(), {
          hardware: this.hardwareContext,
        });
      }

      const encoderCodec = this.hardwareContext?.getEncoderCodec('h264') ?? Codec.findEncoderByName(FF_ENCODER_LIBX264)!;

      let encoderOptions: EncoderOptions['options'] = {};
      if (encoderCodec.name === FF_ENCODER_LIBX264 || encoderCodec.name === FF_ENCODER_LIBX264) {
        encoderOptions.preset = 'ultrafast';
        encoderOptions.tune = 'zerolatency';
      }

      encoderOptions = {
        ...encoderOptions,
        ...this.options.video.encoderOptions,
      };

      this.videoEncoder = await Encoder.create(encoderCodec, {
        decoder: this.videoDecoder,
        options: encoderOptions,
      });
    }

    // Check if audio needs transcoding
    const needsAudioTranscode = audioStream && !this.isAudioCodecSupported(audioStream.codecpar.codecId);

    if (needsAudioTranscode) {
      // Transcode to AAC
      this.audioDecoder = await Decoder.create(audioStream, {
        exitOnError: false,
      });

      const targetSampleRate = 44100;
      const filterChain = FilterPreset.chain().aformat(AV_SAMPLE_FMT_FLTP, targetSampleRate, 'stereo').build();
      this.audioFilter = FilterAPI.create(filterChain);

      this.audioEncoder = await Encoder.create(FF_ENCODER_AAC, {
        decoder: this.audioDecoder,
        filter: this.audioFilter,
        options: this.options.audio.encoderOptions,
      });
    }

    // Setup output with callback
    const cb: IOOutputCallbacks = {
      write: (buffer: Buffer) => {
        if (this.options.boxMode) {
          // Box mode: buffer until we have complete boxes
          this.processBoxMode(buffer);
        } else {
          // Chunk mode: send raw data immediately
          const info: FMP4Data = { isComplete: false, boxes: [] };
          this.options.onData(buffer, info);
          this.pushFragment(buffer, info);
        }
        return buffer.length;
      },
    };

    this.output = await Muxer.open(cb, {
      input: this.input,
      format: 'mp4',
      bufferSize: this.options.bufferSize,
      exitOnError: false,
      options: {
        movflags: this.options.movFlags,
        frag_duration: this.options.fragDuration,
      },
    });

    this.runPipeline()
      .then(() => {
        this.endFragments();
        this.options.onClose?.();
      })
      .catch(async (error) => {
        this.endFragments();
        await this.stop();
        this.options.onClose?.(error);
      });
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
   * const stream = await FMP4Stream.create('input.mp4', {
   *   supportedCodecs: 'avc1.640029,mp4a.40.2'
   * });
   * await stream.start();
   *
   * // Stop after 10 seconds
   * setTimeout(async () => await stream.stop(), 10000);
   * ```
   */
  async stop(): Promise<void> {
    this.endFragments();

    // Stop pipeline if running and wait for completion
    if (this.pipeline && !this.pipeline.isStopped()) {
      this.pipeline.stop();
      await this.pipeline.completion;
      this.pipeline = undefined;
    }

    // Close all resources

    await this.input?.close();
    this.input = undefined;

    this.videoDecoder?.close();
    this.videoDecoder = undefined;
    this.videoFilter?.close();
    this.videoFilter = undefined;
    this.videoEncoder?.close();
    this.videoEncoder = undefined;

    this.audioDecoder?.close();
    this.audioDecoder = undefined;
    this.audioFilter?.close();
    this.audioFilter = undefined;
    this.audioEncoder?.close();
    this.audioEncoder = undefined;

    this.hardwareContext?.dispose();
    this.hardwareContext = undefined;

    await this.output?.close();
    this.output = undefined;

    this._initSegment = null;
    this._initSegmentResolve = null;
    this._initSegmentPromise = null;
    this._ftypData = null;
    this._moovData = null;
  }

  /**
   * Async generator that yields media fragments (moof+mdat chunks).
   *
   * In box mode, yields only media fragments (chunks containing moof boxes),
   * NOT the init segment. Use {@link initSegment} to get the ftyp+moov data.
   *
   * In chunk mode (boxMode disabled), yields every chunk as-is since
   * box-level filtering is not possible without box parsing.
   *
   * The generator completes when the stream stops or the pipeline ends.
   *
   * @yields {FMP4Fragment} Media fragment with data buffer and box info
   *
   * @example
   * ```typescript
   * const stream = FMP4Stream.create('rtsp://camera/stream', {
   *   supportedCodecs: 'avc1.640029,mp4a.40.2',
   *   boxMode: true,
   * });
   *
   * await stream.start();
   * const init = await stream.initSegment;
   *
   * for await (const fragment of stream.fragments()) {
   *   sendToClient(fragment.data);
   * }
   * ```
   */
  async *fragments(): AsyncGenerator<FMP4Fragment, void> {
    this.fragmentQueue = { queue: [], resolve: null, done: false };

    try {
      while (true) {
        const result = await new Promise<IteratorResult<FMP4Fragment>>((resolve) => {
          if (this.fragmentQueue!.queue.length > 0) {
            resolve({ value: this.fragmentQueue!.queue.shift()!, done: false });
            return;
          }
          if (this.fragmentQueue!.done) {
            resolve({ value: undefined as any, done: true });
            return;
          }
          this.fragmentQueue!.resolve = resolve;
        });

        if (result.done) break;
        yield result.value;
      }
    } finally {
      this.fragmentQueue = null;
    }
  }

  /**
   * Run the streaming pipeline until completion or stopped.
   *
   * @internal
   */
  private async runPipeline(): Promise<void> {
    if (!this.input || !this.output) {
      return;
    }

    const hasVideo = this.input?.video() !== undefined;
    const hasAudio = this.input?.audio() !== undefined;
    const opts = this.signal ? { signal: this.signal } : undefined;

    if (hasAudio && hasVideo) {
      this.pipeline = pipeline(
        this.input,
        {
          video: [this.videoDecoder, this.videoFilter, this.videoEncoder],
          audio: [this.audioDecoder, this.audioFilter, this.audioEncoder],
        },
        this.output,
        opts,
      );
    } else if (hasVideo) {
      this.pipeline = pipeline(
        this.input,
        {
          video: [this.videoDecoder, this.videoFilter, this.videoEncoder],
        },
        this.output,
        opts,
      );
    } else if (hasAudio) {
      this.pipeline = pipeline(
        this.input,
        {
          audio: [this.audioDecoder, this.audioFilter, this.audioEncoder],
        },
        this.output,
        opts,
      );
    } else {
      throw new Error('No audio or video streams found in input');
    }

    await this.pipeline.completion;
    this.pipeline = undefined;
  }

  /**
   * Check if video codec is supported.
   *
   * @param codecId - Codec ID
   *
   * @returns True if H.264, H.265, or AV1 is in supported codecs
   *
   * @internal
   */
  private isVideoCodecSupported(codecId: AVCodecID): boolean {
    if (codecId === AV_CODEC_ID_H264 && (this.supportedCodecs.has(FMP4_CODECS.H264) || this.supportedCodecs.has('avc1'))) {
      return true;
    }

    if (codecId === AV_CODEC_ID_HEVC && (this.supportedCodecs.has(FMP4_CODECS.H265) || this.supportedCodecs.has('hvc1') || this.supportedCodecs.has('hev1'))) {
      return true;
    }

    if (codecId === AV_CODEC_ID_AV1 && (this.supportedCodecs.has(FMP4_CODECS.AV1) || this.supportedCodecs.has('av01'))) {
      return true;
    }

    return false;
  }

  /**
   * Check if audio codec is supported.
   *
   * @param codecId - Codec ID
   *
   * @returns True if AAC, FLAC, or Opus is in supported codecs
   *
   * @internal
   */
  private isAudioCodecSupported(codecId: AVCodecID): boolean {
    if (codecId === AV_CODEC_ID_AAC && this.supportedCodecs.has(FMP4_CODECS.AAC)) {
      return true;
    }

    if (codecId === AV_CODEC_ID_FLAC && this.supportedCodecs.has(FMP4_CODECS.FLAC)) {
      return true;
    }

    if (codecId === AV_CODEC_ID_OPUS && this.supportedCodecs.has(FMP4_CODECS.OPUS)) {
      return true;
    }

    return false;
  }

  /**
   * Process buffer in box mode - buffers until complete boxes are available.
   *
   * @param chunk - Incoming data chunk from FFmpeg
   *
   * @internal
   */
  private processBoxMode(chunk: Buffer): void {
    // If we have an incomplete box from previous chunk, append to it
    if (this.incompleteBoxBuffer) {
      chunk = Buffer.concat([this.incompleteBoxBuffer, chunk]);
      this.incompleteBoxBuffer = null;
    }

    let offset = 0;
    const boxes: MP4Box[] = [];

    while (offset + 8 <= chunk.length) {
      // Read box header
      const boxSize = chunk.readUInt32BE(offset);
      const boxType = chunk.toString('ascii', offset + 4, offset + 8);

      // Check if we have the complete box
      if (offset + boxSize > chunk.length) {
        // Box is incomplete - save for next chunk
        this.incompleteBoxBuffer = chunk.subarray(offset);
        break;
      }

      // We have the complete box - parse it
      const box: MP4Box = {
        type: boxType,
        size: boxSize,
        data: chunk.subarray(offset + 8, offset + boxSize),
        offset: offset,
      };
      boxes.push(box);

      // Move to next box
      offset += boxSize;

      // Safety check: invalid box size
      if (boxSize < 8) {
        break;
      }
    }

    // If we have complete boxes, send them to the callback
    if (boxes.length > 0) {
      const boxData = chunk.subarray(0, offset);
      const info: FMP4Data = { isComplete: true, boxes };

      // onData callback gets everything
      this.options.onData(boxData, info);

      // Init segment tracking: collect ftyp and moov data
      if (!this._initSegment) {
        for (const box of boxes) {
          if (box.type === 'ftyp' && !this._ftypData) {
            this._ftypData = chunk.subarray(box.offset, box.offset + box.size);
          }
          if (box.type === 'moov' && !this._moovData) {
            this._moovData = chunk.subarray(box.offset, box.offset + box.size);
          }
        }
        if (this._ftypData && this._moovData) {
          this._initSegment = Buffer.concat([this._ftypData, this._moovData]);
          this._initSegmentResolve?.(this._initSegment);
          this._initSegmentResolve = null;
        }
      }

      // fragments() generator gets only media fragments (moof+mdat)
      const isMediaFragment = boxes.some((b) => b.type === 'moof');
      if (isMediaFragment) {
        this.pushFragment(boxData, info);
      }
    }
  }

  /**
   * Push a fragment to the fragment queue for the async generator.
   *
   * @param data - fMP4 data buffer
   *
   * @param info - Parsed box information
   *
   * @internal
   */
  private pushFragment(data: Buffer, info: FMP4Data): void {
    if (!this.fragmentQueue) return;
    const fragment: FMP4Fragment = { data, info };
    if (this.fragmentQueue.resolve) {
      this.fragmentQueue.resolve({ value: fragment, done: false });
      this.fragmentQueue.resolve = null;
    } else {
      this.fragmentQueue.queue.push(fragment);
    }
  }

  /**
   * Signal the fragment queue that no more fragments will arrive.
   *
   * @internal
   */
  private endFragments(): void {
    if (!this.fragmentQueue) return;
    this.fragmentQueue.done = true;
    if (this.fragmentQueue.resolve) {
      this.fragmentQueue.resolve({ value: undefined as any, done: true });
      this.fragmentQueue.resolve = null;
    }
  }
}
