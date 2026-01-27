/**
 * Latency Benchmark Tests
 *
 * Measures various latency metrics for node-av:
 * - Time to open a file and get first frame
 * - Time to decode first frame
 * - Time to encode first frame
 * - End-to-end pipeline latency
 */

import { existsSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Decoder, Demuxer, Encoder, Muxer } from '../../src/api/index.js';
import { FF_ENCODER_LIBX264 } from '../../src/constants/encoders.js';
import { Timer, computeStats } from '../utils/measure.js';

import type { Stats } from '../utils/measure.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default paths
const testDataDir = resolve(__dirname, '../../testdata');
const resultsDir = resolve(__dirname, '../results');

/**
 * Latency measurement result
 */
export interface LatencyResult {
  name: string;
  description: string;
  stats: Stats;
  samples: number[];
}

/**
 * All latency metrics collected
 */
export interface LatencyMetrics {
  demuxerOpen: LatencyResult;
  firstPacket: LatencyResult;
  firstFrame: LatencyResult;
  firstEncodedPacket: LatencyResult;
  pipelineTotal: LatencyResult;
}

/**
 * Measure latency with multiple iterations
 */
async function measureLatency(name: string, description: string, fn: () => Promise<void>, iterations = 10): Promise<LatencyResult> {
  const samples: number[] = [];

  // Warmup
  await fn();

  // Actual measurements
  for (let i = 0; i < iterations; i++) {
    const timer = new Timer();
    timer.start();
    await fn();
    timer.stop();
    samples.push(timer.getElapsedMs());
  }

  return {
    name,
    description,
    stats: computeStats(samples),
    samples,
  };
}

/**
 * Measure Demuxer.open() latency
 */
export async function measureDemuxerOpenLatency(inputFile?: string, iterations = 10): Promise<LatencyResult> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');

  return measureLatency(
    'Demuxer.open()',
    'Time to open input file and parse headers',
    async () => {
      const demuxer = await Demuxer.open(input);
      await demuxer.close();
    },
    iterations,
  );
}

/**
 * Measure time to first packet
 */
export async function measureFirstPacketLatency(inputFile?: string, iterations = 10): Promise<LatencyResult> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');

  return measureLatency(
    'First Packet',
    'Time from open to receiving first packet',
    async () => {
      const demuxer = await Demuxer.open(input);
      const videoStream = demuxer.video();
      if (!videoStream) {
        await demuxer.close();
        throw new Error('No video stream found');
      }

      // Get first packet
      for await (const packet of demuxer.packets(videoStream.index)) {
        if (packet) break;
      }

      await demuxer.close();
    },
    iterations,
  );
}

/**
 * Measure time to first decoded frame
 */
export async function measureFirstFrameLatency(inputFile?: string, iterations = 10): Promise<LatencyResult> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');

  return measureLatency(
    'First Frame',
    'Time from open to first decoded frame',
    async () => {
      const demuxer = await Demuxer.open(input);
      const videoStream = demuxer.video();
      if (!videoStream) {
        await demuxer.close();
        throw new Error('No video stream found');
      }

      const decoder = await Decoder.create(videoStream);

      // Get first frame
      let gotFrame = false;
      for await (const packet of demuxer.packets(videoStream.index)) {
        if (!packet) continue;

        for await (const frame of decoder.frames(packet)) {
          if (frame) {
            gotFrame = true;
            break;
          }
        }

        if (gotFrame) break;
      }

      await demuxer.close();
    },
    iterations,
  );
}

/**
 * Measure time to first encoded packet
 */
export async function measureFirstEncodedPacketLatency(inputFile?: string, iterations = 10): Promise<LatencyResult> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');

  return measureLatency(
    'First Encoded Packet',
    'Time from open to first re-encoded packet',
    async () => {
      const demuxer = await Demuxer.open(input);
      const videoStream = demuxer.video();
      if (!videoStream) {
        await demuxer.close();
        throw new Error('No video stream found');
      }

      const decoder = await Decoder.create(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        decoder,
        options: { preset: 'ultrafast', tune: 'zerolatency' },
      });

      // Get first encoded packet
      let gotPacket = false;
      for await (const packet of demuxer.packets(videoStream.index)) {
        if (!packet) continue;

        for await (const frame of decoder.frames(packet)) {
          if (!frame) continue;

          for await (const encodedPacket of encoder.packets(frame)) {
            if (encodedPacket) {
              gotPacket = true;
              break;
            }
          }

          if (gotPacket) break;
        }

        if (gotPacket) break;
      }

      await demuxer.close();
    },
    iterations,
  );
}

/**
 * Measure end-to-end pipeline latency (first packet written to output)
 */
export async function measurePipelineLatency(inputFile?: string, iterations = 10): Promise<LatencyResult> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');
  const output = join(resultsDir, 'latency-output.mp4');

  return measureLatency(
    'Pipeline Total',
    'Time from open to first packet written to output',
    async () => {
      const demuxer = await Demuxer.open(input);
      const videoStream = demuxer.video();
      if (!videoStream) {
        await demuxer.close();
        throw new Error('No video stream found');
      }

      const decoder = await Decoder.create(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        decoder,
        options: { preset: 'ultrafast', tune: 'zerolatency' },
      });

      const muxer = await Muxer.open(output);
      const streamIndex = muxer.addStream(encoder);

      // Get first packet written to output
      let wrotePacket = false;
      for await (const packet of demuxer.packets(videoStream.index)) {
        if (!packet) continue;

        for await (const frame of decoder.frames(packet)) {
          if (!frame) continue;

          for await (const encodedPacket of encoder.packets(frame)) {
            if (encodedPacket) {
              await muxer.writePacket(encodedPacket, streamIndex);
              wrotePacket = true;
              break;
            }
          }

          if (wrotePacket) break;
        }

        if (wrotePacket) break;
      }

      await demuxer.close();
      await muxer.close();

      // Clean up the incomplete output file
      if (existsSync(output)) {
        unlinkSync(output);
      }
    },
    iterations,
  );
}

/**
 * Run all latency measurements and collect metrics
 */
export async function measureAllLatencies(inputFile?: string, iterations = 10): Promise<LatencyMetrics> {
  console.log('\n⏱️  Measuring Latency Metrics\n');
  console.log('='.repeat(60));

  console.log('Measuring Demuxer.open() latency...');
  const demuxerOpen = await measureDemuxerOpenLatency(inputFile, iterations);

  console.log('Measuring First Packet latency...');
  const firstPacket = await measureFirstPacketLatency(inputFile, iterations);

  console.log('Measuring First Frame latency...');
  const firstFrame = await measureFirstFrameLatency(inputFile, iterations);

  console.log('Measuring First Encoded Packet latency...');
  const firstEncodedPacket = await measureFirstEncodedPacketLatency(inputFile, iterations);

  console.log('Measuring Pipeline Total latency...');
  const pipelineTotal = await measurePipelineLatency(inputFile, iterations);

  const metrics = {
    demuxerOpen,
    firstPacket,
    firstFrame,
    firstEncodedPacket,
    pipelineTotal,
  };

  // Print results
  printLatencyResults(metrics);

  return metrics;
}

/**
 * Print latency results in a formatted table
 */
function printLatencyResults(metrics: LatencyMetrics): void {
  console.log('\n📊 Latency Results:\n');
  console.log('┌──────────────────────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Metric                   │ Mean     │ Min      │ Max      │ StdDev   │');
  console.log('├──────────────────────────┼──────────┼──────────┼──────────┼──────────┤');

  const results = [metrics.demuxerOpen, metrics.firstPacket, metrics.firstFrame, metrics.firstEncodedPacket, metrics.pipelineTotal];

  for (const result of results) {
    const name = result.name.padEnd(24);
    const mean = formatMs(result.stats.mean).padStart(8);
    const min = formatMs(result.stats.min).padStart(8);
    const max = formatMs(result.stats.max).padStart(8);
    const stdDev = formatMs(result.stats.stdDev).padStart(8);

    console.log(`│ ${name} │ ${mean} │ ${min} │ ${max} │ ${stdDev} │`);
  }

  console.log('└──────────────────────────┴──────────┴──────────┴──────────┴──────────┘');
  console.log('');

  // Show breakdown
  console.log('Latency Breakdown:');
  console.log(`  Open → First Packet: ${formatMs(metrics.firstPacket.stats.mean - metrics.demuxerOpen.stats.mean)}`);
  console.log(`  First Packet → First Frame: ${formatMs(metrics.firstFrame.stats.mean - metrics.firstPacket.stats.mean)}`);
  console.log(`  First Frame → First Encoded: ${formatMs(metrics.firstEncodedPacket.stats.mean - metrics.firstFrame.stats.mean)}`);
  console.log(`  First Encoded → Written: ${formatMs(metrics.pipelineTotal.stats.mean - metrics.firstEncodedPacket.stats.mean)}`);

  console.log('\n' + '='.repeat(60));
}

/**
 * Format milliseconds
 */
function formatMs(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  return `${ms.toFixed(1)}ms`;
}

/**
 * Run all latency benchmarks
 */
export async function runAllLatencyBenchmarks(inputFile?: string): Promise<void> {
  console.log('\n⚡ Running Latency Benchmarks\n');
  console.log('='.repeat(60));

  await measureAllLatencies(inputFile, 10);

  console.log('\nLatency benchmarks completed\n');
}
