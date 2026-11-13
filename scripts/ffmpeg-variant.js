#!/usr/bin/env node

/**
 * The FFmpeg builds node-av is published in.
 *
 * gpl is the node-av package, lgpl is node-av-lgpl and light is node-av-light. The CI
 * builds every variant with NODE_AV_VARIANT set, the packaging script creates their npm
 * packages from this table, and the gyp files drop the libraries a variant's FFmpeg
 * doesn't build (macOS builds only those, Linux and Windows carry all of them).
 *
 * Usage: ffmpeg-variant.js gyp-exclude
 * Prints the regex for the "libraries/" exclude filter of the gyp files.
 */

import { fileURLToPath } from 'url';

// node-av and node-av-light: GPL FFmpeg, plus libfdk_aac under its own license
const GPL_LICENSE_TEXT =
  'FFmpeg is built with GPL components (x264, x265), so it is licensed under the GPL v3 or later. ' +
  'It also links libfdk_aac, which is licensed under the Fraunhofer FDK AAC license';

export const VARIANTS = {
  gpl: {
    package: 'node-av',
    ffmpegPackage: '@seydx/node-av-ffmpeg',
    title: 'the GPL build of node-av',
    // SPDX license of the binaries: FFmpeg, plus libfdk_aac in the GPL variants
    license: 'GPL-3.0-or-later AND FDK-AAC',
    licenseText: GPL_LICENSE_TEXT,
    excludedLibs: [],
  },
  lgpl: {
    package: 'node-av-lgpl',
    ffmpegPackage: '@seydx/node-av-ffmpeg-lgpl',
    title: 'the LGPL build of node-av',
    license: 'LGPL-3.0-or-later',
    licenseText: 'FFmpeg is built without GPL components and without libfdk_aac, so it is licensed under the LGPL v3 or later',
    // GPL libraries, chromaprint which links fftw3f on Linux, and libfdk_aac, which has
    // its own license
    excludedLibs: ['libx264', 'libx265', 'x265-static', 'libfftw3f', 'libchromaprint', 'libfdk-aac', 'fdk-aac'],
  },
  light: {
    package: 'node-av-light',
    ffmpegPackage: '@seydx/node-av-ffmpeg-light',
    title: 'the light build of node-av',
    license: 'GPL-3.0-or-later AND FDK-AAC',
    licenseText: GPL_LICENSE_TEXT,
    // Mirrors FF_SKIP_SCRIPTS in the builder's variants/defaults-light.sh
    excludedLibs: [
      // whisper
      'libwhisper',
      'libggml',
      'libggml-base',
      'libggml-cpu',
      'libggml-blas',
      'libggml-metal',
      'libggml-vulkan',
      'libggml-opencl',
      // libplacebo, JPEG XL and their color management
      'libplacebo',
      'libjxl',
      'libjxl_threads',
      'libjxl_cms',
      'libhwy',
      'jxl',
      'jxl_threads',
      'jxl_cms',
      'hwy',
      'liblcms2',
      // AV1, VP8/VP9, WebP, Theora and Vorbis encoders
      'libSvtAv1Enc',
      'SvtAv1Enc',
      'libvpx',
      'vpxmt',
      'libwebp',
      'libwebpmux',
      'libwebpdemux',
      'libsharpyuv',
      'libtheora',
      'libtheoraenc',
      'libtheoradec',
      'libvorbis',
      'libvorbisenc',
      'libvorbisfile',
      'libogg',
      'vorbis',
      'vorbisenc',
      'ogg',
      // Subtitles, Blu-ray, teletext, tracker music, fingerprinting
      'libass',
      'ass',
      'libunibreak',
      'liblinebreak',
      'libbluray',
      'libudfread',
      'libzvbi',
      'libopenmpt',
      'libchromaprint',
      'libfftw3f',
      // zscale, SRT, GMP
      'libzimg',
      'libsrt',
      'libgmp',
    ],
  },
};

/**
 * Get the variant the current build is for.
 *
 * @returns {string} Variant name from NODE_AV_VARIANT, gpl when unset
 * @throws {Error} If NODE_AV_VARIANT names no known variant
 */
export const currentVariant = () => {
  const variant = process.env.NODE_AV_VARIANT || 'gpl';
  if (!Object.hasOwn(VARIANTS, variant)) {
    throw new Error(`Unknown NODE_AV_VARIANT '${variant}', expected one of: ${Object.keys(VARIANTS).join(', ')}`);
  }
  return variant;
};

/**
 * Build the gyp exclude regex for a variant's missing libraries.
 *
 * It matches a library entry by its file name (libx264.a, x265-static.lib), whether the
 * entry is a full path, a -l: flag or a bare MSVC name.
 *
 * @param {string} variant - Variant name
 * @returns {string} Regex for the gyp "libraries/" filter
 */
export const gypExcludePattern = (variant) => {
  const libs = VARIANTS[variant].excludedLibs;
  // Matches nothing, gyp needs a pattern either way
  if (libs.length === 0) {
    return '^$';
  }
  return `(^|[/:])(${libs.join('|')})\\.(a|lib)$`;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command] = process.argv.slice(2);
  if (command === 'gyp-exclude') {
    console.log(gypExcludePattern(currentVariant()));
  } else {
    console.error('Usage: ffmpeg-variant.js gyp-exclude');
    process.exit(1);
  }
}
