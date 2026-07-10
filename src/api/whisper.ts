import { AV_NOPTS_VALUE } from '../constants/constants.js';
import { FilterPreset } from './filter-presets.js';
import { FilterAPI } from './filter.js';
import { WhisperDownloader } from './utilities/whisper-model.js';

import type { Frame } from '../lib/frame.js';
import type { WhisperModelName, WhisperVADModelName } from './utilities/whisper-model.js';

/**
 * Transcribed audio segment from Whisper.
 *
 * Represents a single transcribed segment with timing information.
 * Start and end times are in milliseconds from the beginning of the audio.
 */
export interface WhisperSegment {
  /**
   * Start time of the segment in milliseconds.
   */
  start: number;

  /**
   * End time of the segment in milliseconds.
   */
  end: number;

  /**
   * Transcribed text content.
   */
  text: string;

  /**
   * Indicates if this segment represents a speaker turn.
   * Only available when VAD (Voice Activity Detection) is enabled.
   */
  turn?: boolean;
}

/**
 * Options for configuring Whisper transcriber.
 *
 * Controls model selection, language, GPU acceleration, VAD, and output behavior.
 */
export interface WhisperTranscriberOptions {
  /**
   * Path to whisper.cpp GGML model file.
   *
   * Required. Download models using {@link WhisperDownloader}.
   * ```
   */
  model: WhisperModelName;

  /**
   * Path to VAD (Voice Activity Detection) model file.
   *
   * Optional. Enables better audio segmentation using Silero VAD.
   * Download VAD models using {@link WhisperDownloader.downloadVADModel}.
   * ```
   */
  vadModel?: WhisperVADModelName;

  /**
   * Directory where models will be downloaded if not already present.
   *
   * @default '<PROJECT_DIR>/models'
   */
  modelDir?: string;

  /**
   * Language code for transcription.
   *
   * Use 'auto' for automatic language detection.
   *
   * @default 'auto'
   */
  language?: string;

  /**
   * Audio queue size in seconds.
   *
   * Maximum duration of audio buffered before processing.
   * Increase when using VAD for better segmentation.
   *
   * @default 3
   */
  queue?: number;

  /**
   * Enable GPU acceleration for processing.
   *
   * Requires whisper.cpp built with GPU support (CUDA/Vulkan/Metal).
   *
   * @default true
   */
  useGpu?: boolean;

  /**
   * GPU device index to use.
   *
   * Only relevant when multiple GPUs are available.
   *
   * @default 0
   */
  gpuDevice?: number;

  /**
   * VAD threshold for voice activity detection.
   *
   * Higher values are more conservative (less likely to detect speech).
   * Range: 0.0 to 1.0
   *
   * @default 0.5
   */
  vadThreshold?: number;

  /**
   * Minimum speech duration for VAD in seconds.
   *
   * Audio chunks shorter than this will be filtered out.
   *
   * @default 0.1
   */
  vadMinSpeechDuration?: number;

  /**
   * Minimum silence duration for VAD in seconds.
   *
   * Silence shorter than this won't trigger segment boundaries.
   *
   * @default 0.5
   */
  vadMinSilenceDuration?: number;
}

/**
 * High-level Whisper transcriber for automatic speech recognition.
 *
 * Provides streaming audio transcription using OpenAI's Whisper model via whisper.cpp.
 * Supports GPU acceleration, VAD (Voice Activity Detection), and real-time processing.
 * Built on FFmpeg's whisper filter with automatic frame metadata extraction.
 *
 * Features:
 * - Real-time streaming transcription
 * - GPU acceleration (CUDA/Vulkan/Metal)
 * - Voice Activity Detection for better segmentation
 * - Automatic language detection
 * - Type-safe transcription segments
 * - Frame-based API for flexible integration
 *
 * @example
 * ```typescript
 * import { Demuxer, Decoder, WhisperTranscriber } from 'node-av/api';
 * import { WhisperDownloader } from 'node-av/api/utilities/whisper-model';
 *
 * // Download model
 * const modelPath = await WhisperDownloader.downloadModel({
 *   model: 'base.en',
 *   outputPath: './models'
 * });
 *
 * // Open audio and create decoder
 * await using input = await Demuxer.open('podcast.mp3');
 * using decoder = await Decoder.create(input.audio());
 *
 * // Create transcriber
 * await using transcriber = await WhisperTranscriber.create({
 *   model: modelPath,
 *   language: 'en'
 * });
 *
 * // Transcribe using decoded frames
 * for await (const segment of transcriber.transcribe(decoder.frames(input.packets()))) {
 *   const timestamp = `[${(segment.start / 1000).toFixed(1)}s - ${(segment.end / 1000).toFixed(1)}s]`;
 *   console.log(`${timestamp}: ${segment.text}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Real-time microphone transcription with VAD
 * import { Demuxer, Decoder, WhisperTranscriber } from 'node-av/api';
 * import { WhisperDownloader } from 'node-av/api/utilities/whisper-model';
 *
 * // Download VAD model
 * const vadPath = await WhisperDownloader.downloadVADModel('silero-v5.1.2', './models');
 *
 * // Setup transcriber with VAD
 * await using transcriber = await WhisperTranscriber.create({
 *   model: './models/ggml-medium.bin',
 *   language: 'en',
 *   queue: 10,
 *   vadModel: vadPath,
 *   vadThreshold: 0.5
 * });
 *
 * // Live transcription from decoded audio frames
 * using decoder = await Decoder.create(microphoneStream);
 * for await (const segment of transcriber.transcribe(decoder.frames(microphonePackets))) {
 *   if (segment.turn) {
 *     console.log('\n--- New speaker turn ---');
 *   }
 *   console.log(segment.text);
 * }
 * ```
 *
 * @see {@link WhisperDownloader} For downloading Whisper and VAD models
 * @see {@link Decoder} For audio decoding
 * @see {@link Demuxer} For reading media files
 */
export class WhisperTranscriber implements Disposable {
  private options: Required<WhisperTranscriberOptions>;
  private isClosed = false;

  /**
   * @param options - Transcriber configuration
   *
   * Use {@link create} factory method instead
   *
   * @internal
   */
  private constructor(options: Required<WhisperTranscriberOptions>) {
    this.options = options;
  }

  /**
   * Create a Whisper transcriber instance.
   *
   * Initializes the transcriber with the specified model and configuration.
   * The transcriber can then process audio frames from any source.
   *
   * @param options - Transcriber configuration
   *
   * @returns Configured transcriber instance
   *
   * @throws {Error} If model file does not exist
   *
   * @throws {Error} If VAD model file does not exist (when vadModel specified)
   *
   * @example
   * ```typescript
   * import { WhisperTranscriber } from 'node-av/api';
   *
   * // Create transcriber with basic options
   * await using transcriber = await WhisperTranscriber.create({
   *   model: './models/ggml-base.en.bin',
   *   language: 'en'
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Create transcriber with GPU and VAD support
   * await using transcriber = await WhisperTranscriber.create({
   *   model: './models/ggml-base.bin',
   *   language: 'auto',
   *   useGpu: true,
   *   gpuDevice: 0,
   *   vadModel: './models/ggml-silero-v5.1.2.bin',
   *   vadThreshold: 0.5,
   *   queue: 10
   * });
   * ```
   */
  static async create(options: WhisperTranscriberOptions): Promise<WhisperTranscriber> {
    const modelsToDownload = [options.model, options.vadModel].filter(Boolean) as (WhisperModelName | WhisperVADModelName)[];
    const [modelPath, vadModelPath] = await WhisperDownloader.downloadModels(modelsToDownload, options.modelDir);

    const fullOptions: Required<WhisperTranscriberOptions> = {
      model: modelPath as WhisperModelName,
      vadModel: vadModelPath as WhisperVADModelName,
      modelDir: options.modelDir ?? WhisperDownloader.DEFAULT_MODEL_PATH,
      language: options.language ?? 'auto',
      queue: options.queue ?? 3,
      useGpu: options.useGpu ?? true,
      gpuDevice: options.gpuDevice ?? 0,
      vadThreshold: options.vadThreshold ?? 0.5,
      vadMinSpeechDuration: options.vadMinSpeechDuration ?? 0.1,
      vadMinSilenceDuration: options.vadMinSilenceDuration ?? 0.5,
    };

    return new WhisperTranscriber(fullOptions);
  }

  /**
   * Transcribe audio frames to text segments.
   *
   * Processes audio frames through the Whisper filter and yields transcribed segments.
   * Each segment contains start/end timestamps and the transcribed text.
   * Reads metadata directly from frame metadata tags (lavfi.whisper.text, lavfi.whisper.duration).
   *
   * The generator continues until the input stream ends or close() is called.
   * When the input ends, the filter is flushed so audio still buffered in the
   * whisper queue is transcribed before the generator finishes.
   * Always use with `for await...of` to properly handle async iteration.
   *
   * @param frames - Audio frames (from Decoder.frames()) or single frame to transcribe
   *
   * @yields {WhisperSegment} Transcribed audio segments with timing and text
   *
   * @throws {FFmpegError} If filter initialization fails
   *
   * @example
   * ```typescript
   * import { Demuxer, Decoder, WhisperTranscriber } from 'node-av/api';
   *
   * await using input = await Demuxer.open('podcast.mp3');
   * using decoder = await Decoder.create(input.audio());
   * await using transcriber = await WhisperTranscriber.create({
   *   model: './models/ggml-base.en.bin',
   *   language: 'en'
   * });
   *
   * // Transcribe decoded frames
   * for await (const segment of transcriber.transcribe(decoder.frames(input.packets()))) {
   *   console.log(`[${segment.start}ms]: ${segment.text}`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // With custom timing format
   * const audioFrames = decoder.frames(input.packets());
   * for await (const segment of transcriber.transcribe(audioFrames)) {
   *   const startSec = (segment.start / 1000).toFixed(2);
   *   const endSec = (segment.end / 1000).toFixed(2);
   *   console.log(`[${startSec}s - ${endSec}s]: ${segment.text}`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Process single frame
   * using frame = decoder.decodeSync(packet);
   * for await (const segment of transcriber.transcribe(frame)) {
   *   console.log(`Transcribed: ${segment.text}`);
   * }
   * ```
   */
  async *transcribe(frames: AsyncIterable<Frame | null> | Frame | null): AsyncGenerator<WhisperSegment, void, unknown> {
    const chain = FilterPreset.chain()
      .whisper({
        model: this.options.model,
        language: this.options.language,
        queue: this.options.queue,
        useGpu: this.options.useGpu,
        gpuDevice: this.options.gpuDevice,
        vadModel: this.options.vadModel,
        vadThreshold: this.options.vadThreshold,
        vadMinSpeechDuration: this.options.vadMinSpeechDuration,
        vadMinSilenceDuration: this.options.vadMinSilenceDuration,
      })
      .build();

    // Create filter API
    using filter = FilterAPI.create(chain, {
      allowReinit: true,
      dropOnChange: false,
    });

    // Fallback clock for frames without usable timestamps (in milliseconds)
    let fallbackEnd = 0;

    const toSegment = (frame: Frame): WhisperSegment | null => {
      const metadata = frame.getMetadata();
      const text = metadata.get('lavfi.whisper.text');
      const durationStr = metadata.get('lavfi.whisper.duration');

      if (!text?.trim()) {
        return null;
      }

      // Parse duration (in seconds)
      const duration = durationStr ? parseFloat(durationStr) * 1000 : 0;

      // The whisper filter attaches its result to the frame that triggered the
      // transcription, so that frame's timestamp marks (approximately) the end
      // of the transcribed chunk. Deriving start/end from the frame PTS keeps
      // segments aligned with the actual audio position; a counter that only
      // advances on chunks that produced text would silently swallow every
      // silent span and drift (e.g. a 60s intro would put the first segment
      // at start 0).
      const tb = frame.timeBase;
      const frameTime = frame.pts !== AV_NOPTS_VALUE && tb.den !== 0 ? (Number(frame.pts) * 1000 * tb.num) / tb.den : null;
      const end = frameTime ?? fallbackEnd + duration;
      fallbackEnd = end;

      return {
        start: Math.max(0, end - duration),
        end,
        text: text.trim(),
      };
    };

    // Decode and process frames through filter
    for await (using frame of filter.frames(frames)) {
      if (this.isClosed) {
        break;
      }

      if (!frame?.isAudio()) {
        continue;
      }

      const segment = toSegment(frame);
      if (segment) {
        yield segment;
      }
    }

    // Inputs that end without a trailing null never flush the filter, and the
    // whisper queue (up to `queue` seconds of buffered audio) would be
    // destroyed with it. Drain explicitly; after an upstream EOF this second
    // flush is a no-op.
    if (!this.isClosed) {
      for await (using frame of filter.flushFrames()) {
        if (!frame.isAudio()) {
          continue;
        }

        const segment = toSegment(frame);
        if (segment) {
          yield segment;
        }
      }
    }
  }

  /**
   * Close transcriber and clean up resources.
   *
   * Releases filter graph and stops frame processing.
   * Called automatically when using `await using` syntax.
   *
   * @example
   * ```typescript
   * // Automatic cleanup
   * {
   *   await using transcriber = await WhisperTranscriber.create(options);
   *   // Use transcriber
   * } // Automatically calls close()
   *
   * // Manual cleanup
   * const transcriber = await WhisperTranscriber.create(options);
   * try {
   *   // Use transcriber
   * } finally {
   *   await transcriber.close();
   * }
   * ```
   */
  close(): void {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;
  }

  /**
   * Symbol.asyncDispose implementation for `await using` syntax.
   *
   * @internal
   */
  [Symbol.dispose](): void {
    this.close();
  }
}
