/**
 * Benchmark Runner
 *
 * Core class for running benchmarks and collecting results.
 * Supports both FFmpeg CLI and node-av implementations.
 */

import { existsSync, unlinkSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { measureFFmpegCLI } from './utils/ffmpeg-cli.js';
import { aggregateResults, measure } from './utils/measure.js';

import type { FFmpegRunOptions } from './utils/ffmpeg-cli.js';
import type { AggregatedResult, MeasureResult } from './utils/measure.js';

/**
 * Configuration for a benchmark test case
 */
export interface BenchmarkConfig {
  /** Name of the benchmark */
  name: string;
  /** Description of what this benchmark tests */
  description: string;
  /** Category: transcode, memory, or latency */
  category: 'transcode' | 'memory' | 'latency';
  /** Number of iterations to run */
  iterations: number;
  /** Number of warmup iterations (not counted in results) */
  warmupIterations: number;
  /** Input file path */
  inputFile: string;
  /** Output file path (will be deleted after each run) */
  outputFile: string;
}

/**
 * Result of a benchmark comparison between FFmpeg CLI and node-av
 */
export interface BenchmarkComparison {
  config: BenchmarkConfig;
  ffmpegCLI: AggregatedResult;
  nodeAV: AggregatedResult;
  /** Difference metrics */
  comparison: {
    /** Duration difference (positive means node-av is slower) */
    durationDiffPercent: number;
    /** Memory difference (positive means node-av uses more memory) */
    memoryDiffPercent: number;
    /** FPS difference (positive means node-av is faster) */
    fpsDiffPercent?: number;
  };
}

/**
 * Callback type for node-av benchmark function
 */
export type NodeAVBenchmarkFn = () => Promise<{ framesProcessed?: number }>;

/**
 * Runner for executing and comparing benchmarks
 */
export class BenchmarkRunner {
  private results: BenchmarkComparison[] = [];

  /**
   * Run a single iteration and measure results
   */
  private async runSingleIteration(
    config: BenchmarkConfig,
    ffmpegOptions: FFmpegRunOptions,
    nodeAVFn: NodeAVBenchmarkFn,
  ): Promise<{ ffmpeg: MeasureResult; nodeAV: MeasureResult }> {
    // Ensure output directory exists
    const outputDir = dirname(config.outputFile);
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Run FFmpeg CLI
    const ffmpegResult = await measureFFmpegCLI(ffmpegOptions);

    // Clean up output file
    if (existsSync(config.outputFile)) {
      unlinkSync(config.outputFile);
    }

    // Run node-av
    const nodeAVResult = await measure(nodeAVFn);

    // Clean up output file
    if (existsSync(config.outputFile)) {
      unlinkSync(config.outputFile);
    }

    return { ffmpeg: ffmpegResult, nodeAV: nodeAVResult };
  }

  /**
   * Run a complete benchmark with warmup and multiple iterations
   */
  async runBenchmark(config: BenchmarkConfig, ffmpegOptions: FFmpegRunOptions, nodeAVFn: NodeAVBenchmarkFn): Promise<BenchmarkComparison> {
    console.log(`\n📊 Running benchmark: ${config.name}`);
    console.log(`   ${config.description}`);
    console.log(`   Iterations: ${config.iterations} (+ ${config.warmupIterations} warmup)\n`);

    const ffmpegResults: MeasureResult[] = [];
    const nodeAVResults: MeasureResult[] = [];

    // Warmup iterations
    for (let i = 0; i < config.warmupIterations; i++) {
      process.stdout.write(`   Warmup ${i + 1}/${config.warmupIterations}...\r`);
      await this.runSingleIteration(config, ffmpegOptions, nodeAVFn);
      // GC between iterations to prevent memory accumulation
      if (global.gc) {
        global.gc();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Actual benchmark iterations
    for (let i = 0; i < config.iterations; i++) {
      process.stdout.write(`   Iteration ${i + 1}/${config.iterations}...\r`);
      const { ffmpeg, nodeAV } = await this.runSingleIteration(config, ffmpegOptions, nodeAVFn);
      ffmpegResults.push(ffmpeg);
      nodeAVResults.push(nodeAV);
      // GC between iterations to prevent memory accumulation
      if (global.gc) {
        global.gc();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(''); // New line after progress

    // Aggregate results
    const ffmpegAggregated = aggregateResults(ffmpegResults);
    const nodeAVAggregated = aggregateResults(nodeAVResults);

    // Calculate comparison metrics
    const durationDiffPercent = this.percentDiff(ffmpegAggregated.durationMs.mean, nodeAVAggregated.durationMs.mean);

    const memoryDiffPercent =
      ffmpegAggregated.peakMemoryBytes.mean > 0 ? this.percentDiff(ffmpegAggregated.peakMemoryBytes.mean, nodeAVAggregated.peakMemoryBytes.mean) : 0;

    const fpsDiffPercent = ffmpegAggregated.fps && nodeAVAggregated.fps ? this.percentDiff(ffmpegAggregated.fps.mean, nodeAVAggregated.fps.mean) : undefined;

    const result: BenchmarkComparison = {
      config,
      ffmpegCLI: ffmpegAggregated,
      nodeAV: nodeAVAggregated,
      comparison: {
        durationDiffPercent,
        memoryDiffPercent,
        fpsDiffPercent,
      },
    };

    this.results.push(result);

    // Print summary
    this.printBenchmarkSummary(result);

    return result;
  }

  /**
   * Calculate percentage difference
   */
  private percentDiff(baseline: number, comparison: number): number {
    if (baseline === 0) return 0;
    return ((comparison - baseline) / baseline) * 100;
  }

  /**
   * Print summary of a single benchmark result
   */
  private printBenchmarkSummary(result: BenchmarkComparison): void {
    const { ffmpegCLI, nodeAV, comparison } = result;

    console.log('   Results:');
    console.log('   ┌──────────────────┬──────────────────┬──────────────────┐');
    console.log('   │ Metric           │ FFmpeg CLI       │ node-av          │');
    console.log('   ├──────────────────┼──────────────────┼──────────────────┤');

    const durationStr = `${ffmpegCLI.durationMs.mean.toFixed(0)}ms`;
    const nodeAVDurationStr = `${nodeAV.durationMs.mean.toFixed(0)}ms`;
    console.log(`   │ Duration         │ ${durationStr.padEnd(16)} │ ${nodeAVDurationStr.padEnd(16)} │`);

    if (ffmpegCLI.fps && nodeAV.fps) {
      const fpsStr = `${ffmpegCLI.fps.mean.toFixed(1)} fps`;
      const nodeAVFpsStr = `${nodeAV.fps.mean.toFixed(1)} fps`;
      console.log(`   │ FPS              │ ${fpsStr.padEnd(16)} │ ${nodeAVFpsStr.padEnd(16)} │`);
    }

    const memStr = this.formatBytes(ffmpegCLI.peakMemoryBytes.mean);
    const nodeAVMemStr = this.formatBytes(nodeAV.peakMemoryBytes.mean);
    console.log(`   │ Peak Memory      │ ${memStr.padEnd(16)} │ ${nodeAVMemStr.padEnd(16)} │`);

    console.log('   └──────────────────┴──────────────────┴──────────────────┘');

    const diffSign = comparison.durationDiffPercent > 0 ? '+' : '';
    console.log(`   Difference: ${diffSign}${comparison.durationDiffPercent.toFixed(1)}% duration`);

    if (comparison.fpsDiffPercent !== undefined) {
      const fpsSign = comparison.fpsDiffPercent > 0 ? '+' : '';
      console.log(`              ${fpsSign}${comparison.fpsDiffPercent.toFixed(1)}% FPS`);
    }
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get all collected results
   */
  getResults(): BenchmarkComparison[] {
    return this.results;
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
  }
}

/**
 * Global benchmark runner instance
 */
export const runner = new BenchmarkRunner();
