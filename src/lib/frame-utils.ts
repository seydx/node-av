import { bindings } from './binding.js';

import type { NativeFrameUtils } from './native-types.js';

/**
 * Image output format
 */
export type ImageOutputFormat = 'nv12' | 'yuv420p' | 'rgb' | 'rgba' | 'gray';

/**
 * Image cropping options
 */
export interface ImageCrop {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Image resizing options
 */
export interface ImageResize {
  width: number;
  height: number;
}

/**
 * Image format conversion options
 */
export interface ImageFormat {
  to: ImageOutputFormat;
}

/**
  Image processing options
 */
export interface ImageOptions {
  format?: ImageFormat;
  crop?: ImageCrop;
  resize?: ImageResize;
}

/**
 * Frame processing utilities with persistent native frame pools.
 *
 * Provides efficient crop, scale, and format conversion operations
 * with minimal JavaScript/C++ boundary crossings.
 *
 * @example
 * ```typescript
 * // Create processor for 320x180 NV12 input
 * const processor = new FrameUtils(320, 180);
 *
 * // Process frame with crop and resize
 * const output = processor.process(inputBuffer, {
 *   crop: { left: 10, top: 10, width: 100, height: 100 },
 *   resize: { width: 200, height: 200 },
 *   format: { to: 'rgba' }
 * });
 *
 * // Clean up when done
 * processor.close();
 * ```
 */
export class FrameUtils implements Disposable {
  private native: NativeFrameUtils;
  private disposed = false;

  /**
   * Create a new FrameUtils processor.
   *
   * @param width - Input frame width (must be consistent for all frames)
   *
   * @param height - Input frame height (must be consistent for all frames)
   */
  constructor(width: number, height: number) {
    this.native = new bindings.FrameUtils(width, height);
  }

  /**
   * Process a frame with the specified options.
   *
   * @param buffer - Input buffer containing NV12 frame data
   *
   * @param options - Processing options
   *
   * @returns Processed frame as a Buffer
   *
   * @example
   * ```typescript
   * // Simple resize
   * const resized = processor.process(input, {
   *   resize: { width: 640, height: 480 }
   * });
   *
   * // Crop and convert to RGB
   * const cropped = processor.process(input, {
   *   crop: { left: 100, top: 100, width: 200, height: 200 },
   *   format: { to: 'rgb' }
   * });
   * ```
   */
  process(buffer: Buffer, options: ImageOptions = {}): Buffer {
    if (this.disposed) {
      throw new Error('FrameUtils instance has been disposed');
    }
    return this.native.process(buffer, options);
  }

  /**
   * Close and release all resources.
   *
   * Frees all pooled frames and SWS contexts.
   *
   * @example
   * ```typescript
   * processor.close();
   * ```
   */
  close(): void {
    if (!this.disposed) {
      this.native.close();
      this.disposed = true;
    }
  }

  /**
   * Dispose of the processor.
   *
   * Called automatically when using `using` statements.
   *
   * @example
   * ```typescript
   * using processor = new FrameUtils(320, 180);
   * // Use processor...
   * // Automatically disposed at the end of the block
   * ```
   */
  [Symbol.dispose](): void {
    this.close();
  }
}
