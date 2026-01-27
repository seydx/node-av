#!/usr/bin/env tsx
/**
 * node-av Benchmark CLI
 *
 * Comprehensive benchmark suite comparing node-av with FFmpeg CLI.
 *
 * Usage:
 *   npm run benchmark              # Run all benchmarks
 *   npm run benchmark -- --help    # Show help
 *   npm run benchmark -- transcode # Run only transcode benchmarks
 *   npm run benchmark -- memory    # Run only memory benchmarks
 *   npm run benchmark -- latency   # Run only latency benchmarks
 *   npm run benchmark -- -i file1.mp4 -i file2.mp4  # Multiple inputs
 */

import { existsSync, readdirSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { measureAllLatencies } from './cases/latency.js';
import { runAllMemoryBenchmarks } from './cases/memory.js';
import { runAllTranscodeBenchmarks } from './cases/transcode.js';
import { runner } from './runner.js';
import { createInputFileInfo, getSystemInfo, saveResultsJSON, writeReport } from './utils/report.js';

import type { BenchmarkReport, InputFileInfo } from './utils/report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default paths
const testDataDir = resolve(__dirname, '../testdata');
const resultsDir = resolve(__dirname, 'results');
const defaultInputFile = join(testDataDir, 'video.mp4');

/**
 * Parse command line arguments
 */
function parseArgs(): { category?: string; inputFiles: string[]; help: boolean; noReport: boolean; iterations?: number; pattern?: string } {
  const args = process.argv.slice(2);
  let category: string | undefined;
  const inputFiles: string[] = [];
  let help = false;
  let noReport = false;
  let iterations: number | undefined;
  let pattern: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--no-report') {
      noReport = true;
    } else if (arg === '--input' || arg === '-i') {
      inputFiles.push(args[++i]);
    } else if (arg === '--pattern' || arg === '-p') {
      pattern = args[++i];
    } else if (arg === '--iterations' || arg === '-n') {
      iterations = parseInt(args[++i], 10);
    } else if (!arg.startsWith('-')) {
      category = arg;
    }
  }

  return { category, inputFiles, help, noReport, iterations, pattern };
}

/**
 * Expand glob pattern to file list
 */
function expandPattern(pattern: string): string[] {
  const dir = dirname(pattern);
  const filePattern = basename(pattern).replace('*', '.*');
  const regex = new RegExp(`^${filePattern}$`);

  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((file) => regex.test(file))
    .map((file) => join(dir, file))
    .sort();
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
node-av Benchmark Suite
========================

Usage:
  npm run benchmark [options] [category]

Categories:
  transcode    Run transcode speed benchmarks
  memory       Run memory usage benchmarks
  latency      Run latency benchmarks
  all          Run all benchmarks (default)

Options:
  -h, --help          Show this help message
  -i, --input FILE    Use custom input file (can be repeated for multiple files)
  -p, --pattern PAT   Use glob pattern to match input files
  -n, --iterations N  Number of iterations per benchmark (default: 5)
  --no-report         Skip generating BENCHMARK.md report

Examples:
  npm run benchmark                              # Run all benchmarks with default input
  npm run benchmark transcode                    # Run only transcode benchmarks
  npm run benchmark -- -i input.mp4              # Use custom input file
  npm run benchmark -- -i h264.mp4 -i hevc.mp4   # Multiple input files
  npm run benchmark -- -p "testdata/bbb-4k-*"    # Match pattern
  npm run benchmark -- -n 10                     # Run 10 iterations
  npm run benchmark -- --no-report               # Skip report generation
`);
}

/**
 * Main benchmark runner
 */
async function main(): Promise<void> {
  const { category, inputFiles, help, noReport, pattern } = parseArgs();

  if (help) {
    printHelp();
    process.exit(0);
  }

  // Resolve input files
  let inputs: string[] = [];

  if (pattern) {
    inputs = expandPattern(pattern);
    if (inputs.length === 0) {
      console.error(`Error: No files matched pattern: ${pattern}`);
      process.exit(1);
    }
  } else if (inputFiles.length > 0) {
    inputs = inputFiles;
  } else {
    inputs = [defaultInputFile];
  }

  // Validate all input files exist
  for (const input of inputs) {
    if (!existsSync(input)) {
      console.error(`Error: Input file not found: ${input}`);
      console.error('Please provide a valid input file with --input or ensure testdata/video.mp4 exists.');
      process.exit(1);
    }
  }

  // Ensure results directory exists
  if (!existsSync(resultsDir)) {
    await mkdir(resultsDir, { recursive: true });
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              node-av Benchmark Suite                          ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Print system info
  console.log('Gathering system information...\n');
  const systemInfo = await getSystemInfo();

  console.log(`System: ${systemInfo.os} ${systemInfo.osVersion} (${systemInfo.arch})`);
  console.log(`CPU: ${systemInfo.cpu} (${systemInfo.cpuCores} cores)`);
  console.log(`RAM: ${systemInfo.ram}`);
  if (systemInfo.gpu) {
    console.log(`GPU: ${systemInfo.gpu}`);
  }
  console.log(`Node.js: ${systemInfo.nodeVersion}`);
  console.log(`FFmpeg: ${systemInfo.ffmpegVersion}`);
  console.log(`node-av: ${systemInfo.nodeAVVersion}`);
  console.log(`Input files: ${inputs.length}`);
  for (const input of inputs) {
    console.log(`  - ${basename(input)}`);
  }

  // Get input file info for all files
  const inputFileInfos: InputFileInfo[] = [];
  for (const input of inputs) {
    const info = await createInputFileInfo(input);
    inputFileInfos.push(info);
    console.log(`\n${basename(input)}:`);
    if (info.duration > 0) {
      console.log(`  Duration: ${info.duration.toFixed(1)}s`);
      if (info.resolution) {
        console.log(`  Resolution: ${info.resolution}`);
      }
      if (info.codec) {
        console.log(`  Codec: ${info.codec}`);
      }
      if (info.fps) {
        console.log(`  FPS: ${info.fps.toFixed(1)}`);
      }
    }
  }

  // Run benchmarks based on category for each input file
  const categoryLower = category?.toLowerCase() ?? 'all';
  let latencyMetrics;

  for (const input of inputs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📁 Benchmarking: ${basename(input)}`);
    console.log('='.repeat(60));

    switch (categoryLower) {
      case 'transcode':
        await runAllTranscodeBenchmarks(input);
        break;
      case 'memory':
        await runAllMemoryBenchmarks(input);
        break;
      case 'latency':
        latencyMetrics = await measureAllLatencies(input, 10);
        break;
      case 'all':
      default:
        await runAllTranscodeBenchmarks(input);
        await runAllMemoryBenchmarks(input);
        // Only measure latency for first file (it's input-independent)
        if (input === inputs[0]) {
          latencyMetrics = await measureAllLatencies(input, 10);
        }
        break;
    }
  }

  // Generate report if not disabled
  if (!noReport) {
    const results = runner.getResults();

    const report: BenchmarkReport = {
      systemInfo,
      inputFileInfos,
      transcodeResults: results.filter((r) => r.config.category === 'transcode'),
      memoryResults: results.filter((r) => r.config.category === 'memory'),
      latencyMetrics,
      timestamp: new Date().toISOString(),
    };

    await writeReport(report);
    saveResultsJSON(report);
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    Benchmarks Complete                        ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// Run main
main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
