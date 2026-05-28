/**
 * Shared AVOption source parser for codecs, (de)muxers and bitstream filters.
 * Each component struct points at an AVClass via `.p.priv_class`, which points
 * at an `AVOption[]` via `.option`. We only extract name, help, AV_OPT_TYPE and
 * .unit (enum grouping) — defaults/min/max/flags are ignored.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const NUMERIC = new Set(['INT', 'INT64', 'UINT', 'UINT64', 'DOUBLE', 'FLOAT']);
const STRINGY = new Set(['STRING', 'COLOR', 'IMAGE_SIZE', 'DURATION', 'DICT', 'FLAGS', 'PIXEL_FMT', 'SAMPLE_FMT', 'BINARY', 'CHLAYOUT']);
const RATIONALY = new Set(['RATIONAL', 'VIDEO_RATE']);

export function mapKind(token, hasEnum) {
  if (hasEnum) return 'enum';
  if (token === 'BOOL') return 'boolean';
  if (NUMERIC.has(token)) return 'number';
  if (RATIONALY.has(token)) return 'rational';
  if (STRINGY.has(token)) return 'string';
  return 'string';
}

// Recursively collect .c/.h files under a directory.
export function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.name.endsWith('.c') || e.name.endsWith('.h')) acc.push(full);
  }
  return acc;
}

// Collect object- and function-like #define macros (joining \-continuations).
// A non-empty body is never clobbered by an empty redefinition (#if/#else).
export function collectDefines(src, into) {
  const joined = src.replace(/\\\r?\n/g, ' ');
  const re = /^[ \t]*#define[ \t]+([A-Za-z_]\w*)(\([^)]*\))?[ \t]+(.+)$/gm;
  let m;
  while ((m = re.exec(joined)) !== null) {
    const name = m[1];
    const params = m[2]
      ? m[2]
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : null;
    const body = m[3].trim();
    if (body === '' && into.has(name)) continue;
    into.set(name, { params, body });
  }
}

// Numeric #defines (e.g. AMV_OPTIONS_OFFSET 4) for `.option = array + OFFSET`.
function collectNumericDefines(src) {
  const out = new Map();
  const re = /^[ \t]*#define[ \t]+([A-Z_][A-Z0-9_]*)[ \t]+(\d+)[ \t]*$/gm;
  let m;
  while ((m = re.exec(src)) !== null) out.set(m[1], Number(m[2]));
  return out;
}

const stringize = (s) => '"' + s.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

// Read a balanced (...) arg list at the '(' index, splitting on top-level commas.
function readArgs(text, open) {
  const args = [];
  let depth = 0;
  let cur = '';
  let i = open;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      const start = i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\') i++;
        i++;
      }
      cur += text.slice(start, i + 1);
      continue;
    }
    if (c === '(' || c === '{' || c === '[') {
      depth++;
      if (depth === 1 && c === '(') continue;
      cur += c;
    } else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (depth === 0) {
        args.push(cur.trim());
        return { args, end: i + 1 };
      }
      cur += c;
    } else if (c === ',' && depth === 1) {
      args.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  return { args: null, end: open };
}

function substituteFunc(macro, args) {
  let body = macro.body;
  macro.params.forEach((p, idx) => {
    const a = args[idx] ?? '';
    body = body.replace(new RegExp('#\\s*\\b' + p + '\\b', 'g'), stringize(a)); // #param
    body = body.replace(new RegExp('\\b' + p + '\\b', 'g'), a); // bare param
  });
  return body.replace(/\s*##\s*/g, ''); // token paste
}

// One string-aware expansion pass. Returns { out, changed }.
function expandOnce(text, defines) {
  let out = '';
  let i = 0;
  let changed = false;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      const start = i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\') i++;
        i++;
      }
      i++;
      out += text.slice(start, i);
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j++;
      const ident = text.slice(i, j);
      const macro = defines.get(ident);
      if (macro) {
        if (macro.params) {
          let k = j;
          while (k < text.length && /\s/.test(text[k])) k++;
          if (text[k] === '(') {
            const { args, end } = readArgs(text, k);
            if (args) {
              out += substituteFunc(macro, args);
              i = end;
              changed = true;
              continue;
            }
          }
          out += ident;
          i = j;
          continue;
        }
        out += macro.body;
        i = j;
        changed = true;
        continue;
      }
      out += ident;
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return { out, changed };
}

function expandMacros(body, defines) {
  let cur = body;
  for (let guard = 0; guard < 12; guard++) {
    const { out, changed } = expandOnce(cur, defines);
    cur = out;
    if (!changed) break;
  }
  return cur;
}

// Header (.h) macro table. Per-.c defines are merged on top later so same-named
// local macros (e.g. COMMON_OPTIONS) don't collide across files.
export function buildHeaderMacros(files) {
  const headerMacros = new Map();
  for (const f of files) {
    if (f.endsWith('.h')) collectDefines(readFileSync(f, 'utf8'), headerMacros);
  }
  return headerMacros;
}

// All top-level {...} groups in a string (brace-depth aware).
function topLevelGroups(s) {
  const groups = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '{') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        groups.push(s.slice(start, i));
        start = -1;
      }
    }
  }
  return groups;
}

const STRLIT = /"((?:[^"\\]|\\.)*)"/g;

function parseEntry(entry) {
  const typeMatch = entry.match(/AV_OPT_TYPE_([A-Z0-9_]+)/);
  if (!typeMatch) return null;
  const token = typeMatch[1];
  const prefix = entry.slice(0, typeMatch.index);
  STRLIT.lastIndex = 0;
  const strings = [];
  let sm;
  while ((sm = STRLIT.exec(prefix)) !== null) strings.push(sm[1]);
  const unitMatch = entry.match(/\.unit\s*=\s*"([^"]+)"/);
  return {
    name: strings[0] ?? null,
    help: strings[1] ?? null,
    token,
    unit: unitMatch ? unitMatch[1] : null,
    isConst: token === 'CONST',
    isArray: /AV_OPT_TYPE_FLAG_ARRAY/.test(entry),
  };
}

// Parse an AVOption array body. `offset` skips leading entries for classes that
// point into the middle of a shared array (`.option = options + OFFSET`).
export function parseOptionArray(rawBody, macros, offset = 0) {
  const body = expandMacros(rawBody, macros);
  const entries = topLevelGroups(body).map(parseEntry).filter(Boolean).slice(offset);

  const constsByUnit = new Map();
  for (const e of entries) {
    if (e.isConst && e.unit && e.name) {
      if (!constsByUnit.has(e.unit)) constsByUnit.set(e.unit, []);
      constsByUnit.get(e.unit).push(e.name);
    }
  }

  const out = {};
  for (const e of entries) {
    if (e.isConst || !e.name) continue;
    const enumVals = e.unit ? constsByUnit.get(e.unit) : undefined;
    // FLAGS are combinable token lists; a non-FLAGS unit is a single-choice enum.
    let kind;
    if (e.token === 'FLAGS') kind = 'flags';
    else if (enumVals?.length) kind = 'enum';
    else if (e.isArray) kind = 'string';
    else kind = mapKind(e.token, false);
    const desc = { kind };
    // Dedupe const names (the same name can appear under multiple #if branches).
    if ((kind === 'enum' || kind === 'flags') && enumVals?.length) desc.values = [...new Set(enumVals)];
    if (e.help) desc.help = e.help;
    if (!(e.name in out)) out[e.name] = desc;
  }
  return out;
}

const classDefRe = /(?:const\s+)?AVClass\s+(\w+)\s*=\s*\{([\s\S]*?)\n\}\s*;/g;
const arrayDefRe = /(?:const\s+)?AVOption\s+(\w+)\s*\[\s*\]\s*=\s*\{([\s\S]*?)\n\}\s*;/g;

// Build a per-file resolver: priv_class variable name -> parsed options.
export function makeClassResolver(src, localMacros) {
  const numericDefines = collectNumericDefines(src);

  const classToArray = new Map();
  let cm;
  classDefRe.lastIndex = 0;
  while ((cm = classDefRe.exec(src)) !== null) {
    const opt = cm[2].match(/\.option\s*=\s*(\w+)\s*(?:\+\s*(\w+))?/);
    if (opt) {
      const tok = opt[2];
      const offset = tok ? (/^\d+$/.test(tok) ? Number(tok) : (numericDefines.get(tok) ?? 0)) : 0;
      classToArray.set(cm[1], { array: opt[1], offset });
    }
  }

  const resolveOffset = (tok) => (tok ? (/^\d+$/.test(tok) ? Number(tok) : (numericDefines.get(tok) ?? 0)) : 0);
  // Parse an options expression: `arr`, `&arr[OFF]`, `arr + OFF`, `&arr`.
  const parseOptExpr = (expr) => {
    expr = expr.trim();
    let m;
    if ((m = expr.match(/^&\s*(\w+)\s*\[\s*(\w+)\s*\]$/))) return { array: m[1], offset: resolveOffset(m[2]) };
    if ((m = expr.match(/^(\w+)\s*\+\s*(\w+)$/))) return { array: m[1], offset: resolveOffset(m[2]) };
    if ((m = expr.match(/^&?\s*(\w+)$/))) return { array: m[1], offset: 0 };
    return null;
  };
  const setClass = (classVar, expr) => {
    if (classToArray.has(classVar)) return;
    const link = parseOptExpr(expr);
    if (link) classToArray.set(classVar, link);
  };

  // libavfilter defines most classes via macros instead of a literal AVClass:
  //   AVFILTER_DEFINE_CLASS(foo)               -> foo_class, .option = foo_options
  //   AVFILTER_DEFINE_CLASS_EXT(foo, d, opt)   -> foo_class, .option = opt
  //   FRAMESYNC_DEFINE_CLASS(foo, ctx, field)  -> foo_class, .option = foo_options
  //   FRAMESYNC_DEFINE_CLASS_EXT(foo,c,f, opt) -> foo_class, .option = opt
  let dm;
  const plainRe = /(?:AVFILTER|FRAMESYNC)_DEFINE_CLASS\s*\(\s*(\w+)\b/g;
  while ((dm = plainRe.exec(src)) !== null) setClass(`${dm[1]}_class`, `${dm[1]}_options`);
  const avExtRe = /AVFILTER_DEFINE_CLASS_EXT\s*\(\s*(\w+)\s*,\s*(?:"[^"]*"|[^,]+)\s*,\s*([^)]*)\)/g;
  while ((dm = avExtRe.exec(src)) !== null) setClass(`${dm[1]}_class`, dm[2]);
  const fsExtRe = /FRAMESYNC_DEFINE_CLASS_EXT\s*\(\s*(\w+)\s*,[^,]*,[^,]*,\s*([^)]*)\)/g;
  while ((dm = fsExtRe.exec(src)) !== null) setClass(`${dm[1]}_class`, dm[2]);

  // Collect AVOption array bodies: literal `AVOption x[] = {...}` definitions...
  const arrayBodies = new Map();
  let am;
  arrayDefRe.lastIndex = 0;
  while ((am = arrayDefRe.exec(src)) !== null) if (!arrayBodies.has(am[1])) arrayBodies.set(am[1], am[2]);

  // ...plus arrays produced by a function-like macro (e.g. f_select.c:
  // DEFINE_OPTIONS(select, FLAGS) -> static const AVOption select_options[] = {...}).
  for (const [mname, macro] of localMacros) {
    if (!macro.params || !/AVOption\b[\s\S]*\[\s*\]/.test(macro.body)) continue;
    const callRe = new RegExp(`\\b${mname}\\s*\\(`, 'g');
    let im;
    while ((im = callRe.exec(src)) !== null) {
      const lineStart = src.lastIndexOf('\n', im.index) + 1;
      if (src.slice(lineStart, im.index).includes('#define')) continue; // skip the macro definition itself
      const { args } = readArgs(src, src.indexOf('(', im.index));
      if (!args) continue;
      const expanded = expandMacros(`${mname}(${args.join(',')})`, localMacros);
      const em = expanded.match(/AVOption\s+(\w+)\s*\[\s*\]\s*=\s*\{/);
      if (!em) continue;
      const open = em.index + em[0].length - 1;
      let depth = 0;
      let body = null;
      for (let i = open; i < expanded.length; i++) {
        if (expanded[i] === '{') depth++;
        else if (expanded[i] === '}' && --depth === 0) {
          body = expanded.slice(open + 1, i);
          break;
        }
      }
      if (body && !arrayBodies.has(em[1])) arrayBodies.set(em[1], body);
    }
  }

  const cache = new Map();
  const getArray = (arrayVar, offset) => {
    const cacheKey = `${arrayVar}+${offset}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const body = arrayBodies.get(arrayVar);
    const parsed = body != null ? parseOptionArray(body, localMacros, offset) : null;
    cache.set(cacheKey, parsed);
    return parsed;
  };

  return (classVar) => {
    const link = classToArray.get(classVar);
    return link ? getArray(link.array, link.offset) : null;
  };
}

const isIdent = (s) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s);
export const key = (s) => (isIdent(s) ? s : `'${s.replace(/'/g, "\\'")}'`);

// FFmpeg docs are texinfo-generated; section anchors encode every non-alphanumeric
// character as `_` + the lowercase 4-digit hex of its code point (e.g. '_' ->
// '_005f', '-' -> '_002d'), so e.g. `dump_extra` -> `dump_005fextra`.
export const docAnchor = (name) => name.replace(/[^A-Za-z0-9]/g, (c) => '_' + c.codePointAt(0).toString(16).padStart(4, '0'));
// Sanitize help/description text for a JSDoc comment that is also rendered as
// markdown/Vue by the docs build: neutralize `*/` and escape `&<>` so sequences
// like "<psy-rd>" aren't parsed as (unclosed) HTML tags.
const jsdoc = (s) => (s ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\//g, '*​/') : '');
const quote = (v) => `'${v.replace(/'/g, "\\'")}'`;

// Modes: 'strict' (codecs/BSF) rejects invalid keys/values; 'lenient' (containers)
// also accepts loose primitives for protocol/child options; 'expr' (filters) keeps
// strict enums but lets string options take numbers (many are expressions).
export function renderType(desc, mode = 'strict') {
  const lenient = mode === true || mode === 'lenient';
  const expr = mode === 'expr';
  switch (desc.kind) {
    case 'number':
      return lenient ? 'number | (string & {})' : 'number';
    case 'boolean':
      return lenient ? 'boolean | (string & {})' : 'boolean';
    case 'rational':
      // Applied as a stringified dict, so "30/1" or a bare number — not an object.
      return 'string | number';
    case 'enum': {
      const vals = (desc.values ?? []).map(quote);
      if (!vals.length) return lenient || expr ? 'string | number' : 'string';
      return lenient ? `${vals.join(' | ')} | (string & {}) | number` : vals.join(' | ');
    }
    case 'flags': {
      // Combinable list ("+a+b"): suggest tokens but accept any string.
      const vals = (desc.values ?? []).map(quote);
      const base = vals.length ? `${vals.join(' | ')} | (string & {})` : 'string';
      return lenient ? `${base} | number` : base;
    }
    default:
      return lenient || expr ? 'string | number' : 'string';
  }
}

// componentDoc(name) may return a multi-line JSDoc body emitted above each entry.
export function renderMap(name, components, mode = 'strict', componentDoc = null) {
  let out = `export interface ${name} {\n`;
  for (const component of Object.keys(components).sort()) {
    const doc = componentDoc?.(component);
    if (doc) {
      out += '  /**\n';
      for (const line of doc.split('\n')) out += `   * ${jsdoc(line)}\n`;
      out += '   */\n';
    }
    out += `  ${key(component)}: {\n`;
    for (const [opt, desc] of Object.entries(components[component])) {
      if (desc.help) out += `    /** ${jsdoc(desc.help)} */\n`;
      out += `    ${key(opt)}?: ${renderType(desc, mode)};\n`;
    }
    out += '  };\n';
  }
  return out + '}\n';
}

// Like renderMap but flat (no per-component nesting) — for the shared option bases.
export function renderFlat(name, options, mode = 'strict') {
  let out = `export interface ${name} {\n`;
  for (const [opt, desc] of Object.entries(options)) {
    if (desc.help) out += `  /** ${jsdoc(desc.help)} */\n`;
    out += `  ${key(opt)}?: ${renderType(desc, mode)};\n`;
  }
  return out + '}\n';
}

export function fileHeader(lines) {
  const body = (Array.isArray(lines) ? lines : [lines]).map((l) => ` * ${l}`).join('\n');
  return `/**\n${body}\n * DO NOT EDIT MANUALLY.\n */\n\n`;
}
