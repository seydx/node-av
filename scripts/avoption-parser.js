/**
 * Shared AVOption source parser for codecs, filters, (de)muxers and bitstream filters.
 * Each component struct points at an AVClass via `.p.priv_class`, which points at an
 * `AVOption[]` via `.option`. We only extract name, help, AV_OPT_TYPE and .unit
 * (enum grouping); defaults/min/max/flags are ignored.
 *
 * createSourceIndex() indexes every AVClass and AVOption array of a library, so a
 * component can use a class or option array from another file (ff_mpv_enc_class,
 * ff_rtsp_options, ...). Components, classes and arrays defined by function-like
 * macros (PCM/raw demuxers, biquad filters, AudioToolbox encoders, ...) are found by
 * expanding the macro invocations.
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

// Recursively collect source files (default .c/.h; libavdevice also uses .m).
export function walk(dir, acc = [], exts = ['.c', '.h']) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, acc, exts);
    else if (exts.some((x) => e.name.endsWith(x))) acc.push(full);
  }
  return acc;
}

// Index just past the string or char literal that starts at `i`.
function skipLiteral(text, i) {
  const quote = text[i++];
  while (i < text.length && text[i] !== quote && text[i] !== '\n') {
    if (text[i] === '\\') i++;
    i++;
  }
  return i + 1;
}

// Remove C comments, leaving string and char literals intact. A block comment becomes
// one space, as in the C translation phases, so a comment spanning lines inside a
// #define does not cut the macro body short.
function stripComments(src) {
  let out = '';
  let i = 0;
  let last = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'") {
      i = skipLiteral(src, i);
    } else if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      out += src.slice(last, i) + ' ';
      i = last = end < 0 ? src.length : end + 2;
    } else if (c === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i);
      out += src.slice(last, i);
      i = last = end < 0 ? src.length : end;
    } else {
      i++;
    }
  }
  return out + src.slice(last);
}

// Index of the brace that closes the one at `open`, or -1.
function matchBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") {
      i = skipLiteral(text, i) - 1;
    } else if (c === '{') {
      depth++;
    } else if (c === '}' && --depth === 0) {
      return i;
    }
  }
  return -1;
}

// Collect object- and function-like #define macros (joining \-continuations).
// A non-empty body is never clobbered by an empty redefinition (#if/#else).
function collectDefines(src, into) {
  const joined = src.replace(/\\\r?\n/g, ' ');
  const re = /^[ \t]*#[ \t]*define[ \t]+([A-Za-z_]\w*)(\([^)]*\))?[ \t]*(.*)$/gm;
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

// Macro table that reads through to a shared (header) table without copying it.
class MacroScope {
  constructor(parent) {
    this.parent = parent;
    this.own = new Map();
  }

  get(name) {
    return this.own.get(name) ?? this.parent?.get(name);
  }

  has(name) {
    return this.own.has(name) || !!this.parent?.has(name);
  }

  set(name, value) {
    this.own.set(name, value);
  }
}

const stringize = (s) => '"' + s.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

// Read a balanced (...) arg list at the '(' index, splitting on top-level commas.
function readArgs(text, open) {
  const args = [];
  let depth = 0;
  let cur = '';
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const end = skipLiteral(text, i);
      cur += text.slice(i, end);
      i = end - 1;
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

// Substitute the arguments into a function-like macro body: `#param` stringizes,
// `a ## b` pastes, `...`/`name...` collect the variadic arguments. As in C, an
// argument is macro-expanded first unless it is an operand of # or ##, so
// `NAME_ ## enabled` with enabled = CONFIG_X pastes the CONFIG_X value.
function substituteFunc(macro, args, defines) {
  const values = new Map();
  macro.params.forEach((p, idx) => {
    if (p === '...') values.set('__VA_ARGS__', args.slice(idx).join(', '));
    else if (p.endsWith('...')) values.set(p.slice(0, -3).trim(), args.slice(idx).join(', '));
    else values.set(p, args[idx] ?? '');
  });
  const expanded = new Map();
  const expandedValue = (p) => {
    if (!expanded.has(p)) expanded.set(p, expandMacros(values.get(p), defines));
    return expanded.get(p);
  };
  const body = macro.body;
  let out = '';
  let afterPaste = false;
  let i = 0;
  while (i < body.length) {
    const c = body[i];
    if (/\s/.test(c)) {
      out += c;
      i++;
      continue;
    }
    if (c === '#' && body[i + 1] === '#') {
      out = out.trimEnd();
      i += 2;
      while (i < body.length && /\s/.test(body[i])) i++;
      afterPaste = true;
      continue;
    }
    if (c === '"' || c === "'") {
      const end = skipLiteral(body, i);
      out += body.slice(i, end);
      i = end;
    } else if (c === '#') {
      const m = /^#\s*([A-Za-z_]\w*)/.exec(body.slice(i, i + 80));
      if (m && values.has(m[1])) {
        out += stringize(values.get(m[1]));
        i += m[0].length;
      } else {
        out += c;
        i++;
      }
    } else if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < body.length && /\w/.test(body[j])) j++;
      const ident = body.slice(i, j);
      if (values.has(ident)) {
        let k = j;
        while (k < body.length && /\s/.test(body[k])) k++;
        out += afterPaste || body.startsWith('##', k) ? values.get(ident) : expandedValue(ident);
      } else {
        out += ident;
      }
      i = j;
    } else {
      out += c;
      i++;
    }
    afterPaste = false;
  }
  return out;
}

// One literal-aware expansion pass. Returns { out, changed }.
function expandOnce(text, defines) {
  let out = '';
  let i = 0;
  let changed = false;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const end = skipLiteral(text, i);
      out += text.slice(i, end);
      i = end;
      continue;
    }
    if (/[0-9]/.test(c)) {
      // a number (0x1F, 1e10, 10LL): never a macro name
      let j = i + 1;
      while (j < text.length && /[\w.]/.test(text[j])) j++;
      out += text.slice(i, j);
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < text.length && /\w/.test(text[j])) j++;
      const ident = text.slice(i, j);
      const macro = defines.get(ident);
      if (macro?.params) {
        let k = j;
        while (k < text.length && /\s/.test(text[k])) k++;
        if (text[k] === '(') {
          const { args, end } = readArgs(text, k);
          if (args) {
            out += substituteFunc(macro, args, defines);
            i = end;
            changed = true;
            continue;
          }
        }
      } else if (macro && macro.body !== ident) {
        out += macro.body;
        i = j;
        changed = true;
        continue;
      } else if (!macro && /^CONFIG_[A-Z0-9_]+$/.test(ident)) {
        // configure switches (config_components.h): assume a full build
        out += '1';
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
  for (let guard = 0; guard < 16; guard++) {
    const { out, changed } = expandOnce(cur, defines);
    cur = out;
    if (!changed) break;
  }
  return cur;
}

// All `<type> name = {...}` / `<type> name[] = {...}` definitions in a source text.
function findDefinitions(src, type) {
  const re = new RegExp(`\\b${type}\\s+(\\w+)\\s*(\\[[^\\]]*\\])?\\s*=\\s*\\{`, 'g');
  const defs = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(src, open);
    if (close < 0) continue;
    defs.push({ name: m[1], isArray: !!m[2], body: src.slice(open + 1, close) });
    re.lastIndex = close;
  }
  return defs;
}

// All top-level {...} groups in a string (brace-depth aware, skips literals).
function topLevelGroups(s) {
  const groups = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      i = skipLiteral(s, i) - 1;
    } else if (c === '{') {
      const close = matchBrace(s, i);
      if (close < 0) break;
      groups.push(s.slice(i + 1, close));
      i = close;
    }
  }
  return groups;
}

// "a" "b" -> "ab" (adjacent literals, e.g. from `#name "_seed"` in an option macro).
const STRSEQ = /"((?:[^"\\]|\\.)*)"(?:\s*"((?:[^"\\]|\\.)*)")*/g;
const STRLIT = /"((?:[^"\\]|\\.)*)"/g;
const joinLiterals = (seq) => [...seq.matchAll(STRLIT)].map((m) => m[1]).join('');

function parseEntry(entry) {
  const typeMatch = entry.match(/AV_OPT_TYPE_([A-Z0-9_]+)/);
  if (!typeMatch) return null;
  const token = typeMatch[1];
  const prefix = entry.slice(0, typeMatch.index);
  const strings = [...prefix.matchAll(STRSEQ)].map((m) => joinLiterals(m[0]));
  // .unit = "x", or positionally after name, help, offset, type, default, min, max, flags
  const unitMatch = entry.match(/\.unit\s*=\s*((?:"(?:[^"\\]|\\.)*"\s*)+)/);
  let unit = unitMatch ? joinLiterals(unitMatch[1]) : null;
  if (!unit) {
    const fields = readArgs(`(${entry})`, 0).args ?? [];
    if (/^(?:"(?:[^"\\]|\\.)*"\s*)+$/.test(fields[8] ?? '')) unit = joinLiterals(fields[8]);
  }
  return {
    name: strings[0] ?? null,
    help: strings[1] ?? null,
    token,
    unit,
    isConst: token === 'CONST',
    isArray: /AV_OPT_TYPE_FLAG_ARRAY/.test(entry),
  };
}

// `table[N].field` in an option entry (afireqsrc names its presets so) -> the first
// string literal of element N of `table` in `src`.
function inlineTableNames(body, src) {
  return body.replace(/\b(\w+)\s*\[\s*(\d+)\s*\]\s*\.\s*\w+/g, (ref, table, n) => {
    const def = new RegExp(`\\b${table}\\s*\\[[^\\]]*\\]\\s*=\\s*\\{`).exec(src);
    const open = def ? def.index + def[0].length - 1 : -1;
    const element = def && topLevelGroups(src.slice(open + 1, matchBrace(src, open)))[Number(n)];
    const lit = element?.trim().match(/^"((?:[^"\\]|\\.)*)"/);
    return lit ? lit[0] : ref;
  });
}

// Parse an AVOption array body. `offset` skips leading entries for classes that
// point into the middle of a shared array (`.option = options + OFFSET`). `src` is
// the source text the array comes from, for names taken from other tables.
function parseOptionArray(rawBody, macros, offset = 0, src = null) {
  let body = expandMacros(rawBody, macros);
  if (src) body = inlineTableNames(body, src);
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
    // FLAGS are combinable token lists, and an array option is a list of its element
    // values: both suggest the named constants but take any string. Any other option
    // with a unit is a single-choice enum.
    let kind;
    if (e.token === 'FLAGS' || (e.isArray && enumVals?.length)) kind = 'flags';
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

const DEFINING = /\b(?:FFCodec|FFFilter|FFInputFormat|FFOutputFormat|FFBitStreamFilter|AVClass|AVOption)\b/;

// Source text without preprocessor lines, so a macro body is never taken for a definition.
const codeOf = (text) => text.replace(/\\\r?\n/g, ' ').replace(/^[ \t]*#.*$/gm, '');

// Expand the function-like macros invoked at file scope (outside any braces) and keep
// the expansions that define a component, class or option array. Taking every
// file-scope invocation also covers macros that only reach a definition through
// other macros (ADPCM_ENCODER -> ADPCM_ENCODER_3 -> ... -> `FFCodec ff_..._encoder`).
function expandDefiningMacros(code, macros) {
  let generated = '';
  let depth = 0;
  let pos = 0;
  const re = /\b([A-Za-z_]\w*)\s*\(/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (!macros.get(m[1])?.params) continue;
    // advance the brace depth up to the invocation, skipping literals
    for (; pos < m.index; pos++) {
      const c = code[pos];
      if (c === '"' || c === "'") pos = skipLiteral(code, pos) - 1;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
    }
    if (pos > m.index || depth !== 0) continue;
    const { args, end } = readArgs(code, m.index + m[0].length - 1);
    if (!args) continue;
    const expansion = expandMacros(`${m[1]}(${args.join(', ')})`, macros);
    if (DEFINING.test(expansion)) generated += '\n' + expansion + ';\n';
    re.lastIndex = pos = end;
  }
  return generated;
}

/**
 * Index the AVClasses and AVOption arrays of a set of source files.
 *
 * `sources` holds every file with its code (no comments or preprocessor lines) plus
 * the expansion of its component-defining macro invocations (`src`), and its macro
 * scope (`macros`). `resolveComponent(c)` returns the options of a findComponents()
 * entry's priv_class (its own array plus the options of child classes like
 * framesync), or null without a class; `resolveArray(name)` parses a named array.
 * `warnings` collects what could not be resolved (ambiguous or missing definitions).
 */
export function createSourceIndex(files, { macroHeaders = [] } = {}) {
  const texts = files.map((file) => ({ file, text: stripComments(readFileSync(file, 'utf8')) }));
  // Headers of other libraries only contribute macros (libavformat uses CODEC2_AVOPTIONS
  // from libavcodec/codec2utils.h); the library's own headers take precedence.
  const headerMacros = new Map();
  for (const file of macroHeaders) collectDefines(stripComments(readFileSync(file, 'utf8')), headerMacros);
  for (const { file, text } of texts) if (file.endsWith('.h')) collectDefines(text, headerMacros);

  const sources = texts.map(({ file, text }) => {
    const macros = new MacroScope(headerMacros);
    collectDefines(text, macros);
    const code = codeOf(text);
    const includes = [...text.matchAll(/^[ \t]*#[ \t]*include[ \t]+"([^"]+)"/gm)].map((m) => '/' + m[1]);
    return { file, src: code + expandDefiningMacros(code, macros), macros, includes };
  });

  const classes = new Map(); // name -> [{ name, source, body }]
  const arrays = new Map(); // name -> [{ name, source, body }]
  const add = (map, name, entry) => map.set(name, [...(map.get(name) ?? []), entry]);
  for (const source of sources) {
    if (!DEFINING.test(source.src)) continue;
    for (const d of findDefinitions(source.src, 'AVClass')) add(classes, d.name, { name: d.name, source, body: d.body });
    for (const d of findDefinitions(source.src, 'AVOption')) if (d.isArray) add(arrays, d.name, { name: d.name, source, body: d.body });
  }

  const warnings = new Set();
  // Same file first, then the headers it includes, else the one definition in the library.
  const pick = (map, name, source, what) => {
    const entries = map.get(name);
    if (!entries) return null;
    const local = entries.find((e) => e.source === source) ?? entries.find((e) => source.includes.some((inc) => e.source.file.endsWith(inc)));
    if (local) return local;
    const distinct = new Set(entries.map((e) => e.body));
    if (distinct.size === 1) return entries[0];
    warnings.add(`ambiguous ${what} ${name} for ${source.file}: ${entries.map((e) => e.source.file).join(', ')}`);
    return null;
  };

  const offsetOf = (token, macros) => {
    if (!token) return 0;
    const v = expandMacros(token, macros).trim();
    // an integer constant expression, e.g. (CONFIG_EROSION_FILTER || CONFIG_DILATION_FILTER)
    if (/^[\d\s()+\-*/%|&!<>=~^]+$/.test(v)) return Number(new Function(`return (${v});`)());
    warnings.add(`unresolved option offset ${token}`);
    return 0;
  };

  // `.option = arr`, `&arr[OFF]`, `arr + OFF`, `&arr`.
  const linkOf = (cls) => {
    if (cls.link !== undefined) return cls.link;
    const optMatch = cls.body.match(/\.option\s*=\s*([^,}]+)/);
    let link = null;
    if (optMatch && optMatch[1].trim() !== 'NULL') {
      const expr = expandMacros(optMatch[1], cls.source.macros).trim();
      let m;
      if ((m = expr.match(/^&\s*(\w+)\s*\[\s*([^\]]+?)\s*\]$/))) link = { array: m[1], offset: offsetOf(m[2], cls.source.macros) };
      else if ((m = expr.match(/^(\w+)\s*\+\s*(.+)$/))) link = { array: m[1], offset: offsetOf(m[2], cls.source.macros) };
      else if ((m = expr.match(/^&?\s*(\w+)$/))) link = { array: m[1], offset: 0 };
      else warnings.add(`unparsed .option = ${expr}`);
    }
    const iterMatch = cls.body.match(/\.child_class_iterate\s*=\s*&?\s*(\w+)/);
    cls.link = { ...link, children: iterMatch ? childClassesOf(iterMatch[1], cls.source) : [] };
    return cls.link;
  };

  // Classes returned by a child_class_iterate function (e.g. framesync's). The
  // function is looked up in the class's own file first, as it is often static.
  const childCache = new Map();
  const childClassesOf = (fn, owner) => {
    const cacheKey = `${owner.file}\0${fn}`;
    if (childCache.has(cacheKey)) return childCache.get(cacheKey);
    const found = [];
    const re = new RegExp(`\\b${fn}\\s*\\(\\s*void\\s*\\*\\s*\\*\\s*\\w+\\s*\\)\\s*\\{`);
    for (const source of [owner, ...sources.filter((x) => x !== owner)]) {
      const m = re.exec(source.src);
      if (!m) continue;
      const open = m.index + m[0].length - 1;
      const fnBody = source.src.slice(open, matchBrace(source.src, open));
      for (const [, name] of fnBody.matchAll(/&\s*(\w+)/g)) if (classes.has(name)) found.push({ name, source });
      break;
    }
    childCache.set(cacheKey, found);
    return found;
  };

  const parsed = new Map();
  const parseArray = (arr, offset, requester) => {
    // A header's array is parsed with the macros of the file that includes it.
    const macros = arr.source.file.endsWith('.h') ? requester.macros : arr.source.macros;
    const cacheKey = `${arr.source.file}\0${arr.name}\0${offset}\0${macros === requester.macros ? requester.file : ''}`;
    if (!parsed.has(cacheKey)) parsed.set(cacheKey, parseOptionArray(arr.body, macros, offset, arr.source.src));
    return parsed.get(cacheKey);
  };

  const resolveClass = (classVar, source) => {
    const cls = pick(classes, classVar, source, 'class');
    return cls ? resolveClassEntry(cls, classVar) : null;
  };

  const resolveClassEntry = (cls, label) => {
    const link = linkOf(cls);
    let opts = {};
    if (link.array) {
      const arr = pick(arrays, link.array, cls.source, 'option array');
      if (arr) opts = { ...parseArray(arr, link.offset, cls.source) };
      else warnings.add(`option array ${link.array} of ${label} not found`);
    }
    for (const child of link.children) {
      for (const [k, v] of Object.entries(resolveClass(child.name, child.source) ?? {})) if (!(k in opts)) opts[k] = v;
    }
    return opts;
  };

  // Options of a component found by findComponents(): its priv_class variable, or a
  // class it defines in place (bintext.c: `.p.priv_class = CLASS("...")`, a compound
  // literal). null when the component has no class.
  const resolveComponent = (c) => {
    if (c.privClass) return resolveClass(c.privClass, c.source);
    if (c.privClassBody) return resolveClassEntry({ source: c.source, body: c.privClassBody }, c.name);
    return null;
  };

  // Options of a named array (e.g. avcodec_options in options_table.h).
  const resolveArray = (name) => {
    const arr = arrays.get(name)?.[0];
    return arr ? parseOptionArray(arr.body, arr.source.macros) : {};
  };

  return { sources, resolveComponent, resolveArray, warnings };
}

// The initializer text of a designated field (`.p.name = <value>,`) up to its
// top-level comma, or null.
function fieldValue(body, field) {
  const m = new RegExp(`${field.replace(/\./g, '\\.')}\\s*=\\s*`).exec(body);
  if (!m) return null;
  let depth = 0;
  let i = m.index + m[0].length;
  for (; i < body.length; i++) {
    const c = body[i];
    if (c === '"' || c === "'") i = skipLiteral(body, i) - 1;
    else if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') {
      if (depth-- === 0) break;
    } else if (c === ',' && depth === 0) break;
  }
  return body.slice(m.index + m[0].length, i).trim();
}

// Name and priv_class of each `<type> ff_*` component definition in the indexed
// sources, in source order; `nameRe` matches (and filters) the variable name.
export function findComponents(index, type, nameRe) {
  const out = [];
  for (const source of index.sources) {
    if (!source.src.includes(type)) continue;
    for (const d of findDefinitions(source.src, type)) {
      const varMatch = d.name.match(nameRe);
      if (!varMatch) continue;
      // a literal, or a macro holding one (vf_colorconstancy.c: .p.name = GREY_EDGE)
      const nameExpr = fieldValue(d.body, '.p.name');
      const nameMatch = nameExpr && expandMacros(nameExpr, source.macros).match(/^\s*((?:"(?:[^"\\]|\\.)*"\s*)+)$/);
      if (!nameMatch) continue;
      const privExpr = fieldValue(d.body, '.p.priv_class') ?? fieldValue(d.body, '.priv_class');
      const privVar = privExpr?.match(/^&?\s*(\w+)$/)?.[1];
      let privClassBody = null;
      if (privExpr && !privVar) {
        const expanded = expandMacros(privExpr, source.macros);
        const open = expanded.indexOf('{');
        if (open >= 0 && /\.option\b/.test(expanded)) privClassBody = expanded.slice(open + 1);
      }
      out.push({ source, varMatch, name: joinLiterals(nameMatch[1]), body: d.body, privClass: privVar ?? null, privClassBody });
    }
  }
  return out;
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

// The lint line length; long help texts are wrapped to stay within it.
const MAX_LINE = 170;

// Word-wrap one doc line into ` * ` lines at `indent`.
const wrapDoc = (text, indent) => {
  const width = MAX_LINE - indent.length - 3;
  const lines = [];
  let cur = '';
  for (const word of jsdoc(text).split(/\s+/).filter(Boolean)) {
    if (cur && cur.length + 1 + word.length > width) {
      lines.push(cur);
      cur = word;
    } else {
      cur = cur ? `${cur} ${word}` : word;
    }
  }
  return [...lines, cur].map((l) => `${indent} * ${l}`.trimEnd()).join('\n') + '\n';
};

// A one-line JSDoc comment, or a wrapped block when that would be too long.
const docComment = (text, indent) => {
  const line = `${indent}/** ${jsdoc(text)} */`;
  return line.length <= MAX_LINE ? line + '\n' : `${indent}/**\n${wrapDoc(text, indent)}${indent} */\n`;
};

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
      for (const line of doc.split('\n')) out += wrapDoc(line, '  ');
      out += '   */\n';
    }
    out += `  ${key(component)}: {\n`;
    for (const [opt, desc] of Object.entries(components[component])) {
      if (desc.help) out += docComment(desc.help, '    ');
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
    if (desc.help) out += docComment(desc.help, '  ');
    out += `  ${key(opt)}?: ${renderType(desc, mode)};\n`;
  }
  return out + '}\n';
}

export function fileHeader(lines) {
  const body = (Array.isArray(lines) ? lines : [lines]).map((l) => ` * ${l}`).join('\n');
  return `/**\n${body}\n * DO NOT EDIT MANUALLY.\n */\n\n`;
}
