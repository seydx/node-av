import { AVERROR_EOF, AVERROR_EXIT, AVERROR_INVALIDDATA } from '../constants/constants.js';
import { bindings } from './binding.js';

import type { AVError } from '../constants/constants.js';
import type { NativeFFmpegError, NativeWrapper } from './native-types.js';

/**
 * POSIX error names that can be converted to FFmpeg error codes.
 * These are platform-specific and resolved at runtime.
 *
 * @example
 * ```typescript
 * import { PosixError, FFmpegError } from 'node-av';
 *
 * // Get platform-specific error code
 * const errorCode = FFmpegError.AVERROR(PosixError.EAGAIN);
 * console.log(`EAGAIN on this platform: ${errorCode}`);
 * ```
 */
export enum PosixError {
  EAGAIN = 'EAGAIN',
  ENOMEM = 'ENOMEM',
  EINVAL = 'EINVAL',
  EIO = 'EIO',
  EPIPE = 'EPIPE',
  ENOSPC = 'ENOSPC',
  ENOENT = 'ENOENT',
  EACCES = 'EACCES',
  EPERM = 'EPERM',
  EEXIST = 'EEXIST',
  ENODEV = 'ENODEV',
  ENOTDIR = 'ENOTDIR',
  EISDIR = 'EISDIR',
  EBUSY = 'EBUSY',
  EMFILE = 'EMFILE',
  ERANGE = 'ERANGE',
}

// Cache for error codes to avoid repeated native calls
const errorCache: Record<string, AVError> = {};

/**
 * Get a cached FFmpeg error code by name.
 *
 * @param name - POSIX error name
 *
 * @returns FFmpeg error code
 *
 * @internal
 */
function getCachedError(name: PosixError): AVError {
  if (!(name in errorCache)) {
    errorCache[name] = bindings.FFmpegError.getAverror(name);
  }
  return errorCache[name];
}

// Platform-specific POSIX errors used by FFmpeg
// These MUST be computed at runtime because POSIX error codes
// differ between operating systems (e.g., EAGAIN is 35 on macOS but 11 on Linux)

/** FFmpeg error code for EAGAIN (resource temporarily unavailable) */
export const AVERROR_EAGAIN = getCachedError(PosixError.EAGAIN);

/** FFmpeg error code for ENOMEM (out of memory) */
export const AVERROR_ENOMEM = getCachedError(PosixError.ENOMEM);

/** FFmpeg error code for EINVAL (invalid argument) */
export const AVERROR_EINVAL = getCachedError(PosixError.EINVAL);

/** FFmpeg error code for EIO (I/O error) */
export const AVERROR_EIO = getCachedError(PosixError.EIO);

/** FFmpeg error code for EPIPE (broken pipe) */
export const AVERROR_EPIPE = getCachedError(PosixError.EPIPE);

/** FFmpeg error code for ENOSPC (no space left on device) */
export const AVERROR_ENOSPC = getCachedError(PosixError.ENOSPC);

/** FFmpeg error code for ENOENT (no such file or directory) */
export const AVERROR_ENOENT = getCachedError(PosixError.ENOENT);

/** FFmpeg error code for EACCES (permission denied) */
export const AVERROR_EACCES = getCachedError(PosixError.EACCES);

/** FFmpeg error code for EPERM (operation not permitted) */
export const AVERROR_EPERM = getCachedError(PosixError.EPERM);

/** FFmpeg error code for EEXIST (file exists) */
export const AVERROR_EEXIST = getCachedError(PosixError.EEXIST);

/** FFmpeg error code for ENODEV (no such device) */
export const AVERROR_ENODEV = getCachedError(PosixError.ENODEV);

/** FFmpeg error code for ENOTDIR (not a directory) */
export const AVERROR_ENOTDIR = getCachedError(PosixError.ENOTDIR);

/** FFmpeg error code for EISDIR (is a directory) */
export const AVERROR_EISDIR = getCachedError(PosixError.EISDIR);

/** FFmpeg error code for EBUSY (device or resource busy) */
export const AVERROR_EBUSY = getCachedError(PosixError.EBUSY);

/** FFmpeg error code for EMFILE (too many open files) */
export const AVERROR_EMFILE = getCachedError(PosixError.EMFILE);

/** FFmpeg error code for ERANGE (result too large) */
export const AVERROR_ERANGE = getCachedError(PosixError.ERANGE);

/**
 * FFmpeg error handling class.
 *
 * Provides utilities for handling and converting FFmpeg error codes.
 * FFmpeg uses negative values for errors, with both FFmpeg-specific codes
 * and POSIX error codes converted to negative values. This class provides
 * methods to check, convert, and throw errors based on FFmpeg return codes.
 *
 * @example
 * ```typescript
 * import { FFmpegError } from 'node-av';
 * import { AVERROR_EAGAIN, AVERROR_EOF } from 'node-av/constants';
 *
 * // Check and throw errors
 * const ret = await codecContext.sendPacket(packet);
 * FFmpegError.throwIfError(ret, 'sendPacket');
 *
 * // Handle specific errors
 * if (ret === AVERROR_EAGAIN) {
 *   // Need to receive frames first
 * } else if (ret === AVERROR_EOF) {
 *   // End of stream
 * }
 *
 * // Get error description
 * const errorMsg = FFmpegError.strerror(ret);
 * console.error(`Error: ${errorMsg}`);
 * ```
 *
 * @see [av_strerror](https://ffmpeg.org/doxygen/trunk/group__lavu__error.html) - FFmpeg Doxygen
 */
export class FFmpegError extends Error implements NativeWrapper<NativeFFmpegError> {
  private native: NativeFFmpegError;

  constructor(code?: number) {
    const native = new bindings.FFmpegError(code);
    const message = code !== undefined ? native.message : 'FFmpeg Error';
    super(message);

    this.native = native;
    this.name = 'FFmpegError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FFmpegError);
    }
  }

  /**
   * Get human-readable error message for code.
   *
   * Converts an FFmpeg error code to a descriptive string.
   *
   * Direct mapping to av_strerror().
   *
   * @param errnum - FFmpeg error code
   *
   * @returns Error description string
   *
   * @example
   * ```typescript
   * const message = FFmpegError.strerror(-22);
   * console.log(message); // "Invalid argument"
   * ```
   */
  static strerror(errnum: number): string {
    return bindings.FFmpegError.strerror(errnum);
  }

  /**
   * Convert POSIX error name to FFmpeg error code.
   *
   * Converts platform-specific POSIX error to FFmpeg's negative error code.
   *
   * Direct mapping to AVERROR() macro.
   *
   * @param errorName - POSIX error name
   *
   * @returns FFmpeg error code
   *
   * @example
   * ```typescript
   * import { PosixError } from 'node-av';
   *
   * const code = FFmpegError.AVERROR(PosixError.ENOMEM);
   * // Returns platform-specific negative error code
   * ```
   *
   * @see {@link PosixError} For available error names
   */
  static AVERROR(errorName: PosixError): AVError {
    return bindings.FFmpegError.getAverror(errorName);
  }

  /**
   * Check if a code is an FFmpeg error.
   *
   * FFmpeg errors are negative values.
   *
   * @param code - Return code to check
   *
   * @returns True if code is an error
   *
   * @example
   * ```typescript
   * const ret = await formatContext.readFrame(packet);
   * if (FFmpegError.isFFmpegError(ret)) {
   *   console.error('Read failed');
   * }
   * ```
   */
  static isFFmpegError(code: number): boolean {
    if (typeof code !== 'number') {
      return false;
    }
    return code < 0;
  }

  /**
   * Create error from code.
   *
   * Creates an FFmpegError instance if the code is an error.
   *
   * @param code - FFmpeg return code
   *
   * @returns Error instance or null if not an error
   *
   * @example
   * ```typescript
   * const error = FFmpegError.fromCode(ret);
   * if (error) {
   *   console.error(`Error: ${error.message}`);
   * }
   * ```
   */
  static fromCode(code: number): FFmpegError | null {
    if (code >= 0) {
      return null;
    }
    return new FFmpegError(code);
  }

  /**
   * Throw if code indicates an error.
   *
   * Checks if the code is an error and throws an FFmpegError if so.
   * Commonly used pattern for FFmpeg API calls.
   *
   * @param code - FFmpeg return code
   *
   * @param operation - Optional operation name for context
   *
   * @throws {FFmpegError} If code is negative
   *
   * @example
   * ```typescript
   * // Simple error check
   * const ret = codecContext.open(codec);
   * FFmpegError.throwIfError(ret);
   *
   * // With operation context
   * const ret2 = await formatContext.writeHeader();
   * FFmpegError.throwIfError(ret2, 'writeHeader');
   * // Throws: "writeHeader failed: [error message]"
   * ```
   */
  static throwIfError(code: number, operation?: string): void {
    if (FFmpegError.isFFmpegError(code)) {
      const error = new FFmpegError(code);
      if (operation) {
        (error as any).message = `${operation}: ${error.message}`;
      }
      throw error;
    }
  }

  /**
   * Check if code matches specific error.
   *
   * Convenience method to check for specific error codes.
   *
   * @param code - Return code to check
   *
   * @param errorCode - Error code to compare against
   *
   * @returns True if codes match
   *
   * @example
   * ```typescript
   * import { AVERROR_EOF } from 'node-av/constants';
   *
   * if (FFmpegError.is(ret, AVERROR_EOF)) {
   *   console.log('End of file reached');
   * }
   * ```
   */
  static is(code: number, errorCode: number): boolean {
    return code === errorCode;
  }

  /**
   * Error code.
   *
   * The FFmpeg error code (negative value).
   */
  get code(): number {
    return this.native.code;
  }

  /**
   * Error message.
   *
   * Human-readable description of the error.
   */
  get message(): string {
    return this.native.message;
  }

  /**
   * Whether this is EAGAIN (resource temporarily unavailable).
   *
   * In codec/filter contexts this means "output not available yet, feed more
   * input" rather than a hard failure.
   *
   * @example
   * ```typescript
   * const error = FFmpegError.fromCode(ret);
   * if (error?.isEAGAIN) {
   *   // send more input, then retry
   * }
   * ```
   */
  get isEAGAIN(): boolean {
    return this.native.code === AVERROR_EAGAIN;
  }

  /**
   * Whether this is the end of stream (AVERROR_EOF).
   */
  get isEOF(): boolean {
    return this.native.code === AVERROR_EOF;
  }

  /**
   * Whether this is invalid data found while processing input (AVERROR_INVALIDDATA).
   */
  get isInvalidData(): boolean {
    return this.native.code === AVERROR_INVALIDDATA;
  }

  /**
   * Whether this is EINVAL (invalid argument).
   */
  get isEINVAL(): boolean {
    return this.native.code === AVERROR_EINVAL;
  }

  /**
   * Whether this is ENOMEM (out of memory).
   */
  get isENOMEM(): boolean {
    return this.native.code === AVERROR_ENOMEM;
  }

  /**
   * Whether this is ENOENT (no such file or directory).
   */
  get isENOENT(): boolean {
    return this.native.code === AVERROR_ENOENT;
  }

  /**
   * Whether this is EACCES (permission denied).
   */
  get isEACCES(): boolean {
    return this.native.code === AVERROR_EACCES;
  }

  /**
   * Whether this is EIO (I/O error).
   */
  get isEIO(): boolean {
    return this.native.code === AVERROR_EIO;
  }

  /**
   * Whether this is EPIPE (broken pipe).
   */
  get isEPIPE(): boolean {
    return this.native.code === AVERROR_EPIPE;
  }

  /**
   * Whether this is the immediate-exit request (AVERROR_EXIT).
   */
  get isExit(): boolean {
    return this.native.code === AVERROR_EXIT;
  }

  /**
   * Check if this error matches a specific code.
   *
   * @param errorCode - FFmpeg error code to compare against
   *
   * @returns True if this error's code matches
   *
   * @example
   * ```typescript
   * import { AVERROR_DECODER_NOT_FOUND } from 'node-av/constants';
   *
   * const error = FFmpegError.fromCode(ret);
   * if (error?.is(AVERROR_DECODER_NOT_FOUND)) {
   *   // handle missing decoder
   * }
   * ```
   */
  is(errorCode: number): boolean {
    return this.native.code === errorCode;
  }

  /**
   * Get the underlying native FFmpegError object.
   *
   * @returns The native FFmpegError binding object
   *
   * @internal
   */
  getNative(): NativeFFmpegError {
    return this.native;
  }
}
