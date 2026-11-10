#!/usr/bin/env node

/**
 * Generate filter option types (src/constants/filter-options.ts) by parsing
 * libavfilter: each FFFilter's `.p.priv_class` AVOption array, keyed by name,
 * with the filter's description + an FFmpeg docs @see link as JSDoc.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSourceIndex, docAnchor, fileHeader, findComponents, renderMap, walk } from './avoption-parser.js';
import { getFFmpegPath } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAVF = join(getFFmpegPath(''), 'libavfilter');

// .m: the VideoToolbox/Metal and CoreImage filters are Objective-C sources;
// libavutil's headers for shared macros (AV_STRINGIFY, ...)
const index = createSourceIndex(walk(LAVF, [], ['.c', '.h', '.m']), { macroHeaders: walk(join(getFFmpegPath(''), 'libavutil'), [], ['.h']) });

const filters = {}; // name -> options
const descriptions = {}; // name -> description string

const descRe = /\.p\.description\s*=\s*(?:NULL_IF_CONFIG_SMALL\s*\(\s*)?"((?:[^"\\]|\\.)*)"/;

// Every filter, even an option-less one, so all names are usable. Framesync-based
// filters get the framesync options (eof_action, shortest, ...) through their child
// class, as filter arguments reach them too.
for (const f of findComponents(index, 'FFFilter', /^ff_\w+$/)) {
  const opts = index.resolveComponent(f) ?? {};
  if (f.name in filters && Object.keys(filters[f.name]).length >= Object.keys(opts).length) continue;
  filters[f.name] = opts;
  const descMatch = f.body.match(descRe);
  if (descMatch) descriptions[f.name] = descMatch[1];
}

const header = fileHeader(['Auto-generated FFmpeg filter option types.', 'Generated from FFmpeg libavfilter AVOption sources (see scripts/generate-filter-options.js).']);

const componentDoc = (name) => {
  const lines = [];
  if (descriptions[name]) lines.push(descriptions[name]);
  lines.push(`@see https://ffmpeg.org/ffmpeg-filters.html#${docAnchor(name)}`);
  return lines.join('\n');
};

const resolution = `/** Loose option bag for filters without generated typings. */
export type UnknownFilterOptions = Record<string, string | number | boolean | undefined | null>;

/**
 * Resolve the options for a filter. Returns the strongly-typed option set when
 * the filter name is known (autocomplete + validation), otherwise a loose bag.
 */
export type FilterOptionsFor<N> = N extends keyof FilterOptionsMap ? FilterOptionsMap[N] : UnknownFilterOptions;
`;

const out = header + renderMap('FilterOptionsMap', filters, 'expr', componentDoc) + '\n' + resolution;

const outPath = join(__dirname, '..', 'src', 'constants', 'filter-options.ts');
writeFileSync(outPath, out);

console.log(`[filter] ${Object.keys(filters).length} filters (${Object.values(filters).filter((o) => Object.keys(o).length).length} with options)`);
for (const w of index.warnings) console.warn(`[filter] ${w}`);
console.log(`Wrote ${outPath}`);
