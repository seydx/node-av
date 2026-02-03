import { AV_NOPTS_VALUE, AV_TIME_BASE_Q, AVMEDIA_TYPE_AUDIO, AVMEDIA_TYPE_UNKNOWN, AVMEDIA_TYPE_VIDEO } from '../constants/constants.js';
import { bindings } from './binding.js';
import { FFmpegError } from './error.js';
import { HardwareFramesContext } from './hardware-frames-context.js';
import { Rational } from './rational.js';

import type {
  AVChromaLocation,
  AVColorPrimaries,
  AVColorRange,
  AVColorSpace,
  AVColorTransferCharacteristic,
  AVFrameSideDataType,
  AVMediaType,
  AVPictureType,
  AVPixelFormat,
  AVSampleFormat,
} from '../constants/constants.js';
import { Dictionary } from './dictionary.js';
import type { NativeFrame, NativeWrapper } from './native-types.js';
import type { ChannelLayout, IRational } from './types.js';

/**
 * Video Frame
 */
export interface VideoFrame {
  width: number;
  height: number;
  format: AVPixelFormat;
  timeBase?: IRational;
  sampleAspectRatio?: IRational;
  pts?: bigint;
}

/**
 * Audio Frame
 */
export interface AudioFrame {
  nbSamples: number;
  format: AVSampleFormat;
  sampleRate: number;
  channelLayout: ChannelLayout;
  timeBase?: IRational;
  pts?: bigint;
}

/**
 * Container for uncompressed audio/video data.
 *
 * Stores decoded audio samples or video pixels. Each frame contains raw data
 * for a single video frame or a set of audio samples. Includes format information,
 * timing data, and metadata. Supports both software and hardware (GPU) frames.
 * Essential for decoding, encoding, and filter operations.
 *
 * Direct mapping to FFmpeg's AVFrame.
 *
 * @example
 * ```typescript
 * import { Frame, FFmpegError } from 'node-av';
 * import { AV_PIX_FMT_YUV420P } from 'node-av/constants';
 *
 * // Create and allocate frame
 * const frame = new Frame();
 * frame.alloc();
 *
 * // Configure video frame
 * frame.format = AV_PIX_FMT_YUV420P;
 * frame.width = 1920;
 * frame.height = 1080;
 * const ret = frame.allocBuffer();
 * FFmpegError.throwIfError(ret, 'allocBuffer');
 *
 * // Receive decoded frame
 * const ret2 = await codecContext.receiveFrame(frame);
 * if (ret2 >= 0) {
 *   console.log(`Frame PTS: ${frame.pts}`);
 *   console.log(`Frame type: ${frame.pictType}`);
 *   console.log(`Keyframe: ${frame.keyFrame}`);
 * }
 *
 * // Cleanup
 * frame.unref();
 * ```
 *
 * @see [AVFrame](https://ffmpeg.org/doxygen/trunk/structAVFrame.html) - FFmpeg Doxygen
 * @see {@link CodecContext} For encoding/decoding frames
 * @see {@link FilterContext} For filtering frames
 */
export class Frame implements Disposable, NativeWrapper<NativeFrame> {
  private native: NativeFrame;
  private _hwFramesCtx?: HardwareFramesContext | null; // Cache for hardware frames context wrapper

  constructor() {
    this.native = new bindings.Frame();
  }

  /**
   * Create a video frame from a buffer with pixel data.
   *
   * Allocates frame buffers, sets properties, and copies buffer data.
   * Convenience factory method that combines frame allocation and data copy.
   *
   * @param buffer - Buffer containing raw pixel data
   *
   * @param props - Video Frame properties
   *
   * @returns Allocated frame with data from buffer
   *
   * @throws {FFmpegError} If allocation or buffer copy fails
   *
   * @example
   * ```typescript
   * import { Frame, AV_PIX_FMT_RGBA, FFmpegError } from 'node-av';
   *
   * const rawPixels = Buffer.alloc(1920 * 1080 * 4); // RGBA data
   * using frame = Frame.fromVideoBuffer(rawPixels, {
   *   width: 1920,
   *   height: 1080,
   *   format: AV_PIX_FMT_RGBA,
   *   timeBase: { num: 1, den: 30 }
   * });
   * ```
   */
  static fromVideoBuffer(buffer: Buffer, props: VideoFrame): Frame {
    const frame = new Frame();
    frame.alloc();
    frame.width = props.width;
    frame.height = props.height;
    frame.format = props.format;
    frame.pts = props.pts ?? AV_NOPTS_VALUE;

    if (props.timeBase) {
      frame.timeBase = new Rational(props.timeBase.num, props.timeBase.den);
    } else {
      frame.timeBase = Rational.fromObject(AV_TIME_BASE_Q);
    }

    if (props.sampleAspectRatio) {
      frame.sampleAspectRatio = new Rational(props.sampleAspectRatio.num, props.sampleAspectRatio.den);
    }

    const ret = frame.getBuffer();
    FFmpegError.throwIfError(ret, 'Failed to allocate frame buffers');

    const copyRet = frame.fromBuffer(buffer);
    FFmpegError.throwIfError(copyRet, 'Failed to copy buffer to frame');

    return frame;
  }

  /**
   * Create an audio frame from a buffer with sample data.
   *
   * Allocates frame buffers, sets properties, and copies buffer data.
   * Convenience factory method that combines frame allocation and data copy.
   *
   * @param buffer - Buffer containing raw audio samples
   *
   * @param props - Frame properties
   *
   * @returns Allocated frame with data from buffer
   *
   * @throws {FFmpegError} If allocation or buffer copy fails
   *
   * @example
   * ```typescript
   * import { Frame, AV_SAMPLE_FMT_FLT, AV_CH_LAYOUT_STEREO, FFmpegError } from 'node-av';
   *
   * const samples = Buffer.alloc(960 * 2 * 4); // 960 samples, stereo, float32
   * using frame = Frame.fromAudioBuffer(samples, {
   *   nbSamples: 960,
   *   format: AV_SAMPLE_FMT_FLT,
   *   sampleRate: 48000,
   *   channelLayout: AV_CH_LAYOUT_STEREO,
   *   timeBase: { num: 1, den: 48000 }
   * });
   * ```
   */
  static fromAudioBuffer(buffer: Buffer, props: AudioFrame): Frame {
    const frame = new Frame();
    frame.alloc();
    frame.nbSamples = props.nbSamples;
    frame.format = props.format;
    frame.sampleRate = props.sampleRate;
    frame.channelLayout = props.channelLayout;
    frame.pts = props.pts ?? AV_NOPTS_VALUE;

    if (props.timeBase) {
      frame.timeBase = new Rational(props.timeBase.num, props.timeBase.den);
    } else {
      frame.timeBase = Rational.fromObject(AV_TIME_BASE_Q);
    }

    const ret = frame.getBuffer();
    FFmpegError.throwIfError(ret, 'Failed to allocate frame buffers');

    const copyRet = frame.fromBuffer(buffer);
    FFmpegError.throwIfError(copyRet, 'Failed to copy buffer to frame');

    return frame;
  }

  /**
   * Pixel format for video frames or sample format for audio.
   *
   * Direct mapping to AVFrame->format.
   */
  get format(): AVPixelFormat | AVSampleFormat {
    return this.native.format;
  }

  set format(value: AVPixelFormat | AVSampleFormat) {
    this.native.format = value;
  }

  /**
   * Width of video frame in pixels.
   *
   * Direct mapping to AVFrame->width.
   */
  get width(): number {
    return this.native.width;
  }

  set width(value: number) {
    this.native.width = value;
  }

  /**
   * Height of video frame in pixels.
   *
   * Direct mapping to AVFrame->height.
   */
  get height(): number {
    return this.native.height;
  }

  set height(value: number) {
    this.native.height = value;
  }

  /**
   * Number of audio samples per channel.
   *
   * Direct mapping to AVFrame->nb_samples.
   */
  get nbSamples(): number {
    return this.native.nbSamples;
  }

  set nbSamples(value: number) {
    this.native.nbSamples = value;
  }

  /**
   * Presentation timestamp.
   *
   * Time when the frame should be presented.
   * In time base units. AV_NOPTS_VALUE if unknown.
   *
   * Direct mapping to AVFrame->pts.
   */
  get pts(): bigint {
    return this.native.pts;
  }

  set pts(value: bigint) {
    this.native.pts = value;
  }

  /**
   * DTS from the packet that produced this frame.
   *
   * Copy of packet DTS for reference.
   * In time base units. AV_NOPTS_VALUE if unknown.
   *
   * Direct mapping to AVFrame->pkt_dts.
   */
  get pktDts(): bigint {
    return this.native.pktDts;
  }

  set pktDts(value: bigint) {
    this.native.pktDts = value;
  }

  /**
   * Best effort timestamp.
   *
   * Frame timestamp estimated using various heuristics.
   * In time base units.
   *
   * Direct mapping to AVFrame->best_effort_timestamp.
   */
  get bestEffortTimestamp(): bigint {
    return this.native.bestEffortTimestamp;
  }

  set bestEffortTimestamp(value: bigint) {
    this.native.bestEffortTimestamp = value;
  }

  /**
   * Time base for timestamps.
   *
   * Defines the unit of the timestamps (seconds per tick).
   *
   * Direct mapping to AVFrame->time_base.
   */
  get timeBase(): Rational {
    const tb = this.native.timeBase;
    return new Rational(tb.num, tb.den);
  }

  set timeBase(value: Rational) {
    this.native.timeBase = { num: value.num, den: value.den };
  }

  /**
   * Whether this frame is a keyframe.
   *
   * 1 if keyframe, 0 otherwise.
   *
   * Direct mapping to AVFrame->key_frame.
   */
  get keyFrame(): number {
    return this.native.keyFrame;
  }

  set keyFrame(value: number) {
    this.native.keyFrame = value;
  }

  /**
   * Picture type of the frame.
   *
   * Type of frame (I, P, B, etc.).
   *
   * Direct mapping to AVFrame->pict_type.
   */
  get pictType(): AVPictureType {
    return this.native.pictType;
  }

  set pictType(value: AVPictureType) {
    this.native.pictType = value;
  }

  /**
   * Quality (between 1 (good) and FF_LAMBDA_MAX (bad)).
   *
   * Set by libavcodec for some coded frames.
   * Can be set before encoding to specify desired quality for encoders that support it.
   * Used by FFmpeg CLI's frame_encode() to propagate encoder's global_quality setting.
   *
   * Direct mapping to AVFrame->quality.
   */
  get quality(): number {
    return this.native.quality;
  }

  set quality(value: number) {
    this.native.quality = value;
  }

  /**
   * Sample aspect ratio.
   *
   * Pixel width/height ratio. 0/1 if unknown.
   *
   * Direct mapping to AVFrame->sample_aspect_ratio.
   */
  get sampleAspectRatio(): Rational {
    const sar = this.native.sampleAspectRatio;
    return new Rational(sar.num || 0, sar.den || 1);
  }

  set sampleAspectRatio(value: Rational) {
    this.native.sampleAspectRatio = { num: value.num, den: value.den };
  }

  /**
   * Audio sample rate.
   *
   * Number of samples per second.
   *
   * Direct mapping to AVFrame->sample_rate.
   */
  get sampleRate(): number {
    return this.native.sampleRate;
  }

  set sampleRate(value: number) {
    this.native.sampleRate = value;
  }

  /**
   * Audio channel layout.
   *
   * Describes the channel configuration.
   *
   * Direct mapping to AVFrame->ch_layout.
   */
  get channelLayout(): ChannelLayout {
    return this.native.channelLayout;
  }

  set channelLayout(value: ChannelLayout) {
    this.native.channelLayout = value;
  }

  /**
   * Number of audio channels.
   *
   * Derived from channel layout.
   */
  get channels(): number {
    return this.native.channels;
  }

  /**
   * Line sizes for each plane.
   *
   * Number of bytes per line for each data plane.
   *
   * Direct mapping to AVFrame->linesize.
   */
  get linesize(): number[] {
    return this.native.linesize;
  }

  /**
   * Color range.
   *
   * MPEG (limited) or JPEG (full) range.
   *
   * Direct mapping to AVFrame->color_range.
   */
  get colorRange(): AVColorRange {
    return this.native.colorRange;
  }

  set colorRange(value: AVColorRange) {
    this.native.colorRange = value;
  }

  /**
   * Color primaries.
   *
   * Chromaticity coordinates of the source primaries.
   *
   * Direct mapping to AVFrame->color_primaries.
   */
  get colorPrimaries(): AVColorPrimaries {
    return this.native.colorPrimaries;
  }

  set colorPrimaries(value: AVColorPrimaries) {
    this.native.colorPrimaries = value;
  }

  /**
   * Color transfer characteristic.
   *
   * Transfer function (gamma).
   *
   * Direct mapping to AVFrame->color_trc.
   */
  get colorTrc(): AVColorTransferCharacteristic {
    return this.native.colorTrc;
  }

  set colorTrc(value: AVColorTransferCharacteristic) {
    this.native.colorTrc = value;
  }

  /**
   * YUV color space.
   *
   * Color space type for YUV content.
   *
   * Direct mapping to AVFrame->colorspace.
   */
  get colorSpace(): AVColorSpace {
    return this.native.colorSpace;
  }

  set colorSpace(value: AVColorSpace) {
    this.native.colorSpace = value;
  }

  /**
   * Chroma sample location.
   *
   * Position of chroma samples.
   *
   * Direct mapping to AVFrame->chroma_location.
   */
  get chromaLocation(): AVChromaLocation {
    return this.native.chromaLocation;
  }

  set chromaLocation(value: AVChromaLocation) {
    this.native.chromaLocation = value;
  }

  /**
   * Raw frame data planes.
   *
   * Array of buffers containing the frame data.
   * One buffer per plane (e.g., Y, U, V for YUV420P).
   *
   * Direct mapping to AVFrame->data.
   */
  get data(): Buffer[] | null {
    return this.native.data;
  }

  /**
   * Extended data planes.
   *
   * For audio with >8 channels or planar audio.
   * Points to data planes beyond the first 8.
   *
   * Direct mapping to AVFrame->extended_data.
   */
  get extendedData(): Buffer[] | null {
    return this.native.extendedData;
  }

  /**
   * Check if frame data is writable.
   *
   * True if the frame data can be modified.
   */
  get isWritable(): boolean {
    return this.native.isWritable;
  }

  /**
   * Hardware frames context.
   *
   * Reference to hardware frames context for GPU frames.
   * Null for software frames.
   *
   * Direct mapping to AVFrame->hw_frames_ctx.
   */
  get hwFramesCtx(): HardwareFramesContext | null {
    // Return cached wrapper if we already have one
    if (this._hwFramesCtx !== undefined) {
      return this._hwFramesCtx;
    }

    const native = this.native.hwFramesCtx;
    if (!native) {
      this._hwFramesCtx = null;
      return null;
    }

    // Create and cache the wrapper
    const frames = Object.create(HardwareFramesContext.prototype) as HardwareFramesContext;
    (frames as any).native = native;
    this._hwFramesCtx = frames;
    return frames;
  }

  set hwFramesCtx(value: HardwareFramesContext | null) {
    this.native.hwFramesCtx = value?.getNative() ?? null;
    // Clear the cache as the underlying context has changed
    this._hwFramesCtx = undefined;
  }

  /**
   * Frame flags.
   *
   * Combination of AVFrameFlags (e.g., AV_FRAME_FLAG_CORRUPT, AV_FRAME_FLAG_KEY).
   *
   * Direct mapping to AVFrame->flags.
   */
  get flags(): number {
    return this.native.flags;
  }

  set flags(value: number) {
    this.native.flags = value;
  }

  /**
   * Decode error flags.
   *
   * Indicates errors detected during decoding.
   * Non-zero value means the frame may be corrupted.
   *
   * Direct mapping to AVFrame->decode_error_flags.
   */
  get decodeErrorFlags(): number {
    return this.native.decodeErrorFlags;
  }

  set decodeErrorFlags(value: number) {
    this.native.decodeErrorFlags = value;
  }

  /**
   * Frame duration.
   *
   * Duration of this frame in units of time_base.
   * This is FFmpeg's best guess for how long the frame should be displayed.
   * May be 0 if unknown or unavailable.
   *
   * Direct mapping to AVFrame->duration.
   */
  get duration(): bigint {
    return this.native.duration;
  }

  set duration(value: bigint) {
    this.native.duration = value;
  }

  /**
   * Number of fields in this frame that should be repeated.
   *
   * For interlaced video, indicates how many times the frame should be repeated
   * when displayed. For progressive video, this is typically 0.
   * Formula: display_time = (repeat_pict / (2*fps))
   *
   * Direct mapping to AVFrame->repeat_pict.
   */
  get repeatPict(): number {
    return this.native.repeatPict;
  }

  set repeatPict(value: number) {
    this.native.repeatPict = value;
  }

  /**
   * Set frame flags.
   *
   * Sets one or more flags using bitwise OR. Allows setting multiple flags
   * without manually performing bitwise operations.
   *
   * @param flags - One or more flag values to set
   *
   * @example
   * ```typescript
   * import { AV_FRAME_FLAG_KEY } from 'node-av/constants';
   *
   * // Mark frame as key frame
   * frame.setFlags(AV_FRAME_FLAG_KEY);
   * ```
   *
   * @see {@link clearFlags} To unset flags
   * @see {@link hasFlags} To check flags
   * @see {@link flags} For direct flag access
   */
  setFlags(...flags: number[]): void {
    for (const flag of flags) {
      this.native.flags |= flag;
    }
  }

  /**
   * Clear frame flags.
   *
   * Clears one or more flags using bitwise AND NOT. Allows clearing multiple
   * flags without manually performing bitwise operations.
   *
   * @param flags - One or more flag values to clear
   *
   * @example
   * ```typescript
   * import { AV_FRAME_FLAG_CORRUPT } from 'node-av/constants';
   *
   * // Clear corrupt flag
   * frame.clearFlags(AV_FRAME_FLAG_CORRUPT);
   * ```
   *
   * @see {@link setFlags} To set flags
   * @see {@link hasFlags} To check flags
   * @see {@link flags} For direct flag access
   */
  clearFlags(...flags: number[]): void {
    for (const flag of flags) {
      this.native.flags &= ~flag;
    }
  }

  /**
   * Check if frame has specific flags.
   *
   * Tests whether all specified flags are set using bitwise AND.
   *
   * @param flags - One or more flag values to check
   *
   * @returns true if all specified flags are set, false otherwise
   *
   * @example
   * ```typescript
   * import { AV_FRAME_FLAG_CORRUPT } from 'node-av/constants';
   *
   * if (frame.hasFlags(AV_FRAME_FLAG_CORRUPT)) {
   *   console.log('Frame is corrupted');
   * }
   * ```
   *
   * @see {@link setFlags} To set flags
   * @see {@link clearFlags} To unset flags
   * @see {@link flags} For direct flag access
   */
  hasFlags(...flags: number[]): boolean {
    for (const flag of flags) {
      if ((this.native.flags & flag) !== flag) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if frame has decode errors.
   *
   * Tests whether all specified decode error flags are set using bitwise AND.
   *
   * @param flags - One or more decode error flag values to check
   *
   * @returns true if all specified error flags are set, false otherwise
   *
   * @example
   * ```typescript
   * import { FF_DECODE_ERROR_INVALID_BITSTREAM } from 'node-av/constants';
   *
   * if (frame.hasDecodeErrorFlags(FF_DECODE_ERROR_INVALID_BITSTREAM)) {
   *   console.log('Frame has invalid bitstream error');
   * }
   * ```
   *
   * @see {@link decodeErrorFlags} For direct error flag access
   */
  hasDecodeErrorFlags(...flags: number[]): boolean {
    for (const flag of flags) {
      if ((this.native.decodeErrorFlags & flag) !== flag) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if this is a video frame.
   *
   * Video frames have width and height > 0.
   *
   * @returns true if this is a video frame
   *
   * @example
   * ```typescript
   * if (frame.isVideo()) {
   *   console.log(`Video frame: ${frame.width}x${frame.height}`);
   * }
   * ```
   */
  isVideo(): boolean {
    return this.width > 0 && this.height > 0;
  }

  /**
   * Check if this is an audio frame.
   *
   * Audio frames have sampleRate > 0 and nbSamples > 0.
   *
   * @returns true if this is an audio frame
   *
   * @example
   * ```typescript
   * if (frame.isAudio()) {
   *   console.log(`Audio frame: ${frame.sampleRate}Hz, ${frame.nbSamples} samples`);
   * }
   * ```
   */
  isAudio(): boolean {
    return this.sampleRate > 0 && this.nbSamples > 0;
  }

  /**
   * Get the media type of this frame.
   *
   * @returns AVMEDIA_TYPE_VIDEO for video frames, AVMEDIA_TYPE_AUDIO for audio frames, or AVMEDIA_TYPE_UNKNOWN
   *
   * @example
   * ```typescript
   * const type = frame.getMediaType();
   * console.log(`Frame type: ${type}`);
   * ```
   */
  getMediaType(): AVMediaType {
    if (this.isVideo()) return AVMEDIA_TYPE_VIDEO;
    if (this.isAudio()) return AVMEDIA_TYPE_AUDIO;
    return AVMEDIA_TYPE_UNKNOWN;
  }

  /**
   * Allocate a new frame.
   *
   * Allocates the frame structure. Must be called before using the frame
   * unless it was created by another function (e.g., clone()).
   *
   * Direct mapping to av_frame_alloc().
   *
   * @throws {Error} If allocation fails (ENOMEM)
   *
   * @example
   * ```typescript
   * const frame = new Frame();
   * frame.alloc();
   * // Frame structure is now ready
   * ```
   *
   * @see {@link allocBuffer} To allocate data buffers
   * @see {@link free} To deallocate the frame
   */
  alloc(): void {
    this.native.alloc();
  }

  /**
   * Free the frame.
   *
   * Deallocates the frame and its data. The frame becomes invalid after this.
   *
   * Direct mapping to av_frame_free().
   *
   * @example
   * ```typescript
   * frame.free();
   * // Frame is now invalid
   * ```
   *
   * @see {@link unref} To only free data, keeping structure
   */
  free(): void {
    this.native.free();
  }

  /**
   * Create a reference to another frame.
   *
   * Sets up this frame as a reference to the source frame's data.
   * Both frames will share the same data buffers.
   *
   * Direct mapping to av_frame_ref().
   *
   * @param src - Source frame to reference
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *   - AVERROR_EINVAL: Invalid parameters
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const frame2 = new Frame();
   * frame2.alloc();
   * const ret = frame2.ref(frame1);
   * FFmpegError.throwIfError(ret, 'ref');
   * // frame2 now references frame1's data
   * ```
   *
   * @see {@link unref} To remove reference
   * @see {@link clone} To create independent copy
   */
  ref(src: Frame): number {
    return this.native.ref(src.getNative());
  }

  /**
   * Unreference the frame.
   *
   * Frees the frame data if this was the last reference.
   * The frame structure remains allocated and can be reused.
   *
   * Direct mapping to av_frame_unref().
   *
   * @example
   * ```typescript
   * frame.unref();
   * // Frame data is freed, structure can be reused
   * ```
   *
   * @see {@link ref} To create reference
   * @see {@link free} To free everything
   */
  unref(): void {
    this.native.unref();
  }

  /**
   * Clone the frame.
   *
   * Creates an independent copy of the frame with its own data buffers.
   * The new frame has the same content but can be modified independently.
   *
   * Direct mapping to av_frame_clone().
   *
   * @returns New frame instance, or null on allocation failure
   *
   * @example
   * ```typescript
   * const copy = frame.clone();
   * if (copy) {
   *   // Modify copy without affecting original
   *   copy.pts = frame.pts + 1000n;
   * }
   * ```
   *
   * @see {@link ref} To create reference instead of copy
   * @see {@link copy} To copy into existing frame
   */
  clone(): Frame | null {
    const cloned = this.native.clone();
    if (!cloned) {
      return null;
    }

    // Wrap the native cloned frame
    const frame = Object.create(Frame.prototype) as Frame;
    (frame as unknown as { native: NativeFrame }).native = cloned;
    return frame;
  }

  /**
   * Get required buffer size for the frame.
   *
   * Calculates the required buffer size based on frame parameters.
   * Must set format, width/height (video) or format, nb_samples, channel_layout (audio) first.
   *
   * Direct mapping to av_frame_get_buffer().
   *
   * @param align - Buffer size alignment (0 for default)
   *
   * @returns Required buffer size in bytes, or negative AVERROR:
   *   - AVERROR_EINVAL: Invalid frame parameters
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const size = frame.getBuffer();
   * FFmpegError.throwIfError(size, 'getBuffer');
   * console.log(`Buffer size: ${size} bytes`);
   * ```
   *
   * @see {@link allocBuffer} To allocate the buffer
   */
  getBuffer(align = 0): number {
    return this.native.getBuffer(align);
  }

  /**
   * Allocate data buffers for the frame.
   *
   * Allocates buffers based on frame format and dimensions.
   * Frame parameters must be set before calling.
   *
   * Direct mapping to av_frame_get_buffer().
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid frame parameters
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AV_PIX_FMT_YUV420P } from 'node-av/constants';
   *
   * frame.format = AV_PIX_FMT_YUV420P;
   * frame.width = 1920;
   * frame.height = 1080;
   * const ret = frame.allocBuffer();
   * FFmpegError.throwIfError(ret, 'allocBuffer');
   * ```
   *
   * @see {@link getBuffer} To get required size
   */
  allocBuffer(): number {
    return this.native.allocBuffer();
  }

  /**
   * Ensure frame data is writable.
   *
   * Creates a private copy of the data if it's shared with other frames.
   * Call before modifying frame data to avoid affecting other references.
   *
   * Direct mapping to av_frame_make_writable().
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *   - AVERROR_EINVAL: Invalid frame
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Ensure we can safely modify data
   * const ret = frame.makeWritable();
   * FFmpegError.throwIfError(ret, 'makeWritable');
   * // Now safe to modify frame.data
   * ```
   */
  makeWritable(): number {
    return this.native.makeWritable();
  }

  /**
   * Copy non-layout frame properties without copying data.
   *
   * Copies metadata like timestamp, duration, etc., but not the actual data.
   * Layout-defining properties, such as width, height, channel count, format, etc., are not copied.
   * Useful for preparing output frames with same properties.
   *
   * Direct mapping to av_frame_copy_props().
   *
   * @param src - Source frame to copy properties from
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = dstFrame.copyProps(srcFrame);
   * FFmpegError.throwIfError(ret, 'copyProps');
   * // dstFrame now has same non-layout properties as srcFrame
   * ```
   *
   * @see {@link copy} To copy data
   */
  copyProps(src: Frame): number {
    return this.native.copyProps(src.getNative());
  }

  /**
   * Copy frame data.
   *
   * Copies only data (but not metadata) from source frame.
   * Destination must have allocated buffers of correct size.
   *
   * Direct mapping to av_frame_copy().
   *
   * @param src - Source frame to copy from
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Incompatible frames
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Allocate destination with same format
   * dstFrame.format = srcFrame.format;
   * dstFrame.width = srcFrame.width;
   * dstFrame.height = srcFrame.height;
   * dstFrame.allocBuffer();
   *
   * const ret = dstFrame.copy(srcFrame);
   * FFmpegError.throwIfError(ret, 'copy');
   * ```
   *
   * @see {@link copyProps} To copy non-format metadata
   * @see {@link clone} To create new frame with copy
   */
  copy(src: Frame): number {
    return this.native.copy(src.getNative());
  }

  /**
   * Fill frame data from buffer.
   *
   * Copies data from buffer into frame data planes.
   * Frame must have allocated buffers.
   *
   * @param buffer - Source buffer with frame data
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const buffer = Buffer.from(rawVideoData);
   * const ret = frame.fromBuffer(buffer);
   * FFmpegError.throwIfError(ret, 'fromBuffer');
   * ```
   */
  fromBuffer(buffer: Buffer): number {
    return this.native.fromBuffer(buffer);
  }

  /**
   * Convert frame data to buffer.
   *
   * Copies frame data into a single contiguous buffer.
   * For video frames, converts all planes into packed format.
   * For audio frames, handles both planar and interleaved formats.
   * Cannot be used with hardware frames - use hwframeTransferData first.
   *
   * @returns Buffer containing frame data
   *
   * @throws {Error} If frame is not allocated, has no data, or is a hardware frame
   *
   * @example Video frame to buffer
   * ```typescript
   * // Get YUV420P video frame as buffer
   * const buffer = frame.toBuffer();
   * console.log(`Frame buffer size: ${buffer.length} bytes`);
   * // Buffer contains Y plane, then U plane, then V plane
   * ```
   *
   * @example Audio frame to buffer
   * ```typescript
   * // Get audio samples as buffer
   * const audioBuffer = frame.toBuffer();
   * console.log(`Audio buffer size: ${audioBuffer.length} bytes`);
   * // For planar audio: channel 0 samples, then channel 1 samples, etc.
   * // For interleaved audio: sample0_ch0, sample0_ch1, sample1_ch0, sample1_ch1, etc.
   * ```
   *
   * @example Error handling
   * ```typescript
   * try {
   *   const buffer = frame.toBuffer();
   *   // Process buffer...
   * } catch (error) {
   *   if (frame.isHwFrame()) {
   *     // Transfer to software first
   *     const swFrame = new Frame();
   *     swFrame.alloc();
   *     await frame.hwframeTransferData(swFrame);
   *     const buffer = swFrame.toBuffer();
   *   }
   * }
   * ```
   *
   * @see {@link fromBuffer} To create frame from buffer
   * @see {@link hwframeTransferData} To transfer hardware frames to software
   * @see {@link isHwFrame} To check if frame is hardware
   * @see {@link data} To access individual planes
   */
  toBuffer(): Buffer {
    return this.native.toBuffer();
  }

  /**
   * Transfer data between hardware and software frames.
   *
   * Copies frame data between GPU and system memory.
   * Direction depends on source and destination frame types.
   *
   * Direct mapping to av_hwframe_transfer_data().
   *
   * @param dst - Destination frame (software or hardware)
   *
   * @param flags - Transfer flags (0 for default)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Download from GPU to CPU
   * const swFrame = new Frame();
   * swFrame.alloc();
   * const ret = await hwFrame.hwframeTransferData(swFrame);
   * FFmpegError.throwIfError(ret, 'hwframeTransferData');
   * ```
   *
   * @see {@link isHwFrame} To check if frame is hardware
   * @see {@link isSwFrame} To check if frame is software
   */
  async hwframeTransferData(dst: Frame, flags?: number): Promise<number> {
    return await this.native.hwframeTransferData(dst.getNative(), flags ?? 0);
  }

  /**
   * Transfer data between hardware and software frames synchronously.
   * Synchronous version of hwframeTransferData.
   *
   * Copies frame data between GPU and system memory.
   * Direction depends on source and destination frame types.
   *
   * Direct mapping to av_hwframe_transfer_data().
   *
   * @param dst - Destination frame (software or hardware)
   *
   * @param flags - Transfer flags (0 for default)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Download from GPU to CPU
   * const swFrame = new Frame();
   * swFrame.alloc();
   * const ret = hwFrame.hwframeTransferData(swFrame);
   * FFmpegError.throwIfError(ret, 'hwframeTransferData');
   * ```
   *
   * @see {@link hwframeTransferData} For async version
   */
  hwframeTransferDataSync(dst: Frame, flags?: number): number {
    return this.native.hwframeTransferDataSync(dst.getNative(), flags ?? 0);
  }

  /**
   * Check if this is a hardware frame.
   *
   * Returns true if frame data is in GPU memory.
   *
   * @returns True if hardware frame, false otherwise
   *
   * @example
   * ```typescript
   * if (frame.isHwFrame()) {
   *   console.log('Frame is in GPU memory');
   * }
   * ```
   *
   * @see {@link isSwFrame} To check for software frame
   * @see {@link hwframeTransferData} To transfer between GPU/CPU
   */
  isHwFrame(): boolean {
    return this.native.isHwFrame();
  }

  /**
   * Check if this is a software frame.
   *
   * Returns true if frame data is in system memory.
   *
   * @returns True if software frame, false otherwise
   *
   * @example
   * ```typescript
   * if (frame.isSwFrame()) {
   *   console.log('Frame is in system memory');
   * }
   * ```
   *
   * @see {@link isHwFrame} To check for hardware frame
   * @see {@link hwframeTransferData} To transfer between GPU/CPU
   */
  isSwFrame(): boolean {
    return this.native.isSwFrame();
  }

  /**
   * Get frame side data.
   *
   * Retrieves additional data associated with the frame
   * (e.g., motion vectors, film grain, HDR metadata).
   *
   * Direct mapping to av_frame_get_side_data().
   *
   * @param type - Type of side data to retrieve
   *
   * @returns Side data buffer, or null if not present
   *
   * @example
   * ```typescript
   * import { AV_FRAME_DATA_MOTION_VECTORS } from 'node-av/constants';
   *
   * const motionVectors = frame.getSideData(AV_FRAME_DATA_MOTION_VECTORS);
   * if (motionVectors) {
   *   console.log(`Motion data size: ${motionVectors.length} bytes`);
   * }
   * ```
   *
   * @see {@link newSideData} To add side data
   * @see {@link removeSideData} To remove side data
   */
  getSideData(type: AVFrameSideDataType): Buffer | null {
    return this.native.getSideData(type);
  }

  /**
   * Allocate new side data.
   *
   * Allocates side data buffer attached to the frame.
   * Returns buffer that can be written to directly.
   *
   * Direct mapping to av_frame_new_side_data().
   *
   * @param type - Type of side data
   *
   * @param size - Size in bytes to allocate
   *
   * @returns Allocated buffer for writing
   *
   * @throws {Error} If allocation fails
   *
   * @example
   * ```typescript
   * import { AV_FRAME_DATA_MASTERING_DISPLAY_METADATA } from 'node-av/constants';
   *
   * // Allocate and write HDR metadata
   * const hdrData = frame.newSideData(
   *   AV_FRAME_DATA_MASTERING_DISPLAY_METADATA,
   *   40
   * );
   * // Write metadata to buffer...
   * ```
   *
   * @see {@link getSideData} To retrieve side data
   * @see {@link removeSideData} To remove side data
   */
  newSideData(type: AVFrameSideDataType, size: number): Buffer {
    return this.native.newSideData(type, size);
  }

  /**
   * Remove side data from frame.
   *
   * Removes specific type of side data.
   *
   * Direct mapping to av_frame_remove_side_data().
   *
   * @param type - Type of side data to remove
   *
   * @example
   * ```typescript
   * import { AV_FRAME_DATA_MOTION_VECTORS } from 'node-av/constants';
   *
   * frame.removeSideData(AV_FRAME_DATA_MOTION_VECTORS);
   * // Motion vectors removed
   * ```
   *
   * @see {@link getSideData} To retrieve side data
   * @see {@link newSideData} To add side data
   */
  removeSideData(type: AVFrameSideDataType): void {
    this.native.removeSideData(type);
  }

  /**
   * Get frame metadata dictionary.
   *
   * Returns metadata attached to the frame by filters or demuxers.
   * Metadata is stored as key-value pairs in a Dictionary.
   * Useful for reading filter-generated metadata (e.g., whisper transcription).
   *
   * Direct mapping to AVFrame->metadata.
   *
   * @returns Dictionary containing frame metadata
   *
   * @example
   * ```typescript
   * // Read whisper filter metadata
   * const metadata = frame.getMetadata();
   * const text = metadata.get('lavfi.whisper.text');
   * const duration = metadata.get('lavfi.whisper.duration');
   *
   * if (text) {
   *   console.log(`Transcribed: ${text}`);
   *   console.log(`Duration: ${duration}s`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Read scene detection metadata
   * const metadata = frame.getMetadata();
   * const score = metadata.get('lavfi.scene_score');
   * if (score) {
   *   console.log(`Scene change score: ${score}`);
   * }
   * ```
   *
   * @see {@link Dictionary} For metadata dictionary operations
   */
  getMetadata(): Dictionary {
    return Dictionary.fromNative(this.native.getMetadata());
  }

  /**
   * Apply cropping to the frame.
   *
   * Crops the frame according to its crop metadata (AVFrame crop fields).
   * This adjusts the frame dimensions and data pointers to reflect the cropped region.
   * The cropped-out area is discarded, reducing frame size.
   *
   * Direct mapping to av_frame_apply_cropping().
   *
   * @param flags - Cropping flags (default: AV_FRAME_CROP_UNALIGNED = 1)
   *                AV_FRAME_CROP_UNALIGNED allows unaligned cropping for lavfi compatibility
   *
   * @returns 0 on success, negative error code on failure
   *
   * @example
   * ```typescript
   * import { Frame, FFmpegError } from 'node-av';
   *
   * const frame = new Frame();
   * // ... decode frame with crop metadata ...
   *
   * // Apply cropping based on metadata
   * const ret = frame.applyCropping();
   * FFmpegError.throwIfError(ret, 'Failed to apply cropping');
   *
   * // Frame dimensions are now updated to cropped size
   * console.log(`Cropped to ${frame.width}x${frame.height}`);
   * ```
   */
  applyCropping(flags?: number): number {
    return this.native.applyCropping(flags);
  }

  /**
   * Get the underlying native Frame object.
   *
   * @returns The native Frame binding object
   *
   * @internal
   */
  getNative(): NativeFrame {
    return this.native;
  }

  /**
   * Dispose of the frame.
   *
   * Implements the Disposable interface for automatic cleanup.
   * Equivalent to calling free().
   *
   * @example
   * ```typescript
   * {
   *   using frame = new Frame();
   *   frame.alloc();
   *   // Use frame...
   * } // Automatically freed when leaving scope
   * ```
   */
  [Symbol.dispose](): void {
    this.native[Symbol.dispose]();
  }
}
