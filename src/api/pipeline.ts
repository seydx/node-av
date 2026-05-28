import type { Frame } from '../lib/frame.js';
import type { Packet } from '../lib/packet.js';
import type { Stream } from '../lib/stream.js';
import type { BitStreamFilterAPI } from './bitstream-filter.js';
import type { Decoder } from './decoder.js';
import type { Demuxer } from './demuxer.js';
import type { Encoder } from './encoder.js';
import type { FilterAPI } from './filter.js';
import type { Muxer } from './muxer.js';

// Restrict stream names to known types
export type StreamName = 'video' | 'audio';

// Better type definitions with proper inference
export type NamedInputs<K extends StreamName = StreamName> = Pick<Record<StreamName, Demuxer>, K>;
export type NamedStages<K extends StreamName = StreamName> = Pick<
  Record<StreamName, (Decoder | FilterAPI | FilterAPI[] | Encoder | BitStreamFilterAPI | BitStreamFilterAPI[] | undefined)[] | 'passthrough'>,
  K
>;
export type NamedOutputs<K extends StreamName = StreamName> = Pick<Record<StreamName, Muxer>, K>;

/**
 * Internal metadata for tracking stream components.
 *
 * @internal
 */
interface StreamMetadata {
  demuxer?: Demuxer; // Track source Demuxer for stream copy
  encoder?: Encoder;
  decoder?: Decoder;
  bitStreamFilter?: BitStreamFilterAPI;
  streamIndex?: number;
  type?: 'video' | 'audio';
}

/**
 * Pipeline control interface for managing pipeline execution.
 * Allows graceful stopping and completion tracking of running pipelines.
 *
 * @example
 * ```typescript
 * const control = pipeline(input, decoder, encoder, output);
 *
 * // Stop after 10 seconds
 * setTimeout(() => control.stop(), 10000);
 *
 * // Wait for completion
 * await control.completion;
 * ```
 */
export interface PipelineControl {
  /**
   * Stop the pipeline gracefully.
   * The pipeline will stop processing after the current operation completes.
   */
  stop(): void;

  /**
   * Check if the pipeline has been stopped.
   *
   * @returns True if stop() has been called
   */
  isStopped(): boolean;

  /**
   * Promise that resolves when the pipeline completes.
   * Resolves when all processing is finished or the pipeline is stopped.
   */
  readonly completion: Promise<void>;
}

/**
 * Options for pipeline execution.
 */
export interface PipelineOptions {
  /**
   * AbortSignal for cancellation.
   *
   * When aborted, the pipeline stops processing gracefully.
   * Equivalent to calling `control.stop()`.
   */
  signal?: AbortSignal;
}

// ============================================================================
// Simple Pipeline Overloads (single stream, variable parameters)
// ============================================================================

/**
 * Full transcoding pipeline: input → decoder → encoder → output.
 *
 * @param source - Media input source
 *
 * @param decoder - Decoder for decoding packets to frames
 *
 * @param encoder - Encoder for encoding frames to packets
 *
 * @param output - Media output destination
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * const control = pipeline(input, decoder, encoder, output);
 * await control.completion;
 * ```
 */
export function pipeline(source: Demuxer, decoder: Decoder, encoder: Encoder, output: Muxer, options?: PipelineOptions): PipelineControl;

/**
 * Full transcoding pipeline with filter: input → decoder → filter → encoder → output.
 *
 * @param source - Media input source
 *
 * @param decoder - Decoder for decoding packets to frames
 *
 * @param filter - Filter or filter chain for processing frames
 *
 * @param encoder - Encoder for encoding frames to packets
 *
 * @param output - Media output destination
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * const control = pipeline(input, decoder, scaleFilter, encoder, output);
 * await control.completion;
 * ```
 */
export function pipeline(source: Demuxer, decoder: Decoder, filter: FilterAPI | FilterAPI[], encoder: Encoder, output: Muxer, options?: PipelineOptions): PipelineControl;

/**
 * Transcoding with bitstream filter: input → decoder → encoder → bsf → output.
 *
 * @param source - Media input source
 *
 * @param decoder - Decoder for decoding packets
 *
 * @param encoder - Encoder for encoding frames
 *
 * @param bsf - Bitstream filter for packet processing
 *
 * @param output - Media output destination
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * const decoder = await Decoder.create(input.video());
 * const encoder = await Encoder.create(FF_ENCODER_LIBX264, { ... });
 * const bsf = await BitStreamFilterAPI.create('h264_mp4toannexb');
 * const control = pipeline(input, decoder, encoder, bsf, output);
 * await control.completion;
 * ```
 */
export function pipeline(
  source: Demuxer,
  decoder: Decoder,
  encoder: Encoder,
  bsf: BitStreamFilterAPI | BitStreamFilterAPI[],
  output: Muxer,
  options?: PipelineOptions,
): PipelineControl;

/**
 * Full pipeline with filter and bsf: input → decoder → filter → encoder → bsf → output.
 *
 * @param source - Media input source
 *
 * @param decoder - Decoder for decoding packets
 *
 * @param filter - Filter or filter chain
 *
 * @param encoder - Encoder for encoding frames
 *
 * @param bsf - Bitstream filter
 *
 * @param output - Media output destination
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * const decoder = await Decoder.create(input.video());
 * const filter = FilterAPI.create('scale=640:480', { ... });
 * const encoder = await Encoder.create(FF_ENCODER_LIBX264, { ... });
 * const bsf = await BitStreamFilterAPI.create('h264_mp4toannexb');
 * const control = pipeline(input, decoder, filter, encoder, bsf, output);
 * await control.completion;
 * ```
 */
export function pipeline(
  source: Demuxer,
  decoder: Decoder,
  filter: FilterAPI | FilterAPI[],
  encoder: Encoder,
  bsf: BitStreamFilterAPI | BitStreamFilterAPI[],
  output: Muxer,
  options?: PipelineOptions,
): PipelineControl;

/**
 * Decode + multiple filters + encode: input → decoder → filter1 → filter2 → encoder → output.
 *
 * @param source - Media input source
 *
 * @param decoder - Decoder for decoding packets
 *
 * @param filter1 - First filter
 *
 * @param filter2 - Second filter
 *
 * @param encoder - Encoder for encoding frames
 *
 * @param output - Media output destination
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * const decoder = await Decoder.create(input.video());
 * const scaleFilter = FilterAPI.create('scale=640:480', { ... });
 * const cropFilter = FilterAPI.create('crop=640:360', { ... });
 * const encoder = await Encoder.create(FF_ENCODER_LIBX264, { ... });
 * const control = pipeline(input, decoder, scaleFilter, cropFilter, encoder, output);
 * await control.completion;
 * ```
 */
export function pipeline(
  source: Demuxer,
  decoder: Decoder,
  filter1: FilterAPI,
  filter2: FilterAPI,
  encoder: Encoder,
  output: Muxer,
  options?: PipelineOptions,
): PipelineControl;

/**
 * Stream copy pipeline: input → output (copies all streams).
 *
 * @param source - Media input source
 *
 * @param output - Media output destination
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * // Copy all streams without re-encoding
 * const control = pipeline(input, output);
 * await control.completion;
 * ```
 */
export function pipeline(source: Demuxer, output: Muxer, options?: PipelineOptions): PipelineControl;

/**
 * Stream copy with bitstream filter: input → bsf → output.
 *
 * @param source - Media input source
 *
 * @param bsf - Bitstream filter for packet processing
 *
 * @param output - Media output destination
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * // Convert H.264 stream format while copying
 * const bsf = await BitStreamFilterAPI.create('h264_mp4toannexb');
 * const control = pipeline(input, bsf, output);
 * await control.completion;
 * ```
 */
export function pipeline(source: Demuxer, bsf: BitStreamFilterAPI | BitStreamFilterAPI[], output: Muxer, options?: PipelineOptions): PipelineControl;

/**
 * Filter + encode + output: frames → filter → encoder → output.
 *
 * @param source - Frame source (async iterable)
 *
 * @param filter - Filter or filter chain
 *
 * @param encoder - Encoder for encoding frames
 *
 * @param output - Media output destination
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * // Process frames from custom source
 * const frameSource = generateFrames(); // Your async frame generator
 * const filter = FilterAPI.create('scale=1920:1080', { ... });
 * const encoder = await Encoder.create(FF_ENCODER_LIBX264, { ... });
 * const control = pipeline(frameSource, filter, encoder, output);
 * await control.completion;
 * ```
 */
export function pipeline(
  source: AsyncIterable<Frame | null>,
  filter: FilterAPI | FilterAPI[],
  encoder: Encoder,
  output: Muxer,
  options?: PipelineOptions,
): PipelineControl;

/**
 * Encode + output: frames → encoder → output.
 *
 * @param source - Frame source (async iterable)
 *
 * @param encoder - Encoder for encoding frames
 *
 * @param output - Media output destination
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * // Encode raw frames directly
 * const frameSource = generateFrames(); // Your async frame generator
 * const encoder = await Encoder.create(FF_ENCODER_LIBX264, { ... });
 * const control = pipeline(frameSource, encoder, output);
 * await control.completion;
 * ```
 */
export function pipeline(source: AsyncIterable<Frame | null>, encoder: Encoder, output: Muxer, options?: PipelineOptions): PipelineControl;

/**
 * Partial pipeline: input → decoder (returns frames).
 *
 * @param source - Media input source
 *
 * @param decoder - Decoder for decoding packets
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Async generator of frames
 *
 * @example
 * ```typescript
 * // Get decoded frames for custom processing
 * const decoder = await Decoder.create(input.video());
 * const frames = pipeline(input, decoder);
 * for await (const frame of frames) {
 *   // Process frame
 *   frame.free();
 * }
 * ```
 */
export function pipeline(source: Demuxer, decoder: Decoder, options?: PipelineOptions): AsyncGenerator<Frame | null>;

/**
 * Partial pipeline: input → decoder → filter (returns frames).
 *
 * @param source - Media input source
 *
 * @param decoder - Decoder for decoding packets
 *
 * @param filter - Filter or filter chain
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Async generator of frames
 *
 * @example
 * ```typescript
 * // Get filtered frames for custom processing
 * const decoder = await Decoder.create(input.video());
 * const filter = FilterAPI.create('scale=640:480', { ... });
 * const frames = pipeline(input, decoder, filter);
 * for await (const frame of frames) {
 *   // Process filtered frame
 *   frame.free();
 * }
 * ```
 */
export function pipeline(source: Demuxer, decoder: Decoder, filter: FilterAPI | FilterAPI[], options?: PipelineOptions): AsyncGenerator<Frame | null>;

/**
 * Partial pipeline: input → decoder → filter → encoder (returns packets).
 *
 * @param source - Media input source
 *
 * @param decoder - Decoder for decoding packets
 *
 * @param filter - Filter or filter chain
 *
 * @param encoder - Encoder for encoding frames
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Async generator of packets
 *
 * @example
 * ```typescript
 * // Get encoded packets for custom output handling
 * const decoder = await Decoder.create(input.video());
 * const filter = FilterAPI.create('scale=640:480', { ... });
 * const encoder = await Encoder.create(FF_ENCODER_LIBX264, { ... });
 * const packets = pipeline(input, decoder, filter, encoder);
 * for await (const packet of packets) {
 *   // Handle encoded packet
 *   packet.free();
 * }
 * ```
 */
export function pipeline(source: Demuxer, decoder: Decoder, filter: FilterAPI | FilterAPI[], encoder: Encoder, options?: PipelineOptions): AsyncGenerator<Packet | null>;

/**
 * Partial pipeline: input → decoder → encoder (returns packets).
 *
 * @param source - Media input source
 *
 * @param decoder - Decoder for decoding packets
 *
 * @param encoder - Encoder for encoding frames
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Async generator of packets
 *
 * @example
 * ```typescript
 * // Transcode to packets for custom output
 * const decoder = await Decoder.create(input.video());
 * const encoder = await Encoder.create(FF_ENCODER_LIBX264, { ... });
 * const packets = pipeline(input, decoder, encoder);
 * for await (const packet of packets) {
 *   // Handle transcoded packet
 *   packet.free();
 * }
 * ```
 */
export function pipeline(source: Demuxer, decoder: Decoder, encoder: Encoder, options?: PipelineOptions): AsyncGenerator<Packet | null>;

/**
 * Partial pipeline: frames → filter (returns frames).
 *
 * @param source - Frame source (async iterable)
 *
 * @param filter - Filter or filter chain
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Async generator of filtered frames
 *
 * @example
 * ```typescript
 * // Filter frames from custom source
 * const frameSource = generateFrames();
 * const filter = FilterAPI.create('scale=640:480', { ... });
 * const filteredFrames = pipeline(frameSource, filter);
 * for await (const frame of filteredFrames) {
 *   // Process filtered frame
 *   frame.free();
 * }
 * ```
 */
export function pipeline(source: AsyncIterable<Frame | null>, filter: FilterAPI | FilterAPI[], options?: PipelineOptions): AsyncGenerator<Frame | null>;

/**
 * Partial pipeline: frames → encoder (returns packets).
 *
 * @param source - Frame source (async iterable)
 *
 * @param encoder - Encoder for encoding frames
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Async generator of packets
 *
 * @example
 * ```typescript
 * // Encode frames to packets
 * const frameSource = generateFrames();
 * const encoder = await Encoder.create(FF_ENCODER_LIBX264, { ... });
 * const packets = pipeline(frameSource, encoder);
 * for await (const packet of packets) {
 *   // Handle encoded packet
 *   packet.free();
 * }
 * ```
 */
export function pipeline(source: AsyncIterable<Frame | null>, encoder: Encoder, options?: PipelineOptions): AsyncGenerator<Packet | null>;

/**
 * Partial pipeline: frames → filter → encoder (returns packets).
 *
 * @param source - Frame source (async iterable)
 *
 * @param filter - Filter or filter chain
 *
 * @param encoder - Encoder for encoding frames
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Async generator of packets
 *
 * @example
 * ```typescript
 * // Process frames with filter and encode to packets
 * const frameSource = generateFrames();
 * const filter = FilterAPI.create('scale=640:480', { ... });
 * const encoder = await Encoder.create(FF_ENCODER_LIBX264, { ... });
 * const packets = pipeline(frameSource, filter, encoder);
 * for await (const packet of packets) {
 *   // Handle encoded packet
 *   packet.free();
 * }
 * ```
 */
export function pipeline(
  source: AsyncIterable<Frame | null>,
  filter: FilterAPI | FilterAPI[],
  encoder: Encoder,
  options?: PipelineOptions,
): AsyncGenerator<Packet | null>;

// ============================================================================
// Named Pipeline Overloads (multiple streams, variable parameters)
// ============================================================================

/**
 * Named pipeline with shared input and single output.
 *
 * @param input - Shared input source (used for all streams)
 *
 * @param stages - Named processing stages for each stream
 *
 * @param output - Single output destination for all streams
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * // Named pipeline with shared input
 * const control = pipeline(
 *   input, // Automatically used for both video and audio
 *   {
 *     video: [videoDecoder, scaleFilter, videoEncoder],
 *     audio: [audioDecoder, volumeFilter, audioEncoder]
 *   },
 *   output
 * );
 * await control.completion;
 * ```
 */
export function pipeline<K extends StreamName>(input: Demuxer, stages: NamedStages<K>, output: Muxer, options?: PipelineOptions): PipelineControl;

/**
 * Named pipeline with single output - all streams go to the same output.
 *
 * @param inputs - Named input sources (video/audio)
 *
 * @param stages - Named processing stages for each stream
 *
 * @param output - Single output destination for all streams
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * // Named pipeline for muxing
 * const control = pipeline(
 *   { video: videoInput, audio: audioInput },
 *   {
 *     video: [videoDecoder, scaleFilter, videoEncoder],
 *     audio: [audioDecoder, volumeFilter, audioEncoder]
 *   },
 *   output
 * );
 * await control.completion;
 * ```
 */
export function pipeline<K extends StreamName>(inputs: NamedInputs<K>, stages: NamedStages<K>, output: Muxer, options?: PipelineOptions): PipelineControl;

/**
 * Named pipeline with shared input and multiple outputs.
 *
 * @param input - Shared input source (used for all streams)
 *
 * @param stages - Named processing stages for each stream
 *
 * @param outputs - Named output destinations
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * // Named pipeline with shared input and separate outputs
 * const control = pipeline(
 *   input, // Automatically used for both video and audio
 *   {
 *     video: [videoDecoder, scaleFilter, videoEncoder],
 *     audio: [audioDecoder, volumeFilter, audioEncoder]
 *   },
 *   { video: videoOutput, audio: audioOutput }
 * );
 * await control.completion;
 * ```
 */
export function pipeline<K extends StreamName>(input: Demuxer, stages: NamedStages<K>, outputs: NamedOutputs<K>, options?: PipelineOptions): PipelineControl;

/**
 * Named pipeline with multiple outputs - each stream has its own output.
 *
 * @param inputs - Named input sources (video/audio)
 *
 * @param stages - Named processing stages for each stream
 *
 * @param outputs - Named output destinations
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control for managing execution
 *
 * @example
 * ```typescript
 * // Named pipeline for audio/video processing
 * const control = pipeline(
 *   { video: videoInput, audio: audioInput },
 *   {
 *     video: [videoDecoder, scaleFilter, videoEncoder],
 *     audio: [audioDecoder, volumeFilter, audioEncoder]
 *   },
 *   { video: videoOutput, audio: audioOutput }
 * );
 * await control.completion;
 * ```
 */
export function pipeline<K extends StreamName>(inputs: NamedInputs<K>, stages: NamedStages<K>, outputs: NamedOutputs<K>, options?: PipelineOptions): PipelineControl;

/**
 * Partial named pipeline (returns generators for further processing).
 *
 * @param inputs - Named input sources
 *
 * @param stages - Named processing stages
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Record of async generators for each stream
 *
 * @example
 * ```typescript
 * // Partial named pipeline
 * const generators = pipeline(
 *   { video: videoInput, audio: audioInput },
 *   {
 *     video: [videoDecoder, scaleFilter, videoEncoder],
 *     audio: [audioDecoder, volumeFilter, audioEncoder]
 *   }
 * );
 *
 * // Access individual generators
 * const videoGenerator = generators.video;
 * const audioGenerator = generators.audio;
 *
 * // Use the generators
 * for await (const packet of videoGenerator) {
 *   // Process video packet
 * }
 * for await (const packet of audioGenerator) {
 *   // Process audio packet
 * }
 * ```
 */
export function pipeline<K extends StreamName, T extends Packet | Frame | null = Packet | Frame | null>(
  inputs: NamedInputs<K>,
  stages: NamedStages<K>,
  options?: PipelineOptions,
): Record<K, AsyncGenerator<T>>;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Pipeline implementation.
 *
 * Creates a processing pipeline from media components.
 * Automatically handles type conversions and proper flushing order.
 *
 * @param args - Variable arguments depending on pipeline type
 *
 * @returns PipelineControl if output is present, AsyncGenerator otherwise
 *
 * @example
 * ```typescript
 * // Simple pipeline
 * const control = pipeline(
 *   input,
 *   decoder,
 *   filter,
 *   encoder,
 *   output
 * );
 * await control.completion;
 *
 * // Named pipeline for muxing
 * const control = pipeline(
 *   { video: videoInput, audio: audioInput },
 *   {
 *     video: [videoDecoder, scaleFilter, videoEncoder],
 *     audio: [audioDecoder, volumeFilter, audioEncoder]
 *   },
 *   output
 * );
 * await control.completion;
 * ```
 */
export function pipeline(...args: any[]): PipelineControl | AsyncGenerator<Packet | Frame | null> | Record<StreamName, AsyncGenerator<Packet | Frame | null>> {
  // Extract PipelineOptions if last arg is undefined or a PipelineOptions object.
  // PipelineOptions is identified as a plain object whose only known key is 'signal'.
  // This distinguishes it from NamedInputs/NamedStages/NamedOutputs which have stream name keys.
  let pipelineOptions: PipelineOptions | undefined;
  const lastArg = args[args.length - 1];
  if (lastArg === undefined) {
    args.pop();
  } else if (args.length > 0 && typeof lastArg === 'object' && lastArg !== null && Object.getPrototypeOf(lastArg) === Object.prototype && 'signal' in lastArg) {
    pipelineOptions = args.pop() as PipelineOptions;
  }
  pipelineOptions?.signal?.throwIfAborted();

  // Detect pipeline type based on first argument
  const firstArg = args[0];
  const secondArg = args[1];

  // Check for shared Demuxer + NamedStages pattern
  if (isDemuxer(firstArg) && isNamedStages(secondArg)) {
    // Convert shared input to NamedInputs based on stages keys
    const sharedInput = firstArg;
    const stages = secondArg;
    const namedInputs: any = {};

    // Create NamedInputs with shared input for all streams in stages
    for (const streamName of Object.keys(stages)) {
      namedInputs[streamName] = sharedInput;
    }

    if (args.length === 3) {
      // Full named pipeline with output(s)
      return runNamedPipeline(namedInputs, stages, args[2], pipelineOptions);
    } else {
      // Partial named pipeline
      return runNamedPartialPipeline(namedInputs, stages);
    }
  }

  if (isNamedInputs(firstArg)) {
    // Named pipeline (2 or 3 arguments)
    if (args.length === 2) {
      // Partial named pipeline - return generators
      return runNamedPartialPipeline(args[0], args[1]);
    } else {
      // Full named pipeline with output
      return runNamedPipeline(args[0], args[1], args[2], pipelineOptions);
    }
  } else if (isDemuxer(firstArg)) {
    // Check if this is a stream copy (Demuxer → Muxer)
    if (args.length === 2 && isMuxer(args[1])) {
      // Stream copy all streams
      return runDemuxerPipeline(args[0], args[1], pipelineOptions);
    } else {
      // Simple pipeline starting with Demuxer
      return runSimplePipeline(args, pipelineOptions);
    }
  } else {
    // Simple pipeline (variable arguments)
    return runSimplePipeline(args, pipelineOptions);
  }
}

// ============================================================================
// PipelineControl Implementation
// ============================================================================

/**
 * Pipeline control implementation.
 *
 * @internal
 */
class PipelineControlImpl implements PipelineControl {
  private _stopped = false;
  private _completion: Promise<void>;
  private signalCleanup?: () => void;

  /**
   * @param executionPromise - Promise that resolves when pipeline completes
   *
   * @param signal - Optional AbortSignal for cancellation
   *
   * @internal
   */
  constructor(executionPromise: Promise<void>, signal?: AbortSignal) {
    // Don't resolve immediately on stop, wait for the actual pipeline to finish
    this._completion = executionPromise;

    if (signal) {
      const handler = () => this.stop();
      signal.addEventListener('abort', handler, { once: true });
      this.signalCleanup = () => signal.removeEventListener('abort', handler);
    }
  }

  /**
   * Stop the pipeline.
   *
   * @example
   * ```typescript
   * const control = pipeline(input, decoder, filter, encoder, output);
   * control.stop();
   * ```
   *
   * @see {@link PipelineControl.isStopped}
   */
  stop(): void {
    this._stopped = true;
    this.signalCleanup?.();
    this.signalCleanup = undefined;
  }

  /**
   * Check if pipeline is stopped.
   *
   * @returns True if stopped
   *
   * @example
   * ```typescript
   * const control = pipeline(input, decoder, filter, encoder, output);
   * const isStopped = control.isStopped();
   * ```
   *
   * @see {@link PipelineControl.stop}
   */
  isStopped(): boolean {
    return this._stopped;
  }

  /**
   * Get completion promise.
   */
  get completion(): Promise<void> {
    return this._completion;
  }
}

// ============================================================================
// Demuxer Pipeline Implementation
// ============================================================================

/**
 * Run a demuxer pipeline for stream copy.
 *
 * @param input - Media input source
 *
 * @param output - Media output destination
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control interface
 *
 * @internal
 */
function runDemuxerPipeline(input: Demuxer, output: Muxer, options?: PipelineOptions): PipelineControl {
  let control: PipelineControl;
  // eslint-disable-next-line prefer-const
  control = new PipelineControlImpl(
    runDemuxerPipelineAsync(input, output, () => control?.isStopped() ?? false),
    options?.signal,
  );
  return control;
}

/**
 * Run demuxer pipeline asynchronously.
 *
 * @param input - Media input source
 *
 * @param output - Media output destination
 *
 * @param shouldStop - Function to check if pipeline should stop
 *
 * @internal
 */
async function runDemuxerPipelineAsync(input: Demuxer, output: Muxer, shouldStop: () => boolean): Promise<void> {
  // Get all streams from input
  const videoStream = input.video();
  const audioStream = input.audio();
  const streams: { stream: any; index: number }[] = [];

  // Add video stream if present
  if (videoStream) {
    const outputIndex = output.addStream(videoStream);
    streams.push({ stream: videoStream, index: outputIndex });
  }

  // Add audio stream if present
  if (audioStream) {
    const outputIndex = output.addStream(audioStream);
    streams.push({ stream: audioStream, index: outputIndex });
  }

  // Add any other streams
  const allStreams = input.streams;
  for (const stream of allStreams) {
    // Skip if already added
    if (stream !== videoStream && stream !== audioStream) {
      const outputIndex = output.addStream(stream);
      streams.push({ stream, index: outputIndex });
    }
  }

  // Get iterator to properly clean up on stop
  const packetsIterable = input.packets();
  const iterator = packetsIterable[Symbol.asyncIterator]();

  try {
    // Copy all packets
    while (true) {
      // Check if we should stop before getting next item
      if (shouldStop()) {
        break;
      }

      const { value: packet, done } = await iterator.next();
      if (done) break;

      // Handle EOF signal (null packet from input means all streams are done)
      if (packet === null) {
        // Signal EOF for all streams
        for (const mapping of streams) {
          await output.writePacket(null, mapping.index);
        }
        break;
      }

      try {
        // Find the corresponding output stream index
        const mapping = streams.find((s) => s.stream.index === packet.streamIndex);
        if (mapping) {
          await output.writePacket(packet, mapping.index);
        }
      } finally {
        // Free the packet after use
        if (packet && typeof packet.free === 'function') {
          packet.free();
        }
      }
    }
  } finally {
    // Always clean up the generator to prevent memory leaks
    if (iterator.return) {
      await iterator.return(undefined);
    }
  }

  await output.close();
}

// ============================================================================
// Simple Pipeline Implementation
// ============================================================================

/**
 * Run a simple linear pipeline.
 *
 * @param args - Pipeline arguments
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control or async generator
 *
 * @internal
 */
function runSimplePipeline(args: any[], options?: PipelineOptions): PipelineControl | AsyncGenerator<Packet | Frame | null> {
  const [source, ...stages] = args;

  // Check if last stage is Muxer (consumes stream)
  const lastStage = stages[stages.length - 1];
  const isOutput = isMuxer(lastStage);

  // Track metadata through pipeline
  const metadata: StreamMetadata = {};

  // Store Demuxer reference if we have one
  if (isDemuxer(source)) {
    metadata.demuxer = source;
  }

  // Build the pipeline generator
  // If output is present, exclude it from stages for processing
  const processStages = isOutput ? stages.slice(0, -1) : stages;

  // Process metadata first by walking through stages
  for (const stage of processStages) {
    if (isDecoder(stage)) {
      metadata.decoder = stage;
    } else if (isEncoder(stage)) {
      metadata.encoder = stage;
    } else if (isBitStreamFilterAPI(stage)) {
      metadata.bitStreamFilter = stage;
    }
  }

  // Convert Demuxer to packet stream if needed
  // If we have a decoder or BSF, filter packets by stream index
  let actualSource: AsyncIterable<Packet | Frame | null>;
  if (isDemuxer(source)) {
    if (metadata.decoder) {
      // Filter packets for the decoder's stream
      const streamIndex = metadata.decoder.getStream().index;
      actualSource = source.packets(streamIndex);
    } else if (metadata.bitStreamFilter) {
      // Filter packets for the BSF's stream
      const streamIndex = metadata.bitStreamFilter.getStream().index;
      actualSource = source.packets(streamIndex);
    } else {
      // No decoder or BSF, pass all packets
      actualSource = source.packets();
    }
  } else {
    actualSource = source;
  }

  const generator = buildSimplePipeline(actualSource, processStages);

  // If output, consume the generator
  if (isOutput) {
    let control: PipelineControl;
    // eslint-disable-next-line prefer-const
    control = new PipelineControlImpl(
      consumeSimplePipeline(generator, lastStage, metadata, () => control?.isStopped() ?? false),
      options?.signal,
    );
    return control;
  }

  // Otherwise return the generator for further processing
  return generator;
}

/**
 * Build a simple pipeline generator.
 *
 * @param source - Source of packets or frames
 *
 * @param stages - Processing stages
 *
 * @yields {Packet | Frame} Processed packets or frames
 *
 * @internal
 */
async function* buildSimplePipeline(
  source: AsyncIterable<Packet | Frame | null>,
  stages: (Decoder | Encoder | FilterAPI | FilterAPI[] | BitStreamFilterAPI | BitStreamFilterAPI[] | Muxer)[],
): AsyncGenerator<Packet | Frame | null> {
  let stream: AsyncIterable<any> = source;

  for (const stage of stages) {
    if (isDecoder(stage)) {
      stream = stage.frames(stream as AsyncIterable<Packet>);
    } else if (isEncoder(stage)) {
      stream = stage.packets(stream as AsyncIterable<Frame>);
    } else if (isFilterAPI(stage)) {
      stream = stage.frames(stream as AsyncIterable<Frame>);
    } else if (isBitStreamFilterAPI(stage)) {
      stream = stage.packets(stream as AsyncIterable<Packet>);
    } else if (Array.isArray(stage)) {
      // Chain multiple filters or BSFs
      for (const filter of stage) {
        if (isFilterAPI(filter)) {
          stream = filter.frames(stream as AsyncIterable<Frame>);
        } else if (isBitStreamFilterAPI(filter)) {
          stream = filter.packets(stream as AsyncIterable<Packet>);
        }
      }
    }
  }

  yield* stream;
}

/**
 * Consume a simple pipeline stream and write to output.
 *
 * @param stream - Stream of packets or frames
 *
 * @param output - Media output destination
 *
 * @param metadata - Stream metadata
 *
 * @param shouldStop - Function to check if pipeline should stop
 *
 * @internal
 */
async function consumeSimplePipeline(stream: AsyncIterable<Packet | Frame | null>, output: Muxer, metadata: StreamMetadata, shouldStop: () => boolean): Promise<void> {
  // Add stream to output if we have encoder or decoder info
  let streamIndex = 0;

  if (metadata.encoder) {
    // Encoding path
    if (metadata.decoder) {
      // Have decoder - use its stream for metadata/properties
      const originalStream = metadata.decoder.getStream();
      streamIndex = output.addStream(originalStream, { encoder: metadata.encoder, bsf: metadata.bitStreamFilter });
    } else {
      // Encoder-only mode (e.g., frame generator) - no input stream
      streamIndex = output.addStream(metadata.encoder, { bsf: metadata.bitStreamFilter });
    }
  } else if (metadata.decoder) {
    // Stream copy - use decoder's original stream
    const originalStream = metadata.decoder.getStream();
    streamIndex = output.addStream(originalStream);
  } else if (metadata.bitStreamFilter) {
    // BSF without encoder/decoder - use BSF's original stream
    const originalStream = metadata.bitStreamFilter.getStream();
    streamIndex = output.addStream(originalStream);
  } else {
    // For direct Demuxer → Muxer, we redirect to runDemuxerPipeline
    // This case shouldn't happen in simple pipeline
    throw new Error('Cannot determine stream configuration. This is likely a bug in the pipeline.');
  }

  // Get iterator to properly clean up on stop
  const iterator = stream[Symbol.asyncIterator]();

  try {
    // Process stream
    while (true) {
      // Check if we should stop before getting next item
      if (shouldStop()) {
        break;
      }

      const { value: item, done } = await iterator.next();
      if (done) break;

      // Handle EOF signal
      if (item === null) {
        await output.writePacket(null, streamIndex);
        break;
      }

      // Use explicit resource management for the item
      try {
        if (isPacket(item) || item === null) {
          await output.writePacket(item, streamIndex);
        } else {
          throw new Error('Cannot write frames directly to Muxer. Use an encoder first.');
        }
      } finally {
        // Free the packet/frame after use
        if (item && typeof item.free === 'function') {
          item.free();
        }
      }
    }
  } finally {
    // Always clean up the generator to prevent memory leaks
    if (iterator.return) {
      await iterator.return(undefined);
    }
  }

  await output.close();
}

// ============================================================================
// Named Pipeline Implementation
// ============================================================================

/**
 * Run a named partial pipeline.
 *
 * @param inputs - Named input sources
 *
 * @param stages - Named processing stages
 *
 * @returns Record of async generators
 *
 * @internal
 */
function runNamedPartialPipeline<K extends StreamName>(inputs: NamedInputs<K>, stages: NamedStages<K>): Record<K, AsyncGenerator<Packet | Frame | null>> {
  const result = {} as Record<K, AsyncGenerator<Packet | Frame | null>>;

  for (const [streamName, streamStages] of Object.entries(stages) as [
    StreamName,
    (Decoder | FilterAPI | FilterAPI[] | Encoder | BitStreamFilterAPI | BitStreamFilterAPI[] | undefined)[] | 'passthrough',
  ][]) {
    const input = (inputs as any)[streamName] as Demuxer;
    if (!input) {
      throw new Error(`No input found for stream: ${streamName}`);
    }

    // Get the appropriate stream based on the stream name
    let stream: Stream | null = null;
    switch (streamName) {
      case 'video':
        stream = input.video() ?? null;
        break;
      case 'audio':
        stream = input.audio() ?? null;
        break;
      default:
        // This should never happen
        throw new Error(`Invalid stream name: ${streamName}. Must be 'video' or 'audio'.`);
    }

    if (!stream) {
      throw new Error(`No ${streamName} stream found in input.`);
    }

    // Normalize stages: if array contains only undefined, treat as passthrough
    // Also filter out undefined entries from the array
    let normalizedStages: typeof streamStages = streamStages;
    if (Array.isArray(streamStages)) {
      const definedStages = streamStages.filter((stage) => stage !== undefined);
      if (definedStages.length === 0) {
        normalizedStages = 'passthrough';
      } else {
        normalizedStages = definedStages;
      }
    }

    if (normalizedStages === 'passthrough') {
      // Direct passthrough - return input packets for this specific stream
      (result as any)[streamName] = (async function* () {
        for await (const packet of input.packets(stream.index)) {
          yield packet;
        }
      })();
    } else {
      // Process the stream - pass packets for this specific stream only
      // Build pipeline for this stream (can return frames or packets)
      const metadata: StreamMetadata = {};
      const stages = normalizedStages;
      (result as any)[streamName] = buildFlexibleNamedStreamPipeline(input.packets(stream.index), stages, metadata);
    }
  }

  return result;
}

/**
 * Run a named pipeline with outputs.
 *
 * @param inputs - Named input sources
 *
 * @param stages - Named processing stages
 *
 * @param output - Output destination(s)
 *
 * @param options - Pipeline options for cancellation support
 *
 * @returns Pipeline control interface
 *
 * @internal
 */
function runNamedPipeline<K extends StreamName>(
  inputs: NamedInputs<K>,
  stages: NamedStages<K>,
  output: Muxer | NamedOutputs<K>,
  options?: PipelineOptions,
): PipelineControl {
  let control: PipelineControl;
  // eslint-disable-next-line prefer-const
  control = new PipelineControlImpl(
    runNamedPipelineAsync(inputs, stages, output, () => control?.isStopped() ?? false),
    options?.signal,
  );
  return control;
}

/**
 * Run named pipeline asynchronously.
 *
 * @param inputs - Named input sources
 *
 * @param stages - Named processing stages
 *
 * @param output - Output destination(s)
 *
 * @param shouldStop - Function to check if pipeline should stop
 *
 * @internal
 */
async function runNamedPipelineAsync<K extends StreamName>(
  inputs: NamedInputs<K>,
  stages: NamedStages<K>,
  output: Muxer | NamedOutputs<K>,
  shouldStop: () => boolean,
): Promise<void> {
  // Check if all inputs reference the same Demuxer instance
  const inputValues: Demuxer[] = Object.values(inputs);
  const allSameInput = inputValues.length > 1 && inputValues.every((input) => input === inputValues[0]);

  // Track metadata for each stream
  const streamMetadata: Partial<Record<StreamName, StreamMetadata>> = {};

  // Process each named stream into generators
  const processedStreams: Partial<Record<StreamName, AsyncIterable<Packet | null>>> = {};

  // If all inputs are the same instance, use Demuxer's built-in parallel packet generators
  if (allSameInput) {
    const sharedInput = inputValues[0];

    // Single pass: collect metadata and build pipelines directly using input.packets(streamIndex)
    for (const [streamName, streamStages] of Object.entries(stages) as [
      StreamName,
      (Decoder | FilterAPI | FilterAPI[] | Encoder | BitStreamFilterAPI | BitStreamFilterAPI[] | undefined)[] | 'passthrough',
    ][]) {
      const metadata: StreamMetadata = {};
      streamMetadata[streamName] = metadata;

      // Normalize stages
      let normalizedStages: typeof streamStages = streamStages;
      if (Array.isArray(streamStages)) {
        const definedStages = streamStages.filter((stage) => stage !== undefined);
        if (definedStages.length === 0) {
          normalizedStages = 'passthrough';
        } else {
          normalizedStages = definedStages;
        }
      }

      // Determine stream index and build pipeline
      let streamIndex: number | undefined;
      if (normalizedStages !== 'passthrough') {
        const stages = normalizedStages;
        // Set stream type
        metadata.type = streamName;

        // Populate metadata by walking through ALL stages
        for (const stage of stages) {
          if (isDecoder(stage)) {
            metadata.decoder = stage;
            streamIndex ??= stage.getStream().index;
          } else if (isBitStreamFilterAPI(stage)) {
            metadata.bitStreamFilter = stage;
            streamIndex ??= stage.getStream().index;
          } else if (isEncoder(stage)) {
            metadata.encoder = stage;
          }
        }

        // If no decoder/BSF, use stream name to determine index
        if (streamIndex === undefined) {
          const stream = streamName === 'video' ? sharedInput.video() : sharedInput.audio();
          if (!stream) {
            throw new Error(`No ${streamName} stream found in input.`);
          }
          streamIndex = stream.index;
        }

        // Build pipeline with packets from this specific stream
        processedStreams[streamName] = buildNamedStreamPipeline(sharedInput.packets(streamIndex), stages, metadata);
      } else {
        // Passthrough - use Demuxer's built-in stream filtering
        metadata.type = streamName;
        metadata.demuxer = sharedInput;
        const stream = streamName === 'video' ? sharedInput.video() : sharedInput.audio();
        if (!stream) {
          throw new Error(`No ${streamName} stream found in input for passthrough.`);
        }
        streamIndex = stream.index;

        // Direct passthrough using input.packets(streamIndex)
        processedStreams[streamName] = sharedInput.packets(streamIndex);
      }
    }
  } else {
    // Original logic: separate inputs or single input
    for (const [streamName, streamStages] of Object.entries(stages) as [
      StreamName,
      (Decoder | FilterAPI | FilterAPI[] | Encoder | BitStreamFilterAPI | BitStreamFilterAPI[] | undefined)[] | 'passthrough',
    ][]) {
      const metadata: StreamMetadata = {};
      streamMetadata[streamName] = metadata;

      const input = (inputs as any)[streamName] as Demuxer;
      if (!input) {
        throw new Error(`No input found for stream: ${streamName}`);
      }

      // Normalize stages: if array contains only undefined, treat as passthrough
      // Also filter out undefined entries from the array
      let normalizedStages: typeof streamStages = streamStages;
      if (Array.isArray(streamStages)) {
        const definedStages = streamStages.filter((stage) => stage !== undefined);
        if (definedStages.length === 0) {
          normalizedStages = 'passthrough';
        } else {
          normalizedStages = definedStages;
        }
      }

      if (normalizedStages === 'passthrough') {
        // Direct passthrough - no processing
        let stream: Stream | null = null;

        switch (streamName) {
          case 'video':
            stream = input.video() ?? null;
            metadata.type = 'video';
            break;
          case 'audio':
            stream = input.audio() ?? null;
            metadata.type = 'audio';
            break;
        }

        if (!stream) {
          throw new Error(`No ${streamName} stream found in input for passthrough.`);
        }

        processedStreams[streamName] = input.packets(stream.index);
        metadata.demuxer = input; // Track Demuxer for passthrough
      } else {
        // Process the stream - normalizedStages is guaranteed to be an array here
        const stages = normalizedStages;

        // Pre-populate metadata by walking through stages
        for (const stage of stages) {
          if (isDecoder(stage)) {
            metadata.decoder = stage;
          } else if (isEncoder(stage)) {
            metadata.encoder = stage;
          } else if (isBitStreamFilterAPI(stage)) {
            metadata.bitStreamFilter = stage;
          }
        }

        // Get packets - filter by stream index based on decoder, BSF, or stream type
        let packets: AsyncIterable<Packet | null>;
        if (metadata.decoder) {
          const streamIndex = metadata.decoder.getStream().index;
          packets = input.packets(streamIndex);
        } else if (metadata.bitStreamFilter) {
          const streamIndex = metadata.bitStreamFilter.getStream().index;
          packets = input.packets(streamIndex);
        } else {
          // No decoder or BSF - determine stream by name
          let stream: Stream | null = null;
          switch (streamName) {
            case 'video':
              stream = input.video() ?? null;
              break;
            case 'audio':
              stream = input.audio() ?? null;
              break;
          }

          if (!stream) {
            throw new Error(`No ${streamName} stream found in input.`);
          }

          packets = input.packets(stream.index);
        }

        // Build pipeline for this stream
        processedStreams[streamName] = buildNamedStreamPipeline(packets, stages, metadata);
      }
    }
  }

  // Write to output(s)
  if (isMuxer(output)) {
    // Always write streams in parallel - Muxer's SyncQueue handles interleaving internally
    const streamIndices: Partial<Record<StreamName, number>> = {};

    // Add all streams to output first
    for (const [name, meta] of Object.entries(streamMetadata) as [StreamName, StreamMetadata][]) {
      if (meta.encoder) {
        // Encoding path
        if (meta.decoder) {
          // Have decoder - use its stream for metadata/properties
          const originalStream = meta.decoder.getStream();
          streamIndices[name] = output.addStream(originalStream, { encoder: meta.encoder, bsf: meta.bitStreamFilter });
        } else {
          // Encoder-only mode (e.g., frame generator) - no input stream
          streamIndices[name] = output.addStream(meta.encoder, { bsf: meta.bitStreamFilter });
        }
      } else if (meta.decoder) {
        // Stream copy - use decoder's original stream
        const originalStream = meta.decoder.getStream();
        streamIndices[name] = output.addStream(originalStream);
      } else if (meta.bitStreamFilter) {
        // BSF - use BSF's original stream
        const originalStream = meta.bitStreamFilter.getStream();
        streamIndices[name] = output.addStream(originalStream);
      } else if (meta.demuxer) {
        // Passthrough from Demuxer
        const stream = name.includes('video') ? meta.demuxer.video() : meta.demuxer.audio();
        if (!stream) {
          throw new Error(`No matching stream found in Demuxer for ${name}`);
        }
        streamIndices[name] = output.addStream(stream);
      } else {
        throw new Error(`Cannot determine stream configuration for ${name}. This is likely a bug in the pipeline.`);
      }
    }

    // Write all streams in parallel - Muxer's SyncQueue handles interleaving
    const promises: Promise<void>[] = [];
    for (const [name, stream] of Object.entries(processedStreams) as [StreamName, AsyncIterable<Packet>][]) {
      const streamIndex = streamIndices[name];
      if (streamIndex !== undefined) {
        promises.push(consumeStreamInParallel(stream, output, streamIndex, shouldStop));
      }
    }

    await Promise.all(promises);
    await output.close();
  } else {
    // Multiple outputs - write each stream to its output
    const outputs = output;
    const promises: Promise<void>[] = [];

    for (const [streamName, stream] of Object.entries(processedStreams) as [StreamName, AsyncIterable<Packet>][]) {
      const streamOutput = (outputs as any)[streamName] as Muxer | undefined;
      const metadata = streamMetadata[streamName];
      if (streamOutput && metadata) {
        promises.push(consumeNamedStream(stream, streamOutput, metadata, shouldStop));
      }
    }

    await Promise.all(promises);
  }
}

/**
 * Build a flexible named stream pipeline.
 *
 * @param source - Source packets
 *
 * @param stages - Processing stages
 *
 * @param metadata - Stream metadata
 *
 * @yields {Packet | Frame} Processed packets or frames
 *
 * @internal
 */
async function* buildFlexibleNamedStreamPipeline(
  source: AsyncIterable<Packet | null>,
  stages: (Decoder | FilterAPI | FilterAPI[] | Encoder | BitStreamFilterAPI | BitStreamFilterAPI[] | undefined)[],
  metadata: StreamMetadata,
): AsyncGenerator<Packet | Frame | null> {
  let stream: AsyncIterable<any> = source;

  for (const stage of stages) {
    if (isDecoder(stage)) {
      metadata.decoder = stage;
      stream = stage.frames(stream as AsyncIterable<Packet>);
    } else if (isEncoder(stage)) {
      metadata.encoder = stage;
      stream = stage.packets(stream as AsyncIterable<Frame>);
    } else if (isFilterAPI(stage)) {
      stream = stage.frames(stream as AsyncIterable<Frame>);
    } else if (isBitStreamFilterAPI(stage)) {
      metadata.bitStreamFilter = stage;
      stream = stage.packets(stream as AsyncIterable<Packet>);
    } else if (Array.isArray(stage)) {
      // Chain multiple filters or BSFs
      for (const filter of stage) {
        if (isFilterAPI(filter)) {
          stream = filter.frames(stream as AsyncIterable<Frame>);
        } else if (isBitStreamFilterAPI(filter)) {
          stream = filter.packets(stream as AsyncIterable<Packet>);
        }
      }
    }
  }

  // Yield whatever the pipeline produces (frames or packets)
  yield* stream;
}

/**
 * Build a named stream pipeline.
 *
 * @param source - Source packets
 *
 * @param stages - Processing stages
 *
 * @param metadata - Stream metadata
 *
 * @yields {Packet} Processed packets
 *
 * @internal
 */
async function* buildNamedStreamPipeline(
  source: AsyncIterable<Packet | null>,
  stages: (Decoder | FilterAPI | FilterAPI[] | Encoder | BitStreamFilterAPI | BitStreamFilterAPI[] | undefined)[],
  metadata: StreamMetadata,
): AsyncGenerator<Packet | null> {
  let stream: AsyncIterable<any> = source;

  for (const stage of stages) {
    if (isDecoder(stage)) {
      metadata.decoder = stage;
      stream = stage.frames(stream as AsyncIterable<Packet>);
    } else if (isEncoder(stage)) {
      metadata.encoder = stage;
      stream = stage.packets(stream as AsyncIterable<Frame>);
    } else if (isFilterAPI(stage)) {
      stream = stage.frames(stream as AsyncIterable<Frame>);
    } else if (isBitStreamFilterAPI(stage)) {
      metadata.bitStreamFilter = stage;
      stream = stage.packets(stream as AsyncIterable<Packet>);
    } else if (Array.isArray(stage)) {
      // Chain multiple filters or BSFs
      for (const filter of stage) {
        if (isFilterAPI(filter)) {
          stream = filter.frames(stream as AsyncIterable<Frame>);
        } else if (isBitStreamFilterAPI(filter)) {
          stream = filter.packets(stream as AsyncIterable<Packet>);
        }
      }
    }
  }

  // Ensure we're yielding packets
  for await (const item of stream) {
    if (isPacket(item) || item === null) {
      yield item;
    } else {
      throw new Error('Named pipeline must end with packets (use encoder after filters)');
    }
  }
}

/**
 * Consume a stream in parallel (for passthrough pipelines).
 * Stream index is already added to output.
 *
 * @param stream - Stream of packets
 *
 * @param output - Media output destination
 *
 * @param streamIndex - Pre-allocated stream index in output
 *
 * @param shouldStop - Function to check if pipeline should stop
 *
 * @internal
 */
async function consumeStreamInParallel(stream: AsyncIterable<Packet | null>, output: Muxer, streamIndex: number, shouldStop: () => boolean): Promise<void> {
  // Get iterator to properly clean up on stop
  const iterator = stream[Symbol.asyncIterator]();

  try {
    // Write all packets (including EOF null)
    while (true) {
      // Check if we should stop before getting next item
      if (shouldStop()) {
        break;
      }

      const { value: packet, done } = await iterator.next();
      if (done) break;

      try {
        await output.writePacket(packet, streamIndex);
      } finally {
        // Free the packet after use (but not null)
        if (packet && typeof packet.free === 'function') {
          packet.free();
        }
      }
    }
  } finally {
    // Always clean up the generator to prevent memory leaks
    if (iterator.return) {
      await iterator.return(undefined);
    }
  }

  // Note: Don't close output here - it will be closed by the caller after all streams finish
}

/**
 * Consume a named stream and write to output.
 *
 * @param stream - Stream of packets
 *
 * @param output - Media output destination
 *
 * @param metadata - Stream metadata
 *
 * @param shouldStop - Function to check if pipeline should stop
 *
 * @internal
 */
async function consumeNamedStream(stream: AsyncIterable<Packet | null>, output: Muxer, metadata: StreamMetadata, shouldStop: () => boolean): Promise<void> {
  // Add stream to output
  let streamIndex = 0;

  if (metadata.encoder) {
    // Encoding path
    if (metadata.decoder) {
      // Have decoder - use its stream for metadata/properties
      const originalStream = metadata.decoder.getStream();
      streamIndex = output.addStream(originalStream, { encoder: metadata.encoder, bsf: metadata.bitStreamFilter });
    } else {
      // Encoder-only mode (e.g., frame generator) - no input stream
      streamIndex = output.addStream(metadata.encoder, { bsf: metadata.bitStreamFilter });
    }
  } else if (metadata.decoder) {
    // Stream copy - use decoder's original stream
    const originalStream = metadata.decoder.getStream();
    streamIndex = output.addStream(originalStream);
  } else if (metadata.bitStreamFilter) {
    // BSF - use BSF's original stream
    const originalStream = metadata.bitStreamFilter.getStream();
    streamIndex = output.addStream(originalStream);
  } else if (metadata.demuxer) {
    // Passthrough from Demuxer - use type hint from metadata
    const inputStream = metadata.type === 'video' ? metadata.demuxer.video() : metadata.demuxer.audio();
    if (!inputStream) {
      throw new Error(`No ${metadata.type} stream found in Demuxer`);
    }
    streamIndex = output.addStream(inputStream);
  } else {
    // This should not happen with the new API
    throw new Error('Cannot determine stream configuration. This is likely a bug in the pipeline.');
  }

  // Store for later use
  metadata.streamIndex = streamIndex;

  // Get iterator to properly clean up on stop
  const iterator = stream[Symbol.asyncIterator]();

  try {
    // Write all packets (including EOF null)
    while (true) {
      // Check if we should stop before getting next item
      if (shouldStop()) {
        break;
      }

      const { value: packet, done } = await iterator.next();
      if (done) break;

      try {
        await output.writePacket(packet, streamIndex);
      } finally {
        // Free the packet after use (but not null)
        if (packet && typeof packet.free === 'function') {
          packet.free();
        }
      }
    }
  } finally {
    // Always clean up the generator to prevent memory leaks
    if (iterator.return) {
      await iterator.return(undefined);
    }
  }

  // Note: Output is closed by the caller after all streams finish
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if object is named inputs.
 *
 * @param obj - Object to check
 *
 * @returns True if object is NamedInputs
 *
 * @internal
 */
function isNamedInputs(obj: any): obj is NamedInputs<any> {
  return obj && typeof obj === 'object' && !Array.isArray(obj) && !isAsyncIterable(obj) && !isDemuxer(obj);
}

/**
 * Check if object is named stages.
 *
 * @param obj - Object to check
 *
 * @returns True if object is NamedStages
 *
 * @internal
 */
function isNamedStages(obj: any): obj is NamedStages<any> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  // Check if object has at least one stream name key (video or audio)
  const keys = Object.keys(obj);
  return keys.length > 0 && keys.every((key) => key === 'video' || key === 'audio');
}

/**
 * Check if object is async iterable.
 *
 * @param obj - Object to check
 *
 * @returns True if object is AsyncIterable
 *
 * @internal
 */
function isAsyncIterable(obj: any): obj is AsyncIterable<any> {
  return obj && typeof obj[Symbol.asyncIterator] === 'function';
}

/**
 * Check if object is Demuxer.
 *
 * @param obj - Object to check
 *
 * @returns True if object is Demuxer
 *
 * @internal
 */
function isDemuxer(obj: any): obj is Demuxer {
  return obj && typeof obj.packets === 'function' && typeof obj.video === 'function' && typeof obj.audio === 'function';
}

/**
 * Check if object is Decoder.
 *
 * @param obj - Object to check
 *
 * @returns True if object is Decoder
 *
 * @internal
 */
function isDecoder(obj: any): obj is Decoder {
  return obj && typeof obj.decode === 'function' && typeof obj.flush === 'function';
}

/**
 * Check if object is Encoder.
 *
 * @param obj - Object to check
 *
 * @returns True if object is Encoder
 *
 * @internal
 */
function isEncoder(obj: any): obj is Encoder {
  return obj && typeof obj.encode === 'function' && typeof obj.flush === 'function';
}

/**
 * Check if object is FilterAPI.
 *
 * @param obj - Object to check
 *
 * @returns True if object is FilterAPI
 *
 * @internal
 */
function isFilterAPI(obj: any): obj is FilterAPI {
  return obj && typeof obj.process === 'function' && typeof obj.receive === 'function';
}

/**
 * Check if object is BitStreamFilterAPI.
 *
 * @param obj - Object to check
 *
 * @returns True if object is BitStreamFilterAPI
 *
 * @internal
 */
function isBitStreamFilterAPI(obj: any): obj is BitStreamFilterAPI {
  return obj && typeof obj.filter === 'function' && typeof obj.flushPackets === 'function' && typeof obj.reset === 'function';
}

/**
 * Check if object is Muxer.
 *
 * @param obj - Object to check
 *
 * @returns True if object is Muxer
 *
 * @internal
 */
function isMuxer(obj: any): obj is Muxer {
  return obj && typeof obj.writePacket === 'function' && typeof obj.addStream === 'function';
}

/**
 * Check if object is Packet.
 *
 * @param obj - Object to check
 *
 * @returns True if object is Packet
 *
 * @internal
 */
function isPacket(obj: any): obj is Packet {
  return obj && 'streamIndex' in obj && 'pts' in obj && 'dts' in obj;
}
