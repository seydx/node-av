import { bindings } from './binding.js';
import { Rational } from './rational.js';
import { stringToFourCC } from './utilities.js';

import type {
  AVChromaLocation,
  AVCodecID,
  AVCodecProp,
  AVColorPrimaries,
  AVColorRange,
  AVColorSpace,
  AVColorTransferCharacteristic,
  AVMediaType,
  AVPacketSideDataType,
  AVPixelFormat,
  AVProfile,
  AVSampleFormat,
} from '../constants/constants.js';
import type { CodecContext } from './codec-context.js';
import type { NativeCodecParameters, NativeWrapper } from './native-types.js';
import type { ChannelLayout } from './types.js';

/**
 * Codec parameters for stream configuration.
 *
 * Stores essential codec parameters without requiring a full codec context.
 * Used to describe stream properties in containers, transfer codec configuration
 * between contexts, and initialize decoders/encoders. Contains format, dimensions,
 * sample rates, and other codec-specific parameters.
 *
 * Direct mapping to FFmpeg's AVCodecParameters.
 *
 * @example
 * ```typescript
 * import { CodecParameters, CodecContext, FFmpegError } from 'node-av';
 *
 * // Create and allocate parameters
 * const params = new CodecParameters();
 * params.alloc();
 *
 * // Copy from stream
 * const stream = formatContext.streams[0];
 * const ret = stream.codecpar.copy(params);
 * FFmpegError.throwIfError(ret, 'copy');
 *
 * // Transfer to codec context
 * const ret2 = params.toContext(codecContext);
 * FFmpegError.throwIfError(ret2, 'toContext');
 *
 * // Get parameters info
 * console.log(`Codec: ${params.codecId}`);
 * console.log(`Dimensions: ${params.width}x${params.height}`);
 * console.log(`Bitrate: ${params.bitRate}`);
 * ```
 *
 * @see [AVCodecParameters](https://ffmpeg.org/doxygen/trunk/structAVCodecParameters.html) - FFmpeg Doxygen
 * @see {@link CodecContext} For full codec operations
 * @see {@link Stream} For stream parameters
 */
export class CodecParameters implements NativeWrapper<NativeCodecParameters> {
  private native: NativeCodecParameters;

  constructor() {
    this.native = new bindings.CodecParameters();
  }

  /**
   * Codec type.
   *
   * Media type (video, audio, subtitle, etc.).
   *
   * Direct mapping to AVCodecParameters->codec_type.
   */
  get codecType(): AVMediaType {
    return this.native.codecType;
  }

  set codecType(value: AVMediaType) {
    this.native.codecType = value;
  }

  /**
   * Codec ID.
   *
   * Specific codec identifier (e.g., AV_CODEC_ID_H264).
   *
   * Direct mapping to AVCodecParameters->codec_id.
   */
  get codecId(): AVCodecID {
    return this.native.codecId;
  }

  set codecId(value: AVCodecID) {
    this.native.codecId = value;
  }

  /**
   * Codec tag.
   *
   * Additional codec tag used by some formats.
   *
   * Direct mapping to AVCodecParameters->codec_tag.
   */
  get codecTag(): number {
    return this.native.codecTag;
  }

  set codecTag(value: number | string) {
    if (typeof value === 'string') {
      if (value.length !== 4) {
        throw new Error('FourCC string must be exactly 4 characters');
      }

      value = stringToFourCC(value);
    }

    this.native.codecTag = value;
  }

  /**
   * Codec tag as string (FourCC).
   *
   * Human-readable string representation of the codec tag.
   * Returns the FourCC (Four Character Code) format.
   */
  get codecTagString(): string | null {
    return this.native.codecTagString;
  }

  /**
   * Extra codec data.
   *
   * Codec-specific initialization data (e.g., H.264 SPS/PPS).
   *
   * Direct mapping to AVCodecParameters->extradata.
   */
  get extradata(): Buffer | null {
    return this.native.extradata;
  }

  set extradata(value: Buffer | null) {
    this.native.extradata = value;
  }

  /**
   * Extra data size.
   *
   * Size of extradata buffer in bytes.
   *
   * Direct mapping to AVCodecParameters->extradata_size.
   */
  get extradataSize(): number {
    return this.native.extradataSize;
  }

  /**
   * Pixel or sample format.
   *
   * Format of video pixels or audio samples.
   *
   * Direct mapping to AVCodecParameters->format.
   */
  get format(): AVPixelFormat | AVSampleFormat {
    return this.native.format;
  }

  set format(value: AVPixelFormat | AVSampleFormat) {
    this.native.format = value;
  }

  /**
   * Bit rate.
   *
   * Average bitrate in bits per second.
   *
   * Direct mapping to AVCodecParameters->bit_rate.
   */
  get bitRate(): bigint {
    return this.native.bitRate;
  }

  set bitRate(value: bigint) {
    this.native.bitRate = value;
  }

  /**
   * Number of bits per coded sample.
   *
   * Bits per sample/pixel from the demuxer (needed by some codecs).
   * For uncompressed formats, this is the bits per sample.
   *
   * Direct mapping to AVCodecParameters->bits_per_coded_sample.
   */
  get bitsPerCodedSample(): number {
    return this.native.bitsPerCodedSample;
  }

  set bitsPerCodedSample(value: number) {
    this.native.bitsPerCodedSample = value;
  }

  /**
   * Number of bits per raw sample.
   *
   * Bits per sample before compression/encoding.
   * Only set when different from bitsPerCodedSample.
   *
   * Direct mapping to AVCodecParameters->bits_per_raw_sample.
   */
  get bitsPerRawSample(): number {
    return this.native.bitsPerRawSample;
  }

  set bitsPerRawSample(value: number) {
    this.native.bitsPerRawSample = value;
  }

  /**
   * Codec profile.
   *
   * Profile level (e.g., baseline, main, high for H.264).
   *
   * Direct mapping to AVCodecParameters->profile.
   */
  get profile(): AVProfile {
    return this.native.profile;
  }

  set profile(value: AVProfile) {
    this.native.profile = value;
  }

  /**
   * Codec level.
   *
   * Level within the profile.
   *
   * Direct mapping to AVCodecParameters->level.
   */
  get level(): number {
    return this.native.level;
  }

  set level(value: number) {
    this.native.level = value;
  }

  /**
   * Video width.
   *
   * Width of video frames in pixels.
   *
   * Direct mapping to AVCodecParameters->width.
   */
  get width(): number {
    return this.native.width;
  }

  set width(value: number) {
    this.native.width = value;
  }

  /**
   * Video height.
   *
   * Height of video frames in pixels.
   *
   * Direct mapping to AVCodecParameters->height.
   */
  get height(): number {
    return this.native.height;
  }

  set height(value: number) {
    this.native.height = value;
  }

  /**
   * Sample aspect ratio.
   *
   * Pixel aspect ratio for video.
   *
   * Direct mapping to AVCodecParameters->sample_aspect_ratio.
   */
  get sampleAspectRatio(): Rational {
    const sar = this.native.sampleAspectRatio;
    return new Rational(sar.num, sar.den);
  }

  set sampleAspectRatio(value: Rational) {
    this.native.sampleAspectRatio = { num: value.num, den: value.den };
  }

  /**
   * Frame rate.
   *
   * Video frame rate in frames per second.
   *
   * Direct mapping to AVCodecParameters->framerate.
   */
  get frameRate(): Rational {
    const fr = this.native.frameRate;
    return new Rational(fr.num, fr.den);
  }

  set frameRate(value: Rational) {
    this.native.frameRate = { num: value.num, den: value.den };
  }

  /**
   * Color range.
   *
   * MPEG (limited) or JPEG (full) range.
   *
   * Direct mapping to AVCodecParameters->color_range.
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
   * Chromaticity coordinates of source primaries.
   *
   * Direct mapping to AVCodecParameters->color_primaries.
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
   * Color transfer function (gamma).
   *
   * Direct mapping to AVCodecParameters->color_trc.
   */
  get colorTrc(): AVColorTransferCharacteristic {
    return this.native.colorTrc;
  }

  set colorTrc(value: AVColorTransferCharacteristic) {
    this.native.colorTrc = value;
  }

  /**
   * Color space.
   *
   * YUV colorspace type.
   *
   * Direct mapping to AVCodecParameters->color_space.
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
   * Location of chroma samples.
   *
   * Direct mapping to AVCodecParameters->chroma_location.
   */
  get chromaLocation(): AVChromaLocation {
    return this.native.chromaLocation;
  }

  set chromaLocation(value: AVChromaLocation) {
    this.native.chromaLocation = value;
  }

  /**
   * Audio channel layout.
   *
   * Configuration of audio channels.
   *
   * Direct mapping to AVCodecParameters->ch_layout.
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
   * @deprecated Use channelLayout.nbChannels instead
   *
   * Direct mapping to AVCodecParameters->channels.
   */
  get channels(): number {
    return this.native.channels;
  }

  set channels(value: number) {
    this.native.channels = value;
  }

  /**
   * Audio sample rate.
   *
   * Sample rate in Hz.
   *
   * Direct mapping to AVCodecParameters->sample_rate.
   */
  get sampleRate(): number {
    return this.native.sampleRate;
  }

  set sampleRate(value: number) {
    this.native.sampleRate = value;
  }

  /**
   * Audio frame size in samples.
   *
   * Number of samples per audio frame for codecs with constant frame size.
   * For AAC this is typically 1024, for MP3 it's 1152.
   * For codecs with variable frame size, this may be 0.
   *
   * Direct mapping to AVCodecParameters->frame_size.
   */
  get frameSize(): number {
    return this.native.frameSize;
  }

  set frameSize(value: number) {
    this.native.frameSize = value;
  }

  /**
   * Initial audio padding.
   *
   * Amount of padding (priming) samples at the beginning of the audio stream.
   * For AAC encoding, this is typically 1024 samples.
   * The muxer uses this value to correctly calculate packet timestamps.
   *
   * Direct mapping to AVCodecParameters->initial_padding.
   */
  get initialPadding(): number {
    return this.native.initialPadding;
  }

  set initialPadding(value: number) {
    this.native.initialPadding = value;
  }

  /**
   * Video delay in frames.
   *
   * Number of frames the decoded output will be delayed relative to the encoded input.
   * Used for timestamp correction in video streams.
   *
   * Direct mapping to AVCodecParameters->video_delay.
   */
  get videoDelay(): number {
    return this.native.videoDelay;
  }

  set videoDelay(value: number) {
    this.native.videoDelay = value;
  }

  /**
   * Number of coded side data entries.
   *
   * Returns the count of coded side data attached to codec parameters.
   *
   * @returns Number of side data entries
   *
   * @example
   * ```typescript
   * console.log(`Codec has ${params.nbCodedSideData} side data entries`);
   * ```
   */
  get nbCodedSideData(): number {
    return this.native.nbCodedSideData;
  }

  /**
   * Codec properties.
   *
   * Bitfield of AV_CODEC_PROP_* flags indicating codec features.
   *
   * Direct mapping to AVCodecDescriptor->props.
   *
   * @example
   * ```typescript
   * import { AV_CODEC_PROP_FIELDS } from 'node-av/constants';
   *
   * const props = params.codecProperties;
   * if (props & AV_CODEC_PROP_FIELDS) {
   *   console.log('Codec supports interlaced video (fields)');
   * }
   * ```
   *
   * @see {@link hasProperties} For checking specific properties
   */
  get codecProperties(): AVCodecProp {
    return this.native.codecProperties;
  }

  /**
   * Check if codec has specific properties.
   *
   * Tests whether all specified properties are present using bitwise AND.
   *
   * @param props - One or more property values to check
   *
   * @returns true if all specified properties are present, false otherwise
   *
   * @example
   * ```typescript
   * import { AV_CODEC_PROP_FIELDS, AV_CODEC_PROP_REORDER } from 'node-av/constants';
   *
   * if (params.hasProperties(AV_CODEC_PROP_FIELDS)) {
   *   console.log('Codec supports interlaced video (fields)');
   * }
   *
   * // Check multiple properties
   * if (params.hasProperties(AV_CODEC_PROP_LOSSY, AV_CODEC_PROP_REORDER)) {
   *   console.log('Codec is lossy and supports frame reordering');
   * }
   * ```
   *
   * @see {@link codecProperties} For direct properties access
   */
  hasProperties(...props: AVCodecProp[]): boolean {
    for (const prop of props) {
      if ((this.native.codecProperties & prop) !== prop) {
        return false;
      }
    }
    return true;
  }

  /**
   * Allocate codec parameters.
   *
   * Allocates memory for the parameters structure.
   *
   * Direct mapping to avcodec_parameters_alloc().
   *
   * @throws {Error} If allocation fails (ENOMEM)
   *
   * @example
   * ```typescript
   * const params = new CodecParameters();
   * params.alloc();
   * // Parameters ready for use
   * ```
   *
   * @see {@link free} To deallocate
   */
  alloc(): void {
    this.native.alloc();
  }

  /**
   * Free codec parameters.
   *
   * Releases all memory associated with the parameters.
   *
   * Direct mapping to avcodec_parameters_free().
   *
   * @example
   * ```typescript
   * params.free();
   * // Parameters now invalid
   * ```
   *
   * @see {@link alloc} To allocate
   * @see {@link Symbol.dispose} For automatic cleanup
   */
  free(): void {
    this.native.free();
  }

  /**
   * Copy parameters to destination.
   *
   * Copies all codec parameters to another instance.
   *
   * Direct mapping to avcodec_parameters_copy().
   *
   * @param dst - Destination parameters
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const dst = new CodecParameters();
   * dst.alloc();
   * const ret = src.copy(dst);
   * FFmpegError.throwIfError(ret, 'copy');
   * ```
   */
  copy(dst: CodecParameters): number {
    return this.native.copy(dst.getNative());
  }

  /**
   * Fill parameters from codec context.
   *
   * Extracts codec parameters from a configured codec context.
   *
   * Direct mapping to avcodec_parameters_from_context().
   *
   * @param codecContext - Source codec context
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Extract parameters from encoder
   * const ret = params.fromContext(encoderContext);
   * FFmpegError.throwIfError(ret, 'fromContext');
   * ```
   *
   * @see {@link toContext} To apply to context
   */
  fromContext(codecContext: CodecContext): number {
    return this.native.fromContext(codecContext.getNative());
  }

  /**
   * Apply parameters to codec context.
   *
   * Configures a codec context with these parameters.
   * Essential for initializing decoders with stream parameters.
   *
   * Direct mapping to avcodec_parameters_to_context().
   *
   * @param codecContext - Destination codec context
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Configure decoder with stream parameters
   * const stream = formatContext.streams[0];
   * const ret = stream.codecpar.toContext(decoderContext);
   * FFmpegError.throwIfError(ret, 'toContext');
   * ```
   *
   * @see {@link fromContext} To extract from context
   */
  toContext(codecContext: CodecContext): number {
    return this.native.toContext(codecContext.getNative());
  }

  /**
   * Parse extradata to extract codec parameters.
   *
   * Opens a decoder to parse extradata (SPS/PPS for H.264, etc.) and extract
   * codec parameters like width/height for video or sample_rate for audio.
   * This is used when extradata exists (e.g., from SDP sprop-parameter-sets)
   * but dimensions are missing due to insufficient probesize.
   *
   * Uses FFmpeg's decoder to parse extradata, same as avformat_find_stream_info()
   * does internally. Works for all codecs (H.264, H.265, VP9, AV1, etc.).
   *
   * @returns 0 on success, negative error code on failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // After opening RTSP with low probesize
   * const input = await Demuxer.open('rtsp://...', {
   *   options: { probesize: 32 }
   * });
   *
   * const stream = input.video();
   * if (stream.codecpar.width === 0 && stream.codecpar.extradata) {
   *   // Parse extradata to get dimensions
   *   const ret = stream.codecpar.parseExtradata();
   *   FFmpegError.throwIfError(ret, 'parseExtradata');
   *   console.log(`Dimensions: ${stream.codecpar.width}x${stream.codecpar.height}`);
   * }
   * ```
   */
  parseExtradata(): number {
    return this.native.parseExtradata();
  }

  /**
   * Get RFC 6381 codec string.
   *
   * Returns a codec string suitable for MIME type parameters and WebCodecs
   * configuration (e.g., `avc1.64001f`, `hev1.1.6.L93.B0`, `mp4a.40.2`).
   *
   * Direct mapping to av_mime_codec_str().
   *
   * @returns Codec string, or null if not available
   *
   * @example
   * ```typescript
   * const codecString = codecpar.getCodecString();
   * if (codecString) {
   *   console.log(`Codec: ${codecString}`);
   *   // Use with WebCodecs
   *   const supported = await VideoDecoder.isConfigSupported({
   *     codec: codecString,
   *   });
   * }
   * ```
   */
  getCodecString(): string | null {
    return this.native.getCodecString();
  }

  /**
   * Get decoder configuration record (avcC/hvcC binary blob).
   *
   * Returns the decoder configuration record in ISOM/MP4 format, suitable
   * for use as the `description` field in WebCodecs `VideoDecoder.configure()`.
   * For H.264, converts Annex B extradata to avcC format.
   * For HEVC, converts Annex B extradata to hvcC format.
   * For other codecs (AV1, VP9, etc.), returns raw extradata as-is.
   *
   * @returns Configuration record buffer, or null if no extradata
   *
   * @example
   * ```typescript
   * const dcr = codecpar.getDecoderConfigurationRecord();
   * if (dcr) {
   *   // Use with WebCodecs
   *   const decoder = new VideoDecoder({ ... });
   *   decoder.configure({
   *     codec: codecpar.getCodecString()!,
   *     description: dcr,
   *   });
   * }
   * ```
   */
  getDecoderConfigurationRecord(): Buffer | null {
    return this.native.getDecoderConfigurationRecord();
  }

  /**
   * Convert to JSON representation.
   *
   * Returns all codec parameters as a plain object.
   * Useful for debugging and serialization.
   *
   * @returns Object with all parameter values
   *
   * @example
   * ```typescript
   * const json = params.toJSON();
   * console.log(JSON.stringify(json, null, 2));
   * ```
   */
  toJSON(): Record<string, any> {
    return this.native.toJSON();
  }

  /**
   * Get coded side data.
   *
   * Retrieves additional data associated with the codec parameters
   * (e.g., HDR metadata, Dolby Vision configuration, mastering display).
   *
   * Direct mapping to accessing AVCodecParameters.coded_side_data.
   *
   * @param type - Type of side data to retrieve
   *
   * @returns Side data buffer, or null if not present
   *
   * @example
   * ```typescript
   * import { AV_PKT_DATA_MASTERING_DISPLAY_METADATA } from 'node-av/constants';
   *
   * // Get HDR mastering display metadata
   * const hdrData = params.getCodedSideData(AV_PKT_DATA_MASTERING_DISPLAY_METADATA);
   * if (hdrData) {
   *   console.log(`HDR metadata: ${hdrData.length} bytes`);
   * }
   * ```
   *
   * @see {@link addCodedSideData} To add side data
   * @see {@link nbCodedSideData} For count of side data entries
   */
  getCodedSideData(type: AVPacketSideDataType): Buffer | null {
    return this.native.getCodedSideData(type);
  }

  /**
   * Get all coded side data entries.
   *
   * Returns all side data attached to the codec parameters.
   * Each entry contains the type and data buffer.
   * This allows iteration over all side data like FFmpeg CLI does.
   *
   * Direct mapping to accessing AVCodecParameters.coded_side_data array.
   *
   * @returns Array of side data entries with type and data
   *
   * @example
   * ```typescript
   * // Iterate all side data like FFmpeg does (ffmpeg_mux_init.c)
   * const allSideData = params.getAllCodedSideData();
   * for (const sd of allSideData) {
   *   console.log(`Type: ${sd.type}, Size: ${sd.data.length}`);
   *   // Copy to output stream
   *   outParams.addCodedSideData(sd.type, sd.data);
   * }
   * ```
   *
   * @see {@link getCodedSideData} To get specific side data by type
   * @see {@link addCodedSideData} To add side data
   * @see {@link nbCodedSideData} For count of side data entries
   */
  getAllCodedSideData(): { type: AVPacketSideDataType; data: Buffer }[] {
    return this.native.getAllCodedSideData();
  }

  /**
   * Add coded side data to codec parameters.
   *
   * Attaches additional data to the codec parameters. The data is copied.
   * Commonly used for HDR metadata, Dolby Vision configuration, etc.
   *
   * Direct mapping to av_packet_side_data_add() for coded_side_data.
   *
   * @param type - Type of side data
   *
   * @param data - Side data buffer
   *
   * @returns 0 on success, negative AVERROR on error
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AV_PKT_DATA_DOVI_CONF } from 'node-av/constants';
   *
   * // Add Dolby Vision configuration
   * const doviConf = Buffer.from([...]); // Dolby Vision config data
   * const ret = params.addCodedSideData(AV_PKT_DATA_DOVI_CONF, doviConf);
   * FFmpegError.throwIfError(ret, 'addCodedSideData');
   * ```
   *
   * @see {@link getCodedSideData} To retrieve side data
   */
  addCodedSideData(type: AVPacketSideDataType, data: Buffer): number {
    return this.native.addCodedSideData(type, data);
  }

  /**
   * Get the underlying native CodecParameters object.
   *
   * @returns The native CodecParameters binding object
   *
   * @internal
   */
  getNative(): NativeCodecParameters {
    return this.native;
  }

  /**
   * Dispose of the codec parameters.
   *
   * Implements the Disposable interface for automatic cleanup.
   *
   * @example
   * ```typescript
   * {
   *   using params = new CodecParameters();
   *   params.alloc();
   *   // Use params...
   * } // Automatically disposed when leaving scope
   * ```
   */
  [Symbol.dispose](): void {
    this.native[Symbol.dispose]();
  }
}
