#!/usr/bin/env node

/**
 * Shared utilities for build scripts
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache the root path to avoid repeated lookups and logging
let cachedRootPath = null;

/**
 * Get FFmpeg development path
 * @param {'root'|'include'|'lib'|'bin'} target - The target directory to get
 * @returns {string} The path to the requested FFmpeg directory
 */
export const getFFmpegPath = (target = 'root') => {
  // Use cached path if available
  if (cachedRootPath) {
    switch (target) {
      case 'include':
        return join(cachedRootPath, 'include');
      case 'lib':
        return join(cachedRootPath, 'lib');
      case 'bin':
        return join(cachedRootPath, 'bin');
      case 'root':
      default:
        return cachedRootPath;
    }
  }

  let rootPath = null;

  // First check environment variable
  if (process.env.FFMPEG_DEV_PATH) {
    const envPath = process.env.FFMPEG_DEV_PATH;
    if (existsSync(envPath)) {
      rootPath = envPath;
    }
  }

  if (!rootPath) {
    // Try pkg-config for installed FFmpeg
    try {
      const pkgConfigPath = execSync('pkg-config --variable=prefix libavutil', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'], // Suppress stderr
      }).trim();
      if (pkgConfigPath && existsSync(pkgConfigPath)) {
        // Verify it has the expected structure
        if (existsSync(join(pkgConfigPath, 'include/libavcodec/avcodec.h'))) {
          console.log('Using FFmpeg from pkg-config');
          rootPath = pkgConfigPath;
        }
      }
    } catch {
      // pkg-config not available or libavutil not found
    }
  }

  if (!rootPath) {
    // Check common installation paths
    const commonPaths = [
      '/opt/ffbuild/prefix', // CI builds
      '/usr/local', // Linux/macOS local
      '/opt/homebrew', // macOS Homebrew ARM64
      '/usr/local/opt/ffmpeg', // macOS Homebrew x64
      '/usr', // System-wide Linux
      'C:\\msys64\\clang64', // Windows CLANG64
      'C:\\msys64\\clangarm64', // Windows CLANGARM64
      '/clang64/ffbuild', // Windows CI CLANG64
      '/clangarm64/ffbuild', // Windows CI CLANGARM64
    ];

    for (const testPath of commonPaths) {
      if (existsSync(join(testPath, 'include/libavcodec/avcodec.h'))) {
        console.log(`Using FFmpeg from: ${testPath}`);
        rootPath = testPath;
        break;
      }
    }
  }

  // Fallback to source directories if no installed FFmpeg found
  if (!rootPath) {
    // Try Jellyfin FFmpeg source
    const jellyfinPath = join(__dirname, '../externals/jellyfin-ffmpeg');
    if (existsSync(jellyfinPath)) {
      console.log('Using Jellyfin FFmpeg source');
      // For source directories, the structure is different
      cachedRootPath = jellyfinPath;
      // Source directories have headers in lib* directories, not in an include folder
      return jellyfinPath;
    }

    // Fallback to original FFmpeg source
    const ffmpegPath = join(__dirname, '../externals/ffmpeg');
    console.log('Using original FFmpeg source');
    cachedRootPath = ffmpegPath;
    // Source directories have headers in lib* directories, not in an include folder
    return ffmpegPath;
  }

  // Cache the root path for subsequent calls
  cachedRootPath = rootPath;

  // Return the requested target directory
  switch (target) {
    case 'include':
      return join(rootPath, 'include');
    case 'lib':
      return join(rootPath, 'lib');
    case 'bin':
      return join(rootPath, 'bin');
    case 'root':
    default:
      return rootPath;
  }
};

/**
 * Get library paths for linking
 * @returns {{includePaths: string[], libPaths: string[]}}
 */
export const getFFmpegLinkPaths = () => {
  const includePath = getFFmpegPath('include');
  const libPath = getFFmpegPath('lib');

  // Build lists of possible paths
  const possibleIncludePaths = [
    `-I${includePath}`,
    '/opt/ffbuild/prefix/include', // CI builds
    '/usr/local/include', // Linux/macOS local
    '/opt/homebrew/include', // macOS Homebrew ARM64
    '/usr/local/opt/ffmpeg/include', // macOS Homebrew x64
    'C:\\msys64\\clang64\\include', // Windows CLANG64
    'C:\\msys64\\clangarm64\\include', // Windows CLANGARM64
  ];

  const possibleLibPaths = [
    libPath,
    '/opt/ffbuild/prefix/lib', // CI builds
    '/usr/local/lib', // Linux/macOS local
    '/opt/homebrew/lib', // macOS Homebrew ARM64
    '/usr/local/opt/ffmpeg/lib', // macOS Homebrew x64
    'C:\\msys64\\clang64\\lib', // Windows CLANG64
    'C:\\msys64\\clangarm64\\lib', // Windows CLANGARM64
  ];

  // Filter to only existing paths
  const includePaths = possibleIncludePaths
    .filter((p) => {
      if (p.startsWith('-I')) {
        const path = p.substring(2);
        return existsSync(path);
      }
      return existsSync(p);
    })
    .map((p) => (p.startsWith('-I') ? p : `-I${p}`))
    .join(' ');

  const libPaths = possibleLibPaths
    .filter((p) => existsSync(p))
    .map((p) => `-L${p}`)
    .join(' ');

  return { includePaths, libPaths };
};

/**
 * Build a map from FFCodec C identifier to the
 * runtime codec name from `.p.name` by scanning libavcodec/*.c.
 *
 * The C identifier and runtime name differ for a handful of codecs
 * (libvpx VP8/VP9, libaom-av1, libzvbi_teletextdec, libxevd, ...). Only the
 * runtime name is accepted by avcodec_find_{encoder,decoder}_by_name().
 *
 * @param {string} ffmpegPath - Path to FFmpeg source root
 * @param {{ scanPatches?: boolean }} [options] - When scanPatches is true, also
 *   parses debian/patches/*.patch for codec definitions added by patches (only
 *   useful if the tree is not yet patched; harmless otherwise).
 * @returns {Map<string, string>} Map of "<id>_(encoder|decoder)" -> runtime name
 */
export const buildCodecNameIndex = (ffmpegPath, { scanPatches = false } = {}) => {
  const index = new Map();

  // Match a full FFCodec struct: [const] FFCodec ff_<id>_(encoder|decoder) = { ... };
  // The body capture is non-greedy and terminated by a line ending in `};`.
  const blockRe = /(?:const\s+)?FFCodec\s+ff_(\w+_(?:encoder|decoder))\s*=\s*\{([\s\S]*?)\n\}\s*;/g;
  const nameRe = /\.p\.name\s*=\s*"([^"]+)"/;

  const addFromContent = (content) => {
    blockRe.lastIndex = 0;
    let m;
    while ((m = blockRe.exec(content)) !== null) {
      const symbol = m[1];
      const nm = m[2].match(nameRe);
      if (nm && !index.has(symbol)) {
        index.set(symbol, nm[1]);
      }
    }
  };

  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && (entry.name.endsWith('.c') || entry.name.endsWith('.h'))) {
        // .h scan covers cases like aac/aacdec_latm.h which defines a codec inline.
        try {
          addFromContent(readFileSync(full, 'utf8'));
        } catch {
          // unreadable - skip
        }
      }
    }
  };

  const libavcodec = join(ffmpegPath, 'libavcodec');
  if (existsSync(libavcodec)) {
    walk(libavcodec);
  }

  if (scanPatches) {
    const patchesDir = join(ffmpegPath, 'debian', 'patches');
    if (existsSync(patchesDir)) {
      for (const file of readdirSync(patchesDir).filter((f) => f.endsWith('.patch'))) {
        try {
          const raw = readFileSync(join(patchesDir, file), 'utf8');
          // Strip leading '+' from added lines so the struct-block regex can match
          const added = raw
            .split('\n')
            .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
            .map((l) => l.slice(1))
            .join('\n');
          addFromContent(added);
        } catch {
          // unreadable - skip
        }
      }
    }
  }

  return index;
};
