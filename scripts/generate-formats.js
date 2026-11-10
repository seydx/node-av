#!/usr/bin/env node

/**
 * Generate muxer/demuxer format names (src/constants/formats.ts) by parsing
 * libavformat + libavdevice. Emits MuxerFormat/DemuxerFormat literal unions (for
 * autocomplete on the `format` field), optional FF_MUXER_ / FF_DEMUXER_ string
 * constants, and MuxerOptionsFor/DemuxerOptionsFor (resolve the typed options
 * from the format name; see format-options.ts for the maps).
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSourceIndex, findComponents, walk } from './avoption-parser.js';
import { getFFmpegPath } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FF = getFFmpegPath('');
// libavformat (containers) + libavdevice (avfoundation, v4l2, dshow, … — .m for ObjC);
// the index also finds the (de)muxers defined by macros (PCM, raw, image pipes)
const index = createSourceIndex([...walk(join(FF, 'libavformat'), [], ['.c', '.h']), ...walk(join(FF, 'libavdevice'), [], ['.c', '.h', '.m'])], {
  macroHeaders: walk(join(FF, 'libavutil'), [], ['.h']),
});

const muxers = new Set();
const demuxers = new Set();

for (const [type, nameRe, set] of [
  ['FFOutputFormat', /^ff_\w+_muxer$/, muxers],
  ['FFInputFormat', /^ff_\w+_demuxer$/, demuxers],
]) {
  for (const c of findComponents(index, type, nameRe)) for (const name of c.name.split(',')) set.add(name.trim());
}

const renderUnion = (name, set) =>
  `export type ${name} =\n  | ${[...set]
    .sort()
    .map((n) => `'${n}'`)
    .join('\n  | ')};\n`;

const header = `/**
 * Auto-generated FFmpeg muxer/demuxer format names.
 * Generated from FFmpeg libavformat/libavdevice (see scripts/generate-formats.js).
 * DO NOT EDIT MANUALLY.
 */

import type { DemuxerPrivateOptionsMap, FormatContextOptions, MuxerPrivateOptionsMap, UnknownFormatOptions } from './format-options.js';

`;

const resolution = `
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

const out = header + renderUnion('MuxerFormat', muxers) + '\n' + renderUnion('DemuxerFormat', demuxers) + resolution;

const outPath = join(__dirname, '..', 'src', 'constants', 'formats.ts');
writeFileSync(outPath, out);

console.log(`[formats] ${muxers.size} muxers, ${demuxers.size} demuxers`);
console.log(`Wrote ${outPath}`);
