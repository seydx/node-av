import { AVFLAG_NONE } from '../constants/constants.js';
import { bindings } from './binding.js';

import type { AVDictFlag } from '../constants/constants.js';
import type { NativeDictionary, NativeWrapper } from './native-types.js';

/**
 * Key-value dictionary for FFmpeg options and metadata.
 *
 * Stores string key-value pairs used throughout FFmpeg for options, metadata,
 * and configuration. Provides methods for setting, getting, and manipulating
 * dictionary entries. Used extensively for codec options, format options,
 * and metadata handling.
 *
 * Direct mapping to FFmpeg's AVDictionary.
 *
 * @example
 * ```typescript
 * import { Dictionary, FFmpegError } from 'node-av';
 * import { AV_DICT_IGNORE_SUFFIX } from 'node-av/constants';
 *
 * // Create from object
 * const dict = Dictionary.fromObject({
 *   'title': 'My Video',
 *   'artist': 'Me',
 *   'year': '2024'
 * });
 *
 * // Set individual values
 * const dict2 = new Dictionary();
 * dict2.alloc();
 * let ret = dict2.set('preset', 'fast');
 * FFmpegError.throwIfError(ret, 'set');
 *
 * // Parse from string
 * ret = dict2.parseString('key1=value1:key2=value2', '=', ':');
 * FFmpegError.throwIfError(ret, 'parseString');
 *
 * // Get all entries
 * const entries = dict2.getAll();
 * console.log(entries); // { key1: 'value1', key2: 'value2' }
 * ```
 *
 * @see [AVDictionary](https://ffmpeg.org/doxygen/trunk/group__lavu__dict.html) - FFmpeg Doxygen
 * @see {@link CodecContext} For codec options
 * @see {@link FormatContext} For format options
 */
export class Dictionary implements Disposable, NativeWrapper<NativeDictionary> {
  private native: NativeDictionary;

  constructor() {
    this.native = new bindings.Dictionary();
  }

  /**
   * Create dictionary from JavaScript object.
   *
   * Convenience method to create a dictionary from a plain object.
   *
   * @param obj - Object with string key-value pairs
   *
   * @param flags - Flags for setting entries
   *
   * @returns New dictionary with entries from object
   *
   * @example
   * ```typescript
   * const metadata = Dictionary.fromObject({
   *   'title': 'My Song',
   *   'album': 'My Album',
   *   'date': '2024',
   *   'track': '1/10'
   * });
   *
   * // Use for codec options
   * const options = Dictionary.fromObject({
   *   'preset': 'medium',
   *   'crf': 23,
   *   'profile': 'high'
   * });
   * ```
   */
  static fromObject(obj: Record<string, string | number | boolean | bigint | undefined | null>, flags: AVDictFlag = AVFLAG_NONE): Dictionary {
    const dict = new Dictionary();
    dict.alloc();

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) {
        continue;
      }

      dict.set(key, value.toString(), flags);
    }
    return dict;
  }

  /**
   * Create dictionary from native instance.
   *
   * @param native - Native dictionary instance
   *
   * @returns Dictionary wrapper
   *
   * @internal
   */
  static fromNative(native: NativeDictionary): Dictionary {
    const dict = Object.create(Dictionary.prototype) as Dictionary;
    (dict as any).native = native;
    return dict;
  }

  /**
   * Allocate a dictionary.
   *
   * Allocates memory for the dictionary structure.
   * Must be called before using the dictionary.
   *
   * Direct mapping to av_dict_alloc().
   *
   * @throws {Error} If allocation fails (ENOMEM)
   *
   * @example
   * ```typescript
   * const dict = new Dictionary();
   * dict.alloc();
   * // Dictionary is now ready for use
   * ```
   *
   * @see {@link free} To deallocate
   */
  alloc(): void {
    this.native.alloc();
  }

  /**
   * Free the dictionary.
   *
   * Releases all memory associated with the dictionary.
   * The dictionary becomes invalid after calling this.
   *
   * Direct mapping to av_dict_free().
   *
   * @example
   * ```typescript
   * dict.free();
   * // Dictionary is now invalid
   * ```
   *
   * @see {@link alloc} To allocate
   * @see {@link Symbol.dispose} For automatic cleanup
   */
  free(): void {
    this.native.free();
  }

  /**
   * Copy entries to another dictionary.
   *
   * Copies all entries from this dictionary to the destination.
   *
   * Direct mapping to av_dict_copy().
   *
   * @param dst - Destination dictionary
   *
   * @param flags - Copy flags
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const dst = new Dictionary();
   * dst.alloc();
   * const ret = src.copy(dst);
   * FFmpegError.throwIfError(ret, 'copy');
   * ```
   */
  copy(dst: Dictionary, flags: AVDictFlag = AVFLAG_NONE): number {
    return this.native.copy(dst.getNative(), flags);
  }

  /**
   * Set a dictionary entry.
   *
   * Sets or updates a key-value pair in the dictionary.
   *
   * Direct mapping to av_dict_set().
   *
   * @param key - Entry key
   *
   * @param value - Entry value
   *
   * @param flags - Set flags (e.g., AV_DICT_DONT_OVERWRITE)
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AV_DICT_DONT_OVERWRITE } from 'node-av/constants';
   *
   * // Set or update entry
   * let ret = dict.set('bitrate', '128k');
   * FFmpegError.throwIfError(ret, 'set');
   *
   * // Set only if not exists
   * ret = dict.set('preset', 'fast', AV_DICT_DONT_OVERWRITE);
   * FFmpegError.throwIfError(ret, 'set');
   * ```
   *
   * @see {@link get} To retrieve values
   */
  set(key: string, value: string, flags: AVDictFlag = AVFLAG_NONE): number {
    return this.native.set(key, value, flags);
  }

  /**
   * Get a dictionary entry.
   *
   * Retrieves the value for a given key.
   *
   * Direct mapping to av_dict_get().
   *
   * @param key - Entry key to look up
   *
   * @param flags - Search flags (e.g., AV_DICT_IGNORE_SUFFIX)
   *
   * @returns Entry value, or null if not found
   *
   * @example
   * ```typescript
   * const value = dict.get('bitrate');
   * if (value) {
   *   console.log(`Bitrate: ${value}`);
   * }
   *
   * // Case-insensitive search
   * import { AV_DICT_MATCH_CASE } from 'node-av/constants';
   * const title = dict.get('Title', AV_DICT_MATCH_CASE);
   * ```
   *
   * @see {@link set} To set values
   * @see {@link getAll} To get all entries
   */
  get(key: string, flags: AVDictFlag = AVFLAG_NONE): string | null {
    return this.native.get(key, flags);
  }

  /**
   * Count dictionary entries.
   *
   * Returns the number of key-value pairs in the dictionary.
   *
   * Direct mapping to av_dict_count().
   *
   * @returns Number of entries
   *
   * @example
   * ```typescript
   * const count = dict.count();
   * console.log(`Dictionary has ${count} entries`);
   * ```
   */
  count(): number {
    return this.native.count();
  }

  /**
   * Get all dictionary entries.
   *
   * Returns all key-value pairs as a JavaScript object.
   *
   * @returns Object with all entries
   *
   * @example
   * ```typescript
   * const entries = dict.getAll();
   * for (const [key, value] of Object.entries(entries)) {
   *   console.log(`${key}: ${value}`);
   * }
   * ```
   *
   * @see {@link get} To get individual entries
   */
  getAll(): Record<string, string> {
    return this.native.getAll();
  }

  /**
   * Parse entries from a string.
   *
   * Parses key-value pairs from a formatted string and adds them
   * to the dictionary.
   *
   * Direct mapping to av_dict_parse_string().
   *
   * @param str - String to parse
   *
   * @param keyValSep - Separator between key and value
   *
   * @param pairsSep - Separator between pairs
   *
   * @param flags - Parse flags
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_EINVAL: Invalid format
   *   - AVERROR_ENOMEM: Memory allocation failure
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Parse colon-separated pairs
   * let ret = dict.parseString('key1=val1:key2=val2', '=', ':');
   * FFmpegError.throwIfError(ret, 'parseString');
   *
   * // Parse comma-separated pairs
   * ret = dict.parseString('width=1920,height=1080', '=', ',');
   * FFmpegError.throwIfError(ret, 'parseString');
   * ```
   *
   * @see {@link getString} To serialize to string
   */
  parseString(str: string, keyValSep: string, pairsSep: string, flags: AVDictFlag = AVFLAG_NONE): number {
    return this.native.parseString(str, keyValSep, pairsSep, flags);
  }

  /**
   * Convert dictionary to string.
   *
   * Serializes all entries to a formatted string.
   *
   * Direct mapping to av_dict_get_string().
   *
   * @param keyValSep - Separator between key and value
   *
   * @param pairsSep - Separator between pairs
   *
   * @returns Formatted string, or null on error
   *
   * @example
   * ```typescript
   * // Serialize to colon-separated format
   * const str = dict.getString('=', ':');
   * console.log(str); // "key1=val1:key2=val2"
   *
   * // Serialize to comma-separated format
   * const csv = dict.getString('=', ',');
   * console.log(csv); // "key1=val1,key2=val2"
   * ```
   *
   * @see {@link parseString} To parse from string
   */
  getString(keyValSep: string, pairsSep: string): string | null {
    return this.native.getString(keyValSep, pairsSep);
  }

  /**
   * Get the underlying native Dictionary object.
   *
   * @returns The native Dictionary binding object
   *
   * @internal
   */
  getNative(): NativeDictionary {
    return this.native;
  }

  /**
   * Dispose of the dictionary.
   *
   * Implements the Disposable interface for automatic cleanup.
   * Equivalent to calling free().
   *
   * @example
   * ```typescript
   * {
   *   using dict = new Dictionary();
   *   dict.alloc();
   *   dict.set('key', 'value');
   *   // Use dict...
   * } // Automatically freed when leaving scope
   * ```
   */
  [Symbol.dispose](): void {
    this.native[Symbol.dispose]();
  }
}
