import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX,
  AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX,
  AV_CODEC_ID_AV1,
  AV_CODEC_ID_H263,
  AV_CODEC_ID_H264,
  AV_CODEC_ID_HEVC,
  AV_CODEC_ID_MJPEG,
  AV_CODEC_ID_MPEG2VIDEO,
  AV_CODEC_ID_MPEG4,
  AV_CODEC_ID_PRORES,
  AV_CODEC_ID_VP8,
  AV_CODEC_ID_VP9,
  AV_HWDEVICE_TYPE_CUDA,
  AV_HWDEVICE_TYPE_D3D11VA,
  AV_HWDEVICE_TYPE_D3D12VA,
  AV_HWDEVICE_TYPE_DRM,
  AV_HWDEVICE_TYPE_DXVA2,
  AV_HWDEVICE_TYPE_MEDIACODEC,
  AV_HWDEVICE_TYPE_NONE,
  AV_HWDEVICE_TYPE_OPENCL,
  AV_HWDEVICE_TYPE_QSV,
  AV_HWDEVICE_TYPE_RKMPP,
  AV_HWDEVICE_TYPE_VAAPI,
  AV_HWDEVICE_TYPE_VDPAU,
  AV_HWDEVICE_TYPE_VIDEOTOOLBOX,
  AV_HWDEVICE_TYPE_VULKAN,
  AV_PIX_FMT_CUDA,
  AV_PIX_FMT_D3D11,
  AV_PIX_FMT_D3D12,
  AV_PIX_FMT_DRM_PRIME,
  AV_PIX_FMT_DXVA2_VLD,
  AV_PIX_FMT_MEDIACODEC,
  AV_PIX_FMT_NV12,
  AV_PIX_FMT_OPENCL,
  AV_PIX_FMT_QSV,
  AV_PIX_FMT_VAAPI,
  AV_PIX_FMT_VIDEOTOOLBOX,
  AV_PIX_FMT_VULKAN,
} from '../constants/constants.js';
import { Codec } from '../lib/codec.js';
import { Dictionary } from '../lib/dictionary.js';
import { FFmpegError } from '../lib/error.js';
import { HardwareDeviceContext } from '../lib/hardware-device-context.js';
import { Stream } from '../lib/stream.js';
import { avGetHardwareDeviceTypeFromName } from '../lib/utilities.js';
import { Decoder } from './decoder.js';
import { Demuxer } from './demuxer.js';
import { Encoder } from './encoder.js';

import type { AVCodecID, AVHWDeviceType, AVPixelFormat, FFDecoderCodec, FFEncoderCodec, FFHWDeviceType } from '../constants/index.js';
import type { Packet } from '../lib/packet.js';
import type { BaseCodecName, HardwareOptions } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const h264Data = join(__dirname, 'data', 'test_h264.h264');
const hevcData = join(__dirname, 'data', 'test_hevc.h265');
const vp8Data = join(__dirname, 'data', 'test_vp8.ivf');
const vp9Data = join(__dirname, 'data', 'test_vp9.ivf');
const av1Data = join(__dirname, 'data', 'test_av1.ivf');
const mjpegData = join(__dirname, 'data', 'test_mjpeg.mjpeg');

/**
 * High-level hardware acceleration management.
 *
 * Provides automatic detection and configuration of hardware acceleration for media processing.
 * Manages device contexts for GPU-accelerated encoding and decoding operations.
 * Supports various hardware types including VideoToolbox, CUDA, VAAPI, D3D11VA, and more.
 * Essential for high-performance video processing with reduced CPU usage.
 *
 * @example
 * ```typescript
 * import { HardwareContext } from 'node-av/api';
 * import { AV_HWDEVICE_TYPE_CUDA } from 'node-av/constants';
 *
 * // Auto-detect best available hardware
 * const hw = HardwareContext.auto();
 * if (hw) {
 *   console.log(`Using hardware: ${hw.deviceTypeName}`);
 *   const decoder = await Decoder.create(stream, { hardware: hw });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Use specific hardware type
 * const hw = HardwareContext.create(AV_HWDEVICE_TYPE_CUDA);
 * const encoderCodec = hw?.getEncoderCodec('h264') ?? FF_ENCODER_LIBX264;
 * const encoder = await Encoder.create(encoderCodec, { ... });
 * hw.dispose();
 * ```
 *
 * @see {@link Decoder} For hardware-accelerated decoding
 * @see {@link Encoder} For hardware-accelerated encoding
 */
export class HardwareContext implements Disposable {
  private _deviceContext: HardwareDeviceContext;
  private _deviceType: AVHWDeviceType;
  private _deviceTypeName: FFHWDeviceType;
  private _devicePixelFormat: AVPixelFormat;
  private _isDisposed = false;

  /**
   * @param deviceContext - Initialized hardware device context
   *
   * @param deviceType - Hardware device type enum
   *
   * @param deviceTypeName - Human-readable device type name
   *
   * @internal
   */
  private constructor(deviceContext: HardwareDeviceContext, deviceType: AVHWDeviceType, deviceTypeName: FFHWDeviceType) {
    this._deviceContext = deviceContext;
    this._deviceType = deviceType;
    this._deviceTypeName = deviceTypeName;
    this._devicePixelFormat = this.getHardwareDecoderPixelFormat();
  }

  /**
   * Auto-detect and create the best available hardware context.
   *
   * Tries hardware types in order of preference based on platform.
   * Returns null if no hardware acceleration is available.
   * Platform-specific preference order ensures optimal performance.
   *
   * @param options - Optional hardware configuration
   *
   * @returns Hardware context or null if unavailable
   *
   * @example
   * ```typescript
   * const hw = HardwareContext.auto();
   * if (hw) {
   *   console.log(`Auto-detected: ${hw.deviceTypeName}`);
   *   // Use for decoder/encoder
   * }
   * ```
   *
   * @example
   * ```typescript
   * // With specific device
   * const hw = HardwareContext.auto({
   *   deviceName: '/dev/dri/renderD128'
   * });
   * ```
   *
   * @see {@link create} For specific hardware type
   * @see {@link listAvailable} To check available types
   */
  static auto(options: HardwareOptions = {}): HardwareContext | null {
    // Platform-specific preference order
    const preferenceOrder = this.getPreferenceOrder();

    for (const deviceType of preferenceOrder) {
      try {
        if (deviceType === AV_HWDEVICE_TYPE_VAAPI && !options.device) {
          options.device = '/dev/dri/renderD128'; // Default VAAPI render node
        }

        let hwCtx: HardwareContext | null = this.createFromType(deviceType, options.device, options.options);

        const isSupported = hwCtx.testDecoder();
        if (!isSupported) {
          hwCtx.dispose();
          hwCtx = null;
          continue;
        }

        return hwCtx;
      } catch {
        // Try next device type
        continue;
      }
    }

    return null;
  }

  /**
   * Create a hardware context for a specific device type.
   *
   * Creates and initializes a hardware device context.
   * Throws if the device type is not supported or initialization fails.
   *
   * Direct mapping to av_hwdevice_ctx_create().
   *
   * @param deviceType - Hardware device type from AVHWDeviceType
   *
   * @param device - Optional device specifier (e.g., GPU index, device path)
   *
   * @param options - Optional device initialization options
   *
   * @returns Initialized hardware context or null if HardwareContext could not be created
   *
   * @example
   * ```typescript
   * import { AV_HWDEVICE_TYPE_CUDA } from 'node-av/constants';
   *
   * // CUDA with specific GPU
   * const cuda = HardwareContext.create(AV_HWDEVICE_TYPE_CUDA, '0');
   * ```
   *
   * @example
   * ```typescript
   * import { AV_HWDEVICE_TYPE_VAAPI } from 'node-av/constants';
   *
   * // VAAPI with render device
   * const vaapi = HardwareContext.create(
   *   AV_HWDEVICE_TYPE_VAAPI,
   *   '/dev/dri/renderD128'
   * );
   * ```
   *
   * @see {@link auto} For automatic detection
   * @see {@link HardwareDeviceContext} For low-level API
   */
  static create(deviceType: AVHWDeviceType | FFHWDeviceType, device?: string, options?: Record<string, string>): HardwareContext | null {
    if (typeof deviceType === 'string') {
      deviceType = avGetHardwareDeviceTypeFromName(deviceType);
    }

    if (deviceType === AV_HWDEVICE_TYPE_NONE) {
      return null;
    }

    let hw: HardwareContext;

    try {
      hw = this.createFromType(deviceType, device, options);
    } catch {
      return null;
    }

    return hw;
  }

  /**
   * Create a derived hardware device context.
   *
   * Creates a new hardware context derived from an existing one.
   * Allows creating contexts on different device types that can share
   * memory or resources with the source device. Useful for cross-device
   * pipelines (e.g., VAAPI → OpenCL, CUDA → Vulkan).
   *
   * Direct mapping to av_hwdevice_ctx_create_derived().
   *
   * @param source - Source hardware context to derive from
   *
   * @param targetType - Target device type to create
   *
   * @returns New hardware context or null if derivation fails
   *
   * @example
   * ```typescript
   * import { AV_HWDEVICE_TYPE_VAAPI, AV_HWDEVICE_TYPE_OPENCL } from 'node-av/constants';
   *
   * // Create VAAPI device for decoding
   * const vaapi = HardwareContext.create(AV_HWDEVICE_TYPE_VAAPI);
   *
   * // Derive OpenCL device for filtering (shares memory with VAAPI)
   * const opencl = HardwareContext.derive(vaapi, AV_HWDEVICE_TYPE_OPENCL);
   *
   * if (opencl) {
   *   // Decode with VAAPI
   *   const decoder = await Decoder.create(stream, { hardware: vaapi });
   *
   *   // Filter with OpenCL (overrides frame's VAAPI context)
   *   const filter = FilterAPI.create('program_opencl=...', { hardware: opencl });
   *
   *   for await (const frame of decoder.frames()) {
   *     // frame has VAAPI context, but filter uses OpenCL
   *     const filtered = await filter.apply(frame);
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // CUDA → Vulkan derivation
   * const cuda = HardwareContext.create(AV_HWDEVICE_TYPE_CUDA);
   * const vulkan = HardwareContext.derive(cuda, AV_HWDEVICE_TYPE_VULKAN);
   * ```
   *
   * @see {@link create} For creating independent device
   */
  static derive(source: HardwareContext, targetType: AVHWDeviceType | FFHWDeviceType): HardwareContext | null {
    if (!source || source.isDisposed) {
      return null;
    }

    if (typeof targetType === 'string') {
      targetType = avGetHardwareDeviceTypeFromName(targetType);
    }

    if (targetType === AV_HWDEVICE_TYPE_NONE) {
      return null;
    }

    try {
      const derivedDeviceCtx = new HardwareDeviceContext();
      const ret = derivedDeviceCtx.createDerived(source.deviceContext, targetType);
      if (FFmpegError.isFFmpegError(ret)) {
        derivedDeviceCtx.free();
        return null;
      }

      const deviceTypeName = HardwareDeviceContext.getTypeName(targetType);
      if (!deviceTypeName) {
        derivedDeviceCtx.free();
        return null;
      }

      return new HardwareContext(derivedDeviceCtx, targetType, deviceTypeName);
    } catch {
      return null;
    }
  }

  /**
   * List all available hardware device types.
   *
   * Enumerates all hardware types supported by the FFmpeg build.
   * Useful for checking hardware capabilities at runtime.
   *
   * Direct mapping to av_hwdevice_iterate_types().
   *
   * @returns Array of available device type names
   *
   * @example
   * ```typescript
   * const available = HardwareContext.listAvailable();
   * console.log('Available hardware:', available.join(', '));
   * // Output: "cuda, vaapi, videotoolbox"
   * ```
   *
   * @see {@link auto} For automatic selection
   */
  static listAvailable(): string[] {
    const types = HardwareDeviceContext.iterateTypes();
    const available: string[] = [];

    for (const type of types) {
      const name = HardwareDeviceContext.getTypeName(type);
      if (name) {
        available.push(name);
      }
    }

    return available;
  }

  /**
   * Get the hardware device context.
   *
   * Used internally by encoders and decoders for hardware acceleration.
   * Can be assigned to CodecContext.hwDeviceCtx.
   *
   * @example
   * ```typescript
   * codecContext.hwDeviceCtx = hw.deviceContext;
   * ```
   */
  get deviceContext(): HardwareDeviceContext {
    return this._deviceContext;
  }

  /**
   * Get the device type enum value.
   *
   * @example
   * ```typescript
   * if (hw.deviceType === AV_HWDEVICE_TYPE_CUDA) {
   *   console.log('Using NVIDIA GPU');
   * }
   * ```
   */
  get deviceType(): AVHWDeviceType {
    return this._deviceType;
  }

  /**
   * Get the hardware device type name.
   *
   * Human-readable device type string.
   *
   * @example
   * ```typescript
   * console.log(`Hardware type: ${hw.deviceTypeName}`);
   * // Output: "cuda" or "videotoolbox" etc.
   * ```
   */
  get deviceTypeName(): FFHWDeviceType {
    return this._deviceTypeName;
  }

  /**
   * Get the device pixel format.
   *
   * Hardware-specific pixel format for frame allocation.
   *
   * @example
   * ```typescript
   * frame.format = hw.devicePixelFormat;
   * ```
   */
  get devicePixelFormat(): AVPixelFormat {
    return this._devicePixelFormat;
  }

  /**
   * Check if this hardware context has been disposed.
   *
   * @example
   * ```typescript
   * if (!hw.isDisposed) {
   *   hw.dispose();
   * }
   * ```
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Get hardware frame constraints.
   *
   * Returns the resolution limits and supported pixel formats for this hardware device.
   * Essential for validating encoder/decoder parameters before initialization.
   *
   * Direct mapping to av_hwdevice_get_hwframe_constraints().
   *
   * @param hwconfig - Optional hardware configuration pointer
   *
   * @returns Constraints object with resolution limits and formats, or null if not available
   *
   * @example
   * ```typescript
   * const hw = HardwareContext.auto();
   * if (hw) {
   *   const constraints = hw.getFrameConstraints();
   *   if (constraints) {
   *     console.log(`Resolution: ${constraints.minWidth}x${constraints.minHeight} to ${constraints.maxWidth}x${constraints.maxHeight}`);
   *     console.log('Hardware formats:', constraints.validHwFormats);
   *     console.log('Software formats:', constraints.validSwFormats);
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * import { AV_HWDEVICE_TYPE_VIDEOTOOLBOX } from 'node-av/constants';
   *
   * // VideoToolbox has resolution limits
   * const hw = HardwareContext.create(AV_HWDEVICE_TYPE_VIDEOTOOLBOX);
   * const constraints = hw?.getFrameConstraints();
   * if (constraints && (width > constraints.maxWidth || height > constraints.maxHeight)) {
   *   console.log('Resolution exceeds hardware limits, falling back to software encoder');
   * }
   * ```
   *
   * @see {@link HardwareDeviceContext.getHwframeConstraints} For low-level API
   */
  getFrameConstraints(hwconfig?: bigint): {
    validHwFormats?: number[];
    validSwFormats?: number[];
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
  } | null {
    if (this._isDisposed) {
      return null;
    }

    return this._deviceContext.getHwframeConstraints(hwconfig);
  }

  /**
   * Check if this hardware type supports a specific codec.
   *
   * Queries FFmpeg's codec configurations to verify hardware support.
   * Checks both decoder and encoder support based on parameters.
   *
   * Direct mapping to avcodec_get_hw_config().
   *
   * @param codecId - Codec ID from AVCodecID enum
   *
   * @param isEncoder - Check for encoder support (default: decoder)
   *
   * @returns true if codec is supported
   *
   * @example
   * ```typescript
   * import { AV_CODEC_ID_H264 } from 'node-av/constants';
   *
   * if (hw.supportsCodec(AV_CODEC_ID_H264, true)) {
   *   // Can use hardware H.264 encoder
   * }
   * ```
   *
   * @see {@link findSupportedCodecs} For all supported codecs
   */
  supportsCodec(codecId: AVCodecID, isEncoder = false): boolean {
    // Try to find the codec
    const codec = isEncoder ? Codec.findEncoder(codecId) : Codec.findDecoder(codecId);
    if (!codec) {
      return false;
    }

    if (isEncoder) {
      return codec.isHardwareAcceleratedEncoder(this._deviceType);
    } else {
      return codec.isHardwareAcceleratedDecoder(this._deviceType);
    }
  }

  /**
   * Check if this hardware supports a specific pixel format for a codec.
   *
   * Verifies pixel format compatibility with hardware codec.
   * Important for ensuring format compatibility in pipelines.
   *
   * @param codecId - Codec ID from AVCodecID enum
   *
   * @param pixelFormat - Pixel format to check
   *
   * @param isEncoder - Check for encoder (default: decoder)
   *
   * @returns true if pixel format is supported
   *
   * @example
   * ```typescript
   * import { AV_CODEC_ID_H264, AV_PIX_FMT_NV12 } from 'node-av/constants';
   *
   * if (hw.supportsPixelFormat(AV_CODEC_ID_H264, AV_PIX_FMT_NV12)) {
   *   // Can use NV12 format with H.264
   * }
   * ```
   *
   * @see {@link supportsCodec} For basic codec support
   */
  supportsPixelFormat(codecId: AVCodecID, pixelFormat: AVPixelFormat, isEncoder = false): boolean {
    const codec = isEncoder ? Codec.findEncoder(codecId) : Codec.findDecoder(codecId);
    if (!codec) {
      return false;
    }

    const pixelFormats = codec.pixelFormats ?? [];
    if (pixelFormats.length === 0) {
      return false;
    }

    return pixelFormats.some((fmt) => fmt === pixelFormat);
  }

  /**
   * Get the appropriate encoder codec for a given base codec name.
   *
   * Maps generic codec names to hardware-specific encoder implementations.
   * Returns null if no hardware encoder is available for the codec.
   * Automatically tests encoder viability before returning.
   *
   * @param codecOrStream - Generic codec name (e.g., 'h264', 'hevc', 'av1'), AVCodecID or Stream
   *
   * @param validate - Whether to validate encoder by testing (default: false)
   *
   * @returns Hardware encoder codec or null if unsupported
   *
   * @example
   * ```typescript
   * const encoderCodec = hw.getEncoderCodec('h264');
   * if (encoderCodec) {
   *   console.log(`Using encoder: ${encoderCodec.name}`);
   *   // e.g., "h264_nvenc" for CUDA
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Use with Encoder.create
   * const codec = hw.getEncoderCodec('hevc');
   * if (codec) {
   *   const encoder = await Encoder.create(codec, { ... });
   * }
   * ```
   *
   * @see {@link Encoder.create} For using the codec
   */
  getEncoderCodec(codecOrStream: BaseCodecName | AVCodecID | Stream, validate?: boolean): Codec | null {
    // Build the encoder name
    let codecBaseName: BaseCodecName | null = null;
    let encoderSuffix = '';

    if (codecOrStream instanceof Stream) {
      const codecParams = codecOrStream.codecpar;
      codecBaseName = this.getBaseCodecName(codecParams.codecId) ?? null;
    } else if (typeof codecOrStream === 'number') {
      codecBaseName = this.getBaseCodecName(codecOrStream) ?? null;
    } else {
      codecBaseName = codecOrStream;
    }

    if (!codecBaseName) {
      return null;
    }

    const decoderCodecId = this.getCodecIDFromBaseName(codecBaseName);

    // We might only have hardware decode capabilities (d3d11va, d3d12va etc)
    // So we need to check for other hardware encoders
    const getAlternativeEncoder = (): string | null => {
      const nvencCodecName = `${codecBaseName}_nvenc` as FFEncoderCodec;
      const qsvCodecName = `${codecBaseName}_qsv` as FFEncoderCodec;
      const amfCodecName = `${codecBaseName}_amf` as FFEncoderCodec;
      const codecNames = [nvencCodecName, qsvCodecName, amfCodecName];

      let suffix = '';
      for (const name of codecNames) {
        const encoderCodec = Codec.findEncoderByName(name);
        if (!encoderCodec) {
          continue;
        }

        suffix = name.split('_')[1]; // Get suffix after underscore
        if (!suffix) {
          return null;
        }

        return suffix;
      }

      return null;
    };

    switch (this._deviceType) {
      case AV_HWDEVICE_TYPE_CUDA:
        // CUDA uses NVENC for encoding
        encoderSuffix = 'nvenc';
        break;

      case AV_HWDEVICE_TYPE_D3D11VA:
      case AV_HWDEVICE_TYPE_DXVA2:
        encoderSuffix = getAlternativeEncoder() ?? '';
        break;

      case AV_HWDEVICE_TYPE_OPENCL:
      case AV_HWDEVICE_TYPE_VDPAU:
      case AV_HWDEVICE_TYPE_DRM:
        encoderSuffix = getAlternativeEncoder() ?? '';
        break;

      default:
        // Use the device type name as suffix
        encoderSuffix = this._deviceTypeName;
    }

    if (!encoderSuffix) {
      return null;
    }

    // Construct the encoder name
    const encoderName = `${codecBaseName}_${encoderSuffix}` as FFEncoderCodec;
    const encoderCodec = Codec.findEncoderByName(encoderName);

    if (!encoderCodec?.isHardwareAcceleratedEncoder()) {
      return null;
    }

    if (validate && decoderCodecId !== null) {
      const isValid = this.testEncoder(decoderCodecId, encoderCodec);
      if (!isValid) {
        return null;
      }
    }

    return encoderCodec;
  }

  /**
   * Get the appropriate decoder codec for a given base codec name.
   *
   * Maps generic codec names to hardware-specific decoder implementations.
   * Returns null if no hardware decoder is available for the codec.
   * Automatically searches for decoders that support this hardware device type.
   *
   * @param codec - Generic codec name (e.g., 'h264', 'hevc', 'av1') or AVCodecID
   *
   * @returns Hardware decoder codec or null if unsupported
   *
   * @example
   * ```typescript
   * const decoderCodec = hw.getDecoderCodec('hevc');
   * if (decoderCodec) {
   *   console.log(`Using decoder: ${decoderCodec.name}`);
   *   // e.g., "hevc_qsv" for QSV
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Use with Decoder.create
   * const codec = hw.getDecoderCodec(AV_CODEC_ID_H264);
   * if (codec) {
   *   const decoder = await Decoder.create(stream, { hardware: hw });
   * }
   * ```
   *
   * @see {@link Decoder.create} For using the codec
   * @see {@link getEncoderCodec} For hardware encoders
   */
  getDecoderCodec(codec: BaseCodecName | AVCodecID): Codec | null {
    // Get codec ID
    let codecId: AVCodecID | null = null;

    if (typeof codec === 'number') {
      codecId = codec;
    } else {
      codecId = this.getCodecIDFromBaseName(codec);
    }

    if (codecId === null) {
      return null;
    }

    // Find all decoders for this codec
    const codecs = Codec.getCodecList();

    for (const decoderCodec of codecs) {
      // Skip if not a decoder
      if (!decoderCodec.isDecoder()) {
        continue;
      }

      // Skip if wrong codec ID
      if (decoderCodec.id !== codecId) {
        continue;
      }

      // Check if this decoder supports our hardware device type
      for (let i = 0; ; i++) {
        const config = decoderCodec.getHwConfig(i);
        if (!config) break;

        // Accept both HW_DEVICE_CTX and HW_FRAMES_CTX methods
        const supportsDeviceCtx = (config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX) !== 0;
        const supportsFramesCtx = (config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX) !== 0;

        if ((supportsDeviceCtx || supportsFramesCtx) && config.deviceType === this._deviceType) {
          // Found a hardware decoder that supports this device type
          return decoderCodec;
        }
      }
    }

    return null;
  }

  /**
   * Test if hardware acceleration is working by decoding a test frame.
   *
   * Creates a simple decoder and attempts to decode with hardware acceleration.
   * Returns true if hardware decoding succeeds, false otherwise.
   * Useful for validating hardware setup before processing.
   *
   * @param codecId - Codec ID to test (default: H.264)
   *
   * @returns Promise that resolves to true if hardware works
   *
   * @example
   * ```typescript
   * const hw = HardwareContext.auto();
   * if (hw && await hw.testDecoder()) {
   *   console.log('Hardware acceleration working!');
   *   // Proceed with hardware decoding/encoding
   * } else {
   *   console.log('Hardware acceleration not available');
   *   // Fall back to software
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Test specific hardware
   * const cuda = HardwareContext.create(AV_HWDEVICE_TYPE_CUDA);
   * if (cuda && await cuda.testDecoder()) {
   *   console.log('CUDA acceleration works');
   * }
   * ```
   *
   * @see {@link supportsCodec} For checking codec support
   */
  testDecoder(codecId: AVCodecID = AV_CODEC_ID_H264): boolean {
    try {
      if (!this.supportsCodec(codecId, false)) {
        return false;
      }
      return this.testCodec(codecId);
    } catch {
      return false;
    }
  }

  /**
   * Test if hardware encoding works with a specific codec pair.
   *
   * Attempts to decode and re-encode a test frame using hardware acceleration.
   * Validates both decoding and encoding paths for the given codecs.
   *
   * @param decoderCodec - Codec name, ID, or instance to use for decoding
   *
   * @param encoderCodec - Codec name or instance to use for encoding
   *
   * @returns true if both decoding and encoding succeed
   *
   * @example
   * ```typescript
   * import { AV_CODEC_ID_H264 } from 'node-av/constants';
   *
   * const hw = HardwareContext.auto();
   * if (hw && hw.testEncoder(AV_CODEC_ID_H264, AV_CODEC_ID_H264)) {
   *   console.log('Hardware H.264 encoding works!');
   * }
   * ```
   *
   * @see {@link getEncoderCodec} For obtaining hardware encoder codec
   */
  testEncoder(decoderCodec: FFDecoderCodec | Codec | AVCodecID, encoderCodec: FFEncoderCodec | Codec): boolean {
    const isSupported = this.testCodec(decoderCodec, encoderCodec);
    if (!isSupported) {
      return false;
    }

    return true;
  }

  /**
   * Find all codecs that support this hardware device.
   *
   * Iterates through all available codecs and checks hardware compatibility.
   * Useful for discovering available hardware acceleration options.
   *
   * Direct mapping to av_codec_iterate() with hardware config checks.
   *
   * @param isEncoder - Find encoders (true) or decoders (false)
   *
   * @returns Array of codec names that support this hardware
   *
   * @example
   * ```typescript
   * const decoders = hw.findSupportedCodecs(false);
   * console.log('Hardware decoders:', decoders);
   * // ["h264_cuvid", "hevc_cuvid", ...]
   *
   * const encoders = hw.findSupportedCodecs(true);
   * console.log('Hardware encoders:', encoders);
   * // ["h264_nvenc", "hevc_nvenc", ...]
   * ```
   *
   * @see {@link supportsCodec} For checking specific codec
   */
  findSupportedCodecs(isEncoder = false): string[] {
    const supportedCodecs: string[] = [];
    const codecs = Codec.getCodecList();

    for (const codec of codecs) {
      // Skip if wrong type (encoder vs decoder)
      if (isEncoder && !codec.isEncoder()) continue;
      if (!isEncoder && !codec.isDecoder()) continue;

      // Check if this codec supports our hardware device type
      for (let i = 0; ; i++) {
        const config = codec.getHwConfig(i);
        if (!config) break;

        // Accept both HW_DEVICE_CTX and HW_FRAMES_CTX methods
        const supportsDeviceCtx = (config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX) !== 0;
        const supportsFramesCtx = (config.methods & AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX) !== 0;

        if ((supportsDeviceCtx || supportsFramesCtx) && config.deviceType === this._deviceType) {
          if (codec.name) {
            supportedCodecs.push(codec.name);
          }
          break; // Found support, move to next codec
        }
      }
    }

    return supportedCodecs;
  }

  /**
   * Clean up and free hardware resources.
   *
   * Releases the hardware device context.
   * Safe to call multiple times.
   * Automatically called by Symbol.dispose.
   *
   * @example
   * ```typescript
   * const hw = HardwareContext.auto();
   * try {
   *   // Use hardware
   * } finally {
   *   hw?.dispose();
   * }
   * ```
   *
   * @see {@link Symbol.dispose} For automatic cleanup
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._deviceContext.free();
    this._isDisposed = true;
  }

  /**
   * Test hardware decoding with a specific codec.
   *
   * @param decoderCodec - Decoder codec name, ID, or instance to test
   *
   * @param encoderCodec - Optional encoder codec name or instance to test
   *
   * @returns true if decoding succeeds
   *
   * @internal
   */
  private testCodec(decoderCodec: FFDecoderCodec | AVCodecID | Codec, encoderCodec?: FFEncoderCodec | Codec): boolean {
    try {
      let codecDecoder: Codec | null = null;
      let codecEncoder: Codec | null = null;

      if (decoderCodec instanceof Codec) {
        codecDecoder = decoderCodec;
      } else if (typeof decoderCodec === 'string') {
        codecDecoder = Codec.findDecoderByName(decoderCodec);
      } else {
        codecDecoder = Codec.findDecoder(decoderCodec);
      }

      if (!codecDecoder) {
        throw new Error('Decoder codec not found');
      }

      // Select appropriate test file based on codec
      let testFilePath: string;
      switch (codecDecoder.id) {
        case AV_CODEC_ID_HEVC:
          testFilePath = hevcData;
          break;
        case AV_CODEC_ID_VP8:
          testFilePath = vp8Data;
          break;
        case AV_CODEC_ID_VP9:
          testFilePath = vp9Data;
          break;
        case AV_CODEC_ID_AV1:
          testFilePath = av1Data;
          break;
        case AV_CODEC_ID_MJPEG:
          testFilePath = mjpegData;
          break;
        case AV_CODEC_ID_H264:
        default:
          testFilePath = h264Data;
          break;
      }

      // Read test bitstream
      using input = Demuxer.openSync(testFilePath);
      const videoStream = input.video()!;

      using decoder = Decoder.createSync(videoStream, {
        hardware: this,
      });

      const inputGenerator = input.packetsSync();
      const frameGenerator = decoder.framesSync(inputGenerator);
      let packetGenerator: Generator<Packet | null> | null = null;
      let encoder: Encoder | null = null;

      if (encoderCodec) {
        if (encoderCodec instanceof Codec) {
          codecEncoder = encoderCodec;
        } else if (typeof encoderCodec === 'string') {
          codecEncoder = Codec.findEncoderByName(encoderCodec);
        } else if (encoderCodec) {
          codecEncoder = Codec.findEncoder(encoderCodec);
        }

        if (!codecEncoder) {
          throw new Error('Encoder codec not found');
        }

        encoder = Encoder.createSync(codecEncoder, {
          decoder,
        });

        packetGenerator = encoder.packetsSync(frameGenerator);
      }

      using _encoder = encoder;

      let hasData = false;

      const generator = packetGenerator ?? frameGenerator;
      for (using _ of generator) {
        hasData = true;
        break; // We only need to decode one frame
      }

      return hasData;
    } catch {
      return false;
    }
  }

  /**
   * Map AVCodecID to base codec name for hardware encoder lookup.
   *
   * Converts codec IDs to generic codec names used for encoder naming.
   * Used internally to find hardware-specific encoder implementations.
   *
   * @param codecId - AVCodecID enum value
   *
   * @returns Base codec name or null if unsupported
   *
   * @internal
   */
  private getBaseCodecName(codecId: AVCodecID): BaseCodecName | null {
    switch (codecId) {
      case AV_CODEC_ID_AV1:
        return 'av1';
      case AV_CODEC_ID_H264:
        return 'h264';
      case AV_CODEC_ID_HEVC:
        return 'hevc';
      case AV_CODEC_ID_H263:
        return 'h263';
      case AV_CODEC_ID_MPEG2VIDEO:
        return 'mpeg2';
      case AV_CODEC_ID_MPEG4:
        return 'mpeg4';
      case AV_CODEC_ID_VP8:
        return 'vp8';
      case AV_CODEC_ID_VP9:
        return 'vp9';
      case AV_CODEC_ID_MJPEG:
        return 'mjpeg';
      case AV_CODEC_ID_PRORES:
        return 'prores';
      default:
        return null;
    }
  }

  /**
   * Map base codec name to AVCodecID for internal use.
   *
   * Converts generic codec names to AVCodecID enum values.
   * Used internally for codec testing and validation.
   *
   * @param codecBaseName - Base codec name string
   *
   * @returns Corresponding AVCodecID or null if unsupported
   *
   * @internal
   */
  private getCodecIDFromBaseName(codecBaseName: BaseCodecName): AVCodecID | null {
    switch (codecBaseName) {
      case 'av1':
        return AV_CODEC_ID_AV1;
      case 'h264':
        return AV_CODEC_ID_H264;
      case 'hevc':
        return AV_CODEC_ID_HEVC;
      case 'h263':
        return AV_CODEC_ID_H263;
      case 'mpeg2':
        return AV_CODEC_ID_MPEG2VIDEO;
      case 'mpeg4':
        return AV_CODEC_ID_MPEG4;
      case 'vp8':
        return AV_CODEC_ID_VP8;
      case 'vp9':
        return AV_CODEC_ID_VP9;
      case 'mjpeg':
        return AV_CODEC_ID_MJPEG;
      case 'prores':
        return AV_CODEC_ID_PRORES;
      default:
        return null;
    }
  }

  /**
   * Get the hardware decoder pixel format for this device type.
   *
   * Maps device types to their corresponding pixel formats.
   * Used internally for frame format configuration.
   *
   * @returns Hardware-specific pixel format
   *
   * @internal
   */
  private getHardwareDecoderPixelFormat(): AVPixelFormat {
    switch (this._deviceType) {
      case AV_HWDEVICE_TYPE_VIDEOTOOLBOX:
        return AV_PIX_FMT_VIDEOTOOLBOX;
      case AV_HWDEVICE_TYPE_VAAPI:
        return AV_PIX_FMT_VAAPI;
      case AV_HWDEVICE_TYPE_CUDA:
        return AV_PIX_FMT_CUDA;
      case AV_HWDEVICE_TYPE_QSV:
        return AV_PIX_FMT_QSV;
      case AV_HWDEVICE_TYPE_D3D11VA:
        return AV_PIX_FMT_D3D11;
      case AV_HWDEVICE_TYPE_DXVA2:
        return AV_PIX_FMT_DXVA2_VLD;
      case AV_HWDEVICE_TYPE_DRM:
        return AV_PIX_FMT_DRM_PRIME;
      case AV_HWDEVICE_TYPE_OPENCL:
        return AV_PIX_FMT_OPENCL;
      case AV_HWDEVICE_TYPE_MEDIACODEC:
        return AV_PIX_FMT_MEDIACODEC;
      case AV_HWDEVICE_TYPE_VULKAN:
        return AV_PIX_FMT_VULKAN;
      case AV_HWDEVICE_TYPE_D3D12VA:
        return AV_PIX_FMT_D3D12;
      case AV_HWDEVICE_TYPE_RKMPP:
        return AV_PIX_FMT_DRM_PRIME; // RKMPP uses DRM Prime buffers
      default:
        return AV_PIX_FMT_NV12; // Common hardware format
    }
  }

  /**
   * Create hardware context from device type.
   *
   * Internal factory method using av_hwdevice_ctx_create().
   *
   * @param deviceType - AVHWDeviceType enum value
   *
   * @param device - Optional device specifier
   *
   * @param options - Optional device options
   *
   * @returns Hardware context or null if creation fails
   *
   * @internal
   */
  private static createFromType(deviceType: AVHWDeviceType, device?: string, options?: Record<string, string>): HardwareContext {
    // Set environment variables for Vulkan to enable video support on older gpus
    if (deviceType === AV_HWDEVICE_TYPE_VULKAN) {
      process.env.ANV_DEBUG ??= 'video-decode,video-encode';
      process.env.RADV_PERFTEST ??= 'video_decode,video_encode';
    }

    const deviceCtx = new HardwareDeviceContext();

    // Convert options to Dictionary if provided
    let optionsDict = null;
    if (options && Object.keys(options).length > 0) {
      optionsDict = Dictionary.fromObject(options);
    }

    const ret = deviceCtx.create(deviceType, device, optionsDict);

    // Clean up dictionary if used
    if (optionsDict) {
      optionsDict.free();
    }

    const deviceTypeName = HardwareDeviceContext.getTypeName(deviceType);

    if (ret < 0 || !deviceTypeName) {
      deviceCtx.free();
      FFmpegError.throwIfError(ret);
      throw new Error('Unknown error creating hardware device context');
    }

    return new HardwareContext(deviceCtx, deviceType, deviceTypeName);
  }

  /**
   * Get platform-specific preference order for hardware types.
   *
   * Returns available hardware types sorted by platform preference.
   * Ensures optimal hardware selection for each platform.
   *
   * @returns Array of AVHWDeviceType values in preference order
   *
   * @internal
   */
  private static getPreferenceOrder(): AVHWDeviceType[] {
    // Get all available hardware types on this system
    const available = HardwareDeviceContext.iterateTypes();
    if (available.length === 0) {
      return [];
    }

    const platform = process.platform;
    let preferenceOrder: AVHWDeviceType[];

    if (platform === 'darwin') {
      preferenceOrder = [AV_HWDEVICE_TYPE_VIDEOTOOLBOX];
    } else if (platform === 'win32') {
      preferenceOrder = [
        AV_HWDEVICE_TYPE_CUDA,
        AV_HWDEVICE_TYPE_QSV,
        AV_HWDEVICE_TYPE_D3D11VA,
        AV_HWDEVICE_TYPE_D3D12VA,
        AV_HWDEVICE_TYPE_DXVA2,
        AV_HWDEVICE_TYPE_VULKAN,
        AV_HWDEVICE_TYPE_OPENCL,
      ];
    } else {
      // Linux/Unix platforms
      const isARM = process.arch === 'arm64' || process.arch === 'arm';

      if (isARM) {
        preferenceOrder = [AV_HWDEVICE_TYPE_RKMPP, AV_HWDEVICE_TYPE_VAAPI, AV_HWDEVICE_TYPE_CUDA, AV_HWDEVICE_TYPE_DRM, AV_HWDEVICE_TYPE_VULKAN, AV_HWDEVICE_TYPE_OPENCL];
      } else {
        preferenceOrder = [AV_HWDEVICE_TYPE_CUDA, AV_HWDEVICE_TYPE_QSV, AV_HWDEVICE_TYPE_VAAPI, AV_HWDEVICE_TYPE_DRM, AV_HWDEVICE_TYPE_VULKAN, AV_HWDEVICE_TYPE_OPENCL];
      }
    }

    // Filter preference order to only include available types
    const availableSet = new Set(available);
    const sortedAvailable = preferenceOrder.filter((type) => availableSet.has(type));

    // Add any available types not in our preference list at the end
    for (const type of available) {
      if (!preferenceOrder.includes(type)) {
        sortedAvailable.push(type);
      }
    }

    return sortedAvailable;
  }

  /**
   * Dispose of hardware context.
   *
   * Implements Disposable interface for automatic cleanup.
   * Equivalent to calling dispose().
   *
   * @example
   * ```typescript
   * {
   *   using hw = HardwareContext.auto();
   *   // Use hardware context...
   * } // Automatically disposed
   * ```
   *
   * @see {@link dispose} For manual cleanup
   */
  [Symbol.dispose](): void {
    this.dispose();
  }
}
