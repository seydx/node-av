import { AVFLAG_NONE } from '../constants/constants.js';
import { bindings } from './binding.js';
import { Codec } from './codec.js';
import { Dictionary } from './dictionary.js';
import { InputFormat } from './input-format.js';
import { OptionMember } from './option.js';
import { OutputFormat } from './output-format.js';
import { Stream } from './stream.js';

import type { AVCodecID, AVFormatFlag, AVMediaType, AVSeekFlag } from '../constants/constants.js';
import type { IOContext } from './io-context.js';
import type { NativeFormatContext, NativeWrapper } from './native-types.js';
import type { Packet } from './packet.js';

/**
 * RTSP stream information interface
 */
export interface RTSPStreamInfo {
  streamIndex: number;
  controlUrl: string;
  transport: 'tcp' | 'udp' | 'udp_multicast' | 'unknown';
  payloadType: number;
  codecId: AVCodecID;
  mediaType: 'video' | 'audio' | 'data' | 'subtitle' | 'unknown';
  mimeType: string; // RTP MIME type from SDP (e.g., "H264/90000", "PCMA/8000/1")
  sampleRate?: number; // Only for audio streams
  channels?: number; // Only for audio streams
  direction: 'sendonly' | 'recvonly' | 'sendrecv' | 'inactive';
  fmtp?: string; // FMTP parameters from SDP (e.g., "packetization-mode=1; sprop-parameter-sets=...")
}

/**
 * Container format context for reading/writing multimedia files.
 *
 * Central structure for demuxing (reading) and muxing (writing) media files.
 * Manages streams, packets, metadata, and format-specific operations.
 * Supports both file-based and custom I/O through IOContext.
 * Essential for all file-based media operations.
 *
 * Direct mapping to FFmpeg's AVFormatContext.
 *
 * @example
 * ```typescript
 * import { FormatContext, FFmpegError } from 'node-av';
 * import { AVMEDIA_TYPE_VIDEO } from 'node-av/constants';
 *
 * // Open input file
 * const ctx = new FormatContext();
 * let ret = await ctx.openInput('input.mp4');
 * FFmpegError.throwIfError(ret, 'openInput');
 *
 * ret = await ctx.findStreamInfo();
 * FFmpegError.throwIfError(ret, 'findStreamInfo');
 *
 * // Find video stream
 * const videoIndex = ctx.findBestStream(AVMEDIA_TYPE_VIDEO);
 * if (videoIndex < 0) {
 *   throw new Error('No video stream found');
 * }
 *
 * // Read packets
 * const packet = new Packet();
 * packet.alloc();
 * while ((ret = await ctx.readFrame(packet)) >= 0) {
 *   if (packet.streamIndex === videoIndex) {
 *     // Process video packet
 *   }
 *   packet.unref();
 * }
 *
 * // Cleanup
 * await ctx.closeInput();
 * ```
 *
 * @see [AVFormatContext](https://ffmpeg.org/doxygen/trunk/structAVFormatContext.html) - FFmpeg Doxygen
 * @see {@link InputFormat} For supported input formats
 * @see {@link OutputFormat} For supported output formats
 * @see {@link Stream} For stream management
 */
export class FormatContext extends OptionMember<NativeFormatContext> implements AsyncDisposable, NativeWrapper<NativeFormatContext> {
  private _metadata?: Dictionary; // Cache for metadata wrapper
  private _ioContext: IOContext | null = null;

  constructor() {
    super(new bindings.FormatContext());
  }

  /**
   * URL or filename of the media.
   *
   * For input: the opened file path.
   * For output: the target file path.
   *
   * Direct mapping to AVFormatContext->url.
   */
  get url(): string | null {
    return this.native.url;
  }

  set url(value: string | null) {
    this.native.url = value;
  }

  /**
   * Start time of the stream.
   *
   * Position of the first frame in microseconds.
   * AV_NOPTS_VALUE if unknown.
   *
   * Direct mapping to AVFormatContext->start_time.
   */
  get startTime(): bigint {
    return this.native.startTime;
  }

  /**
   * Duration of the stream.
   *
   * Total stream duration in microseconds.
   * AV_NOPTS_VALUE if unknown.
   *
   * Direct mapping to AVFormatContext->duration.
   */
  get duration(): bigint {
    return this.native.duration;
  }

  /**
   * Total stream bitrate.
   *
   * Bitrate in bits per second.
   * 0 if unknown.
   *
   * Direct mapping to AVFormatContext->bit_rate.
   */
  get bitRate(): bigint {
    return this.native.bitRate;
  }

  /**
   * Format-specific flags.
   *
   * Combination of AVFMT_FLAG_* values controlling
   * format behavior (e.g., AVFMT_FLAG_GENPTS).
   *
   * Direct mapping to AVFormatContext->flags.
   */
  get flags(): AVFormatFlag {
    return this.native.flags;
  }

  set flags(value: AVFormatFlag) {
    this.native.flags = value;
  }

  /**
   * Maximum bytes to probe for format detection.
   *
   * Larger values improve format detection accuracy
   * but increase startup time.
   *
   * Direct mapping to AVFormatContext->probesize.
   */
  get probesize(): bigint {
    return this.native.probesize;
  }

  set probesize(value: bigint) {
    this.native.probesize = value;
  }

  /**
   * Maximum duration to analyze streams.
   *
   * Time in microseconds to spend analyzing streams.
   * Larger values improve stream detection accuracy.
   *
   * Direct mapping to AVFormatContext->max_analyze_duration.
   */
  get maxAnalyzeDuration(): bigint {
    return this.native.maxAnalyzeDuration;
  }

  set maxAnalyzeDuration(value: bigint) {
    this.native.maxAnalyzeDuration = value;
  }

  /**
   * Maximum buffering duration for interleaving.
   *
   * Specifies the maximum difference between the timestamps of the
   * first and the last packet in the muxing queue, above which libavformat
   * will output a packet regardless of whether it has queued a packet for all
   * the streams.
   *
   * Set to 0 for unlimited buffering
   *
   * Default: 10000000 (10 seconds in microseconds)
   *
   * Muxing only, set before avformat_write_header().
   *
   * Direct mapping to AVFormatContext->max_interleave_delta.
   */
  get maxInterleaveDelta(): bigint {
    return this.native.maxInterleaveDelta;
  }

  set maxInterleaveDelta(value: bigint) {
    this.native.maxInterleaveDelta = value;
  }

  /**
   * Container metadata.
   *
   * Key-value pairs of metadata (title, author, etc.).
   *
   * Direct mapping to AVFormatContext->metadata.
   */
  get metadata(): Dictionary | null {
    const native = this.native.metadata;
    if (!native) {
      // Clear cache if native is null
      this._metadata = undefined;
      return null;
    }

    // Return cached wrapper if available and still valid
    if (this._metadata && (this._metadata as any).native === native) {
      return this._metadata;
    }

    // Create and cache new wrapper
    const device = Object.create(Dictionary.prototype) as Dictionary;
    (device as any).native = native;
    this._metadata = device;
    return device;
  }

  set metadata(value: Dictionary | null) {
    this.native.metadata = value?.getNative() ?? null;
    this._metadata = undefined;
  }

  /**
   * Input format descriptor.
   *
   * Format used for demuxing. Null for output contexts.
   *
   * Direct mapping to AVFormatContext->iformat.
   */
  get iformat(): InputFormat | null {
    const nativeFormat = this.native.iformat;
    if (!nativeFormat) {
      return null;
    }
    return new InputFormat(nativeFormat);
  }

  /**
   * Output format descriptor.
   *
   * Format used for muxing. Null for input contexts.
   *
   * Direct mapping to AVFormatContext->oformat.
   */
  get oformat(): OutputFormat | null {
    const nativeFormat = this.native.oformat;
    if (!nativeFormat) {
      return null;
    }
    return new OutputFormat(nativeFormat);
  }

  set oformat(value: OutputFormat | null) {
    this.native.oformat = value?.getNative() ?? null;
  }

  /**
   * Custom I/O context.
   *
   * For custom I/O operations instead of file I/O.
   *
   * Direct mapping to AVFormatContext->pb.
   */
  get pb(): IOContext | null {
    return this._ioContext;
  }

  set pb(value: IOContext | null) {
    this._ioContext = value;
    this.native.pb = value?.getNative() ?? null;
  }

  /**
   * Number of streams in the container.
   *
   * Direct mapping to AVFormatContext->nb_streams.
   */
  get nbStreams(): number {
    return this.native.nbStreams;
  }

  /**
   * Array of streams in the container.
   *
   * All audio, video, subtitle, and data streams.
   *
   * Direct mapping to AVFormatContext->streams.
   */
  get streams(): Stream[] {
    const nativeStreams = this.native.streams;
    if (!nativeStreams) {
      return [];
    }
    return nativeStreams.map((nativeStream) => new Stream(nativeStream));
  }

  /**
   * Strictness level for standards compliance.
   *
   * FF_COMPLIANCE_* value controlling how strictly
   * to follow specifications.
   *
   * Direct mapping to AVFormatContext->strict_std_compliance.
   */
  get strictStdCompliance(): number {
    return this.native.strictStdCompliance;
  }

  set strictStdCompliance(value: number) {
    this.native.strictStdCompliance = value;
  }

  /**
   * Maximum number of streams.
   *
   * Limit on stream count for security/resource reasons.
   *
   * Direct mapping to AVFormatContext->max_streams.
   */
  get maxStreams(): number {
    return this.native.maxStreams;
  }

  set maxStreams(value: number) {
    this.native.maxStreams = value;
  }

  /**
   * Number of programs.
   *
   * For containers with multiple programs (e.g., MPEG-TS).
   *
   * Direct mapping to AVFormatContext->nb_programs.
   */
  get nbPrograms(): number {
    return this.native.nbPrograms;
  }

  /**
   * Number of bytes read/written through I/O context.
   *
   * Direct mapping to avio_tell(AVFormatContext->pb).
   */
  get pbBytes(): bigint {
    return this.native.pbBytes;
  }

  /**
   * Format probe score.
   *
   * Confidence score from format detection (0-100).
   * Higher values indicate more confident detection.
   *
   * Direct mapping to AVFormatContext->probe_score.
   */
  get probeScore(): number {
    return this.native.probeScore;
  }

  /**
   * Allocate a format context.
   *
   * Allocates the context structure. Usually not needed
   * as openInput/allocOutputContext2 handle this.
   *
   * Direct mapping to avformat_alloc_context().
   *
   * @example
   * ```typescript
   * const ctx = new FormatContext();
   * ctx.allocContext();
   * // Context is now allocated
   * ```
   */
  allocContext(): void {
    this.native.allocContext();
  }

  /**
   * Allocate an output format context.
   *
   * Allocates and configures context for writing.
   * Format is determined by parameters in priority order.
   *
   * Direct mapping to avformat_alloc_output_context2().
   *
   * @param oformat - Specific output format to use
   *
   * @param formatName - Format name (e.g., 'mp4', 'mkv')
   *
   * @param filename - Filename to guess format from extension
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *   - AVERROR_EINVAL: Invalid parameters
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ctx = new FormatContext();
   * const ret = ctx.allocOutputContext2(null, 'mp4', 'output.mp4');
   * FFmpegError.throwIfError(ret, 'allocOutputContext2');
   * ```
   *
   * @see {@link openOutput} To open output file
   * @see {@link writeHeader} To write file header
   */
  allocOutputContext2(oformat: OutputFormat | null, formatName: string | null, filename: string | null): number {
    if (!oformat && !formatName && !filename) {
      throw new Error('At least one of oformat, formatName, or filename must be specified');
    }

    return this.native.allocOutputContext2(oformat?.getNative() ?? null, formatName, filename);
  }

  /**
   * Free the format context.
   *
   * Releases all resources. The context becomes invalid.
   *
   * Direct mapping to avformat_free_context().
   *
   * @example
   * ```typescript
   * ctx.freeContext();
   * // Context is now invalid
   * ```
   *
   * @see {@link Symbol.asyncDispose} For automatic cleanup
   */
  freeContext(): void {
    this.native.freeContext();
  }

  /**
   * Open output file for writing.
   *
   * Opens the output file specified in url.
   * Must call allocOutputContext2 first.
   *
   * Direct mapping to avio_open2().
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOENT: File not found
   *   - AVERROR_EACCES: Permission denied
   *   - AVERROR_EIO: I/O error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = await ctx.openOutput();
   * FFmpegError.throwIfError(ret, 'openOutput');
   * ```
   *
   * @see {@link allocOutputContext2} Must be called first
   * @see {@link closeOutput} To close output
   */
  async openOutput(): Promise<number> {
    return await this.native.openOutput();
  }

  /**
   * Open output file synchronously.
   * Synchronous version of openOutput.
   *
   * Opens output file for writing.
   * I/O context must be set before calling.
   *
   * Direct mapping to avio_open2().
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR(EIO): I/O error
   *   - AVERROR(ENOMEM): Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = ctx.openOutputSync();
   * FFmpegError.throwIfError(ret, 'openOutputSync');
   * ```
   *
   * @see {@link openOutput} For async version
   */
  openOutputSync(): number {
    return this.native.openOutputSync();
  }

  /**
   * Close output file.
   *
   * Closes the output file and releases I/O resources.
   *
   * Direct mapping to avio_closep().
   *
   * @returns Promise that resolves when closed
   *
   * @example
   * ```typescript
   * await ctx.closeOutput();
   * // Output file closed
   * ```
   *
   * @see {@link openOutput} To open output
   */
  async closeOutput(): Promise<void> {
    return await this.native.closeOutput();
  }

  /**
   * Close output file synchronously.
   * Synchronous version of closeOutput.
   *
   * Closes the output file and releases I/O resources.
   *
   * Direct mapping to avio_closep().
   *
   * @example
   * ```typescript
   * ctx.closeOutputSync();
   * // Output file closed
   * ```
   *
   * @see {@link closeOutput} For async version
   */
  closeOutputSync(): void {
    this.native.closeOutputSync();
  }

  /**
   * Open input file for reading.
   *
   * Opens and probes the input file, detecting format automatically
   * unless specified.
   *
   * Direct mapping to avformat_open_input().
   *
   * @param url - URL or file path to open
   *
   * @param fmt - Force specific input format (null for auto-detect)
   *
   * @param options - Format-specific options
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOENT: File not found
   *   - AVERROR_INVALIDDATA: Invalid file format
   *   - AVERROR_EIO: I/O error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = await ctx.openInput('input.mp4');
   * FFmpegError.throwIfError(ret, 'openInput');
   * ```
   *
   * @see {@link findStreamInfo} To analyze streams after opening
   * @see {@link closeInput} To close input
   */
  async openInput(url: string, fmt: InputFormat | null = null, options: Dictionary | null = null): Promise<number> {
    return await this.native.openInput(url, fmt?.getNative() ?? null, options?.getNative() ?? null);
  }

  /**
   * Open an input file or URL synchronously.
   * Synchronous version of openInput.
   *
   * Opens a media file or stream for reading.
   * The format is auto-detected if not specified.
   *
   * Direct mapping to avformat_open_input().
   *
   * @param url - File path or URL to open
   *
   * @param fmt - Force specific format (null for auto-detect)
   *
   * @param options - Format-specific options
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid arguments
   *   - AVERROR(EIO): I/O error
   *   - AVERROR(ENOMEM): Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = ctx.openInputSync('input.mp4');
   * FFmpegError.throwIfError(ret, 'openInputSync');
   * ```
   *
   * @see {@link openInput} For async version
   */
  openInputSync(url: string, fmt: InputFormat | null = null, options: Dictionary | null = null): number {
    return this.native.openInputSync(url, fmt?.getNative() ?? null, options?.getNative() ?? null);
  }

  /**
   * Close an input format context.
   *
   * Closes input file and releases resources.
   *
   * Direct mapping to avformat_close_input().
   *
   * @returns Promise that resolves when closed
   *
   * @example
   * ```typescript
   * await ctx.closeInput();
   * // Input closed and context freed
   * ```
   *
   * @see {@link openInput} To open input
   */
  async closeInput(): Promise<void> {
    return await this.native.closeInput();
  }

  /**
   * Close an input format context synchronously.
   * Synchronous version of closeInput.
   *
   * Closes input file and releases resources.
   *
   * Direct mapping to avformat_close_input().
   *
   * @example
   * ```typescript
   * ctx.closeInputSync();
   * // Input closed and context freed
   * ```
   *
   * @see {@link closeInput} For async version
   */
  closeInputSync(): void {
    this.native.closeInputSync();
  }

  /**
   * Analyze streams to get stream info.
   *
   * Reads packet headers to fill in stream information.
   * Should be called after openInput for accurate stream data.
   *
   * Direct mapping to avformat_find_stream_info().
   *
   * @param options - Per-stream options array
   *
   * @returns >=0 on success, negative AVERROR on error:
   *   - AVERROR_EOF: End of file reached
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = await ctx.findStreamInfo();
   * FFmpegError.throwIfError(ret, 'findStreamInfo');
   * console.log(`Found ${ctx.nbStreams} streams`);
   * ```
   *
   * @see {@link openInput} Must be called first
   */
  async findStreamInfo(options: Dictionary[] | null = null): Promise<number> {
    return await this.native.findStreamInfo(options?.map((d) => d.getNative()) ?? null);
  }

  /**
   * Analyze streams to get stream info synchronously.
   * Synchronous version of findStreamInfo.
   *
   * Reads packet headers to fill in stream information.
   * Should be called after openInputSync for accurate stream data.
   *
   * Direct mapping to avformat_find_stream_info().
   *
   * @param options - Options dictionary (single, not array for sync version)
   *
   * @returns >=0 on success, negative AVERROR on error:
   *   - AVERROR_EOF: End of file reached
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = ctx.findStreamInfoSync();
   * FFmpegError.throwIfError(ret, 'findStreamInfoSync');
   * console.log(`Found ${ctx.nbStreams} streams`);
   * ```
   *
   * @see {@link findStreamInfo} For async version
   */
  findStreamInfoSync(options: Dictionary | null = null): number {
    return this.native.findStreamInfoSync(options?.getNative() ?? null);
  }

  /**
   * Read next packet from the input.
   *
   * Reads and returns the next packet in the stream.
   * Packet must be unreferenced after use.
   *
   * Direct mapping to av_read_frame().
   *
   * @param pkt - Packet to read into
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EOF: End of file
   *   - AVERROR_EAGAIN: Temporarily unavailable
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AVERROR_EOF } from 'node-av';
   *
   * const packet = new Packet();
   * packet.alloc();
   *
   * let ret;
   * while ((ret = await ctx.readFrame(packet)) >= 0) {
   *   // Process packet
   *   console.log(`Stream ${packet.streamIndex}, PTS: ${packet.pts}`);
   *   packet.unref();
   * }
   *
   * if (ret !== AVERROR_EOF) {
   *   FFmpegError.throwIfError(ret, 'readFrame');
   * }
   * ```
   *
   * @see {@link seekFrame} To seek before reading
   */
  async readFrame(pkt: Packet): Promise<number> {
    return await this.native.readFrame(pkt.getNative());
  }

  /**
   * Read next packet from the input synchronously.
   * Synchronous version of readFrame.
   *
   * Reads and returns the next packet in the stream.
   * Packet must be unreferenced after use.
   *
   * Direct mapping to av_read_frame().
   *
   * @param pkt - Packet to read into
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EOF: End of file
   *   - AVERROR_EAGAIN: Temporarily unavailable
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AVERROR_EOF } from 'node-av';
   *
   * const packet = new Packet();
   * packet.alloc();
   *
   * let ret;
   * while ((ret = ctx.readFrameSync(packet)) >= 0) {
   *   // Process packet
   *   console.log(`Stream ${packet.streamIndex}, PTS: ${packet.pts}`);
   *   packet.unref();
   * }
   *
   * if (ret !== AVERROR_EOF) {
   *   FFmpegError.throwIfError(ret, 'readFrameSync');
   * }
   * ```
   *
   * @see {@link readFrame} For async version
   */
  readFrameSync(pkt: Packet): number {
    return this.native.readFrameSync(pkt.getNative());
  }

  /**
   * Seek to timestamp in stream.
   *
   * Seeks to the keyframe at or before the given timestamp.
   *
   * Direct mapping to av_seek_frame().
   *
   * @param streamIndex - Stream to seek in (-1 for default)
   *
   * @param timestamp - Target timestamp in stream time base
   *
   * @param flags - Seek flags (AVSEEK_FLAG_*)
   *
   * @returns >=0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR_EOF: Seek beyond file
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AVSEEK_FLAG_BACKWARD } from 'node-av/constants';
   *
   * // Seek to 10 seconds (assuming 1/1000 time base)
   * const ret = await ctx.seekFrame(videoStreamIndex, 10000n, AVSEEK_FLAG_BACKWARD);
   * FFmpegError.throwIfError(ret, 'seekFrame');
   * ```
   *
   * @see {@link seekFile} For more precise seeking
   */
  async seekFrame(streamIndex: number, timestamp: bigint, flags: AVSeekFlag = AVFLAG_NONE): Promise<number> {
    return await this.native.seekFrame(streamIndex, timestamp, flags);
  }

  /**
   * Seek to timestamp in stream synchronously.
   * Synchronous version of seekFrame.
   *
   * Seeks to closest keyframe at or before timestamp.
   * Timestamp is in stream timebase units.
   *
   * Direct mapping to av_seek_frame().
   *
   * @param streamIndex - Stream to seek in (-1 for default)
   *
   * @param timestamp - Target timestamp in stream timebase
   *
   * @param flags - Seek flags (AVSEEK_FLAG_*)
   *
   * @returns >=0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid arguments
   *   - AVERROR(EIO): I/O error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AVSEEK_FLAG_BACKWARD } from 'node-av/constants';
   *
   * // Seek to 10 seconds
   * const timestamp = 10n * 1000000n; // Assuming microsecond timebase
   * const ret = ctx.seekFrameSync(-1, timestamp, AVSEEK_FLAG_BACKWARD);
   * FFmpegError.throwIfError(ret, 'seekFrameSync');
   * ```
   *
   * @see {@link seekFrame} For async version
   */
  seekFrameSync(streamIndex: number, timestamp: bigint, flags: AVSeekFlag = AVFLAG_NONE): number {
    return this.native.seekFrameSync(streamIndex, timestamp, flags);
  }

  /**
   * Seek to timestamp with bounds.
   *
   * More precise seeking with min/max timestamp bounds.
   *
   * Direct mapping to avformat_seek_file().
   *
   * @param streamIndex - Stream to seek in (-1 for default)
   *
   * @param minTs - Minimum acceptable timestamp
   *
   * @param ts - Target timestamp
   *
   * @param maxTs - Maximum acceptable timestamp
   *
   * @param flags - Seek flags
   *
   * @returns >=0 on success, negative AVERROR on error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Seek to 10s with 0.5s tolerance
   * const target = 10000n;
   * const ret = await ctx.seekFile(
   *   -1,
   *   target - 500n,
   *   target,
   *   target + 500n
   * );
   * FFmpegError.throwIfError(ret, 'seekFile');
   * ```
   *
   * @see {@link seekFrame} For simpler seeking
   */
  async seekFile(streamIndex: number, minTs: bigint, ts: bigint, maxTs: bigint, flags: AVSeekFlag = AVFLAG_NONE): Promise<number> {
    return await this.native.seekFile(streamIndex, minTs, ts, maxTs, flags);
  }

  /**
   * Write file header.
   *
   * Writes the file header and initializes output.
   * Must be called before writing packets.
   *
   * Direct mapping to avformat_write_header().
   *
   * @param options - Muxer-specific options
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR_EIO: I/O error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = await ctx.writeHeader();
   * FFmpegError.throwIfError(ret, 'writeHeader');
   * // Now ready to write packets
   * ```
   *
   * @see {@link writeTrailer} To finalize file
   * @see {@link writeFrame} To write packets
   */
  async writeHeader(options: Dictionary | null = null): Promise<number> {
    return await this.native.writeHeader(options?.getNative() ?? null);
  }

  /**
   * Write file header synchronously.
   * Synchronous version of writeHeader.
   *
   * Writes format header to output file.
   * Must be called before writing packets.
   *
   * Direct mapping to avformat_write_header().
   *
   * @param options - Muxer-specific options
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = ctx.writeHeaderSync();
   * FFmpegError.throwIfError(ret, 'writeHeaderSync');
   * ```
   *
   * @see {@link writeHeader} For async version
   */
  writeHeaderSync(options: Dictionary | null = null): number {
    return this.native.writeHeaderSync(options?.getNative() ?? null);
  }

  /**
   * Write packet to output.
   *
   * Writes a packet directly without interleaving.
   * Caller must handle correct interleaving.
   *
   * Direct mapping to av_write_frame().
   *
   * @param pkt - Packet to write (null to flush)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid packet
   *   - AVERROR_EIO: I/O error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = await ctx.writeFrame(packet);
   * FFmpegError.throwIfError(ret, 'writeFrame');
   * ```
   *
   * @see {@link interleavedWriteFrame} For automatic interleaving
   */
  async writeFrame(pkt: Packet | null): Promise<number> {
    return await this.native.writeFrame(pkt ? pkt.getNative() : null);
  }

  /**
   * Write packet to output synchronously.
   * Synchronous version of writeFrame.
   *
   * Writes a packet directly without interleaving.
   * Caller must handle correct interleaving.
   *
   * Direct mapping to av_write_frame().
   *
   * @param pkt - Packet to write (null to flush)
   *
   * @returns 0 on success, negative AVERROR on error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = ctx.writeFrameSync(packet);
   * FFmpegError.throwIfError(ret, 'writeFrameSync');
   * ```
   *
   * @see {@link writeFrame} For async version
   */
  writeFrameSync(pkt: Packet | null): number {
    return this.native.writeFrameSync(pkt ? pkt.getNative() : null);
  }

  /**
   * Write packet with automatic interleaving.
   *
   * Writes packet with proper interleaving for muxing.
   * Preferred method for writing packets.
   *
   * Direct mapping to av_interleaved_write_frame().
   *
   * @param pkt - Packet to write (null to flush)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid packet
   *   - AVERROR_EIO: I/O error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Write with proper interleaving
   * const ret = await ctx.interleavedWriteFrame(packet);
   * FFmpegError.throwIfError(ret, 'interleavedWriteFrame');
   *
   * // Flush buffered packets
   * await ctx.interleavedWriteFrame(null);
   * ```
   *
   * @see {@link writeFrame} For direct writing
   */
  async interleavedWriteFrame(pkt: Packet | null): Promise<number> {
    return await this.native.interleavedWriteFrame(pkt ? pkt.getNative() : null);
  }

  /**
   * Write packet with automatic interleaving synchronously.
   * Synchronous version of interleavedWriteFrame.
   *
   * Writes packet with proper interleaving for muxing.
   * Preferred method for writing packets.
   *
   * Direct mapping to av_interleaved_write_frame().
   *
   * @param pkt - Packet to write (null to flush)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR(EIO): I/O error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Write packet
   * const ret = ctx.interleavedWriteFrameSync(packet);
   * FFmpegError.throwIfError(ret, 'interleavedWriteFrameSync');
   *
   * // Flush interleaved packets
   * ctx.interleavedWriteFrameSync(null);
   * ```
   *
   * @see {@link interleavedWriteFrame} For async version
   */
  interleavedWriteFrameSync(pkt: Packet | null): number {
    return this.native.interleavedWriteFrameSync(pkt ? pkt.getNative() : null);
  }

  /**
   * Write file trailer.
   *
   * Finalizes the output file, writing index and metadata.
   * Must be called to properly close output files.
   *
   * Direct mapping to av_write_trailer().
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EIO: I/O error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = await ctx.writeTrailer();
   * FFmpegError.throwIfError(ret, 'writeTrailer');
   * // File is now finalized
   * ```
   *
   * @see {@link writeHeader} Must be called first
   */
  async writeTrailer(): Promise<number> {
    return await this.native.writeTrailer();
  }

  /**
   * Write file trailer synchronously.
   * Synchronous version of writeTrailer.
   *
   * Finalizes the output file, writing index and metadata.
   * Must be called to properly close output files.
   *
   * Direct mapping to av_write_trailer().
   *
   * @returns 0 on success, negative AVERROR on error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = ctx.writeTrailerSync();
   * FFmpegError.throwIfError(ret, 'writeTrailerSync');
   * // File is now finalized
   * ```
   *
   * @see {@link writeTrailer} For async version
   */
  writeTrailerSync(): number {
    return this.native.writeTrailerSync();
  }

  /**
   * Flush buffered data.
   *
   * Flushes any buffered packets in muxers.
   *
   * Direct mapping to avio_flush().
   *
   * @example
   * ```typescript
   * await ctx.flush();
   * // Buffered data written to output
   * ```
   */
  async flush(): Promise<void> {
    await this.native.flush();
  }

  /**
   * Flush buffered data synchronously.
   * Synchronous version of flush.
   *
   * Flushes any buffered packets in muxers.
   *
   * Direct mapping to avio_flush().
   *
   * @example
   * ```typescript
   * ctx.flushSync();
   * // Buffered data written to output
   * ```
   *
   * @see {@link flush} For async version
   */
  flushSync(): void {
    this.native.flushSync();
  }

  /**
   * Print format information.
   *
   * Dumps human-readable format info to stderr.
   * Useful for debugging.
   *
   * Direct mapping to av_dump_format().
   *
   * @param index - Stream index to highlight (-1 for none)
   *
   * @param url - URL to display
   *
   * @param isOutput - True for output format, false for input
   *
   * @example
   * ```typescript
   * // Dump input format info
   * ctx.dumpFormat(0, 'input.mp4', false);
   *
   * // Dump output format info
   * ctx.dumpFormat(0, 'output.mp4', true);
   * ```
   */
  dumpFormat(index: number, url: string, isOutput: boolean): void {
    this.native.dumpFormat(index, url, isOutput);
  }

  /**
   * Find the best stream of a given type.
   *
   * Selects the most suitable stream (e.g., default audio/video).
   *
   * Direct mapping to av_find_best_stream().
   *
   * @param type - Media type to find (AVMEDIA_TYPE_*)
   *
   * @param wantedStreamNb - Preferred stream index (-1 for auto)
   *
   * @param relatedStream - Related stream for audio/video sync (-1 for none)
   *
   * @returns Stream index, or negative AVERROR if not found
   *
   * @example
   * ```typescript
   * import { AVMEDIA_TYPE_VIDEO, AVMEDIA_TYPE_AUDIO } from 'node-av/constants';
   *
   * const videoIndex = ctx.findBestStream(AVMEDIA_TYPE_VIDEO);
   * if (videoIndex >= 0) {
   *   console.log(`Best video stream: ${videoIndex}`);
   * }
   *
   * const audioIndex = ctx.findBestStream(AVMEDIA_TYPE_AUDIO);
   * if (audioIndex >= 0) {
   *   console.log(`Best audio stream: ${audioIndex}`);
   * }
   * ```
   */
  findBestStream(type: AVMediaType, wantedStreamNb?: number, relatedStream?: number): number;
  /**
   * Find the best stream and its decoder.
   *
   * @param type - Media type to find
   *
   * @param wantedStreamNb - Preferred stream index
   *
   * @param relatedStream - Related stream index
   *
   * @param wantDecoder - True to also find decoder
   *
   * @param flags - Reserved flags
   *
   * @returns Object with stream index and decoder
   */
  findBestStream(type: AVMediaType, wantedStreamNb: number, relatedStream: number, wantDecoder: true, flags?: number): { streamIndex: number; decoder: Codec | null };
  findBestStream(type: AVMediaType, wantedStreamNb = -1, relatedStream = -1, wantDecoder = false, flags = 0): number | { streamIndex: number; decoder: Codec | null } {
    if (wantDecoder === true) {
      const result = this.native.findBestStream(type, wantedStreamNb, relatedStream, true, flags ?? 0);
      if (typeof result === 'object' && result !== null) {
        // Wrap the native decoder in a Codec instance
        return {
          streamIndex: result.streamIndex,
          decoder: Codec.fromNative(result.decoder),
        };
      }
      // If not an object, return as error code
      return { streamIndex: result, decoder: null };
    }

    return this.native.findBestStream(type, wantedStreamNb, relatedStream, false, flags ?? 0) as number;
  }

  /**
   * Add a new stream to output context.
   *
   * Creates a new stream for writing.
   *
   * Direct mapping to avformat_new_stream().
   *
   * @param c - Codec for the stream (optional)
   *
   * @returns New stream instance
   *
   * @example
   * ```typescript
   * import { Codec } from 'node-av';
   * import { AV_CODEC_ID_H264 } from 'node-av/constants';
   *
   * const codec = Codec.findEncoder(AV_CODEC_ID_H264);
   * const stream = ctx.newStream(codec);
   * stream.id = ctx.nbStreams - 1;
   * ```
   *
   * @see {@link Stream} For stream configuration
   */
  newStream(c: Codec | null = null): Stream {
    const nativeStream = this.native.newStream(c?.getNative() ?? null);
    return new Stream(nativeStream);
  }

  /**
   * Set format flags.
   *
   * Sets one or more flags using bitwise OR. Allows setting multiple flags
   * without manually performing bitwise operations.
   *
   * @param flags - One or more flag values to set
   *
   * @example
   * ```typescript
   * import { AVFMT_FLAG_GENPTS, AVFMT_FLAG_IGNIDX } from 'node-av/constants';
   *
   * // Set multiple flags at once
   * formatContext.setFlags(AVFMT_FLAG_GENPTS, AVFMT_FLAG_IGNIDX);
   * ```
   *
   * @see {@link clearFlags} To unset flags
   * @see {@link hasFlags} To check flags
   * @see {@link flags} For direct flag access
   */
  setFlags(...flags: AVFormatFlag[]): void {
    for (const flag of flags) {
      this.native.flags = (this.native.flags | flag) as AVFormatFlag;
    }
  }

  /**
   * Clear format flags.
   *
   * Clears one or more flags using bitwise AND NOT. Allows clearing multiple
   * flags without manually performing bitwise operations.
   *
   * @param flags - One or more flag values to clear
   *
   * @example
   * ```typescript
   * import { AVFMT_FLAG_IGNIDX } from 'node-av/constants';
   *
   * // Clear specific flag
   * formatContext.clearFlags(AVFMT_FLAG_IGNIDX);
   * ```
   *
   * @see {@link setFlags} To set flags
   * @see {@link hasFlags} To check flags
   * @see {@link flags} For direct flag access
   */
  clearFlags(...flags: AVFormatFlag[]): void {
    for (const flag of flags) {
      this.native.flags = (this.native.flags & ~flag) as AVFormatFlag;
    }
  }

  /**
   * Check if format context has specific flags.
   *
   * Tests whether all specified flags are set using bitwise AND.
   *
   * @param flags - One or more flag values to check
   *
   * @returns true if all specified flags are set, false otherwise
   *
   * @example
   * ```typescript
   * import { AVFMT_FLAG_GENPTS } from 'node-av/constants';
   *
   * if (formatContext.hasFlags(AVFMT_FLAG_GENPTS)) {
   *   console.log('GENPTS flag is set');
   * }
   * ```
   *
   * @see {@link setFlags} To set flags
   * @see {@link clearFlags} To unset flags
   * @see {@link flags} For direct flag access
   */
  hasFlags(...flags: AVFormatFlag[]): boolean {
    for (const flag of flags) {
      if ((this.native.flags & flag) !== flag) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get RTSP stream information.
   *
   * Returns information about all RTSP streams including codec details.
   * Only works with RTSP input contexts.
   *
   * @returns Array of stream information objects with codec details, or null if not RTSP
   *
   * @example
   * ```typescript
   * const ctx = new FormatContext();
   * await ctx.openInput('rtsp://camera/stream?backchannel=1');
   *
   * const rtspStreams = ctx.getRTSPStreamInfo();
   * if (rtspStreams) {
   *   // Find sendonly stream (backchannel)
   *   const backchannel = rtspStreams.find(s => s.direction === 'sendonly');
   *   if (backchannel) {
   *     console.log(`Transport: ${backchannel.transport}`);
   *     console.log(`Codec ID: ${backchannel.codecId}`);
   *     console.log(`MIME Type: ${backchannel.mimeType}`);
   *     console.log(`Payload Type: ${backchannel.payloadType}`);
   *     if (backchannel.sampleRate) {
   *       console.log(`Audio: ${backchannel.sampleRate}Hz, ${backchannel.channels} channels`);
   *     }
   *   }
   * }
   * ```
   */
  getRTSPStreamInfo(): RTSPStreamInfo[] | null {
    return this.native.getRTSPStreamInfo();
  }

  /**
   * Send RTP packet to RTSP stream (supports both TCP and UDP)
   *
   * Automatically handles transport-specific packet formatting:
   * - TCP: Sends with interleaved header ($channelId + length + RTP)
   * - UDP: Sends raw RTP packet directly to UDP socket
   *
   * Used for backchannel/talkback audio streaming.
   * Only works with RTSP input contexts.
   *
   * @param streamIndex - RTSP stream index
   *
   * @param rtpData - Raw RTP packet data (12-byte header + payload)
   *
   * @returns Promise resolving to number of bytes written on success, negative AVERROR on failure
   *
   * @example
   * ```typescript
   * // Get backchannel stream info
   * const streams = ctx.getRTSPStreamInfo();
   * const backchannel = streams.find(s => s.direction === 'sendonly');
   *
   * if (backchannel) {
   *   // Send to camera (works with both TCP and UDP)
   *   const ret = await ctx.sendRTSPPacket(backchannel.streamIndex, rtpPacket);
   *   if (ret < 0) {
   *     throw new Error(`Failed to send: ${ret}`);
   *   }
   * }
   * ```
   *
   * @see {@link sendRTSPPacketSync} For synchronous version
   * @see {@link getRTSPStreamInfo} For getting stream info and transport type
   */
  async sendRTSPPacket(streamIndex: number, rtpData: Buffer): Promise<number> {
    return this.native.sendRTSPPacket(streamIndex, rtpData);
  }

  /**
   * Send RTP packet to RTSP stream (supports both TCP and UDP) synchronously.
   * Synchronous version of sendRTSPPacket.
   *
   * Automatically handles transport-specific packet formatting:
   * - TCP: Sends with interleaved header ($channelId + length + RTP)
   * - UDP: Sends raw RTP packet directly to UDP socket
   *
   * Used for backchannel/talkback audio streaming.
   * Only works with RTSP input contexts.
   *
   * @param streamIndex - RTSP stream index
   *
   * @param rtpData - Raw RTP packet data (12-byte header + payload)
   *
   * @returns Number of bytes written on success, negative AVERROR on failure
   *
   * @example
   * ```typescript
   * // Get backchannel stream info
   * const streams = ctx.getRTSPStreamInfo();
   * const backchannel = streams.find(s => s.direction === 'sendonly');
   *
   * if (backchannel) {
   *   // Send to camera (works with both TCP and UDP)
   *   const ret = ctx.sendRTSPPacketSync(backchannel.streamIndex, rtpPacket);
   *   if (ret < 0) {
   *     throw new Error(`Failed to send: ${ret}`);
   *   }
   * }
   * ```
   *
   * @see {@link sendRTSPPacket} For asynchronous version
   * @see {@link getRTSPStreamInfo} For getting stream info and transport type
   */
  sendRTSPPacketSync(streamIndex: number, rtpData: Buffer): number {
    return this.native.sendRTSPPacketSync(streamIndex, rtpData);
  }

  /**
   * Get the underlying native FormatContext object.
   *
   * @returns The native FormatContext binding object
   *
   * @internal
   */
  getNative(): NativeFormatContext {
    return this.native;
  }

  /**
   * Dispose of the format context.
   *
   * Implements the AsyncDisposable interface for automatic cleanup.
   * Closes input/output and frees resources.
   *
   * @returns Promise that resolves when disposed
   *
   * @example
   * ```typescript
   * {
   *   await using ctx = new FormatContext();
   *   await ctx.openInput('input.mp4');
   *   // Use context...
   * } // Automatically closed and freed
   * ```
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.native[Symbol.asyncDispose]();
  }
}
