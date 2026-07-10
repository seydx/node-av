import {
  AV_CODEC_FLAG_QSCALE,
  AV_HWDEVICE_TYPE_OPENCL,
  AV_PIX_FMT_GRAY8,
  AV_PIX_FMT_NV12,
  AV_PIX_FMT_RGB24,
  AV_PIX_FMT_RGBA,
  AV_PIX_FMT_YUV420P,
  AVCOL_RANGE_JPEG,
  FF_QP2LAMBDA,
  SWS_BILINEAR,
} from '../constants/constants.js';
import { FF_ENCODER_MJPEG, FF_ENCODER_PNG } from '../constants/encoders.js';
import { bindings } from '../lib/binding.js';
import { FFmpegError } from '../lib/error.js';
import { Frame } from '../lib/frame.js';
import { EncoderPool, Mutex } from './encoder-pool.js';
import { FilterPreset } from './filter-presets.js';
import { FilterAPI } from './filter.js';

import type { AVPixelFormat, SwsFlags } from '../constants/index.js';
import type { NativeScaler } from '../lib/native-types.js';
import type { HardwareContext } from './hardware.js';

/**
 * Output pixel format for scaled images.
 */
export type ScaledImageFormat = 'rgb' | 'rgba' | 'gray' | 'nv12' | 'yuv420p';

/**
 * Crop region in source pixel coordinates.
 */
export interface ScalerCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Target dimensions for scaling.
 */
export interface ScalerResize {
  width: number;
  height: number;
}

/**
 * Options for a single scale/crop/convert operation.
 */
export interface ScaleOptions {
  /** Optional crop applied before scaling (source pixel coordinates). */
  crop?: ScalerCrop;
  /** Optional target dimensions. Omit to keep the (cropped) source size. */
  resize?: ScalerResize;
  /** Optional output pixel format. Omit to keep the source format. */
  format?: ScaledImageFormat;
}

/**
 * Options for encoding a frame to JPEG.
 */
export interface JpegOptions {
  /** Optional crop applied before scaling (source pixel coordinates). */
  crop?: ScalerCrop;
  /** Optional target dimensions. Omit to keep the (cropped) source size. */
  resize?: ScalerResize;
  /** JPEG quality from 1 (smallest, lowest quality) to 100 (best). Default 90. */
  quality?: number;
}

/**
 * Options for encoding a frame to PNG.
 */
export interface PngOptions {
  /** Optional crop applied before scaling (source pixel coordinates). */
  crop?: ScalerCrop;
  /** Optional target dimensions. Omit to keep the (cropped) source size. */
  resize?: ScalerResize;
  /** Output color format. Default `'rgb'`. */
  format?: 'rgb' | 'rgba' | 'gray';
}

/**
 * Options for creating a {@link Scaler}.
 */
export interface ScalerOptions {
  /**
   * Hardware context. Required to process hardware frames - crop/scale/convert
   * then run on the GPU and only the small result is downloaded.
   */
  hardware?: HardwareContext | null;
  /** swscale algorithm flags (SWS_*) for the software path. Defaults to `SWS_BILINEAR`. */
  flags?: SwsFlags;
  /**
   * Maximum number of cached hardware filter graphs (one per distinct output
   * configuration). Least-recently-used graphs are evicted beyond this. Default 16.
   */
  maxCacheSize?: number;
}

const FORMAT_TO_PIXFMT: Record<ScaledImageFormat, AVPixelFormat> = {
  rgb: AV_PIX_FMT_RGB24,
  rgba: AV_PIX_FMT_RGBA,
  gray: AV_PIX_FMT_GRAY8,
  nv12: AV_PIX_FMT_NV12,
  yuv420p: AV_PIX_FMT_YUV420P,
};

/**
 * Last crop applied to a cached GPU graph, so identical crops skip a reconfigure.
 *
 * @internal
 */
interface AppliedCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Source frame parameters a cached graph was last fed with.
 *
 * @internal
 */
interface SourceSignature {
  width: number;
  height: number;
  format: number;
}

/**
 * A cached filter graph plus the crop currently configured on it and its
 * concurrency state.
 *
 * @internal
 */
interface HwGraphEntry {
  filter: FilterAPI;
  lastCrop: AppliedCrop | null;
  /** Parameters of the last processed frame; null until the graph saw a frame. */
  lastSrc: SourceSignature | null;
  /** Serializes crop command + process + receive per graph. */
  lock: Mutex;
  /** In-flight async scales holding this graph alive. */
  refs: number;
  /** Retired while in use; disposed by the last release instead. */
  evicted: boolean;
}

/**
 * A resolved cache entry plus the operation configuration that selected it.
 *
 * @internal
 */
interface ResolvedGraph {
  entry: HwGraphEntry;
  key: string;
  isHw: boolean;
  commandable: boolean;
  crop: ScalerCrop;
  outW: number;
  outH: number;
  format: ScaledImageFormat;
}

/**
 * High-level image scaler, cropper, and pixel-format converter.
 *
 * Scales, crops, and converts decoded frames to raw pixel buffers or encoded
 * JPEG/PNG images. Built for the detection/thumbnail/snapshot workload: one
 * instance pools its swscale contexts, GPU filter graphs, and encoders, so
 * reusing it for every frame and every crop avoids per-frame allocation.
 * Software frames are scaled with swscale; hardware frames are cropped, scaled,
 * and converted on the GPU with only the small result downloaded.
 *
 * Safe for concurrent use: calls that share a cached graph or pooled encoder are
 * serialized on that resource, while distinct output configurations run fully in
 * parallel, and cache eviction never disposes a resource that is still in flight.
 *
 * @example
 * ```typescript
 * import { Scaler } from 'node-av/api';
 *
 * using scaler = new Scaler({ hardware });
 *
 * // Scale + convert to RGB (on the GPU for hardware frames)
 * const rgb = await scaler.toBuffer(frame, { resize: { width: 640, height: 360 }, format: 'rgb' });
 *
 * // Crop a detected region and encode a snapshot
 * const jpeg = await scaler.toJpeg(frame, { crop: { x, y, width: w, height: h }, quality: 85 });
 * ```
 *
 * @see {@link EncoderPool} For pooled image encoders
 * @see {@link FilterAPI} For streaming filtergraphs
 */
export class Scaler implements Disposable {
  private native: NativeScaler;
  private syncNative?: NativeScaler;
  private nativeLock = new Mutex();
  private hardware?: HardwareContext | null;
  private flags: SwsFlags;
  private maxCacheSize: number;
  private graphs = new Map<string, HwGraphEntry>();
  private jpegPool?: EncoderPool<typeof FF_ENCODER_MJPEG>;
  private pngPool?: EncoderPool<typeof FF_ENCODER_PNG>;
  private disposed = false;

  /**
   * Create a new scaler.
   *
   * @param options - Scaler options
   *
   * @example
   * ```typescript
   * using scaler = new Scaler({ hardware: HardwareContext.auto() });
   * ```
   */
  constructor(options: ScalerOptions = {}) {
    this.flags = options.flags ?? SWS_BILINEAR;
    this.hardware = options.hardware;
    this.maxCacheSize = options.maxCacheSize ?? 16;
    this.native = new bindings.Scaler(this.flags);
  }

  /**
   * Scale, crop, and/or convert a frame and return the raw pixel data.
   *
   * The returned buffer is tightly packed (no row padding). For planar formats
   * (`nv12`, `yuv420p`) planes are concatenated.
   *
   * @param frame - Source frame (software or hardware; hardware frames are processed on the GPU and downloaded)
   *
   * @param options - Crop, resize, and format options
   *
   * @returns Tightly packed pixel data
   *
   * @throws {FFmpegError} If scaling fails
   *
   * @example
   * ```typescript
   * const gray = await scaler.toBuffer(frame, { resize: { width: 320, height: 180 }, format: 'gray' });
   * ```
   *
   * @see {@link toBufferSync} For synchronous version
   */
  async toBuffer(frame: Frame, options: ScaleOptions = {}): Promise<Buffer> {
    if (this.disposed) {
      throw new Error('Scaler has been disposed');
    }

    if (frame.isHwFrame()) {
      // With a hardware context, crop/scale/convert on the GPU and download only
      // the small result. Without one, fall back to downloading the full frame
      // and processing it in software.
      if (this.hardware) {
        const out = await this.toFrame(frame, options.crop, options.resize, options.format ?? 'nv12');
        try {
          return out.toBuffer();
        } finally {
          out.free();
        }
      }
      const sw = await this.downloadToSoftware(frame);
      try {
        return await this.processNative(sw, options);
      } finally {
        sw.free();
      }
    }

    return await this.processNative(frame, options);
  }

  /**
   * Scale, crop, and/or convert a frame and return the raw pixel data.
   * Synchronous version of toBuffer.
   *
   * @param frame - Source frame (software or hardware; hardware frames are processed on the GPU and downloaded)
   *
   * @param options - Crop, resize, and format options
   *
   * @returns Tightly packed pixel data
   *
   * @throws {FFmpegError} If scaling fails
   *
   * @example
   * ```typescript
   * const gray = scaler.toBufferSync(frame, { resize: { width: 320, height: 180 }, format: 'gray' });
   * ```
   *
   * @see {@link toBuffer} For async version
   */
  toBufferSync(frame: Frame, options: ScaleOptions = {}): Buffer {
    if (this.disposed) {
      throw new Error('Scaler has been disposed');
    }

    if (frame.isHwFrame()) {
      if (this.hardware) {
        const out = this.toFrameSync(frame, options.crop, options.resize, options.format ?? 'nv12');
        try {
          return out.toBuffer();
        } finally {
          out.free();
        }
      }
      const sw = this.downloadToSoftwareSync(frame);
      try {
        return this.getSyncNative().processSync(sw.getNative(), options);
      } finally {
        sw.free();
      }
    }

    return this.getSyncNative().processSync(frame.getNative(), options);
  }

  /**
   * Scale/crop a frame and encode it to a JPEG image.
   *
   * The encoder is pooled per output size and reused across calls - no encoder is
   * rebuilt per snapshot. Hardware frames are scaled on the GPU and downloaded;
   * software frames are scaled with swscale.
   *
   * @param frame - Source frame (software or hardware)
   *
   * @param options - Crop, resize, and quality options
   *
   * @returns Encoded JPEG bytes
   *
   * @throws {FFmpegError} If scaling or encoding fails
   *
   * @example
   * ```typescript
   * const jpeg = await scaler.toJpeg(frame, { resize: { width: 1280, height: 720 }, quality: 85 });
   * await writeFile('snapshot.jpg', jpeg);
   * ```
   *
   * @see {@link toJpegSync} For synchronous version
   */
  async toJpeg(frame: Frame, options: JpegOptions = {}): Promise<Buffer> {
    if (this.disposed) {
      throw new Error('Scaler has been disposed');
    }

    const quality = options.quality ?? 90;
    const downloaded = frame.isHwFrame() && !this.hardware ? await this.downloadToSoftware(frame) : null;
    try {
      // mjpeg wants planar YUV; tag it full-range so colors are correct without the
      // deprecated yuvj* formats.
      const out = await this.toFrame(downloaded ?? frame, options.crop, options.resize, 'yuv420p');
      try {
        this.prepareJpegFrame(out, quality);
        return await this.getJpegPool().encode(out);
      } finally {
        out.free();
      }
    } finally {
      downloaded?.free();
    }
  }

  /**
   * Scale/crop a frame and encode it to a JPEG image.
   * Synchronous version of toJpeg.
   *
   * @param frame - Source frame (software or hardware)
   *
   * @param options - Crop, resize, and quality options
   *
   * @returns Encoded JPEG bytes
   *
   * @throws {FFmpegError} If scaling or encoding fails
   *
   * @example
   * ```typescript
   * const jpeg = scaler.toJpegSync(frame, { resize: { width: 1280, height: 720 }, quality: 85 });
   * ```
   *
   * @see {@link toJpeg} For async version
   */
  toJpegSync(frame: Frame, options: JpegOptions = {}): Buffer {
    if (this.disposed) {
      throw new Error('Scaler has been disposed');
    }

    const quality = options.quality ?? 90;
    const downloaded = frame.isHwFrame() && !this.hardware ? this.downloadToSoftwareSync(frame) : null;
    try {
      const out = this.toFrameSync(downloaded ?? frame, options.crop, options.resize, 'yuv420p');
      try {
        this.prepareJpegFrame(out, quality);
        return this.getJpegPool().encodeSync(out);
      } finally {
        out.free();
      }
    } finally {
      downloaded?.free();
    }
  }

  /**
   * Scale/crop a frame and encode it to a PNG image.
   *
   * The encoder is pooled per output size/format and reused across calls. Hardware
   * frames are scaled on the GPU and downloaded; software frames use swscale.
   *
   * @param frame - Source frame (software or hardware)
   *
   * @param options - Crop, resize, and color-format options
   *
   * @returns Encoded PNG bytes
   *
   * @throws {FFmpegError} If scaling or encoding fails
   *
   * @example
   * ```typescript
   * const png = await scaler.toPng(frame, { crop: { x, y, width: w, height: h } });
   * await writeFile('region.png', png);
   * ```
   *
   * @see {@link toPngSync} For synchronous version
   */
  async toPng(frame: Frame, options: PngOptions = {}): Promise<Buffer> {
    if (this.disposed) {
      throw new Error('Scaler has been disposed');
    }

    const format = options.format ?? 'rgb';
    const downloaded = frame.isHwFrame() && !this.hardware ? await this.downloadToSoftware(frame) : null;
    try {
      const out = await this.toFrame(downloaded ?? frame, options.crop, options.resize, format);
      try {
        return await this.getPngPool().encode(out);
      } finally {
        out.free();
      }
    } finally {
      downloaded?.free();
    }
  }

  /**
   * Scale/crop a frame and encode it to a PNG image.
   * Synchronous version of toPng.
   *
   * @param frame - Source frame (software or hardware)
   *
   * @param options - Crop, resize, and color-format options
   *
   * @returns Encoded PNG bytes
   *
   * @throws {FFmpegError} If scaling or encoding fails
   *
   * @example
   * ```typescript
   * const png = scaler.toPngSync(frame, { crop: { x, y, width: w, height: h } });
   * ```
   *
   * @see {@link toPng} For async version
   */
  toPngSync(frame: Frame, options: PngOptions = {}): Buffer {
    if (this.disposed) {
      throw new Error('Scaler has been disposed');
    }

    const format = options.format ?? 'rgb';
    const downloaded = frame.isHwFrame() && !this.hardware ? this.downloadToSoftwareSync(frame) : null;
    try {
      const out = this.toFrameSync(downloaded ?? frame, options.crop, options.resize, format);
      try {
        return this.getPngPool().encodeSync(out);
      } finally {
        out.free();
      }
    } finally {
      downloaded?.free();
    }
  }

  /**
   * Release all pooled scaling contexts, graphs, and frames.
   *
   * @example
   * ```typescript
   * scaler.close();
   * ```
   */
  close(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    this.native.close();
    this.syncNative?.close();
    this.syncNative = undefined;

    // In-use graphs are retired, not disposed: the last in-flight scale disposes
    // them on release, so close() during concurrent calls never crashes them.
    for (const entry of this.graphs.values()) {
      this.retireEntry(entry);
    }

    this.graphs.clear();

    this.jpegPool?.close();
    this.jpegPool = undefined;

    this.pngPool?.close();
    this.pngPool = undefined;
  }

  /**
   * Download a hardware frame to system memory (no hardware context available).
   *
   * Allocates a fresh target per call - concurrent downloads must not share a
   * staging frame. The frame's own hwframe context selects a supported software
   * format. The caller frees the returned frame.
   *
   * @param frame - Hardware source frame
   *
   * @returns Software frame (caller frees)
   *
   * @throws {FFmpegError} If the transfer fails
   *
   * @internal
   */
  private async downloadToSoftware(frame: Frame): Promise<Frame> {
    const dst = new Frame();
    dst.alloc();
    const ret = await frame.hwframeTransferData(dst, 0);
    if (ret < 0) {
      dst.free();
    }
    FFmpegError.throwIfError(ret, 'Failed to download hardware frame');
    dst.copyProps(frame);
    return dst;
  }

  /**
   * Synchronous version of downloadToSoftware.
   *
   * @param frame - Hardware source frame
   *
   * @returns Software frame (caller frees)
   *
   * @throws {FFmpegError} If the transfer fails
   *
   * @internal
   */
  private downloadToSoftwareSync(frame: Frame): Frame {
    const dst = new Frame();
    dst.alloc();
    const ret = frame.hwframeTransferDataSync(dst, 0);
    if (ret < 0) {
      dst.free();
    }
    FFmpegError.throwIfError(ret, 'Failed to download hardware frame');
    dst.copyProps(frame);
    return dst;
  }

  /**
   * Run the pooled native software scaler, serialized per instance.
   *
   * The native scaler reuses staging frames and sws contexts per configuration;
   * overlapping async calls would race on them in the worker threads.
   *
   * @param frame - Software source frame
   *
   * @param options - Crop, resize, and format options
   *
   * @returns Tightly packed pixel data
   *
   * @throws {FFmpegError} If scaling fails
   *
   * @internal
   */
  private async processNative(frame: Frame, options: ScaleOptions): Promise<Buffer> {
    return await this.nativeLock.run(() => this.native.process(frame.getNative(), options));
  }

  /**
   * The native scaler used by the sync path (lazily created).
   *
   * Sync calls block the event loop but can land while an async call's worker is
   * scaling in the background; a separate native instance keeps them off the async
   * scaler's pooled contexts, which are not safe to share across threads.
   *
   * @returns The sync-path native scaler
   *
   * @internal
   */
  private getSyncNative(): NativeScaler {
    this.syncNative ??= new bindings.Scaler(this.flags);
    return this.syncNative;
  }

  /**
   * Scale/crop/convert a frame through a cached filter graph and return the
   * resulting frame (caller must free it).
   *
   * Software frames are scaled with swscale filters; hardware frames are
   * cropped/scaled/converted on the GPU and downloaded. The crop region is
   * reconfigured per frame via a runtime command on a graph shared per output
   * size (except OpenCL, where the crop is baked in).
   *
   * @param frame - Source frame (software, or hardware with a hardware context)
   *
   * @param crop - Crop region, or undefined for the full frame
   *
   * @param resize - Target dimensions, or undefined to keep the cropped size
   *
   * @param format - Output pixel format
   *
   * @returns The scaled output frame (caller frees)
   *
   * @throws {Error} If the crop is out of bounds or the graph produces no frame
   *
   * @internal
   */
  private async toFrame(frame: Frame, crop: ScalerCrop | undefined, resize: ScalerResize | undefined, format: ScaledImageFormat): Promise<Frame> {
    // Retry loop: an entry can be retired while we queue on its lock (QSV flush
    // eviction, mid-stream failure, or LRU pressure from concurrent calls). The
    // next attempt then resolves a freshly built graph.
    for (;;) {
      if (this.disposed) {
        throw new Error('Scaler has been disposed');
      }

      const acq = this.resolveGraph(frame, crop, resize, format);
      const { entry, key } = acq;

      // Hold the entry across the awaits below: eviction of an in-use graph is
      // deferred to releaseGraph(), never disposing it mid-scale.
      entry.refs++;
      try {
        // Serialize crop command + process + receive per graph: concurrent scales
        // on the same output config would otherwise interleave on one FilterAPI
        // and hand frames to the wrong caller.
        const out = await entry.lock.run(async () => {
          if (entry.evicted) {
            return null; // Retired while we queued - retry with a fresh graph
          }
          this.prepareGraph(acq, frame);
          try {
            await entry.filter.process(frame);
            let received = await entry.filter.receive();
            if (!(received instanceof Frame)) {
              // Some hardware scalers (notably QSV's vpp_qsv) buffer internally and don't
              // emit a frame synchronously after a single input - the buffersink returns
              // EAGAIN. Flush to force the pending frame out, then evict the now-EOF'd
              // graph so the next call rebuilds it. Zero-latency scalers (scale_vaapi,
              // scale_vt) deliver on the first receive and never hit this path.
              await entry.filter.flush();
              received = await entry.filter.receive();
              this.evictGraph(key, entry);
            }
            if (!(received instanceof Frame)) {
              throw new Error('Scaler: filter produced no frame');
            }
            return received;
          } catch (error) {
            // The graph is in an unknown mid-stream state; retire it so the next
            // call rebuilds instead of inheriting the wreckage.
            this.evictGraph(key, entry);
            throw error;
          }
        });
        if (out) {
          return out;
        }
      } finally {
        this.releaseGraph(entry);
      }
    }
  }

  /**
   * Synchronous version of toFrame.
   *
   * Sync scales cannot interleave with each other (they block the event loop),
   * but they can land between the awaits of an in-flight async scale; a busy
   * cached graph is bypassed with a throwaway graph in that case.
   *
   * @param frame - Source frame (software, or hardware with a hardware context)
   *
   * @param crop - Crop region, or undefined for the full frame
   *
   * @param resize - Target dimensions, or undefined to keep the cropped size
   *
   * @param format - Output pixel format
   *
   * @returns The scaled output frame (caller frees)
   *
   * @internal
   */
  private toFrameSync(frame: Frame, crop: ScalerCrop | undefined, resize: ScalerResize | undefined, format: ScaledImageFormat): Frame {
    const acq = this.resolveGraph(frame, crop, resize, format);
    const { entry, key } = acq;

    if (entry.refs > 0) {
      return this.scaleOneShotSync(frame, acq);
    }

    this.prepareGraph(acq, frame);
    try {
      entry.filter.processSync(frame);
      let out = entry.filter.receiveSync();
      if (!(out instanceof Frame)) {
        // See toFrame: QSV's vpp_qsv buffers a frame; flush to drain it and evict
        // the now-EOF'd graph so the next call rebuilds.
        entry.filter.flushSync();
        out = entry.filter.receiveSync();
        this.evictGraph(key, entry);
      }
      if (!(out instanceof Frame)) {
        throw new Error('Scaler: filter produced no frame');
      }
      return out;
    } catch (error) {
      this.evictGraph(key, entry);
      throw error;
    }
  }

  /**
   * Scale through a throwaway graph with the crop baked in, bypassing the cache.
   *
   * @param frame - Source frame
   *
   * @param acq - Resolved operation configuration
   *
   * @returns The scaled output frame (caller frees)
   *
   * @throws {Error} If the graph produces no frame
   *
   * @internal
   */
  private scaleOneShotSync(frame: Frame, acq: ResolvedGraph): Frame {
    const filter = FilterAPI.create(this.buildGraph(acq.isHw, acq.outW, acq.outH, acq.format, acq.crop, false), acq.isHw ? { hardware: this.hardware } : {});
    try {
      filter.processSync(frame);
      let out = filter.receiveSync();
      if (!(out instanceof Frame)) {
        filter.flushSync();
        out = filter.receiveSync();
      }
      if (!(out instanceof Frame)) {
        throw new Error('Scaler: filter produced no frame');
      }
      return out;
    } finally {
      filter[Symbol.dispose]();
    }
  }

  /**
   * Resolve (and, on demand, build) the cached filter graph for a frame. Shared
   * by the sync and async scaling paths; all of this work is synchronous, so a
   * resolved entry cannot be evicted before the caller marks it in use.
   *
   * @param frame - Source frame (software, or hardware with a hardware context)
   *
   * @param crop - Crop region, or undefined for the full frame
   *
   * @param resize - Target dimensions, or undefined to keep the cropped size
   *
   * @param format - Output pixel format
   *
   * @returns The cached graph entry and the resolved operation configuration
   *
   * @throws {Error} If the crop is out of bounds
   *
   * @internal
   */
  private resolveGraph(frame: Frame, crop: ScalerCrop | undefined, resize: ScalerResize | undefined, format: ScaledImageFormat): ResolvedGraph {
    const isHw = frame.isHwFrame();
    if (isHw && !this.hardware) {
      throw new Error('Scaler received a hardware frame but was created without a HardwareContext');
    }

    const cropW = crop?.width ?? frame.width;
    const cropH = crop?.height ?? frame.height;
    const cropX = crop?.x ?? 0;
    const cropY = crop?.y ?? 0;

    if (cropX < 0 || cropY < 0 || cropW <= 0 || cropH <= 0 || cropX + cropW > frame.width || cropY + cropH > frame.height) {
      throw new Error(`Scaler: crop region {x:${cropX}, y:${cropY}, width:${cropW}, height:${cropH}} is out of bounds for ${frame.width}x${frame.height} frame`);
    }

    const outW = resize?.width ?? cropW;
    const outH = resize?.height ?? cropH;

    // The standard `crop` filter is runtime-commandable for software frames and on
    // every hardware backend except OpenCL (where crop is folded into scale_opencl).
    // When commandable we share one graph per output size and re-aim the crop per
    // frame; otherwise the crop is baked in and the key must include it.
    const commandable = !isHw || this.hardware!.deviceType !== AV_HWDEVICE_TYPE_OPENCL;
    const prefix = isHw ? 'hw' : 'sw';
    const key = commandable ? `${prefix}_${outW}x${outH}_${format}` : `${prefix}_${cropX},${cropY},${cropW},${cropH}->${outW}x${outH}_${format}`;

    const cropRegion: ScalerCrop = { x: cropX, y: cropY, width: cropW, height: cropH };

    let entry = this.graphs.get(key);
    if (!entry) {
      // Bake the first crop in as the graph default: the graph initializes lazily
      // on the first processed frame, before any command can be sent, so the
      // initial crop must already be in place. Later crops use sendCommand.
      const filter = FilterAPI.create(this.buildGraph(isHw, outW, outH, format, cropRegion, commandable), isHw ? { hardware: this.hardware } : {});
      entry = { filter, lastCrop: commandable ? { x: cropX, y: cropY, w: cropW, h: cropH } : null, lastSrc: null, lock: new Mutex(), refs: 0, evicted: false };
      this.cacheSet(key, entry);
    } else {
      // Bump LRU recency.
      this.graphs.delete(key);
      this.graphs.set(key, entry);
    }

    return { entry, key, isHw, commandable, crop: cropRegion, outW, outH, format };
  }

  /**
   * Bring a cached graph in line with the current call. Must run under the entry
   * lock (async path) or with no async call in flight (sync path).
   *
   * Rebuilds the graph when the source parameters changed: FilterAPI would
   * otherwise reinitialize itself from the original graph description, silently
   * resurrecting the crop baked in at build time instead of the current one. A
   * graph that has not seen a frame yet is likewise rebuilt when the crop
   * differs, because commands cannot be sent before initialization. Otherwise a
   * changed crop is re-aimed with runtime commands - identical crops reuse the
   * graph untouched (no config_input/config_output re-run).
   *
   * @param acq - Resolved graph and operation configuration
   *
   * @param frame - Frame about to be processed
   *
   * @internal
   */
  private prepareGraph(acq: ResolvedGraph, frame: Frame): void {
    const { entry, isHw, commandable, crop, outW, outH, format } = acq;

    const src = entry.lastSrc;
    const srcChanged = src !== null && (src.width !== frame.width || src.height !== frame.height || src.format !== frame.format);
    const c = entry.lastCrop;
    const cropChanged = commandable && (c?.x !== crop.x || c?.y !== crop.y || c?.w !== crop.width || c?.h !== crop.height);

    if (srcChanged || (cropChanged && src === null)) {
      entry.filter[Symbol.dispose]();
      entry.filter = FilterAPI.create(this.buildGraph(isHw, outW, outH, format, crop, commandable), isHw ? { hardware: this.hardware } : {});
      entry.lastCrop = commandable ? { x: crop.x, y: crop.y, w: crop.width, h: crop.height } : null;
    } else if (cropChanged) {
      // w/h are validated against the input dims (in resolveGraph); x/y are clamped
      // per frame by the crop filter, so this order never produces a transient error.
      entry.filter.sendCommand('crop@sc', 'w', String(crop.width));
      entry.filter.sendCommand('crop@sc', 'h', String(crop.height));
      entry.filter.sendCommand('crop@sc', 'x', String(crop.x));
      entry.filter.sendCommand('crop@sc', 'y', String(crop.y));
      entry.lastCrop = { x: crop.x, y: crop.y, w: crop.width, h: crop.height };
    }

    entry.lastSrc = { width: frame.width, height: frame.height, format: frame.format };
  }

  /**
   * Remove a graph from the cache and retire it.
   *
   * Identity-checked so a newer graph cached under the same key is left alone.
   * Used after a flush (the graph is at EOF and can no longer accept frames) and
   * after mid-stream failures, so the next operation rebuilds it.
   *
   * @param key - Cache key of the graph
   *
   * @param entry - The exact entry to evict
   *
   * @internal
   */
  private evictGraph(key: string, entry: HwGraphEntry): void {
    if (this.graphs.get(key) === entry) {
      this.graphs.delete(key);
    }
    this.retireEntry(entry);
  }

  /**
   * Take a graph out of service, disposing it now or on last release.
   *
   * An entry with in-flight scales is only marked; the final {@link releaseGraph}
   * disposes the filter once nothing uses it anymore.
   *
   * @param entry - Entry removed from the cache
   *
   * @internal
   */
  private retireEntry(entry: HwGraphEntry): void {
    entry.evicted = true;
    if (entry.refs === 0) {
      entry.filter[Symbol.dispose]();
    }
  }

  /**
   * Drop an in-flight reference, disposing the graph if it was retired meanwhile.
   *
   * @param entry - Entry acquired by {@link toFrame}
   *
   * @internal
   */
  private releaseGraph(entry: HwGraphEntry): void {
    entry.refs--;
    if (entry.refs === 0 && entry.evicted) {
      entry.filter[Symbol.dispose]();
    }
  }

  /**
   * Tag a frame for MJPEG encoding: full color range and a per-frame quality.
   *
   * MJPEG quality is carried on the frame (the encoder pool sets the QSCALE flag),
   * so one pooled encoder serves every quality for a given output size.
   *
   * @param frame - Frame about to be JPEG-encoded
   *
   * @param quality - Quality from 1 (worst) to 100 (best)
   *
   * @internal
   */
  private prepareJpegFrame(frame: Frame, quality: number): void {
    frame.colorRange = AVCOL_RANGE_JPEG;
    const q = Math.max(1, Math.min(100, quality));
    const qscale = Math.max(2, Math.min(31, Math.round(2 + ((100 - q) / 99) * 29)));
    frame.quality = qscale * FF_QP2LAMBDA;
  }

  /**
   * The lazily created MJPEG encoder pool (QSCALE flag set for per-frame quality).
   *
   * @returns The JPEG encoder pool
   *
   * @internal
   */
  private getJpegPool(): EncoderPool<typeof FF_ENCODER_MJPEG> {
    this.jpegPool ??= new EncoderPool(FF_ENCODER_MJPEG, { maxSize: this.maxCacheSize, flags: AV_CODEC_FLAG_QSCALE });
    return this.jpegPool;
  }

  /**
   * The lazily created PNG encoder pool.
   *
   * @returns The PNG encoder pool
   *
   * @internal
   */
  private getPngPool(): EncoderPool<typeof FF_ENCODER_PNG> {
    this.pngPool ??= new EncoderPool(FF_ENCODER_PNG, { maxSize: this.maxCacheSize });
    return this.pngPool;
  }

  /**
   * Build a crop+scale+convert graph.
   *
   * For software frames this is `crop,scale,format`. For hardware frames the crop
   * filter sets crop metadata that the hardware scaler (scale_vt/scale_cuda/
   * scale_vaapi) applies on the GPU; the result is kept in NV12, downloaded, and
   * converted on the CPU. When `commandable` the crop is a labeled instance
   * (`crop@sc`) whose initial region is `crop` but which is re-aimed per frame via
   * `sendCommand`. Otherwise (OpenCL) the crop is fixed in the graph.
   *
   * @param isHw - Whether the input is a hardware frame
   *
   * @param outW - Output width
   *
   * @param outH - Output height
   *
   * @param format - Output pixel format
   *
   * @param crop - Initial crop region
   *
   * @param commandable - Whether the crop can be reconfigured at runtime
   *
   * @returns Filtergraph description
   *
   * @internal
   */
  private buildGraph(isHw: boolean, outW: number, outH: number, format: ScaledImageFormat, crop: ScalerCrop, commandable: boolean): string {
    let chain = FilterPreset.chain(isHw ? this.hardware : undefined);
    if (commandable) {
      // Labeled crop so sendCommand('crop@sc', ...) can re-aim it per frame.
      chain = chain.custom(`crop@sc=${crop.width}:${crop.height}:${crop.x}:${crop.y}`);
    } else {
      chain = chain.crop(crop.width, crop.height, crop.x, crop.y);
    }
    chain = chain.scale(outW, outH);
    if (isHw) {
      // Keep the GPU result in NV12, download the small frame, then convert on CPU.
      chain = chain.scaleFormat(AV_PIX_FMT_NV12).hwdownload().format(AV_PIX_FMT_NV12);
      if (format !== 'nv12') {
        chain = chain.format(FORMAT_TO_PIXFMT[format]);
      }
    } else {
      chain = chain.format(FORMAT_TO_PIXFMT[format]);
    }
    return chain.build();
  }

  /**
   * Insert a graph, evicting the least-recently-used entry if over capacity.
   *
   * @param key - Operation-configuration key
   *
   * @param entry - Graph entry to cache
   *
   * @internal
   */
  private cacheSet(key: string, entry: HwGraphEntry): void {
    this.graphs.set(key, entry);
    while (this.graphs.size > this.maxCacheSize) {
      const oldest = this.graphs.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      const evictee = this.graphs.get(oldest);
      this.graphs.delete(oldest);
      if (evictee) {
        // In-use graphs are retired, not disposed - the last in-flight scale
        // disposes them on release.
        this.retireEntry(evictee);
      }
    }
  }

  /**
   * Dispose of the scaler (for `using` statements).
   *
   * @example
   * ```typescript
   * using scaler = new Scaler();
   * // ... use scaler ...
   * // automatically disposed at end of scope
   * ```
   */
  [Symbol.dispose](): void {
    this.close();
  }
}
