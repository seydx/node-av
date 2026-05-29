import {
  AVCOL_PRI_BT2020,
  AVCOL_PRI_BT470BG,
  AVCOL_PRI_BT470M,
  AVCOL_PRI_BT709,
  AVCOL_PRI_EBU3213,
  AVCOL_PRI_FILM,
  AVCOL_PRI_SMPTE170M,
  AVCOL_PRI_SMPTE240M,
  AVCOL_PRI_SMPTE428,
  AVCOL_PRI_SMPTE431,
  AVCOL_PRI_SMPTE432,
  AVCOL_PRI_UNSPECIFIED,
  AVCOL_RANGE_JPEG,
  AVCOL_RANGE_MPEG,
  AVCOL_RANGE_UNSPECIFIED,
  AVCOL_SPC_BT2020_NCL,
  AVCOL_SPC_BT470BG,
  AVCOL_SPC_BT709,
  AVCOL_SPC_FCC,
  AVCOL_SPC_RGB,
  AVCOL_SPC_SMPTE170M,
  AVCOL_SPC_SMPTE240M,
  AVCOL_SPC_UNSPECIFIED,
  AVCOL_SPC_YCGCO,
  AVCOL_TRC_ARIB_STD_B67,
  AVCOL_TRC_BT1361_ECG,
  AVCOL_TRC_BT2020_10,
  AVCOL_TRC_BT2020_12,
  AVCOL_TRC_BT709,
  AVCOL_TRC_GAMMA22,
  AVCOL_TRC_GAMMA28,
  AVCOL_TRC_IEC61966_2_1,
  AVCOL_TRC_IEC61966_2_4,
  AVCOL_TRC_LINEAR,
  AVCOL_TRC_LOG,
  AVCOL_TRC_LOG_SQRT,
  AVCOL_TRC_SMPTE170M,
  AVCOL_TRC_SMPTE2084,
  AVCOL_TRC_SMPTE240M,
  AVCOL_TRC_SMPTE428,
  AVCOL_TRC_UNSPECIFIED,
  AV_HWFRAME_MAP_READ,
  AV_HWFRAME_MAP_WRITE,
  AV_PIX_FMT_BGRA,
  AV_PIX_FMT_NONE,
} from '../../constants/constants.js';
import { FFmpegError } from '../../lib/error.js';
import { Frame } from '../../lib/frame.js';
import { HardwareFramesContext } from '../../lib/hardware-frames-context.js';
import { PixelFormatUtils } from './pixel-format.js';

import type { AVColorPrimaries, AVColorRange, AVColorSpace, AVColorTransferCharacteristic, AVPixelFormat } from '../../constants/constants.js';
import type { DmaBufPlanes } from '../../lib/frame.js';
import type { IRational } from '../../lib/types.js';
import type { HardwareContext } from '../hardware.js';

/**
 * Electron SharedTextureHandle (textureInfo.handle).
 *
 * Platform-specific GPU texture handles provided by Electron's offscreen rendering
 * with shared textures enabled.
 */
export interface SharedTextureHandle {
  ioSurface?: Buffer;
  ntHandle?: Buffer;
  nativePixmap?: {
    planes: { fd: number; stride: number; offset: number; size: number }[];
    modifier: string;
  };
}

/**
 * Electron color space descriptor from textureInfo.colorSpace.
 */
export interface TextureColorSpace {
  range?: 'limited' | 'full' | 'derived' | 'invalid';
  primaries?: string;
  transfer?: string;
  matrix?: string;
}

/**
 * Electron textureInfo object.
 *
 * Contains GPU texture metadata and platform-specific handle for zero-copy frame import.
 */
export interface TextureInfo {
  pixelFormat: string;
  codedSize: { width: number; height: number };
  colorSpace?: TextureColorSpace;
  handle: SharedTextureHandle;
}

/**
 * Options for each frame import via {@link SharedTexture.importTexture} or {@link SharedTexture.importHandle}.
 */
export interface TextureFrameOptions {
  pts?: bigint;
  timeBase?: IRational;
}

/**
 * Options for {@link SharedTexture.create}.
 */
export interface SharedTextureOptions {
  width?: number;
  height?: number;
  swFormat?: AVPixelFormat;
}

/**
 * Properties for importing a raw GPU texture handle via {@link SharedTexture.importHandle}.
 */
export interface ImportHandleProps {
  width: number;
  height: number;
  pixelFormat?: string | AVPixelFormat;
  pts?: bigint;
  timeBase?: IRational;
}

const RANGE_MAP: Record<string, AVColorRange> = {
  full: AVCOL_RANGE_JPEG,
  limited: AVCOL_RANGE_MPEG,
};

const PRIMARIES_MAP: Record<string, AVColorPrimaries> = {
  bt709: AVCOL_PRI_BT709,
  bt470m: AVCOL_PRI_BT470M,
  bt470bg: AVCOL_PRI_BT470BG,
  smpte170m: AVCOL_PRI_SMPTE170M,
  smpte240m: AVCOL_PRI_SMPTE240M,
  film: AVCOL_PRI_FILM,
  bt2020: AVCOL_PRI_BT2020,
  'smptest428-1': AVCOL_PRI_SMPTE428,
  'smptest431-2': AVCOL_PRI_SMPTE431,
  p3: AVCOL_PRI_SMPTE432,
  'ebu-3213-e': AVCOL_PRI_EBU3213,
};

const TRANSFER_MAP: Record<string, AVColorTransferCharacteristic> = {
  bt709: AVCOL_TRC_BT709,
  'bt709-apple': AVCOL_TRC_BT709,
  gamma22: AVCOL_TRC_GAMMA22,
  gamma28: AVCOL_TRC_GAMMA28,
  smpte170m: AVCOL_TRC_SMPTE170M,
  smpte240m: AVCOL_TRC_SMPTE240M,
  linear: AVCOL_TRC_LINEAR,
  log: AVCOL_TRC_LOG,
  'log-sqrt': AVCOL_TRC_LOG_SQRT,
  'iec61966-2-4': AVCOL_TRC_IEC61966_2_4,
  'bt1361-ecg': AVCOL_TRC_BT1361_ECG,
  srgb: AVCOL_TRC_IEC61966_2_1,
  'bt2020-10': AVCOL_TRC_BT2020_10,
  'bt2020-12': AVCOL_TRC_BT2020_12,
  pq: AVCOL_TRC_SMPTE2084,
  'smptest428-1': AVCOL_TRC_SMPTE428,
  hlg: AVCOL_TRC_ARIB_STD_B67,
};

const MATRIX_MAP: Record<string, AVColorSpace> = {
  rgb: AVCOL_SPC_RGB,
  gbr: AVCOL_SPC_RGB,
  bt709: AVCOL_SPC_BT709,
  fcc: AVCOL_SPC_FCC,
  bt470bg: AVCOL_SPC_BT470BG,
  smpte170m: AVCOL_SPC_SMPTE170M,
  smpte240m: AVCOL_SPC_SMPTE240M,
  ycocg: AVCOL_SPC_YCGCO,
  'bt2020-ncl': AVCOL_SPC_BT2020_NCL,
};

/**
 * Map an Electron color space descriptor to FFmpeg color properties.
 *
 * Translates Electron's `textureInfo.colorSpace` strings (range, primaries,
 * transfer, matrix) to the corresponding `AVCOL_*` enums. Unknown values map to
 * the `UNSPECIFIED` variants; a missing descriptor falls back to the BGRA/sRGB
 * defaults typical of Electron textures.
 *
 * @param colorSpace - Electron color space descriptor from textureInfo.colorSpace
 *
 * @returns Mapped FFmpeg color properties (colorRange, colorPrimaries, colorTrc, colorSpace) with fallbacks
 *
 * @internal
 */
export function mapColorSpace(colorSpace?: TextureColorSpace): {
  colorRange: AVColorRange;
  colorPrimaries: AVColorPrimaries;
  colorTrc: AVColorTransferCharacteristic;
  colorSpace: AVColorSpace;
} {
  if (!colorSpace) {
    // Fallback: Electron textures are typically BGRA (full range, sRGB)
    return {
      colorRange: AVCOL_RANGE_JPEG,
      colorPrimaries: AVCOL_PRI_BT709,
      colorTrc: AVCOL_TRC_IEC61966_2_1,
      colorSpace: AVCOL_SPC_RGB,
    };
  }

  return {
    colorRange: RANGE_MAP[colorSpace.range ?? ''] ?? AVCOL_RANGE_UNSPECIFIED,
    colorPrimaries: PRIMARIES_MAP[colorSpace.primaries ?? ''] ?? AVCOL_PRI_UNSPECIFIED,
    colorTrc: TRANSFER_MAP[colorSpace.transfer ?? ''] ?? AVCOL_TRC_UNSPECIFIED,
    colorSpace: MATRIX_MAP[colorSpace.matrix ?? ''] ?? AVCOL_SPC_UNSPECIFIED,
  };
}

/**
 * Resolve the software pixel format for a hardware mapping context.
 *
 * The mapping context's sw_format must be the *software* layout of the frames
 * (e.g. NV12, BGRA), never a hardware wrapper format like AV_PIX_FMT_DRM_PRIME /
 * D3D11 / VIDEOTOOLBOX (which is what `srcFrame.format` is for an imported GPU
 * frame). Prefer the source frame's own hwframe context software format (set on
 * macOS IOSurface imports), and fall back to the layout used at the last import
 * for bare frames (Windows D3D11, Linux DMA-BUF) that carry no hwframe context.
 *
 * @param srcFrame - The source hardware frame being mapped
 *
 * @param fallback - Software format to use when the frame carries no hwframe context
 *
 * @returns The software pixel format to set on the mapping context
 *
 * @internal
 */
export function resolveMappingSwFormat(srcFrame: Frame, fallback: AVPixelFormat): AVPixelFormat {
  return srcFrame.hwFramesCtx?.swFormat ?? fallback;
}

/**
 * High-level GPU texture import for Electron shared textures.
 *
 * Handles platform detection (macOS IOSurface, Windows D3D11,
 * Linux DMA-BUF), HardwareFramesContext lifecycle, and format mapping automatically.
 *
 * @example
 * ```typescript
 * import { HardwareContext, SharedTexture } from 'node-av/api';
 *
 * const hw = HardwareContext.auto();
 * using sharedTexture = SharedTexture.create(hw);
 *
 * // In Electron paint event:
 * offscreen.webContents.on('paint', (event) => {
 *   const texture = event.texture;
 *   if (!texture?.textureInfo) return;
 *
 *   using frame = sharedTexture.importTexture(texture.textureInfo, { pts: 0n });
 *   // frame is a hardware Frame ready for encoding/filtering
 *
 *   texture.release();
 * });
 * ```
 *
 * @see {@link HardwareContext} For hardware acceleration setup
 * @see {@link Frame} For frame operations
 */
export class SharedTexture implements Disposable {
  private _hardware: HardwareContext;
  private _framesCtx: HardwareFramesContext | null = null;
  private _currentWidth = 0;
  private _currentHeight = 0;
  private _swFormat: AVPixelFormat;
  private _importSwFormat: AVPixelFormat;
  private _isDisposed = false;

  // Mapping context cache for mapTo() helper
  private _mappingCtx: HardwareFramesContext | null = null;
  private _mappingHw: HardwareContext | null = null;

  private constructor(hardware: HardwareContext, options: SharedTextureOptions) {
    this._hardware = hardware;
    this._swFormat = options.swFormat ?? AV_PIX_FMT_BGRA;
    this._importSwFormat = this._swFormat;
    if (options.width) this._currentWidth = options.width;
    if (options.height) this._currentHeight = options.height;
  }

  /**
   * Create a SharedTexture.
   *
   * @param hardware - Initialized hardware context (from HardwareContext.auto() or HardwareContext.create())
   *
   * @param options - Optional configuration overrides
   *
   * @returns SharedTexture instance
   *
   * @example
   * ```typescript
   * const hw = HardwareContext.auto();
   * using sharedTexture = SharedTexture.create(hw);
   * ```
   *
   * @example
   * ```typescript
   * // With explicit software format
   * import { AV_PIX_FMT_NV12 } from 'node-av/constants';
   *
   * using sharedTexture = SharedTexture.create(hw, { swFormat: AV_PIX_FMT_NV12 });
   * ```
   */
  static create(hardware: HardwareContext, options: SharedTextureOptions = {}): SharedTexture {
    if (!hardware || hardware.isDisposed) {
      throw new Error('SharedTexture requires a valid, non-disposed HardwareContext');
    }
    return new SharedTexture(hardware, options);
  }

  /**
   * The hardware context used by this sharedTexture.
   */
  get hardware(): HardwareContext {
    return this._hardware;
  }

  /**
   * Current width of the cached HardwareFramesContext.
   */
  get width(): number {
    return this._currentWidth;
  }

  /**
   * Current height of the cached HardwareFramesContext.
   */
  get height(): number {
    return this._currentHeight;
  }

  /**
   * Whether this sharedTexture has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Import an Electron textureInfo as a hardware Frame.
   *
   * Automatically detects the platform from the handle contents,
   * manages the HardwareFramesContext, and creates a zero-copy hardware frame.
   *
   * @param textureInfo - Electron's textureInfo object from paint event
   *
   * @param options - Per-frame options (pts, timeBase)
   *
   * @returns Hardware Frame referencing the GPU texture
   *
   * @throws {Error} If disposed, no valid handle found, or import fails
   *
   * @example
   * ```typescript
   * offscreen.webContents.on('paint', (event) => {
   *   const texture = event.texture;
   *   if (!texture?.textureInfo) return;
   *
   *   using frame = sharedTexture.importTexture(texture.textureInfo, {
   *     pts: BigInt(Date.now()) * 1000n,
   *     timeBase: { num: 1, den: 1000000 },
   *   });
   *
   *   texture.release();
   * });
   * ```
   */
  importTexture(textureInfo: TextureInfo, options: TextureFrameOptions = {}): Frame {
    if (this._isDisposed) {
      throw new Error('SharedTexture has been disposed');
    }

    const { width, height } = textureInfo.codedSize;
    const swFormat = this.resolvePixelFormat(textureInfo.pixelFormat);
    const handle = textureInfo.handle;

    return this.importFromHandle(handle, width, height, swFormat, options, textureInfo.colorSpace);
  }

  /**
   * Import a raw SharedTextureHandle as a hardware Frame.
   *
   * Use this when you have the handle directly without the full textureInfo wrapper.
   *
   * @param handle - Platform-specific GPU texture handle
   *
   * @param props - Dimensions, format, and timing options
   *
   * @returns Hardware Frame referencing the GPU texture
   *
   * @throws {Error} If disposed, no valid handle found, or import fails
   *
   * @example
   * ```typescript
   * const frame = sharedTexture.importHandle(handle, {
   *   width: 1920,
   *   height: 1080,
   *   pixelFormat: 'BGRA',
   *   pts: 0n,
   * });
   * ```
   */
  importHandle(handle: SharedTextureHandle, props: ImportHandleProps): Frame {
    if (this._isDisposed) {
      throw new Error('SharedTexture has been disposed');
    }

    let swFormat = this._swFormat;
    if (props.pixelFormat !== undefined) {
      swFormat = typeof props.pixelFormat === 'string' ? this.resolvePixelFormat(props.pixelFormat) : props.pixelFormat;
    }

    return this.importFromHandle(handle, props.width, props.height, swFormat, {
      pts: props.pts,
      timeBase: props.timeBase,
    });
  }

  /**
   * Map a frame to a different hardware format.
   *
   * Handles HardwareFramesContext creation and caching automatically.
   * The mapping context is cached and reused for subsequent calls with the
   * same target hardware and frame dimensions.
   *
   * @param srcFrame - Source frame (e.g., DRM PRIME from importTexture on Linux)
   *
   * @param targetHw - Target hardware context (e.g., VAAPI, Vulkan)
   *
   * @param flags - Mapping flags
   *
   * @returns Mapped frame in target hardware format
   *
   * @throws {FFmpegError} If mapping fails (e.g., unsupported mapping, invalid frames)
   *
   * @example
   * ```typescript
   * import { HardwareContext, SharedTexture } from 'node-av/api';
   * import { AV_HWDEVICE_TYPE_VAAPI } from 'node-av/constants';
   *
   * // Import DRM PRIME frame from Electron shared texture
   * const drmFrame = sharedTexture.importTexture(textureInfo, { pts: 0n });
   *
   * // Map to VAAPI for encoding
   * const vaapiHw = HardwareContext.create(AV_HWDEVICE_TYPE_VAAPI);
   * const vaapiFrame = sharedTexture.mapTo(drmFrame, vaapiHw);
   *
   * // Encode with VAAPI encoder
   * encoder.encode(vaapiFrame);
   * ```
   */
  mapTo(srcFrame: Frame, targetHw: HardwareContext, flags?: number): Frame {
    if (this._isDisposed) {
      throw new Error('SharedTexture has been disposed');
    }

    // Ensure mapping context exists and matches target hardware + dimensions
    this.ensureMappingContext(srcFrame, targetHw);

    // Create destination frame
    const dstFrame = new Frame();
    dstFrame.alloc();

    // Allocate buffer from target hardware frames context
    const allocRet = this._mappingCtx!.getBuffer(dstFrame);
    FFmpegError.throwIfError(allocRet, 'Failed to allocate target hardware frame');

    // Copy timing properties
    dstFrame.pts = srcFrame.pts;
    dstFrame.timeBase = srcFrame.timeBase;

    // Perform mapping
    const mapFlags = flags ?? AV_HWFRAME_MAP_READ | AV_HWFRAME_MAP_WRITE;
    const ret = this._mappingCtx!.map(dstFrame, srcFrame, mapFlags);
    FFmpegError.throwIfError(ret, 'Failed to map frame to target hardware format');

    return dstFrame;
  }

  /**
   * Ensure mapping context exists and matches the target hardware and frame dimensions.
   *
   * Re-creates the context if target hardware changes or dimensions change.
   *
   * @param srcFrame - Source frame to get dimensions from
   *
   * @param targetHw - Target hardware context
   *
   * @internal
   */
  private ensureMappingContext(srcFrame: Frame, targetHw: HardwareContext): void {
    const swFormat = resolveMappingSwFormat(srcFrame, this._importSwFormat);

    // Re-create if target hardware, dimensions, or software format changed
    if (
      this._mappingHw !== targetHw ||
      this._mappingCtx?.width !== srcFrame.width ||
      this._mappingCtx?.height !== srcFrame.height ||
      this._mappingCtx?.swFormat !== swFormat
    ) {
      // Free previous context
      if (this._mappingCtx) {
        this._mappingCtx.free();
        this._mappingCtx = null;
      }

      // Create new mapping context for target hardware
      const ctx = new HardwareFramesContext();
      ctx.alloc(targetHw.deviceContext);
      ctx.format = targetHw.devicePixelFormat;
      ctx.swFormat = swFormat;
      ctx.width = srcFrame.width;
      ctx.height = srcFrame.height;

      const ret = ctx.init();
      FFmpegError.throwIfError(ret, 'Failed to initialize mapping HardwareFramesContext');

      this._mappingCtx = ctx;
      this._mappingHw = targetHw;
    }
  }

  /**
   * Release the cached HardwareFramesContext and mapping context.
   *
   * The HardwareContext is NOT disposed — it belongs to the caller.
   * Safe to call multiple times.
   *
   * @example
   * ```typescript
   * sharedTexture.dispose();
   * ```
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;

    if (this._framesCtx) {
      this._framesCtx.free();
      this._framesCtx = null;
    }

    if (this._mappingCtx) {
      this._mappingCtx.free();
      this._mappingCtx = null;
    }
    this._mappingHw = null;
  }

  /**
   * Core import logic — dispatches to the correct Frame factory based on handle type.
   *
   * @param handle - Platform-specific GPU texture handle
   *
   * @param width - Texture width in pixels
   *
   * @param height - Texture height in pixels
   *
   * @param swFormat - Software pixel format for HardwareFramesContext
   *
   * @param options - Per-frame timing options
   *
   * @param colorSpace - Electron color space descriptor for mapping to FFmpeg color properties
   *
   * @returns Hardware Frame referencing the GPU texture
   *
   * @internal
   */
  private importFromHandle(
    handle: SharedTextureHandle,
    width: number,
    height: number,
    swFormat: AVPixelFormat,
    options: TextureFrameOptions,
    colorSpace?: TextureColorSpace,
  ): Frame {
    // Remember the layout actually used, so mapTo() can fall back to it for
    // bare hardware frames (D3D11/DMA-BUF) that carry no hw_frames_ctx.
    this._importSwFormat = swFormat;

    let frame: Frame;

    if (handle.ioSurface && handle.ioSurface.length > 0) {
      // macOS — IOSurface
      const framesCtx = this.ensureFramesContext(width, height, swFormat);
      frame = Frame.fromIOSurface(handle.ioSurface, {
        hwFramesCtx: framesCtx,
        pts: options.pts,
        timeBase: options.timeBase,
      });
    } else if (handle.ntHandle && handle.ntHandle.length > 0) {
      // Windows — D3D11 shared texture
      frame = Frame.fromD3D11Texture(handle.ntHandle, {
        hwDeviceCtx: this._hardware.deviceContext,
        pts: options.pts,
        timeBase: options.timeBase,
      });
    } else if (handle.nativePixmap) {
      // Linux — DMA-BUF
      const dmaBuf: DmaBufPlanes = {
        planes: handle.nativePixmap.planes,
        modifier: handle.nativePixmap.modifier,
      };
      frame = Frame.fromDmaBuf(dmaBuf, {
        width,
        height,
        swFormat,
        pts: options.pts,
        timeBase: options.timeBase,
      });
    } else {
      throw new Error('SharedTexture: no valid handle found (expected ioSurface, ntHandle, or nativePixmap)');
    }

    // Map Electron's colorSpace to FFmpeg color properties.
    const colors = mapColorSpace(colorSpace);
    frame.colorRange = colors.colorRange;
    frame.colorPrimaries = colors.colorPrimaries;
    frame.colorTrc = colors.colorTrc;
    frame.colorSpace = colors.colorSpace;

    return frame;
  }

  /**
   * Ensure HardwareFramesContext is created and matches the requested dimensions/format.
   *
   * Re-creates the context only when dimensions or format change.
   * Windows D3D11 does not use this — it passes HardwareDeviceContext directly.
   *
   * @param width - Frame width in pixels
   *
   * @param height - Frame height in pixels
   *
   * @param swFormat - Software pixel format
   *
   * @returns Initialized HardwareFramesContext matching the requested parameters
   *
   * @internal
   */
  private ensureFramesContext(width: number, height: number, swFormat: AVPixelFormat): HardwareFramesContext {
    if (this._framesCtx && this._currentWidth === width && this._currentHeight === height && this._swFormat === swFormat) {
      return this._framesCtx;
    }

    // Free previous context if dimensions/format changed
    if (this._framesCtx) {
      this._framesCtx.free();
      this._framesCtx = null;
    }

    const framesCtx = new HardwareFramesContext();
    framesCtx.alloc(this._hardware.deviceContext);
    framesCtx.format = this._hardware.devicePixelFormat;
    framesCtx.swFormat = swFormat;
    framesCtx.width = width;
    framesCtx.height = height;

    const ret = framesCtx.init();
    FFmpegError.throwIfError(ret, 'Failed to initialize HardwareFramesContext');

    this._framesCtx = framesCtx;
    this._currentWidth = width;
    this._currentHeight = height;
    this._swFormat = swFormat;

    return framesCtx;
  }

  /**
   * Resolve a pixel format string (e.g., 'BGRA') to an AVPixelFormat enum value.
   *
   * Falls back to the configured swFormat if the name is not recognized.
   *
   * @param name - Pixel format name string from Electron
   *
   * @returns Resolved AVPixelFormat enum value
   *
   * @internal
   */
  private resolvePixelFormat(name: string): AVPixelFormat {
    // Electron reports formats in uppercase (e.g., 'BGRA'), FFmpeg uses lowercase
    const fmt = PixelFormatUtils.fromName(name.toLowerCase());
    if (fmt === AV_PIX_FMT_NONE) {
      return this._swFormat;
    }
    return fmt;
  }

  /**
   * Dispose of the SharedTexture.
   *
   * Implements the Disposable interface for automatic cleanup.
   * Equivalent to calling dispose().
   *
   * @example
   * ```typescript
   * {
   *   using sharedTexture = SharedTexture.create(hw);
   *   // Use sharedTexture...
   * } // Automatically disposed
   * ```
   *
   * @see {@link dispose} For manual cleanup
   */
  [Symbol.dispose](): void {
    this.dispose();
  }
}
