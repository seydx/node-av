#!/usr/bin/env node

/**
 * Generate TypeScript constants for all available FFmpeg encoders
 * This extracts encoder names directly from FFmpeg source code (allcodecs.c)
 * to get ALL compiled encoders, including hardware encoders
 *
 * Optionally applies Jellyfin patches before extraction to get all encoder definitions
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { buildCodecNameIndex, getFFmpegPath } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FFMPEG_PATH = getFFmpegPath('');
const ALLCODECS_PATH = join(FFMPEG_PATH, 'libavcodec', 'allcodecs.c');
const PATCHES_DIR = join(FFMPEG_PATH, 'debian', 'patches');

console.log(`Using FFmpeg source from: ${FFMPEG_PATH}`);

/**
 * Extract encoder definitions from patch files
 */
const extractEncodersFromPatches = () => {
  const patchedEncoders = [];

  // Check if patches directory exists
  if (!existsSync(PATCHES_DIR)) {
    return patchedEncoders;
  }

  const patchFiles = readdirSync(PATCHES_DIR).filter((f) => f.endsWith('.patch'));

  console.log(`Scanning ${patchFiles.length} patch files for encoder definitions...`);

  for (const patchFile of patchFiles) {
    const content = readFileSync(join(PATCHES_DIR, patchFile), 'utf8');

    // Look for added encoder declarations in patches
    // Format: +extern const FFCodec ff_<name>_encoder; OR +extern FFCodec ff_<name>_encoder;
    const encoderPattern = /\+extern (?:const )?FFCodec ff_(\w+)_encoder;/g;
    let match;
    let patchEncoders = [];

    while ((match = encoderPattern.exec(content)) !== null) {
      const name = match[1];
      patchEncoders.push(name);
      patchedEncoders.push(name);
    }

    if (patchEncoders.length > 0) {
      console.log(`  ${patchFile}: found ${patchEncoders.length} encoder(s): ${patchEncoders.join(', ')}`);
    }
  }

  return [...new Set(patchedEncoders)]; // Deduplicate
};

console.log(`Reading encoder definitions from: ${ALLCODECS_PATH}`);

/**
 * Extract all encoder names from allcodecs.c
 */
const extractEncoders = (includePatches = false) => {
  if (!existsSync(ALLCODECS_PATH)) {
    throw new Error(`Could not find allcodecs.c at ${ALLCODECS_PATH}`);
  }

  const content = readFileSync(ALLCODECS_PATH, 'utf8');

  // Extract all encoder declarations
  // Format: extern const FFCodec ff_<name>_encoder; OR extern FFCodec ff_<name>_encoder;
  const encoderPattern = /extern (?:const )?FFCodec ff_(\w+)_encoder;/g;
  const encoders = [];
  let match;

  while ((match = encoderPattern.exec(content)) !== null) {
    const name = match[1];
    encoders.push(name);
  }

  // Add encoders from patches if requested
  if (includePatches) {
    const patchEncoders = extractEncodersFromPatches();
    if (patchEncoders.length > 0) {
      console.log(`\nAdding ${patchEncoders.length} encoder(s) from patches`);
      encoders.push(...patchEncoders);
    }
  }

  return [...new Set(encoders)].sort(); // Deduplicate and sort
};

/**
 * Categorize encoder by type and hardware
 */
const categorizeEncoder = (name) => {
  // Determine media type
  let mediaType = 'video'; // Default to video

  // Audio encoder patterns
  if (
    name.match(
      // eslint-disable-next-line @stylistic/max-len
      /^(aac|ac3|eac3|mp2|mp3|opus|flac|vorbis|alac|tta|wavpack|mlp|truehd|dca|dts|pcm|adpcm|g72|aptx|sbc|libmp3|libopus|libvorbis|libfdk|libspeex|nellymoser|wmav|real-144|sonic|dfpwm|comfortnoise|s302m|roq-dpcm|ilbc|gsm|amr|at$|at-|mf$|-mf-)/,
    )
  ) {
    mediaType = 'audio';
  } else if (name.match(/^(ass|ssa|srt|subrip|webvtt|dvbsub|dvdsub|mov-text|text|ttml|xsub)/)) {
    // Subtitle encoder patterns
    mediaType = 'subtitle';
  }

  // Determine if hardware accelerated
  let isHardware = false;
  let hardwareType = null;

  if (name.includes('_nvenc')) {
    isHardware = true;
    hardwareType = 'NVIDIA NVENC';
  } else if (name.includes('_amf')) {
    isHardware = true;
    hardwareType = 'AMD AMF';
  } else if (name.includes('_qsv')) {
    isHardware = true;
    hardwareType = 'Intel Quick Sync';
  } else if (name.includes('_vaapi')) {
    isHardware = true;
    hardwareType = 'VA-API';
  } else if (name.includes('_videotoolbox')) {
    isHardware = true;
    hardwareType = 'VideoToolbox (macOS)';
  } else if (name.includes('_mediacodec')) {
    isHardware = true;
    hardwareType = 'Android MediaCodec';
  } else if (name.includes('_v4l2m2m')) {
    isHardware = true;
    hardwareType = 'V4L2 M2M';
  } else if (name.includes('_d3d12va')) {
    isHardware = true;
    hardwareType = 'Direct3D 12';
  } else if (name.includes('_d3d11va')) {
    isHardware = true;
    hardwareType = 'Direct3D 11';
  } else if (name.includes('_mf')) {
    isHardware = true;
    hardwareType = 'Media Foundation';
  } else if (name.includes('_omx')) {
    isHardware = true;
    hardwareType = 'OpenMAX';
  } else if (name.includes('_rkmpp')) {
    isHardware = true;
    hardwareType = 'Rockchip MPP';
  } else if (name.endsWith('_at')) {
    isHardware = true;
    hardwareType = 'AudioToolbox (macOS)';
  }

  return { mediaType, isHardware, hardwareType };
};

/**
 * Convert encoder name to constant name
 */
const toConstantName = (name) => {
  return 'FF_ENCODER_' + name.toUpperCase().replace(/_/g, '_');
};

/**
 * Generate TypeScript output
 */
const generateTypeScript = (includePatches = false) => {
  const encoders = extractEncoders(includePatches);

  // Build C-identifier -> runtime codec name map by scanning codec definitions.
  // For most codecs the two match; for libvpx VP8/VP9, libaom-av1, libxevd etc.
  // they differ and only the runtime name works with avcodec_find_encoder_by_name().
  const codecNameIndex = buildCodecNameIndex(FFMPEG_PATH, { scanPatches: includePatches });
  const codecName = (cId) => codecNameIndex.get(`${cId}_encoder`) ?? cId;

  // Codecs defined via token-pasting macros (PCM/ADPCM/CUVID/QSV/AT/MF/MediaCodec/V4L2M2M)
  // can't be resolved by regex — but the macro stringifies the same token used in the C id,
  // so the C-identifier equals the runtime .p.name and the fallback is correct.
  const unresolved = encoders.filter((e) => !codecNameIndex.has(`${e}_encoder`));
  if (unresolved.length > 0) {
    console.log(`Info: ${unresolved.length} encoder(s) resolved via C-identifier fallback (macro-defined codecs).`);
  }

  console.log(`\nFound ${encoders.length} encoders in FFmpeg source`);

  // Categorize encoders
  const videoEncoders = [];
  const audioEncoders = [];
  const subtitleEncoders = [];

  for (const encoder of encoders) {
    const { mediaType } = categorizeEncoder(encoder);

    if (mediaType === 'audio') {
      audioEncoders.push(encoder);
    } else if (mediaType === 'subtitle') {
      subtitleEncoders.push(encoder);
    } else {
      videoEncoders.push(encoder);
    }
  }

  // Further categorize by hardware
  const videoHw = videoEncoders.filter((e) => categorizeEncoder(e).isHardware);
  const videoSw = videoEncoders.filter((e) => !categorizeEncoder(e).isHardware);
  const audioHw = audioEncoders.filter((e) => categorizeEncoder(e).isHardware);
  const audioSw = audioEncoders.filter((e) => !categorizeEncoder(e).isHardware);

  console.log(`Video encoders: ${videoEncoders.length} (${videoSw.length} software, ${videoHw.length} hardware)`);
  console.log(`Audio encoders: ${audioEncoders.length} (${audioSw.length} software, ${audioHw.length} hardware)`);
  console.log(`Subtitle encoders: ${subtitleEncoders.length}`);

  let output = `/**
 * Auto-generated FFmpeg encoder constants
 * Generated from FFmpeg source code (allcodecs.c)
 * DO NOT EDIT MANUALLY
 */


// Brand symbol for type safety
const __codec_brand = Symbol('__codec_brand');

// Base encoder type
export type FFEncoderCodec = string & { readonly [__codec_brand]: 'encoder' };

// Specific encoder types by media type
export type FFVideoEncoder = FFEncoderCodec & { readonly __type: 'video' };
export type FFAudioEncoder = FFEncoderCodec & { readonly __type: 'audio' };
export type FFSubtitleEncoder = FFEncoderCodec & { readonly __type: 'subtitle' };

`;

  // Generate video encoders
  output += '// ============================================================================\n';
  output += `// VIDEO ENCODERS (${videoSw.length} software, ${videoHw.length} hardware)\n`;
  output += '// ============================================================================\n\n';

  if (videoSw.length > 0) {
    output += '// Software video encoders\n';
    for (const encoder of videoSw.sort()) {
      const constName = toConstantName(encoder);
      output += `export const ${constName} = '${codecName(encoder)}' as FFVideoEncoder;\n`;
    }
    output += '\n';
  }

  if (videoHw.length > 0) {
    output += '// Hardware video encoders\n';

    // Group by hardware type
    const hwGroups = {};
    for (const encoder of videoHw) {
      const { hardwareType } = categorizeEncoder(encoder);
      if (!hwGroups[hardwareType]) {
        hwGroups[hardwareType] = [];
      }
      hwGroups[hardwareType].push(encoder);
    }

    for (const [hwType, encoders] of Object.entries(hwGroups)) {
      output += `\n// ${hwType}\n`;
      for (const encoder of encoders.sort()) {
        const constName = toConstantName(encoder);
        output += `export const ${constName} = '${codecName(encoder)}' as FFVideoEncoder;\n`;
      }
    }
    output += '\n';
  }

  // Generate audio encoders
  output += '// ============================================================================\n';
  output += `// AUDIO ENCODERS (${audioSw.length} software, ${audioHw.length} hardware)\n`;
  output += '// ============================================================================\n\n';

  if (audioSw.length > 0) {
    output += '// Software audio encoders\n';
    for (const encoder of audioSw.sort()) {
      const constName = toConstantName(encoder);
      output += `export const ${constName} = '${codecName(encoder)}' as FFAudioEncoder;\n`;
    }
    output += '\n';
  }

  if (audioHw.length > 0) {
    output += '// Hardware audio encoders\n';
    for (const encoder of audioHw.sort()) {
      const constName = toConstantName(encoder);
      output += `export const ${constName} = '${codecName(encoder)}' as FFAudioEncoder;\n`;
    }
    output += '\n';
  }

  // Generate subtitle encoders
  if (subtitleEncoders.length > 0) {
    output += '// ============================================================================\n';
    output += `// SUBTITLE ENCODERS (${subtitleEncoders.length} encoders)\n`;
    output += '// ============================================================================\n\n';

    for (const encoder of subtitleEncoders.sort()) {
      const constName = toConstantName(encoder);
      output += `export const ${constName} = '${codecName(encoder)}' as FFSubtitleEncoder;\n`;
    }
    output += '\n';
  }

  return output;
};

// Main
const main = () => {
  console.log('Extracting all FFmpeg encoders from source...');

  try {
    // Check if --with-patches flag is provided
    const withPatches = process.argv.includes('--with-patches');

    const output = generateTypeScript(withPatches);
    const outputPath = join(__dirname, '..', 'src', 'constants', 'encoders.ts');

    // Create directory if it doesn't exist
    const dir = dirname(outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(outputPath, output);
    console.log(`\nGenerated encoder constants at: ${outputPath}`);

    // Show summary
    const lines = output.split('\n').length;
    const constants = (output.match(/export const FF_ENCODER_/g) || []).length;

    console.log(`Generated: ${lines} lines, ${constants} encoder constants`);

    if (withPatches) {
      console.log('(Including encoders from patch files)');
    }
  } catch (error) {
    console.error('Error generating encoder constants:', error);
    process.exit(1);
  }
};

main();
