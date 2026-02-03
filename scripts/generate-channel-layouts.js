#!/usr/bin/env node

/**
 * Generate TypeScript channel layout constants from FFmpeg headers
 */

import { execSync } from 'child_process';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getFFmpegLinkPaths, getFFmpegPath } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FFMPEG_PATH = getFFmpegPath('include');
console.log(`Using FFmpeg headers from: ${FFMPEG_PATH}`);

// Channel mask names in the order we want them
const CHANNEL_MASKS = [
  'FRONT_LEFT',
  'FRONT_RIGHT',
  'FRONT_CENTER',
  'LOW_FREQUENCY',
  'BACK_LEFT',
  'BACK_RIGHT',
  'FRONT_LEFT_OF_CENTER',
  'FRONT_RIGHT_OF_CENTER',
  'BACK_CENTER',
  'SIDE_LEFT',
  'SIDE_RIGHT',
];

// Layout names and their C variable names
const LAYOUTS = [
  'MONO',
  'STEREO',
  '2POINT1',
  'SURROUND',
  '3POINT1',
  '4POINT0',
  '4POINT1',
  'QUAD',
  '5POINT0',
  '5POINT1',
  '5POINT0_BACK',
  '5POINT1_BACK',
  '6POINT0',
  '6POINT0_FRONT',
  '6POINT1',
  '7POINT0',
  '7POINT1',
  'OCTAGONAL',
];

// Compile and run a C program to get the actual values as structured data
const getChannelLayoutData = () => {
  // Build C printf lines for channel masks
  const maskPrints = CHANNEL_MASKS.map((name) => `    printf("CH|${name}|0x%llx\\n", (unsigned long long)AV_CH_${name});`).join('\n');

  // Build C printf lines for layout bitmasks
  const layoutPrints = LAYOUTS.map((name) => `    printf("LAYOUT|${name}|0x%llx\\n", (unsigned long long)AV_CH_LAYOUT_${name});`).join('\n');

  // Build C variable declarations and printf lines for modern layout structs
  const layoutVarDecls = LAYOUTS.map((name, i) => `    AVChannelLayout l${i} = AV_CHANNEL_LAYOUT_${name};`).join('\n');

  const layoutStructPrints = LAYOUTS.map((name, i) => `    printf("STRUCT|${name}|%d|0x%llx\\n", l${i}.nb_channels, (unsigned long long)l${i}.u.mask);`).join('\n');

  const cCode = `
#include <stdio.h>
#include <libavutil/channel_layout.h>

int main() {
${maskPrints}
${layoutPrints}
${layoutVarDecls}
${layoutStructPrints}
    return 0;
}
`;

  // Write C code to temp file
  const tmpDir = tmpdir();
  const tmpFile = join(tmpDir, 'channel_layouts.c');
  const outFile = join(tmpDir, process.platform === 'win32' ? 'channel_layouts.exe' : 'channel_layouts');
  writeFileSync(tmpFile, cCode);

  try {
    const { includePaths, libPaths } = getFFmpegLinkPaths();

    let compileCmd;
    if (existsSync('/opt/ffbuild/prefix/lib/libavutil.a')) {
      compileCmd = `gcc ${includePaths} ${tmpFile} -L/opt/ffbuild/prefix/lib /opt/ffbuild/prefix/lib/libavutil.a -lm -pthread -o ${outFile}`;
    } else if (existsSync('/clang64/ffbuild/lib/libavutil.a')) {
      compileCmd = `gcc ${includePaths} ${tmpFile} -L/clang64/ffbuild/lib /clang64/ffbuild/lib/libavutil.a -lm -pthread -o ${outFile}`;
    } else if (existsSync('/clangarm64/ffbuild/lib/libavutil.a')) {
      compileCmd = `gcc ${includePaths} ${tmpFile} -L/clangarm64/ffbuild/lib /clangarm64/ffbuild/lib/libavutil.a -lm -pthread -o ${outFile}`;
    } else {
      let pkgConfigFlags = '';
      try {
        pkgConfigFlags = execSync('pkg-config --cflags --libs libavutil', { encoding: 'utf8' }).trim();
      } catch {
        // pkg-config not available
      }

      compileCmd = pkgConfigFlags
        ? `gcc ${includePaths} ${tmpFile} ${pkgConfigFlags} -o ${outFile}`
        : `gcc ${includePaths} ${libPaths} ${tmpFile} -lavutil -o ${outFile}`;
    }

    execSync(compileCmd, { stdio: 'inherit' });
    const output = execSync(outFile, { encoding: 'utf8' });

    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore
    }
    try {
      unlinkSync(outFile);
    } catch {
      // ignore
    }

    return output;
  } catch (error) {
    console.error('Failed to compile/run C code:', error);
    throw error;
  }
};

// Parse C program output into structured data
const parseOutput = (raw) => {
  const channelMasks = {}; // name → hex string
  const layoutMasks = {}; // name → hex string
  const layoutStructs = {}; // name → { nbChannels, mask hex }

  for (const line of raw.trim().split('\n')) {
    const parts = line.split('|');
    if (parts[0] === 'CH') {
      channelMasks[parts[1]] = parts[2];
    } else if (parts[0] === 'LAYOUT') {
      layoutMasks[parts[1]] = parts[2];
    } else if (parts[0] === 'STRUCT') {
      layoutStructs[parts[1]] = { nbChannels: parseInt(parts[2]), mask: parts[3] };
    }
  }

  return { channelMasks, layoutMasks, layoutStructs };
};

// Generate the file
const generateChannelLayoutsFile = () => {
  const outputPath = join(__dirname, '..', 'src', 'constants', 'channel-layouts.ts');

  const raw = getChannelLayoutData();
  const { channelMasks, layoutMasks, layoutStructs } = parseOutput(raw);

  const lines = [];

  // Header
  lines.push('/**');
  lines.push(' * FFmpeg Channel Layout Constants');
  lines.push(' * Auto-generated from FFmpeg headers');
  lines.push(' * DO NOT EDIT MANUALLY');
  lines.push(' */');
  lines.push('');
  lines.push("import { AV_CHANNEL_ORDER_NATIVE } from './constants.js';");
  lines.push('');
  lines.push("import type { ChannelLayout } from '../lib/types.js';");
  lines.push('');

  // Channel masks (AV_CH_*)
  lines.push('// Channel masks (for legacy API)');
  for (const name of CHANNEL_MASKS) {
    const hex = channelMasks[name];
    if (hex) {
      lines.push(`export const AV_CH_${name} = ${hex}n;`);
    }
  }
  lines.push('');

  // Layout bitmasks (AV_CH_LAYOUT_*)
  lines.push('// Channel layout bitmasks');
  for (const name of LAYOUTS) {
    const hex = layoutMasks[name];
    if (hex) {
      lines.push(`export const AV_CH_LAYOUT_${name} = ${hex}n;`);
    }
  }
  lines.push('');

  // Modern ChannelLayout objects (AV_CHANNEL_LAYOUT_*)
  // Use AV_CHANNEL_ORDER_NATIVE and reference AV_CH_LAYOUT_* for mask
  lines.push('// Modern AVChannelLayout structures as ChannelLayout objects');
  for (const name of LAYOUTS) {
    const struct = layoutStructs[name];
    if (struct) {
      lines.push(
        `export const AV_CHANNEL_LAYOUT_${name}: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: ${struct.nbChannels}, mask: AV_CH_LAYOUT_${name} };`,
      );
    }
  }
  lines.push('');

  writeFileSync(outputPath, lines.join('\n'));
  console.log(`Generated ${outputPath}`);
};

// Run
generateChannelLayoutsFile();
