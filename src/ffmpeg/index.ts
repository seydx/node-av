import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { getDirname, getUnpackedPath } from '../utils/electron.js';
import { isMusl } from '../utils/libc.js';
import { FFMPEG_VERSION } from './version.js';

const __dirname = getDirname(import.meta.url);
const require = createRequire(import.meta.url);

const FFMPEG_PACKAGE = '@seydx/node-av-ffmpeg';
const ffmpegFile = 'ffmpeg' + (process.platform === 'win32' ? '.exe' : '');

// Local build (development, CI tests): binary/ next to dist/
const localFfmpegPath = resolve(__dirname, '../../binary', ffmpegFile);

let resolvedFfmpegPath: string | null = null;

/**
 * Find the FFmpeg binary.
 *
 * Checks the local `binary/` folder first, then the platform package installed by `@seydx/node-av-ffmpeg`.
 *
 * @returns Absolute path to the binary, or `null` if neither is installed
 *
 * @internal
 */
function findFfmpeg(): string | null {
  if (resolvedFfmpegPath) {
    return resolvedFfmpegPath;
  }

  if (existsSync(localFfmpegPath)) {
    resolvedFfmpegPath = localFfmpegPath;
    return resolvedFfmpegPath;
  }

  try {
    // The platform package is a dependency of the meta package, not of node-av, so it is
    // resolved from there (strict layouts like pnpm don't expose it to node-av directly).
    const metaPackageJson = require.resolve(`${FFMPEG_PACKAGE}/package.json`);
    const platformPackage = `${FFMPEG_PACKAGE}-${process.platform}-${process.arch}${isMusl() ? '-musl' : ''}`;
    const platformPackageJson = createRequire(metaPackageJson).resolve(`${platformPackage}/package.json`);
    const path = getUnpackedPath(join(dirname(platformPackageJson), ffmpegFile));
    if (existsSync(path)) {
      resolvedFfmpegPath = path;
      return resolvedFfmpegPath;
    }
  } catch {
    // Not installed, or no build for this platform
  }

  return null;
}

/**
 * Get the absolute path to the FFmpeg binary.
 *
 * The binary ships in the optional `@seydx/node-av-ffmpeg` package
 * (`npm install @seydx/node-av-ffmpeg`), which installs the build for the
 * current platform. It is built from the same FFmpeg as the native bindings.
 * In Electron apps the path points into `app.asar.unpacked`.
 *
 * @returns Absolute path to the FFmpeg binary
 *
 * @throws {Error} If `@seydx/node-av-ffmpeg` is not installed or has no build for this platform
 *
 * @example
 * ```typescript
 * import { ffmpegPath } from 'node-av/ffmpeg';
 *
 * const path = ffmpegPath();
 * console.log('FFmpeg binary at:', path);
 * // e.g. /path/to/node_modules/@seydx/node-av-ffmpeg-linux-x64/ffmpeg
 * ```
 *
 * @example Convert video using FFmpeg binary
 * ```typescript
 * import { ffmpegPath } from 'node-av/ffmpeg';
 * import { execFile } from 'node:child_process';
 * import { promisify } from 'node:util';
 *
 * const execFileAsync = promisify(execFile);
 *
 * async function convertVideo(input: string, output: string) {
 *   const args = [
 *     '-i', input,
 *     '-c:v', 'libx264',
 *     '-crf', '23',
 *     '-c:a', 'aac',
 *     output
 *   ];
 *
 *   await execFileAsync(ffmpegPath(), args);
 * }
 * ```
 */
export function ffmpegPath(): string {
  const path = findFfmpeg();
  if (!path) {
    throw new Error(`FFmpeg binary not found for ${process.platform}-${process.arch}. Install it with: npm install ${FFMPEG_PACKAGE}`);
  }
  return path;
}

/**
 * Check if the FFmpeg binary is available.
 *
 * Returns whether `@seydx/node-av-ffmpeg` is installed with a build for
 * this platform, i.e. whether {@link ffmpegPath} will succeed.
 *
 * @returns `true` if the FFmpeg binary exists, `false` otherwise
 *
 * @example
 * ```typescript
 * import { isFfmpegAvailable, ffmpegPath } from 'node-av/ffmpeg';
 *
 * if (isFfmpegAvailable()) {
 *   console.log('FFmpeg is ready to use');
 *   // Safe to use ffmpegPath() and execute FFmpeg commands
 * } else {
 *   console.log('FFmpeg binary not found, run: npm install @seydx/node-av-ffmpeg');
 * }
 * ```
 *
 * @example Conditional FFmpeg usage
 * ```typescript
 * import { isFfmpegAvailable, ffmpegPath } from 'node-av/ffmpeg';
 * import { execFile } from 'node:child_process';
 *
 * async function getFFmpegVersion(): Promise<string | null> {
 *   if (!isFfmpegAvailable()) {
 *     return null;
 *   }
 *
 *   try {
 *     const { stdout } = await execFile(ffmpegPath(), ['-version']);
 *     return stdout;
 *   } catch (error) {
 *     console.error('Failed to execute FFmpeg:', error);
 *     return null;
 *   }
 * }
 * ```
 */
export function isFfmpegAvailable(): boolean {
  return findFfmpeg() !== null;
}

/**
 * Get the FFmpeg version used by the binary.
 *
 * @returns FFmpeg version string (e.g. "8.0")
 *
 * @example
 * ```typescript
 * import { ffmpegVersion } from 'node-av/ffmpeg';
 *
 * console.log('FFmpeg version:', ffmpegVersion());
 * // Output: FFmpeg version: 8.0
 * ```
 */
export function ffmpegVersion(): string {
  return FFMPEG_VERSION;
}
