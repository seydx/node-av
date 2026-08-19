import { Readable } from 'node:stream';

import { AVSEEK_CUR, AVSEEK_END, AVSEEK_SET, AVSEEK_SIZE } from '../constants/constants.js';
import { AVERROR_EIO } from '../lib/error.js';
import { IOContext } from '../lib/index.js';
import { IO_BUFFER_SIZE, MAX_PACKET_SIZE } from './constants.js';

import type { Writable } from 'node:stream';
import type { AVSeekWhence } from '../constants/index.js';
import type { DemuxerOptions } from './demuxer.js';
import type { MuxerOptions } from './muxer.js';

/**
 * Custom I/O callbacks for implementing custom input sources.
 *
 */
export interface IOInputCallbacks {
  /**
   * Read callback - called when FFmpeg needs to read data.
   *
   * Can be synchronous or async (return a Promise).
   *
   * @param size - Number of bytes to read
   *
   * @returns Buffer with data, null for EOF, negative error code, or Promise resolving to same
   */
  read: (size: number) => Buffer | null | number | Promise<Buffer | null | number>;

  /**
   * Seek callback - called when FFmpeg needs to seek in the stream.
   *
   * Can be synchronous or async (return a Promise).
   *
   * @param offset - Offset to seek to
   *
   * @param whence - Seek origin (AVSEEK_SET, AVSEEK_CUR, AVSEEK_END, or AVSEEK_SIZE)
   *
   * @returns New position, negative error code, or Promise resolving to same
   */
  seek?: (offset: bigint, whence: AVSeekWhence) => bigint | number | Promise<bigint | number>;
}

/**
 * Custom I/O callbacks for implementing custom output targets.
 *
 */
export interface IOOutputCallbacks {
  /**
   * Write callback - called when FFmpeg needs to write data.
   *
   * Can be synchronous or async (return a Promise).
   * Each call receives its own buffer holding a copy of the data, never a view
   * into FFmpeg's internal write buffer, so it stays valid after the callback
   * returns and may be queued or retained without copying it again.
   *
   * @param buffer - Buffer containing data to write
   *
   * @returns Number of bytes written, void (assumes all bytes written), or Promise resolving to same
   */
  write: (buffer: Buffer) => number | void | Promise<number | void>;

  /**
   * Seek callback - called when FFmpeg needs to seek in the output.
   *
   * Can be synchronous or async (return a Promise).
   *
   * @param offset - Offset to seek to
   *
   * @param whence - Seek origin (AVSEEK_SET, AVSEEK_CUR, AVSEEK_END)
   *
   * @returns New position, negative error code, or Promise resolving to same
   */
  seek?: (offset: bigint, whence: AVSeekWhence) => bigint | number | Promise<bigint | number>;

  /**
   * Read callback - some formats may need to read back data.
   *
   * Can be synchronous or async (return a Promise).
   *
   * @param size - Number of bytes to read
   *
   * @returns Buffer with data, null for EOF, negative error code, or Promise resolving to same
   */
  read?: (size: number) => Buffer | null | number | Promise<Buffer | null | number>;
}

/**
 * Factory for creating custom I/O contexts.
 *
 * Provides simplified creation of I/O contexts from buffers or custom callbacks.
 * Handles buffer management and seek operations for in-memory media.
 * Bridges the gap between high-level media operations and custom I/O sources.
 * Essential for processing media from non-file sources like network streams or memory.
 *
 * @example
 * ```typescript
 * import { IOStream, Demuxer } from 'node-av/api';
 *
 * // From buffer
 * const buffer = await fs.readFile('video.mp4');
 * const ioContext = IOStream.create(buffer);
 * const input = await Demuxer.open(buffer);
 * ```
 *
 * @example
 * ```typescript
 * // Custom I/O callbacks
 * const callbacks = {
 *   read: async (size: number) => {
 *     // Read from custom source
 *     return Buffer.alloc(size);
 *   },
 *   seek: async (offset: bigint, whence: AVSeekWhence) => {
 *     // Seek in custom source
 *     return offset;
 *   }
 * };
 *
 * const ioContext = IOStream.create(callbacks, {
 *   bufferSize: 4096
 * });
 * ```
 *
 * @see {@link IOContext} For low-level I/O operations
 * @see {@link Demuxer} For using I/O contexts
 * @see {@link IOInputCallbacks} For callback interface
 */
export class IOStream {
  /**
   * Create I/O context from buffer.
   *
   * Creates an I/O context from an in-memory buffer for reading media data.
   * Automatically handles seek operations and position tracking.
   *
   * @param buffer - Buffer containing media data
   *
   * @param options - I/O configuration options
   *
   * @returns Configured I/O context
   *
   * @example
   * ```typescript
   * const buffer = await fs.readFile('video.mp4');
   * const ioContext = IOStream.create(buffer, {
   *   bufferSize: 8192
   * });
   * ```
   */
  static create(buffer: Buffer, options?: DemuxerOptions): IOContext;
  /**
   * Create I/O context from callbacks.
   *
   * Creates an I/O context using custom read and seek callbacks.
   * Useful for streaming from non-file sources like network or custom storage.
   *
   * @param callbacks - I/O callbacks for read and seek operations
   *
   * @param options - I/O configuration options
   *
   * @returns Configured I/O context
   *
   * @throws {Error} If callbacks missing required read function
   *
   * @example
   * ```typescript
   * const ioContext = IOStream.create({
   *   read: async (size) => {
   *     return await customSource.read(size);
   *   },
   *   seek: async (offset, whence) => {
   *     return await customSource.seek(offset, whence);
   *   }
   * });
   * ```
   */
  static create(callbacks: IOInputCallbacks, options?: DemuxerOptions): IOContext;
  /**
   * Create I/O context from a Node.js Readable stream.
   *
   * Creates an I/O context that reads from a Readable stream.
   * Seeking is not supported for streams.
   *
   * @param stream - Node.js Readable stream
   *
   * @param options - I/O configuration options
   *
   * @returns Configured I/O context
   *
   * @example
   * ```typescript
   * const readable = fs.createReadStream('video.mkv');
   * const ioContext = IOStream.create(readable, { format: 'matroska' });
   * ```
   */
  static create(stream: Readable, options?: DemuxerOptions): IOContext;
  static create(input: Buffer | IOInputCallbacks | Readable, options: DemuxerOptions = {}): IOContext {
    const { bufferSize = IO_BUFFER_SIZE } = options;

    // Handle Buffer
    if (Buffer.isBuffer(input)) {
      return this.createFromBuffer(input, bufferSize);
    }

    // Handle Readable stream (must be before callbacks check since Readable has 'read')
    if (input instanceof Readable) {
      return this.createFromReadable(input, bufferSize);
    }

    // Handle custom callbacks
    if (typeof input === 'object' && 'read' in input) {
      return this.createFromInputCallbacks(input, bufferSize);
    }

    throw new TypeError('Invalid input type. Expected Buffer, Readable, or IOInputCallbacks');
  }

  /**
   * Create I/O context for writing to a Node.js Writable stream.
   *
   * Creates a write-mode I/O context from a Writable stream with
   * backpressure support and automatic buffer copying.
   * Seeking is not supported for streams.
   *
   * @param stream - Node.js Writable stream
   *
   * @param options - Output configuration options
   *
   * @returns Configured I/O context
   *
   * @example
   * ```typescript
   * const writable = fs.createWriteStream('output.mkv');
   * const ioContext = IOStream.createOutput(writable, { format: 'matroska' });
   * ```
   */
  static createOutput(stream: Writable, options?: MuxerOptions): IOContext;
  /**
   * Create I/O context from custom output callbacks.
   *
   * Creates a write-mode I/O context using custom write, optional seek,
   * and optional read callbacks.
   *
   * @param callbacks - I/O callbacks for write, seek, and read operations
   *
   * @param options - Output configuration options
   *
   * @returns Configured I/O context
   *
   * @throws {Error} If callbacks missing required write function
   *
   * @example
   * ```typescript
   * const chunks: Buffer[] = [];
   * const ioContext = IOStream.createOutput({
   *   write: (buffer) => {
   *     chunks.push(Buffer.from(buffer));
   *     return buffer.length;
   *   }
   * }, { format: 'matroska' });
   * ```
   */
  static createOutput(callbacks: IOOutputCallbacks, options?: MuxerOptions): IOContext;
  static createOutput(output: Writable | IOOutputCallbacks, options?: MuxerOptions): IOContext {
    const { bufferSize = IO_BUFFER_SIZE, maxPacketSize = MAX_PACKET_SIZE } = options ?? {};

    // Handle Writable stream (must be before callbacks check since Writable has 'write')
    if (typeof output === 'object' && 'writable' in output) {
      return this.createForWritable(output, bufferSize, maxPacketSize);
    }

    // Handle custom callbacks
    if (typeof output === 'object' && 'write' in output) {
      return this.createFromOutputCallbacks(output, bufferSize, maxPacketSize);
    }

    throw new TypeError('Invalid output type. Expected Writable or IOOutputCallbacks');
  }

  /**
   * Create I/O context from buffer.
   *
   * Sets up read and seek callbacks for in-memory buffer.
   * Manages position tracking and EOF handling.
   *
   * @param buffer - Source buffer
   *
   * @param bufferSize - Internal buffer size
   *
   * @returns Configured I/O context
   *
   * @internal
   */
  private static createFromBuffer(buffer: Buffer, bufferSize: number): IOContext {
    let position = 0;

    const ioContext = new IOContext();
    ioContext.allocContextWithCallbacks(
      bufferSize,
      0,
      (size: number) => {
        if (position >= buffer.length) {
          return null; // EOF
        }

        const chunk = buffer.subarray(position, Math.min(position + size, buffer.length));
        position += chunk.length;
        return chunk;
      },
      undefined,
      (offset: bigint, whence: AVSeekWhence) => {
        switch (whence) {
          case AVSEEK_SIZE:
            return BigInt(buffer.length);
          case AVSEEK_SET:
            position = Number(offset);
            break;
          case AVSEEK_CUR:
            position += Number(offset);
            break;
          case AVSEEK_END:
            position = buffer.length + Number(offset);
            break;
        }

        // Clamp position
        position = Math.max(0, Math.min(position, buffer.length));
        return BigInt(position);
      },
    );

    return ioContext;
  }

  /**
   * Create I/O context from a Node.js Readable stream.
   *
   * Sets up async read callbacks that buffer data from the stream.
   * Seeking is not supported for streams.
   *
   * @param stream - Node.js Readable stream
   *
   * @param bufferSize - Internal buffer size
   *
   * @returns Configured I/O context
   *
   * @internal
   */
  private static createFromReadable(stream: Readable, bufferSize: number): IOContext {
    let chunks: Buffer[] = [];
    let totalBuffered = 0;
    let streamEnded = false;
    let streamError: Error | null = null;
    let ioFreed = false;
    let pendingResolve: (() => void) | null = null;

    const wakeUp = () => {
      if (pendingResolve) {
        const resolve = pendingResolve;
        pendingResolve = null;
        resolve();
      }
    };

    const removeListeners = () => {
      stream.off('readable', onReadable);
      stream.off('end', onEnd);
      stream.off('error', onError);
      stream.off('close', wakeUp);
    };

    const onReadable = () => wakeUp();
    const onEnd = () => {
      streamEnded = true;
      wakeUp();
    };
    const onError = (err: Error) => {
      streamError = err;
      wakeUp();
    };

    // Track state changes and wake up pending reads
    stream.on('readable', onReadable);
    stream.on('end', onEnd);
    stream.on('error', onError);
    stream.on('close', wakeUp);

    const ioContext = new IOContext();
    ioContext.allocContextWithCallbacks(
      bufferSize,
      0, // read mode
      async (size: number): Promise<Buffer | null | number> => {
        // Pull-based: read from stream on demand. Return as soon as *any* data is
        // available rather than waiting for the full `size` — FFmpeg's AVIO handles
        // short reads and calls back for more. Blocking until the whole AVIO buffer
        // (often 64 KiB) is filled would stall probing on realtime sources that
        // deliver data slowly, where only the first few KiB are needed up front.
        while (totalBuffered === 0 && !ioFreed && !streamEnded && !streamError && !stream.destroyed) {
          // Try to read available data first
          let chunk: Buffer | null;
          while ((chunk = stream.read() as Buffer | null) !== null) {
            chunks.push(chunk);
            totalBuffered += chunk.length;
          }

          // Got something — return it without waiting for more.
          if (totalBuffered > 0) break;

          // If stream is done, stop waiting
          if (streamEnded || streamError || stream.destroyed) break;

          // Nothing buffered yet — wait for more data
          await new Promise<void>((resolve) => {
            pendingResolve = resolve;
          });
        }

        // I/O context was freed while this read was in flight — treat as EOF,
        // the result has no consumer anymore.
        if (ioFreed) {
          return null;
        }

        // No data available — stream is done, remove listeners
        if (totalBuffered === 0) {
          removeListeners();
          // A stream error must surface as a read error, not clean EOF —
          // the demuxer treats null as regular end-of-file, which would make
          // a broken source indistinguishable from a finished one.
          if (streamError) {
            return AVERROR_EIO;
          }
          return null;
        }

        const concat = Buffer.concat(chunks);
        const result = concat.subarray(0, Math.min(size, concat.length));
        const remainder = concat.subarray(result.length);
        chunks = remainder.length > 0 ? [remainder] : [];
        totalBuffered = remainder.length;

        // If stream is done and all data consumed, remove listeners
        if (totalBuffered === 0 && (streamEnded || streamError || stream.destroyed)) {
          removeListeners();
        }

        return result;
      },
      undefined, // no write
      undefined, // no seek
    );

    // The demuxer frees the I/O context on close - that is the only signal we
    // get that consumption stopped (possibly before EOF). Hook it so listeners
    // and buffered chunks don't stay attached to the caller's stream forever.
    const nativeFree = ioContext.freeContext.bind(ioContext);
    ioContext.freeContext = () => {
      ioFreed = true;
      removeListeners();
      chunks = [];
      totalBuffered = 0;
      wakeUp(); // release a read parked on an empty buffer
      nativeFree();
    };

    return ioContext;
  }

  /**
   * Create I/O context for writing to a Node.js Writable stream.
   *
   * Sets up async write callbacks with backpressure support.
   * The buffer is copied before writing since FFmpeg reuses its internal buffer.
   *
   * @param stream - Node.js Writable stream
   *
   * @param bufferSize - Internal buffer size
   *
   * @param maxPacketSize - Maximum packet size
   *
   * @returns Configured I/O context
   *
   * @internal
   */
  private static createForWritable(stream: Writable, bufferSize: number, maxPacketSize: number): IOContext {
    const ioContext = new IOContext();
    ioContext.allocContextWithCallbacks(
      bufferSize,
      1, // write mode
      undefined, // no read
      async (buffer: Buffer): Promise<number> => {
        // Fail fast on a dead stream - a thrown error is surfaced to FFmpeg
        // as a write error (AVERROR(EIO)) by the native layer, so the muxer
        // write rejects instead of silently feeding a destroyed stream.
        if (stream.destroyed || stream.writableEnded) {
          throw stream.errored ?? new Error('Writable stream was destroyed or ended during muxing');
        }

        // Copy buffer — FFmpeg reuses the internal buffer after callback returns
        const copy = Buffer.from(buffer);
        if (!stream.write(copy)) {
          // Backpressure: wait for drain, but never park unconditionally -
          // 'drain' never fires on a stream that errors or is destroyed while
          // we wait, which would hang the muxer forever. Race it against
          // 'error'/'close' and clean up all listeners on whichever settles.
          await new Promise<void>((resolve, reject) => {
            const settle = (err?: Error) => {
              stream.off('drain', onDrain);
              stream.off('error', onError);
              stream.off('close', onClose);
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            };
            const onDrain = () => settle();
            const onError = (err: Error) => settle(err);
            const onClose = () => settle(new Error('Writable stream closed before draining'));
            stream.on('drain', onDrain);
            stream.on('error', onError);
            stream.on('close', onClose);
            // Destroyed between write() and listener registration - 'close'
            // may already have fired, so it would never wake us up.
            if (stream.destroyed) {
              settle(stream.errored ?? new Error('Writable stream destroyed before draining'));
            }
          });
        }
        return copy.length;
      },
      undefined, // no seek
    );
    ioContext.maxPacketSize = maxPacketSize;
    return ioContext;
  }

  /**
   * Create I/O context from custom input callbacks.
   *
   * Sets up custom I/O with user-provided read and optional seek callbacks.
   *
   * @param callbacks - User I/O callbacks
   *
   * @param bufferSize - Internal buffer size
   *
   * @returns Configured I/O context
   *
   * @internal
   */
  private static createFromInputCallbacks(callbacks: IOInputCallbacks, bufferSize: number): IOContext {
    const ioContext = new IOContext();
    ioContext.allocContextWithCallbacks(
      bufferSize,
      0, // read mode
      callbacks.read,
      undefined,
      callbacks.seek,
    );

    return ioContext;
  }

  /**
   * Create I/O context from custom output callbacks.
   *
   * Sets up custom I/O with user-provided write, optional seek, and optional read callbacks.
   *
   * @param callbacks - User I/O callbacks
   *
   * @param bufferSize - Internal buffer size
   *
   * @param maxPacketSize - Maximum packet size
   *
   * @returns Configured I/O context
   *
   * @internal
   */
  private static createFromOutputCallbacks(callbacks: IOOutputCallbacks, bufferSize: number, maxPacketSize: number): IOContext {
    const ioContext = new IOContext();
    ioContext.allocContextWithCallbacks(
      bufferSize,
      1, // write mode
      callbacks.read,
      callbacks.write,
      callbacks.seek,
    );
    ioContext.maxPacketSize = maxPacketSize;

    return ioContext;
  }
}
