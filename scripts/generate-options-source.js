#!/usr/bin/env node
/* eslint-disable @stylistic/indent-binary-ops */

/**
 * Generate codec private-option types (src/constants/options.ts) by parsing
 * libavcodec AVOption sources. Pass --emit-json to also dump _source.json for
 * the dormant validation harness (compare-options.js + generate-options.ts).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildHeaderMacros, collectDefines, docAnchor, fileHeader, makeClassResolver, parseOptionArray, renderFlat, renderMap, walk } from './avoption-parser.js';
import { getFFmpegPath } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAVC = join(getFFmpegPath(''), 'libavcodec');

const files = walk(LAVC);
const headerMacros = buildHeaderMacros(files);

// Inner body of `... AVOption <name>[] = { ... };` (balanced braces).
function extractArrayBody(src, arrayName) {
  const m = new RegExp(`AVOption\\s+${arrayName}\\s*\\[\\s*\\]\\s*=\\s*\\{`).exec(src);
  if (!m) return null;
  let depth = 0;
  const open = m.index + m[0].length - 1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i);
  }
  return null;
}

// Generic AVCodecContext options (options_table.h) — applied to every codec via
// the same option dictionary, so they belong in every codec's option bag.
const optionsTable = readFileSync(join(LAVC, 'options_table.h'), 'utf8');
const codecContextOptions = parseOptionArray(extractArrayBody(optionsTable, 'avcodec_options') ?? '', headerMacros);

const encoders = {};
const decoders = {};
const descriptions = {}; // name -> long_name

const codecDefRe = /(?:const\s+)?FFCodec\s+ff_(\w+)_(encoder|decoder)\s*=\s*\{([\s\S]*?)\n\}\s*;/g;
const longNameRe = /CODEC_LONG_NAME\s*\(\s*"((?:[^"\\]|\\.)*)"|\.p\.long_name\s*=\s*(?:NULL_IF_CONFIG_SMALL\s*\(\s*)?"((?:[^"\\]|\\.)*)"/;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  if (!src.includes('priv_class')) continue;

  // header defines + local .c defines (local wins)
  const localMacros = new Map(headerMacros);
  collectDefines(src, localMacros);
  const resolve = makeClassResolver(src, localMacros);

  let dm;
  codecDefRe.lastIndex = 0;
  while ((dm = codecDefRe.exec(src)) !== null) {
    const kind = dm[2]; // encoder|decoder
    const fileBody = dm[3];
    const nameMatch = fileBody.match(/\.p\.name\s*=\s*"([^"]+)"/);
    const privMatch = fileBody.match(/priv_class\s*=\s*&?(\w+)/);
    if (!nameMatch || !privMatch) continue;
    const opts = resolve(privMatch[1]);
    if (!opts || Object.keys(opts).length === 0) continue;
    if (kind === 'encoder') encoders[nameMatch[1]] = opts;
    else decoders[nameMatch[1]] = opts;
    const ln = fileBody.match(longNameRe);
    if (ln) descriptions[nameMatch[1]] = ln[1] ?? ln[2];
  }
}

const codecDoc = (name) => {
  const lines = [];
  if (descriptions[name]) lines.push(descriptions[name]);
  lines.push(`@see https://ffmpeg.org/ffmpeg-codecs.html#${docAnchor(name)}`);
  return lines.join('\n');
};

// Optional JSON dump for the dormant validation harness (compare-options.js).
if (process.argv.includes('--emit-json')) {
  const outDir = join(__dirname, '.options-data');
  mkdirSync(outDir, { recursive: true });
  const jsonFile = join(outDir, '_source.json');
  writeFileSync(jsonFile, JSON.stringify({ platform: 'source', encoders, decoders }, null, 2) + '\n');
  console.log(`Wrote ${jsonFile}`);
}

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
console.log(`Found ${headerMacros.size} header macros`);
console.log(`Wrote ${optionsPath}`);
