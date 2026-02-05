import { AV_HWFRAME_MAP_READ, AV_HWFRAME_MAP_WRITE, AV_PIX_FMT_BGRA, AV_PIX_FMT_NONE } from '../../constants/constants.js';
import { FFmpegError } from '../../lib/error.js';
import { Frame } from '../../lib/frame.js';
import { HardwareFramesContext } from '../../lib/hardware-frames-context.js';
import { PixelFormatUtils } from './pixel-format.js';

import type { AVPixelFormat } from '../../constants/constants.js';
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
 * Electron textureInfo object.
 *
 * Contains GPU texture metadata and platform-specific handle for zero-copy frame import.
 */
export interface TextureInfo {
  pixelFormat: string;
  codedSize: { width: number; height: number };
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
  private _isDisposed = false;

  // Mapping context cache for mapTo() helper
  private _mappingCtx: HardwareFramesContext | null = null;
  private _mappingHw: HardwareContext | null = null;

  private constructor(hardware: HardwareContext, options: SharedTextureOptions) {
    this._hardware = hardware;
    this._swFormat = options.swFormat ?? AV_PIX_FMT_BGRA;
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

    return this.importFromHandle(handle, width, height, swFormat, options);
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
   * const vaapiHw = await HardwareContext.create(AV_HWDEVICE_TYPE_VAAPI);
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
    // Re-create if target hardware changed or dimensions changed
    if (this._mappingHw !== targetHw || this._mappingCtx?.width !== srcFrame.width || this._mappingCtx?.height !== srcFrame.height) {
      // Free previous context
      if (this._mappingCtx) {
        this._mappingCtx.free();
        this._mappingCtx = null;
      }

      // Create new mapping context for target hardware
      const ctx = new HardwareFramesContext();
      ctx.alloc(targetHw.deviceContext);
      ctx.format = targetHw.devicePixelFormat;
      ctx.swFormat = srcFrame.format as AVPixelFormat; // Use source format
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
   * @returns Hardware Frame referencing the GPU texture
   *
   * @internal
   */
  private importFromHandle(handle: SharedTextureHandle, width: number, height: number, swFormat: AVPixelFormat, options: TextureFrameOptions): Frame {
    // macOS — IOSurface
    if (handle.ioSurface && handle.ioSurface.length > 0) {
      const framesCtx = this.ensureFramesContext(width, height, swFormat);
      return Frame.fromIOSurface(handle.ioSurface, {
        hwFramesCtx: framesCtx,
        pts: options.pts,
        timeBase: options.timeBase,
      });
    }

    // Windows — D3D11 shared texture
    if (handle.ntHandle && handle.ntHandle.length > 0) {
      return Frame.fromD3D11Texture(handle.ntHandle, {
        hwDeviceCtx: this._hardware.deviceContext,
        pts: options.pts,
        timeBase: options.timeBase,
      });
    }

    // Linux — DMA-BUF
    if (handle.nativePixmap) {
      const dmaBuf: DmaBufPlanes = {
        planes: handle.nativePixmap.planes,
        modifier: handle.nativePixmap.modifier,
      };
      return Frame.fromDmaBuf(dmaBuf, {
        width,
        height,
        swFormat,
        pts: options.pts,
        timeBase: options.timeBase,
      });
    }

    throw new Error('SharedTexture: no valid handle found (expected ioSurface, ntHandle, or nativePixmap)');
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
