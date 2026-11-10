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
 * Scan libavcodec for literal FFCodec definitions and collect the runtime name
 * (`.p.name`) and media type (`.p.type`) of each.
 *
 * Codecs generated by token-pasting macros (PCM, ADPCM, CUVID, QSV, AudioToolbox,
 * MediaCodec, Media Foundation, ...) have no literal `ff_<id>_(encoder|decoder)`
 * struct and are absent from the result.
 *
 * @param {string} ffmpegPath - Path to FFmpeg source root
 * @param {{ scanPatches?: boolean }} [options] - When scanPatches is true, also
 *   parses debian/patches/*.patch for codec definitions added by patches (only
 *   useful if the tree is not yet patched; harmless otherwise).
 * @returns {Map<string, { name: string, type: string | null }>} Map of
 *   "<id>_(encoder|decoder)" -> runtime name and lower-case media type
 * @internal
 */
const scanCodecDefinitions = (ffmpegPath, { scanPatches = false } = {}) => {
  const index = new Map();

  // Match a full FFCodec struct: [const] FFCodec ff_<id>_(encoder|decoder) = { ... };
  // The body capture is non-greedy and terminated by a line ending in `};`.
  const blockRe = /(?:const\s+)?FFCodec\s+ff_(\w+_(?:encoder|decoder))\s*=\s*\{([\s\S]*?)\n\}\s*;/g;
  const nameRe = /\.p\.name\s*=\s*"([^"]+)"/;
  const typeRe = /\.p\.type\s*=\s*AVMEDIA_TYPE_(\w+)/;

  const addFromContent = (content) => {
    blockRe.lastIndex = 0;
    let m;
    while ((m = blockRe.exec(content)) !== null) {
      const symbol = m[1];
      const nm = m[2].match(nameRe);
      if (nm && !index.has(symbol)) {
        const tm = m[2].match(typeRe);
        index.set(symbol, { name: nm[1], type: tm ? tm[1].toLowerCase() : null });
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
    for (const added of readPatchAdditions(ffmpegPath)) {
      addFromContent(added);
    }
  }

  return index;
};

/**
 * Read the lines each debian/patches/*.patch adds, with the leading '+' removed,
 * so source regexes can match code that only exists once the series is applied.
 *
 * @param {string} ffmpegPath - Path to FFmpeg source root
 * @returns {string[]} Added content, one entry per patch file
 * @internal
 */
const readPatchAdditions = (ffmpegPath) => {
  const patchesDir = join(ffmpegPath, 'debian', 'patches');
  if (!existsSync(patchesDir)) {
    return [];
  }

  const additions = [];
  for (const file of readdirSync(patchesDir).filter((f) => f.endsWith('.patch'))) {
    try {
      const raw = readFileSync(join(patchesDir, file), 'utf8');
      additions.push(
        raw
          .split('\n')
          .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
          .map((l) => l.slice(1))
          .join('\n'),
      );
    } catch {
      // unreadable - skip
    }
  }
  return additions;
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
export const buildCodecNameIndex = (ffmpegPath, options = {}) => {
  return new Map([...scanCodecDefinitions(ffmpegPath, options)].map(([symbol, def]) => [symbol, def.name]));
};

/**
 * Build a resolver for the media type of an encoder or decoder.
 *
 * Literal FFCodec definitions carry `.p.type` themselves. Macro-generated codecs
 * have none, so their type comes from the codec they implement: the descriptor in
 * codec_desc.c or the software codec of that name, found by dropping trailing name
 * segments ("pcm_s16le" -> descriptor "pcm_s16le", "h264_cuvid" -> "h264",
 * "amrnb_mediacodec" -> software decoder "amrnb"), and as a last resort from the
 * descriptors that start with that name ("mpeg2_cuvid" -> "mpeg2video").
 *
 * @param {string} ffmpegPath - Path to FFmpeg source root
 * @param {{ scanPatches?: boolean }} [options] - Same as {@link buildCodecNameIndex}
 * @returns {(symbol: string) => string | null} Maps "<id>_(encoder|decoder)" to its
 *   lower-case media type ('video', 'audio', 'subtitle', 'data', ...), or null when
 *   neither source knows it
 */
export const buildCodecTypeResolver = (ffmpegPath, options = {}) => {
  const definitions = scanCodecDefinitions(ffmpegPath, options);

  const descriptors = new Map();
  const descriptorRe = /\.type\s*=\s*AVMEDIA_TYPE_(\w+),\s*\.name\s*=\s*"([^"]+)"/g;
  const descriptorSources = [readFileSync(join(ffmpegPath, 'libavcodec', 'codec_desc.c'), 'utf8')];
  if (options.scanPatches) {
    descriptorSources.push(...readPatchAdditions(ffmpegPath));
  }
  for (const content of descriptorSources) {
    for (const m of content.matchAll(descriptorRe)) {
      if (!descriptors.has(m[2])) {
        descriptors.set(m[2], m[1].toLowerCase());
      }
    }
  }

  return (symbol) => {
    const own = definitions.get(symbol)?.type;
    if (own) {
      return own;
    }

    const parts = symbol.replace(/_(?:encoder|decoder)$/, '').split('_');
    for (let n = parts.length; n > 0; n--) {
      const base = parts.slice(0, n).join('_');
      const type = descriptors.get(base) ?? definitions.get(`${base}_decoder`)?.type ?? definitions.get(`${base}_encoder`)?.type;
      if (type) {
        return type;
      }
    }

    // Hardware wrappers may use a short form of the descriptor name ("mpeg2_cuvid" for
    // "mpeg2video"). Accept a prefix match only if every match agrees on the type.
    for (let n = parts.length; n > 0; n--) {
      const base = parts.slice(0, n).join('_');
      const types = new Set([...descriptors].filter(([name]) => name.startsWith(base)).map(([, type]) => type));
      if (types.size === 1) {
        return [...types][0];
      }
    }
    return null;
  };
};

// NVENC SDK version of each nv-codec-headers commit that builder/scripts.d/50-ffnvcodec.sh
// pins. Add the new commit when the pin moves; its tag (n12.0.16.1, ...) names the version.
const NV_CODEC_HEADERS_SDK = {
  '451da99614412a7f9526ef301a5ee0c7a6f9ad76': [12, 0], // n12.0.16.1
};

/**
 * Resolve the NVENC feature macros (NVENC_HAVE_*, NVENC_NO_DEPRECATED_RC) of the build.
 *
 * libavcodec/nvenc.h defines each macro inside an `#if NVENCAPI_CHECK_VERSION(major, minor)`
 * block, and the NVENC encoders declare options behind them (lookahead_level, tf_level, ...).
 * The macros the bundled headers' SDK version reaches are defined, the rest are not.
 *
 * @param {string} ffmpegPath - Path to FFmpeg source root
 * @returns {Map<string, boolean>} Macro name -> defined; empty when the tree has no
 *   jellyfin builder (the options of every branch are then kept)
 * @throws {Error} When the pinned nv-codec-headers commit has no known SDK version
 */
export const getNvencFeatureMacros = (ffmpegPath) => {
  const script = join(ffmpegPath, 'builder', 'scripts.d', '50-ffnvcodec.sh');
  if (!existsSync(script)) {
    console.warn(`No ${script}: NVENC options of every SDK version are kept`);
    return new Map();
  }

  const commit = readFileSync(script, 'utf8').match(/^SCRIPT_COMMIT="([0-9a-f]+)"/m)?.[1];
  const sdk = NV_CODEC_HEADERS_SDK[commit];
  if (!sdk) {
    throw new Error(`Unknown nv-codec-headers commit ${commit} in ${script}: add its SDK version to NV_CODEC_HEADERS_SDK in scripts/utils.js`);
  }

  const macros = new Map();
  let gate = null;
  for (const line of readFileSync(join(ffmpegPath, 'libavcodec', 'nvenc.h'), 'utf8').split('\n')) {
    let m;
    if ((m = line.match(/^#if NVENCAPI_CHECK_VERSION\((\d+),\s*(\d+)\)/))) {
      gate = [Number(m[1]), Number(m[2])];
    } else if (/^#endif/.test(line)) {
      gate = null;
    } else if ((m = line.match(/^#define (NVENC_\w+)/))) {
      macros.set(m[1], !gate || gate[0] < sdk[0] || (gate[0] === sdk[0] && gate[1] <= sdk[1]));
    }
  }
  return macros;
};
