#!/usr/bin/env node

/**
 * Generate bitstream-filter option types (src/constants/bsf-options.ts) by
 * parsing each FFBitStreamFilter's `.p.priv_class` AVOption array in libavcodec.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSourceIndex, docAnchor, fileHeader, findComponents, renderMap, walk } from './avoption-parser.js';
import { getFFmpegPath } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAVC = join(getFFmpegPath(''), 'libavcodec');

// libavutil's headers for shared macros (AV_STRINGIFY, ...)
const index = createSourceIndex(walk(LAVC), { macroHeaders: walk(join(getFFmpegPath(''), 'libavutil'), [], ['.h']) });

const bsfs = {};
const allNames = new Set();

for (const b of findComponents(index, 'FFBitStreamFilter', /^ff_\w+_bsf$/)) {
  allNames.add(b.name);
  const opts = index.resolveComponent(b);
  if (!opts || Object.keys(opts).length === 0 || b.name in bsfs) continue;
  bsfs[b.name] = opts;
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

const nameUnion = `/**
 * All bitstream filter names known to this FFmpeg build.
 *
 * Use with \`BitStreamFilterAPI.create()\` for name autocomplete. Unknown names
 * still pass through via the \`(string & {})\` fallback in the API signature.
 */
export type BsfName =
  | ${[...allNames]
    .sort()
    .map((n) => `'${n}'`)
    .join('\n  | ')};
`;

const out = header + nameUnion + '\n' + renderMap('BsfOptionsMap', bsfs, 'strict', bsfDoc) + '\n' + resolution;

const outPath = join(__dirname, '..', 'src', 'constants', 'bsf-options.ts');
writeFileSync(outPath, out);

console.log(`[bsf] ${allNames.size} bitstream filters (${Object.keys(bsfs).length} with private options)`);
for (const w of index.warnings) console.warn(`[bsf] ${w}`);
console.log(`Wrote ${outPath}`);
