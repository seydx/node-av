#!/usr/bin/env node

/**
 * Validate the generated typings in src/constants against FFmpeg itself.
 *
 * Builds scripts/dump-options.c against the static FFmpeg the native addon links
 * (FFMPEG_PREFIX, default /opt/ffbuild/prefix), runs it and compares what that build
 * reports with the generated files: the private options of every codec, filter,
 * bitstream filter, muxer and demuxer (names, kinds, enum values), the generic codec
 * and format context options, the component name lists and the media type of each
 * codec constant. Only components compiled into that build are checked, so hardware
 * and other platforms' components need a build that has them. Exits 1 on any gap.
 *
 * Usage: node scripts/validate-options.js [--verbose]
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONSTANTS = join(__dirname, '..', 'src', 'constants');
const PREFIX = process.env.FFMPEG_PREFIX ?? '/opt/ffbuild/prefix';
const verbose = process.argv.includes('--verbose');

// Build and run the dumper, linked like binding.gyp links the addon: the FFmpeg
// archives whole (-force_load / --whole-archive), their dependencies from pkg-config.
function dumpRuntime() {
  if (process.platform === 'win32') throw new Error('validate-options supports macOS and Linux builds only');
  const libs = ['avdevice', 'avfilter', 'avformat', 'avcodec', 'swscale', 'swresample', 'avutil'];
  const libDir = join(PREFIX, 'lib');
  // The .pc files carry the prefix of the build container (/ffbuild/prefix)
  const env = { ...process.env, PKG_CONFIG_LIBDIR: join(libDir, 'pkgconfig'), PKG_CONFIG_PATH: join(libDir, 'pkgconfig') };
  const deps = execFileSync('pkg-config', [`--define-variable=prefix=${PREFIX}`, '--libs', '--static', ...libs.map((l) => `lib${l}`)], { env, encoding: 'utf8' })
    .trim()
    .split(/\s+/);
  const archives = libs.map((l) => join(libDir, `lib${l}.a`));
  const whole = process.platform === 'darwin' ? archives.map((a) => `-Wl,-force_load,${a}`) : ['-Wl,--whole-archive', ...archives, '-Wl,--no-whole-archive'];

  const dir = mkdtempSync(join(tmpdir(), 'node-av-options-'));
  try {
    const exe = join(dir, 'dump-options');
    // The link output (LTO codegen notes) is only shown when it fails
    const args = ['-O1', '-w', `-I${join(PREFIX, 'include')}`, '-o', exe, join(__dirname, 'dump-options.c'), ...whole, `-L${libDir}`, ...deps];
    try {
      execFileSync(process.env.CC ?? 'cc', args, { stdio: 'pipe' });
    } catch (e) {
      process.stderr.write(e.stderr ?? '');
      throw new Error('Building dump-options failed');
    }
    return JSON.parse(execFileSync(exe, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const readConstants = (file) => readFileSync(join(CONSTANTS, file), 'utf8');

// Body of `export interface <name> { ... }` (inside the braces) without JSDoc comments.
function interfaceBody(file, name) {
  const src = readConstants(file);
  const head = `export interface ${name} {`;
  const start = src.indexOf(head);
  if (start < 0) throw new Error(`${name} not found in ${file}`);
  return src.slice(start + head.length, src.indexOf('\n}\n', start) + 1).replace(/\/\*\*[\s\S]*?\*\//g, '');
}

// `opt?: type;` members of an interface body (or of one nested entry), with
// prettier's wrapped unions joined back onto one line.
function parseMembers(body) {
  const members = {};
  const joined = body.replace(/\n\s+\|/g, ' |').replace(/:\n\s+/g, ': ');
  for (const stmt of joined.split(';')) {
    const m = stmt.match(/^\s*'?([^'?:{}\n]+)'?\?: (.+)$/s);
    if (m) members[m[1]] = m[2].trim();
  }
  return members;
}

// `{ component: { opt?: type; ... }; ... }` interface -> { component: { opt: type } };
// a component without options is `component: {};`.
function parseMap(file, name) {
  const map = {};
  for (const m of interfaceBody(file, name).matchAll(/^ {2}'?([^':\n]+)'?: \{(?:\};|\n([\s\S]*?)^ {2}\};)/gm)) map[m[1]] = parseMembers(m[2] ?? '');
  return map;
}

// Members of `export type <name> = | 'a' | 'b';`.
function parseUnion(file, name) {
  const src = readConstants(file);
  const start = src.indexOf(`export type ${name} =`);
  if (start < 0) throw new Error(`${name} not found in ${file}`);
  return new Set([...src.slice(start, src.indexOf(';', start)).matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

const literals = (type) => new Set([...type.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'")));
const NUMBER = new Set(['int', 'int64', 'uint', 'uint64', 'double', 'float']);
const RATIONAL = new Set(['rational', 'video_rate']);

// Problems of one generated option type against its runtime option.
function checkOption(name, opt, type) {
  if (opt.array) return type.includes('string') ? [] : [`${name}: array option typed ${type}`];
  if (opt.consts.length) {
    const generated = literals(type);
    const want = new Set(opt.consts);
    const missing = [...want].filter((v) => !generated.has(v));
    const extra = [...generated].filter((v) => !want.has(v));
    const problems = [];
    if (missing.length || extra.length) problems.push(`${name}: values missing [${missing}] extra [${extra}]`);
    if (opt.type === 'flags' && !type.includes('string')) problems.push(`${name}: flags typed closed ${type}`);
    return problems;
  }
  let expected = ['string'];
  if (opt.type === 'bool') expected = ['boolean'];
  else if (NUMBER.has(opt.type)) expected = ['number'];
  else if (RATIONAL.has(opt.type)) expected = ['number', 'string'];
  return expected.every((t) => type.includes(t)) ? [] : [`${name}: ${opt.type} typed ${type}`];
}

// Problems of a generated option set against the runtime options of one class.
function checkOptions(runtime, generated) {
  const problems = [];
  for (const [name, opt] of Object.entries(runtime)) {
    // child class options (framesync, ...) are optional in the typings
    if (generated[name] === undefined) {
      if (!opt.child) problems.push(`missing ${name}`);
    } else {
      problems.push(...checkOption(name, opt, generated[name]));
    }
  }
  for (const name of Object.keys(generated)) if (!(name in runtime)) problems.push(`extra ${name}`);
  return problems;
}

let failures = 0;

function report(label, checked, untyped, mismatched) {
  failures += untyped.length + mismatched.length;
  const ok = checked - untyped.length - mismatched.length;
  console.log(`${label}: ${ok}/${checked} exact${untyped.length ? `, ${untyped.length} untyped` : ''}${mismatched.length ? `, ${mismatched.length} mismatched` : ''}`);
  if (untyped.length) console.log(`  untyped: ${untyped.join(' ')}`);
  for (const [name, problems] of verbose ? mismatched : mismatched.slice(0, 20)) console.log(`  ${name}: ${problems.join('; ')}`);
  if (!verbose && mismatched.length > 20) console.log(`  … ${mismatched.length - 20} more (--verbose)`);
}

// Components with options at runtime vs a generated per-component map. A
// "mov,mp4,..." demuxer is keyed by each of its names.
function checkMap(label, runtime, generated) {
  const untyped = [];
  const mismatched = [];
  let checked = 0;
  for (const [name, { options }] of Object.entries(runtime)) {
    if (!Object.keys(options).length) continue;
    checked++;
    const gen =
      generated[name] ??
      name
        .split(',')
        .map((n) => generated[n])
        .find(Boolean);
    if (!gen) {
      untyped.push(name);
      continue;
    }
    const problems = checkOptions(options, gen);
    if (problems.length) mismatched.push([name, problems]);
  }
  report(label, checked, untyped, mismatched);
}

// Every runtime component name must be in the generated name list.
function checkNames(label, runtimeNames, generated) {
  const missing = runtimeNames.filter((n) => !generated.has(n));
  failures += missing.length;
  console.log(`${label}: ${runtimeNames.length - missing.length}/${runtimeNames.length} listed${missing.length ? `\n  missing: ${missing.join(' ')}` : ''}`);
}

// Every runtime codec needs an FF_(EN|DE)CODER_* constant branded with its media type.
function checkCodecConstants(label, runtime, file) {
  const generated = new Map();
  const constRe = /^export const FF_\w+ = '([^']+)' as FF(Video|Audio|Subtitle)(?:Encoder|Decoder)</gm;
  for (const m of readConstants(file).matchAll(constRe)) generated.set(m[1], m[2].toLowerCase());
  const problems = [];
  for (const [name, { media }] of Object.entries(runtime)) {
    const type = generated.get(name);
    if (type === undefined) problems.push(`${name} (${media}) has no constant`);
    else if (type !== media) problems.push(`${name} typed ${type}, runtime ${media}`);
  }
  failures += problems.length;
  const total = Object.keys(runtime).length;
  console.log(`${label}: ${total - problems.length}/${total} correct${problems.length ? `\n  ${problems.join('\n  ')}` : ''}`);
}

const runtime = dumpRuntime();
const names = (section) => Object.keys(runtime[section]).flatMap((n) => n.split(','));

console.log(`\nFFmpeg at ${PREFIX}\n\nPrivate options:`);
checkMap('  encoders', runtime.encoders, parseMap('options.ts', 'EncoderOptionsMap'));
checkMap('  decoders', runtime.decoders, parseMap('options.ts', 'DecoderOptionsMap'));
checkMap('  filters', runtime.filters, parseMap('filter-options.ts', 'FilterOptionsMap'));
checkMap('  bsfs', runtime.bsfs, parseMap('bsf-options.ts', 'BsfOptionsMap'));
checkMap('  muxers', runtime.muxers, parseMap('format-options.ts', 'MuxerPrivateOptionsMap'));
checkMap('  demuxers', runtime.demuxers, parseMap('format-options.ts', 'DemuxerPrivateOptionsMap'));

console.log('\nGeneric options:');
for (const [label, opts, file, name] of [
  ['codec context', runtime.codec_context, 'options.ts', 'CodecContextOptions'],
  ['format context', runtime.format_context, 'format-options.ts', 'FormatContextOptions'],
]) {
  const problems = checkOptions(opts, parseMembers(interfaceBody(file, name)));
  report(`  ${label}`, 1, [], problems.length ? [[name, problems]] : []);
}

console.log('\nNames:');
checkNames('  muxers', names('muxers'), parseUnion('formats.ts', 'MuxerFormat'));
checkNames('  demuxers', names('demuxers'), parseUnion('formats.ts', 'DemuxerFormat'));
checkNames('  bsfs', names('bsfs'), parseUnion('bsf-options.ts', 'BsfName'));
checkNames('  filters', names('filters'), new Set(Object.keys(parseMap('filter-options.ts', 'FilterOptionsMap'))));

console.log('\nCodec constants:');
checkCodecConstants('  encoders', runtime.encoders, 'encoders.ts');
checkCodecConstants('  decoders', runtime.decoders, 'decoders.ts');

console.log(failures ? `\n${failures} problem(s)` : '\nAll typings match the runtime');
process.exit(failures ? 1 : 0);
