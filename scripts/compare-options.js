#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '.options-data');

const source = JSON.parse(readFileSync(join(dataDir, '_source.json'), 'utf8'));
// merge all platform introspection files (everything except _source.json)
const introspection = { encoders: {}, decoders: {} };
for (const f of readdirSync(dataDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
  const d = JSON.parse(readFileSync(join(dataDir, f), 'utf8'));
  Object.assign(introspection.encoders, d.encoders);
  Object.assign(introspection.decoders, d.decoders);
}

const eqEnum = (a, b) => {
  const sa = new Set(a ?? []);
  const sb = new Set(b ?? []);
  if (sa.size !== sb.size) return false;
  for (const v of sa) if (!sb.has(v)) return false;
  return true;
};

function compareKind(kindLabel, srcMap, introMap) {
  let bothCodecs = 0;
  let perfectCodecs = 0;
  let srcOnly = 0;
  const issues = [];

  for (const codec of Object.keys(srcMap)) {
    if (!(codec in introMap)) {
      srcOnly++;
      continue;
    }
    bothCodecs++;
    const s = srcMap[codec];
    const i = introMap[codec];
    const codecIssues = [];

    for (const opt of Object.keys(i)) {
      if (!(opt in s)) {
        codecIssues.push(`  - missing in source: ${opt}`);
        continue;
      }
      if (s[opt].kind !== i[opt].kind) {
        codecIssues.push(`  ~ kind diff ${opt}: source=${s[opt].kind} intro=${i[opt].kind}`);
      } else if (i[opt].kind === 'enum' && !eqEnum(s[opt].values, i[opt].values)) {
        codecIssues.push(`  ~ enum diff ${opt}: source=[${s[opt].values}] intro=[${i[opt].values}]`);
      }
    }
    for (const opt of Object.keys(s)) {
      if (!(opt in i)) codecIssues.push(`  + extra in source: ${opt}`);
    }

    if (codecIssues.length === 0) perfectCodecs++;
    else issues.push(`${codec}:\n${codecIssues.join('\n')}`);
  }

  console.log(`\n=== ${kindLabel} ===`);
  console.log(`  in both:        ${bothCodecs}`);
  console.log(`  perfect match:  ${perfectCodecs}/${bothCodecs}`);
  console.log(`  source-only (HW not introspectable here): ${srcOnly}`);
  if (issues.length) {
    console.log(`\n  --- mismatches (${issues.length} codecs) ---`);
    console.log(issues.slice(0, 40).join('\n'));
    if (issues.length > 40) console.log(`  … and ${issues.length - 40} more`);
  }
}

compareKind('ENCODERS', source.encoders, introspection.encoders);
compareKind('DECODERS', source.decoders, introspection.decoders);
