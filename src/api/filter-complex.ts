import {
  AV_BUFFERSRC_FLAG_KEEP_REF,
  AV_BUFFERSRC_FLAG_PUSH,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  AVFILTER_FLAG_HWDEVICE,
  AVMEDIA_TYPE_VIDEO,
  EOF,
} from '../constants/constants.js';
import { FFmpegError } from '../lib/error.js';
import { FilterGraph } from '../lib/filter-graph.js';
import { FilterInOut } from '../lib/filter-inout.js';
import { Filter } from '../lib/filter.js';
import { Frame } from '../lib/frame.js';
import { Rational } from '../lib/rational.js';
import { avGetSampleFmtName, avInvQ, avRescaleQ } from '../lib/utilities.js';

import type { AVBufferSrcFlag, AVMediaType, AVSampleFormat, EOFSignal } from '../constants/index.js';
import type { FilterContext } from '../lib/filter-context.js';
import type { IRational } from '../lib/types.js';
import type { FilterOptions } from './filter.js';

/**
 * Frame properties for change detection.
 *
 * @internal
 */
interface FrameProperties {
  format: number;
  width: number;
  height: number;
  sampleRate: number;
  channels: number;
}

/**
 * Internal input state tracking.
 *
 * @internal
 */
interface InputState {
  label: string;
  buffersrc: FilterContext | null;
  calculatedTimeBase?: IRational;
  queuedFrames: Frame[]; // Frames queued during initialization
  lastFrameProps?: FrameProperties; // For change detection
}

/**
 * Internal output state tracking.
 *
 * @internal
 */
interface OutputState {
  label: string;
  buffersink: FilterContext | null;
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
 * High-level filter_complex API for multi-input/output filtering.
 *
 * Provides simplified interface for complex FFmpeg filter graphs with multiple inputs and outputs.
 * Supports both high-level generator API and low-level manual control.
 *
 * @example
 * ```typescript
 * // High-level API: Simple overlay with frames() generator
 * using complex = FilterComplexAPI.create('[0:v][1:v]overlay=x=100:y=50[out]', {
 *   inputs: [{ label: '0:v' }, { label: '1:v' }],
 *   outputs: [{ label: 'out' }]
 * });
 *
 * // Process multiple input streams automatically
 * for await (using frame of complex.frames('out', {
 *   '0:v': decoder1.frames(packets1),
 *   '1:v': decoder2.frames(packets2)
 * })) {
 *   await encoder.encode(frame);
 * }
 * ```
 *
 * @see {@link FilterAPI} For simple single-input/output filtering
 * @see {@link FilterGraph} For low-level filter graph API
 * @see {@link frames} For high-level stream processing
 * @see {@link process} For low-level manual frame sending
 * @see {@link receive} For low-level manual frame receiving
 */
export class FilterComplexAPI implements Disposable {
  private graph: FilterGraph;
  private description: string;
  private options: FilterComplexOptions;

  // Input/Output state
  private inputs = new Map<string, InputState>();
  private outputs = new Map<string, OutputState>();

  // Initialization state
  private initialized = false;
  private isClosed = false;
  private initializePromise: Promise<void> | null = null;

  // Reusable frame for receive operations
  private frame: Frame = new Frame();

  /**
   * @param graph - Filter graph instance
   *
   * @param description - Filter description string
   *
   * @param options - Filter complex options
   *
   * @internal
   */
  private constructor(graph: FilterGraph, description: string, options: FilterComplexOptions) {
    this.graph = graph;
    this.description = description;
    this.options = options;
  }

  /**
   * Create a complex filter with specified configuration.
   *
   * Direct mapping to avfilter_graph_segment_parse() and avfilter_graph_config().
   *
   * @param description - Filter description string (e.g., '[0:v][1:v]overlay[out]')
   *
   * @param options - Filter complex configuration including inputs and outputs
   *
   * @returns Filter complex instance ready to process frames
   *
   * @throws {Error} If configuration is invalid (duplicate labels, no inputs/outputs)
   *
   * @example
   * ```typescript
   * // Simple overlay example
   * using complex = FilterComplexAPI.create(
   *   '[0:v][1:v]overlay=x=100:y=50[out]',
   *   {
   *     inputs: [
   *       { label: '0:v' },  // Base video
   *       { label: '1:v' }   // Overlay video
   *     ],
   *     outputs: [{ label: 'out' }]
   *   }
   * );
   *
   * // Send frames manually
   * await complex.process('0:v', baseFrame);
   * await complex.process('1:v', overlayFrame);
   * using outFrame = await complex.receive('out');
   * ```
   *
   * @see {@link process} For sending frames to inputs
   * @see {@link receive} For getting frames from outputs
   */
  static create(description: string, options: FilterComplexOptions): FilterComplexAPI {
    // Validate inputs and outputs
    if (!options.inputs || options.inputs.length === 0) {
      throw new Error('At least one input is required');
    }

    if (!options.outputs || options.outputs.length === 0) {
      throw new Error('At least one output is required');
    }

    // Check for duplicate input labels
    const inputLabels = new Set<string>();
    for (const input of options.inputs) {
      if (inputLabels.has(input.label)) {
        throw new Error(`Duplicate input label: ${input.label}`);
      }
      inputLabels.add(input.label);
    }

    // Check for duplicate output labels
    const outputLabels = new Set<string>();
    for (const output of options.outputs) {
      if (outputLabels.has(output.label)) {
        throw new Error(`Duplicate output label: ${output.label}`);
      }
      outputLabels.add(output.label);
    }

    // Create graph
    const graph = new FilterGraph();
    graph.alloc();

    // Configure threading
    if (options.threads !== undefined) {
      graph.nbThreads = options.threads;
    }

    const instance = new FilterComplexAPI(graph, description, options);

    // Initialize input states
    for (const input of options.inputs) {
      instance.inputs.set(input.label, {
        label: input.label,
        buffersrc: null,
        queuedFrames: [],
      });
    }

    // Initialize output states
    for (const output of options.outputs) {
      instance.outputs.set(output.label, {
        label: output.label,
        buffersink: null,
      });
    }

    return instance;
  }

  /**
   * Check if filter complex is open.
   *
   * @returns true if not closed
   *
   * @example
   * ```typescript
   * if (complex.isOpen) {
   *   // Can still consume frames
   * }
   * ```
   */
  get isOpen(): boolean {
    return !this.isClosed;
  }

  /**
   * Check if filter complex has been initialized.
   *
   * Returns true after first frame set has been processed from all inputs.
   *
   * @returns true if filter graph has been configured
   *
   * @example
   * ```typescript
   * if (!complex.isInitialized) {
   *   console.log('Filter will initialize on first frame set');
   * }
   * ```
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get output frame rate.
   *
   * Returns frame rate from the first output's buffersink.
   * Returns null if not initialized or frame rate is not set.
   *
   * @returns Frame rate as rational number or null
   *
   * @example
   * ```typescript
   * const frameRate = complex.frameRate;
   * if (frameRate) {
   *   console.log(`Output: ${frameRate.num}/${frameRate.den} fps`);
   * }
   * ```
   *
   * @see {@link FilterAPI.frameRate} For single-output filter frame rate
   */
  get frameRate(): IRational | null {
    if (!this.initialized || this.outputs.size === 0) {
      return null;
    }

    // Get frame rate from first output
    const firstOutput = this.outputs.values().next().value;
    if (!firstOutput?.buffersink) {
      return null;
    }

    const fr = firstOutput.buffersink.buffersinkGetFrameRate();
    // Return null if frame rate is not set (0/0 or 0/1)
    if (fr.num <= 0 || fr.den <= 0) {
      return null;
    }
    return fr;
  }

  /**
   * Get output time base.
   *
   * Returns time base from the first output's buffersink.
   * Returns null if not initialized.
   *
   * @returns Time base as rational number or null
   *
   * @example
   * ```typescript
   * const timeBase = complex.timeBase;
   * if (timeBase) {
   *   console.log(`Output timeBase: ${timeBase.num}/${timeBase.den}`);
   * }
   * ```
   *
   * @see {@link FilterAPI.timeBase} For single-output filter time base
   */
  get timeBase(): IRational | null {
    if (!this.initialized || this.outputs.size === 0) {
      return null;
    }

    // Get time base from first output
    const firstOutput = this.outputs.values().next().value;
    if (!firstOutput?.buffersink) {
      return null;
    }

    return firstOutput.buffersink.buffersinkGetTimeBase();
  }

  /**
   * Process frame by sending to specified input.
   *
   * Sends a frame to the buffersrc of the specified input label.
   * Automatically rescales timestamps to the input's calculated timeBase (CFR/VFR).
   * Pass null to signal end-of-stream for that input.
   *
   * Direct mapping to av_buffersrc_add_frame().
   *
   * @param inLabel - Input label to send frame to
   *
   * @param frame - Frame to process
   *
   * @throws {Error} If input label not found or filter closed
   *
   * @throws {FFmpegError} If processing fails
   *
   * @example
   * ```typescript
   * // Process frames one at a time
   * await complex.process('0:v', frame1);
   * await complex.process('1:v', frame2);
   * const outFrame = await complex.receive('out');
   * ```
   *
   * @see {@link receive} For receiving output frames
   * @see {@link flush} For flushing inputs
   * @see {@link processSync} For synchronous version
   */
  async process(inLabel: string, frame: Frame): Promise<void> {
    if (this.isClosed) {
      throw new Error('FilterComplexAPI is already closed');
    }

    // Get input state
    const inputState = this.inputs.get(inLabel);
    if (!inputState) {
      throw new Error(`Input '${inLabel}' not found`);
    }

    // If not initialized, queue frame and try to initialize
    if (!this.initialized) {
      const cloned = frame.clone();
      if (!cloned) {
        throw new Error('Failed to clone frame for queuing');
      }
      inputState.queuedFrames.push(cloned);

      // Check if all inputs have at least one frame
      if (this.hasAllInputFormats()) {
        // All inputs ready → initialize graph and process queued frames
        this.initializePromise ??= this.initializeFromQueuedFrames();
        await this.initializePromise;
      }

      return;
    }

    // Already initialized → send frame directly
    if (!inputState.buffersrc || !inputState.calculatedTimeBase) {
      throw new Error(`Input '${inLabel}' buffersrc not initialized`);
    }

    // Rescale timestamps using helper
    this.rescaleFrameTimestamps(frame, inputState.calculatedTimeBase);

    // Send frame to buffersrc
    // KEEP_REF preserves the input frame's hw_frames_ctx for reuse across multiple filters
    const ret = await inputState.buffersrc.buffersrcAddFrame(frame, (AV_BUFFERSRC_FLAG_PUSH | AV_BUFFERSRC_FLAG_KEEP_REF) as AVBufferSrcFlag);
    FFmpegError.throwIfError(ret, `Failed to send frame to input ${inLabel}`);
  }

  /**
   * Process frame by sending to specified input synchronously.
   * Synchronous version of process.
   *
   * Sends a frame to the buffersrc of the specified input label.
   * Automatically rescales timestamps to the input's calculated timeBase (CFR/VFR).
   * Pass null to signal end-of-stream for that input.
   *
   * Direct mapping to av_buffersrc_add_frame().
   *
   * @param inLabel - Input label to send frame to
   *
   * @param frame - Frame to process
   *
   * @throws {Error} If input label not found or filter closed
   *
   * @throws {FFmpegError} If processing fails
   *
   * @example
   * ```typescript
   * // Process frames one at a time
   * complex.processSync('0:v', frame1);
   * complex.processSync('1:v', frame2);
   * const outFrame = complex.receiveSync('out');
   * ```
   *
   * @see {@link receiveSync} For receiving output frames
   * @see {@link flushSync} For flushing inputs
   * @see {@link process} For async version
   */
  processSync(inLabel: string, frame: Frame): void {
    if (this.isClosed) {
      throw new Error('FilterComplexAPI is already closed');
    }

    // Get input state
    const inputState = this.inputs.get(inLabel);
    if (!inputState) {
      throw new Error(`Input '${inLabel}' not found`);
    }

    // If not initialized, queue frame and try to initialize
    if (!this.initialized) {
      const cloned = frame.clone();
      if (!cloned) {
        throw new Error('Failed to clone frame for queuing');
      }
      inputState.queuedFrames.push(cloned);

      // Check if all inputs have at least one frame
      if (this.hasAllInputFormats()) {
        // All inputs ready → initialize graph and process queued frames synchronously
        this.initializeFromQueuedFramesSync();
      }

      return;
    }

    // Already initialized → send frame directly
    if (!inputState.buffersrc || !inputState.calculatedTimeBase) {
      throw new Error(`Input '${inLabel}' buffersrc not initialized`);
    }

    // Rescale timestamps using helper
    this.rescaleFrameTimestamps(frame, inputState.calculatedTimeBase);

    // Send frame to buffersrc
    // KEEP_REF preserves the input frame's hw_frames_ctx for reuse across multiple filters
    const ret = inputState.buffersrc.buffersrcAddFrameSync(frame, (AV_BUFFERSRC_FLAG_PUSH | AV_BUFFERSRC_FLAG_KEEP_REF) as AVBufferSrcFlag);
    FFmpegError.throwIfError(ret, `Failed to send frame to input ${inLabel}`);
  }

  /**
   * Process frame streams from multiple inputs and yield frames from specified output.
   *
   * High-level async generator for multi-input filtering.
   * Filter is only flushed when EOF (null) is explicitly sent to any input.
   *
   * **EOF Handling:**
   * - Filter is only flushed when EOF (null) is explicitly sent to ANY input
   * - Generator yields null after flushing when null is received
   * - No automatic flushing - filter stays open until EOF or close()
   * - Iterator completion without null does not trigger flush
   *
   * @param outLabel - Output label to receive frames from
   *
   * @param inputs - Record mapping input labels to frame sources (AsyncIterable, single Frame, or null)
   *
   * @yields {Frame | null} Filtered frames from output, followed by null when flushed
   *
   * @throws {Error} If input label not found
   *
   * @throws {FFmpegError} If processing fails
   *
   * @example
   * ```typescript
   * // Stream processing: 2 inputs, 1 output
   * using complex = FilterComplexAPI.create('[0:v][1:v]overlay[out]', {
   *   inputs: [{ label: '0:v' }, { label: '1:v' }],
   *   outputs: [{ label: 'out' }]
   * });
   *
   * for await (using frame of complex.frames('out', {
   *   '0:v': decoder1.frames(packets1),
   *   '1:v': decoder2.frames(packets2)
   * })) {
   *   await encoder.encode(frame);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Single frames - no automatic flush
   * for await (using frame of complex.frames('out', {
   *   '0:v': frame1,
   *   '1:v': frame2
   * })) {
   *   await encoder.encode(frame);
   * }
   * // Filter remains open, buffered frames not flushed
   * ```
   *
   * @example
   * ```typescript
   * // Explicit flush with null
   * for await (using frame of complex.frames('out', {
   *   '0:v': null,
   *   '1:v': null
   * })) {
   *   await encoder.encode(frame);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Mixed: stream + single frame
   * for await (using frame of complex.frames('out', {
   *   '0:v': decoder.frames(packets),  // Stream
   *   '1:v': watermarkFrame            // Single frame (used for all)
   * })) {
   *   await encoder.encode(frame);
   * }
   * ```
   *
   * @see {@link process} For manual frame sending
   * @see {@link receive} For manual frame receiving
   * @see {@link framesSync} For sync version
   */
  async *frames(outLabel: string, inputs: Record<string, AsyncIterable<Frame | null> | Frame | null>): AsyncGenerator<Frame | null> {
    // Validate output label
    if (!this.outputs.has(outLabel)) {
      throw new Error(`Output '${outLabel}' not found`);
    }

    // Validate all input labels exist
    for (const label of Object.keys(inputs)) {
      if (!this.inputs.has(label)) {
        throw new Error(`Input '${label}' not found in filter complex configuration`);
      }
    }

    // Helper to process a single frame and yield output
    const processFrame = async function* (this: FilterComplexAPI, label: string, frame: Frame): AsyncGenerator<Frame> {
      await this.process(label, frame);

      // Try to receive output frames
      while (true) {
        const outFrame = await this.receive(outLabel);
        if (!outFrame || outFrame === EOF) {
          break;
        }
        yield outFrame;
      }
    }.bind(this);

    // Helper to finalize (flush all inputs and yield remaining frames)
    const finalize = async function* (this: FilterComplexAPI): AsyncGenerator<Frame | null> {
      for await (const frame of this.flushFrames(outLabel)) {
        yield frame;
      }
      yield null;
    }.bind(this);

    // Separate inputs by type
    const iterableInputs = new Map<string, AsyncIterator<Frame | null>>();
    const singleFrameInputs: { label: string; frame: Frame }[] = [];
    const flushInputs = new Set<string>(); // Track which inputs to flush

    for (const [label, source] of Object.entries(inputs)) {
      if (source === null) {
        // null - flush this input
        flushInputs.add(label);
      } else if (source instanceof Frame) {
        // Single frame
        singleFrameInputs.push({ label, frame: source });
      } else {
        // AsyncIterable
        iterableInputs.set(label, source[Symbol.asyncIterator]());
      }
    }

    // If only single frames/nulls and no iterables
    if (iterableInputs.size === 0) {
      // Process single frames
      for (const { label, frame } of singleFrameInputs) {
        yield* processFrame(label, frame);
      }

      // Flush inputs that were null
      for (const label of flushInputs) {
        await this.flush(label);
      }

      // Only finalize if we flushed any inputs
      if (flushInputs.size > 0) {
        yield* finalize();
      }
      return;
    }

    // Process single frames first
    for (const { label, frame } of singleFrameInputs) {
      yield* processFrame(label, frame);
    }

    // Track which inputs have finished
    const finishedInputs = new Set<string>();
    let shouldFinalize = flushInputs.size > 0; // True if any single input was null

    // Process frames from iterable inputs in parallel
    while (finishedInputs.size < iterableInputs.size) {
      // Read one frame from each active input
      const readPromises: Promise<{ label: string; result: IteratorResult<Frame | null> }>[] = [];

      for (const [label, iterator] of iterableInputs) {
        if (!finishedInputs.has(label)) {
          readPromises.push(
            iterator.next().then((result) => ({
              label,
              result,
            })),
          );
        }
      }

      // Wait for all reads to complete
      const results = await Promise.all(readPromises);

      // Process each result
      for (const { label, result } of results) {
        if (result.done) {
          // Iterator finished without explicit null - no automatic flush
          finishedInputs.add(label);
          continue;
        }

        const frame = result.value;

        if (frame === null) {
          // Explicit null from input stream - flush this input
          await this.flush(label);
          shouldFinalize = true;
          finishedInputs.add(label);
        } else {
          // Send frame to input
          yield* processFrame(label, frame);
        }
      }

      // If we got null from stream, finalize and return
      if (shouldFinalize) {
        yield* finalize();
        return;
      }
    }

    // Iterators finished without explicit null - no automatic flush
  }

  /**
   * Process frame streams from multiple inputs and yield frames from specified output synchronously.
   * Synchronous version of frames.
   *
   * High-level sync generator for multi-input filtering.
   * Filter is only flushed when EOF (null) is explicitly sent to any input.
   *
   * **EOF Handling:**
   * - Filter is only flushed when EOF (null) is explicitly sent to ANY input
   * - Generator yields null after flushing when null is received
   * - No automatic flushing - filter stays open until EOF or close()
   * - Iterator completion without null does not trigger flush
   *
   * @param outLabel - Output label to receive frames from
   *
   * @param inputs - Record mapping input labels to frame sources (Iterable, single Frame, or null)
   *
   * @yields {Frame | null} Filtered frames from output, followed by null when flushed
   *
   * @throws {Error} If input label not found or filter not initialized
   *
   * @throws {FFmpegError} If processing fails
   *
   * @example
   * ```typescript
   * // Stream processing: 2 inputs, 1 output
   * using complex = FilterComplexAPI.create('[0:v][1:v]overlay[out]', {
   *   inputs: [{ label: '0:v' }, { label: '1:v' }],
   *   outputs: [{ label: 'out' }]
   * });
   *
   * // Note: Sync version requires async initialization first
   * await complex.process('0:v', firstFrame1);
   * await complex.process('1:v', firstFrame2);
   *
   * for (using frame of complex.framesSync('out', {
   *   '0:v': decoder1.framesSync(packets1),
   *   '1:v': decoder2.framesSync(packets2)
   * })) {
   *   encoder.encodeSync(frame);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Single frames
   * for (using frame of complex.framesSync('out', {
   *   '0:v': frame1,
   *   '1:v': frame2
   * })) {
   *   encoder.encodeSync(frame);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Explicit flush
   * for (using frame of complex.framesSync('out', {
   *   '0:v': null,
   *   '1:v': null
   * })) {
   *   encoder.encodeSync(frame);
   * }
   * ```
   *
   * @see {@link processSync} For manual frame sending
   * @see {@link receiveSync} For manual frame receiving
   * @see {@link frames} For async version with lazy initialization
   */
  *framesSync(outLabel: string, inputs: Record<string, Iterable<Frame | null> | Frame | null>): Generator<Frame | null> {
    // Validate output label
    if (!this.outputs.has(outLabel)) {
      throw new Error(`Output '${outLabel}' not found`);
    }

    // Validate all input labels exist
    for (const label of Object.keys(inputs)) {
      if (!this.inputs.has(label)) {
        throw new Error(`Input '${label}' not found in filter complex configuration`);
      }
    }

    // Sync version requires filter to be initialized already
    if (!this.initialized) {
      throw new Error('FilterComplexAPI not initialized. Use async frames() method for lazy initialization.');
    }

    // Helper to process a single frame and yield output
    const processFrame = function* (this: FilterComplexAPI, label: string, frame: Frame): Generator<Frame> {
      this.processSync(label, frame);

      // Try to receive output frames
      while (true) {
        const outFrame = this.receiveSync(outLabel);
        if (!outFrame || outFrame === EOF) {
          break;
        }
        yield outFrame;
      }
    }.bind(this);

    // Helper to finalize (flush all inputs and yield remaining frames)
    const finalize = function* (this: FilterComplexAPI): Generator<Frame | null> {
      for (const frame of this.flushFramesSync(outLabel)) {
        yield frame;
      }
      yield null;
    }.bind(this);

    // Separate inputs by type
    const iterableInputs = new Map<string, Iterator<Frame | null>>();
    const singleFrameInputs: { label: string; frame: Frame }[] = [];
    const flushInputs = new Set<string>(); // Track which inputs to flush

    for (const [label, source] of Object.entries(inputs)) {
      if (source === null) {
        // null - flush this input
        flushInputs.add(label);
      } else if (source instanceof Frame) {
        // Single frame
        singleFrameInputs.push({ label, frame: source });
      } else {
        // Iterable
        iterableInputs.set(label, source[Symbol.iterator]());
      }
    }

    // If only single frames/nulls and no iterables
    if (iterableInputs.size === 0) {
      // Process single frames
      for (const { label, frame } of singleFrameInputs) {
        yield* processFrame(label, frame);
      }

      // Flush inputs that were null
      for (const label of flushInputs) {
        this.flushSync(label);
      }

      // Only finalize if we flushed any inputs
      if (flushInputs.size > 0) {
        yield* finalize();
      }
      return;
    }

    // Process single frames first
    for (const { label, frame } of singleFrameInputs) {
      yield* processFrame(label, frame);
    }

    // Track which inputs have finished
    const finishedInputs = new Set<string>();
    let shouldFinalize = flushInputs.size > 0; // True if any single input was null

    // Process frames from iterable inputs in round-robin fashion
    while (finishedInputs.size < iterableInputs.size) {
      // Read one frame from each active input
      for (const [label, iterator] of iterableInputs) {
        if (finishedInputs.has(label)) {
          continue;
        }

        const result = iterator.next();

        if (result.done) {
          // Iterator finished without explicit null - no automatic flush
          finishedInputs.add(label);
          continue;
        }

        const frame = result.value;

        if (frame === null) {
          // Explicit null from input stream - flush this input
          this.flushSync(label);
          shouldFinalize = true;
          finishedInputs.add(label);
        } else {
          // Send frame to input
          yield* processFrame(label, frame);
        }
      }

      // If we got null from stream, finalize and return
      if (shouldFinalize) {
        yield* finalize();
        return;
      }
    }

    // Iterators finished without explicit null - no automatic flush
  }

  /**
   * Flush input(s) and signal end-of-stream.
   *
   * Sends null frame to buffersrc filter(s) to flush buffered data.
   * Must call receive() on outputs to get flushed frames.
   * Does nothing if filter is closed or was never initialized.
   *
   * Direct mapping to av_buffersrc_add_frame(NULL).
   *
   * @param inLabel - Input label to flush. If not specified, flushes all inputs.
   *
   * @throws {Error} If input label not found
   *
   * @throws {FFmpegError} If flush fails
   *
   * @example
   * ```typescript
   * // Flush specific input
   * await complex.flush('0:v');
   *
   * // Flush all inputs
   * await complex.flush();
   *
   * // Get remaining frames from output
   * let frame;
   * while ((frame = await complex.receive('out')) !== null) {
   *   frame.free();
   * }
   * ```
   *
   * @see {@link flushFrames} For async iteration
   * @see {@link receive} For getting flushed frames
   * @see {@link flushSync} For synchronous version
   */
  async flush(inLabel?: string): Promise<void> {
    if (this.isClosed || !this.initialized) {
      return;
    }

    if (inLabel) {
      // Flush specific input
      const inputState = this.inputs.get(inLabel);
      if (!inputState) {
        throw new Error(`Input '${inLabel}' not found`);
      }

      if (inputState.buffersrc) {
        const ret = await inputState.buffersrc.buffersrcAddFrame(null, AV_BUFFERSRC_FLAG_PUSH);
        if (ret < 0 && ret !== AVERROR_EOF) {
          FFmpegError.throwIfError(ret, `Failed to flush input ${inLabel}`);
        }
      }
    } else {
      // Flush all inputs
      for (const inputState of this.inputs.values()) {
        if (!inputState.buffersrc) continue;

        const ret = await inputState.buffersrc.buffersrcAddFrame(null, AV_BUFFERSRC_FLAG_PUSH);
        if (ret < 0 && ret !== AVERROR_EOF) {
          FFmpegError.throwIfError(ret, `Failed to flush input ${inputState.label}`);
        }
      }
    }
  }

  /**
   * Flush input(s) and signal end-of-stream synchronously.
   * Synchronous version of flush.
   *
   * Sends null frame to buffersrc filter(s) to flush buffered data.
   * Must call receiveSync() on outputs to get flushed frames.
   * Does nothing if filter is closed or was never initialized.
   *
   * Direct mapping to av_buffersrc_add_frame(NULL).
   *
   * @param inLabel - Input label to flush. If not specified, flushes all inputs.
   *
   * @throws {Error} If input label not found
   *
   * @throws {FFmpegError} If flush fails
   *
   * @example
   * ```typescript
   * // Flush specific input
   * complex.flushSync('0:v');
   *
   * // Flush all inputs
   * complex.flushSync();
   *
   * // Get remaining frames from output
   * let frame;
   * while ((frame = complex.receiveSync('out')) !== null) {
   *   frame.free();
   * }
   * ```
   *
   * @see {@link flushFramesSync} For sync iteration
   * @see {@link receiveSync} For getting flushed frames
   * @see {@link flush} For async version
   */
  flushSync(inLabel?: string): void {
    if (this.isClosed || !this.initialized) {
      return;
    }

    if (inLabel) {
      // Flush specific input
      const inputState = this.inputs.get(inLabel);
      if (!inputState) {
        throw new Error(`Input '${inLabel}' not found`);
      }

      if (inputState.buffersrc) {
        const ret = inputState.buffersrc.buffersrcAddFrameSync(null, AV_BUFFERSRC_FLAG_PUSH);
        if (ret < 0 && ret !== AVERROR_EOF) {
          FFmpegError.throwIfError(ret, `Failed to flush input ${inLabel}`);
        }
      }
    } else {
      // Flush all inputs
      for (const inputState of this.inputs.values()) {
        if (!inputState.buffersrc) continue;

        const ret = inputState.buffersrc.buffersrcAddFrameSync(null, AV_BUFFERSRC_FLAG_PUSH);
        if (ret < 0 && ret !== AVERROR_EOF) {
          FFmpegError.throwIfError(ret, `Failed to flush input ${inputState.label}`);
        }
      }
    }
  }

  /**
   * Flush all inputs and yield remaining frames from specified output.
   *
   * Convenience method that:
   * 1. Calls flush() to send EOF to all inputs
   * 2. Yields all remaining frames from the specified output
   * 3. Continues until EOF is reached
   *
   * Automatically frees yielded frames after use (using declaration).
   *
   * @param outLabel - Output label to receive flushed frames from
   *
   * @yields {Frame} Remaining frames from filter after flush
   *
   * @throws {Error} If output label not found or filter not initialized
   *
   * @throws {FFmpegError} If flushing or receiving fails
   *
   * @example
   * ```typescript
   * // Process all frames, then flush
   * for await (using frame of inputFrames) {
   *   await complex.process('0:v', frame);
   * }
   *
   * // Get all remaining frames
   * for await (using frame of complex.flushFrames('out')) {
   *   await encoder.encode(frame);
   * }
   * ```
   *
   * @see {@link flush} For flushing without iteration
   * @see {@link receive} For manual frame retrieval
   * @see {@link flushFramesSync} For synchronous version
   */
  async *flushFrames(outLabel: string): AsyncGenerator<Frame> {
    // Flush all inputs
    await this.flush();

    // Yield all remaining frames from output
    while (true) {
      const frame = await this.receive(outLabel);
      if (!frame || frame === EOF) {
        break;
      }
      yield frame;
    }
  }

  /**
   * Flush all inputs and yield remaining frames from specified output synchronously.
   * Synchronous version of flushFrames.
   *
   * Convenience method that:
   * 1. Calls flushSync() to send EOF to all inputs
   * 2. Yields all remaining frames from the specified output
   * 3. Continues until EOF is reached
   *
   * Automatically frees yielded frames after use (using declaration).
   *
   * @param outLabel - Output label to receive flushed frames from
   *
   * @yields {Frame} Remaining frames from filter after flush
   *
   * @throws {Error} If output label not found or filter not initialized
   *
   * @throws {FFmpegError} If flushing or receiving fails
   *
   * @example
   * ```typescript
   * // Process all frames, then flush
   * for (using frame of inputFrames) {
   *   complex.processSync('0:v', frame);
   * }
   *
   * // Get all remaining frames
   * for (using frame of complex.flushFramesSync('out')) {
   *   encoder.encodeSync(frame);
   * }
   * ```
   *
   * @see {@link flushSync} For flushing without iteration
   * @see {@link receiveSync} For manual frame retrieval
   * @see {@link flushFrames} For async version
   */
  *flushFramesSync(outLabel: string): Generator<Frame> {
    // Flush all inputs
    this.flushSync();

    // Yield all remaining frames from output
    while (true) {
      const frame = this.receiveSync(outLabel);
      if (!frame || frame === EOF) {
        break;
      }
      yield frame;
    }
  }

  /**
   * Receive filtered frame from specified output.
   *
   * Pulls a single frame from the buffersink of the specified output.
   * Automatically post-processes frame (sets timeBase, calculates duration).
   * Returns cloned frame - caller must free it.
   *
   * Return values:
   * - Frame: Successfully received frame (caller must free)
   * - null: Need more input (AVERROR_EAGAIN) - call process() to send more frames
   * - EOF: End of stream reached
   *
   * Direct mapping to av_buffersink_get_frame().
   *
   * @param outLabel - Output label to receive from
   *
   * @returns Frame on success, null if need more input, EOF if finished
   *
   * @throws {Error} If output label not found or filter not initialized
   *
   * @throws {FFmpegError} If receive fails with unexpected error
   *
   * @example
   * ```typescript
   * // Process frames one at a time
   * await complex.process('0:v', frame1);
   * const outFrame = await complex.receive('out');
   * if (outFrame && outFrame !== EOF) {
   *   // Use frame
   *   outFrame.free();
   * }
   * ```
   *
   * @see {@link process} For sending input frames
   * @see {@link flush} For flushing after all input
   * @see {@link receiveSync} For synchronous version
   */
  async receive(outLabel: string): Promise<Frame | EOFSignal | null> {
    if (this.isClosed || !this.initialized) {
      return null;
    }

    // Get output state
    const outputState = this.outputs.get(outLabel);
    if (!outputState?.buffersink) {
      throw new Error(`Output '${outLabel}' not found or not initialized`);
    }

    // Allocate frame for receiving
    this.frame.alloc();

    const ret = await outputState.buffersink.buffersinkGetFrame(this.frame);

    if (ret >= 0) {
      // Success - post-process and clone for user
      this.postProcessOutputFrame(this.frame, outputState.buffersink);
      const cloned = this.frame.clone();
      if (!cloned) {
        throw new Error('Failed to clone output frame');
      }
      return cloned;
    } else if (ret === AVERROR_EAGAIN) {
      // Need more input
      return null;
    } else if (ret === AVERROR_EOF) {
      // End of stream
      return EOF;
    } else {
      // Unexpected error
      FFmpegError.throwIfError(ret, `Failed to receive frame from ${outLabel}`);
      return null;
    }
  }

  /**
   * Receive filtered frame from specified output synchronously.
   * Synchronous version of receive.
   *
   * Pulls a single frame from the buffersink of the specified output.
   * Automatically post-processes frame (sets timeBase, calculates duration).
   * Returns cloned frame - caller must free it.
   *
   * Return values:
   * - Frame: Successfully received frame (caller must free)
   * - null: Need more input (AVERROR_EAGAIN) - call processSync() to send more frames
   * - EOF: End of stream reached
   *
   * Direct mapping to av_buffersink_get_frame().
   *
   * @param outLabel - Output label to receive from
   *
   * @returns Frame on success, null if need more input, EOF if finished
   *
   * @throws {Error} If output label not found or filter not initialized
   *
   * @throws {FFmpegError} If receive fails with unexpected error
   *
   * @example
   * ```typescript
   * // Process frames one at a time
   * complex.processSync('0:v', frame1);
   * const outFrame = complex.receiveSync('out');
   * if (outFrame && outFrame !== EOF) {
   *   // Use frame
   *   outFrame.free();
   * }
   * ```
   *
   * @see {@link processSync} For sending input frames
   * @see {@link flushSync} For flushing after all input
   * @see {@link receive} For async version
   */
  receiveSync(outLabel: string): Frame | EOFSignal | null {
    if (this.isClosed || !this.initialized) {
      return null;
    }

    // Get output state
    const outputState = this.outputs.get(outLabel);
    if (!outputState?.buffersink) {
      throw new Error(`Output '${outLabel}' not found or not initialized`);
    }

    // Allocate frame for receiving
    this.frame.alloc();

    const ret = outputState.buffersink.buffersinkGetFrameSync(this.frame);

    if (ret >= 0) {
      // Success - post-process and clone for user
      this.postProcessOutputFrame(this.frame, outputState.buffersink);
      const cloned = this.frame.clone();
      if (!cloned) {
        throw new Error('Failed to clone output frame');
      }
      return cloned;
    } else if (ret === AVERROR_EAGAIN) {
      // Need more input
      return null;
    } else if (ret === AVERROR_EOF) {
      // End of stream
      return EOF;
    } else {
      // Unexpected error
      FFmpegError.throwIfError(ret, `Failed to receive frame from ${outLabel}`);
      return null;
    }
  }

  /**
   * Check if all inputs have received at least one frame (have format information).
   *
   * @returns true if all inputs have format info (first frame received)
   *
   * @internal
   */
  private hasAllInputFormats(): boolean {
    for (const inputState of this.inputs.values()) {
      // Input has format if it has at least one queued frame OR is already initialized
      if (inputState.queuedFrames.length === 0 && !inputState.buffersrc) {
        return false;
      }
    }
    return true;
  }

  /**
   * Initialize filter graph from queued frames.
   *
   * Implements FFmpeg's configure_filtergraph() logic:
   * 1. Create buffersrc filters from first queued frame of each input
   * 2. Parse filter description
   * 3. Create buffersink filters
   * 4. Configure graph with avfilter_graph_config()
   * 5. Send all queued frames to buffersrc
   *
   * @throws {Error} If initialization fails
   *
   * @throws {FFmpegError} If configuration fails
   *
   * @internal
   */
  private async initializeFromQueuedFrames(): Promise<void> {
    if (this.isClosed) {
      throw new Error('FilterComplexAPI is already closed');
    }

    // Step 1: Create buffersrc filters from first queued frame
    for (const [label, inputState] of this.inputs) {
      if (inputState.queuedFrames.length === 0) {
        throw new Error(`Input '${label}' has no queued frames for initialization`);
      }

      const firstFrame = inputState.queuedFrames[0];

      // Calculate timeBase from first frame (CFR/VFR mode)
      inputState.calculatedTimeBase = this.calculateTimeBase(firstFrame);

      // Track initial frame properties for change detection
      inputState.lastFrameProps = {
        format: firstFrame.format,
        width: firstFrame.width,
        height: firstFrame.height,
        sampleRate: firstFrame.sampleRate,
        channels: firstFrame.channelLayout?.nbChannels ?? 0,
      };

      // Create buffersrc filter
      const buffersrc = this.createBufferSource(label, firstFrame, inputState.calculatedTimeBase);
      inputState.buffersrc = buffersrc;
    }

    // Step 2: Set graph options before parsing
    if (this.options.scaleSwsOpts) {
      this.graph.scaleSwsOpts = this.options.scaleSwsOpts;
    }

    if (this.options.audioResampleOpts) {
      this.graph.aresampleSwrOpts = this.options.audioResampleOpts;
    }

    // Step 3: Parse filter description and create buffersink filters
    this.parseFilterDescription();

    // Step 4: Configure the graph
    const ret = await this.graph.config();
    FFmpegError.throwIfError(ret, 'Failed to configure filter complex graph');

    // Step 5: Send all queued frames to buffersrc
    for (const [label, inputState] of this.inputs) {
      if (!inputState.buffersrc || !inputState.calculatedTimeBase) {
        continue;
      }

      // Process all queued frames for this input
      for (const frame of inputState.queuedFrames) {
        // Rescale timestamps using helper
        this.rescaleFrameTimestamps(frame, inputState.calculatedTimeBase);

        // Send to buffersrc
        // KEEP_REF preserves the input frame's hw_frames_ctx for reuse across multiple filters
        const ret = await inputState.buffersrc.buffersrcAddFrame(frame, (AV_BUFFERSRC_FLAG_PUSH | AV_BUFFERSRC_FLAG_KEEP_REF) as AVBufferSrcFlag);
        FFmpegError.throwIfError(ret, `Failed to send queued frame to ${label}`);

        // Free the frame
        frame.free();
      }

      // Clear the queue after processing
      inputState.queuedFrames = [];
    }

    this.initialized = true;
  }

  /**
   * Initialize filter graph from queued frames synchronously.
   * Synchronous version of initializeFromQueuedFrames.
   *
   * @throws {Error} If closed or inputs have no queued frames
   *
   * @throws {FFmpegError} If graph configuration or frame processing fails
   *
   * @internal
   */
  private initializeFromQueuedFramesSync(): void {
    if (this.isClosed) {
      throw new Error('FilterComplexAPI is already closed');
    }

    // Step 1: Create buffersrc filters from first queued frame
    for (const [label, inputState] of this.inputs) {
      if (inputState.queuedFrames.length === 0) {
        throw new Error(`Input '${label}' has no queued frames for initialization`);
      }

      const firstFrame = inputState.queuedFrames[0];

      // Calculate timeBase from first frame (CFR/VFR mode)
      inputState.calculatedTimeBase = this.calculateTimeBase(firstFrame);

      // Track initial frame properties for change detection
      inputState.lastFrameProps = {
        format: firstFrame.format,
        width: firstFrame.width,
        height: firstFrame.height,
        sampleRate: firstFrame.sampleRate,
        channels: firstFrame.channelLayout?.nbChannels ?? 0,
      };

      // Create buffersrc filter
      const buffersrc = this.createBufferSource(label, firstFrame, inputState.calculatedTimeBase);
      inputState.buffersrc = buffersrc;
    }

    // Step 2: Set graph options before parsing
    if (this.options.scaleSwsOpts) {
      this.graph.scaleSwsOpts = this.options.scaleSwsOpts;
    }

    if (this.options.audioResampleOpts) {
      this.graph.aresampleSwrOpts = this.options.audioResampleOpts;
    }

    // Step 3: Parse filter description and create buffersink filters
    this.parseFilterDescription();

    // Step 4: Configure the graph
    const ret = this.graph.configSync();
    FFmpegError.throwIfError(ret, 'Failed to configure filter complex graph');

    // Step 5: Send all queued frames to buffersrc
    for (const [label, inputState] of this.inputs) {
      if (!inputState.buffersrc || !inputState.calculatedTimeBase) {
        continue;
      }

      // Process all queued frames for this input
      for (const frame of inputState.queuedFrames) {
        // Rescale timestamps using helper
        this.rescaleFrameTimestamps(frame, inputState.calculatedTimeBase);

        // Send to buffersrc
        // KEEP_REF preserves the input frame's hw_frames_ctx for reuse across multiple filters
        const ret = inputState.buffersrc.buffersrcAddFrameSync(frame, (AV_BUFFERSRC_FLAG_PUSH | AV_BUFFERSRC_FLAG_KEEP_REF) as AVBufferSrcFlag);
        FFmpegError.throwIfError(ret, `Failed to send queued frame to ${label}`);

        // Free the frame
        frame.free();
      }

      // Clear the queue after processing
      inputState.queuedFrames = [];
    }

    this.initialized = true;
  }

  /**
   * Calculate timeBase from frame based on media type and CFR option.
   *
   * Implements FFmpeg's ifilter_parameters_from_frame logic:
   * - Audio: Always { 1, sample_rate }
   * - Video CFR: 1/framerate (inverse of framerate)
   * - Video VFR: Use frame.timeBase
   *
   * @param frame - Input frame
   *
   * @returns Calculated timeBase
   *
   * @internal
   */
  private calculateTimeBase(frame: Frame): IRational {
    if (frame.isAudio()) {
      // Audio: Always { 1, sample_rate }
      return { num: 1, den: frame.sampleRate };
    } else {
      // Video: Check CFR flag
      if (this.options.cfr) {
        // CFR mode: timeBase = 1/framerate = inverse(framerate)
        // Note: framerate is guaranteed to be set (validated in create())
        return avInvQ(this.options.framerate!);
      } else {
        // VFR mode: Use frame's timeBase
        return frame.timeBase;
      }
    }
  }

  /**
   * Rescale frame timestamps to calculated timeBase.
   *
   * Helper to avoid code duplication when rescaling timestamps.
   * Modifies the frame in-place.
   *
   * @param frame - Frame to rescale
   *
   * @param calculatedTimeBase - Target timeBase
   *
   * @internal
   */
  private rescaleFrameTimestamps(frame: Frame, calculatedTimeBase: IRational): void {
    const originalTimeBase = frame.timeBase;
    frame.pts = avRescaleQ(frame.pts, originalTimeBase, calculatedTimeBase);
    frame.duration = avRescaleQ(frame.duration, originalTimeBase, calculatedTimeBase);
    frame.timeBase = new Rational(calculatedTimeBase.num, calculatedTimeBase.den);
  }

  /**
   * Create buffer source for an input.
   *
   * @param label - Input label
   *
   * @param frame - First frame from this input
   *
   * @param timeBase - Calculated timeBase for this input (from calculateTimeBase)
   *
   * @returns BufferSrc filter context
   *
   * @throws {Error} If creation fails
   *
   * @internal
   */
  private createBufferSource(label: string, frame: Frame, timeBase: IRational): FilterContext {
    const filterName = frame.isVideo() ? 'buffer' : 'abuffer';
    const bufferFilter = Filter.getByName(filterName);
    if (!bufferFilter) {
      throw new Error(`${filterName} filter not found`);
    }

    let buffersrcCtx: FilterContext | null;

    if (frame.isVideo()) {
      // Video: allocate + set parameters
      buffersrcCtx = this.graph.allocFilter(bufferFilter, `in_${label}`);
      if (!buffersrcCtx) {
        throw new Error(`Failed to allocate buffer source for ${label}`);
      }

      const ret = buffersrcCtx.buffersrcParametersSet({
        width: frame.width,
        height: frame.height,
        format: frame.format,
        timeBase: timeBase,
        frameRate: this.options.framerate,
        sampleAspectRatio: frame.sampleAspectRatio,
        colorRange: frame.colorRange,
        colorSpace: frame.colorSpace,
        hwFramesCtx: frame.hwFramesCtx,
      });
      FFmpegError.throwIfError(ret, `Failed to set buffer source parameters for ${label}`);

      const initRet = buffersrcCtx.init(null);
      FFmpegError.throwIfError(initRet, `Failed to initialize buffer source for ${label}`);
    } else {
      // Audio: create with args string
      const formatName = avGetSampleFmtName(frame.format as AVSampleFormat);
      const channelLayout = frame.channelLayout.mask === 0n ? `${frame.channelLayout.nbChannels}c` : frame.channelLayout.mask.toString();
      const args = `time_base=${timeBase.num}/${timeBase.den}:sample_rate=${frame.sampleRate}:sample_fmt=${formatName}:channel_layout=${channelLayout}`;

      buffersrcCtx = this.graph.createFilter(bufferFilter, `in_${label}`, args);
      if (!buffersrcCtx) {
        throw new Error(`Failed to create audio buffer source for ${label}`);
      }
    }

    return buffersrcCtx;
  }

  /**
   * Create buffer sink for an output.
   *
   * @param label - Output label
   *
   * @param isVideo - Whether this is a video output
   *
   * @returns BufferSink filter context
   *
   * @throws {Error} If creation fails
   *
   * @internal
   */
  private createBufferSink(label: string, isVideo: boolean): FilterContext {
    const filterName = isVideo ? 'buffersink' : 'abuffersink';
    const sinkFilter = Filter.getByName(filterName);
    if (!sinkFilter) {
      throw new Error(`${filterName} filter not found`);
    }

    const buffersinkCtx = this.graph.createFilter(sinkFilter, `out_${label}`, null);
    if (!buffersinkCtx) {
      throw new Error(`Failed to create buffer sink for ${label}`);
    }

    return buffersinkCtx;
  }

  /**
   * Parse filter description and build graph using segment API.
   *
   * @throws {Error} If parsing fails
   *
   * @throws {FFmpegError} If graph construction fails
   *
   * @internal
   */
  private parseFilterDescription(): void {
    // Step 1: Parse the filter description into a segment
    const segment = this.graph.segmentParse(this.description);
    if (!segment) {
      throw new Error('Failed to parse filter segment');
    }

    try {
      // Step 2: Create filter instances (but don't initialize yet)
      let ret = segment.createFilters();
      FFmpegError.throwIfError(ret, 'Failed to create filters in segment');

      // Step 3: Set hw_device_ctx on filters that need it BEFORE initialization
      const filters = this.graph.filters;
      if (filters && this.options.hardware) {
        for (const filterCtx of filters) {
          const filter = filterCtx.filter;
          if (filter?.hasFlags(AVFILTER_FLAG_HWDEVICE)) {
            filterCtx.hwDeviceCtx = this.options.hardware.deviceContext;

            // Set extra_hw_frames if specified
            if (this.options.extraHWFrames !== undefined && this.options.extraHWFrames > 0) {
              filterCtx.extraHWFrames = this.options.extraHWFrames;
            }
          }
        }
      }

      // Step 4: Apply options to filters
      ret = segment.applyOpts();
      FFmpegError.throwIfError(ret, 'Failed to apply options to segment');

      // Step 5: Initialize and link filters in the segment
      const inputs = new FilterInOut();
      const outputs = new FilterInOut();

      ret = segment.apply(inputs, outputs);
      FFmpegError.throwIfError(ret, 'Failed to apply segment');

      // Step 6: Link buffersrc filters to segment inputs
      this.linkBufferSources(inputs);

      // Step 7: Link segment outputs to buffersink filters
      this.linkBufferSinks(outputs);

      // Clean up FilterInOut structures
      inputs.free();
      outputs.free();
    } finally {
      // Always free the segment
      segment.free();
    }
  }

  /**
   * Link buffersrc filters to segment inputs.
   *
   * Iterates through FilterInOut chain and links by label.
   *
   * @param inputs - FilterInOut chain of segment inputs
   *
   * @throws {Error} If linking fails
   *
   * @internal
   */
  private linkBufferSources(inputs: FilterInOut): void {
    let current: FilterInOut | null = inputs;

    while (current?.name) {
      const label = current.name;
      const inputState = this.inputs.get(label);

      if (!inputState?.buffersrc) {
        throw new Error(`No buffersrc found for input label '${label}'`);
      }

      if (!current.filterCtx) {
        throw new Error(`FilterContext is null for input label '${label}'`);
      }

      // Link buffersrc → segment input
      const ret = inputState.buffersrc.link(0, current.filterCtx, current.padIdx);
      FFmpegError.throwIfError(ret, `Failed to link buffersrc '${label}' to segment`);

      current = current.next;
    }
  }

  /**
   * Link segment outputs to buffersink filters.
   *
   * Iterates through FilterInOut chain and links by label.
   *
   * @param outputs - FilterInOut chain of segment outputs
   *
   * @throws {Error} If linking fails
   *
   * @internal
   */
  private linkBufferSinks(outputs: FilterInOut): void {
    let current: FilterInOut | null = outputs;

    // Get media type from first input as default
    const firstInput = this.inputs.values().next().value;
    const defaultIsVideo = firstInput?.buffersrc?.filter?.name === 'buffer'; // 'buffer' = video, 'abuffer' = audio

    while (current?.name) {
      const label = current.name;
      const outputState = this.outputs.get(label);

      if (!outputState) {
        throw new Error(`No output state found for label '${label}'`);
      }

      if (!current.filterCtx) {
        throw new Error(`FilterContext is null for output label '${label}'`);
      }

      // Determine media type: use configured value or default from first input
      const outputConfig = this.options.outputs.find((o) => o.label === label);
      let isVideo = defaultIsVideo;

      if (outputConfig?.mediaType !== undefined) {
        isVideo = outputConfig.mediaType === AVMEDIA_TYPE_VIDEO;
      }

      // Create buffersink filter
      const buffersink = this.createBufferSink(label, isVideo);
      outputState.buffersink = buffersink;

      // Link segment output → buffersink
      const ret = current.filterCtx.link(current.padIdx, buffersink, 0);
      FFmpegError.throwIfError(ret, `Failed to link segment to buffersink '${label}'`);

      current = current.next;
    }
  }

  /**
   * Post-process output frame from buffersink.
   *
   * Applies FFmpeg's fg_output_step() behavior:
   * 1. Sets frame.timeBase from buffersink (filters can change timeBase)
   * 2. Calculates video frame duration from frame rate if not set
   *
   * This must be called AFTER buffersinkGetFrame() for every output frame.
   *
   * @param frame - Output frame from buffersink
   *
   * @param buffersink - The buffersink context
   *
   * @internal
   */
  private postProcessOutputFrame(frame: Frame, buffersink: FilterContext): void {
    // Filters can change timeBase (e.g., aresample sets output to {1, out_sample_rate})
    // Without this, frame has INPUT timeBase instead of filter's OUTPUT timeBase
    frame.timeBase = buffersink.buffersinkGetTimeBase();

    if (frame.isVideo() && !frame.duration) {
      const frameRate = buffersink.buffersinkGetFrameRate();
      if (frameRate.num > 0 && frameRate.den > 0) {
        frame.duration = avRescaleQ(1, avInvQ(frameRate), frame.timeBase);
      }
    }
  }

  /**
   * Close filter complex and release resources.
   *
   * Frees queued frames, filter graph and all filter contexts.
   * Safe to call multiple times.
   *
   * @example
   * ```typescript
   * complex.close();
   * ```
   *
   * @example
   * ```typescript
   * // Automatic cleanup with using
   * {
   *   using complex = FilterComplexAPI.create('[0:v]scale=640:480[out]', { ... });
   *   // Use complex...
   * } // Automatically freed
   * ```
   *
   * @see {@link Symbol.dispose} For automatic cleanup
   */
  close(): void {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;

    for (const inputState of this.inputs.values()) {
      for (const frame of inputState.queuedFrames) {
        frame.free();
      }
      inputState.queuedFrames = [];
      inputState.buffersrc?.free();
      inputState.buffersrc = null;
    }

    for (const outputState of this.outputs.values()) {
      outputState.buffersink?.free();
      outputState.buffersink = null;
    }

    this.inputs.clear();
    this.outputs.clear();

    this.frame.free();
    this.graph.free();

    this.initialized = false;
    this.initializePromise = null;
  }

  /**
   * Dispose of filter complex.
   *
   * Implements Disposable interface for automatic cleanup.
   *
   * @example
   * ```typescript
   * {
   *   using complex = FilterComplexAPI.create('[0:v]scale=640:480[out]', { ... });
   *   // Use complex...
   * } // Automatically freed
   * ```
   *
   * @see {@link close} For manual cleanup
   */
  [Symbol.dispose](): void {
    this.close();
  }
}
