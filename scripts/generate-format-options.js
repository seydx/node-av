#!/usr/bin/env node

/**
 * Generate container option types (src/constants/format-options.ts) by parsing
 * libavformat: each (de)muxer's `.p.priv_class` AVOption array plus the generic
 * AVFormatContext options (options_table.h), which apply to every (de)muxer.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSourceIndex, docAnchor, fileHeader, findComponents, renderFlat, renderMap, walk } from './avoption-parser.js';
import { getFFmpegPath } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FF = getFFmpegPath('');

// libavformat (containers) + libavdevice (avfoundation, v4l2, dshow, … — .m for ObjC);
// libavutil's and libavcodec's headers for shared macros (AV_STRINGIFY, CODEC2_AVOPTIONS)
const index = createSourceIndex([...walk(join(FF, 'libavformat'), [], ['.c', '.h']), ...walk(join(FF, 'libavdevice'), [], ['.c', '.h', '.m'])], {
  macroHeaders: [...walk(join(FF, 'libavutil'), [], ['.h']), ...walk(join(FF, 'libavcodec'), [], ['.h'])],
});

// Generic AVFormatContext options apply to every (de)muxer via the same dictionary.
const formatContextOptions = index.resolveArray('avformat_options');

const muxers = {};
const demuxers = {};
const muxerDesc = {}; // name -> long_name
const demuxerDesc = {};

const longNameRe = /\.p\.long_name\s*=\s*(?:NULL_IF_CONFIG_SMALL\s*\(\s*)?"((?:[^"\\]|\\.)*)"/;

for (const [type, nameRe, target, descTarget] of [
  ['FFOutputFormat', /^ff_\w+_muxer$/, muxers, muxerDesc],
  ['FFInputFormat', /^ff_\w+_demuxer$/, demuxers, demuxerDesc],
]) {
  for (const c of findComponents(index, type, nameRe)) {
    const opts = index.resolveComponent(c);
    if (!opts || Object.keys(opts).length === 0) continue;
    const ln = c.body.match(longNameRe);
    // A format string can list multiple comma-separated names (e.g. "mp4,m4a").
    for (const name of c.name.split(',')) {
      if (name in target) continue;
      target[name] = opts;
      if (ln) descTarget[name] = ln[1];
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
for (const w of index.warnings) console.warn(`[format] ${w}`);
console.log(`Wrote ${outPath}`);
