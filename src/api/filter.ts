/* eslint-disable @stylistic/indent-binary-ops */
import {
  AV_BUFFERSRC_FLAG_KEEP_REF,
  AV_BUFFERSRC_FLAG_PUSH,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  AVERROR_FILTER_NOT_FOUND,
  AVFILTER_FLAG_HWDEVICE,
  EOF,
} from '../constants/constants.js';
import { FFmpegError } from '../lib/error.js';
import { FilterGraph } from '../lib/filter-graph.js';
import { FilterInOut } from '../lib/filter-inout.js';
import { Filter } from '../lib/filter.js';
import { Frame } from '../lib/frame.js';
import { Rational } from '../lib/rational.js';
import { avGetSampleFmtName, avInvQ, avRescaleQ } from '../lib/utilities.js';
import { FRAME_THREAD_QUEUE_SIZE } from './constants.js';
import { AsyncQueue } from './utilities/async-queue.js';
import { Scheduler } from './utilities/scheduler.js';

import type { AVBufferSrcFlag, AVColorRange, AVColorSpace, AVFilterCmdFlag, AVPixelFormat, AVSampleFormat, EOFSignal } from '../constants/index.js';
import type { FilterContext } from '../lib/filter-context.js';
import type { ChannelLayout, IDimension, IRational } from '../lib/types.js';
import type { Encoder } from './encoder.js';
import type { FilterOptions } from './types.js';
import type { SchedulableComponent } from './utilities/scheduler.js';

/**
 * High-level filter API for audio and video processing.
 *
 * Provides simplified interface for applying FFmpeg filters to frames.
 * Handles filter graph construction, frame buffering, and command control.
 * Supports both software and hardware-accelerated filtering operations.
 * Essential component for effects, transformations, and format conversions.
 *
 * @example
 * ```typescript
 * import { FilterAPI } from 'node-av/api';
 *
 * // Create video filter - initializes on first frame
 * const filter = FilterAPI.create('scale=1280:720', {
 *   timeBase: video.timeBase,
 * });
 *
 * // Process frame - first frame configures filter graph
 * const output = await filter.process(inputFrame);
 * if (output) {
 *   console.log(`Filtered frame: ${output.width}x${output.height}`);
 *   output.free();
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Hardware-accelerated filtering - hw context detected from frame
 * const filter = FilterAPI.create('hwupload,scale_cuda=1920:1080,hwdownload', {
 *   timeBase: video.timeBase,
 * });
 * // Hardware frames context will be automatically detected from first frame
 * ```
 *
 * @see {@link FilterGraph} For low-level filter graph API
 * @see {@link Frame} For frame operations
 */
export class FilterAPI implements Disposable {
  private graph: FilterGraph;
  private description: string;
  private options: FilterOptions;
  private buffersrcCtx: FilterContext | null = null;
  private buffersinkCtx: FilterContext | null = null;
  private frame: Frame = new Frame(); // Reusable frame for receive operations
  private initializePromise: Promise<void> | null = null;
  private initialized = false;
  private isClosed = false;

  // Auto-calculated timeBase from first frame
  private calculatedTimeBase: IRational | null = null;

  // Track last frame properties for change detection (for dropOnChange/allowReinit)
  private lastFrameProps: {
    format: number;
    width: number;
    height: number;
    sampleRate: number;
    channels: number;
  } | null = null;

  // Worker pattern for push-based processing
  private inputQueue: AsyncQueue<Frame>;
  private outputQueue: AsyncQueue<Frame>;
  private workerPromise: Promise<void> | null = null;
  private nextComponent: SchedulableComponent<Frame> | null = null;
  private pipeToPromise: Promise<void> | null = null;

  /**
   * @param graph - Filter graph instance
   *
   * @param description - Filter description string
   *
   * @param options - Filter options
   *
   * @internal
   */
  private constructor(graph: FilterGraph, description: string, options: FilterOptions) {
    this.graph = graph;
    this.description = description;
    this.options = options;
    this.inputQueue = new AsyncQueue<Frame>(FRAME_THREAD_QUEUE_SIZE);
    this.outputQueue = new AsyncQueue<Frame>(FRAME_THREAD_QUEUE_SIZE);
  }

  /**
   * Create a filter with specified description and configuration.
   *
   * Direct mapping to avfilter_graph_parse_ptr() and avfilter_graph_config().
   *
   * @param description - Filter graph description
   *
   * @param options - Filter options
   *
   * @returns Configured filter instance
   *
   * @throws {Error} If cfr=true but framerate is not set
   *
   * @example
   * ```typescript
   * // Simple video filter (VFR mode, auto timeBase)
   * const filter = FilterAPI.create('scale=640:480');
   * ```
   *
   * @example
   * ```typescript
   * // CFR mode with constant framerate
   * const filter = FilterAPI.create('scale=1920:1080', {
   *   cfr: true,
   *   framerate: { num: 25, den: 1 }
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Audio filter with resampling
   * const filter = FilterAPI.create('aformat=sample_fmts=s16:sample_rates=44100', {
   *   audioResampleOpts: 'async=1'
   * });
   * ```
   *
   * @see {@link process} For frame processing
   * @see {@link FilterOptions} For configuration options
   */
  static create(description: string, options: FilterOptions = {}): FilterAPI {
    // Validate options: CFR requires framerate
    if (options.cfr && !options.framerate) {
      throw new Error('cfr=true requires framerate to be set');
    }

    // Create graph
    const graph = new FilterGraph();
    graph.alloc();

    // Configure threading
    if (options.threads !== undefined) {
      graph.nbThreads = options.threads;
    }

    // Configure scaler options
    if (options.scaleSwsOpts) {
      graph.scaleSwsOpts = options.scaleSwsOpts;
    }

    return new FilterAPI(graph, description, options);
  }

  /**
   * Check if filter is open.
   *
   * @example
   * ```typescript
   * if (filter.isFilterOpen) {
   *   const output = await filter.process(frame);
   * }
   * ```
   */
  get isFilterOpen(): boolean {
    return !this.isClosed;
  }

  /**
   * Check if filter has been initialized.
   *
   * Returns true after first frame has been processed and filter graph configured.
   * Useful for checking if filter has received frame properties.
   *
   * @returns true if filter graph has been built from first frame
   *
   * @example
   * ```typescript
   * if (!filter.isFilterInitialized) {
   *   console.log('Filter will initialize on first frame');
   * }
   * ```
   */
  get isFilterInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get buffersink filter context.
   *
   * Provides access to the buffersink filter context for advanced operations.
   * Returns null if filter is not initialized.
   *
   * @returns Buffersink context or null
   *
   * @example
   * ```typescript
   * const sink = filter.buffersink;
   * if (sink) {
   *   const fr = sink.buffersinkGetFrameRate();
   *   console.log(`Output frame rate: ${fr.num}/${fr.den}`);
   * }
   * ```
   */
  get buffersink(): FilterContext | null {
    return this.buffersinkCtx;
  }

  /**
   * Output frame rate from filter graph.
   *
   * Returns the frame rate determined by the filter graph output.
   * Returns null if filter is not initialized or frame rate is not set.
   *
   * Direct mapping to av_buffersink_get_frame_rate().
   *
   * @returns Frame rate or null if not available
   *
   * @example
   * ```typescript
   * const frameRate = filter.frameRate;
   * if (frameRate) {
   *   console.log(`Filter output: ${frameRate.num}/${frameRate.den} fps`);
   * }
   * ```
   *
   * @see {@link timeBase} For output timebase
   */
  get frameRate(): IRational | null {
    if (!this.initialized || !this.buffersinkCtx) {
      return null;
    }
    const fr = this.buffersinkCtx.buffersinkGetFrameRate();
    // Return null if frame rate is not set (0/0 or 0/1)
    if (fr.num <= 0 || fr.den <= 0) {
      return null;
    }
    return fr;
  }

  /**
   * Output time base from filter graph.
   *
   * Returns the time base of the buffersink output.
   * Matches FFmpeg CLI's av_buffersink_get_time_base() behavior.
   *
   * Direct mapping to av_buffersink_get_time_base().
   *
   * @returns Time base or null if not initialized
   *
   * @example
   * ```typescript
   * const timeBase = filter.timeBase;
   * if (timeBase) {
   *   console.log(`Filter timebase: ${timeBase.num}/${timeBase.den}`);
   * }
   * ```
   *
   * @see {@link frameRate} For output frame rate
   */
  get timeBase(): IRational | null {
    if (!this.initialized || !this.buffersinkCtx) {
      return null;
    }
    return this.buffersinkCtx.buffersinkGetTimeBase();
  }

  /**
   * Output format from filter graph.
   *
   * Returns the pixel format (video) or sample format (audio) of the buffersink output.
   * Matches FFmpeg CLI's av_buffersink_get_format() behavior.
   *
   * Direct mapping to av_buffersink_get_format().
   *
   * @returns Pixel format or sample format, or null if not initialized
   *
   * @example
   * ```typescript
   * const format = filter.format;
   * if (format !== null) {
   *   console.log(`Filter output format: ${format}`);
   * }
   * ```
   */
  get format(): AVPixelFormat | AVSampleFormat | null {
    if (!this.initialized || !this.buffersinkCtx) {
      return null;
    }
    return this.buffersinkCtx.buffersinkGetFormat();
  }

  /**
   * Output dimensions from filter graph (video only).
   *
   * Returns the width and height of the buffersink output.
   * Matches FFmpeg CLI's av_buffersink_get_w() and av_buffersink_get_h() behavior.
   * Only meaningful for video filters.
   *
   * Direct mapping to av_buffersink_get_w() and av_buffersink_get_h().
   *
   * @returns Dimensions object or null if not initialized
   *
   * @example
   * ```typescript
   * const dims = filter.dimensions;
   * if (dims) {
   *   console.log(`Filter output: ${dims.width}x${dims.height}`);
   * }
   * ```
   */
  get dimensions(): IDimension | null {
    if (!this.initialized || !this.buffersinkCtx) {
      return null;
    }
    return {
      width: this.buffersinkCtx.buffersinkGetWidth(),
      height: this.buffersinkCtx.buffersinkGetHeight(),
    };
  }

  /**
   * Output sample rate from filter graph (audio only).
   *
   * Returns the sample rate of the buffersink output.
   * Matches FFmpeg CLI's av_buffersink_get_sample_rate() behavior.
   * Only meaningful for audio filters.
   *
   * Direct mapping to av_buffersink_get_sample_rate().
   *
   * @returns Sample rate or null if not initialized
   *
   * @example
   * ```typescript
   * const sampleRate = filter.sampleRate;
   * if (sampleRate) {
   *   console.log(`Filter output sample rate: ${sampleRate} Hz`);
   * }
   * ```
   */
  get sampleRate(): number | null {
    if (!this.initialized || !this.buffersinkCtx) {
      return null;
    }
    return this.buffersinkCtx.buffersinkGetSampleRate();
  }

  /**
   * Output channel layout from filter graph (audio only).
   *
   * Returns the channel layout of the buffersink output.
   * Matches FFmpeg CLI's av_buffersink_get_ch_layout() behavior.
   * Only meaningful for audio filters.
   *
   * Direct mapping to av_buffersink_get_ch_layout().
   *
   * @returns Channel layout or null if not initialized
   *
   * @example
   * ```typescript
   * const layout = filter.channelLayout;
   * if (layout) {
   *   console.log(`Filter output channels: ${layout.nbChannels}`);
   * }
   * ```
   */
  get channelLayout(): ChannelLayout | null {
    if (!this.initialized || !this.buffersinkCtx) {
      return null;
    }
    return this.buffersinkCtx.buffersinkGetChannelLayout();
  }

  /**
   * Output color space from filter graph (video only).
   *
   * Returns the color space of the buffersink output.
   * Matches FFmpeg CLI's av_buffersink_get_colorspace() behavior.
   * Only meaningful for video filters.
   *
   * Direct mapping to av_buffersink_get_colorspace().
   *
   * @returns Color space or null if not initialized
   *
   * @example
   * ```typescript
   * const colorSpace = filter.colorSpace;
   * if (colorSpace !== null) {
   *   console.log(`Filter output color space: ${colorSpace}`);
   * }
   * ```
   */
  get colorSpace(): AVColorSpace | null {
    if (!this.initialized || !this.buffersinkCtx) {
      return null;
    }
    return this.buffersinkCtx.buffersinkGetColorspace();
  }

  /**
   * Output color range from filter graph (video only).
   *
   * Returns the color range of the buffersink output.
   * Matches FFmpeg CLI's av_buffersink_get_color_range() behavior.
   * Only meaningful for video filters.
   *
   * Direct mapping to av_buffersink_get_color_range().
   *
   * @returns Color range or null if not initialized
   *
   * @example
   * ```typescript
   * const colorRange = filter.colorRange;
   * if (colorRange !== null) {
   *   console.log(`Filter output color range: ${colorRange}`);
   * }
   * ```
   */
  get colorRange(): AVColorRange | null {
    if (!this.initialized || !this.buffersinkCtx) {
      return null;
    }
    return this.buffersinkCtx.buffersinkGetColorRange();
  }

  /**
   * Output sample aspect ratio from filter graph (video only).
   *
   * Returns the sample aspect ratio of the buffersink output.
   * Matches FFmpeg CLI's av_buffersink_get_sample_aspect_ratio() behavior.
   * Only meaningful for video filters.
   *
   * Direct mapping to av_buffersink_get_sample_aspect_ratio().
   *
   * @returns Sample aspect ratio or null if not initialized
   *
   * @example
   * ```typescript
   * const sar = filter.sampleAspectRatio;
   * if (sar) {
   *   console.log(`Filter output SAR: ${sar.num}:${sar.den}`);
   * }
   * ```
   */
  get sampleAspectRatio(): IRational | null {
    if (!this.initialized || !this.buffersinkCtx) {
      return null;
    }
    return this.buffersinkCtx.buffersinkGetSampleAspectRatio();
  }

  /**
   * Check if filter is ready for processing.
   *
   * @returns true if initialized and ready
   *
   * @example
   * ```typescript
   * if (filter.isReady()) {
   *   const output = await filter.process(frame);
   * }
   * ```
   */
  isReady(): boolean {
    return this.initialized && this.buffersrcCtx !== null && this.buffersinkCtx !== null && !this.isClosed;
  }

  /**
   * Get filter graph description.
   *
   * Returns human-readable graph structure.
   * Useful for debugging filter chains.
   *
   * Direct mapping to avfilter_graph_dump().
   *
   * @returns Graph description or null if closed
   *
   * @example
   * ```typescript
   * const description = filter.getGraphDescription();
   * console.log('Filter graph:', description);
   * ```
   */
  getGraphDescription(): string | null {
    return !this.isClosed && this.initialized ? this.graph.dump() : null;
  }

  /**
   * Send a frame to the filter.
   *
   * Sends a frame to the filter for processing.
   * Does not return filtered frames - use {@link receive} to retrieve frames.
   * On first frame, automatically builds filter graph with frame properties.
   * A single input frame can produce zero, one, or multiple output frames.
   *
   * **Important**: This method only SENDS the frame to the filter.
   * You must call {@link receive} separately (potentially multiple times) to get filtered frames.
   *
   * Direct mapping to av_buffersrc_add_frame().
   *
   * @param frame - Input frame to send to filter, or null to flush
   *
   * @throws {Error} If filter could not be initialized
   *
   * @throws {FFmpegError} If sending frame fails
   *
   * @example
   * ```typescript
   * // Send frame and receive filtered frames
   * await filter.process(inputFrame);
   *
   * // Receive all available filtered frames
   * while (true) {
   *   const output = await filter.receive();
   *   if (!output) break;
   *   console.log(`Got filtered frame: pts=${output.pts}`);
   *   output.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * for await (const frame of decoder.frames(input.packets())) {
   *   // Send frame
   *   await filter.process(frame);
   *
   *   // Receive available filtered frames
   *   let output;
   *   while ((output = await filter.receive())) {
   *     await encoder.encode(output);
   *     output.free();
   *   }
   *   frame.free();
   * }
   * ```
   *
   * @see {@link receive} For receiving filtered frames
   * @see {@link processAll} For combined send+receive operation
   * @see {@link frames} For processing frame streams
   * @see {@link flush} For end-of-stream handling
   * @see {@link processSync} For synchronous version
   */
  async process(frame: Frame | null): Promise<void> {
    if (this.isClosed) {
      return;
    }

    // Null frame = flush filter
    if (frame === null) {
      await this.flush();
      return;
    }

    // Open filter if not already done
    this.initializePromise ??= this.initialize(frame);
    await this.initializePromise;

    if (!this.buffersrcCtx || !this.buffersinkCtx) {
      throw new Error('Could not initialize filter contexts');
    }

    // Check for frame property changes (FFmpeg: dropOnChange/allowReinit logic)
    if (!this.checkFramePropertiesChanged(frame)) {
      // Frame dropped due to property change
      return;
    }

    // If reinitialized, reinitialize now
    if (!this.initialized) {
      this.initializePromise = this.initialize(frame);
      await this.initializePromise;
    }

    if (!this.buffersrcCtx || !this.buffersinkCtx) {
      throw new Error('Could not reinitialize filter contexts');
    }

    // Rescale timestamps to filter's timeBase
    if (this.calculatedTimeBase) {
      const originalTimeBase = frame.timeBase;
      frame.pts = avRescaleQ(frame.pts, originalTimeBase, this.calculatedTimeBase);
      frame.duration = avRescaleQ(frame.duration, originalTimeBase, this.calculatedTimeBase);
      frame.timeBase = new Rational(this.calculatedTimeBase.num, this.calculatedTimeBase.den);
    }

    // Send frame to filter with PUSH flag for immediate processing
    // KEEP_REF preserves the input frame's hw_frames_ctx for reuse across multiple filters
    const addRet = await this.buffersrcCtx.buffersrcAddFrame(frame, (AV_BUFFERSRC_FLAG_PUSH | AV_BUFFERSRC_FLAG_KEEP_REF) as AVBufferSrcFlag);
    FFmpegError.throwIfError(addRet, 'Failed to add frame to filter');
  }

  /**
   * Send a frame to the filter synchronously.
   * Synchronous version of process.
   *
   * Sends a frame to the filter for processing.
   * Does not return filtered frames - use {@link receiveSync} to retrieve frames.
   * On first frame, automatically builds filter graph with frame properties.
   * A single input frame can produce zero, one, or multiple output frames.
   *
   * **Important**: This method only SENDS the frame to the filter.
   * You must call {@link receiveSync} separately (potentially multiple times) to get filtered frames.
   *
   * Direct mapping to av_buffersrc_add_frame().
   *
   * @param frame - Input frame to send to filter, or null to flush
   *
   * @throws {Error} If filter could not be initialized
   *
   * @throws {FFmpegError} If sending frame fails
   *
   * @example
   * ```typescript
   * // Send frame and receive filtered frames
   * filter.processSync(inputFrame);
   *
   * // Receive all available filtered frames
   * let output;
   * while ((output = filter.receiveSync())) {
   *   console.log(`Got filtered frame: pts=${output.pts}`);
   *   output.free();
   * }
   * ```
   *
   * @see {@link receiveSync} For receiving filtered frames
   * @see {@link processAllSync} For combined send+receive operation
   * @see {@link framesSync} For processing frame streams
   * @see {@link flushSync} For end-of-stream handling
   * @see {@link process} For async version
   */
  processSync(frame: Frame | null): void {
    if (this.isClosed) {
      return;
    }

    // Null frame = flush filter
    if (frame === null) {
      this.flushSync();
      return;
    }

    // Open filter if not already done
    if (!this.initialized) {
      this.initializeSync(frame);
    }

    if (!this.buffersrcCtx || !this.buffersinkCtx) {
      throw new Error('Could not initialize filter contexts');
    }

    // Check for frame property changes (FFmpeg: dropOnChange/allowReinit logic)
    if (!this.checkFramePropertiesChanged(frame)) {
      // Frame dropped due to property change
      return;
    }

    // If reinitialized, reinitialize now
    if (!this.initialized) {
      this.initializeSync(frame);
    }

    if (!this.buffersrcCtx || !this.buffersinkCtx) {
      throw new Error('Could not reinitialize filter contexts');
    }

    // Rescale timestamps to filter's timeBase
    if (this.calculatedTimeBase) {
      const originalTimeBase = frame.timeBase;
      frame.pts = avRescaleQ(frame.pts, originalTimeBase, this.calculatedTimeBase);
      frame.duration = avRescaleQ(frame.duration, originalTimeBase, this.calculatedTimeBase);
      frame.timeBase = new Rational(this.calculatedTimeBase.num, this.calculatedTimeBase.den);
    }

    // Send frame to filter with PUSH flag for immediate processing
    // KEEP_REF preserves the input frame's hw_frames_ctx for reuse across multiple filters
    const addRet = this.buffersrcCtx.buffersrcAddFrameSync(frame, (AV_BUFFERSRC_FLAG_PUSH | AV_BUFFERSRC_FLAG_KEEP_REF) as AVBufferSrcFlag);
    FFmpegError.throwIfError(addRet, 'Failed to add frame to filter');
  }

  /**
   * Process a frame through the filter.
   *
   * Applies filter operations to input frame and receives all available output frames.
   * Returns array of frames - may be empty if filter needs more input.
   * On first frame, automatically builds filter graph with frame properties.
   * One input frame can produce zero, one, or multiple output frames depending on filter.
   * Hardware frames context is automatically detected from frame.
   *
   * Direct mapping to av_buffersrc_add_frame() and av_buffersink_get_frame().
   *
   * @param frame - Input frame to process
   *
   * @returns Array of filtered frames (empty if buffered or filter closed)
   *
   * @throws {Error} If filter could not be initialized
   *
   * @throws {FFmpegError} If processing fails
   *
   * @example
   * ```typescript
   * const frames = await filter.processAll(inputFrame);
   * for (const output of frames) {
   *   console.log(`Got filtered frame: pts=${output.pts}`);
   *   output.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Process frame - may return multiple frames (e.g. fps filter)
   * const frames = await filter.processAll(frame);
   * for (const output of frames) {
   *   yield output;
   * }
   * ```
   *
   * @see {@link process} For single frame processing
   * @see {@link frames} For processing frame streams
   * @see {@link flush} For end-of-stream handling
   * @see {@link processAllSync} For synchronous version
   */
  async processAll(frame: Frame | null): Promise<Frame[]> {
    await this.process(frame);

    // Receive all available frames
    const frames: Frame[] = [];
    while (true) {
      const outputFrame = await this.receive();
      if (!outputFrame) break; // Stop on EAGAIN or EOF
      frames.push(outputFrame); // Only push actual frames
    }

    return frames;
  }

  /**
   * Process a frame through the filter synchronously.
   * Synchronous version of processAll.
   *
   * Applies filter operations to input frame and receives all available output frames.
   * Returns array of frames - may be empty if filter needs more input.
   * On first frame, automatically builds filter graph with frame properties.
   * One input frame can produce zero, one, or multiple output frames depending on filter.
   * Hardware frames context is automatically detected from frame.
   *
   * Direct mapping to av_buffersrc_add_frame() and av_buffersink_get_frame().
   *
   * @param frame - Input frame to process
   *
   * @returns Array of filtered frames (empty if buffered or filter closed)
   *
   * @throws {Error} If filter could not be initialized
   *
   * @throws {FFmpegError} If processing fails
   *
   * @example
   * ```typescript
   * const outputs = filter.processAllSync(inputFrame);
   * for (const output of outputs) {
   *   console.log(`Got filtered frame: pts=${output.pts}`);
   *   output.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Process frame - may return multiple frames (e.g. fps filter)
   * const outputs = filter.processAllSync(frame);
   * for (const output of outputs) {
   *   yield output;
   * }
   * ```
   *
   * @see {@link processSync} For single frame processing
   * @see {@link framesSync} For processing frame streams
   * @see {@link flushSync} For end-of-stream handling
   * @see {@link process} For async version
   */
  processAllSync(frame: Frame): Frame[] {
    this.processSync(frame);

    // Receive all available frames
    const frames: Frame[] = [];
    while (true) {
      const outputFrame = this.receiveSync();
      if (!outputFrame) break; // Stop on EAGAIN or EOF
      frames.push(outputFrame); // Only push actual frames
    }

    return frames;
  }

  /**
   * Process frame stream through filter.
   *
   * High-level async generator for filtering frame streams.
   * Filter is only flushed when EOF (null) signal is explicitly received.
   * Primary interface for stream-based filtering.
   *
   * **EOF Handling:**
   * - Send null to flush filter and get remaining buffered frames
   * - Generator yields null after flushing when null is received
   * - No automatic flushing - filter stays open until EOF or close()
   *
   * @param frames - Async iterable of frames, single frame, or null to flush
   *
   * @yields {Frame | null} Filtered frames, followed by null when explicitly flushed
   *
   * @throws {Error} If filter not ready
   *
   * @throws {FFmpegError} If processing fails
   *
   * @example
   * ```typescript
   * // Stream of frames with automatic EOF propagation
   * for await (const frame of filter.frames(decoder.frames(packets))) {
   *   if (frame === null) {
   *     console.log('Filter flushed');
   *     break;
   *   }
   *   await encoder.encode(frame);
   *   frame.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Single frame - no automatic flush
   * for await (const frame of filter.frames(singleFrame)) {
   *   await encoder.encode(frame);
   *   frame.free();
   * }
   * // Filter remains open, buffered frames not flushed
   * ```
   *
   * @example
   * ```typescript
   * // Explicit flush with EOF
   * for await (const frame of filter.frames(null)) {
   *   if (frame === null) {
   *     console.log('All buffered frames flushed');
   *     break;
   *   }
   *   console.log('Buffered frame:', frame.pts);
   *   frame.free();
   * }
   * ```
   *
   * @see {@link process} For single frame processing
   * @see {@link Decoder.frames} For frames source
   * @see {@link framesSync} For sync version
   */
  async *frames(frames: AsyncIterable<Frame | null> | Frame | null): AsyncGenerator<Frame | null> {
    const self = this;

    const processFrame = async function* (frame: Frame) {
      await self.process(frame);

      while (true) {
        const filtered = await self.receive();
        if (!filtered) break;
        yield filtered;
      }
    }.bind(this);

    const finalize = async function* () {
      for await (const remaining of self.flushFrames()) {
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
      if (frame === null) {
        yield* finalize();
        return;
      }

      yield* processFrame(frame);
    }
  }

  /**
   * Process frame stream through filter synchronously.
   * Synchronous version of frames.
   *
   * High-level sync generator for filtering frame streams.
   * Filter is only flushed when EOF (null) signal is explicitly received.
   * Primary interface for stream-based filtering.
   *
   * **EOF Handling:**
   * - Send null to flush filter and get remaining buffered frames
   * - Generator yields null after flushing when null is received
   * - No automatic flushing - filter stays open until EOF or close()
   *
   * @param frames - Iterable of frames, single frame, or null to flush
   *
   * @yields {Frame | null} Filtered frames, followed by null when explicitly flushed
   *
   * @throws {Error} If filter not ready
   *
   * @throws {FFmpegError} If processing fails
   *
   * @example
   * ```typescript
   * // Stream of frames with automatic EOF propagation
   * for (const frame of filter.framesSync(decoder.framesSync(packets))) {
   *   if (frame === null) {
   *     console.log('Filter flushed');
   *     break;
   *   }
   *   encoder.encodeSync(frame);
   *   frame.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Single frame - no automatic flush
   * for (const frame of filter.framesSync(singleFrame)) {
   *   encoder.encodeSync(frame);
   *   frame.free();
   * }
   * // Filter remains open, buffered frames not flushed
   * ```
   *
   * @example
   * ```typescript
   * // Explicit flush with EOF
   * for (const frame of filter.framesSync(null)) {
   *   if (frame === null) {
   *     console.log('All buffered frames flushed');
   *     break;
   *   }
   *   console.log('Buffered frame:', frame.pts);
   *   frame.free();
   * }
   * ```
   *
   * @see {@link processSync} For single frame processing
   * @see {@link Decoder.framesSync} For frames source
   * @see {@link frames} For async version
   */
  *framesSync(frames: Iterable<Frame | null> | Frame | null): Generator<Frame | null> {
    const self = this;

    // Helper: Process frame and yield all available filtered frames (filters out EAGAIN nulls)
    const processFrame = function* (frame: Frame) {
      self.processSync(frame);

      // Receive ALL filtered frames (filter out null/EAGAIN)
      while (true) {
        const filtered = self.receiveSync();
        if (!filtered) break; // EAGAIN or EOF - no more frames available
        yield filtered; // Only yield actual frames, not null
      }
    }.bind(this);

    // Helper: Flush filter and signal EOF
    const finalize = function* () {
      for (const remaining of self.flushFramesSync()) {
        yield remaining; // Only yield actual frames
      }
      yield null; // Signal end-of-stream
    }.bind(this);

    // Case 1: EOF input -> flush only
    if (frames === null) {
      yield* finalize();
      return;
    }

    // Case 2: Single frame
    if (frames instanceof Frame) {
      yield* processFrame(frames);
      // No automatic flush - only flush on explicit EOF
      return;
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
    // No automatic flush - only flush on explicit EOF
  }

  /**
   * Flush filter and signal end-of-stream.
   *
   * Sends null frame to flush buffered data.
   * Must call receive() to get flushed frames.
   * Does nothing if filter is closed or was never initialized.
   *
   * Direct mapping to av_buffersrc_add_frame(NULL).
   *
   * @throws {FFmpegError} If flush fails
   *
   * @example
   * ```typescript
   * await filter.flush();
   * // Get remaining frames
   * let frame;
   * while ((frame = await filter.receive()) !== null) {
   *   frame.free();
   * }
   * ```
   *
   * @see {@link flushFrames} For async iteration
   * @see {@link receive} For getting flushed frames
   * @see {@link flushSync} For synchronous version
   */
  async flush(): Promise<void> {
    if (this.isClosed || !this.initialized || !this.buffersrcCtx) {
      return;
    }

    // Send flush frame (null)
    const ret = await this.buffersrcCtx.buffersrcAddFrame(null, AV_BUFFERSRC_FLAG_PUSH);
    if (ret < 0 && ret !== AVERROR_EOF) {
      FFmpegError.throwIfError(ret, 'Failed to flush filter');
    }
  }

  /**
   * Flush filter and signal end-of-stream synchronously.
   * Synchronous version of flush.
   *
   * Sends null frame to flush buffered data.
   * Must call receiveSync() to get flushed frames.
   * Does nothing if filter is closed or was never initialized.
   *
   * Direct mapping to av_buffersrc_add_frame(NULL).
   *
   * @throws {FFmpegError} If flush fails
   *
   * @example
   * ```typescript
   * filter.flushSync();
   * // Get remaining frames
   * let frame;
   * while ((frame = filter.receiveSync()) !== null) {
   *   frame.free();
   * }
   * ```
   *
   * @see {@link flushFramesSync} For sync iteration
   * @see {@link receiveSync} For getting flushed frames
   * @see {@link flush} For async version
   */
  flushSync(): void {
    if (this.isClosed || !this.initialized || !this.buffersrcCtx) {
      return;
    }

    // Send flush frame (null)
    const ret = this.buffersrcCtx.buffersrcAddFrameSync(null, AV_BUFFERSRC_FLAG_PUSH);
    if (ret < 0 && ret !== AVERROR_EOF) {
      FFmpegError.throwIfError(ret, 'Failed to flush filter');
    }
  }

  /**
   * Flush filter and yield remaining frames.
   *
   * Convenient async generator for flushing.
   * Combines flush and receive operations.
   * Returns immediately if filter is closed or was never initialized.
   *
   * @yields {Frame} Remaining frames from filter
   *
   * @throws {FFmpegError} If flush fails
   *
   * @example
   * ```typescript
   * for await (const frame of filter.flushFrames()) {
   *   console.log(`Flushed frame: pts=${frame.pts}`);
   *   frame.free();
   * }
   * ```
   *
   * @see {@link process} For frame processing
   * @see {@link flush} For manual flush
   * @see {@link flushFramesSync} For sync version
   */
  async *flushFrames(): AsyncGenerator<Frame> {
    // Send flush signal
    await this.flush();

    // Yield all remaining frames (filter out null/EAGAIN and EOF)
    while (true) {
      const frame = await this.receive();
      if (!frame) break; // Stop on EAGAIN or EOF
      yield frame; // Only yield actual frames
    }
  }

  /**
   * Flush filter and yield remaining frames synchronously.
   * Synchronous version of flushFrames.
   *
   * Convenient sync generator for flushing.
   * Combines flush and receive operations.
   * Returns immediately if filter is closed or was never initialized.
   *
   * @yields {Frame} Remaining frames from filter
   *
   * @throws {FFmpegError} If flush fails
   *
   * @example
   * ```typescript
   * for (const frame of filter.flushFramesSync()) {
   *   console.log(`Flushed frame: pts=${frame.pts}`);
   *   frame.free();
   * }
   * ```
   *
   * @see {@link processSync} For frame processing
   * @see {@link flushSync} For manual flush
   * @see {@link flushFrames} For async version
   */
  *flushFramesSync(): Generator<Frame> {
    // Send flush signal
    this.flushSync();

    // Yield all remaining frames (filter out null/EAGAIN and EOF)
    while (true) {
      const frame = this.receiveSync();
      if (!frame) break; // Stop on EAGAIN or EOF
      yield frame; // Only yield actual frames
    }
  }

  /**
   * Receive buffered frame from filter.
   *
   * Drains frames buffered by the filter.
   * Call repeatedly until null or EOF to get all buffered frames.
   * Implements FFmpeg's send/receive pattern.
   *
   * **Return Values:**
   * - `Frame` - Successfully received frame (AVERROR >= 0)
   * - `null` - Need more input data (AVERROR_EAGAIN), or filter not initialized
   * - `undefined` - End of stream reached (AVERROR_EOF), or filter is closed
   *
   * Direct mapping to av_buffersink_get_frame().
   *
   * @returns Buffered frame, null if need more data, or undefined if stream ended
   *
   * @throws {FFmpegError} If receiving fails
   *
   * @throws {Error} If frame cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * // Process all buffered frames
   * while (true) {
   *   const frame = await filter.receive();
   *   if (!frame) break; // Stop on EAGAIN or EOF
   *   console.log(`Received frame: pts=${frame.pts}`);
   *   frame.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Handle each return value explicitly
   * const frame = await filter.receive();
   * if (frame === EOF) {
   *   console.log('Filter stream ended');
   * } else if (frame === null) {
   *   console.log('Need more input data');
   * } else {
   *   console.log(`Got frame: pts=${frame.pts}`);
   *   frame.free();
   * }
   * ```
   *
   * @see {@link process} For frame processing
   * @see {@link flush} For flushing filter
   * @see {@link receiveSync} For synchronous version
   * @see {@link EOF} For end-of-stream signal
   */
  async receive(): Promise<Frame | EOFSignal | null> {
    if (this.isClosed) {
      return EOF;
    }

    if (!this.initialized || !this.buffersinkCtx) {
      return null;
    }

    // Reuse frame - but alloc() instead of unref() for buffersink
    // buffersink needs a fresh allocated frame, not an unreferenced one
    this.frame.alloc();

    const ret = await this.buffersinkCtx.buffersinkGetFrame(this.frame);

    if (ret >= 0) {
      // Post-process output frame (set timeBase from buffersink, calculate duration)
      this.postProcessOutputFrame(this.frame);
      // Clone for user (keeps internal frame for reuse)
      const cloned = this.frame.clone();
      if (!cloned) {
        throw new Error('Failed to clone frame (out of memory)');
      }
      return cloned;
    } else if (ret === AVERROR_EAGAIN) {
      // Need more data
      return null;
    } else if (ret === AVERROR_EOF) {
      // End of stream
      return EOF;
    } else {
      FFmpegError.throwIfError(ret, 'Failed to receive frame from filter');
      return null;
    }
  }

  /**
   * Receive buffered frame from filter synchronously.
   * Synchronous version of receive.
   *
   * Drains frames buffered by the filter.
   * Call repeatedly until null or EOF to get all buffered frames.
   * Implements FFmpeg's send/receive pattern.
   *
   * **Return Values:**
   * - `Frame` - Successfully received frame (AVERROR >= 0)
   * - `null` - Need more input data (AVERROR_EAGAIN), or filter not initialized
   * - `undefined` - End of stream reached (AVERROR_EOF), or filter is closed
   *
   * Direct mapping to av_buffersink_get_frame().
   *
   * @returns Buffered frame, null if need more data, or undefined if stream ended
   *
   * @throws {FFmpegError} If receiving fails
   *
   * @throws {Error} If frame cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * // Process all buffered frames
   * while (true) {
   *   const frame = filter.receiveSync();
   *   if (!frame) break; // Stop on EAGAIN or EOF
   *   console.log(`Received frame: pts=${frame.pts}`);
   *   frame.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Handle each return value explicitly
   * const frame = filter.receiveSync();
   * if (frame === EOF) {
   *   console.log('Filter stream ended');
   * } else if (frame === null) {
   *   console.log('Need more input data');
   * } else {
   *   console.log(`Got frame: pts=${frame.pts}`);
   *   frame.free();
   * }
   * ```
   *
   * @see {@link processSync} For frame processing
   * @see {@link flushSync} For flushing filter
   * @see {@link receive} For async version
   * @see {@link EOF} For end-of-stream signal
   */
  receiveSync(): Frame | EOFSignal | null {
    if (this.isClosed) {
      return EOF;
    }

    if (!this.initialized || !this.buffersinkCtx) {
      return null;
    }

    // Reuse frame - but alloc() instead of unref() for buffersink
    // buffersink needs a fresh allocated frame, not an unreferenced one
    this.frame.alloc();

    const ret = this.buffersinkCtx.buffersinkGetFrameSync(this.frame);

    if (ret >= 0) {
      // Post-process output frame (set timeBase from buffersink, calculate duration)
      this.postProcessOutputFrame(this.frame);
      // Clone for user (keeps internal frame for reuse)
      const cloned = this.frame.clone();
      if (!cloned) {
        throw new Error('Failed to clone frame (out of memory)');
      }
      return cloned;
    } else if (ret === AVERROR_EAGAIN) {
      return null; // Need more data
    } else if (ret === AVERROR_EOF) {
      return EOF; // End of stream
    } else {
      FFmpegError.throwIfError(ret, 'Failed to receive frame from filter');
      return null;
    }
  }

  /**
   * Send command to filter.
   *
   * Sends runtime command to specific filter in graph.
   * Allows dynamic parameter adjustment.
   *
   * Direct mapping to avfilter_graph_send_command().
   *
   * @param target - Target filter name
   *
   * @param cmd - Command name
   *
   * @param arg - Command argument
   *
   * @param flags - Command flags
   *
   * @returns Response string from filter
   *
   * @throws {Error} If filter not ready
   *
   * @throws {FFmpegError} If command fails
   *
   * @example
   * ```typescript
   * // Change volume at runtime
   * const response = filter.sendCommand('volume', 'volume', '0.5');
   * console.log(`Volume changed: ${response}`);
   * ```
   *
   * @see {@link queueCommand} For delayed commands
   */
  sendCommand(target: string, cmd: string, arg: string, flags?: AVFilterCmdFlag): string {
    if (this.isClosed) {
      throw new Error('Filter is closed');
    }

    if (!this.initialized) {
      throw new Error('Filter not initialized');
    }

    const result = this.graph.sendCommand(target, cmd, arg, flags);

    if (typeof result === 'number') {
      FFmpegError.throwIfError(result, 'Failed to send filter command');
      return '';
    }

    return result.response ?? '';
  }

  /**
   * Queue command for later execution.
   *
   * Schedules command to execute at specific timestamp.
   * Useful for synchronized parameter changes.
   *
   * Direct mapping to avfilter_graph_queue_command().
   *
   * @param target - Target filter name
   *
   * @param cmd - Command name
   *
   * @param arg - Command argument
   *
   * @param ts - Timestamp for execution
   *
   * @param flags - Command flags
   *
   * @throws {Error} If filter not ready
   *
   * @throws {FFmpegError} If queue fails
   *
   * @example
   * ```typescript
   * // Queue volume change at 10 seconds
   * filter.queueCommand('volume', 'volume', '0.8', 10.0);
   * ```
   *
   * @see {@link sendCommand} For immediate commands
   */
  queueCommand(target: string, cmd: string, arg: string, ts: number, flags?: AVFilterCmdFlag): void {
    if (this.isClosed) {
      throw new Error('Filter is closed');
    }

    if (!this.initialized) {
      throw new Error('Filter not initialized');
    }

    const ret = this.graph.queueCommand(target, cmd, arg, ts, flags);
    FFmpegError.throwIfError(ret, 'Failed to queue filter command');
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
  pipeTo(target: FilterAPI): Scheduler<Frame>;
  pipeTo(target: Encoder): Scheduler<Frame>;
  pipeTo(target: FilterAPI | Encoder): Scheduler<Frame> {
    const t = target as unknown as SchedulableComponent<Frame>;

    // Store reference to next component for flush propagation
    this.nextComponent = t;

    // Start worker if not already running
    this.workerPromise ??= this.runWorker();

    // Start pipe task: filter.outputQueue -> target.inputQueue (via target.send)
    this.pipeToPromise = (async () => {
      while (true) {
        const frame = await this.receiveFrame();
        if (!frame) break;
        await t.sendToQueue(frame);
      }
    })();

    // Return scheduler for chaining (target is now the last component)
    return new Scheduler<Frame>(this as unknown as SchedulableComponent<Frame>, t);
  }

  /**
   * Free filter resources.
   *
   * Releases filter graph and contexts.
   * Safe to call multiple times.
   *
   * @example
   * ```typescript
   * filter.close();
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

    this.buffersrcCtx?.free();
    this.buffersinkCtx?.free();
    this.buffersrcCtx = null;
    this.buffersinkCtx = null;

    this.frame.free();
    this.graph.free();

    this.initialized = false;
    this.initializePromise = null;
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

        await this.process(frame);

        // Receive all available frames
        while (!this.outputQueue.isClosed) {
          const buffered = await this.receive();
          if (!buffered) break; // Stop on EAGAIN or EOF
          await this.outputQueue.send(buffered); // Only send actual frames
        }
      }

      // Flush filter at end
      await this.flush();
      while (!this.outputQueue.isClosed) {
        const frame = await this.receive();
        if (!frame) break; // Stop on EAGAIN or EOF
        await this.outputQueue.send(frame); // Only send actual frames
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
   * When frame is provided, queues it for filtering.
   * When null is provided, triggers flush sequence:
   * - Closes input queue
   * - Waits for worker completion
   * - Flushes filter and sends remaining frames to output queue
   * - Closes output queue
   * - Waits for pipeTo task completion
   * - Propagates flush to next component (if any)
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

      // Flush filter at end (like FFmpeg does)
      await this.flush();

      // Send all flushed frames to output queue
      while (true) {
        const frame = await this.receive();
        if (!frame) break; // Stop on EAGAIN or EOF
        await this.outputQueue.send(frame); // Only send actual frames
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
  private async receiveFrame(): Promise<Frame | null> {
    return await this.outputQueue.receive();
  }

  /**
   * Initialize filter graph from first frame.
   *
   * Creates and configures filter graph components.
   * Sets buffer source parameters from frame properties.
   * Automatically configures hardware frames context if present.
   *
   * @param frame - First frame to process, provides format and hw context
   *
   * @throws {Error} If initialization fails
   *
   * @throws {FFmpegError} If configuration fails
   *
   * @internal
   */
  private async initialize(frame: Frame): Promise<void> {
    // Calculate timeBase from first frame
    this.calculatedTimeBase = this.calculateTimeBase(frame);

    // Track initial frame properties for change detection
    this.lastFrameProps = {
      format: frame.format,
      width: frame.width,
      height: frame.height,
      sampleRate: frame.sampleRate,
      channels: frame.channelLayout?.nbChannels ?? 0,
    };

    // Set graph options before parsing
    if (this.options.scaleSwsOpts) {
      this.graph.scaleSwsOpts = this.options.scaleSwsOpts;
    }

    if (this.options.audioResampleOpts) {
      this.graph.aresampleSwrOpts = this.options.audioResampleOpts;
    }

    // Create buffer source and sink
    this.createBufferSource(frame);
    this.createBufferSink(frame);

    // Parse filter description
    this.parseFilterDescription(frame);

    // Configure the graph
    const ret = await this.graph.config();
    FFmpegError.throwIfError(ret, 'Failed to configure filter graph');

    this.initialized = true;
  }

  /**
   * Initialize filter graph from first frame synchronously.
   * Synchronous version of initialize.
   *
   * Creates and configures filter graph components.
   * Sets buffer source parameters from frame properties.
   * Automatically configures hardware frames context if present.
   *
   * @param frame - First frame to process, provides format and hw context
   *
   * @throws {Error} If initialization fails
   *
   * @throws {FFmpegError} If configuration fails
   *
   * @internal
   *
   * @see {@link initialize} For async version
   */
  private initializeSync(frame: Frame): void {
    // Calculate timeBase from first frame
    this.calculatedTimeBase = this.calculateTimeBase(frame);

    // Track initial frame properties for change detection
    this.lastFrameProps = {
      format: frame.format,
      width: frame.width,
      height: frame.height,
      sampleRate: frame.sampleRate,
      channels: frame.channelLayout?.nbChannels ?? 0,
    };

    // Set graph options before parsing
    if (this.options.scaleSwsOpts) {
      this.graph.scaleSwsOpts = this.options.scaleSwsOpts;
    }

    if (this.options.audioResampleOpts) {
      this.graph.aresampleSwrOpts = this.options.audioResampleOpts;
    }

    // Create buffer source and sink
    this.createBufferSource(frame);
    this.createBufferSink(frame);

    // Parse filter description
    this.parseFilterDescription(frame);

    // Configure the graph
    const ret = this.graph.configSync();
    FFmpegError.throwIfError(ret, 'Failed to configure filter graph');

    this.initialized = true;
  }

  /**
   * Check if frame properties changed and handle according to dropOnChange/allowReinit options.
   *
   * Implements FFmpeg's IFILTER_FLAG_DROPCHANGED and IFILTER_FLAG_REINIT logic
   *
   * @param frame - Frame to check
   *
   * @returns true if frame should be processed, false if frame should be dropped
   *
   * @throws {Error} If format changed and allowReinit is false
   *
   * @internal
   */
  private checkFramePropertiesChanged(frame: Frame): boolean {
    if (!this.lastFrameProps) {
      return true; // No previous frame, allow
    }

    // Check for property changes
    const changed =
      frame.format !== this.lastFrameProps.format ||
      frame.width !== this.lastFrameProps.width ||
      frame.height !== this.lastFrameProps.height ||
      frame.sampleRate !== this.lastFrameProps.sampleRate ||
      (frame.channelLayout?.nbChannels ?? 0) !== this.lastFrameProps.channels;

    if (!changed) {
      return true; // No changes, process frame
    }

    // Properties changed - check dropOnChange flag
    if (this.options.dropOnChange) {
      return false; // Drop frame
    }

    // Check allowReinit flag
    // Default is true (allow reinit), only block if explicitly set to false
    const allowReinit = this.options.allowReinit !== false;
    if (!allowReinit && this.initialized) {
      throw new Error(
        'Frame properties changed but allowReinit is false. ' +
          `Format: ${this.lastFrameProps.format}->${frame.format}, ` +
          `Size: ${this.lastFrameProps.width}x${this.lastFrameProps.height}->${frame.width}x${frame.height}`,
      );
    }

    // Close current graph and reinitialize
    this.graph.free();

    // Create new graph
    this.graph = new FilterGraph();
    this.graph.alloc();

    // Configure threading
    if (this.options.threads !== undefined) {
      this.graph.nbThreads = this.options.threads;
    }

    // Configure scaler options
    if (this.options.scaleSwsOpts) {
      this.graph.scaleSwsOpts = this.options.scaleSwsOpts;
    }

    this.buffersrcCtx = null;
    this.buffersinkCtx = null;
    this.initialized = false;
    this.initializePromise = null;
    this.calculatedTimeBase = null;

    return true; // Will be reinitialized on next process
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
        // VFR mode: Use frame.timeBase
        return frame.timeBase;
      }
    }
  }

  /**
   * Post-process output frame from buffersink.
   *
   * Applies FFmpeg's fg_output_step() behavior:
   * 1. Sets frame.timeBase from buffersink (filters can change timeBase, e.g., aresample)
   * 2. Calculates video frame duration from frame rate if not set
   *
   * This must be called AFTER buffersinkGetFrame() for every output frame.
   *
   * @param frame - Output frame from buffersink
   *
   * @throws {Error} If buffersink context not available
   *
   * @internal
   */
  private postProcessOutputFrame(frame: Frame): void {
    if (!this.buffersinkCtx) {
      throw new Error('Buffersink context not available');
    }

    // Filters can change timeBase (e.g., aresample sets output to {1, out_sample_rate})
    // Without this, frame has INPUT timeBase instead of filter's OUTPUT timeBase
    frame.timeBase = this.buffersinkCtx.buffersinkGetTimeBase();

    if (frame.isVideo() && !frame.duration) {
      const frameRate = this.buffersinkCtx.buffersinkGetFrameRate();
      if (frameRate.num > 0 && frameRate.den > 0) {
        frame.duration = avRescaleQ(1, avInvQ(frameRate), frame.timeBase);
      }
    }
  }

  /**
   * Create buffer source with frame parameters.
   *
   * Configures buffer source with frame properties including hardware context.
   * Automatically detects video/audio and sets appropriate parameters.
   *
   * @param frame - Frame providing format, dimensions, and hw_frames_ctx
   *
   * @throws {Error} If creation fails
   *
   * @throws {FFmpegError} If configuration fails
   *
   * @internal
   */
  private createBufferSource(frame: Frame): void {
    const filterName = frame.isVideo() ? 'buffer' : 'abuffer';
    const bufferFilter = Filter.getByName(filterName);
    if (!bufferFilter) {
      throw new FFmpegError(AVERROR_FILTER_NOT_FOUND);
    }

    // Ensure timeBase was calculated
    if (!this.calculatedTimeBase) {
      throw new Error('TimeBase not calculated - this should not happen');
    }

    // For audio, create with args. For video, use allocFilter + buffersrcParametersSet
    if (frame.isVideo()) {
      // Allocate filter without args
      this.buffersrcCtx = this.graph.allocFilter(bufferFilter, 'in');
      if (!this.buffersrcCtx) {
        throw new Error('Failed to allocate buffer source');
      }

      const ret = this.buffersrcCtx.buffersrcParametersSet({
        width: frame.width,
        height: frame.height,
        format: frame.format,
        timeBase: this.calculatedTimeBase,
        frameRate: this.options.framerate,
        sampleAspectRatio: frame.sampleAspectRatio,
        colorRange: frame.colorRange,
        colorSpace: frame.colorSpace,
        hwFramesCtx: frame.hwFramesCtx,
      });
      FFmpegError.throwIfError(ret, 'Failed to set buffer source parameters');

      // Initialize filter
      const initRet = this.buffersrcCtx.init(null);
      FFmpegError.throwIfError(initRet, 'Failed to initialize buffer source');
    } else {
      // For audio, create with args string
      const formatName = avGetSampleFmtName(frame.format as AVSampleFormat);
      const channelLayout = frame.channelLayout.mask === 0n ? `${frame.channelLayout.nbChannels}c` : frame.channelLayout.mask.toString();
      // eslint-disable-next-line @stylistic/max-len
      const args = `time_base=${this.calculatedTimeBase.num}/${this.calculatedTimeBase.den}:sample_rate=${frame.sampleRate}:sample_fmt=${formatName}:channel_layout=${channelLayout}`;
      this.buffersrcCtx = this.graph.createFilter(bufferFilter, 'in', args);
      if (!this.buffersrcCtx) {
        throw new Error('Failed to create audio buffer source');
      }
    }
  }

  /**
   * Create buffer sink.
   *
   * @param frame - Frame
   *
   * @throws {Error} If creation fails
   *
   * @internal
   */
  private createBufferSink(frame: Frame): void {
    const filterName = frame.isVideo() ? 'buffersink' : 'abuffersink';
    const sinkFilter = Filter.getByName(filterName);
    if (!sinkFilter) {
      throw new FFmpegError(AVERROR_FILTER_NOT_FOUND);
    }

    this.buffersinkCtx = this.graph.createFilter(sinkFilter, 'out', null);
    if (!this.buffersinkCtx) {
      throw new Error('Failed to create buffer sink');
    }
  }

  /**
   * Parse filter description and build graph.
   *
   * Uses the Segment API to parse filters, which allows setting hw_device_ctx
   * before filter initialization when needed. Works for both hardware and software filters.
   *
   * @param frame - First frame to process, provides hw_frames_ctx if any
   *
   * @throws {Error} If parsing fails
   *
   * @throws {FFmpegError} If graph construction fails
   *
   * @internal
   */
  private parseFilterDescription(frame: Frame): void {
    if (!this.buffersrcCtx || !this.buffersinkCtx) {
      throw new Error('Buffer filters not initialized');
    }

    // Handle empty or simple passthrough
    if (!this.description || this.description === 'null' || this.description === 'anull') {
      // Direct connection for null filters
      const ret = this.buffersrcCtx.link(0, this.buffersinkCtx, 0);
      FFmpegError.throwIfError(ret, 'Failed to link buffer filters');
      return;
    }

    // Step 1: Parse the filter description into a segment
    const segment = this.graph.segmentParse(this.description);
    if (!segment) {
      throw new Error('Failed to parse filter segment');
    }

    try {
      // Step 2: Create filter instances (but don't initialize yet)
      let ret = segment.createFilters();
      FFmpegError.throwIfError(ret, 'Failed to create filters in segment');

      // Step 3: Set hw_device_ctx on filters that need it BEFORE initialization (if provided)
      const filters = this.graph.filters;
      if (filters) {
        for (const filterCtx of filters) {
          const filter = filterCtx.filter;
          if (filter?.hasFlags(AVFILTER_FLAG_HWDEVICE)) {
            filterCtx.hwDeviceCtx = this.options.hardware?.deviceContext ?? frame.hwFramesCtx?.deviceRef ?? null;

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
      // Create empty FilterInOut objects - segment.apply() will populate them with
      // the segment's unconnected input/output pads
      const inputs = new FilterInOut();
      const outputs = new FilterInOut();

      // Apply the segment - this initializes and links all filters within the segment,
      // and returns the segment's unconnected pads in inputs/outputs
      ret = segment.apply(inputs, outputs);
      FFmpegError.throwIfError(ret, 'Failed to apply segment');

      // Step 6: Manually link buffersrc/buffersink to the segment's unconnected pads
      // After segment.apply():
      //   - inputs contains the segment's free INPUT pads (where buffersrc connects TO)
      //   - outputs contains the segment's free OUTPUT pads (where buffersink connects FROM)

      // Link buffersrc -> first segment input (if any)
      const segmentInput = inputs.filterCtx;
      if (segmentInput) {
        ret = this.buffersrcCtx.link(0, segmentInput, inputs.padIdx);
        FFmpegError.throwIfError(ret, 'Failed to link buffersrc to segment');
      } else {
        // No segment inputs means the filter doesn't accept input
        throw new Error('Segment has no input pads - cannot connect buffersrc');
      }

      // Link last segment output -> buffersink (if any)
      const segmentOutput = outputs.filterCtx;
      if (segmentOutput) {
        ret = segmentOutput.link(outputs.padIdx, this.buffersinkCtx, 0);
        FFmpegError.throwIfError(ret, 'Failed to link segment to buffersink');
      } else {
        // No segment outputs means the filter doesn't produce output
        throw new Error('Segment has no output pads - cannot connect buffersink');
      }

      // Clean up FilterInOut structures
      inputs.free();
      outputs.free();
    } finally {
      // Always free the segment
      segment.free();
    }
  }

  /**
   * Dispose of filter.
   *
   * Implements Disposable interface for automatic cleanup.
   * Equivalent to calling close().
   *
   * @example
   * ```typescript
   * {
   *   using filter = FilterAPI.create('scale=640:480', { ... });
   *   // Use filter...
   * } // Automatically freed
   * ```
   *
   * @see {@link close} For manual cleanup
   */
  [Symbol.dispose](): void {
    this.close();
  }
}
