import {
  AV_HWDEVICE_TYPE_CUDA,
  AV_HWDEVICE_TYPE_D3D11VA,
  AV_HWDEVICE_TYPE_D3D12VA,
  AV_HWDEVICE_TYPE_DRM,
  AV_HWDEVICE_TYPE_DXVA2,
  AV_HWDEVICE_TYPE_MEDIACODEC,
  AV_HWDEVICE_TYPE_OPENCL,
  AV_HWDEVICE_TYPE_QSV,
  AV_HWDEVICE_TYPE_RKMPP,
  AV_HWDEVICE_TYPE_VAAPI,
  AV_HWDEVICE_TYPE_VDPAU,
  AV_HWDEVICE_TYPE_VIDEOTOOLBOX,
  AV_HWDEVICE_TYPE_VULKAN,
  AVFILTER_FLAG_HWDEVICE,
} from '../constants/constants.js';
import { Filter } from '../lib/filter.js';
import { avGetPixFmtName, avGetSampleFmtName } from '../lib/utilities.js';

import type { AVPixelFormat, AVSampleFormat, FilterOptionsMap } from '../constants/index.js';
import type { HardwareContext } from './hardware.js';

// Escape a filter option value for the filtergraph string. Bare tokens (numbers,
// simple identifiers, expressions) are emitted as-is; anything with special
// characters is single-quoted, with embedded quotes escaped FFmpeg-style.
const escapeFilterValue = (value: string | number | boolean): string => {
  const s = String(value);
  if (s !== '' && /^[A-Za-z0-9_.+\-/*]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
};

/**
 * Hardware filter capabilities for different platforms.
 * Maps hardware types to their supported filter operations.
 * Each capability indicates whether a specific filter operation is supported
 * by the hardware acceleration type.
 *
 * Support varies significantly between hardware types:
 * - CUDA: Comprehensive filter support with custom kernels
 * - VAAPI: Good Linux support with Intel/AMD GPUs
 * - QSV: Intel Quick Sync with basic filtering
 * - VideoToolbox: macOS/iOS with CoreImage filters
 * - Vulkan: Cross-platform with growing filter support
 * - OpenCL: Cross-platform compute-based filtering
 */
export interface FilterSupport {
  scale: boolean;
  overlay: boolean;
  transpose: boolean;
  tonemap: boolean;
  deinterlace: boolean;
  denoise: boolean;
  flip: boolean;
  blur: boolean;
  sharpen: boolean;
  sobel: boolean;
  chromakey: boolean;
  colorspace: boolean;
  pad: boolean;
  stack: boolean; // hstack, vstack, xstack
}

/**
 * Filter preset builder for composing filter chains.
 * Supports both software and hardware-accelerated filters.
 * Automatically selects appropriate filter implementations based on hardware context.
 * Uses fluent interface pattern for chaining multiple filters.
 *
 * @example
 * ```typescript
 * // Software filter chain
 * const filter = FilterPreset.chain()
 *   .scale(1920, 1080)
 *   .filter('fps', { fps: 30 })
 *   .filter('fade', { type: 'in', start_time: 0, duration: 2 })
 *   .build();
 *
 * // Hardware-accelerated filter chain
 * const hw = HardwareContext.auto();
 * const hwFilter = FilterPreset.chain(hw)
 *   .scale(1920, 1080)
 *   .blur('gaussian', 5)
 *   .build();
 * ```
 */
export class FilterPreset {
  private filters: string[] = [];
  private support: FilterSupport;

  private constructor(private hardware?: HardwareContext | null) {
    this.support = this.getSupport();
  }

  /**
   * Checks if a filter is hardware-accelerated.
   *
   * @param filterName - Name of the filter to check
   *
   * @returns True if the filter uses hardware acceleration
   *
   * @example
   * ```typescript
   * if (FilterPreset.isHardwareFilter('scale_cuda')) {
   *   console.log('Hardware accelerated scaling');
   * }
   * ```
   */
  static isHardwareFilter(filterName: string): boolean {
    const filter = Filter.getByName(filterName);
    if (!filter) {
      return false;
    }

    return filter.hasFlags(AVFILTER_FLAG_HWDEVICE);
  }

  /**
   * Creates a new filter chain builder.
   *
   * @param hardware - Optional hardware context for hardware-accelerated filters
   *
   * @returns A new FilterPreset instance for chaining
   *
   * @example
   * ```typescript
   * // Software filter chain
   * const filter = FilterPreset.chain()
   *   .scale(1280, 720)
   *   .filter('fps', { fps: 30 })
   *   .build();
   * ```
   *
   * @example
   * ```typescript
   * // Hardware filter chain
   * const hw = HardwareContext.auto();
   * const filter = FilterPreset.chain(hw)
   *   .scale(1280, 720)
   *   .deinterlace()
   *   .build();
   * ```
   */
  static chain(hardware?: HardwareContext | null): FilterPreset {
    const preset = new FilterPreset(hardware);
    return preset;
  }

  /**
   * Adds a custom filter string to the chain.
   *
   * @param filter - Custom filter string
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * chain.custom('myfilter=param1:param2')
   * ```
   */
  custom(filter?: string): this {
    if (!filter) {
      return this;
    }

    return this.add(filter);
  }

  /**
   * Adds any FFmpeg filter to the chain with type-safe options.
   *
   * Provides autocomplete for every available filter name and its options
   * (generated from FFmpeg's AVOption metadata). Prefer the dedicated methods
   * (e.g. {@link scale}) when hardware-aware selection or automatic mapping is
   * needed; use {@link custom} for raw filter strings.
   *
   * @param name - Filter name (autocompleted from all available filters)
   *
   * @param options - Filter-specific options, typed to the chosen filter
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * chain
   *   .filter('drawtext', { text: 'hello', fontsize: 24 })
   *   .filter('hue', { s: 0 });
   * // "drawtext=text=hello:fontsize=24,hue=s=0"
   * ```
   */
  filter<N extends keyof FilterOptionsMap>(name: N, options?: FilterOptionsMap[N]): this {
    if (!options) {
      return this.add(name);
    }

    const entries = Object.entries(options as Record<string, string | number | boolean | undefined | null>);
    const args = entries
      .filter((e): e is [string, string | number | boolean] => e[1] != null)
      .map(([k, v]) => `${k}=${escapeFilterValue(v)}`)
      .join(':');
    return this.add(args ? `${name}=${args}` : name);
  }

  /**
   * Builds the final filter string.
   *
   * @param separator - Separator between filters (default: ',')
   *
   * @returns Combined filter string
   *
   * @example
   * ```typescript
   * const filterString = chain.build()  // "scale=1920:1080,fps=30"
   * ```
   */
  build(separator = ','): string {
    return this.filters.join(separator);
  }

  /**
   * Returns the filters as an array.
   *
   * @returns Array of filter strings
   *
   * @example
   * ```typescript
   * const filters = chain.toArray()  // ["scale=1920:1080", "fps=30"]
   * ```
   */
  toArray(): string[] {
    return [...this.filters];
  }

  /**
   * Adds a scale filter to the chain.
   * Automatically selects hardware-specific scaler if hardware context is set.
   *
   * @param width - Target width in pixels
   *
   * @param height - Target height in pixels
   *
   * @param options - Additional scaling options (e.g., flags for algorithm)
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * chain.scale(1920, 1080)  // Scale to Full HD
   * chain.scale(640, 480, { flags: 'lanczos' })  // With specific algorithm
   * ```
   *
   * @example
   * ```typescript
   * // Hardware crop + scale (VAAPI, CUDA, QSV, VideoToolbox)
   * chain.crop(100, 100, 50, 50)  // Sets AVFrame crop fields
   *   .scale(1920, 1080)          // Hardware scaler reads crop fields
   * ```
   *
   * @see {@link https://ffmpeg.org/ffmpeg-filters.html#scale | FFmpeg scale filter}
   */
  scale(width: number, height: number, options?: Record<string, any>): FilterPreset {
    if (!this.support.scale) {
      return this;
    }

    if (this.hardware) {
      // Special handling for different hardware scalers
      let filterName: string;
      let filter: string;

      if (this.hardware.deviceType === AV_HWDEVICE_TYPE_RKMPP) {
        filterName = 'scale_rkrga'; // RKMPP uses RGA for scaling
        filter = `${filterName}=${width}:${height}`;
      } else if (this.hardware.deviceType === AV_HWDEVICE_TYPE_VIDEOTOOLBOX) {
        filterName = 'scale_vt'; // VideoToolbox uses scale_vt
        filter = `${filterName}=${width}:${height}`;
      } else if (this.hardware.deviceType === AV_HWDEVICE_TYPE_QSV) {
        filterName = 'vpp_qsv'; // QSV uses vpp_qsv for scaling with w= and h= parameters
        filter = `${filterName}=w=${width}:h=${height}`;
      } else {
        filterName = `scale_${this.hardware.deviceTypeName}`;
        filter = `${filterName}=${width}:${height}`;
      }

      if (options) {
        for (const [key, value] of Object.entries(options)) {
          filter += `:${key}=${value}`;
        }
      }

      this.add(filter);
    } else {
      const flags = options?.flags;
      const base = `scale=${width}:${height}`;
      const result = flags ? `${base}:flags=${flags}` : base;
      this.add(result);
    }

    return this;
  }

  /**
   * Adds a GPU format conversion filter without scaling.
   * Only available for hardware contexts. Uses hardware-specific scale filter with format parameter.
   *
   * @param format - Target pixel format (e.g., 'nv12', 'p010')
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * // Convert to NV12 on GPU without scaling
   * chain.scaleFormat('nv12')
   * // Generates: scale_vt=format=nv12 (VideoToolbox)
   * //         or: scale_cuda=format=nv12 (CUDA)
   * //         or: scale_opencl=format=nv12 (OpenCL)
   * ```
   *
   * @example
   * ```typescript
   * // Convert P010 → NV12 on GPU
   * const hw = await HardwareContext.auto();
   * const filter = FilterPreset.chain(hw)
   *   .scaleFormat('nv12')
   *   .build();
   * ```
   *
   * @example
   * ```typescript
   * // Scale then convert format (two separate GPU operations)
   * chain.scale(1920, 1080)
   *   .scaleFormat('p010')
   * // Generates: scale_vt=1920:1080,scale_vt=format=p010
   * ```
   */
  scaleFormat(format: string | AVPixelFormat): FilterPreset {
    if (!this.hardware) {
      return this;
    }

    // Special handling for different hardware scalers
    let filterName: string;
    if (this.hardware.deviceType === AV_HWDEVICE_TYPE_RKMPP) {
      filterName = 'scale_rkrga';
    } else if (this.hardware.deviceType === AV_HWDEVICE_TYPE_VIDEOTOOLBOX) {
      filterName = 'scale_vt';
    } else if (this.hardware.deviceType === AV_HWDEVICE_TYPE_QSV) {
      filterName = 'vpp_qsv';
    } else {
      filterName = `scale_${this.hardware.deviceTypeName}`;
    }

    if (typeof format !== 'string') {
      format = avGetPixFmtName(format) ?? 'nv12';
    }

    this.add(`${filterName}=format=${format}`);
    return this;
  }

  /**
   * Adds a crop filter to the chain.
   *
   * @param width - Width of the cropped area
   *
   * @param height - Height of the cropped area
   *
   * @param x - X coordinate of top-left corner (default: 0)
   *
   * @param y - Y coordinate of top-left corner (default: 0)
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * chain.crop(640, 480, 100, 100)  // Crop 640x480 area starting at (100,100)
   * chain.crop(1280, 720)  // Crop from top-left corner
   * ```
   *
   * @example
   * ```typescript
   * // Hardware crop + scale
   * chain.crop(100, 100, 50, 50)
   *   .scale(1920, 1080)
   * ```
   *
   * @see {@link https://ffmpeg.org/ffmpeg-filters.html#crop | FFmpeg crop filter}
   */
  crop(width: number, height: number, x = 0, y = 0): FilterPreset {
    if (this.hardware?.deviceType === AV_HWDEVICE_TYPE_OPENCL) {
      this.add(`scale_opencl=cw=${width}:ch=${height}:cx=${x}:cy=${y}`);
    } else {
      this.add(`crop=${width}:${height}:${x}:${y}`, true);
    }

    return this;
  }

  /**
   * Adds a blur filter to the chain (hardware-specific).
   * Only available for hardware presets that support blur
   *
   * @param type - Blur type (default: 'avg')
   *
   * @param radius - Blur radius (optional)
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .blur('gaussian', 5)
   *   .build();
   * ```
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .blur('box')
   *   .build();
   * ```
   */
  blur(type: 'avg' | 'gaussian' | 'box' = 'avg', radius?: number): FilterPreset {
    if (!this.support.blur) {
      return this;
    }

    if (this.hardware) {
      let filter: string | null = null;

      switch (this.hardware.deviceType) {
        case AV_HWDEVICE_TYPE_CUDA:
          filter = radius ? `bilateral_cuda=sigmaS=${radius}` : 'bilateral_cuda';
          break;
        case AV_HWDEVICE_TYPE_VULKAN:
          filter = type === 'gaussian' ? (radius ? `gblur_vulkan=sigma=${radius}` : 'gblur_vulkan') : radius ? `avgblur_vulkan=sizeX=${radius}` : 'avgblur_vulkan';
          break;
        case AV_HWDEVICE_TYPE_OPENCL:
          filter = type === 'box' ? (radius ? `boxblur_opencl=luma_radius=${radius}` : 'boxblur_opencl') : radius ? `avgblur_opencl=sizeX=${radius}` : 'avgblur_opencl';
          break;
        default:
          filter = null;
      }

      if (filter) {
        this.add(filter);
      }
    } else {
      const filter = type === 'gaussian' ? (radius ? `gblur=sigma=${radius}` : 'gblur') : radius ? `avgblur=sizeX=${radius}` : 'avgblur';
      this.add(filter);
    }

    return this;
  }

  /**
   * Adds a sharpen filter to the chain (hardware-specific).
   * Only available for hardware presets that support sharpening
   *
   * @param amount - Sharpen amount (optional)
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .sharpen(1.5)
   *   .build();
   * ```
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .sharpen()
   *   .build();
   * ```
   */
  sharpen(amount?: number): FilterPreset {
    if (!this.support.sharpen) {
      return this;
    }

    if (this.hardware) {
      let filter: string | null = null;

      switch (this.hardware.deviceType) {
        case AV_HWDEVICE_TYPE_VAAPI:
          filter = amount ? `sharpness_vaapi=sharpness=${amount}` : 'sharpness_vaapi';
          break;
        case AV_HWDEVICE_TYPE_OPENCL:
          filter = amount ? `unsharp_opencl=amount=${amount}` : 'unsharp_opencl';
          break;
        case AV_HWDEVICE_TYPE_QSV:
          // vpp_qsv detail parameter: enhancement level [0-100]
          const detail = amount ? Math.min(100, Math.max(0, Math.round(amount * 10))) : 50;
          filter = `vpp_qsv=detail=${detail}`;
          break;
        case AV_HWDEVICE_TYPE_VULKAN:
          // libplacebo contrast parameter (>1 increases sharpness, no native sharpen_vulkan available)
          const contrast = amount ? Math.max(1, 1 + amount) : 1.5;
          filter = `libplacebo=contrast=${contrast}`;
          break;
        case AV_HWDEVICE_TYPE_CUDA:
          // CUDA sharpening not available (NPP not included)
          filter = null;
          break;
        default:
          filter = null;
      }

      if (filter) {
        this.add(filter);
      }
    } else {
      const filter = amount ? `unsharp=amount=${amount}` : 'unsharp';
      this.add(filter);
    }

    return this;
  }

  /**
   * Adds a Sobel edge detection filter.
   *
   * Applies Sobel operator to detect edges in images.
   * Supports hardware acceleration with OpenCL.
   * Useful for computer vision and artistic effects.
   *
   * @param planes - Planes to process (1-15, default: 15 for all)
   *
   * @param scale - Scale factor for result (default: 1.0)
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .sobel()
   *   .build();
   * ```
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .sobel(15, 2.0)  // All planes, 2x scale
   *   .build();
   * ```
   */
  sobel(planes?: number, scale?: number): FilterPreset {
    if (this.hardware) {
      let filter: string | null = null;

      switch (this.hardware.deviceType) {
        case AV_HWDEVICE_TYPE_OPENCL:
          if (planes !== undefined || scale !== undefined) {
            const params: string[] = [];
            if (planes !== undefined) params.push(`planes=${planes}`);
            if (scale !== undefined) params.push(`scale=${scale}`);
            filter = `sobel_opencl=${params.join(':')}`;
          } else {
            filter = 'sobel_opencl';
          }
          break;
      }

      if (filter) {
        this.add(filter);
      }
    } else {
      // Software Sobel filter
      if (planes !== undefined || scale !== undefined) {
        const params: string[] = [];
        if (planes !== undefined) params.push(`planes=${planes}`);
        if (scale !== undefined) params.push(`scale=${scale}`);
        this.add(`sobel=${params.join(':')}`);
      } else {
        this.add('sobel');
      }
    }

    return this;
  }

  /**
   * Adds a format filter to convert pixel format.
   *
   * @param pixelFormat - Target pixel format(s) - AVPixelFormat enum, or array
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * // Single format
   * chain.format(AV_PIX_FMT_YUV420P);
   *
   * // Multiple formats (tries formats in order)
   * chain.format([AV_PIX_FMT_YUV420P, AV_PIX_FMT_RGB24]);
   * ```
   *
   * @see {@link https://ffmpeg.org/ffmpeg-filters.html#format | FFmpeg format filter}
   */
  format(pixelFormat: AVPixelFormat | AVPixelFormat[]): FilterPreset {
    if (Array.isArray(pixelFormat)) {
      if (pixelFormat.length === 0) {
        return this;
      }

      // Create a chain of format filters
      const formats = pixelFormat.map((fmt) => {
        const formatName = typeof fmt === 'string' ? fmt : (avGetPixFmtName(fmt) ?? 'yuv420p');
        return `format=${formatName}`;
      });
      this.add(formats.join(','));
    } else {
      const formatName = typeof pixelFormat === 'string' ? pixelFormat : (avGetPixFmtName(pixelFormat) ?? 'yuv420p');
      this.add(`format=${formatName}`);
    }

    return this;
  }

  /**
   * Adds a flip filter to the chain (hardware-specific).
   * Falls back to hflip/vflip if hardware flip not available
   *
   * @param direction - Flip direction ('h' or 'v')
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .flip('h')
   *   .build();
   * ```
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .flip('v')
   *   .build();
   * ```
   */
  flip(direction: 'h' | 'v'): FilterPreset {
    if (!this.support.flip) {
      return this;
    }

    if (this.hardware) {
      if (this.hardware.deviceType === AV_HWDEVICE_TYPE_VULKAN) {
        // Use native Vulkan flip filters
        if (direction === 'v') {
          this.add('vflip_vulkan');
        } else {
          this.add('hflip_vulkan');
        }
      } else if (this.hardware.deviceType === AV_HWDEVICE_TYPE_QSV) {
        // vpp_qsv uses transpose option for flip
        if (direction === 'v') {
          this.add('vpp_qsv=transpose=vflip');
        } else {
          this.add('vpp_qsv=transpose=hflip');
        }
      }
    } else {
      if (direction === 'v') {
        this.add('vflip');
      } else {
        this.add('hflip');
      }
    }

    return this;
  }

  /**
   * Adds a stack filter to the chain (hardware-specific).
   * Only available for hardware presets that support stacking
   *
   * @param type - Stack type ('h' for horizontal, 'v' for vertical, 'x' for grid)
   *
   * @param inputs - Number of inputs (default: 2)
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .stack('h', 2)
   *   .build();
   * ```
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .stack('x', 4)
   *   .build();
   * ```
   */
  stack(type: 'h' | 'v' | 'x', inputs = 2): FilterPreset {
    if (!this.support.stack) {
      return this;
    }

    if (this.hardware) {
      if (this.hardware.deviceType === AV_HWDEVICE_TYPE_VAAPI || this.hardware.deviceType === AV_HWDEVICE_TYPE_QSV) {
        const filter = `${type}stack_${this.hardware.deviceTypeName}=inputs=${inputs}`;
        this.add(filter);
      }
    } else {
      const filter = type === 'h' ? `hstack=inputs=${inputs}` : type === 'v' ? `vstack=inputs=${inputs}` : `xstack=inputs=${inputs}`;
      this.add(filter);
    }

    return this;
  }

  /**
   * Creates a tonemap filter.
   * Used for HDR to SDR conversion with hardware acceleration.
   *
   * @param alg - Tonemapping algorithm (e.g., 'hable', 'reinhard', 'mobius', etc.)
   *
   * @param options - Tonemapping options
   *
   * @returns Hardware tonemap filter string or null if not supported
   *
   * @example
   * ```typescript
   * const filter = hwPresets.tonemap();
   * ```
   *
   * @example
   * ```typescript
   * const filter = hwPresets.tonemap({ tonemap: 'hable', desat: '0' });
   * ```
   */
  tonemap(alg: string, options: Record<string, string | number>): FilterPreset {
    if (!this.support.tonemap) {
      return this;
    }

    if (this.hardware) {
      // Vulkan uses libplacebo for comprehensive HDR tone-mapping (no native tonemap_vulkan available)
      if (this.hardware.deviceType === AV_HWDEVICE_TYPE_VULKAN) {
        let filter = `libplacebo=tonemapping=${alg}`;

        if (options) {
          const opts = Object.entries(options)
            .map(([k, v]) => `${k}=${v}`)
            .join(':');
          filter += `:${opts}`;
        }

        this.add(filter);
      } else {
        // VideoToolbox uses different filter name
        const filterName = this.hardware.deviceType === AV_HWDEVICE_TYPE_VIDEOTOOLBOX ? 'tonemap_videotoolbox' : `tonemap_${this.hardware.deviceTypeName}`;

        let filter = `${filterName}=${alg}`;

        if (options) {
          const opts = Object.entries(options)
            .map(([k, v]) => `${k}=${v}`)
            .join(':');
          filter += `=${opts}`;
        }

        this.add(filter);
      }
    } else {
      let filter = `tonemap=${alg}`;

      if (options) {
        const opts = Object.entries(options)
          .map(([k, v]) => `${k}=${v}`)
          .join(':');
        filter += `=${opts}`;
      }

      this.add(filter);
    }

    return this;
  }

  /**
   * Creates an overlay filter string to composite two video streams.
   *
   * @param x - X position for overlay (default: 0)
   *
   * @param y - Y position for overlay (default: 0)
   *
   * @param options - Additional overlay options
   *
   * @returns Filter string or null if not supported
   *
   * @example
   * ```typescript
   * // Basic overlay at position
   * presets.overlay(100, 50);
   *
   * // With additional options
   * presets.overlay(0, 0, { format: 'yuv420' });
   * ```
   *
   * @see {@link https://ffmpeg.org/ffmpeg-filters.html#overlay | FFmpeg overlay filter}
   */
  overlay(x = 0, y = 0, options?: Record<string, string>): FilterPreset {
    if (!this.support.overlay) {
      return this;
    }

    if (this.hardware) {
      // Special handling for RKMPP which uses RGA
      const filterName = this.hardware.deviceType === AV_HWDEVICE_TYPE_RKMPP ? 'overlay_rkrga' : `overlay_${this.hardware.deviceTypeName}`;

      let filter = `${filterName}=${x}:${y}`;

      if (options) {
        for (const [key, value] of Object.entries(options)) {
          filter += `:${key}=${value}`;
        }
      }

      this.add(filter);
    } else {
      let filter = `overlay=${x}:${y}`;
      if (options) {
        for (const [key, value] of Object.entries(options)) {
          filter += `:${key}=${value}`;
        }
      }
      this.add(filter);
    }

    return this;
  }

  /**
   * Creates an audio format filter string.
   *
   * @param sampleFormat - Target sample format (e.g., 's16', 'fltp')
   *
   * @param sampleRate - Target sample rate in Hz (optional)
   *
   * @param channelLayout - Target channel layout (optional)
   *
   * @returns Filter string or null if not supported
   *
   * @example
   * ```typescript
   * // Change sample format only
   * presets.aformat('s16');
   *
   * // Change format and sample rate
   * presets.aformat('fltp', 48000);
   *
   * // Full conversion
   * presets.aformat('s16', 44100, 'stereo');
   * ```
   *
   * @see {@link https://ffmpeg.org/ffmpeg-filters.html#aformat | FFmpeg aformat filter}
   */
  aformat(sampleFormat: AVSampleFormat | AVSampleFormat[], sampleRate?: number, channelLayout?: string): FilterPreset {
    let sampleFormats = '';
    if (!Array.isArray(sampleFormat)) {
      sampleFormat = [sampleFormat];
    }
    sampleFormats = sampleFormat.map((fmt) => (typeof fmt === 'string' ? fmt : (avGetSampleFmtName(fmt) ?? 's16'))).join('|');
    let filter = `aformat=sample_fmts=${sampleFormats}`;
    if (sampleRate) filter += `:sample_rates=${sampleRate}`;
    if (channelLayout) filter += `:channel_layouts=${channelLayout}`;
    this.add(filter);
    return this;
  }

  /**
   * Adds a pad filter to add padding to video.
   * Essential for aspect ratio adjustments and letterboxing.
   *
   * @param width - Output width (can use expressions like 'iw+100')
   *
   * @param height - Output height (can use expressions like 'ih+100')
   *
   * @param x - X position of input video (default: '(ow-iw)/2' for center)
   *
   * @param y - Y position of input video (default: '(oh-ih)/2' for center)
   *
   * @param color - Padding color (default: 'black')
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * // Add black bars for 16:9 aspect ratio
   * chain.pad('iw', 'iw*9/16');
   *
   * // Add 50px padding on all sides
   * chain.pad('iw+100', 'ih+100');
   * ```
   *
   * @see {@link https://ffmpeg.org/ffmpeg-filters.html#pad | FFmpeg pad filter}
   */
  pad(width: string | number, height: string | number, x?: string, y?: string, color = 'black'): FilterPreset {
    if (this.hardware?.deviceType === AV_HWDEVICE_TYPE_VULKAN) {
      // Vulkan uses libplacebo (no native pad_vulkan available)
      let filter = `libplacebo=w=${width}:h=${height}`;
      if (x !== undefined) filter += `:pos_x=${x}`;
      if (y !== undefined) filter += `:pos_y=${y}`;
      filter += `:fillcolor=${color}`;
      this.add(filter);
    } else {
      let filter = `pad=${width}:${height}`;
      if (x !== undefined) filter += `:${x}`;
      if (y !== undefined) filter += `:${y}`;
      filter += `:${color}`;
      this.add(filter);
    }
    return this;
  }

  /**
   * Creates a transpose filter string for rotation/flipping.
   * More efficient than rotate for 90-degree rotations.
   *
   * @param mode - Transpose mode (0-3, or named constants)
   *
   * @returns Filter string or null if not supported
   *
   * @example
   * ```typescript
   * presets.transpose(1)  // Rotate 90 degrees clockwise
   * presets.transpose('cclock')  // Rotate 90 degrees counter-clockwise
   * ```
   *
   * @see {@link https://ffmpeg.org/ffmpeg-filters.html#transpose | FFmpeg transpose filter}
   */
  transpose(mode: number | 'clock' | 'cclock' | 'clock_flip' | 'cclock_flip'): FilterPreset {
    if (!this.support.transpose) {
      return this;
    }

    if (this.hardware) {
      // Convert string modes to numbers
      let dir: number;
      if (typeof mode === 'string') {
        switch (mode) {
          case 'clock':
            dir = 1;
            break;
          case 'cclock':
            dir = 2;
            break;
          case 'clock_flip':
            dir = 3;
            break;
          case 'cclock_flip':
            dir = 0;
            break;
          default:
            dir = 0;
        }
      } else {
        dir = mode;
      }

      // Special handling for different hardware transpose implementations
      let filter: string;
      if (this.hardware.deviceType === AV_HWDEVICE_TYPE_CUDA) {
        filter = `transpose_cuda=dir=${dir}`; // Uses custom CUDA kernel (patch 0054)
      } else if (this.hardware.deviceType === AV_HWDEVICE_TYPE_VIDEOTOOLBOX) {
        filter = `transpose_vt=dir=${dir}`; // CoreImage-based transpose
      } else if (this.hardware.deviceType === AV_HWDEVICE_TYPE_QSV) {
        // vpp_qsv transpose parameter maps: clock=1, cclock=2, cclock_hflip=0, clock_hflip=3, reversal=4, hflip=5, vflip=6
        filter = `vpp_qsv=transpose=${dir}`;
      } else {
        filter = `transpose_${this.hardware.deviceTypeName}=dir=${dir}`;
      }

      this.add(filter);
    } else {
      this.add(`transpose=${mode}`);
    }

    return this;
  }

  /**
   * Creates a deinterlace filter string.
   * Essential for processing interlaced content.
   *
   * @param mode - Deinterlace mode (default: 'yadif')
   *
   * @param options - Additional options for the filter
   *
   * @returns Filter string or null if not supported
   *
   * @example
   * ```typescript
   * presets.deinterlace('yadif')  // Standard deinterlacing
   * presets.deinterlace('bwdif')  // Bob Weaver deinterlacing
   * ```
   *
   * @see {@link https://ffmpeg.org/ffmpeg-filters.html#yadif | FFmpeg yadif filter}
   */
  deinterlace(mode: 'yadif' | 'bwdif' | 'w3fdif' = 'yadif', options?: Record<string, any>): FilterPreset {
    if (!this.support.deinterlace) {
      return this;
    }

    if (this.hardware) {
      let filter: string | null = null;

      switch (this.hardware.deviceType) {
        case AV_HWDEVICE_TYPE_CUDA:
          filter = mode ? `yadif_cuda=mode=${mode}` : 'yadif_cuda';
          break;
        case AV_HWDEVICE_TYPE_VAAPI:
          filter = mode ? `deinterlace_vaapi=mode=${mode}` : 'deinterlace_vaapi';
          break;
        case AV_HWDEVICE_TYPE_QSV:
          // vpp_qsv deinterlace: 0=off, 1=bob, 2=advanced
          // Map yadif/bwdif mode to vpp_qsv: default to bob(1)
          filter = mode ? 'vpp_qsv=deinterlace=1' : 'vpp_qsv=deinterlace=1';
          break;
        case AV_HWDEVICE_TYPE_VULKAN:
          filter = mode ? `bwdif_vulkan=mode=${mode}` : 'bwdif_vulkan';
          break;
        case AV_HWDEVICE_TYPE_VIDEOTOOLBOX:
          filter = mode ? `yadif_videotoolbox=mode=${mode}` : 'yadif_videotoolbox';
          break;
        default:
          filter = null;
      }

      if (filter) {
        if (options) {
          const params: string[] = [];
          for (const [key, value] of Object.entries(options)) {
            params.push(`${key}=${value}`);
          }
          filter += '=' + params.join(':');
        }

        this.add(filter);
      }
    } else {
      let filter = mode;

      if (options) {
        const params: string[] = [];
        for (const [key, value] of Object.entries(options)) {
          params.push(`${key}=${value}`);
        }
        filter += '=' + params.join(':');
      }

      this.add(filter);
    }

    return this;
  }

  /**
   * Adds a whisper filter for audio transcription using whisper.cpp.
   * Transcribes audio and adds metadata to frames (lavfi.whisper.text, lavfi.whisper.duration).
   *
   * @param options - Whisper transcription options
   *
   * @param options.model - Path to whisper.cpp model file
   *
   * @param options.language - Language for transcription (default: 'auto')
   *
   * @param options.queue - Audio queue size in seconds (default: 3)
   *
   * @param options.useGpu - Use GPU for processing (default: true)
   *
   * @param options.gpuDevice - GPU device to use (default: 0)
   *
   * @param options.destination - Output destination for transcripts
   *
   * @param options.format - Output format: text|srt|json (default: 'text')
   *
   * @param options.vadModel - Path to VAD model file (optional)
   *
   * @param options.vadThreshold - VAD threshold 0.0-1.0 (default: 0.5)
   *
   * @param options.vadMinSpeechDuration - Minimum speech duration for VAD in seconds (default: 0.1)
   *
   * @param options.vadMinSilenceDuration - Minimum silence duration for VAD in seconds (default: 0.5)
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * // Basic transcription
   * chain.whisper({
   *   model: '/path/to/ggml-base.bin'
   * });
   *
   * // With language and output
   * chain.whisper({
   *   model: '/path/to/ggml-base.bin',
   *   language: 'en',
   *   destination: 'output.srt',
   *   format: 'srt'
   * });
   *
   * // With VAD model
   * chain.whisper({
   *   model: '/path/to/ggml-base.bin',
   *   vadModel: '/path/to/ggml-silero-v5.1.2.bin',
   *   vadThreshold: 0.5
   * });
   * ```
   *
   * @see {@link https://ffmpeg.org/ffmpeg-filters.html#whisper | FFmpeg whisper filter}
   */
  whisper(options: {
    model: string;
    language?: string;
    queue?: number;
    useGpu?: boolean;
    gpuDevice?: number;
    destination?: string;
    format?: 'text' | 'srt' | 'json';
    vadModel?: string;
    vadThreshold?: number;
    vadMinSpeechDuration?: number;
    vadMinSilenceDuration?: number;
  }): FilterPreset {
    // Normalize path for FFmpeg filter syntax:
    // 1. Convert backslashes to forward slashes (Windows compatibility)
    // 2. Escape colons with double backslash (for multi-level parsing: JS → C++ → FFmpeg)
    const normalizedModel = options.model.replace(/\\/g, '/').replace(/:/g, '\\\\:');
    const params: string[] = [`model=${normalizedModel}`];

    if (options.language !== undefined) {
      params.push(`language=${options.language}`);
    }

    if (options.queue !== undefined) {
      params.push(`queue=${options.queue}`);
    }

    if (options.useGpu !== undefined) {
      params.push(`use_gpu=${options.useGpu ? 1 : 0}`);
    }

    if (options.gpuDevice !== undefined) {
      params.push(`gpu_device=${options.gpuDevice}`);
    }

    if (options.destination !== undefined) {
      const normalizedDest = options.destination.replace(/\\/g, '/').replace(/:/g, '\\\\:');
      params.push(`destination=${normalizedDest}`);
    }

    if (options.format !== undefined) {
      params.push(`format=${options.format}`);
    }

    if (options.vadModel !== undefined) {
      const normalizedVadModel = options.vadModel.replace(/\\/g, '/').replace(/:/g, '\\\\:');
      params.push(`vad_model=${normalizedVadModel}`);
    }

    if (options.vadThreshold !== undefined) {
      params.push(`vad_threshold=${options.vadThreshold}`);
    }

    if (options.vadMinSpeechDuration !== undefined) {
      params.push(`vad_min_speech_duration=${options.vadMinSpeechDuration}`);
    }

    if (options.vadMinSilenceDuration !== undefined) {
      params.push(`vad_min_silence_duration=${options.vadMinSilenceDuration}`);
    }

    this.add(`whisper=${params.join(':')}`);
    return this;
  }

  /**
   * Adds a hwupload filter to upload frames to hardware.
   * Only applied if hardware acceleration is configured.
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .hwupload()
   *   .scale(1920, 1080)
   *   .build();
   * ```
   */
  hwupload(): FilterPreset {
    if (!this.hardware) {
      return this;
    }

    if (this.hardware.deviceType === AV_HWDEVICE_TYPE_CUDA) {
      this.add('hwupload_cuda');
    } else {
      this.add('hwupload');
    }
    return this;
  }

  /**
   * Adds a hwdownload filter to download frames from hardware.
   * Only applied if hardware acceleration is configured.
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * const chain = FilterPresets.chain()
   *   .scale(1920, 1080)
   *   .hwdownload()
   *   .build();
   * ```
   */
  hwdownload(): FilterPreset {
    if (!this.hardware) {
      return this;
    }

    this.add('hwdownload');
    return this;
  }

  /**
   * Adds a filter to the chain.
   *
   * @param filter - Filter string to add (ignored if null/undefined)
   *
   * @param unshift - If true, adds to the start instead of the end (default: false)
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * chain.add('scale=1920:1080')
   * ```
   *
   * @internal
   */
  private add(filter: string | null | undefined, unshift?: boolean): this {
    if (filter) {
      if (unshift) {
        this.filters.unshift(filter);
      } else {
        this.filters.push(filter);
      }
    }
    return this;
  }

  /**
   * Determines filter support for the hardware type.
   *
   * @returns Hardware filter support configuration
   *
   * @internal
   */
  private getSupport(): FilterSupport {
    if (!this.hardware) {
      // Software-only - all filters supported
      return {
        scale: true,
        overlay: true,
        transpose: true,
        tonemap: true,
        deinterlace: true,
        denoise: true,
        flip: true,
        blur: true,
        sharpen: true,
        sobel: true,
        chromakey: true,
        colorspace: true,
        pad: true,
        stack: true,
      };
    }

    switch (this.hardware.deviceType) {
      case AV_HWDEVICE_TYPE_CUDA:
        return {
          scale: true, // scale_cuda with crop support (patch 1002)
          overlay: true, // overlay_cuda
          transpose: true, // transpose_cuda (patch 0054)
          tonemap: true, // tonemap_cuda (patch 0004)
          deinterlace: true, // bwdif_cuda, yadif_cuda
          denoise: false,
          flip: false,
          blur: true, // bilateral_cuda
          sharpen: false, // Not available (NPP not included in build)
          sobel: false,
          chromakey: true, // chromakey_cuda
          colorspace: true, // colorspace_cuda
          pad: false,
          stack: false,
        };

      case AV_HWDEVICE_TYPE_VAAPI:
        return {
          scale: true, // scale_vaapi
          overlay: true, // overlay_vaapi
          transpose: true, // transpose_vaapi
          tonemap: true, // tonemap_vaapi
          deinterlace: true, // deinterlace_vaapi
          denoise: true, // denoise_vaapi
          flip: false,
          blur: false,
          sharpen: true, // sharpness_vaapi
          sobel: false,
          chromakey: false,
          colorspace: false,
          pad: true, // pad_vaapi
          stack: true, // hstack_vaapi, vstack_vaapi, xstack_vaapi
        };

      case AV_HWDEVICE_TYPE_QSV:
        return {
          scale: true, // vpp_qsv (w/h params) with crop support (cw/ch/cx/cy)
          overlay: true, // overlay_qsv
          transpose: true, // vpp_qsv transpose option
          tonemap: true, // vpp_qsv tonemap option
          deinterlace: true, // vpp_qsv deinterlace option (bob, advanced)
          denoise: true, // vpp_qsv denoise option [0-100]
          flip: true, // vpp_qsv transpose=hflip/vflip
          blur: false,
          sharpen: true, // vpp_qsv detail option [0-100]
          sobel: false,
          chromakey: false,
          colorspace: true, // vpp_qsv out_color_matrix/primaries/transfer
          pad: false,
          stack: true, // hstack_qsv, vstack_qsv, xstack_qsv
        };

      case AV_HWDEVICE_TYPE_VULKAN:
        return {
          scale: true, // scale_vulkan (native Vulkan scaler)
          overlay: true, // overlay_vulkan (native Vulkan overlay)
          transpose: true, // transpose_vulkan (native Vulkan transpose)
          tonemap: true, // libplacebo (comprehensive HDR tone-mapping, no native alternative)
          deinterlace: true, // bwdif_vulkan (native Vulkan deinterlacer)
          denoise: true, // nlmeans_vulkan (native Vulkan denoiser)
          flip: true, // hflip_vulkan/vflip_vulkan (native Vulkan flip)
          blur: true, // avgblur_vulkan/gblur_vulkan (native Vulkan blur)
          sharpen: true, // libplacebo (contrast/sharpness adjustments, no native alternative)
          sobel: false, // Not available
          chromakey: false, // chromaber_vulkan exists but different purpose (chromatic aberration)
          colorspace: true, // libplacebo (comprehensive color management, no native alternative)
          pad: true, // libplacebo (via pos_x/y/w/h and fillcolor, no native alternative)
          stack: false, // Not available
        };

      case AV_HWDEVICE_TYPE_OPENCL:
        return {
          scale: true, // scale_opencl with crop support (patches 0006, 1004)
          overlay: true, // overlay_opencl (+ PGS support patch 0008)
          transpose: true, // transpose_opencl
          tonemap: true, // tonemap_opencl (enhanced in patch 0007)
          deinterlace: false,
          denoise: false,
          flip: false,
          blur: true, // avgblur_opencl, boxblur_opencl
          sharpen: true, // unsharp_opencl
          sobel: true, // sobel_opencl
          chromakey: true, // colorkey_opencl
          colorspace: false,
          pad: true, // pad_opencl
          stack: false,
        };

      case AV_HWDEVICE_TYPE_VIDEOTOOLBOX:
        return {
          scale: true, // scale_vt with crop support (patches 0047, 1001)
          overlay: true, // overlay_videotoolbox (patch 0048)
          transpose: true, // transpose_vt (patch 0049, CoreImage based)
          tonemap: true, // tonemap_videotoolbox (patch 0050)
          deinterlace: true, // yadif_videotoolbox
          denoise: false,
          flip: false,
          blur: false,
          sharpen: false,
          sobel: false,
          chromakey: false,
          colorspace: false,
          pad: false,
          stack: false,
        };

      case AV_HWDEVICE_TYPE_MEDIACODEC:
        // MediaCodec is Android's hardware acceleration - mainly for decode/encode
        return {
          scale: false,
          overlay: false,
          transpose: false,
          tonemap: false,
          deinterlace: false,
          denoise: false,
          flip: false,
          blur: false,
          sharpen: false,
          sobel: false,
          chromakey: false,
          colorspace: false,
          pad: false,
          stack: false,
        };

      case AV_HWDEVICE_TYPE_RKMPP: // Rockchip - has RGA filters via patch 0046
        // Note: RKMPP uses separate RKRGA (Rockchip 2D Raster Graphic Acceleration)
        // for filtering operations, configured with --enable-rkrga
        return {
          scale: true, // scale_rkrga (patch 0046)
          overlay: true, // overlay_rkrga (patch 0046)
          transpose: false,
          tonemap: false,
          deinterlace: false,
          denoise: false,
          flip: false,
          blur: false,
          sharpen: false,
          sobel: false,
          chromakey: false,
          colorspace: false,
          pad: false,
          stack: false,
        };

      // These hardware types don't have dedicated filters - they're mainly for decode/encode
      case AV_HWDEVICE_TYPE_VDPAU: // Decode-only, deprecated in favor of VAAPI
      case AV_HWDEVICE_TYPE_DXVA2: // Windows decode-only
      case AV_HWDEVICE_TYPE_D3D11VA: // Windows decode-only
      case AV_HWDEVICE_TYPE_D3D12VA: // Has HEVC encoder but no filters
      case AV_HWDEVICE_TYPE_DRM: // Linux DRM buffer sharing, not processing
        return {
          scale: false,
          overlay: false,
          transpose: false,
          tonemap: false,
          deinterlace: false,
          denoise: false,
          flip: false,
          blur: false,
          sharpen: false,
          sobel: false,
          chromakey: false,
          colorspace: false,
          pad: false,
          stack: false,
        };

      default:
        // Unknown hardware - no filter support
        return {
          scale: false,
          overlay: false,
          transpose: false,
          tonemap: false,
          deinterlace: false,
          denoise: false,
          flip: false,
          blur: false,
          sharpen: false,
          sobel: false,
          chromakey: false,
          colorspace: false,
          pad: false,
          stack: false,
        };
    }
  }
}

/**
 * Label specification for a filter-complex chain (input or output pads).
 *
 * A single label like `'0:v'` or `'out'`, or several labels. Labels are wrapped
 * in `[...]` automatically when the graph string is built.
 */
export type FilterComplexLabels = string | string[];

/**
 * Type-safe builder for `filter_complex` graph strings.
 *
 * Composes one or more labeled filter chains - each with optional input/output
 * pad labels and a sequence of type-safe {@link FilterPreset.filter} calls - and
 * renders them to the description string consumed by
 * {@link FilterComplexAPI.create}. Provides the same autocomplete and enum
 * validation as {@link FilterPreset}, but for multi-input/output graphs.
 *
 * @example
 * ```typescript
 * const graph = FilterComplexGraph.create()
 *   .chain({ inputs: ['0:v', '1:v'], outputs: 'tmp' }, (c) => c.filter('overlay', { x: 100, y: 50 }))
 *   .chain({ inputs: 'tmp', outputs: 'out' }, (c) => c.filter('hue', { s: 0 }))
 *   .build();
 * // "[0:v][1:v]overlay=x=100:y=50[tmp];[tmp]hue=s=0[out]"
 *
 * using complex = FilterComplexAPI.create(graph, {
 *   inputs: [{ label: '0:v' }, { label: '1:v' }],
 *   outputs: [{ label: 'out' }],
 * });
 * ```
 */
export class FilterComplexGraph {
  private chains: string[] = [];

  /**
   * Create a new filter-complex graph builder.
   *
   * @returns A new builder instance
   *
   * @example
   * ```typescript
   * const graph = FilterComplexGraph.create();
   * ```
   */
  static create(): FilterComplexGraph {
    return new FilterComplexGraph();
  }

  /**
   * Add a labeled filter chain to the graph.
   *
   * The chain's filters are built via a callback that receives a
   * {@link FilterPreset} for type-safe `filter()` composition.
   *
   * @param labels - Optional input and output pad labels
   *
   * @param labels.inputs - Input pad label(s) prepended to the chain
   *
   * @param labels.outputs - Output pad label(s) appended to the chain
   *
   * @param build - Callback composing the chain's filters
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * graph.chain({ inputs: ['0:v', '1:v'], outputs: 'out' }, (c) =>
   *   c.filter('overlay', { x: 0, y: 0 }).filter('hue', { s: 0 }),
   * );
   * ```
   */
  chain(labels: { inputs?: FilterComplexLabels; outputs?: FilterComplexLabels }, build: (chain: FilterPreset) => FilterPreset): this {
    const preset = FilterPreset.chain();
    const filterString = build(preset).build();
    this.chains.push(`${this.renderLabels(labels.inputs)}${filterString}${this.renderLabels(labels.outputs)}`);
    return this;
  }

  /**
   * Add a raw chain segment to the graph.
   *
   * Escape hatch for graph syntax not expressible through {@link chain}.
   *
   * @param segment - Raw chain string (e.g. `'[0:v]split[a][b]'`)
   *
   * @returns This instance for chaining
   *
   * @example
   * ```typescript
   * graph.custom('[0:v]split[a][b]');
   * ```
   */
  custom(segment: string): this {
    this.chains.push(segment);
    return this;
  }

  /**
   * Build the final filter-complex description string.
   *
   * @returns The graph description (chains joined by `;`)
   *
   * @example
   * ```typescript
   * const description = graph.build();
   * ```
   */
  build(): string {
    return this.chains.join(';');
  }

  /**
   * Wrap pad labels in `[...]`.
   *
   * @param labels - A single label, an array of labels, or undefined
   *
   * @returns The bracketed label string (empty when no labels)
   *
   * @internal
   */
  private renderLabels(labels?: FilterComplexLabels): string {
    if (!labels) {
      return '';
    }
    const list = Array.isArray(labels) ? labels : [labels];
    return list.map((label) => `[${label}]`).join('');
  }
}
