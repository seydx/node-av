import { Encoder } from './encoder.js';

import type { AVCodecFlag, AVCodecID, FFEncoderCodec } from '../constants/index.js';
import type { Codec } from '../lib/codec.js';
import type { Frame } from '../lib/frame.js';
import type { Packet } from '../lib/packet.js';
import type { EncoderOptions } from './encoder.js';

/**
 * Pooled encoder with its monotonic PTS counter.
 *
 * @internal
 */
interface PooledEncoder {
  encoder: Encoder;
  nextPts: bigint;
}

/**
 * Options for encoder pool creation.
 *
 * Extends {@link EncoderOptions} with the pool size limit.
 */
export type EncoderPoolOptions<C = unknown> = EncoderOptions<C> & {
  /**
   * Maximum number of encoders kept alive at once.
   *
   * When exceeded, the least-recently-used encoder is closed. In the worst case
   * (every frame a unique size) the pool degrades to per-frame open/close, never leaking.
   *
   * @default 8
   */
  maxSize?: number;

  /**
   * Codec flags applied to every pooled encoder before its first frame.
   *
   * Needed for flags that change encode behaviour, e.g. `AV_CODEC_FLAG_QSCALE` so
   * MJPEG honours per-frame `frame.quality`.
   */
  flags?: AVCodecFlag | AVCodecFlag[];
};

/**
 * Bounded LRU pool of image encoders keyed by resolution and pixel format.
 *
 * A single encoder cannot change dimensions after opening, so encoding frames of
 * varying sizes needs one encoder per resolution. This pool routes each frame to
 * the encoder matching its `width x height x pixelFormat`, creating one on demand
 * and reusing it afterwards. Each frame is given a monotonic PTS internally, so
 * callers can feed independent snapshots without managing timestamps.
 *
 * Pooled encoders are never flushed between frames, so this only suits intra-only
 * image codecs (MJPEG, PNG, WebP, ...). Hardware frames work as-is: the encoder
 * adopts the frame's hardware context. For a single one-off conversion use
 * {@link Encoder.encodeOne} instead.
 *
 * @example
 * ```typescript
 * import { EncoderPool } from 'node-av/api';
 * import { FF_ENCODER_MJPEG } from 'node-av/constants';
 *
 * using pool = new EncoderPool(FF_ENCODER_MJPEG);
 * const a = await pool.encode(frame1920); // opens + caches
 * const b = await pool.encode(frame640);  // opens + caches
 * const c = await pool.encode(frame1920); // reuses, no open
 * ```
 *
 * @example
 * ```typescript
 * // MJPEG quality: set the QSCALE flag on the pool, then carry the quality on
 * // each frame (qscale 2 = best, 31 = worst). The `q` private option has no
 * // effect on MJPEG.
 * import { AV_CODEC_FLAG_QSCALE, FF_QP2LAMBDA } from 'node-av/constants';
 *
 * using pool = new EncoderPool(FF_ENCODER_MJPEG, { maxSize: 4, flags: AV_CODEC_FLAG_QSCALE });
 * frame.quality = 3 * FF_QP2LAMBDA;
 * const jpeg = await pool.encode(frame);
 * ```
 *
 * @see {@link Encoder.encodeOne} For a one-shot, stateless single-frame encode
 */
export class EncoderPool<const C extends FFEncoderCodec | AVCodecID | Codec> implements Disposable {
  private readonly encoderCodec: C;
  private readonly options: EncoderOptions<C>;
  private readonly maxSize: number;
  private readonly flags: AVCodecFlag[];

  // Insertion order doubles as LRU order: touched entries move to the end,
  // so the first key is always the least-recently-used.
  private readonly encoders = new Map<string, PooledEncoder>();

  /**
   * Create a new encoder pool.
   *
   * @param encoderCodec - Encoder codec applied to every pooled encoder
   *
   * @param options - Encoder options forwarded to each encoder, plus the optional `maxSize` limit
   *
   * @throws {Error} If maxSize is less than 1
   *
   * @example
   * ```typescript
   * using pool = new EncoderPool(FF_ENCODER_MJPEG, { maxSize: 4, flags: AV_CODEC_FLAG_QSCALE });
   * ```
   */
  constructor(encoderCodec: C, options: EncoderPoolOptions<C> = {}) {
    const { maxSize = 8, flags, ...encoderOptions } = options;

    if (maxSize < 1) {
      throw new Error(`EncoderPool maxSize must be at least 1, got ${maxSize}`);
    }

    this.encoderCodec = encoderCodec;
    this.options = { threadCount: 1, ...encoderOptions };
    this.maxSize = maxSize;
    this.flags = flags === undefined ? [] : Array.isArray(flags) ? flags : [flags];
  }

  /**
   * Number of encoders currently held alive.
   *
   * @example
   * ```typescript
   * console.log(`Pool holds ${pool.size} encoders`);
   * ```
   */
  get size(): number {
    return this.encoders.size;
  }

  /**
   * Encode a frame into a self-contained image buffer.
   *
   * Routes the frame to the encoder matching its dimensions and pixel format,
   * creating and caching one if necessary.
   *
   * @param frame - Frame to encode
   *
   * @returns Encoded image bytes
   *
   * @throws {FFmpegError} If the encoder is not found or encoding fails
   *
   * @throws {Error} If the encoder produced no output
   *
   * @example
   * ```typescript
   * const jpeg = await pool.encode(frame);
   * ```
   *
   * @see {@link encodeSync} For synchronous version
   */
  async encode(frame: Frame): Promise<Buffer> {
    const key = this.keyFor(frame);

    let pooled = this.touch(key);
    if (!pooled) {
      const encoder = await Encoder.create(this.encoderCodec, this.options);

      pooled = this.touch(key);
      if (pooled) {
        encoder.close();
      } else {
        pooled = this.set(key, encoder);
      }
    }

    const savedPts = frame.pts;
    frame.pts = pooled.nextPts++;
    try {
      return this.extract(await pooled.encoder.encodeAll(frame), pooled.encoder);
    } finally {
      frame.pts = savedPts;
    }
  }

  /**
   * Encode a frame into a self-contained image buffer synchronously.
   * Synchronous version of encode.
   *
   * @param frame - Frame to encode
   *
   * @returns Encoded image bytes
   *
   * @throws {FFmpegError} If the encoder is not found or encoding fails
   *
   * @throws {Error} If the encoder produced no output
   *
   * @example
   * ```typescript
   * const jpeg = pool.encodeSync(frame);
   * ```
   *
   * @see {@link encode} For asynchronous version
   */
  encodeSync(frame: Frame): Buffer {
    const key = this.keyFor(frame);

    let pooled = this.touch(key);
    pooled ??= this.set(key, Encoder.createSync(this.encoderCodec, this.options));

    const savedPts = frame.pts;
    frame.pts = pooled.nextPts++;
    try {
      return this.extract(pooled.encoder.encodeAllSync(frame), pooled.encoder);
    } finally {
      frame.pts = savedPts;
    }
  }

  /**
   * Close all pooled encoders and clear the pool.
   *
   * Automatically called by Symbol.dispose.
   *
   * @example
   * ```typescript
   * pool.close();
   * ```
   *
   * @see {@link Symbol.dispose} For automatic cleanup
   */
  close(): void {
    for (const { encoder } of this.encoders.values()) {
      encoder.close();
    }
    this.encoders.clear();
  }

  /**
   * Build the cache key from frame dimensions and pixel format.
   *
   * Pixel format is part of the key because the encoder is opened with the frame's
   * format; a cached encoder for the same size but a different format would be invalid.
   *
   * @param frame - Frame to derive the key from
   *
   * @returns Cache key `width x height x pixelFormat`
   *
   * @internal
   */
  private keyFor(frame: Frame): string {
    return `${frame.width}x${frame.height}x${frame.format}`;
  }

  /**
   * Look up an encoder and mark it as most-recently-used.
   *
   * @param key - Cache key to look up
   *
   * @returns Pooled encoder, or undefined if not cached
   *
   * @internal
   */
  private touch(key: string): PooledEncoder | undefined {
    const pooled = this.encoders.get(key);
    if (pooled) {
      this.encoders.delete(key);
      this.encoders.set(key, pooled);
    }
    return pooled;
  }

  /**
   * Insert a freshly created encoder, evicting the least-recently-used one if full.
   *
   * @param key - Cache key for the encoder
   *
   * @param encoder - Freshly created encoder to cache
   *
   * @returns The pooled encoder entry
   *
   * @internal
   */
  private set(key: string, encoder: Encoder): PooledEncoder {
    if (this.flags.length > 0) {
      encoder.setCodecFlags(...this.flags);
    }

    const pooled: PooledEncoder = { encoder, nextPts: 0n };
    this.encoders.set(key, pooled);

    if (this.encoders.size > this.maxSize) {
      const oldestKey = this.encoders.keys().next().value;
      if (oldestKey !== undefined) {
        const oldest = this.encoders.get(oldestKey);
        this.encoders.delete(oldestKey);
        oldest?.encoder.close();
      }
    }

    return pooled;
  }

  /**
   * Extract the encoded bytes from the produced packets and free them.
   *
   * packet.data returns a JS-owned copy, so the buffer stays valid after freeing.
   *
   * @param packets - Packets produced by the encoder
   *
   * @param encoder - Encoder that produced the packets (for error messages)
   *
   * @returns Encoded image bytes
   *
   * @throws {Error} If no packet was produced
   *
   * @internal
   */
  private extract(packets: Packet[], encoder: Encoder): Buffer {
    try {
      const data = packets[0]?.data;
      if (!data) {
        throw new Error(`Encoder '${encoder.getCodec().name}' produced no output for frame`);
      }
      return data;
    } finally {
      for (const packet of packets) {
        packet.free();
      }
    }
  }

  /**
   * Dispose of the pool.
   *
   * Implements Disposable interface for automatic cleanup.
   * Equivalent to calling close().
   *
   * @example
   * ```typescript
   * {
   *   using pool = new EncoderPool(FF_ENCODER_MJPEG, { maxSize: 4 });
   *   // Encode frames...
   * } // All encoders automatically closed
   * ```
   *
   * @see {@link close} For manual cleanup
   */
  [Symbol.dispose](): void {
    this.close();
  }
}
