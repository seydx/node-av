import { bindings } from './binding.js';
import { HardwareDeviceContext } from './hardware-device-context.js';

import type { AVHWFrameTransferDirection, AVPixelFormat } from '../constants/constants.js';
import type { Frame } from './frame.js';
import type { NativeHardwareFramesContext, NativeWrapper } from './native-types.js';

/**
 * Hardware frames context for GPU memory management.
 *
 * Manages pools of hardware frames (textures/surfaces) on the GPU.
 * Essential for zero-copy hardware acceleration, allowing frames to stay
 * in GPU memory throughout the processing pipeline. Provides frame allocation,
 * format conversion, and data transfer between hardware and system memory.
 *
 * Direct mapping to FFmpeg's AVHWFramesContext.
 *
 * @example
 * ```typescript
 * import { HardwareFramesContext, HardwareDeviceContext, Frame, FFmpegError } from 'node-av';
 * import { AV_PIX_FMT_NV12, AV_PIX_FMT_CUDA, AV_HWDEVICE_TYPE_CUDA } from 'node-av/constants';
 *
 * // Create hardware frames context
 * const device = new HardwareDeviceContext();
 * device.create(AV_HWDEVICE_TYPE_CUDA);
 *
 * const frames = new HardwareFramesContext();
 * frames.format = AV_PIX_FMT_CUDA;     // Hardware format
 * frames.swFormat = AV_PIX_FMT_NV12;   // Software format
 * frames.width = 1920;
 * frames.height = 1080;
 * frames.initialPoolSize = 20;         // Pre-allocate 20 frames
 *
 * frames.alloc(device);
 * const ret = frames.init();
 * FFmpegError.throwIfError(ret, 'init');
 *
 * // Allocate hardware frame
 * const hwFrame = new Frame();
 * const ret2 = frames.getBuffer(hwFrame, 0);
 * FFmpegError.throwIfError(ret2, 'getBuffer');
 *
 * // Transfer from CPU to GPU
 * const cpuFrame = new Frame();
 * // ... fill cpuFrame with data ...
 * await frames.transferData(hwFrame, cpuFrame);
 *
 * // Map hardware frame to CPU for access
 * const mappedFrame = new Frame();
 * const ret3 = frames.map(mappedFrame, hwFrame, AV_HWFRAME_MAP_READ);
 * FFmpegError.throwIfError(ret3, 'map');
 * ```
 *
 * @see [AVHWFramesContext](https://ffmpeg.org/doxygen/trunk/structAVHWFramesContext.html) - FFmpeg Doxygen
 * @see {@link HardwareDeviceContext} For device management
 * @see {@link Frame} For frame operations
 */
export class HardwareFramesContext implements Disposable, NativeWrapper<NativeHardwareFramesContext> {
  private native: NativeHardwareFramesContext;

  constructor() {
    this.native = new bindings.HardwareFramesContext();
  }

  /**
   * Hardware pixel format.
   *
   * The pixel format used for frames in GPU memory.
   * Hardware-specific format like AV_PIX_FMT_CUDA or AV_PIX_FMT_VAAPI.
   *
   * Direct mapping to AVHWFramesContext->format.
   */
  get format(): AVPixelFormat {
    return this.native.format;
  }

  set format(value: AVPixelFormat) {
    this.native.format = value;
  }

  /**
   * Software pixel format.
   *
   * The pixel format frames are converted to when transferred
   * to system memory. Standard format like AV_PIX_FMT_YUV420P.
   *
   * Direct mapping to AVHWFramesContext->sw_format.
   */
  get swFormat(): AVPixelFormat {
    return this.native.swFormat;
  }

  set swFormat(value: AVPixelFormat) {
    this.native.swFormat = value;
  }

  /**
   * Frame width.
   *
   * Width of frames in pixels.
   *
   * Direct mapping to AVHWFramesContext->width.
   */
  get width(): number {
    return this.native.width;
  }

  set width(value: number) {
    this.native.width = value;
  }

  /**
   * Frame height.
   *
   * Height of frames in pixels.
   *
   * Direct mapping to AVHWFramesContext->height.
   */
  get height(): number {
    return this.native.height;
  }

  set height(value: number) {
    this.native.height = value;
  }

  /**
   * Initial pool size.
   *
   * Number of frames to pre-allocate in the pool.
   * Set before calling init() for optimal performance.
   *
   * Direct mapping to AVHWFramesContext->initial_pool_size.
   */
  get initialPoolSize(): number {
    return this.native.initialPoolSize;
  }

  set initialPoolSize(value: number) {
    this.native.initialPoolSize = value;
  }

  /**
   * Associated hardware device.
   *
   * Reference to the device context this frames context belongs to.
   * Automatically set when calling alloc().
   *
   * Direct mapping to AVHWFramesContext->device_ref.
   */
  get deviceRef(): HardwareDeviceContext | null {
    // Not cached: device_ref is unset before alloc(), and the native wrapper holds
    // its own AVBufferRef, so a fresh wrapper per access is safe
    const native = this.native.deviceRef;
    if (!native) {
      return null;
    }

    const device = Object.create(HardwareDeviceContext.prototype) as HardwareDeviceContext;
    (device as any).native = native;
    return device;
  }

  /**
   * Allocate hardware frames context.
   *
   * Allocates the frames context and associates it with a device.
   * Must be called before init().
   *
   * Direct mapping to av_hwframe_ctx_alloc().
   *
   * @param device - Hardware device context to use
   *
   * @throws {Error} If allocation fails (ENOMEM)
   *
   * @example
   * ```typescript
   * import { AV_PIX_FMT_CUDA, AV_PIX_FMT_NV12 } from 'node-av/constants';
   *
   * const frames = new HardwareFramesContext();
   * frames.format = AV_PIX_FMT_CUDA;
   * frames.swFormat = AV_PIX_FMT_NV12;
   * frames.width = 1920;
   * frames.height = 1080;
   * frames.alloc(device);
   * ```
   *
   * @see {@link init} To initialize after allocation
   */
  alloc(device: HardwareDeviceContext): void {
    this.native.alloc(device.getNative());
  }

  /**
   * Initialize hardware frames context.
   *
   * Initializes the frame pool after configuration.
   * Must be called after alloc() and property setup.
   *
   * Direct mapping to av_hwframe_ctx_init().
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR_ENOMEM: Memory allocation failure
   *   - AVERROR_ENOSYS: Operation not supported
   *   - Hardware-specific errors
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * frames.alloc(device);
   * const ret = frames.init();
   * FFmpegError.throwIfError(ret, 'init');
   * ```
   *
   * @see {@link alloc} Must be called first
   */
  init(): number {
    return this.native.init();
  }

  /**
   * Free hardware frames context.
   *
   * Releases all frames and resources associated with the context.
   * The context becomes invalid after calling this.
   *
   * Direct mapping to av_buffer_unref() on frames context.
   *
   * @example
   * ```typescript
   * frames.free();
   * // Frames context is now invalid
   * ```
   *
   * @see {@link Symbol.dispose} For automatic cleanup
   */
  free(): void {
    this.native.free();
  }

  /**
   * Allocate hardware frame from pool.
   *
   * Gets a frame from the hardware frame pool.
   * The frame will have hardware-backed storage.
   *
   * Direct mapping to av_hwframe_get_buffer().
   *
   * @param frame - Frame to allocate buffer for
   *
   * @param flags - Allocation flags (usually 0)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: No frames available in pool
   *   - AVERROR_EINVAL: Invalid parameters
   *
   * @example
   * ```typescript
   * import { Frame, FFmpegError } from 'node-av';
   *
   * const hwFrame = new Frame();
   * const ret = frames.getBuffer(hwFrame, 0);
   * FFmpegError.throwIfError(ret, 'getBuffer');
   * // hwFrame now has GPU memory allocated
   * ```
   *
   * @see {@link transferData} To upload data to hardware frame
   */
  getBuffer(frame: Frame, flags?: number): number {
    return this.native.getBuffer(frame.getNative(), flags ?? 0);
  }

  /**
   * Transfer data between hardware and system memory.
   *
   * Copies frame data between GPU and CPU memory.
   * Direction is determined by frame types.
   *
   * Direct mapping to av_hwframe_transfer_data().
   *
   * @param dst - Destination frame
   *
   * @param src - Source frame
   *
   * @param flags - Transfer flags (usually 0)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR_ENOSYS: Transfer not supported
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Upload: CPU -> GPU
   * const cpuFrame = new Frame();
   * // ... fill cpuFrame with data ...
   * const hwFrame = new Frame();
   * frames.getBuffer(hwFrame, 0);
   * const ret = await frames.transferData(hwFrame, cpuFrame);
   * FFmpegError.throwIfError(ret, 'transferData');
   *
   * // Download: GPU -> CPU
   * const downloadFrame = new Frame();
   * const ret2 = await frames.transferData(downloadFrame, hwFrame);
   * FFmpegError.throwIfError(ret2, 'transferData');
   * ```
   *
   * @see {@link getBuffer} To allocate hardware frame
   * @see {@link map} For zero-copy access
   */
  async transferData(dst: Frame, src: Frame, flags?: number): Promise<number> {
    return await this.native.transferData(dst.getNative(), src.getNative(), flags ?? 0);
  }

  /**
   * Transfer frame between hardware and system memory synchronously.
   * Synchronous version of transferData.
   *
   * Copies frame data between GPU and CPU memory.
   * Direction depends on frame types (hardware vs software).
   *
   * Direct mapping to av_hwframe_transfer_data().
   *
   * @param dst - Destination frame
   *
   * @param src - Source frame
   *
   * @param flags - Transfer flags (currently unused, pass 0)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid frames
   *   - AVERROR_ENOSYS: Operation not supported
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { Frame, FFmpegError } from 'node-av';
   *
   * // Download from GPU to CPU
   * const cpuFrame = new Frame();
   * cpuFrame.format = frames.swFormat;
   * cpuFrame.width = frames.width;
   * cpuFrame.height = frames.height;
   * cpuFrame.allocBuffer();
   *
   * const ret = frames.transferDataSync(cpuFrame, hwFrame);
   * FFmpegError.throwIfError(ret, 'transferDataSync');
   *
   * // Upload from CPU to GPU
   * const ret2 = frames.transferDataSync(hwFrame, cpuFrame);
   * FFmpegError.throwIfError(ret2, 'transferDataSync');
   * ```
   *
   * @see {@link transferData} For async version
   */
  transferDataSync(dst: Frame, src: Frame, flags?: number): number {
    return this.native.transferDataSync(dst.getNative(), src.getNative(), flags ?? 0);
  }

  /**
   * Get supported transfer formats.
   *
   * Returns pixel formats supported for frame transfer
   * in the specified direction.
   *
   * Direct mapping to av_hwframe_transfer_get_formats().
   *
   * @param direction - Transfer direction (FROM/TO hardware)
   *
   * @returns Array of supported formats, or error code:
   *   - AVERROR_ENOSYS: Query not supported
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { AV_HWFRAME_TRANSFER_DIRECTION_FROM } from 'node-av/constants';
   *
   * const formats = frames.transferGetFormats(AV_HWFRAME_TRANSFER_DIRECTION_FROM);
   * if (Array.isArray(formats)) {
   *   console.log('Supported download formats:', formats);
   * } else {
   *   console.error('Error querying formats:', formats);
   * }
   * ```
   */
  transferGetFormats(direction: AVHWFrameTransferDirection): AVPixelFormat[] | number {
    return this.native.transferGetFormats(direction);
  }

  /**
   * Map hardware frame to system memory.
   *
   * Creates a mapping of hardware frame data accessible from CPU.
   * More efficient than transferData() for read-only access.
   *
   * Direct mapping to av_hwframe_map().
   *
   * @param dst - Destination frame for mapped data
   *
   * @param src - Hardware frame to map
   *
   * @param flags - Mapping flags (AV_HWFRAME_MAP_*)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR_ENOSYS: Mapping not supported
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AV_HWFRAME_MAP_READ } from 'node-av/constants';
   *
   * const mappedFrame = new Frame();
   * const ret = frames.map(mappedFrame, hwFrame, AV_HWFRAME_MAP_READ);
   * FFmpegError.throwIfError(ret, 'map');
   * // Can now read hwFrame data through mappedFrame
   * ```
   *
   * @see {@link transferData} For full data copy
   */
  map(dst: Frame, src: Frame, flags?: number): number {
    return this.native.map(dst.getNative(), src.getNative(), flags ?? 0);
  }

  /**
   * Create derived frames context.
   *
   * Creates a new frames context derived from another,
   * potentially on a different device.
   *
   * Direct mapping to av_hwframe_ctx_create_derived().
   *
   * @param format - Pixel format for derived frames
   *
   * @param derivedDevice - Target device context
   *
   * @param source - Source frames context
   *
   * @param flags - Creation flags
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid parameters
   *   - AVERROR_ENOSYS: Derivation not supported
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AV_PIX_FMT_VULKAN } from 'node-av/constants';
   *
   * const derivedFrames = new HardwareFramesContext();
   * const ret = derivedFrames.createDerived(
   *   AV_PIX_FMT_VULKAN,
   *   vulkanDevice,
   *   cudaFrames,
   *   0
   * );
   * FFmpegError.throwIfError(ret, 'createDerived');
   * ```
   */
  createDerived(format: AVPixelFormat, derivedDevice: HardwareDeviceContext, source: HardwareFramesContext, flags?: number): number {
    return this.native.createDerived(format, derivedDevice.getNative(), source.native, flags ?? 0);
  }

  /**
   * Get the underlying native HardwareFramesContext object.
   *
   * @returns The native HardwareFramesContext binding object
   *
   * @internal
   */
  getNative(): NativeHardwareFramesContext {
    return this.native;
  }

  /**
   * Dispose of the hardware frames context.
   *
   * Implements the Disposable interface for automatic cleanup.
   * Equivalent to calling free().
   *
   * @example
   * ```typescript
   * {
   *   using frames = new HardwareFramesContext();
   *   frames.alloc(device);
   *   frames.init();
   *   // Use frames...
   * } // Automatically freed when leaving scope
   * ```
   */
  [Symbol.dispose](): void {
    this.native[Symbol.dispose]();
  }
}
