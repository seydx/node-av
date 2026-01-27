#!/usr/bin/env node
/* eslint-disable @stylistic/max-len */

/**
 * Generate TypeScript constants from FFmpeg headers
 * This extracts all AV_* constants and creates TypeScript constants with branded types
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { getFFmpegPath } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FFMPEG_PATH = getFFmpegPath('root');
console.log(`Using FFmpeg headers from: ${FFMPEG_PATH}`);

// Parse all AV_ constants from a header file
const parseConstants = (headerPath) => {
  if (!existsSync(headerPath)) {
    return [];
  }

  const content = readFileSync(headerPath, 'utf8');
  const constants = [];

  // Parse #define constants (including AVERROR, AVFMT, AVIO, AVFILTER, AVSTREAM, AVSEEK, SWS, SWR, and FF_THREAD)
  const definePattern = /#define\s+((?:AV|AVERROR|AVFMT|AVIO|AVFILTER|AVSTREAM|AVSEEK|SWS|SWR|FF_THREAD)_[A-Z0-9_]+)\s+(.+?)(?:\s*\/\*.*)?$/gm;
  let match;
  while ((match = definePattern.exec(content)) !== null) {
    let name = match[1];
    let value = match[2].trim();

    // Clean up value - remove trailing spaces before comments
    value = value.replace(/\s+\/\*.*$/, '').trim();

    // Skip macros with parameters
    if (name.includes('(') || value.includes('#')) {
      continue;
    }

    // Clean up the value
    value = value.replace(/\/\*.*?\*\//g, '').trim();
    value = value.replace(/\/\/.*$/, '').trim();

    // Skip if value contains complex expressions we can't handle
    if (value.includes('?') || value.includes(':') || value.includes('sizeof')) {
      continue;
    }

    // Keep original FFmpeg names - don't add AV_ prefix
    // The low-level API should be a 1:1 mapping to FFmpeg

    constants.push({ name, value, type: 'define' });
  }

  return constants;
};

// Parse enum values from a header file
const parseEnums = (headerPath) => {
  if (!existsSync(headerPath)) {
    return {};
  }

  let content = readFileSync(headerPath, 'utf8');

  // FIRST: Remove ALL comments from the entire file content
  // This prevents issues with braces inside comments (like @code{.c})
  content = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* ... */ and /** ... */ comments
    .replace(/\/\/.*$/gm, ''); // Remove // comments

  const enums = {};

  // Find all enum blocks (including typedef enums)
  // Matches both: enum AVFoo { ... } and typedef enum SwsFlags { ... } SwsFlags;
  const enumPattern = /(?:typedef\s+)?enum\s+(\w+)\s*{([^}]+)}(?:\s+\w+)?;?/gs;
  let match;

  while ((match = enumPattern.exec(content)) !== null) {
    const enumName = match[1];
    const enumContent = match[2];

    // Accept enum names starting with AV or Sws (for SwsFlags, SwsDither, etc.)
    if (!enumName.startsWith('AV') && !enumName.startsWith('Sws')) {
      continue;
    }

    const values = [];

    // Split enum content into lines (comments already removed from file content)
    const lines = enumContent.split(/[,\n]/);
    let currentValue = enumName === 'AVMediaType' ? -1 : 0;
    let isFirstValue = true;

    for (const line of lines) {
      // Skip empty lines
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      // Match enum values (including AVCOL_*, AVDISCARD_*, AVCHROMA_LOC_*, FF_SUB_CHARENC_MODE_*, SWS_*)
      const valueMatch = cleanLine.match(
        /^\s*(AV_[A-Z0-9_]+|AVMEDIA_[A-Z0-9_]+|AVCOL_[A-Z0-9_]+|AVDISCARD_[A-Z0-9_]+|FF_LEVEL_[A-Z0-9_]+|AVCHROMA_LOC_[A-Z0-9_]+|FF_SUB_CHARENC_MODE_[A-Z0-9_]+|SWS_[A-Z0-9_]+|SWR_[A-Z0-9_]+)\s*(?:=\s*(.+?))?$/,
      );
      if (valueMatch) {
        let name = valueMatch[1];

        // Keep original FFmpeg names - don't add AV_ prefix
        // The low-level API should be a 1:1 mapping to FFmpeg

        if (valueMatch[2]) {
          // Has explicit value
          const explicitValue = valueMatch[2].trim();

          // Try to evaluate simple expressions
          if (/^-?\d+$/.test(explicitValue)) {
            currentValue = parseInt(explicitValue);
          } else if (/^0x[0-9a-fA-F]+$/.test(explicitValue)) {
            currentValue = parseInt(explicitValue, 16);
          } else if (/^\d+\s*<<\s*\d+$/.test(explicitValue)) {
            const [base, shift] = explicitValue.split('<<').map((s) => parseInt(s.trim()));
            currentValue = base << shift;
          } else if (/^\d+U?\s*<<\s*\d+$/.test(explicitValue)) {
            const [base, shift] = explicitValue
              .replace('U', '')
              .split('<<')
              .map((s) => parseInt(s.trim()));
            currentValue = base << shift;
          } else {
            // Can't evaluate, skip this enum
            continue;
          }
          isFirstValue = false;
        } else {
          // Auto-increment only if not the first value
          if (!isFirstValue) {
            currentValue++;
          }
          isFirstValue = false;
        }

        // Skip _NB (boundary markers)
        if (name.endsWith('HWDEVICE_TYPE_NB')) {
          continue;
        }

        values.push({ name, value: currentValue });
      }
    }

    if (values.length > 0) {
      enums[enumName] = values;
    }
  }

  // ADDITIONAL: Parse unnamed enums (like AV_BUFFERSRC_FLAG_* in buffersrc.h)
  // Pattern: enum { AV_SOMETHING = value, ... };
  const unnamedEnumPattern = /enum\s*{\s*([^}]+)}\s*;/gs;
  while ((match = unnamedEnumPattern.exec(content)) !== null) {
    const enumContent = match[1];

    // Split enum content into lines
    const lines = enumContent.split(/[,\n]/);
    let currentValue = 0;

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      // Match enum values starting with AV_
      const valueMatch = cleanLine.match(/^\s*(AV_[A-Z0-9_]+)\s*(?:=\s*(.+?))?$/);

      if (valueMatch) {
        const name = valueMatch[1];

        if (valueMatch[2]) {
          // Has explicit value
          const explicitValue = valueMatch[2].trim();

          if (/^-?\d+$/.test(explicitValue)) {
            currentValue = parseInt(explicitValue);
          } else if (/^0x[0-9a-fA-F]+$/.test(explicitValue)) {
            currentValue = parseInt(explicitValue, 16);
          }
        }

        // Find a matching enum name based on the constant prefix
        // e.g., AV_BUFFERSRC_FLAG_* -> AVBufferSrcFlag
        let enumName = null;

        if (name.startsWith('AV_BUFFERSRC_FLAG_')) {
          enumName = 'AVBufferSrcFlag';
        }
        // Add more patterns here if needed

        if (enumName) {
          if (!enums[enumName]) {
            enums[enumName] = [];
          }
          enums[enumName].push({ name, value: currentValue, type: 'number' });
        }

        currentValue++;
      }
    }
  }

  // Manually add AV_BUFFERSRC_FLAG_NONE (doesn't exist in FFmpeg, but we want it as default = 0)
  if (enums['AVBufferSrcFlag']) {
    // Check if NONE doesn't already exist
    const hasNone = enums['AVBufferSrcFlag'].some((v) => v.name === 'AV_BUFFERSRC_FLAG_NONE');
    if (!hasNone) {
      enums['AVBufferSrcFlag'].unshift({ name: 'AV_BUFFERSRC_FLAG_NONE', value: 0, type: 'number' });
    }
  }

  return enums;
};

// Scan all FFmpeg headers
const scanAllHeaders = () => {
  const libraries = ['libavcodec', 'libavformat', 'libavutil', 'libavfilter', 'libswscale', 'libswresample'];
  const allConstants = new Map();
  const allEnums = new Map();

  for (const lib of libraries) {
    const libPath = join(FFMPEG_PATH, lib);
    if (!existsSync(libPath)) {
      continue;
    }

    const headers = readdirSync(libPath).filter((f) => f.endsWith('.h'));

    for (const header of headers) {
      const headerPath = join(libPath, header);

      // Parse constants
      const constants = parseConstants(headerPath);
      for (const constant of constants) {
        if (!allConstants.has(constant.name)) {
          allConstants.set(constant.name, { ...constant, source: `${lib}/${header}` });
        }
      }

      // Parse enums
      const enums = parseEnums(headerPath);
      for (const [enumName, values] of Object.entries(enums)) {
        if (!allEnums.has(enumName)) {
          allEnums.set(enumName, { values, source: `${lib}/${header}` });
        }
      }
    }
  }

  return { constants: allConstants, enums: allEnums };
};

// Group constants by prefix for better organization
const groupConstantsByPrefix = (constants) => {
  const groups = new Map();

  for (const [name, info] of constants) {
    // Skip certain patterns
    if (name.endsWith('_NE') || name === 'AV_NB' || name === 'AV_HWDEVICE_TYPE_NB' || name.includes('(')) {
      continue;
    }

    // Extract prefix (e.g., AV_LOG_, AV_CODEC_FLAG_, etc.)
    const parts = name.split('_');
    let prefix = '';

    // Special prefix patterns that need manual mapping
    const specialPrefixes = [
      // Multi-level prefixes (check these first)
      ['AV_CODEC_FLAG2_', 'AV_CODEC_FLAG2'],
      ['AV_CODEC_FLAG_', 'AV_CODEC_FLAG'],
      ['AV_CODEC_HW_CONFIG_METHOD_', 'AV_CODEC_HW_CONFIG_METHOD'],
      ['AV_GET_ENCODE_BUFFER_FLAG_', 'AV_GET_ENCODE_BUFFER_FLAG'],
      ['AV_FRAME_SIDE_DATA_FLAG_', 'AV_FRAME_SIDE_DATA_FLAG'],
      ['AV_FRAME_FILENAME_FLAGS_', 'AV_FRAME_FILENAME_FLAGS'],
      ['AVFILTER_CMD_FLAG_', 'AVFILTER_CMD_FLAG'],
      ['AV_OPT_SERIALIZE_', 'AV_OPT_SERIALIZE'],
      ['AV_OPT_SEARCH_', 'AV_OPT_SEARCH'],
      ['AV_OPT_ALLOW_', 'AV_OPT_SEARCH'],
      ['AV_OPT_ARRAY_', 'AV_OPT_SEARCH'],
      ['AV_OPT_MULTI_', 'AV_OPT_SEARCH'],
      ['AVSTREAM_EVENT_FLAG_', 'AVSTREAM_EVENT_FLAG'],
      ['AVSEEK_FLAG_', 'AVSEEK_FLAG'],
      ['AVFMT_FLAG_', 'AVFMT_FLAG'],
      ['AVIO_FLAG_', 'AVIO_FLAG'],
      ['AVFILTER_FLAG_', 'AVFILTER_FLAG'],
      ['AV_PROFILE_', 'AV_PROFILE'],
      ['AV_DICT_', 'AV_DICT'],
      ['AV_DISPOSITION_', 'AV_DISPOSITION'],
      ['AV_LZO_', 'AV_LZO'],
      ['AV_LOG_', 'AV_LOG'],
      ['AV_EF_', 'AV_EF'],
      ['AV_UTF8_FLAG_', 'AV_UTF8_FLAG'],
      ['AV_GET_BUFFER_FLAG_', 'AV_GET_BUFFER_FLAG'],
      // Thread type flags
      ['FF_THREAD_', 'FF_THREAD'],
    ];

    // Special exact matches
    const exactMatches = {
      AV_HWACCEL_CODEC_CAP_EXPERIMENTAL: 'AV_HWACCEL_CAP',
      AVSEEK_FORCE: 'AVSEEK_FLAG',
      AV_TIME_BASE: 'AV_TIME_BASE',
      AV_AAC_ADTS_HEADER_SIZE: 'AV_AAC_ADTS',
      AV_LEVEL_UNKNOWN: 'AV_LEVEL',
    };

    // Check exact matches first
    if (exactMatches[name]) {
      prefix = exactMatches[name];
    } else {
      // Check special multi-level prefixes
      let found = false;
      for (const [pattern, group] of specialPrefixes) {
        if (name.startsWith(pattern)) {
          prefix = group;
          found = true;
          break;
        }
      }

      if (!found && parts.length >= 2) {
        // Try to auto-detect prefix based on pattern
        // For constants like AVERROR_, AVFMT_, AVIO_, SWS_, SWR_ etc.
        if (name.match(/^(AVERROR|AVFMT|AVSTREAM|AVIO|AVFILTER|AVSEEK|SWS|SWR)_/)) {
          prefix = parts[0];
        } else if (name.startsWith('FF_THREAD_')) {
          // Special case: FF_THREAD needs both parts
          prefix = 'FF_THREAD';
        } else if (name.startsWith('AV_')) {
          // For AV_ prefixed constants, try first 2-3 parts

          // Try 3 parts first (e.g., AV_CODEC_FLAG)
          if (parts.length >= 3) {
            const threePartPrefix = parts.slice(0, 3).join('_');
            // Check if this is a known pattern
            if (name.startsWith(threePartPrefix + '_')) {
              prefix = threePartPrefix;
            } else {
              // Fall back to 2 parts (e.g., AV_LOG)
              prefix = parts.slice(0, 2).join('_');
            }
          } else {
            prefix = parts.slice(0, 2).join('_');
          }
        }
      }
    }

    if (!prefix) {
      prefix = 'OTHER';
    }

    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix).push({ name, ...info });
  }

  // Log groups for debugging (optional - set DEBUG=1 to see)
  if (process.env.DEBUG) {
    console.log('Constant Groups:');
    for (const [prefix, items] of groups) {
      console.log(`  ${prefix}: ${items.length} constants`);
    }
  }

  return groups;
};

// Generate TypeScript output with branded types
const generateTypeScript = () => {
  const { constants, enums } = scanAllHeaders();

  // Log enums for debugging (optional - set DEBUG=1 to see)
  if (process.env.DEBUG) {
    console.log('\nEnum Types:');
    for (const [enumName, enumData] of enums) {
      console.log(`  ${enumName}: ${enumData.values.length} values`);
    }
  }

  let output = `/**
 * Auto-generated FFmpeg constants
 * Generated from FFmpeg headers
 * DO NOT EDIT MANUALLY
 */

import type { IRational } from '../lib/types.js';

// Brand symbol for type safety
const __ffmpeg_brand = Symbol('__ffmpeg_brand');

export const EOF = undefined; // End of File signal
export type EOFSignal = typeof EOF;

`;

  // Manually add AVMediaType since it's critical and might not parse correctly
  output += '// Media types\n';
  output += "export type AVMediaType = number & { readonly [__ffmpeg_brand]: 'AVMediaType' };\n\n";
  output += 'export const AVMEDIA_TYPE_UNKNOWN = -1 as AVMediaType;\n';
  output += 'export const AVMEDIA_TYPE_VIDEO = 0 as AVMediaType;\n';
  output += 'export const AVMEDIA_TYPE_AUDIO = 1 as AVMediaType;\n';
  output += 'export const AVMEDIA_TYPE_DATA = 2 as AVMediaType;\n';
  output += 'export const AVMEDIA_TYPE_SUBTITLE = 3 as AVMediaType;\n';
  output += 'export const AVMEDIA_TYPE_ATTACHMENT = 4 as AVMediaType;\n';
  output += 'export const AVMEDIA_TYPE_NB = 5 as AVMediaType;\n\n';

  // Add standard seek constants (from stdio.h and avio.h, used with avio_seek)
  output += '// Standard seek whence constants (from stdio.h)\n';
  output += "export type AVSeekWhence = number & { readonly [__ffmpeg_brand]: 'AVSeekWhence' };\n\n";
  output += 'export const AVSEEK_SET = 0 as AVSeekWhence; // Seek from beginning of file\n';
  output += 'export const AVSEEK_CUR = 1 as AVSeekWhence; // Seek from current position\n';
  output += 'export const AVSEEK_END = 2 as AVSeekWhence; // Seek from end of file\n';
  output += 'export const AVSEEK_SIZE = 0x10000 as AVSeekWhence; // Get file size without seeking\n';
  output += '\n';

  // Manually add common "no flags" constants for flag types that need them
  output += '// Common "no flags" constants for APIs that accept 0 as valid flag value\n';
  output +=
    'export const AVFLAG_NONE = 0 as AVSeekFlag & AVIOFlag & AVFilterFlag & AVFilterCmdFlag & AVFilterConstants & AVCodecFlag2 & AVFormatFlag & AVDictFlag & AVOptionSearchFlags & AVPacketFlag & AVCodecFlag & SWSFlag & AVFrameFlag & AVFifoFlag & AVCodecProp;\n';

  // Generate branded types for each enum
  const processedEnums = new Set();
  const processedTypes = new Set(['AVMediaType', 'AVSeekWhence']); // Track all generated types to avoid duplicates

  for (const [enumName, enumData] of enums) {
    if (processedEnums.has(enumName) || enumName === 'AVMediaType') continue;
    processedEnums.add(enumName);

    // Skip if we already have this type
    if (processedTypes.has(enumName)) continue;
    processedTypes.add(enumName);

    // Special handling for AVOptionType - create individual branded types for each value
    if (enumName === 'AVOptionType') {
      output += `// ${enumData.source}\n`;
      output += "export type AVOptionType = number & { readonly [__ffmpeg_brand]: 'AVOptionType' };\n";

      // Create individual branded types for each option type
      const optionTypeMap = {
        AV_OPT_TYPE_FLAGS: 'AVOptionTypeFlags',
        AV_OPT_TYPE_INT: 'AVOptionTypeInt',
        AV_OPT_TYPE_INT64: 'AVOptionTypeInt64',
        AV_OPT_TYPE_DOUBLE: 'AVOptionTypeDouble',
        AV_OPT_TYPE_FLOAT: 'AVOptionTypeFloat',
        AV_OPT_TYPE_STRING: 'AVOptionTypeString',
        AV_OPT_TYPE_RATIONAL: 'AVOptionTypeRational',
        AV_OPT_TYPE_BINARY: 'AVOptionTypeBinary',
        AV_OPT_TYPE_DICT: 'AVOptionTypeDict',
        AV_OPT_TYPE_UINT64: 'AVOptionTypeUint64',
        AV_OPT_TYPE_CONST: 'AVOptionTypeConst',
        AV_OPT_TYPE_IMAGE_SIZE: 'AVOptionTypeImageSize',
        AV_OPT_TYPE_PIXEL_FMT: 'AVOptionTypePixelFmt',
        AV_OPT_TYPE_SAMPLE_FMT: 'AVOptionTypeSampleFmt',
        AV_OPT_TYPE_VIDEO_RATE: 'AVOptionTypeVideoRate',
        AV_OPT_TYPE_DURATION: 'AVOptionTypeDuration',
        AV_OPT_TYPE_COLOR: 'AVOptionTypeColor',
        AV_OPT_TYPE_BOOL: 'AVOptionTypeBool',
        AV_OPT_TYPE_CHLAYOUT: 'AVOptionTypeChLayout',
        AV_OPT_TYPE_UINT: 'AVOptionTypeUint',
      };

      // Generate individual branded types
      for (const [constName, typeName] of Object.entries(optionTypeMap)) {
        output += `export type ${typeName} = AVOptionType & { readonly __optType: '${constName}' };\n`;
      }

      // Special type for binary int arrays (like pix_fmts)
      output += "export type AVOptionTypeBinaryIntArray = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_BINARY_INT_ARRAY' };\n";
      output += '\n';

      // Export constants with individual brands
      for (const { name, value } of enumData.values) {
        const individualType = optionTypeMap[name];
        if (individualType) {
          output += `export const ${name} = ${value} as ${individualType};\n`;
        } else {
          // Fallback for any option types we might have missed
          output += `export const ${name} = ${value} as AVOptionType;\n`;
        }
      }

      // Add special constant for binary int arrays (same value as BINARY but different type)
      output += 'export const AV_OPT_TYPE_BINARY_INT_ARRAY = 25 as AVOptionTypeBinaryIntArray; // For int arrays like pix_fmts\n';
      output += '\n';
    } else {
      // Normal enum handling
      output += `// ${enumData.source}\n`;
      output += `export type ${enumName} = number & { readonly [__ffmpeg_brand]: '${enumName}' };\n\n`;

      // Export constants
      for (const { name, value } of enumData.values) {
        // Skip duplicates and platform-specific variations
        // if (name.includes('_NE') || name === 'NB') {
        //   continue;
        // }
        output += `export const ${name} = ${value} as ${enumName};\n`;
      }
      output += '\n';
    }
  }

  // Group and generate constants
  const groups = groupConstantsByPrefix(constants);

  // Generate branded types for constant groups
  const brandedTypes = new Map([
    // Core codec flags
    ['AV_CODEC_FLAG', 'AVCodecFlag'],
    ['AV_CODEC_FLAG2', 'AVCodecFlag2'],
    ['AV_CODEC_CAP', 'AVCodecCap'],
    ['AV_CODEC_PROP', 'AVCodecProp'],
    ['AV_CODEC_EXPORT', 'AVCodecExport'],
    ['AV_CODEC_ID', 'AVCodecIDConstants'],

    // Packet/Frame flags
    ['AV_PKT_FLAG', 'AVPacketFlag'],
    ['AV_FRAME_FLAG', 'AVFrameFlag'],

    // Stream/Format with original FFmpeg names
    ['AV_DISPOSITION', 'AVDisposition'],
    ['AVSEEK_FLAG', 'AVSeekFlag'],
    ['AVFMT_FLAG', 'AVFormatFlag'],
    ['AVFMT', 'AVFormatConstants'],
    ['AVSTREAM_EVENT_FLAG', 'AVStreamEventFlag'],
    ['AVSTREAM', 'AVStreamConstants'],
    ['AVIO_FLAG', 'AVIOFlag'],
    ['AVIO', 'AVIOConstants'],
    ['AV_PARSER_PTS', 'AVParserPts'],

    // Audio/Video
    ['AV_CH', 'AVChannel'],
    ['AV_CHANNEL_LAYOUT', 'AVChannelLayout'],
    ['AV_SAMPLE_FMT', 'AVSampleFormatConstants'],
    ['AV_PIX_FMT', 'AVPixelFormatConstants'],
    ['AV_FIELD', 'AVFieldOrder'],
    ['AVCOLORSPACE', 'AVColorSpace'],

    // Profiles
    ['AV_PROFILE', 'AVProfile'],

    // Options
    ['AV_OPT_FLAG', 'AVOptionFlag'],
    ['AV_OPT_SERIALIZE', 'AVOptionSerialize'],
    ['AV_OPT_SEARCH', 'AVOptionSearchFlags'],

    // Hardware acceleration
    ['AV_HWACCEL_FLAG', 'AVHWAccelFlag'],
    ['AV_HWACCEL_CAP', 'AVHWAccelCap'],
    ['AV_CODEC_HW_CONFIG_METHOD', 'AVCodecHWConfigMethod'],

    // Utility
    ['AV_LOG', 'AVLogLevel'],
    ['AV_CPU_FLAG', 'AVCpuFlag'],
    ['AV_DICT', 'AVDictFlag'],
    ['AV_ESCAPE_FLAG', 'AVEscapeFlag'],
    ['AV_BPRINT_SIZE', 'AVBPrintSize'],
    ['AV_TIME_BASE', 'AVTimeBase'],

    // Errors with original FFmpeg name
    ['AVERROR', 'AVError'],

    // Error resilience
    ['AV_EF', 'AVErrorFlags'],

    // Filter flags with original names
    ['AVFILTER_FLAG', 'AVFilterFlag'],
    ['AVFILTER_CMD_FLAG', 'AVFilterCmdFlag'],
    ['AVFILTER_THREAD', 'AVFilterConstants'],
    ['AVFILTER_FLAG', 'AVFilterFlag'],
    ['AVFILTER', 'AVFilterConstants'],

    // Buffer flags
    ['AV_BUFFERSINK_FLAG', 'AVBufferSinkFlag'],
    ['AV_BUFFER_FLAG', 'AVBufferFlag'],
    ['AV_GET_BUFFER_FLAG', 'AVGetBufferFlag'],
    ['AV_GET_ENCODE_BUFFER_FLAG', 'AVGetEncodeBufferFlag'],
    ['AV_INPUT_BUFFER', 'AVInputBuffer'],

    // Frame flags
    ['AV_FRAME_SIDE_DATA_FLAG', 'AVFrameSideDataFlag'],
    ['AV_FRAME_FILENAME_FLAGS', 'AVFrameFilenameFlags'],

    // CUDA flags
    ['AV_CUDA_USE', 'AVCudaContextFlags'],

    // 3D/Stereo flags
    ['AV_STEREO3D_FLAG', 'AVStereo3DFlag'],

    // IAMF flags
    ['AV_IAMF_LAYER_FLAG', 'AVIAMFLayerFlag'],

    // FIFO flags
    ['AV_FIFO_FLAG', 'AVFifoFlag'],

    // LZO constants
    ['AV_LZO', 'AVLZOResult'],

    // Stream init
    ['AVSTREAM_INIT', 'AVStreamInitIn'],

    // Subtitle
    ['AV_SUBTITLE_FLAG', 'AVSubtitleFlag'],

    // PTS wrapping
    ['AV_PTS_WRAP', 'AVPTSWrap'],

    // Platform features
    ['AV_HAVE', 'AVHave'],
    ['AV_UTF', 'AVUTF'],
    ['AV_UTF8_FLAG', 'AVUTF8Flag'],

    // Other constants
    ['AV_AAC_ADTS', 'AVAACConstants'],
    ['AV_LEVEL', 'AVLevelConstants'],

    // Software scale/resample with original names
    ['SWS', 'SWSFlag'],
    ['SWR', 'SWRFlag'],

    // Thread type flags
    ['FF_THREAD', 'AVThreadType'],
  ]);

  // Generate constants by group
  for (const [prefix, typeName] of brandedTypes) {
    // Skip AVERROR group - it's handled specially later
    if (prefix === 'AVERROR') continue;

    const groupConstants = groups.get(prefix);
    if (!groupConstants || groupConstants.length === 0) continue;

    // Skip if we already have this type
    if (processedTypes.has(typeName)) continue;
    processedTypes.add(typeName);

    // Get source files for documentation
    const sources = [...new Set(groupConstants.map((c) => c.source))];
    const sourceComment = sources.length > 0 ? ` (from ${sources.slice(0, 3).join(', ')}${sources.length > 3 ? '...' : ''})` : '';

    output += `// ${prefix} constants${sourceComment}\n`;
    output += `export type ${typeName} = number & { readonly [__ffmpeg_brand]: '${typeName}' };\n\n`;

    for (const constant of groupConstants) {
      // Try to evaluate the value
      let value = constant.value;
      let evaluatedValue = null;

      if (/^-?\d+$/.test(value)) {
        evaluatedValue = value;
      } else if (/^0x[0-9a-fA-F]+$/.test(value)) {
        evaluatedValue = parseInt(value, 16);
      } else if (/^\(?\s*1U?\s*<<\s*\d+\s*\)?$/.test(value)) {
        const matches = value.match(/<<\s*(\d+)/);
        if (matches) {
          const shift = parseInt(matches[1]);
          const result = 1 << shift;
          // Handle negative values for bit 31
          if (result < 0) {
            evaluatedValue = String(result >>> 0); // Convert to unsigned 32-bit
          } else {
            evaluatedValue = `0x${result.toString(16)}`;
          }
        }
      } else if (/^\(?\s*\d+U?\s*<<\s*\d+\s*\)?$/.test(value)) {
        const matches = value.match(/(\d+)U?\s*<<\s*(\d+)/);
        if (matches) {
          const base = parseInt(matches[1]);
          const shift = parseInt(matches[2]);
          const result = base << shift;
          // Handle negative values for bit 31
          if (result < 0) {
            evaluatedValue = String(result >>> 0); // Convert to unsigned 32-bit
          } else {
            evaluatedValue = `0x${result.toString(16)}`;
          }
        }
      }

      if (evaluatedValue !== null) {
        // Skip NONE constants that we manually added earlier
        if (constant.name.endsWith('_NONE') && evaluatedValue === '0') {
          continue;
        }
        output += `export const ${constant.name} = ${evaluatedValue} as ${typeName};\n`;
      }
    }
    output += '\n';
  }

  // OTHER constants will be handled later at the end

  // Generate remaining ungrouped constants if any
  const ungroupedConstants = groups.get('OTHER');
  if (ungroupedConstants && ungroupedConstants.length > 0) {
    output += `// Other constants (ungrouped) - ${ungroupedConstants.length} constants\n`;
    output += "// These are miscellaneous constants that don't fit into a specific category\n";
    for (const constant of ungroupedConstants) {
      // Try to evaluate the value
      let value = constant.value;
      let evaluatedValue = null;

      if (/^-?\d+$/.test(value)) {
        evaluatedValue = value;
      } else if (/^0x[0-9a-fA-F]+$/.test(value)) {
        evaluatedValue = parseInt(value, 16);
      } else if (/^\(?\s*1U?\s*<<\s*\d+\s*\)?$/.test(value)) {
        const matches = value.match(/<<\s*(\d+)/);
        if (matches) {
          const shift = parseInt(matches[1]);
          const result = 1 << shift;
          if (result < 0) {
            evaluatedValue = String(result >>> 0);
          } else {
            evaluatedValue = `0x${result.toString(16)}`;
          }
        }
      }

      if (evaluatedValue !== null) {
        output += `export const ${constant.name} = ${evaluatedValue};\n`;
      }
    }
    output += '\n';
  }

  // Add hardware configuration method constants
  // These are defined as anonymous enum values in codec.h
  if (!processedTypes.has('AVCodecHWConfigMethod')) {
    output += '// ============================================================================\n';
    output += '// AV_CODEC_HW_CONFIG_METHOD - Hardware configuration methods\n';
    output += '// ============================================================================\n\n';
    output += 'export const AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX = 0x01;\n';
    output += 'export const AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX = 0x02;\n';
    output += 'export const AV_CODEC_HW_CONFIG_METHOD_INTERNAL = 0x04;\n';
    output += 'export const AV_CODEC_HW_CONFIG_METHOD_AD_HOC = 0x08;\n';
    output += '\n';
    processedTypes.add('AVCodecHWConfigMethod');
  }

  // Extract and process AVERROR constants from error.h and grouped constants
  if (!processedTypes.has('AVError')) {
    const errorConstants = [];

    // First, get all AVERROR constants from the grouped constants
    const averrorGroup = groups.get('AVERROR');
    if (averrorGroup) {
      for (const constant of averrorGroup) {
        // Try to parse the value - most AVERROR constants are complex macros
        // We'll handle them specially below
        if (constant.name.startsWith('AVERROR_')) {
          // These will be handled by the special error parsing below
          continue;
        }
      }
    }

    const errorFile = join(FFMPEG_PATH, 'libavutil', 'error.h');

    if (existsSync(errorFile)) {
      const errorContent = readFileSync(errorFile, 'utf8');

      // Parse FFERRTAG macro calls
      const fferrtagPattern = /#define\s+(AVERROR_\w+)\s+FFERRTAG\s*\(([^)]+)\)/gm;
      let match;
      while ((match = fferrtagPattern.exec(errorContent)) !== null) {
        const name = match[1]; // Keep original AVERROR_ prefix
        const args = match[2].split(',').map((a) => a.trim().replace(/'/g, ''));

        // MKTAG(a,b,c,d) = (a) | ((b) << 8) | ((c) << 16) | ((d) << 24)
        // FFERRTAG = -(int)MKTAG
        let a, b, c, d;
        if (args[0].startsWith('0x')) {
          a = parseInt(args[0], 16);
        } else if (args[0].match(/^\d+$/)) {
          a = parseInt(args[0]);
        } else {
          a = args[0].charCodeAt(0);
        }

        // Handle character literals and special chars
        b = args[1] === ' ' ? 32 : args[1].charCodeAt(0);
        c = args[2] === ' ' ? 32 : args[2].charCodeAt(0);
        d = args[3] === ' ' ? 32 : args[3] === '!' ? 33 : args[3].charCodeAt(0);

        const mktag = (a | (b << 8) | (c << 16) | (d << 24)) >>> 0;
        const fferrtag = -(mktag | 0); // Convert to signed 32-bit then negate
        errorConstants.push({ name, value: fferrtag });
      }

      // Parse direct hex error values
      const hexPattern = /#define\s+(AVERROR_\w+)\s+\((-0x[0-9a-fA-F]+)\)/gm;
      while ((match = hexPattern.exec(errorContent)) !== null) {
        const name = match[1]; // Keep original AVERROR_ prefix
        const value = parseInt(match[2]);
        errorConstants.push({ name, value });
      }
    }

    // Generate error constants
    output += '// Error codes\n';
    output += "export type AVError = number & { readonly [__ffmpeg_brand]: 'AVError' };\n\n";
    for (const error of errorConstants) {
      output += `export const ${error.name} = ${error.value} as AVError;\n`;
    }
    output += '\n';
    processedTypes.add('AVError');
  }

  // Re-export errors from low level api
  output += '// Re-exported FFmpeg errors\n';
  output +=
    "export { AVERROR_EACCES, AVERROR_EAGAIN, AVERROR_EBUSY, AVERROR_EEXIST, AVERROR_EINVAL, AVERROR_EIO, AVERROR_EISDIR, AVERROR_EMFILE, AVERROR_ENODEV, AVERROR_ENOENT, AVERROR_ENOMEM, AVERROR_ENOSPC, AVERROR_ENOTDIR, AVERROR_EPERM, AVERROR_EPIPE, AVERROR_ERANGE } from '../lib/error.js';\n\n";

  // Add special time constants
  output += '// Special time constants\n';
  output += 'export const AV_TIME_BASE_Q: IRational = { num: 1, den: AV_TIME_BASE };\n';
  output += 'export const AV_NOPTS_VALUE = -9223372036854775808n; // INT64_MIN\n\n';

  // Add integer limit constants (from C's stdint.h/limits.h)
  output += '// Integer limit constants (from C stdint.h/limits.h)\n';
  output += '// These are platform-independent fixed values for standard integer types\n';
  output += 'export const INT8_MIN = -128;                      // -(2^7)\n';
  output += 'export const INT8_MAX = 127;                       // 2^7 - 1\n';
  output += 'export const UINT8_MAX = 255;                      // 2^8 - 1\n';
  output += 'export const INT16_MIN = -32768;                   // -(2^15)\n';
  output += 'export const INT16_MAX = 32767;                    // 2^15 - 1\n';
  output += 'export const UINT16_MAX = 65535;                   // 2^16 - 1\n';
  output += 'export const INT32_MIN = -2147483648;              // -(2^31)\n';
  output += 'export const INT32_MAX = 2147483647;               // 2^31 - 1\n';
  output += 'export const UINT32_MAX = 4294967295;              // 2^32 - 1\n';
  output += 'export const INT64_MIN = -9223372036854775808n;    // -(2^63) as BigInt\n';
  output += 'export const INT64_MAX = 9223372036854775807n;     // 2^63 - 1 as BigInt\n';
  output += 'export const UINT64_MAX = 18446744073709551615n;   // 2^64 - 1 as BigInt\n';
  output += '\n';
  output += '// Legacy C type limits (these map to the above based on typical platform sizes)\n';
  output += 'export const INT_MIN = INT32_MIN;                  // Typically 32-bit on modern systems\n';
  output += 'export const INT_MAX = INT32_MAX;                  // Typically 32-bit on modern systems\n';
  output += 'export const UINT_MAX = UINT32_MAX;                // Typically 32-bit on modern systems\n';
  output += 'export const LONG_MIN = INT64_MIN;                 // 64-bit on 64-bit systems, 32-bit on 32-bit systems\n';
  output += 'export const LONG_MAX = INT64_MAX;                 // 64-bit on 64-bit systems, 32-bit on 32-bit systems\n';
  output += 'export const ULONG_MAX = UINT64_MAX;               // 64-bit on 64-bit systems, 32-bit on 32-bit systems\n';
  output += '\n';

  // Export convenience function for creating branded values
  output += '// Helper function to cast numbers to branded types\n';
  output += 'export function cast<T>(value: number): T {\n';
  output += '  return value as T;\n';
  output += '}\n';

  return output;
};

// Main
const main = () => {
  console.log('Scanning all FFmpeg headers...');
  const output = generateTypeScript();
  const outputPath = join(__dirname, '..', 'src', 'constants', 'constants.ts');

  // Create directory if it doesn't exist
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(outputPath, output);
  console.log(`Generated constants at: ${outputPath}`);

  // Show summary
  const lines = output.split('\n').length;
  const constants = (output.match(/export const/g) || []).length;
  const types = (output.match(/export type/g) || []).length;

  console.log('\n=== Generation Summary ===');
  console.log(`Generated: ${lines} lines, ${constants} constants, ${types} branded types`);
  console.log('Note: Enums like AVPixelFormat are processed separately from #define constants');
};

main();
