import { Filter } from './filter.js';
import { HardwareDeviceContext } from './hardware-device-context.js';
import { OptionMember } from './option.js';
import { Rational } from './rational.js';

import type { AVBufferSrcFlag, AVColorRange, AVColorSpace, AVPixelFormat, AVSampleFormat } from '../constants/constants.js';
import type { Frame } from './frame.js';
import type { HardwareFramesContext } from './hardware-frames-context.js';
import type { NativeDictionary, NativeFilterContext, NativeFilterGraph, NativeWrapper } from './native-types.js';
import type { ChannelLayout, IRational } from './types.js';

/**
 * Filter instance in a filter graph.
 *
 * Represents an instantiated filter within a filter graph. Each context contains
 * a specific filter configuration with its parameters, connections to other filters,
 * and input/output pads. Supports both software and hardware filtering operations.
 * Essential for building complex filter chains for audio/video processing.
 *
 * Direct mapping to FFmpeg's AVFilterContext.
 *
 * @example
 * ```typescript
 * import { FilterContext, FilterGraph, Filter, FFmpegError } from 'node-av';
 *
 * // Create filter context in a graph
 * const graph = new FilterGraph();
 * const filter = Filter.getByName('scale');
 * const context = graph.createFilter(filter, 'scaler');
 *
 * // Initialize with parameters
 * const ret = context.initStr('640:480');
 * FFmpegError.throwIfError(ret, 'initStr');
 *
 * // Link filters together
 * const ret2 = source.link(0, context, 0);
 * FFmpegError.throwIfError(ret2, 'link');
 *
 * // For buffer source/sink
 * const ret3 = await bufferSrc.buffersrcAddFrame(frame);
 * FFmpegError.throwIfError(ret3, 'buffersrcAddFrame');
 * ```
 *
 * @see [AVFilterContext](https://ffmpeg.org/doxygen/trunk/structAVFilterContext.html) - FFmpeg Doxygen
 * @see {@link FilterGraph} For managing filter graphs
 * @see {@link Filter} For filter descriptors
 */
export class FilterContext extends OptionMember<NativeFilterContext> implements Disposable, NativeWrapper<NativeFilterContext> {
  /**
   * @param native - The native filter context instance
   *
   * @internal
   */
  constructor(native: NativeFilterContext) {
    super(native);
  }

  /**
   * Filter instance name.
   *
   * User-assigned name for this filter instance in the graph.
   * Used for identification and debugging.
   *
   * Direct mapping to AVFilterContext->name.
   */
  get name(): string | null {
    return this.native.name;
  }

  set name(value: string | null) {
    this.native.name = value;
  }

  /**
   * Filter descriptor.
   *
   * Reference to the filter type this context instantiates.
   *
   * Direct mapping to AVFilterContext->filter.
   */
  get filter(): Filter | null {
    const native = this.native.filter;
    return native ? new Filter(native) : null;
  }

  /**
   * Parent filter graph.
   *
   * Reference to the graph containing this filter context.
   *
   * Direct mapping to AVFilterContext->graph.
   */
  get graph(): NativeFilterGraph | null {
    return this.native.graph;
  }

  /**
   * Number of input pads.
   *
   * Total number of input connections this filter can accept.
   *
   * Direct mapping to AVFilterContext->nb_inputs.
   */
  get nbInputs(): number {
    return this.native.nbInputs;
  }

  /**
   * Number of output pads.
   *
   * Total number of output connections this filter can provide.
   *
   * Direct mapping to AVFilterContext->nb_outputs.
   */
  get nbOutputs(): number {
    return this.native.nbOutputs;
  }

  /**
   * Hardware device context.
   *
   * Hardware acceleration context for GPU-based filtering.
   * Set to enable hardware-accelerated filter operations.
   *
   * Direct mapping to AVFilterContext->hw_device_ctx.
   */
  get hwDeviceCtx(): HardwareDeviceContext | null {
    // Not cached: the native getter returns a fresh object per access, so an
    // identity-based cache can never hit
    const native = this.native.hwDeviceCtx;
    if (!native) {
      return null;
    }

    const device = Object.create(HardwareDeviceContext.prototype) as HardwareDeviceContext;
    (device as any).native = native;
    return device;
  }

  set hwDeviceCtx(value: HardwareDeviceContext | null) {
    this.native.hwDeviceCtx = value?.getNative() ?? null;
  }

  /**
   * Number of extra hardware frames to allocate.
   *
   * Specifies additional hardware frame buffers for filters that need them.
   * Useful for deinterlacing or other filters requiring frame buffering.
   *
   * Direct mapping to AVFilterContext->extra_hw_frames.
   */
  get extraHWFrames(): number {
    return this.native.extraHWFrames;
  }

  set extraHWFrames(value: number) {
    this.native.extraHWFrames = value;
  }

  /**
   * Initialize filter with dictionary options.
   *
   * Configures the filter with key-value option pairs.
   * Must be called after creation and before processing.
   *
   * Direct mapping to avfilter_init_dict().
   *
   * @param options - Dictionary of filter options
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const options = { width: '1920', height: '1080' };
   * const ret = context.init(options);
   * FFmpegError.throwIfError(ret, 'init');
   * ```
   *
   * @see {@link initStr} For string-based initialization
   */
  init(options: NativeDictionary | null = null): number {
    return this.native.init(options ?? null);
  }

  /**
   * Initialize filter with string arguments.
   *
   * Configures the filter using a string representation of parameters.
   * Format depends on the specific filter.
   *
   * Direct mapping to avfilter_init_str().
   *
   * @param args - Filter arguments string
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid arguments
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Scale filter with width:height
   * const ret = scaleContext.initStr('1920:1080');
   * FFmpegError.throwIfError(ret, 'initStr');
   *
   * // Crop filter with width:height:x:y
   * const ret2 = cropContext.initStr('640:480:100:50');
   * FFmpegError.throwIfError(ret2, 'initStr');
   * ```
   *
   * @see {@link init} For dictionary-based initialization
   */
  initStr(args: string | null = null): number {
    return this.native.initStr(args ?? null);
  }

  /**
   * Link this filter's output to another filter's input.
   *
   * Creates a connection between two filters in the graph.
   * Data flows from this filter's output pad to the destination's input pad.
   *
   * Direct mapping to avfilter_link().
   *
   * @param srcPad - Output pad index of this filter
   *
   * @param dst - Destination filter context
   *
   * @param dstPad - Input pad index of destination filter
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid pad indices or incompatible formats
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Link source output 0 to scale input 0
   * const ret = source.link(0, scale, 0);
   * FFmpegError.throwIfError(ret, 'link');
   *
   * // Link scale output 0 to sink input 0
   * const ret2 = scale.link(0, sink, 0);
   * FFmpegError.throwIfError(ret2, 'link');
   * ```
   *
   * @see {@link unlink} To disconnect filters
   */
  link(srcPad: number, dst: FilterContext, dstPad: number): number {
    return this.native.link(srcPad, dst.native, dstPad);
  }

  /**
   * Unlink a filter pad.
   *
   * Disconnects a pad from its linked filter.
   * Used to reconfigure filter connections.
   *
   * Direct mapping to avfilter_link_free().
   *
   * @param pad - Pad index to unlink
   *
   * @example
   * ```typescript
   * // Disconnect output pad 0
   * context.unlink(0);
   * ```
   *
   * @see {@link link} To connect filters
   */
  unlink(pad: number): void {
    this.native.unlink(pad);
  }

  /**
   * Add a frame to a buffer source filter.
   *
   * Sends a frame into the filter graph through a buffer source.
   * Only valid for buffer source filters. Send null to signal EOF.
   *
   * Direct mapping to av_buffersrc_add_frame_flags().
   *
   * @param frame - Frame to send, or null for EOF
   *
   * @param flags - Optional buffersrc flags (defaults to AV_BUFFERSRC_FLAG_NONE = 0)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EAGAIN: Filter needs more output consumption
   *   - AVERROR_EOF: Filter has been closed
   *   - AVERROR_EINVAL: Not a buffer source filter
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AVERROR_EAGAIN, AV_BUFFERSRC_FLAG_PUSH } from 'node-av/constants';
   *
   * // Send frame to filter graph with PUSH flag (immediate processing)
   * const ret = await bufferSrc.buffersrcAddFrame(frame, AV_BUFFERSRC_FLAG_PUSH);
   * if (ret === AVERROR_EAGAIN) {
   *   // Need to consume output first
   * } else {
   *   FFmpegError.throwIfError(ret, 'buffersrcAddFrame');
   * }
   *
   * // Signal EOF
   * await bufferSrc.buffersrcAddFrame(null);
   * ```
   *
   * @see {@link buffersinkGetFrame} To retrieve filtered frames
   */
  async buffersrcAddFrame(frame: Frame | null, flags?: AVBufferSrcFlag): Promise<number> {
    return await this.native.buffersrcAddFrame(frame ? frame.getNative() : null, flags);
  }

  /**
   * Add frame to buffer source filter synchronously.
   * Synchronous version of buffersrcAddFrame.
   *
   * Sends a frame to a buffer source filter for processing.
   * Only valid for buffer source filters (buffer, abuffer).
   *
   * Direct mapping to av_buffersrc_add_frame_flags().
   *
   * @param frame - Frame to send (null to mark EOF)
   *
   * @param flags - Optional buffersrc flags (defaults to AV_BUFFERSRC_FLAG_NONE = 0)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EAGAIN: Need to retrieve output first
   *   - AVERROR_EOF: Graph has finished processing
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR(ENOMEM): Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AVERROR_EAGAIN, AV_BUFFERSRC_FLAG_PUSH } from 'node-av/constants';
   *
   * // Send frame to filter with PUSH flag (immediate processing)
   * const ret = bufferSrc.buffersrcAddFrameSync(frame, AV_BUFFERSRC_FLAG_PUSH);
   * if (ret === AVERROR_EAGAIN) {
   *   // Need to get output frames first
   *   const filtered = new Frame();
   *   bufferSink.buffersinkGetFrameSync(filtered);
   * } else {
   *   FFmpegError.throwIfError(ret, 'buffersrcAddFrameSync');
   * }
   *
   * // Mark end of stream
   * bufferSrc.buffersrcAddFrameSync(null);
   * ```
   *
   * @see {@link buffersrcAddFrame} For async version
   */
  buffersrcAddFrameSync(frame: Frame | null, flags?: AVBufferSrcFlag): number {
    return this.native.buffersrcAddFrameSync(frame ? frame.getNative() : null, flags);
  }

  /**
   * Set parameters for a buffer source filter.
   *
   * Configures the format and properties of frames that will be sent
   * to the buffer source. Must be called before sending frames.
   *
   * Direct mapping to av_buffersrc_parameters_set().
   *
   * @param params - Source parameters
   *
   * @param params.width - Video frame width
   *
   * @param params.height - Video frame height
   *
   * @param params.format - Pixel or sample format
   *
   * @param params.timeBase - Time base for timestamps
   *
   * @param params.frameRate - Video frame rate
   *
   * @param params.sampleAspectRatio - Pixel aspect ratio
   *
   * @param params.hwFramesCtx - Hardware frames context
   *
   * @param params.sampleRate - Audio sample rate
   *
   * @param params.channelLayout - Audio channel layout
   *
   * @param params.colorRange - Color range for video
   *
   * @param params.colorSpace - Color space for video
   *
   * @param params.alphaMode - Alpha channel mode
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError, Rational } from 'node-av';
   * import { AV_PIX_FMT_YUV420P } from 'node-av/constants';
   *
   * // Configure video buffer source
   * const ret = bufferSrc.buffersrcParametersSet({
   *   width: 1920,
   *   height: 1080,
   *   format: AV_PIX_FMT_YUV420P,
   *   timeBase: { num: 1, den: 25 },
   *   frameRate: { num: 25, den: 1 }
   * });
   * FFmpegError.throwIfError(ret, 'buffersrcParametersSet');
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AV_SAMPLE_FMT_FLTP } from 'node-av/constants';
   *
   * // Configure audio buffer source
   * const ret = bufferSrc.buffersrcParametersSet({
   *   format: AV_SAMPLE_FMT_FLTP,
   *   sampleRate: 44100,
   *   channelLayout: AV_CHANNEL_LAYOUT_STEREO
   * });
   * FFmpegError.throwIfError(ret, 'buffersrcParametersSet');
   * ```
   */
  buffersrcParametersSet(params: {
    width?: number;
    height?: number;
    format?: AVPixelFormat | AVSampleFormat;
    timeBase?: IRational;
    frameRate?: IRational;
    sampleAspectRatio?: IRational;
    hwFramesCtx?: HardwareFramesContext | null;
    sampleRate?: number;
    channelLayout?: bigint;
    colorRange?: AVColorRange;
    colorSpace?: AVColorSpace;
    alphaMode?: number;
  }): number {
    const nativeParams: any = { ...params };
    if (params.hwFramesCtx) {
      nativeParams.hwFramesCtx = params.hwFramesCtx.getNative();
    }
    return this.native.buffersrcParametersSet(nativeParams);
  }

  /**
   * Get a frame from a buffer sink filter.
   *
   * Retrieves a filtered frame from the filter graph through a buffer sink.
   * Only valid for buffer sink filters.
   *
   * Direct mapping to av_buffersink_get_frame().
   *
   * @param frame - Frame to receive filtered data
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EAGAIN: No frame available yet
   *   - AVERROR_EOF: No more frames will be produced
   *   - AVERROR_EINVAL: Not a buffer sink filter
   *
   * @example
   * ```typescript
   * import { FFmpegError, Frame } from 'node-av';
   * import { AVERROR_EAGAIN, AVERROR_EOF } from 'node-av/constants';
   *
   * const frame = new Frame();
   * frame.alloc();
   *
   * const ret = await bufferSink.buffersinkGetFrame(frame);
   * if (ret === AVERROR_EAGAIN) {
   *   // No frame available yet
   * } else if (ret === AVERROR_EOF) {
   *   // End of stream
   * } else {
   *   FFmpegError.throwIfError(ret, 'buffersinkGetFrame');
   *   // Process filtered frame
   * }
   * ```
   *
   * @see {@link buffersrcAddFrame} To send frames for filtering
   */
  async buffersinkGetFrame(frame: Frame): Promise<number> {
    return await this.native.buffersinkGetFrame(frame.getNative());
  }

  /**
   * Get frame from buffer sink filter synchronously.
   * Synchronous version of buffersinkGetFrame.
   *
   * Retrieves a filtered frame from a buffer sink filter.
   * Only valid for buffer sink filters (buffersink, abuffersink).
   *
   * Direct mapping to av_buffersink_get_frame().
   *
   * @param frame - Frame to receive filtered data
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EAGAIN: Need more input
   *   - AVERROR_EOF: No more frames available
   *   - AVERROR_EINVAL: Invalid parameters
   *
   * @example
   * ```typescript
   * import { Frame, FFmpegError } from 'node-av';
   * import { AVERROR_EAGAIN, AVERROR_EOF } from 'node-av/constants';
   *
   * // Get filtered frame
   * const filtered = new Frame();
   * const ret = bufferSink.buffersinkGetFrameSync(filtered);
   *
   * if (ret === 0) {
   *   // Process filtered frame
   *   console.log(`Got filtered frame with ${filtered.nbSamples} samples`);
   *   filtered.unref();
   * } else if (ret === AVERROR_EAGAIN) {
   *   // Need more input frames
   * } else if (ret === AVERROR_EOF) {
   *   // No more frames
   * } else {
   *   FFmpegError.throwIfError(ret, 'buffersinkGetFrameSync');
   * }
   * ```
   *
   * @see {@link buffersinkGetFrame} For async version
   */
  buffersinkGetFrameSync(frame: Frame): number {
    return this.native.buffersinkGetFrameSync(frame.getNative());
  }

  /**
   * Get time base from buffer sink.
   *
   * Returns the time base of frames from a buffer sink filter.
   * Only valid for buffer sink filters.
   *
   * Direct mapping to av_buffersink_get_time_base().
   *
   * @returns Time base as Rational
   *
   * @example
   * ```typescript
   * const timeBase = bufferSink.buffersinkGetTimeBase();
   * console.log(`Time base: ${timeBase.num}/${timeBase.den}`);
   * ```
   */
  buffersinkGetTimeBase(): Rational {
    const tb = this.native.buffersinkGetTimeBase();
    return new Rational(tb.num, tb.den);
  }

  /**
   * Get pixel/sample format from buffer sink.
   *
   * Returns the format of frames from a buffer sink filter.
   * Only valid for buffer sink filters.
   *
   * Direct mapping to av_buffersink_get_format().
   *
   * @returns Pixel format for video, sample format for audio
   *
   * @example
   * ```typescript
   * import { AV_PIX_FMT_YUV420P } from 'node-av/constants';
   *
   * const format = bufferSink.buffersinkGetFormat();
   * if (format === AV_PIX_FMT_YUV420P) {
   *   console.log('Output is YUV420P');
   * }
   * ```
   */
  buffersinkGetFormat(): AVPixelFormat | AVSampleFormat {
    return this.native.buffersinkGetFormat();
  }

  /**
   * Get frame width from buffer sink.
   *
   * Returns the width of video frames from a buffer sink filter.
   * Only valid for video buffer sink filters.
   *
   * Direct mapping to av_buffersink_get_w().
   *
   * @returns Frame width in pixels
   *
   * @example
   * ```typescript
   * const width = bufferSink.buffersinkGetWidth();
   * console.log(`Output width: ${width}px`);
   * ```
   */
  buffersinkGetWidth(): number {
    return this.native.buffersinkGetWidth();
  }

  /**
   * Get frame height from buffer sink.
   *
   * Returns the height of video frames from a buffer sink filter.
   * Only valid for video buffer sink filters.
   *
   * Direct mapping to av_buffersink_get_h().
   *
   * @returns Frame height in pixels
   *
   * @example
   * ```typescript
   * const height = bufferSink.buffersinkGetHeight();
   * console.log(`Output height: ${height}px`);
   * ```
   */
  buffersinkGetHeight(): number {
    return this.native.buffersinkGetHeight();
  }

  /**
   * Get sample aspect ratio from buffer sink.
   *
   * Returns the pixel aspect ratio of video frames from a buffer sink filter.
   * Only valid for video buffer sink filters.
   *
   * Direct mapping to av_buffersink_get_sample_aspect_ratio().
   *
   * @returns Sample aspect ratio as Rational
   *
   * @example
   * ```typescript
   * const sar = bufferSink.buffersinkGetSampleAspectRatio();
   * console.log(`SAR: ${sar.num}:${sar.den}`);
   * ```
   */
  buffersinkGetSampleAspectRatio(): Rational {
    const sar = this.native.buffersinkGetSampleAspectRatio();
    return new Rational(sar.num, sar.den);
  }

  /**
   * Get frame rate from buffer sink.
   *
   * Returns the frame rate of video from a buffer sink filter.
   * Only valid for video buffer sink filters.
   *
   * Direct mapping to av_buffersink_get_frame_rate().
   *
   * @returns Frame rate as Rational
   *
   * @example
   * ```typescript
   * const frameRate = bufferSink.buffersinkGetFrameRate();
   * console.log(`Frame rate: ${frameRate.num}/${frameRate.den} fps`);
   * ```
   */
  buffersinkGetFrameRate(): Rational {
    const fr = this.native.buffersinkGetFrameRate();
    return new Rational(fr.num, fr.den);
  }

  /**
   * Get sample rate from buffer sink.
   *
   * Returns the sample rate of audio from a buffer sink filter.
   * Only valid for audio buffer sink filters.
   *
   * Direct mapping to av_buffersink_get_sample_rate().
   *
   * @returns Sample rate in Hz
   *
   * @example
   * ```typescript
   * const sampleRate = bufferSink.buffersinkGetSampleRate();
   * console.log(`Sample rate: ${sampleRate} Hz`);
   * ```
   */
  buffersinkGetSampleRate(): number {
    return this.native.buffersinkGetSampleRate();
  }

  /**
   * Get channel layout from buffer sink.
   *
   * Returns the channel layout of audio from a buffer sink filter.
   * Only valid for audio buffer sink filters.
   *
   * Direct mapping to av_buffersink_get_channel_layout().
   *
   * @returns Channel layout configuration
   *
   * @example
   * ```typescript
   * const layout = bufferSink.buffersinkGetChannelLayout();
   * console.log(`Channels: ${layout.nbChannels}`);
   * ```
   */
  buffersinkGetChannelLayout(): ChannelLayout {
    return this.native.buffersinkGetChannelLayout();
  }

  /**
   * Get color space from buffer sink.
   *
   * Returns the color space of video from a buffer sink filter.
   * Only valid for video buffer sink filters.
   *
   * Direct mapping to av_buffersink_get_colorspace().
   *
   * @returns Color space
   *
   * @example
   * ```typescript
   * const colorSpace = bufferSink.buffersinkGetColorspace();
   * console.log(`Color space: ${colorSpace}`);
   * ```
   */
  buffersinkGetColorspace(): AVColorSpace {
    return this.native.buffersinkGetColorspace();
  }

  /**
   * Get color range from buffer sink.
   *
   * Returns the color range of video from a buffer sink filter.
   * Only valid for video buffer sink filters.
   *
   * Direct mapping to av_buffersink_get_color_range().
   *
   * @returns Color range
   *
   * @example
   * ```typescript
   * const colorRange = bufferSink.buffersinkGetColorRange();
   * console.log(`Color range: ${colorRange}`);
   * ```
   */
  buffersinkGetColorRange(): AVColorRange {
    return this.native.buffersinkGetColorRange();
  }

  /**
   * Free the filter context.
   *
   * Releases all resources associated with the filter context.
   * The context becomes invalid after calling this.
   *
   * Direct mapping to avfilter_free().
   *
   * @example
   * ```typescript
   * context.free();
   * // Context is now invalid
   * ```
   *
   * @see {@link Symbol.dispose} For automatic cleanup
   */
  free(): void {
    this.native.free();
  }

  /**
   * Check if filter is a source.
   *
   * Source filters generate frames without input.
   *
   * @returns True if filter has no inputs
   *
   * @example
   * ```typescript
   * if (context.isSource()) {
   *   console.log('This is a source filter');
   * }
   * ```
   *
   * @see {@link isSink} To check for sink filters
   */
  isSource(): boolean {
    return this.nbInputs === 0;
  }

  /**
   * Check if filter is a sink.
   *
   * Sink filters consume frames without output.
   *
   * @returns True if filter has no outputs
   *
   * @example
   * ```typescript
   * if (context.isSink()) {
   *   console.log('This is a sink filter');
   * }
   * ```
   *
   * @see {@link isSource} To check for source filters
   */
  isSink(): boolean {
    return this.nbOutputs === 0;
  }

  /**
   * Get the underlying native FilterContext object.
   *
   * @returns The native FilterContext binding object
   *
   * @internal
   */
  getNative(): NativeFilterContext {
    return this.native;
  }

  /**
   * Dispose of the filter context.
   *
   * Implements the Disposable interface for automatic cleanup.
   * Equivalent to calling free().
   *
   * @example
   * ```typescript
   * {
   *   using context = graph.createFilter(filter, 'test');
   *   context.initStr('640:480');
   *   // Use context...
   * } // Automatically freed when leaving scope
   * ```
   */
  [Symbol.dispose](): void {
    this.native[Symbol.dispose]();
  }
}
