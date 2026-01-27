/**
 * Time and Memory Measurement Utilities
 *
 * Provides utilities for measuring execution time, memory usage,
 * and computing statistics for benchmark results.
 */

/**
 * Result of a single benchmark run
 */
export interface MeasureResult {
  /** Duration in milliseconds */
  durationMs: number;
  /** Peak memory usage in bytes */
  peakMemoryBytes: number;
  /** Memory samples taken during execution (bytes) */
  memorySamples: number[];
  /** Frames processed (if applicable) */
  framesProcessed?: number;
  /** FPS calculated from frames and duration */
  fps?: number;
}

/**
 * Statistics computed from multiple runs
 */
export interface Stats {
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  median: number;
}

/**
 * Aggregated benchmark result from multiple iterations
 */
export interface AggregatedResult {
  iterations: number;
  durationMs: Stats;
  peakMemoryBytes: Stats;
  fps?: Stats;
  framesProcessed?: number;
}

/**
 * Memory sampler that records memory usage at regular intervals
 * Uses delta from baseline to measure actual memory growth during operation
 */
export class MemorySampler {
  private samples: number[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;
  private peakMemory = 0;
  private baselineMemory = 0;

  /**
   * Start sampling memory at the given interval
   * Records baseline before starting to measure delta
   */
  start(intervalMs = 100): void {
    this.samples = [];
    this.peakMemory = 0;

    // Force GC before taking baseline for more accurate measurement
    if (global.gc) {
      global.gc();
    }

    // Record baseline memory
    this.baselineMemory = process.memoryUsage().rss;

    this.interval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const rss = memUsage.rss;
      this.samples.push(rss);
      if (rss > this.peakMemory) {
        this.peakMemory = rss;
      }
    }, intervalMs);
  }

  /**
   * Stop sampling and return results
   * Returns peak memory as delta from baseline
   */
  stop(): { samples: number[]; peakMemory: number; baselineMemory: number } {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Take one final sample
    const finalRss = process.memoryUsage().rss;
    this.samples.push(finalRss);
    if (finalRss > this.peakMemory) {
      this.peakMemory = finalRss;
    }

    return {
      samples: this.samples,
      peakMemory: this.peakMemory,
      baselineMemory: this.baselineMemory,
    };
  }
}

/**
 * High-resolution timer for measuring execution time
 */
export class Timer {
  private startTime = 0n;
  private endTime = 0n;

  /**
   * Start the timer
   */
  start(): void {
    this.startTime = process.hrtime.bigint();
  }

  /**
   * Stop the timer
   */
  stop(): void {
    this.endTime = process.hrtime.bigint();
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedMs(): number {
    return Number(this.endTime - this.startTime) / 1_000_000;
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedSeconds(): number {
    return this.getElapsedMs() / 1000;
  }
}

/**
 * Measure execution time and memory usage of an async function
 * Memory is measured as delta from baseline for accurate comparison
 */
export async function measure(fn: () => Promise<{ framesProcessed?: number }>, options: { memorySampleIntervalMs?: number } = {}): Promise<MeasureResult> {
  const { memorySampleIntervalMs = 100 } = options;

  // Force garbage collection if available to get clean baseline
  if (global.gc) {
    global.gc();
    // Wait a bit for GC to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc();
  }

  const timer = new Timer();
  const memorySampler = new MemorySampler();

  memorySampler.start(memorySampleIntervalMs);
  timer.start();

  const result = await fn();

  timer.stop();
  const memoryResult = memorySampler.stop();

  const durationMs = timer.getElapsedMs();
  const framesProcessed = result.framesProcessed;

  // Calculate peak memory as delta from baseline
  // This gives us the actual memory growth during the operation
  const peakMemoryDelta = memoryResult.peakMemory - memoryResult.baselineMemory;

  return {
    durationMs,
    peakMemoryBytes: Math.max(0, peakMemoryDelta), // Ensure non-negative
    memorySamples: memoryResult.samples,
    framesProcessed,
    fps: framesProcessed ? (framesProcessed / durationMs) * 1000 : undefined,
  };
}

/**
 * Compute statistics from an array of numbers
 */
export function computeStats(values: number[]): Stats {
  if (values.length === 0) {
    return { mean: 0, min: 0, max: 0, stdDev: 0, median: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Standard deviation
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  // Median
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return { mean, min, max, stdDev, median };
}

/**
 * Aggregate multiple measurement results into statistics
 */
export function aggregateResults(results: MeasureResult[]): AggregatedResult {
  const durations = results.map((r) => r.durationMs);
  const peakMemories = results.map((r) => r.peakMemoryBytes);
  const fpsValues = results.filter((r) => r.fps !== undefined).map((r) => r.fps!);

  const framesProcessed = results.find((r) => r.framesProcessed)?.framesProcessed;

  return {
    iterations: results.length,
    durationMs: computeStats(durations),
    peakMemoryBytes: computeStats(peakMemories),
    fps: fpsValues.length > 0 ? computeStats(fpsValues) : undefined,
    framesProcessed,
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
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
 * Format milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(1)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Calculate percentage difference between two values
 */
export function percentDiff(baseline: number, comparison: number): number {
  if (baseline === 0) return 0;
  return ((comparison - baseline) / baseline) * 100;
}

/**
 * Format percentage difference with sign
 */
export function formatPercentDiff(diff: number): string {
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%`;
}
