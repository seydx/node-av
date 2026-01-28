import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regular expression to match Electron ASAR paths.
 * Matches `app.asar/` or `app.asar\` (Windows).
 */
const ASAR_PATH_REGEX = /app\.asar([/\\])/;

/**
 * Convert an ASAR path to its unpacked equivalent.
 *
 * In Electron applications with ASAR packaging, certain files (native modules,
 * binaries, data files) must be unpacked and are stored in `app.asar.unpacked`
 * instead of inside `app.asar`. This function converts paths accordingly.
 *
 * If the path doesn't contain `app.asar`, it's returned unchanged.
 *
 * @param path - The path to convert
 *
 * @returns The path with `app.asar` replaced by `app.asar.unpacked`
 *
 * @example
 * ```typescript
 * import { getUnpackedPath } from '../utils/electron.js';
 *
 * // In Electron with ASAR:
 * // Input:  /path/to/app.asar/node_modules/node-av/binary/ffmpeg
 * // Output: /path/to/app.asar.unpacked/node_modules/node-av/binary/ffmpeg
 *
 * const binaryPath = getUnpackedPath(__dirname);
 * ```
 */
export function getUnpackedPath(path: string): string {
  return path.replace(ASAR_PATH_REGEX, 'app.asar.unpacked$1');
}

/**
 * Get the directory name from an import.meta.url, with Electron ASAR handling.
 *
 * This is a convenience function that combines `fileURLToPath`, `dirname`,
 * and ASAR path conversion. Use this instead of manually creating `__dirname`
 * when the directory contains files that need to be unpacked from ASAR.
 *
 * @param importMetaUrl - The `import.meta.url` from the calling module
 *
 * @returns The directory path, adjusted for Electron ASAR if applicable
 *
 * @example
 * ```typescript
 * import { getDirname } from '../utils/electron.js';
 *
 * // Instead of:
 * // const __filename = fileURLToPath(import.meta.url);
 * // const __dirname = dirname(__filename).replace(/app\.asar([/\\])/, 'app.asar.unpacked$1');
 *
 * // Use:
 * const __dirname = getDirname(import.meta.url);
 * ```
 */
export function getDirname(importMetaUrl: string): string {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = dirname(__filename);
  return getUnpackedPath(__dirname);
}
