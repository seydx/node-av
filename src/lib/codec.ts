import { AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX, AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX } from '../constants/constants.js';
import { bindings } from './binding.js';
import { Rational } from './rational.js';
import { avGetHardwareDeviceTypeFromName } from './utilities.js';

import type { AVCodecCap, AVCodecID, AVHWDeviceType, AVMediaType, AVPixelFormat, AVSampleFormat } from '../constants/constants.js';
import type { FFDecoderCodec } from '../constants/decoders.js';
import type { FFEncoderCodec } from '../constants/encoders.js';
import type { FFHWDeviceType } from '../constants/hardware.js';
import type { NativeCodec, NativeCodecOption, NativeWrapper } from './native-types.js';
import type { ChannelLayout } from './types.js';

/**
 * Codec profile definition
 */
export interface CodecProfile {
  /** Profile ID (FF_PROFILE_*) */
  profile: number;

  /** Human-readable profile name */
  name?: string;
}

/**
 * Codec descriptor for audio/video encoding and decoding.
 *
 * Represents an encoder or decoder implementation that can process media data.
 * Contains codec capabilities, supported formats, and hardware acceleration information.
 * Used to create codec contexts for actual encoding/decoding operations.
 * Supports both software and hardware-accelerated codecs.
 *
 * Direct mapping to FFmpeg's AVCodec.
 *
 * @example
 * ```typescript
 * import { Codec, FFmpegError } from 'node-av';
 * import { AV_CODEC_ID_H264, FF_ENCODER_LIBX264 } from 'node-av/constants';
 *
 * // Find decoder by ID
 * const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
 * if (!decoder) {
 *   throw new Error('H.264 decoder not available');
 * }
 *
 * // Find encoder by name
 * const encoder = Codec.findEncoderByName(FF_ENCODER_LIBX264);
 * if (!encoder) {
 *   throw new Error('libx264 encoder not available');
 * }
 *
 * // Check capabilities
 * console.log(`Codec: ${decoder.name}`);
 * console.log(`Type: ${decoder.type}`);
 * console.log(`Hardware: ${decoder.hasHardwareAcceleration()}`);
 *
 * // Get supported pixel formats
 * const formats = decoder.pixelFormats;
 * if (formats) {
 *   console.log(`Supported formats: ${formats.join(', ')}`);
 * }
 * ```
 *
 * @see [AVCodec](https://ffmpeg.org/doxygen/trunk/structAVCodec.html) - FFmpeg Doxygen
 * @see {@link CodecContext} For encoding/decoding operations
 */
export class Codec implements NativeWrapper<NativeCodec> {
  private native: NativeCodec;

  /**
   * @param native - The native codec instance
   *
   * @internal
   */
  constructor(native: NativeCodec) {
    this.native = native;
  }

  /**
   * Find a decoder by codec ID.
   *
   * Searches for a decoder that can decode the specified codec format.
   *
   * Direct mapping to avcodec_find_decoder().
   *
   * @param id - Codec ID to search for
   *
   * @returns Decoder if found, null otherwise
   *
   * @example
   * ```typescript
   * import { AV_CODEC_ID_H264, AV_CODEC_ID_AAC } from 'node-av/constants';
   *
   * // Find H.264 video decoder
   * const h264 = Codec.findDecoder(AV_CODEC_ID_H264);
   * if (h264) {
   *   console.log(`Found: ${h264.name}`);
   * }
   *
   * // Find AAC audio decoder
   * const aac = Codec.findDecoder(AV_CODEC_ID_AAC);
   * ```
   *
   * @see {@link findDecoderByName} To find by name
   * @see {@link findEncoder} To find encoders
   */
  static findDecoder(id: AVCodecID): Codec | null {
    const native = bindings.Codec.findDecoder(id);
    return native ? new Codec(native) : null;
  }

  /**
   * Find a decoder by name.
   *
   * Searches for a specific decoder implementation by name.
   * Useful when multiple decoders exist for the same codec.
   *
   * Direct mapping to avcodec_find_decoder_by_name().
   *
   * @param name - Decoder name
   *
   * @returns Decoder if found, null otherwise
   *
   * @example
   * ```typescript
   * import { FF_DECODER_H264, FF_DECODER_H264_CUVID } from 'node-av/constants';
   *
   * // Find specific H.264 decoder
   * const decoder = Codec.findDecoderByName(FF_DECODER_H264_CUVID);
   * if (decoder) {
   *   console.log('Found NVIDIA hardware decoder');
   * }
   *
   * // Find software decoder
   * const sw = Codec.findDecoderByName(FF_DECODER_H264);
   * ```
   *
   * @see {@link findDecoder} To find by codec ID
   */
  static findDecoderByName(name: FFDecoderCodec): Codec | null {
    const native = bindings.Codec.findDecoderByName(name);
    return native ? new Codec(native) : null;
  }

  /**
   * Find an encoder by codec ID.
   *
   * Searches for an encoder that can encode to the specified codec format.
   *
   * Direct mapping to avcodec_find_encoder().
   *
   * @param id - Codec ID to search for
   *
   * @returns Encoder if found, null otherwise
   *
   * @example
   * ```typescript
   * import { AV_CODEC_ID_H264, AV_CODEC_ID_AAC } from 'node-av/constants';
   *
   * // Find H.264 video encoder
   * const h264 = Codec.findEncoder(AV_CODEC_ID_H264);
   * if (h264) {
   *   console.log(`Found: ${h264.name}`);
   * }
   *
   * // Find AAC audio encoder
   * const aac = Codec.findEncoder(AV_CODEC_ID_AAC);
   * ```
   *
   * @see {@link findEncoderByName} To find by name
   * @see {@link findDecoder} To find decoders
   */
  static findEncoder(id: AVCodecID): Codec | null {
    const native = bindings.Codec.findEncoder(id);
    return native ? new Codec(native) : null;
  }

  /**
   * Find an encoder by name.
   *
   * Searches for a specific encoder implementation by name.
   * Useful when multiple encoders exist for the same codec.
   *
   * Direct mapping to avcodec_find_encoder_by_name().
   *
   * @param name - Encoder name
   *
   * @returns Encoder if found, null otherwise
   *
   * @example
   * ```typescript
   * import { FF_ENCODER_H264_NVENC, FF_ENCODER_LIBX264 } from 'node-av/constants';
   *
   * // Find specific H.264 encoder
   * const x264 = Codec.findEncoderByName(FF_ENCODER_LIBX264);
   * if (x264) {
   *   console.log('Found x264 encoder');
   * }
   *
   * // Find hardware encoder
   * const nvenc = Codec.findEncoderByName(FF_ENCODER_H264_NVENC);
   * ```
   *
   * @see {@link findEncoder} To find by codec ID
   */
  static findEncoderByName(name: FFEncoderCodec): Codec | null {
    const native = bindings.Codec.findEncoderByName(name);
    return native ? new Codec(native) : null;
  }

  /**
   * Get list of all available codecs.
   *
   * Returns all registered codecs (both encoders and decoders).
   *
   * @returns Array of all available codecs
   *
   * @example
   * ```typescript
   * // List all codecs
   * const codecs = Codec.getCodecList();
   * console.log(`Total codecs: ${codecs.length}`);
   *
   * // Filter encoders
   * const encoders = codecs.filter(c => c.isEncoder());
   * console.log(`Encoders: ${encoders.length}`);
   *
   * // Filter hardware codecs
   * const hw = codecs.filter(c => c.hasHardwareAcceleration());
   * console.log(`Hardware codecs: ${hw.length}`);
   * ```
   *
   * @see {@link iterateCodecs} For memory-efficient iteration
   */
  static getCodecList(): Codec[] {
    const natives = bindings.Codec.getCodecList();
    return natives.map((n: NativeCodec) => new Codec(n));
  }

  /**
   * Iterate through available codecs.
   *
   * Memory-efficient way to iterate through all codecs.
   * Uses an opaque pointer to track iteration state.
   *
   * Direct mapping to av_codec_iterate().
   *
   * @param opaque - Iteration state (null to start)
   *
   * @returns Next codec and state, or null when done
   *
   * @example
   * ```typescript
   * // Iterate all codecs
   * let iter = null;
   * let result;
   * while ((result = Codec.iterateCodecs(iter))) {
   *   console.log(`Codec: ${result.codec.name}`);
   *   iter = result.opaque;
   * }
   * ```
   *
   * @see {@link getCodecList} For simple array access
   */
  static iterateCodecs(opaque: bigint | null = null): { codec: Codec; opaque: bigint } | null {
    const result = bindings.Codec.iterateCodecs(opaque);
    if (!result) return null;

    return {
      codec: new Codec(result.codec),
      opaque: result.opaque,
    };
  }

  /**
   * Codec name.
   *
   * Short name identifier for the codec (e.g., 'h264', 'aac').
   *
   * Direct mapping to AVCodec->name.
   */
  get name(): string | null {
    return this.native.name;
  }

  /**
   * Codec long name.
   *
   * Human-readable description of the codec.
   *
   * Direct mapping to AVCodec->long_name.
   */
  get longName(): string | null {
    return this.native.longName;
  }

  /**
   * Media type.
   *
   * Type of media this codec processes (video, audio, subtitle, etc.).
   *
   * Direct mapping to AVCodec->type.
   */
  get type(): AVMediaType {
    return this.native.type;
  }

  /**
   * Codec ID.
   *
   * Unique identifier for the codec format.
   *
   * Direct mapping to AVCodec->id.
   */
  get id(): AVCodecID {
    return this.native.id;
  }

  /**
   * Codec capabilities.
   *
   * Bitfield of AV_CODEC_CAP_* flags indicating codec features.
   *
   * Direct mapping to AVCodec->capabilities.
   */
  get capabilities(): AVCodecCap {
    return this.native.capabilities;
  }

  /**
   * Check if codec has specific capabilities.
   *
   * Tests whether all specified capabilities are present using bitwise AND.
   *
   * @param caps - One or more capability values to check
   *
   * @returns true if all specified capabilities are present, false otherwise
   *
   * @example
   * ```typescript
   * import { AV_CODEC_CAP_HARDWARE } from 'node-av/constants';
   *
   * if (codec.hasCapabilities(AV_CODEC_CAP_HARDWARE)) {
   *   console.log('This codec supports hardware acceleration');
   * }
   * ```
   *
   * @see {@link capabilities} For direct capabilities access
   */
  hasCapabilities(...caps: AVCodecCap[]): boolean {
    for (const cap of caps) {
      if ((this.native.capabilities & cap) !== cap) {
        return false;
      }
    }
    return true;
  }

  /**
   * Maximum lowres value.
   *
   * Maximum value for lowres decoding (0 = no lowres support).
   *
   * Direct mapping to AVCodec->max_lowres.
   */
  get maxLowres(): number {
    return this.native.maxLowres;
  }

  /**
   * Supported profiles.
   *
   * Array of profiles this codec can handle (e.g., baseline, main, high).
   *
   * Direct mapping to AVCodec->profiles.
   */
  get profiles(): CodecProfile[] | null {
    return this.native.profiles;
  }

  /**
   * Wrapper name.
   *
   * Name of the codec wrapper, if this is a wrapper codec.
   *
   * Direct mapping to AVCodec->wrapper_name.
   */
  get wrapper(): string | null {
    return this.native.wrapper;
  }

  /**
   * Supported frame rates.
   *
   * Array of frame rates this video codec supports.
   * Null for audio codecs or if all rates are supported.
   *
   * Direct mapping to AVCodec->supported_framerates.
   */
  get supportedFramerates(): Rational[] | null {
    const rates = this.native.supportedFramerates;
    if (!rates) return null;
    return rates.map((r) => new Rational(r.num, r.den));
  }

  /**
   * Supported pixel formats.
   *
   * Array of pixel formats this video codec supports.
   * Null for audio codecs.
   *
   * Direct mapping to AVCodec->pix_fmts.
   */
  get pixelFormats(): AVPixelFormat[] | null {
    return this.native.pixelFormats;
  }

  /**
   * Supported sample rates.
   *
   * Array of sample rates this audio codec supports.
   * Null for video codecs or if all rates are supported.
   *
   * Direct mapping to AVCodec->supported_samplerates.
   */
  get supportedSamplerates(): number[] | null {
    return this.native.supportedSamplerates;
  }

  /**
   * Supported sample formats.
   *
   * Array of sample formats this audio codec supports.
   * Null for video codecs.
   *
   * Direct mapping to AVCodec->sample_fmts.
   */
  get sampleFormats(): AVSampleFormat[] | null {
    return this.native.sampleFormats;
  }

  /**
   * Supported channel layouts.
   *
   * Array of channel layouts this audio codec supports.
   * Null for video codecs.
   *
   * Direct mapping to AVCodec->ch_layouts.
   */
  get channelLayouts(): ChannelLayout[] | null {
    return this.native.channelLayouts;
  }

  /**
   * Check if codec is an encoder.
   *
   * @returns True if this codec can encode
   *
   * @example
   * ```typescript
   * const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264);
   * if (codec?.isEncoder()) {
   *   console.log('This is an encoder');
   * }
   * ```
   *
   * @see {@link isDecoder} To check for decoders
   */
  isEncoder(): boolean {
    return this.native.isEncoder();
  }

  /**
   * Check if codec is a decoder.
   *
   * @returns True if this codec can decode
   *
   * @example
   * ```typescript
   * const codec = Codec.findDecoder(AV_CODEC_ID_H264);
   * if (codec?.isDecoder()) {
   *   console.log('This is a decoder');
   * }
   * ```
   *
   * @see {@link isEncoder} To check for encoders
   */
  isDecoder(): boolean {
    return this.native.isDecoder();
  }

  /**
   * Check if codec is experimental.
   *
   * Experimental codecs require explicit opt-in to use.
   *
   * @returns True if codec is marked experimental
   *
   * @example
   * ```typescript
   * if (codec.isExperimental()) {
   *   console.warn('This codec is experimental');
   *   // Need to set strict_std_compliance = -2
   * }
   * ```
   */
  isExperimental(): boolean {
    return this.native.isExperimental();
  }

  /**
   * Check if codec supports hardware acceleration.
   *
   * Checks if the codec has any hardware configuration.
   *
   * @returns True if hardware acceleration is available
   *
   * @example
   * ```typescript
   * import { FF_DECODER_H264_CUVID } from 'node-av/constants';
   *
   * const codec = Codec.findDecoderByName(FF_DECODER_H264_CUVID);
   * if (codec?.hasHardwareAcceleration()) {
   *   console.log('Hardware acceleration available');
   * }
   * ```
   *
   * @see {@link getSupportedDeviceTypes} For specific device types
   */
  hasHardwareAcceleration(): boolean {
    // A codec is considered hardware if it has any hw_config with:
    // - HW_DEVICE_CTX support (decoders typically use this)
    // - HW_FRAMES_CTX support (encoders typically use this)
    for (let i = 0; ; i++) {
      const config = this.getHwConfig(i);
      if (!config) break;

      // Check for either HW_DEVICE_CTX or HW_FRAMES_CTX
      if ((config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX) !== 0 || (config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX) !== 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if codec supports specific device type.
   *
   * @param deviceType - Hardware device type to check
   *
   * @returns True if device type is supported
   *
   * @example
   * ```typescript
   * import { AV_HWDEVICE_TYPE_CUDA } from 'node-av/constants';
   *
   * if (codec.supportsDevice(AV_HWDEVICE_TYPE_CUDA)) {
   *   console.log('Supports NVIDIA CUDA');
   * }
   * ```
   *
   * @see {@link getSupportedDeviceTypes} For all supported types
   */
  supportsDevice(deviceType: AVHWDeviceType | FFHWDeviceType): boolean {
    for (let i = 0; ; i++) {
      const config = this.getHwConfig(i);
      if (!config) break;

      if (typeof deviceType === 'string') {
        deviceType = avGetHardwareDeviceTypeFromName(deviceType);
      }

      // Check if this config is for the requested device type
      if (config.deviceType === deviceType) {
        // Check if it has any valid hardware method
        if ((config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX) !== 0 || (config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX) !== 0) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if decoder supports hardware acceleration.
   *
   * @param deviceType - Optional specific device type
   *
   * @returns True if hardware decoding is supported
   *
   * @example
   * ```typescript
   * import { AV_HWDEVICE_TYPE_VIDEOTOOLBOX } from 'node-av/constants';
   *
   * // Check any hardware support
   * if (codec.isHardwareAcceleratedDecoder()) {
   *   console.log('Hardware decoding available');
   * }
   *
   * // Check specific device
   * if (codec.isHardwareAcceleratedDecoder(AV_HWDEVICE_TYPE_VIDEOTOOLBOX)) {
   *   console.log('VideoToolbox decoding available');
   * }
   * ```
   */
  isHardwareAcceleratedDecoder(deviceType?: AVHWDeviceType | FFHWDeviceType): boolean {
    if (!this.isDecoder()) return false;

    if (deviceType !== undefined) {
      return this.supportsDevice(deviceType);
    }

    return this.hasHardwareAcceleration();
  }

  /**
   * Check if encoder supports hardware acceleration.
   *
   * @param deviceType - Optional specific device type
   *
   * @returns True if hardware encoding is supported
   *
   * @example
   * ```typescript
   * import { AV_HWDEVICE_TYPE_VAAPI } from 'node-av/constants';
   *
   * // Check any hardware support
   * if (codec.isHardwareAcceleratedEncoder()) {
   *   console.log('Hardware encoding available');
   * }
   *
   * // Check specific device
   * if (codec.isHardwareAcceleratedEncoder(AV_HWDEVICE_TYPE_VAAPI)) {
   *   console.log('VAAPI encoding available');
   * }
   * ```
   */
  isHardwareAcceleratedEncoder(deviceType?: AVHWDeviceType | FFHWDeviceType): boolean {
    if (!this.isEncoder()) return false;

    if (deviceType !== undefined) {
      return this.supportsDevice(deviceType);
    }

    return this.hasHardwareAcceleration();
  }

  /**
   * Get supported hardware device types.
   *
   * Returns all hardware acceleration types this codec supports.
   *
   * @returns Array of supported device types
   *
   * @example
   * ```typescript
   * const devices = codec.getSupportedDeviceTypes();
   * console.log('Supported devices:', devices.map(d => {
   *   switch(d) {
   *     case AV_HWDEVICE_TYPE_CUDA: return 'CUDA';
   *     case AV_HWDEVICE_TYPE_VAAPI: return 'VAAPI';
   *     default: return 'Unknown';
   *   }
   * }));
   * ```
   *
   * @see {@link supportsDevice} To check specific device
   */
  getSupportedDeviceTypes(): AVHWDeviceType[] {
    const deviceTypes = new Set<AVHWDeviceType>();

    for (let i = 0; ; i++) {
      const config = this.getHwConfig(i);
      if (!config) break;

      // Only add if it has valid hw methods
      if ((config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX) !== 0 || (config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX) !== 0) {
        deviceTypes.add(config.deviceType);
      }
    }

    return Array.from(deviceTypes);
  }

  /**
   * Get hardware method flags for device type.
   *
   * Returns the hardware configuration methods for a specific device.
   *
   * @param deviceType - Device type to query
   *
   * @returns Method flags, or null if not supported
   *
   * @example
   * ```typescript
   * import { AV_HWDEVICE_TYPE_CUDA } from 'node-av/constants';
   *
   * const methods = codec.getHardwareMethod(AV_HWDEVICE_TYPE_CUDA);
   * if (methods) {
   *   if (methods & AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX) {
   *     console.log('Supports device context');
   *   }
   * }
   * ```
   */
  getHardwareMethod(deviceType: AVHWDeviceType | FFHWDeviceType): number | null {
    for (let i = 0; ; i++) {
      const config = this.getHwConfig(i);
      if (!config) break;

      if (typeof deviceType === 'string') {
        deviceType = avGetHardwareDeviceTypeFromName(deviceType);
      }

      if (config.deviceType === deviceType) {
        return config.methods;
      }
    }

    return null;
  }

  /**
   * Get hardware configuration at index.
   *
   * Retrieves hardware acceleration configuration details.
   *
   * Direct mapping to avcodec_get_hw_config().
   *
   * @param index - Configuration index
   *
   * @returns Hardware configuration, or null if index out of range
   *
   * @example
   * ```typescript
   * // Enumerate all hardware configs
   * for (let i = 0; ; i++) {
   *   const config = codec.getHwConfig(i);
   *   if (!config) break;
   *
   *   console.log(`Config ${i}:`);
   *   console.log(`  Pixel format: ${config.pixFmt}`);
   *   console.log(`  Device type: ${config.deviceType}`);
   *   console.log(`  Methods: 0x${config.methods.toString(16)}`);
   * }
   * ```
   */
  getHwConfig(index: number): {
    pixFmt: AVPixelFormat;
    methods: number;
    deviceType: AVHWDeviceType;
  } | null {
    return this.native.getHwConfig(index);
  }

  /**
   * Enumerate the codec's private options.
   *
   * Returns the codec-specific tunables exposed by the codec's private
   * `AVClass` (e.g. libx264's `preset`, `crf`, `tune`). These are the options
   * accepted via the `options` dictionary when creating an encoder/decoder, and
   * are distinct from the generic `AVCodecContext` fields (bitrate, gop_size, ...).
   *
   * Options of type `AV_OPT_TYPE_CONST` are the named values belonging to a
   * parent option's `unit` (i.e. enum members). Returns an empty array when the
   * codec has no private options.
   *
   * Direct mapping to iterating `codec->priv_class` via av_opt_next().
   *
   * @returns Array of private option descriptors
   *
   * @example
   * ```typescript
   * const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264);
   * for (const opt of codec?.getOptions() ?? []) {
   *   console.log(opt.name, opt.type, opt.unit);
   * }
   * ```
   */
  getOptions(): NativeCodecOption[] {
    return this.native.getOptions();
  }

  /**
   * Get the underlying native Codec object.
   *
   * @returns The native Codec binding object
   *
   * @internal
   */
  getNative(): NativeCodec {
    return this.native;
  }

  /**
   * Create codec from native instance.
   *
   * @param native - Native codec instance
   *
   * @returns Codec wrapper or null
   *
   * @internal
   */
  static fromNative(native: NativeCodec | null): Codec | null {
    if (!native) return null;
    return new Codec(native);
  }
}
