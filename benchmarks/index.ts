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
 */

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { measureAllLatencies } from './cases/latency.js';
import { runAllMemoryBenchmarks } from './cases/memory.js';
import { runAllTranscodeBenchmarks } from './cases/transcode.js';
import { runner } from './runner.js';
import { createInputFileInfo, getSystemInfo, saveResultsJSON, writeReport } from './utils/report.js';

import type { BenchmarkReport } from './utils/report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default paths
const testDataDir = resolve(__dirname, '../testdata');
const resultsDir = resolve(__dirname, 'results');
const defaultInputFile = join(testDataDir, 'video.mp4');

/**
 * Parse command line arguments
 */
function parseArgs(): { category?: string; inputFile?: string; help: boolean; noReport: boolean; iterations?: number } {
  const args = process.argv.slice(2);
  let category: string | undefined;
  let inputFile: string | undefined;
  let help = false;
  let noReport = false;
  let iterations: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--no-report') {
      noReport = true;
    } else if (arg === '--input' || arg === '-i') {
      inputFile = args[++i];
    } else if (arg === '--iterations' || arg === '-n') {
      iterations = parseInt(args[++i], 10);
    } else if (!arg.startsWith('-')) {
      category = arg;
    }
  }

  return { category, inputFile, help, noReport, iterations };
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
  -i, --input FILE    Use custom input file (default: testdata/video.mp4)
  -n, --iterations N  Number of iterations per benchmark (default: 5)
  --no-report         Skip generating BENCHMARK.md report

Examples:
  npm run benchmark                     # Run all benchmarks
  npm run benchmark transcode           # Run only transcode benchmarks
  npm run benchmark -- -i input.mp4     # Use custom input file
  npm run benchmark -- -n 10            # Run 10 iterations
  npm run benchmark -- --no-report      # Skip report generation
`);
}

/**
 * Main benchmark runner
 */
async function main(): Promise<void> {
  const { category, inputFile, help, noReport } = parseArgs();

  if (help) {
    printHelp();
    process.exit(0);
  }

  const input = inputFile ?? defaultInputFile;

  // Check input file exists
  if (!existsSync(input)) {
    console.error(`Error: Input file not found: ${input}`);
    console.error('Please provide a valid input file with --input or ensure testdata/video.mp4 exists.');
    process.exit(1);
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
  console.log(`Input: ${input}`);

  // Get input file info
  const inputFileInfo = await createInputFileInfo(input);
  if (inputFileInfo.duration > 0) {
    console.log(`Duration: ${inputFileInfo.duration.toFixed(1)}s`);
    if (inputFileInfo.resolution) {
      console.log(`Resolution: ${inputFileInfo.resolution}`);
    }
    if (inputFileInfo.codec) {
      console.log(`Codec: ${inputFileInfo.codec}`);
    }
    if (inputFileInfo.fps) {
      console.log(`FPS: ${inputFileInfo.fps.toFixed(1)}`);
    }
  }

  // Run benchmarks based on category
  const categoryLower = category?.toLowerCase() ?? 'all';
  let latencyMetrics;

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
      latencyMetrics = await measureAllLatencies(input, 10);
      break;
  }

  // Generate report if not disabled
  if (!noReport) {
    const results = runner.getResults();

    const report: BenchmarkReport = {
      systemInfo,
      inputFileInfo,
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
