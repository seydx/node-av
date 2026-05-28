#!/usr/bin/env node

/**
 * Generate container option types (src/constants/format-options.ts) by parsing
 * libavformat: each (de)muxer's `.p.priv_class` AVOption array plus the generic
 * AVFormatContext options (options_table.h), which apply to every (de)muxer.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildHeaderMacros, collectDefines, docAnchor, fileHeader, makeClassResolver, parseOptionArray, renderFlat, renderMap, walk } from './avoption-parser.js';
import { getFFmpegPath } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAVF = join(getFFmpegPath(''), 'libavformat');

const files = walk(LAVF);
const headerMacros = buildHeaderMacros(files);

// Extract the inner body of `... AVOption <name>[] = { ... };` (balanced braces).
function extractArrayBody(src, arrayName) {
  const re = new RegExp(`AVOption\\s+${arrayName}\\s*\\[\\s*\\]\\s*=\\s*\\{`);
  const m = re.exec(src);
  if (!m) return null;
  let depth = 0;
  const open = m.index + m[0].length - 1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

// Generic AVFormatContext options apply to every (de)muxer via the same dictionary.
const optionsTable = readFileSync(join(LAVF, 'options_table.h'), 'utf8');
const formatBaseBody = extractArrayBody(optionsTable, 'avformat_options');
const formatContextOptions = formatBaseBody ? parseOptionArray(formatBaseBody, headerMacros) : {};

const muxers = {};
const demuxers = {};
const muxerDesc = {}; // name -> long_name
const demuxerDesc = {};

const muxerRe = /(?:const\s+)?FFOutputFormat\s+ff_(\w+)_muxer\s*=\s*\{([\s\S]*?)\n\}\s*;/g;
const demuxerRe = /(?:const\s+)?FFInputFormat\s+ff_(\w+)_demuxer\s*=\s*\{([\s\S]*?)\n\}\s*;/g;
const longNameRe = /\.p\.long_name\s*=\s*(?:NULL_IF_CONFIG_SMALL\s*\(\s*)?"((?:[^"\\]|\\.)*)"/;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  if (!src.includes('priv_class')) continue;

  const localMacros = new Map(headerMacros);
  collectDefines(src, localMacros);
  const resolve = makeClassResolver(src, localMacros);

  for (const [re, target, descTarget] of [
    [muxerRe, muxers, muxerDesc],
    [demuxerRe, demuxers, demuxerDesc],
  ]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      const body = m[2];
      const nameMatch = body.match(/\.p\.name\s*=\s*"([^"]+)"/);
      const privMatch = body.match(/priv_class\s*=\s*&?(\w+)/);
      if (!nameMatch || !privMatch) continue;
      const opts = resolve(privMatch[1]);
      if (!opts || Object.keys(opts).length === 0) continue;
      const ln = body.match(longNameRe);
      // A format string can list multiple comma-separated names (e.g. "mp4,m4a").
      for (const name of nameMatch[1].split(',')) {
        target[name] = opts;
        if (ln) descTarget[name] = ln[1];
      }
    }
  }
}

const formatDoc = (descTarget) => (name) => {
  const lines = [];
  if (descTarget[name]) lines.push(descTarget[name]);
  lines.push(`@see https://ffmpeg.org/ffmpeg-formats.html#${docAnchor(name)}`);
  return lines.join('\n');
};

const header = fileHeader([
  'Auto-generated container (de)muxer option types.',
  'Generated from FFmpeg libavformat AVOption sources (see scripts/generate-format-options.js).',
]);

const resolution = `/**
 * Loose option bag for formats without generated typings, or for protocol/codec
 * options that flow through the same dictionary (e.g. \`rtsp_transport\`).
 */
export type UnknownFormatOptions = Record<string, string | number | boolean | bigint | undefined | null>;

/**
 * Options for a muxer: generic AVFormatContext options + the format's private
 * options (when the format name is known) + an open bag for protocol/other keys.
 */
export type MuxerOptionsFor<F> = FormatContextOptions & (F extends keyof MuxerPrivateOptionsMap ? MuxerPrivateOptionsMap[F] : {}) & UnknownFormatOptions;

/**
 * Options for a demuxer: generic AVFormatContext options + the format's private
 * options (when the format name is known) + an open bag for protocol/other keys.
 */
export type DemuxerOptionsFor<F> = FormatContextOptions & (F extends keyof DemuxerPrivateOptionsMap ? DemuxerPrivateOptionsMap[F] : {}) & UnknownFormatOptions;
`;

const out =
  header +
  renderFlat('FormatContextOptions', formatContextOptions, 'lenient') +
  '\n' +
  renderMap('MuxerPrivateOptionsMap', muxers, 'lenient', formatDoc(muxerDesc)) +
  '\n' +
  renderMap('DemuxerPrivateOptionsMap', demuxers, 'lenient', formatDoc(demuxerDesc)) +
  '\n' +
  resolution;

const outPath = join(__dirname, '..', 'src', 'constants', 'format-options.ts');
writeFileSync(outPath, out);

console.log(
  `[format] ${Object.keys(formatContextOptions).length} generic, ${Object.keys(muxers).length} muxers, ${Object.keys(demuxers).length} demuxers with private options`,
);
console.log(`Wrote ${outPath}`);
