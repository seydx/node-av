#!/usr/bin/env node

/**
 * Generate filter option types (src/constants/filter-options.ts) by parsing
 * libavfilter: each FFFilter's `.p.priv_class` AVOption array, keyed by name,
 * with the filter's description + an FFmpeg docs @see link as JSDoc.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildHeaderMacros, collectDefines, docAnchor, fileHeader, makeClassResolver, parseOptionArray, renderMap, walk } from './avoption-parser.js';
import { getFFmpegPath } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAVF = join(getFFmpegPath(''), 'libavfilter');

const files = walk(LAVF);
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

// framesync filters expose the shared framesync options (eof_action, shortest,
// repeatlast, ts_sync_mode) via a child context, settable as filter args.
const framesyncSrc = readFileSync(join(LAVF, 'framesync.c'), 'utf8');
const fsMacros = new Map(headerMacros);
collectDefines(framesyncSrc, fsMacros);
const framesyncOptions = parseOptionArray(extractArrayBody(framesyncSrc, 'framesync_options') ?? '', fsMacros);

const filters = {}; // name -> options
const descriptions = {}; // name -> description string

const filterRe = /(?:const\s+)?FFFilter\s+ff_(\w+)\s*=\s*\{([\s\S]*?)\n\}\s*;/g;
const descRe = /\.p\.description\s*=\s*(?:NULL_IF_CONFIG_SMALL\s*\(\s*)?"((?:[^"\\]|\\.)*)"/;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  if (!src.includes('FFFilter ff_')) continue;

  const localMacros = new Map(headerMacros);
  collectDefines(src, localMacros);
  const resolve = makeClassResolver(src, localMacros);

  let m;
  filterRe.lastIndex = 0;
  while ((m = filterRe.exec(src)) !== null) {
    const body = m[2];
    const nameMatch = body.match(/\.p\.name\s*=\s*"([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const privMatch = body.match(/priv_class\s*=\s*&?(\w+)/);
    // Include every filter (even option-less ones) so all names are usable.
    const opts = (privMatch && resolve(privMatch[1])) || {};
    // Merge framesync options for framesync-based filters (their class basename
    // appears in a FRAMESYNC_DEFINE_CLASS macro), without clobbering own options.
    if (privMatch && new RegExp(`FRAMESYNC_DEFINE_CLASS\\w*\\s*\\(\\s*${privMatch[1].replace(/_class$/, '')}\\b`).test(src)) {
      for (const [k, v] of Object.entries(framesyncOptions)) if (!(k in opts)) opts[k] = v;
    }
    filters[name] = opts;
    const descMatch = body.match(descRe);
    if (descMatch) descriptions[name] = descMatch[1];
  }
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
console.log(`Wrote ${outPath}`);
