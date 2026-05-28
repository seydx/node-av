#!/usr/bin/env node

/**
 * Generate bitstream-filter option types (src/constants/bsf-options.ts) by
 * parsing each FFBitStreamFilter's `.p.priv_class` AVOption array in libavcodec.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildHeaderMacros, collectDefines, docAnchor, fileHeader, makeClassResolver, renderMap, walk } from './avoption-parser.js';
import { getFFmpegPath } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAVC = join(getFFmpegPath(''), 'libavcodec');

const files = walk(LAVC);
const headerMacros = buildHeaderMacros(files);

const bsfs = {};
const bsfRe = /(?:const\s+)?FFBitStreamFilter\s+ff_(\w+)_bsf\s*=\s*\{([\s\S]*?)\n\}\s*;/g;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  if (!src.includes('priv_class')) continue;

  const localMacros = new Map(headerMacros);
  collectDefines(src, localMacros);
  const resolve = makeClassResolver(src, localMacros);

  let m;
  bsfRe.lastIndex = 0;
  while ((m = bsfRe.exec(src)) !== null) {
    const body = m[2];
    const nameMatch = body.match(/\.p\.name\s*=\s*"([^"]+)"/);
    const privMatch = body.match(/priv_class\s*=\s*&?(\w+)/);
    if (!nameMatch || !privMatch) continue;
    const opts = resolve(privMatch[1]);
    if (!opts || Object.keys(opts).length === 0) continue;
    bsfs[nameMatch[1]] = opts;
  }
}

const header = fileHeader(['Auto-generated bitstream-filter option types.', 'Generated from FFmpeg libavcodec AVOption sources (see scripts/generate-bsf-options.js).']);

const resolution = `/** Loose option bag for bitstream filters without generated typings. */
export type UnknownBsfOptions = Record<string, string | number | boolean | bigint | undefined | null>;

/**
 * Resolve the options for a bitstream filter. Returns the strongly-typed option
 * set when the filter name is known (autocomplete + validation), otherwise a
 * loose bag.
 */
export type BsfOptionsFor<N> = N extends keyof BsfOptionsMap ? BsfOptionsMap[N] : UnknownBsfOptions;
`;

const bsfDoc = (name) => `@see https://ffmpeg.org/ffmpeg-bitstream-filters.html#${docAnchor(name)}`;

const out = header + renderMap('BsfOptionsMap', bsfs, 'strict', bsfDoc) + '\n' + resolution;

const outPath = join(__dirname, '..', 'src', 'constants', 'bsf-options.ts');
writeFileSync(outPath, out);

console.log(`[bsf] ${Object.keys(bsfs).length} bitstream filters with private options`);
console.log(`Wrote ${outPath}`);
