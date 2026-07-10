#!/usr/bin/env node

/**
 * Checks that the three gyp files (binding.gyp, binding-jellyfin.gyp,
 * binding-msvc.gyp) stay in sync.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const GYP_FILES = ['binding.gyp', 'binding-jellyfin.gyp', 'binding-msvc.gyp'];
const PLATFORM_SPECIFIC = /^src\/bindings\/(device_(darwin|linux|win32)|gpu_texture_(darwin|linux|win))\.(cc|mm)$/;

function parseGyp(path) {
  const raw = readFileSync(path, 'utf8');
  let out = '';
  let inString = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      out += ch;
      if (ch === '\\') {
        out += raw[++i] ?? '';
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === '#') {
      while (i < raw.length && raw[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    out += ch;
  }

  out = out.replace(/,(\s*[\]}])/g, '$1');
  return JSON.parse(out);
}

function collectSources(target) {
  const topLevel = [...(target.sources ?? [])];
  const conditional = [];

  const walkConditions = (conditions) => {
    for (const condition of conditions ?? []) {
      // A condition entry is [expr, thenObj, elseObj?]
      for (const branch of condition.slice(1)) {
        if (!branch || typeof branch !== 'object') continue;
        conditional.push(...(branch.sources ?? []));
        walkConditions(branch.conditions);
      }
    }
  };

  walkConditions(target.conditions);
  return { topLevel, conditional };
}

let failed = false;
const fail = (message) => {
  console.error(`ERROR: ${message}`);
  failed = true;
};

const perGyp = new Map();
for (const gypFile of GYP_FILES) {
  const parsed = parseGyp(join(rootDir, gypFile));
  const target = parsed.targets?.[0];
  if (!target) {
    fail(`${gypFile}: no targets found`);
    continue;
  }
  perGyp.set(gypFile, collectSources(target));
}

if (failed) process.exit(1);

const commonSets = new Map();
for (const [gypFile, { topLevel }] of perGyp) {
  commonSets.set(gypFile, new Set(topLevel.filter((s) => !PLATFORM_SPECIFIC.test(s))));
}

const [reference, ...others] = GYP_FILES;
const referenceSet = commonSets.get(reference);
for (const gypFile of others) {
  const set = commonSets.get(gypFile);
  const missing = [...referenceSet].filter((s) => !set.has(s));
  const extra = [...set].filter((s) => !referenceSet.has(s));

  if (missing.length > 0 || extra.length > 0) {
    fail(`common source lists differ between ${reference} and ${gypFile}:`);
    for (const s of missing) console.error(`  - only in ${reference}: ${s}`);
    for (const s of extra) console.error(`  - only in ${gypFile}: ${s}`);
  }
}

const allReferenced = new Set();
for (const { topLevel, conditional } of perGyp.values()) {
  for (const s of [...topLevel, ...conditional]) allReferenced.add(s);
}

const bindingsDir = join(rootDir, 'src', 'bindings');
const bindingSources = readdirSync(bindingsDir)
  .filter((f) => f.endsWith('.cc') || f.endsWith('.mm'))
  .map((f) => `src/bindings/${f}`);

for (const source of bindingSources) {
  if (!allReferenced.has(source)) {
    fail(`${source} exists but is not referenced by any gyp file`);
  }
}

for (const source of allReferenced) {
  if (source.startsWith('src/bindings/')) {
    if (!existsSync(join(rootDir, source))) {
      fail(`referenced source does not exist: ${source}`);
    }
  } else if (source.startsWith('externals/')) {
    // Submodule sources - only verifiable when the submodule is checked out
    // (CI's gyp-check job checks out without submodules).
    const submoduleRoot = join(rootDir, source.split('/').slice(0, 2).join('/'));
    if (existsSync(join(submoduleRoot, '.git')) && !existsSync(join(rootDir, source))) {
      fail(`referenced submodule source does not exist: ${source}`);
    }
  }
}

if (failed) {
  console.error('\ngyp consistency check FAILED');
  process.exit(1);
}

console.log(`gyp consistency check passed (${bindingSources.length} binding sources, ${allReferenced.size} referenced sources)`);
