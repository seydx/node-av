import { FF_HWDEVICE_TYPE_NONE } from '../constants/hardware.js';
import { bindings } from './binding.js';
import { FFmpegError } from './error.js';

import type { AVCodecID, AVHWDeviceType, AVMediaType, AVPixelFormat, AVSampleFormat } from '../constants/constants.js';
import type { FFHWDeviceType } from '../constants/hardware.js';
import type { FormatContext } from './format-context.js';
import type { NativeCodecParameters, NativePacket, NativeStream, NativeWrapper } from './native-types.js';
import type { ChannelLayout, DtsPredictState, IRational } from './types.js';

/**
 * Get FFmpeg library information.
 *
 * Returns detailed information about the FFmpeg libraries including
 * version numbers and build configuration.
 *
 * @returns FFmpeg information object with version, configuration, and library versions
 *
 * @example
 * ```typescript
 * import { getFFmpegInfo } from 'node-av/lib';
 *
 * const info = getFFmpegInfo();
 * console.log('FFmpeg version:', info.version);
 * console.log('Configuration:', info.configuration);
 * console.log('libavcodec:', info.libraries.avcodec);
 * ```
 */
export function getFFmpegInfo(): {
  version: string;
  configuration: string;
  libraries: {
    avutil: string;
    avcodec: string;
    avformat: string;
    avfilter: string;
    avdevice: string;
    swscale: string;
    swresample: string;
  };
} {
  return bindings.getFFmpegInfo();
}

/**
 * Get bytes per audio sample.
 *
 * Returns the number of bytes required to store a single audio sample
 * in the specified format.
 *
 * Direct mapping to av_get_bytes_per_sample().
 *
 * @param sampleFmt - Audio sample format
 *
 * @returns Number of bytes per sample, or 0 if unknown format
 *
 * @example
 * ```typescript
 * import { AV_SAMPLE_FMT_S16, AV_SAMPLE_FMT_FLTP } from 'node-av/constants';
 *
 * const bytesS16 = avGetBytesPerSample(AV_SAMPLE_FMT_S16);  // Returns 2
 * const bytesFloat = avGetBytesPerSample(AV_SAMPLE_FMT_FLTP); // Returns 4
 * ```
 *
 * @see [av_get_bytes_per_sample](https://ffmpeg.org/doxygen/7.1/group__lavu__sampfmts.html#ga0c3c218e1dd570ad4917c69a35a6c77d) - FFmpeg Doxygen
 */
export function avGetBytesPerSample(sampleFmt: AVSampleFormat): number {
  return bindings.avGetBytesPerSample(sampleFmt);
}

/**
 * Get sample format name.
 *
 * Returns the name of the audio sample format as a string.
 *
 * Direct mapping to av_get_sample_fmt_name().
 *
 * @param sampleFmt - Audio sample format
 *
 * @returns Format name, or null if unknown
 *
 * @example
 * ```typescript
 * import { AV_SAMPLE_FMT_S16, AV_SAMPLE_FMT_FLTP } from 'node-av/constants';
 *
 * const name1 = avGetSampleFmtName(AV_SAMPLE_FMT_S16);  // Returns "s16"
 * const name2 = avGetSampleFmtName(AV_SAMPLE_FMT_FLTP); // Returns "fltp"
 * ```
 *
 * @see [av_get_sample_fmt_name](https://ffmpeg.org/doxygen/7.1/group__lavu__sampfmts.html#ga31b9d149b2de9821a65f4f5612970838) - FFmpeg Doxygen
 */
export function avGetSampleFmtName(sampleFmt: AVSampleFormat): string | null {
  return bindings.avGetSampleFmtName(sampleFmt);
}

/**
 * Get sample format from name string.
 *
 * Converts a sample format name (like "s16", "fltp", etc.) to the
 * corresponding AVSampleFormat enum value.
 *
 * Direct mapping to av_get_sample_fmt().
 *
 * @param name - Sample format name (e.g., "s16", "fltp", "s32p")
 *
 * @returns Sample format enum, or AV_SAMPLE_FMT_NONE if unknown
 *
 * @example
 * ```typescript
 * const fmt1 = avGetSampleFmtFromName("s16");   // Returns AV_SAMPLE_FMT_S16
 * const fmt2 = avGetSampleFmtFromName("fltp");  // Returns AV_SAMPLE_FMT_FLTP
 * const none = avGetSampleFmtFromName("invalid"); // Returns AV_SAMPLE_FMT_NONE
 * ```
 *
 * @see [av_get_sample_fmt](https://ffmpeg.org/doxygen/7.1/group__lavu__sampfmts.html#ga5b95d0bf179912e8ff0d23ddfa99c9bc) - FFmpeg Doxygen
 * @see {@link avGetSampleFmtName} For converting format to name string
 */
export function avGetSampleFmtFromName(name: string): AVSampleFormat {
  return bindings.avGetSampleFmtFromName(name);
}

/**
 * Get packed sample format.
 *
 * Returns the packed (interleaved) version of a planar sample format,
 * or the format itself if already packed.
 *
 * Direct mapping to av_get_packed_sample_fmt().
 *
 * @param sampleFmt - Audio sample format
 *
 * @returns Packed version of the format
 *
 * @example
 * ```typescript
 * import { AV_SAMPLE_FMT_FLTP, AV_SAMPLE_FMT_FLT } from 'node-av/constants';
 *
 * const packed = avGetPackedSampleFmt(AV_SAMPLE_FMT_FLTP); // Returns AV_SAMPLE_FMT_FLT
 * const same = avGetPackedSampleFmt(AV_SAMPLE_FMT_FLT);    // Returns AV_SAMPLE_FMT_FLT
 * ```
 *
 * @see [av_get_packed_sample_fmt](https://ffmpeg.org/doxygen/7.1/group__lavu__sampfmts.html#ga7817ec0eff4dc6fc0962f31e6d138bca) - FFmpeg Doxygen
 * @see {@link avGetPlanarSampleFmt} For getting planar version
 */
export function avGetPackedSampleFmt(sampleFmt: AVSampleFormat): AVSampleFormat {
  return bindings.avGetPackedSampleFmt(sampleFmt);
}

/**
 * Get planar sample format.
 *
 * Returns the planar (non-interleaved) version of a packed sample format,
 * or the format itself if already planar.
 *
 * Direct mapping to av_get_planar_sample_fmt().
 *
 * @param sampleFmt - Audio sample format
 *
 * @returns Planar version of the format
 *
 * @example
 * ```typescript
 * import { AV_SAMPLE_FMT_FLT, AV_SAMPLE_FMT_FLTP } from 'node-av/constants';
 *
 * const planar = avGetPlanarSampleFmt(AV_SAMPLE_FMT_FLT);   // Returns AV_SAMPLE_FMT_FLTP
 * const same = avGetPlanarSampleFmt(AV_SAMPLE_FMT_FLTP);    // Returns AV_SAMPLE_FMT_FLTP
 * ```
 *
 * @see [av_get_planar_sample_fmt](https://ffmpeg.org/doxygen/7.1/group__lavu__sampfmts.html#ga82caf838259d95cc6c4fd87633bb0e19) - FFmpeg Doxygen
 * @see {@link avGetPackedSampleFmt} For getting packed version
 */
export function avGetPlanarSampleFmt(sampleFmt: AVSampleFormat): AVSampleFormat {
  return bindings.avGetPlanarSampleFmt(sampleFmt);
}

/**
 * Check if sample format is planar.
 *
 * Returns whether the audio sample format stores channels in separate planes
 * (planar) rather than interleaved.
 *
 * Direct mapping to av_sample_fmt_is_planar().
 *
 * @param sampleFmt - Audio sample format to check
 *
 * @returns True if planar, false if packed/interleaved
 *
 * @example
 * ```typescript
 * import { AV_SAMPLE_FMT_S16, AV_SAMPLE_FMT_S16P } from 'node-av/constants';
 *
 * const isPacked = avSampleFmtIsPlanar(AV_SAMPLE_FMT_S16);  // Returns false
 * const isPlanar = avSampleFmtIsPlanar(AV_SAMPLE_FMT_S16P); // Returns true
 * ```
 *
 * @see [av_sample_fmt_is_planar](https://ffmpeg.org/doxygen/7.1/group__lavu__sampfmts.html#ga06ba8a64dc4382c422789a5d0b6bf592) - FFmpeg Doxygen
 */
export function avSampleFmtIsPlanar(sampleFmt: AVSampleFormat): boolean {
  return bindings.avSampleFmtIsPlanar(sampleFmt);
}

/**
 * Get codec name from codec ID.
 *
 * Returns the canonical codec name corresponding to the codec ID.
 *
 * Direct mapping to avcodec_get_name().
 *
 * @param codecId - Codec ID from AVCodecID enum
 *
 * @returns Codec name string or null
 *
 * @example
 * ```typescript
 * import { AV_CODEC_ID_H264, AV_CODEC_ID_HEVC } from 'node-av/constants';
 * import { avGetCodecName } from 'node-av/lib';
 *
 * const h264Name = avGetCodecName(AV_CODEC_ID_H264);  // Returns "h264"
 * const hevcName = avGetCodecName(AV_CODEC_ID_HEVC);  // Returns "hevc"
 * const unknownName = avGetCodecName(99999);          // Returns null
 * ```
 *
 * @see [avcodec_get_name](https://ffmpeg.org/doxygen/7.1/group__lavc__core.html#ga2016a52e94f867ebe5113bdf448e182d) - FFmpeg Doxygen
 */
export function avGetCodecName(codecId: AVCodecID): string | null {
  return bindings.avGetCodecName(codecId);
}

/**
 * Get RFC 6381 codec string from codec parameters.
 *
 * Generates codec strings for MPEG-DASH and HLS manifests following RFC 6381.
 * Uses FFmpeg's centralized ff_make_codec_str() implementation (libavformat/codecstring.c).
 *
 * Supported codecs:
 * - **WebM codecs**: VP8, VP9 (with detailed profile/level), Vorbis, Opus, FLAC
 * - **H.264** (avc1): `avc1.PPCCLL` (profile, constraints, level)
 * - **HEVC** (hvc1): `hvc1.P.PC.TL.C` (profile, profile_compatibility, tier+level, constraints)
 * - **AV1** (av01): `av01.P.LLT.BB...` (profile, level, tier, bitdepth, color info)
 * - **AAC**: `mp4a.40.AOT` (audio object type)
 * - **MP2**: `mp4a.40.33`
 * - **MP3**: `mp4a.40.34`
 * - **AC-3**: `ac-3`
 * - **E-AC-3**: `ec-3`
 * - **MPEG-4 Visual**: `mp4v.20` (profile/level not implemented)
 *
 * @param codecpar - Codec parameters
 *
 * @param frameRate - Optional frame rate for VP9 level calculation (only used for VP9)
 *
 * @returns RFC 6381 codec string, or null if codec not supported
 *
 * @example
 * ```typescript
 * import { avGetCodecString } from 'node-av/lib';
 *
 * // Get codec string for DASH/HLS manifest
 * const stream = output.video();
 * const codecString = avGetCodecString(stream.codecpar);
 * console.log(codecString); // "hvc1.1.6.L93.B0" for HEVC, "avc1.42c01e" for H.264
 *
 * // VP9 with frame rate for accurate level
 * const codecStringVP9 = avGetCodecString(stream.codecpar, { num: 30, den: 1 });
 * console.log(codecStringVP9); // "vp09.00.30.08" - detailed VP9 string
 *
 * // Use for DASH/HLS manifest
 * const mimeType = `video/mp4; codecs="${codecString}"`;
 * ```
 *
 * @see [codecstring.c](https://github.com/FFmpeg/FFmpeg/blob/master/libavformat/codecstring.c) - FFmpeg implementation
 */
export function avGetCodecString(codecpar: NativeWrapper<NativeCodecParameters>, frameRate?: IRational): string | null {
  return bindings.avGetCodecString(codecpar.getNative(), frameRate);
}

/**
 * Get DASH MIME type for codec parameters.
 *
 * Determines the MIME type for MPEG-DASH segments based on codec.
 * Uses FFmpeg's segment type selection logic:
 * - WebM codecs (VP8, VP9, Vorbis, Opus) → `video/webm` or `audio/webm`
 * - All other codecs → `video/mp4` or `audio/mp4`
 *
 * @param codecpar - Codec parameters
 *
 * @returns MIME type string, or null if invalid media type
 *
 * @example
 * ```typescript
 * import { avGetMimeTypeDash } from 'node-av/lib';
 *
 * const stream = input.video();
 * const mimeType = avGetMimeTypeDash(stream.codecpar);
 * console.log(mimeType); // "video/mp4" for H.264
 *
 * // VP9 codec
 * const mimeTypeVP9 = avGetMimeTypeDash(vp9Stream.codecpar);
 * console.log(mimeTypeVP9); // "video/webm"
 * ```
 *
 * @see https://ffmpeg.org/doxygen/trunk/dashenc_8c_source.html#l00285 - FFmpeg dashenc.c segment type selection
 */
export function avGetMimeTypeDash(codecpar: NativeWrapper<NativeCodecParameters>): string | null {
  return bindings.avGetMimeTypeDash(codecpar.getNative());
}

/**
 * Get pixel format name.
 *
 * Returns the name of the pixel format as a string.
 *
 * Direct mapping to av_get_pix_fmt_name().
 *
 * @param pixFmt - Pixel format
 *
 * @returns Format name, or null if unknown
 *
 * @example
 * ```typescript
 * import { AV_PIX_FMT_YUV420P, AV_PIX_FMT_RGB24 } from 'node-av/constants';
 *
 * const name1 = avGetPixFmtName(AV_PIX_FMT_YUV420P); // Returns "yuv420p"
 * const name2 = avGetPixFmtName(AV_PIX_FMT_RGB24);   // Returns "rgb24"
 * ```
 *
 * @see [av_get_pix_fmt_name](https://ffmpeg.org/doxygen/7.1/pixdesc_8c.html#ab92e2a8a9b58c982560c49df9f01e47e) - FFmpeg Doxygen
 */
export function avGetPixFmtName(pixFmt: AVPixelFormat): string | null {
  return bindings.avGetPixFmtName(pixFmt);
}

/**
 * Get pixel format from name.
 *
 * Returns the pixel format enum value from its string name.
 *
 * Direct mapping to av_get_pix_fmt().
 *
 * @param name - Pixel format name
 *
 * @returns Pixel format enum, or AV_PIX_FMT_NONE if unknown
 *
 * @example
 * ```typescript
 * const fmt1 = avGetPixFmtFromName("yuv420p"); // Returns AV_PIX_FMT_YUV420P
 * const fmt2 = avGetPixFmtFromName("rgb24");   // Returns AV_PIX_FMT_RGB24
 * const none = avGetPixFmtFromName("invalid"); // Returns AV_PIX_FMT_NONE
 * ```
 *
 * @see [av_get_pix_fmt](https://ffmpeg.org/doxygen/7.1/pixdesc_8h.html#a925ef18d69c24c3be8c53d5a7dc0660e) - FFmpeg Doxygen
 */
export function avGetPixFmtFromName(name: string): AVPixelFormat {
  return bindings.avGetPixFmtFromName(name);
}

/**
 * Check if pixel format is hardware accelerated.
 *
 * Returns whether the pixel format represents hardware-accelerated frames
 * (GPU memory) rather than software frames (system memory).
 *
 * Direct mapping to av_pix_fmt_desc_get() with hwaccel check.
 *
 * @param pixFmt - Pixel format to check
 *
 * @returns True if hardware format, false if software format
 *
 * @example
 * ```typescript
 * import { AV_PIX_FMT_YUV420P, AV_PIX_FMT_CUDA } from 'node-av/constants';
 *
 * const isSoftware = avIsHardwarePixelFormat(AV_PIX_FMT_YUV420P); // Returns false
 * const isHardware = avIsHardwarePixelFormat(AV_PIX_FMT_CUDA);    // Returns true
 * ```
 *
 * @see [av_pix_fmt_desc_get](https://ffmpeg.org/doxygen/7.1/pixdesc_8c.html#afe0c3e8aef5173de28bbdaea4298f5f0) - FFmpeg Doxygen
 */
export function avIsHardwarePixelFormat(pixFmt: AVPixelFormat): boolean {
  return bindings.avIsHardwarePixelFormat(pixFmt);
}

/**
 * Get hardware device type name.
 *
 * Returns the string name for a hardware device type enum value.
 *
 * Direct mapping to av_hwdevice_get_type_name().
 *
 * @param type - Hardware device type enum
 *
 * @returns Device type name (e.g. "videotoolbox", "cuda"), or null if unknown
 *
 * @example
 * ```typescript
 * import { AV_HWDEVICE_TYPE_VIDEOTOOLBOX, AV_HWDEVICE_TYPE_CUDA } from 'node-av/constants';
 *
 * const name1 = avGetHardwareDeviceTypeName(AV_HWDEVICE_TYPE_VIDEOTOOLBOX); // Returns "videotoolbox"
 * const name2 = avGetHardwareDeviceTypeName(AV_HWDEVICE_TYPE_CUDA);         // Returns "cuda"
 * ```
 *
 * @see [av_hwdevice_get_type_name](https://ffmpeg.org/doxygen/7.1/hwcontext_8h.html#afb2b99a15f3fdde25a2fd19353ac5a67) - FFmpeg Doxygen
 */
export function avGetHardwareDeviceTypeName(type: AVHWDeviceType): FFHWDeviceType {
  const name = bindings.avGetHardwareDeviceTypeName(type) as FFHWDeviceType | null;
  return name ?? FF_HWDEVICE_TYPE_NONE;
}

/**
 * Get hardware device type from name.
 *
 * Looks up the hardware device type enum from its string name.
 * Returns AV_HWDEVICE_TYPE_NONE if the name is not recognized.
 *
 * Direct mapping to av_hwdevice_find_type_by_name().
 *
 * @param name - Hardware device type name (e.g. "videotoolbox", "cuda")
 *
 * @returns Hardware device type enum, or AV_HWDEVICE_TYPE_NONE if not found
 *
 * @example
 * ```typescript
 * import { avGetHardwareDeviceTypeFromName } from 'node-av/lib';
 *
 * const type1 = avGetHardwareDeviceTypeFromName("videotoolbox"); // Returns AV_HWDEVICE_TYPE_VIDEOTOOLBOX
 * const type2 = avGetHardwareDeviceTypeFromName("cuda");         // Returns AV_HWDEVICE_TYPE_CUDA
 * const none = avGetHardwareDeviceTypeFromName("invalid");       // Returns AV_HWDEVICE_TYPE_NONE
 * ```
 *
 * @see [av_hwdevice_find_type_by_name](https://ffmpeg.org/doxygen/7.1/hwcontext_8h.html#a541943ddced791765349645a30adfa4d) - FFmpeg Doxygen
 */
export function avGetHardwareDeviceTypeFromName(name: FFHWDeviceType): AVHWDeviceType {
  return bindings.avGetHardwareDeviceTypeFromName(name);
}

/**
 * Get media type string.
 *
 * Returns a human-readable string for the media type.
 *
 * Direct mapping to av_get_media_type_string().
 *
 * @param mediaType - Media type enum
 *
 * @returns Media type name, or null if unknown
 *
 * @example
 * ```typescript
 * import { AVMEDIA_TYPE_VIDEO, AVMEDIA_TYPE_AUDIO } from 'node-av/constants';
 *
 * const video = avGetMediaTypeString(AVMEDIA_TYPE_VIDEO); // Returns "video"
 * const audio = avGetMediaTypeString(AVMEDIA_TYPE_AUDIO); // Returns "audio"
 * ```
 *
 * @see [av_get_media_type_string](https://ffmpeg.org/doxygen/7.1/group__lavu__misc.html#gaf21645cfa855b2caf9699d7dc7b2d08e) - FFmpeg Doxygen
 */
export function avGetMediaTypeString(mediaType: AVMediaType): string | null {
  return bindings.avGetMediaTypeString(mediaType);
}

/**
 * Allocate image buffer.
 *
 * Allocates a buffer large enough to hold an image with the specified dimensions
 * and pixel format. Returns buffer and layout information.
 *
 * Direct mapping to av_image_alloc().
 *
 * @param width - Image width in pixels
 *
 * @param height - Image height in pixels
 *
 * @param pixFmt - Pixel format
 *
 * @param align - Buffer alignment (typically 1 or 32)
 *
 * @returns Object with buffer, size, and line sizes
 *
 * @throws {FFmpegError} If allocation fails
 *
 * @example
 * ```typescript
 * import { AV_PIX_FMT_YUV420P } from 'node-av/constants';
 *
 * const { buffer, size, linesizes } = avImageAlloc(
 *   1920, 1080, AV_PIX_FMT_YUV420P, 32
 * );
 * console.log(`Allocated ${size} bytes`);
 * console.log(`Line sizes: ${linesizes}`);
 * ```
 *
 * @see [av_image_alloc](https://ffmpeg.org/doxygen/7.1/group__lavu__picture.html#ga841e0a89a642e24141af1918a2c10448) - FFmpeg Doxygen
 * @see {@link avImageGetBufferSize} To calculate size without allocating
 */
export function avImageAlloc(
  width: number,
  height: number,
  pixFmt: AVPixelFormat,
  align: number,
): {
  buffer: Buffer;
  size: number;
  linesizes: number[];
} {
  const result = bindings.avImageAlloc(width, height, pixFmt, align);
  if (typeof result === 'number') {
    // Error code returned instead of object
    throw new FFmpegError(result);
  }
  return result;
}

/**
 * Copy image data.
 *
 * Copies image data from source to destination buffers.
 *
 * Direct mapping to av_image_copy2().
 *
 * @param dstData - Destination data planes
 *
 * @param dstLinesizes - Destination bytes per line
 *
 * @param srcData - Source data planes
 *
 * @param srcLinesizes - Source bytes per line
 *
 * @param pixFmt - Pixel format
 *
 * @param width - Image width
 *
 * @param height - Image height
 *
 * @example
 * ```typescript
 * avImageCopy2(
 *   dstPlanes, dstStrides,
 *   srcPlanes, srcStrides,
 *   AV_PIX_FMT_YUV420P, 1920, 1080
 * );
 * ```
 *
 * @see [av_image_copy2](https://ffmpeg.org/doxygen/7.1/group__lavu__picture.html#ga911cb7d723163b88bdbbdacbeeaacf2d) - FFmpeg Doxygen
 */
export function avImageCopy2(
  dstData: Buffer[],
  dstLinesizes: number[],
  srcData: Buffer[],
  srcLinesizes: number[],
  pixFmt: AVPixelFormat,
  width: number,
  height: number,
): void {
  bindings.avImageCopy2(dstData, dstLinesizes, srcData, srcLinesizes, pixFmt, width, height);
}

/**
 * Get image buffer size.
 *
 * Calculates the required buffer size for an image without allocating.
 *
 * Direct mapping to av_image_get_buffer_size().
 *
 * @param pixFmt - Pixel format
 *
 * @param width - Image width
 *
 * @param height - Image height
 *
 * @param align - Buffer alignment
 *
 * @returns Required buffer size in bytes
 *
 * @example
 * ```typescript
 * import { AV_PIX_FMT_RGB24 } from 'node-av/constants';
 *
 * const size = avImageGetBufferSize(AV_PIX_FMT_RGB24, 1920, 1080, 1);
 * console.log(`Need ${size} bytes for Full HD RGB24`);
 * ```
 *
 * @see [av_image_get_buffer_size](https://ffmpeg.org/doxygen/7.1/group__lavu__picture.html#ga24a67963c3ae0054a2a4bab35930e694) - FFmpeg Doxygen
 * @see {@link avImageAlloc} To allocate the buffer
 */
export function avImageGetBufferSize(pixFmt: AVPixelFormat, width: number, height: number, align: number): number {
  return bindings.avImageGetBufferSize(pixFmt, width, height, align);
}

/**
 * Copy image to buffer.
 *
 * Copies image data from separate planes to a single contiguous buffer.
 *
 * Direct mapping to av_image_copy_to_buffer().
 *
 * @param dst - Destination buffer
 *
 * @param dstSize - Destination buffer size
 *
 * @param srcData - Source data planes
 *
 * @param srcLinesize - Source bytes per line
 *
 * @param pixFmt - Pixel format
 *
 * @param width - Image width
 *
 * @param height - Image height
 *
 * @param align - Buffer alignment
 *
 * @returns Bytes written, or negative AVERROR
 *
 * @example
 * ```typescript
 * const buffer = Buffer.alloc(bufferSize);
 * const written = avImageCopyToBuffer(
 *   buffer, bufferSize,
 *   srcPlanes, srcStrides,
 *   AV_PIX_FMT_YUV420P, 1920, 1080, 1
 * );
 * ```
 *
 * @see [av_image_copy_to_buffer](https://ffmpeg.org/doxygen/7.1/group__lavu__picture.html#ga6f8576f1ef0c2d9a9f7c5ac7f9a28c52) - FFmpeg Doxygen
 */
export function avImageCopyToBuffer(
  dst: Buffer,
  dstSize: number,
  srcData: Buffer[] | null,
  srcLinesize: number[] | null,
  pixFmt: AVPixelFormat,
  width: number,
  height: number,
  align: number,
): number {
  return bindings.avImageCopyToBuffer(dst, dstSize, srcData, srcLinesize, pixFmt, width, height, align);
}

/**
 * Convert timestamp to string.
 *
 * Converts a timestamp to a string representation.
 *
 * Direct mapping to av_ts2str().
 *
 * @param ts - Timestamp value
 *
 * @returns String representation
 *
 * @example
 * ```typescript
 * const str1 = avTs2Str(1234567n);  // Returns "1234567"
 * const str2 = avTs2Str(null);      // Returns "NOPTS"
 * ```
 *
 * @see [av_ts2str](https://ffmpeg.org/doxygen/7.1/timestamp_8h.html#a86d797e907fa454ed5fd34bfb0bcd747) - FFmpeg Doxygen
 */
export function avTs2Str(ts: bigint | number | null): string {
  return bindings.avTs2Str(ts);
}

/**
 * Convert timestamp to time string.
 *
 * Converts a timestamp to a time string using the specified time base.
 *
 * Direct mapping to av_ts2timestr().
 *
 * @param ts - Timestamp value
 *
 * @param timeBase - Time base for conversion
 *
 * @returns Time string representation
 *
 * @example
 * ```typescript
 * const timeStr = avTs2TimeStr(90000n, { num: 1, den: 90000 }); // Returns "1.000000"
 * const nopts = avTs2TimeStr(null, { num: 1, den: 1000 });      // Returns "NOPTS"
 * ```
 *
 * @see [av_ts2timestr](https://ffmpeg.org/doxygen/7.1/timestamp_8h.html#ad344b91ede6b86fc0a530611293f42da) - FFmpeg Doxygen
 */
export function avTs2TimeStr(ts: bigint | number | null, timeBase: IRational | null): string {
  if (!timeBase) {
    return avTs2Str(ts);
  }
  return bindings.avTs2TimeStr(ts, timeBase);
}

/**
 * Allocate image arrays.
 *
 * Allocates image data as separate plane arrays.
 *
 * @param width - Image width
 *
 * @param height - Image height
 *
 * @param pixFmt - Pixel format
 *
 * @param align - Buffer alignment
 *
 * @returns Object with data planes, line sizes, and total size
 *
 * @example
 * ```typescript
 * const { data, linesizes, size } = avImageAllocArrays(
 *   1920, 1080, AV_PIX_FMT_YUV420P, 32
 * );
 * console.log(`Allocated ${data.length} planes, total ${size} bytes`);
 * ```
 */
export function avImageAllocArrays(
  width: number,
  height: number,
  pixFmt: AVPixelFormat,
  align: number,
): {
  data: Buffer[];
  linesizes: number[];
  size: number;
} {
  const result = avImageAlloc(width, height, pixFmt, align);

  // Split the buffer into planes based on pixel format
  const data: Buffer[] = [];
  const linesizes = result.linesizes;

  // For now, we'll treat it as a single buffer
  // In a real implementation, we'd need to know the plane layout for each pixel format
  data[0] = result.buffer;

  return {
    data,
    linesizes,
    size: result.size,
  };
}

/**
 * Compare timestamps.
 *
 * Compares two timestamps with different time bases.
 *
 * Direct mapping to av_compare_ts().
 *
 * @param tsA - First timestamp
 *
 * @param tbA - First time base
 *
 * @param tsB - Second timestamp
 *
 * @param tbB - Second time base
 *
 * @returns -1 if A < B, 0 if A == B, 1 if A > B
 *
 * @example
 * ```typescript
 * const cmp = avCompareTs(
 *   1000n, { num: 1, den: 1000 },  // 1 second
 *   900n, { num: 1, den: 900 }      // 1 second
 * );
 * // Returns 0 (equal)
 * ```
 *
 * @see [av_compare_ts](https://ffmpeg.org/doxygen/7.1/group__lavu__math.html#ga151744358fff630942b926e67e67c415) - FFmpeg Doxygen
 */
export function avCompareTs(tsA: bigint | number | null, tbA: IRational, tsB: bigint | number | null, tbB: IRational): number {
  return bindings.avCompareTs(tsA, tbA, tsB, tbB);
}

/**
 * Rescale timestamp.
 *
 * Rescales a timestamp from one time base to another.
 *
 * Direct mapping to av_rescale_q().
 *
 * @param a - Timestamp to rescale
 *
 * @param bq - Source time base
 *
 * @param cq - Destination time base
 *
 * @returns Rescaled timestamp
 *
 * @example
 * ```typescript
 * // Convert 1 second from 1000Hz to 90kHz
 * const rescaled = avRescaleQ(
 *   1000n,
 *   { num: 1, den: 1000 },   // 1000 Hz
 *   { num: 1, den: 90000 }   // 90 kHz
 * );
 * // Returns 90000n
 * ```
 *
 * @see [av_rescale_q](https://ffmpeg.org/doxygen/7.1/group__lavu__math.html#gaf02994a8bbeaa91d4757df179cbe567f) - FFmpeg Doxygen
 */
export function avRescaleQ(a: bigint | number | null, bq: IRational, cq: IRational): bigint {
  return bindings.avRescaleQ(a, bq, cq);
}

/**
 * Sleep for microseconds.
 *
 * Suspends execution for the specified number of microseconds.
 *
 * Direct mapping to av_usleep().
 *
 * @param usec - Microseconds to sleep
 *
 * @example
 * ```typescript
 * avUsleep(1000000); // Sleep for 1 second
 * avUsleep(16667);   // Sleep for ~16.67ms (60fps frame time)
 * ```
 *
 * @see [av_usleep](https://ffmpeg.org/doxygen/7.1/time_8c.html#a4eee9c65835652a808973f4bc1641a51) - FFmpeg Doxygen
 */
export function avUsleep(usec: number): void {
  bindings.avUsleep(usec);
}

/**
 * Rescale with rounding.
 *
 * Rescales a value with specified rounding behavior.
 *
 * Direct mapping to av_rescale_rnd().
 *
 * @param a - Value to rescale
 *
 * @param b - Multiplier
 *
 * @param c - Divisor
 *
 * @param rnd - Rounding mode (AV_ROUND_*)
 *
 * @returns Rescaled value
 *
 * @example
 * ```typescript
 * import { AV_ROUND_NEAR_INF } from 'node-av/constants';
 *
 * const rescaled = avRescaleRnd(1000n, 90000n, 1000n, AV_ROUND_NEAR_INF);
 * // Returns 90000n
 * ```
 *
 * @see [av_rescale_rnd](https://ffmpeg.org/doxygen/7.1/group__lavu__math.html#ga82d40664213508918093822461cc597e) - FFmpeg Doxygen
 */
export function avRescaleRnd(a: bigint | number, b: bigint | number, c: bigint | number, rnd: number): bigint {
  return bindings.avRescaleRnd(a, b, c, rnd);
}

/**
 * Rescale a timestamp while preserving accuracy with coarse input timebases.
 *
 * Used for audio streamcopy to maintain accuracy when input timebase is coarse.
 * Direct mapping to av_rescale_delta().
 *
 * @param inTb - Input timebase
 *
 * @param inTs - Input timestamp
 *
 * @param fsTb - Duration timebase (e.g., {1, sampleRate})
 *
 * @param duration - Duration in fsTb units
 *
 * @param lastRef - Reference object with `value` property (modified by function)
 *
 * @param lastRef.value - Last output timestamp (bigint)
 *
 * @param outTb - Output timebase
 *
 * @returns Rescaled timestamp
 *
 * @example
 * ```typescript
 * const inTb = { num: 1, den: 48000 };
 * const inTs = 1000000n;
 * const fsTb = { num: 1, den: 44100 };
 * const duration = 1024;
 * const lastRef = { value: 0n };
 * const outTb = { num: 1, den: 96000 };
 *
 * const rescaled = avRescaleDelta(inTb, inTs, fsTb, duration, lastRef, outTb);
 * ```
 *
 * @see [av_rescale_delta](https://ffmpeg.org/doxygen/7.1/group__lavu__math.html) - FFmpeg Doxygen
 */
export function avRescaleDelta(inTb: IRational, inTs: bigint | number, fsTb: IRational, duration: number, lastRef: { value: bigint }, outTb: IRational): bigint {
  return bindings.avRescaleDelta(inTb, inTs, fsTb, duration, lastRef, outTb);
}

/**
 * Multiply two rational numbers.
 *
 * Multiplies two rational numbers using FFmpeg's av_mul_q() which normalizes the result.
 * This is more accurate than manual multiplication as it reduces the fraction.
 *
 * Direct mapping to av_mul_q().
 *
 * @param a - First rational number
 *
 * @param b - Second rational number
 *
 * @returns Product of a and b as a normalized rational
 *
 * @example
 * ```typescript
 * // Multiply framerate by 2
 * const framerate = { num: 25, den: 1 };
 * const doubled = avMulQ(framerate, { num: 2, den: 1 });
 * // Returns { num: 50, den: 1 }
 *
 * // Calculate field rate for interlaced video
 * const fieldRate = avMulQ(framerate, { num: 2, den: 1 });
 * ```
 *
 * @see [av_mul_q](https://ffmpeg.org/doxygen/trunk/group__lavu__math__rational.html#ga89c0e84e30e2f90196e11fc254e4fc3f) - FFmpeg Doxygen
 */
export function avMulQ(a: IRational, b: IRational): IRational {
  return bindings.avMulQ(a, b);
}

/**
 * Invert a rational number.
 *
 * Returns the reciprocal of a rational number using FFmpeg's av_inv_q().
 * Swaps numerator and denominator: (a/b) becomes (b/a).
 *
 * Direct mapping to av_inv_q().
 *
 * @param q - Rational number to invert
 *
 * @returns Inverted rational (reciprocal)
 *
 * @example
 * ```typescript
 * // Convert framerate to frame duration
 * const framerate = { num: 25, den: 1 };  // 25 fps
 * const frameDuration = avInvQ(framerate); // 1/25 seconds
 * // Returns { num: 1, den: 25 }
 *
 * // Get timebase from framerate
 * const timebase = avInvQ({ num: 30000, den: 1001 }); // NTSC
 * // Returns { num: 1001, den: 30000 }
 * ```
 *
 * @see [av_inv_q](https://ffmpeg.org/doxygen/trunk/group__lavu__math__rational.html#ga587a784cb48299feea51d7dbbc6cc38c) - FFmpeg Doxygen
 */
export function avInvQ(q: IRational): IRational {
  return bindings.avInvQ(q);
}

/**
 * Add two rational numbers.
 *
 * Adds two rational numbers using FFmpeg's av_add_q() which normalizes the result.
 * This is more accurate than manual addition as it reduces the fraction.
 *
 * Direct mapping to av_add_q().
 *
 * @param a - First rational number
 *
 * @param b - Second rational number
 *
 * @returns Sum of a and b as a normalized rational
 *
 * @example
 * ```typescript
 * // Add two fractions
 * const a = { num: 1, den: 2 };  // 1/2
 * const b = { num: 1, den: 4 };  // 1/4
 * const sum = avAddQ(a, b);      // 3/4
 * // Returns { num: 3, den: 4 }
 *
 * // Add timestamps with different timebases
 * const ts1 = { num: 1000, den: 30000 };
 * const ts2 = { num: 500, den: 30000 };
 * const total = avAddQ(ts1, ts2);
 * // Returns { num: 1, den: 20 } (normalized from 1500/30000)
 * ```
 *
 * @see [av_add_q](https://ffmpeg.org/doxygen/trunk/group__lavu__math__rational.html#gac4af1feb227bd1095fc2cab42d933f52) - FFmpeg Doxygen
 */
export function avAddQ(a: IRational, b: IRational): IRational {
  return bindings.avAddQ(a, b);
}

/**
 * Calculate greatest common divisor.
 *
 * Computes the GCD of two integers using FFmpeg's av_gcd().
 * Uses the Euclidean algorithm for efficient computation.
 *
 * Direct mapping to av_gcd().
 *
 * @param a - First integer
 *
 * @param b - Second integer
 *
 * @returns Greatest common divisor of a and b
 *
 * @example
 * ```typescript
 * const gcd = avGcd(48000, 44100);
 * console.log(gcd); // 300
 *
 * // Used for calculating LCM
 * const lcm = (a * b) / avGcd(a, b);
 * ```
 *
 * @see [av_gcd](https://ffmpeg.org/doxygen/trunk/group__lavu__math.html#ga0e8419780352de538c1c15098cb1a587) - FFmpeg Doxygen
 */
export function avGcd(a: bigint | number, b: bigint | number): bigint {
  return bindings.avGcd(a, b);
}

/**
 * Rescale timestamp with specified rounding mode.
 *
 * Rescales a timestamp from one time base to another with specific rounding behavior.
 * More control than avRescaleQ() which uses default rounding.
 *
 * Direct mapping to av_rescale_q_rnd().
 *
 * @param a - Timestamp to rescale
 *
 * @param bq - Source time base
 *
 * @param cq - Destination time base
 *
 * @param rnd - Rounding mode (AV_ROUND_ZERO, AV_ROUND_INF, AV_ROUND_DOWN, AV_ROUND_UP, AV_ROUND_NEAR_INF)
 *
 * @returns Rescaled timestamp
 *
 * @example
 * ```typescript
 * import { AV_ROUND_UP, AV_ROUND_DOWN } from 'node-av/constants';
 *
 * const pts = 1000n;
 * const srcTb = { num: 1, den: 48000 };
 * const dstTb = { num: 1, den: 90000 };
 *
 * // Round up for safer comparisons
 * const ptsUp = avRescaleQRnd(pts, srcTb, dstTb, AV_ROUND_UP);
 *
 * // Round down for conservative timestamps
 * const ptsDown = avRescaleQRnd(pts, srcTb, dstTb, AV_ROUND_DOWN);
 * ```
 *
 * @see [av_rescale_q_rnd](https://ffmpeg.org/doxygen/trunk/group__lavu__math.html#ga60044a302e86b5c2d8b19a81c8179f30) - FFmpeg Doxygen
 */
export function avRescaleQRnd(a: bigint | number | null, bq: IRational, cq: IRational, rnd: number): bigint {
  return bindings.avRescaleQRnd(a, bq, cq, rnd);
}

/**
 * Get the duration of a single audio frame in samples.
 *
 * Returns the number of samples per audio frame for codecs with constant frame size,
 * or calculates it based on frame bytes for variable frame size codecs.
 *
 * Direct mapping to av_get_audio_frame_duration2().
 *
 * @param codecpar - Codec parameters
 *
 * @param frameBytes - Size of the frame in bytes
 *
 * @returns Number of samples in the frame, or 0 if unknown
 *
 * @example
 * ```typescript
 * const frameDuration = avGetAudioFrameDuration2(codecpar, frameBytes);
 * ```
 *
 * @see [av_get_audio_frame_duration2](https://ffmpeg.org/doxygen/7.1/group__lavc__misc.html) - FFmpeg Doxygen
 */
export function avGetAudioFrameDuration2(codecpar: NativeWrapper<NativeCodecParameters>, frameBytes: number): number {
  return bindings.avGetAudioFrameDuration2(codecpar.getNative(), frameBytes);
}

/**
 * Allocate audio samples buffer.
 *
 * Allocates buffers for audio samples with the specified format.
 *
 * Direct mapping to av_samples_alloc().
 *
 * @param nbChannels - Number of audio channels
 *
 * @param nbSamples - Number of samples per channel
 *
 * @param sampleFmt - Sample format
 *
 * @param align - Buffer alignment
 *
 * @returns Object with data buffers, line size, and total size
 *
 * @throws {FFmpegError} If allocation fails
 *
 * @example
 * ```typescript
 * import { AV_SAMPLE_FMT_FLTP } from 'node-av/constants';
 *
 * const { data, linesize, size } = avSamplesAlloc(
 *   2, 1024, AV_SAMPLE_FMT_FLTP, 0
 * );
 * console.log(`Allocated ${data.length} buffers, ${size} bytes total`);
 * ```
 *
 * @see [av_samples_alloc](https://ffmpeg.org/doxygen/7.1/group__lavu__sampmanip.html#ga4db4c77f928d32c7d8854732f50b8c04) - FFmpeg Doxygen
 * @see {@link avSamplesGetBufferSize} To calculate size without allocating
 */
export function avSamplesAlloc(
  nbChannels: number,
  nbSamples: number,
  sampleFmt: AVSampleFormat,
  align: number,
): {
  data: Buffer[];
  linesize: number;
  size: number;
} {
  const result = bindings.avSamplesAlloc(nbChannels, nbSamples, sampleFmt, align);
  if (typeof result === 'number') {
    throw new FFmpegError(result);
  }
  return result;
}

/**
 * Get audio samples buffer size.
 *
 * Calculates the required buffer size for audio samples.
 *
 * Direct mapping to av_samples_get_buffer_size().
 *
 * @param nbChannels - Number of channels
 *
 * @param nbSamples - Number of samples per channel
 *
 * @param sampleFmt - Sample format
 *
 * @param align - Buffer alignment
 *
 * @returns Object with size and line size
 *
 * @throws {FFmpegError} If parameters are invalid
 *
 * @example
 * ```typescript
 * import { AV_SAMPLE_FMT_S16 } from 'node-av/constants';
 *
 * const { size, linesize } = avSamplesGetBufferSize(
 *   2, 1024, AV_SAMPLE_FMT_S16, 0
 * );
 * console.log(`Need ${size} bytes, ${linesize} per channel`);
 * ```
 *
 * @see [av_samples_get_buffer_size](https://ffmpeg.org/doxygen/7.1/group__lavu__sampfmts.html#gaa7368bc4e3a366b688e81938ed55eb06) - FFmpeg Doxygen
 * @see {@link avSamplesAlloc} To allocate the buffer
 */
export function avSamplesGetBufferSize(
  nbChannels: number,
  nbSamples: number,
  sampleFmt: AVSampleFormat,
  align: number,
): {
  size: number;
  linesize: number;
} {
  const result = bindings.avSamplesGetBufferSize(nbChannels, nbSamples, sampleFmt, align);
  if (typeof result === 'number') {
    throw new FFmpegError(result);
  }
  return result;
}

/**
 * Image crop function.
 *
 * Crops an image region from source buffer to destination buffer.
 *
 * @param dstBuffer - Destination buffer (must be pre-allocated)
 *
 * @param srcBuffer - Source buffer containing the image
 *
 * @param pixFmt - Pixel format
 *
 * @param srcWidth - Source image width
 *
 * @param srcHeight - Source image height
 *
 * @param cropX - X coordinate of crop region (left)
 *
 * @param cropY - Y coordinate of crop region (top)
 *
 * @param cropWidth - Width of crop region
 *
 * @param cropHeight - Height of crop region
 *
 * @returns Number of bytes copied
 *
 * @example
 * ```typescript
 * import { AV_PIX_FMT_NV12 } from 'node-av/constants';
 *
 * const dstSize = avImageGetBufferSize(AV_PIX_FMT_NV12, 100, 100, 1);
 * const dstBuffer = Buffer.alloc(dstSize);
 *
 * const bytesCopied = avImageCrop(
 *   dstBuffer, srcBuffer,
 *   AV_PIX_FMT_NV12,
 *   320, 180,  // source dimensions
 *   10, 10,    // crop position
 *   100, 100   // crop size
 * );
 * ```
 */
export function avImageCrop(
  dstBuffer: Buffer,
  srcBuffer: Buffer,
  pixFmt: AVPixelFormat,
  srcWidth: number,
  srcHeight: number,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
): number {
  return bindings.avImageCrop(dstBuffer, srcBuffer, pixFmt, srcWidth, srcHeight, cropX, cropY, cropWidth, cropHeight);
}

/**
 * Describe channel layout.
 *
 * Returns a human-readable description of a channel layout.
 *
 * Direct mapping to av_channel_layout_describe().
 *
 * @param channelLayout - Channel layout to describe
 *
 * @returns Layout description string, or null
 *
 * @example
 * ```typescript
 * const stereo = { nbChannels: 2, order: 1, u: { mask: 3n } };
 * const desc = avChannelLayoutDescribe(stereo); // Returns "stereo"
 * ```
 *
 * @see [av_channel_layout_describe](https://ffmpeg.org/doxygen/7.1/group__lavu__audio__channels.html#gacc7d7d1a280248aafb8f9196c9d4e24f) - FFmpeg Doxygen
 */
export function avChannelLayoutDescribe(channelLayout: Partial<ChannelLayout>): string | null {
  return bindings.avChannelLayoutDescribe(channelLayout);
}

/**
 * Get the default channel layout for a given number of channels.
 *
 * Returns the canonical native layout FFmpeg uses for that channel count
 * (e.g. 1 → mono, 2 → stereo, 6 → 5.1). Useful to turn an unspecified layout
 * (order `AV_CHANNEL_ORDER_UNSPEC`, common for PCM) into a concrete one.
 *
 * Direct mapping to av_channel_layout_default().
 *
 * @param nbChannels - Number of channels
 *
 * @returns The default channel layout for that channel count
 *
 * @example
 * ```typescript
 * const stereo = avChannelLayoutDefault(2); // { order: 1, nbChannels: 2, mask: 3n }
 * ```
 *
 * @see [av_channel_layout_default](https://ffmpeg.org/doxygen/7.1/group__lavu__audio__channels.html) - FFmpeg Doxygen
 */
export function avChannelLayoutDefault(nbChannels: number): ChannelLayout {
  return bindings.avChannelLayoutDefault(nbChannels);
}

/**
 * Pick the best-matching pixel format from a list for a given source format.
 *
 * Chooses the format from `pixFmtList` that converting `srcPixFmt` to incurs the
 * least loss (color depth, chroma subsampling, alpha). Useful to select a
 * codec-supported target pixel format that preserves as much of the source as
 * possible (e.g. yuv422p over yuv420p when the input is yuv444p).
 *
 * Direct mapping to avcodec_find_best_pix_fmt_of_list().
 *
 * @param pixFmtList - Candidate pixel formats (e.g. a codec's supported formats)
 *
 * @param srcPixFmt - Source pixel format to convert from
 *
 * @returns The least-loss pixel format from the list
 *
 * @example
 * ```typescript
 * const target = avcodecFindBestPixFmtOfList(codec.pixelFormats, frame.format);
 * ```
 *
 * @see [avcodec_find_best_pix_fmt_of_list](https://ffmpeg.org/doxygen/7.1/group__lavc__misc__pixfmt.html) - FFmpeg Doxygen
 */
export function avcodecFindBestPixFmtOfList(pixFmtList: AVPixelFormat[], srcPixFmt: AVPixelFormat): AVPixelFormat {
  return bindings.avcodecFindBestPixFmtOfList(pixFmtList, srcPixFmt);
}

/**
 * Create SDP from format contexts.
 *
 * Creates an SDP (Session Description Protocol) string from format contexts.
 * Used for RTP/RTSP streaming.
 *
 * Direct mapping to av_sdp_create().
 *
 * @param contexts - Array of format contexts
 *
 * @returns SDP string, or null on error
 *
 * @example
 * ```typescript
 * const sdp = avSdpCreate([outputContext]);
 * if (sdp) {
 *   console.log('SDP:\n' + sdp);
 * }
 * ```
 *
 * @see [av_sdp_create](https://ffmpeg.org/doxygen/7.1/group__lavf__misc.html#gaa2a7353a6bb0c8726797abd56b176af0) - FFmpeg Doxygen
 */
export function avSdpCreate(contexts: FormatContext[]): string | null {
  if (!Array.isArray(contexts) || contexts.length === 0) {
    return null;
  }

  // Pass the native objects to the binding
  const nativeContexts = contexts
    .map((ctx) => {
      if (ctx && typeof ctx.getNative === 'function') {
        const nativeCtx = ctx.getNative();
        if (nativeCtx) {
          return nativeCtx;
        }
      }
    })
    .filter((ctx) => ctx !== undefined);

  // If no valid contexts after filtering, return null
  if (nativeContexts.length === 0) {
    return null;
  }

  return bindings.avSdpCreate(nativeContexts);
}

/**
 * Predict and update DTS timestamps for demuxed packets.
 *
 * This is a native implementation of FFmpeg's `ist_dts_update()`.
 * It predicts the next DTS based on codec type and stream metadata,
 * handling both audio (sample-based) and video (frame-rate-based) timing.
 *
 * @param packet - Native Packet
 *
 * @param stream - Native Stream
 *
 * @param state - Current DTS prediction state
 *
 * @returns Updated state with new DTS values
 *
 * @example
 * ```typescript
 * const newState = dtsPredict(packet, stream, {
 *   sawFirstTs: false,
 *   dts: AV_NOPTS_VALUE,
 *   nextDts: AV_NOPTS_VALUE,
 *   firstDts: AV_NOPTS_VALUE,
 * });
 * ```
 */
export function dtsPredict(packet: NativeWrapper<NativePacket>, stream: NativeWrapper<NativeStream>, state: DtsPredictState): DtsPredictState {
  return bindings.dtsPredict(packet.getNative(), stream.getNative(), state);
}

/**
 * Convert string to FourCC.
 *
 * Converts a 4-character string to a packed FourCC integer.
 *
 * @param str - 4-character string
 *
 * @returns Packed FourCC as unsigned 32-bit integer
 *
 * @example
 * ```typescript
 * const fourcc = stringToFourCC("avc1"); // Returns 828601953 / 0x31637661
 * ```
 */
export function stringToFourCC(str: string): number {
  return ((str.charCodeAt(0) << 0) | (str.charCodeAt(1) << 8) | (str.charCodeAt(2) << 16) | (str.charCodeAt(3) << 24)) >>> 0; // Convert to unsigned 32-bit
}
