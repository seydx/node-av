#!/usr/bin/env node
/* eslint-disable @stylistic/indent-binary-ops */

/**
 * Generate codec private-option types (src/constants/options.ts) by parsing
 * libavcodec AVOption sources.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSourceIndex, docAnchor, fileHeader, findComponents, renderFlat, renderMap, walk } from './avoption-parser.js';
import { getFFmpegPath, getNvencFeatureMacros } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAVC = join(getFFmpegPath(''), 'libavcodec');

// libavutil's headers for shared macros (AV_STRINGIFY, ...); the NVENC feature macros
// drop the NVENC options the bundled SDK headers do not have
const index = createSourceIndex(walk(LAVC), {
  macroHeaders: walk(join(getFFmpegPath(''), 'libavutil'), [], ['.h']),
  defines: getNvencFeatureMacros(getFFmpegPath('')),
});

// Generic AVCodecContext options (options_table.h) — applied to every codec via
// the same option dictionary, so they belong in every codec's option bag.
const codecContextOptions = index.resolveArray('avcodec_options');

const encoders = {};
const decoders = {};
const descriptions = {}; // name -> long_name

const longNameRe = /CODEC_LONG_NAME\s*\(\s*"((?:[^"\\]|\\.)*)"|\.p\.long_name\s*=\s*(?:NULL_IF_CONFIG_SMALL\s*\(\s*)?"((?:[^"\\]|\\.)*)"/;

for (const c of findComponents(index, 'FFCodec', /^ff_\w+_(encoder|decoder)$/)) {
  const opts = index.resolveComponent(c);
  if (!opts || Object.keys(opts).length === 0) continue;
  const target = c.varMatch[1] === 'encoder' ? encoders : decoders;
  if (c.name in target) continue;
  target[c.name] = opts;
  const ln = c.body.match(longNameRe);
  if (ln) descriptions[c.name] = ln[1] ?? ln[2];
}

const codecDoc = (name) => {
  const lines = [];
  if (descriptions[name]) lines.push(descriptions[name]);
  lines.push(`@see https://ffmpeg.org/ffmpeg-codecs.html#${docAnchor(name)}`);
  return lines.join('\n');
};

const header = fileHeader(['Auto-generated codec private-option types.', 'Generated from FFmpeg codec AVOption sources (see scripts/generate-options-source.js).']);

const optionsPath = join(__dirname, '..', 'src', 'constants', 'options.ts');
writeFileSync(
  optionsPath,
  header +
    renderFlat('CodecContextOptions', codecContextOptions) +
    '\n' +
    renderMap('EncoderOptionsMap', encoders, 'strict', codecDoc) +
    '\n' +
    renderMap('DecoderOptionsMap', decoders, 'strict', codecDoc),
);

console.log(
  `[source] ${Object.keys(codecContextOptions).length} generic, ${Object.keys(encoders).length} encoders, ${Object.keys(decoders).length} decoders with private options`,
);
for (const w of index.warnings) console.warn(`[source] ${w}`);
console.log(`Wrote ${optionsPath}`);
