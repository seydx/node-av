#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AV_OPT_TYPE_BOOL,
  AV_OPT_TYPE_COLOR,
  AV_OPT_TYPE_CONST,
  AV_OPT_TYPE_DICT,
  AV_OPT_TYPE_DOUBLE,
  AV_OPT_TYPE_DURATION,
  AV_OPT_TYPE_FLAGS,
  AV_OPT_TYPE_FLOAT,
  AV_OPT_TYPE_IMAGE_SIZE,
  AV_OPT_TYPE_INT,
  AV_OPT_TYPE_INT64,
  AV_OPT_TYPE_PIXEL_FMT,
  AV_OPT_TYPE_RATIONAL,
  AV_OPT_TYPE_SAMPLE_FMT,
  AV_OPT_TYPE_STRING,
  AV_OPT_TYPE_UINT,
  AV_OPT_TYPE_UINT64,
  AV_OPT_TYPE_VIDEO_RATE,
  Codec,
} from '../src/index.js';
import type { NativeCodecOption } from '../src/lib/native-types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

type TsKind = 'number' | 'string' | 'boolean' | 'enum' | 'rational';

interface OptionDesc {
  kind: TsKind;
  values?: string[]; // for enum
  help?: string;
}

type CodecOptions = Record<string, OptionDesc>;

const n = (t: unknown) => t as number;

const NUMERIC = new Set([AV_OPT_TYPE_INT, AV_OPT_TYPE_INT64, AV_OPT_TYPE_UINT, AV_OPT_TYPE_UINT64, AV_OPT_TYPE_DOUBLE, AV_OPT_TYPE_FLOAT].map(n));
const STRINGY = new Set(
  [
    AV_OPT_TYPE_STRING,
    AV_OPT_TYPE_COLOR,
    AV_OPT_TYPE_IMAGE_SIZE,
    AV_OPT_TYPE_DURATION,
    AV_OPT_TYPE_DICT,
    AV_OPT_TYPE_FLAGS,
    AV_OPT_TYPE_PIXEL_FMT,
    AV_OPT_TYPE_SAMPLE_FMT,
  ].map(n),
);
const RATIONALY = new Set([AV_OPT_TYPE_RATIONAL, AV_OPT_TYPE_VIDEO_RATE].map(n));

function mapKind(type: number, hasEnum: boolean): TsKind {
  if (hasEnum) return 'enum';
  if (type === n(AV_OPT_TYPE_BOOL)) return 'boolean';
  if (NUMERIC.has(type)) return 'number';
  if (RATIONALY.has(type)) return 'rational';
  if (STRINGY.has(type)) return 'string';
  return 'string'; // safe fallback (binary, chlayout, unknown)
}

function describeOptions(raw: NativeCodecOption[]): CodecOptions {
  // Group CONST values by unit → enum members
  const constsByUnit = new Map<string, string[]>();
  for (const o of raw) {
    if (n(o.type) === n(AV_OPT_TYPE_CONST) && o.unit) {
      (constsByUnit.get(o.unit) ?? constsByUnit.set(o.unit, []).get(o.unit)!).push(o.name);
    }
  }

  const out: CodecOptions = {};
  for (const o of raw) {
    if (n(o.type) === n(AV_OPT_TYPE_CONST)) continue; // enum members handled via unit
    if (!o.name) continue;
    const enumVals = o.unit ? constsByUnit.get(o.unit) : undefined;
    const kind = mapKind(n(o.type), !!enumVals?.length);
    const desc: OptionDesc = { kind };
    // Dedupe enum members (same name can appear under multiple #if branches)
    if (kind === 'enum') desc.values = [...new Set(enumVals)];
    if (o.help) desc.help = o.help;
    // first occurrence wins (avoid alias overwrite churn)
    if (!(o.name in out)) out[o.name] = desc;
  }
  return out;
}

const encoders: Record<string, CodecOptions> = {};
const decoders: Record<string, CodecOptions> = {};

for (const codec of Codec.getCodecList()) {
  const name = codec.name;
  if (!name) continue;
  const opts = describeOptions(codec.getOptions());
  if (Object.keys(opts).length === 0) continue; // no private options
  if (codec.isEncoder()) encoders[name] = opts;
  if (codec.isDecoder()) decoders[name] = opts;
}

const platform = `${process.platform}-${process.arch}`;
const outDir = join(__dirname, '.options-data');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `${platform}.json`);
writeFileSync(outFile, JSON.stringify({ platform, encoders, decoders }, null, 2) + '\n');

console.log(`[${platform}] ${Object.keys(encoders).length} encoders, ${Object.keys(decoders).length} decoders with private options`);
console.log(`Wrote ${outFile}`);
