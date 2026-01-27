/**
 * Memory Usage Benchmark Tests
 *
 * Compares memory consumption between FFmpeg CLI and node-av
 * during media processing operations.
 */

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Decoder, Demuxer, Encoder, Muxer, pipeline } from '../../src/api/index.js';
import { FF_ENCODER_LIBX264 } from '../../src/constants/encoders.js';
import { runner } from '../runner.js';
import { FFmpegArgs } from '../utils/ffmpeg-cli.js';
import { MemorySampler } from '../utils/measure.js';

import type { BenchmarkConfig } from '../runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default paths
const testDataDir = resolve(__dirname, '../../testdata');
const resultsDir = resolve(__dirname, '../results');

/**
 * Configuration for memory-focused benchmarks
 */
const memoryConfig = {
  iterations: 3,
  warmupIterations: 1,
};

/**
 * Memory usage during H.264 transcode
 */
export async function benchmarkMemoryH264Transcode(inputFile?: string, outputFile?: string): Promise<void> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');
  const output = outputFile ?? join(resultsDir, 'memory-h264-output.mp4');

  const config: BenchmarkConfig = {
    name: 'Memory: H.264 Transcode',
    description: 'Peak memory usage during H.264 software transcoding',
    category: 'memory',
    inputFile: input,
    outputFile: output,
    ...memoryConfig,
  };

  const ffmpegOptions = {
    input,
    output,
    args: FFmpegArgs.swH264(23),
  };

  const nodeAVFn = async () => {
    await using demuxer = await Demuxer.open(input);
    const videoStream = demuxer.video();
    if (!videoStream) throw new Error('No video stream found');

    const decoder = await Decoder.create(videoStream);
    const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
      decoder,
      options: { preset: 'medium', crf: 23 },
    });

    await using muxer = await Muxer.open(output);

    const control = pipeline(demuxer, decoder, encoder, muxer);
    await control.completion;

    // Get frame count from codec context
    const ctx = encoder.getCodecContext();
    return { framesProcessed: ctx?.frameNumber };
  };

  await runner.runBenchmark(config, ffmpegOptions, nodeAVFn);
}

/**
 * Memory usage during stream copy
 */
export async function benchmarkMemoryStreamCopy(inputFile?: string, outputFile?: string): Promise<void> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');
  const output = outputFile ?? join(resultsDir, 'memory-copy-output.mp4');

  const config: BenchmarkConfig = {
    name: 'Memory: Stream Copy',
    description: 'Peak memory usage during stream copy (remux)',
    category: 'memory',
    inputFile: input,
    outputFile: output,
    ...memoryConfig,
  };

  const ffmpegOptions = {
    input,
    output,
    args: FFmpegArgs.streamCopy(),
  };

  const nodeAVFn = async () => {
    await using demuxer = await Demuxer.open(input);
    await using muxer = await Muxer.open(output);

    const control = pipeline(demuxer, muxer);
    await control.completion;

    return {};
  };

  await runner.runBenchmark(config, ffmpegOptions, nodeAVFn);
}

/**
 * Detailed memory profiling for node-av
 * This provides more granular memory analysis beyond peak usage
 */
export async function profileNodeAVMemory(inputFile?: string): Promise<void> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');

  console.log('\n📊 Detailed Memory Profile for node-av\n');
  console.log('='.repeat(60));

  // Force GC before starting
  if (global.gc) {
    global.gc();
  }

  const sampler = new MemorySampler();
  sampler.start(50); // Sample every 50ms

  const baselineMemory = process.memoryUsage();
  console.log('Baseline Memory:');
  console.log(`  RSS: ${formatBytes(baselineMemory.rss)}`);
  console.log(`  Heap Used: ${formatBytes(baselineMemory.heapUsed)}`);
  console.log(`  Heap Total: ${formatBytes(baselineMemory.heapTotal)}`);
  console.log(`  External: ${formatBytes(baselineMemory.external)}`);
  console.log('');

  // Open demuxer
  console.log('Opening demuxer...');
  const demuxer = await Demuxer.open(input);
  const afterDemuxer = process.memoryUsage();
  console.log(`  After Demuxer: +${formatBytes(afterDemuxer.rss - baselineMemory.rss)} RSS`);

  // Create decoder
  const videoStream = demuxer.video();
  if (!videoStream) {
    await demuxer.close();
    throw new Error('No video stream found');
  }

  console.log('Creating decoder...');
  const decoder = await Decoder.create(videoStream);
  const afterDecoder = process.memoryUsage();
  console.log(`  After Decoder: +${formatBytes(afterDecoder.rss - afterDemuxer.rss)} RSS`);

  // Create encoder
  console.log('Creating encoder...');
  const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
    decoder,
    options: { preset: 'ultrafast', crf: 23 },
  });
  const afterEncoder = process.memoryUsage();
  console.log(`  After Encoder: +${formatBytes(afterEncoder.rss - afterDecoder.rss)} RSS`);

  // Process frames
  console.log('Processing frames...');
  let frameCount = 0;
  let maxMemoryDuringProcess = process.memoryUsage().rss;

  for await (const packet of demuxer.packets(videoStream.index)) {
    if (!packet) continue;

    for await (const frame of decoder.frames(packet)) {
      if (!frame) continue;
      frameCount++;

      for await (const _ of encoder.packets(frame)) {
        // Just encode and discard
      }

      // Sample memory periodically
      if (frameCount % 30 === 0) {
        const currentMem = process.memoryUsage().rss;
        if (currentMem > maxMemoryDuringProcess) {
          maxMemoryDuringProcess = currentMem;
        }
      }
    }
  }

  // Flush
  for await (const frame of decoder.frames(null)) {
    if (!frame) continue;
    for await (const _ of encoder.packets(frame)) {
      // Just encode and discard
    }
  }
  for await (const _ of encoder.packets(null)) {
    // Just encode and discard
  }

  const { samples, peakMemory } = sampler.stop();

  console.log('\nProcessing Complete:');
  console.log(`  Frames: ${frameCount}`);
  console.log(`  Peak Memory: ${formatBytes(peakMemory)}`);
  console.log(`  Memory Samples: ${samples.length}`);
  console.log(`  Memory Growth: ${formatBytes(peakMemory - baselineMemory.rss)}`);

  // Cleanup
  await demuxer.close();

  // Force GC and check final memory
  if (global.gc) {
    global.gc();
    await new Promise((resolve) => setTimeout(resolve, 100));
    global.gc();
  }

  const finalMemory = process.memoryUsage();
  console.log('\nAfter Cleanup:');
  console.log(`  RSS: ${formatBytes(finalMemory.rss)}`);
  console.log(`  Retained: ${formatBytes(finalMemory.rss - baselineMemory.rss)}`);

  console.log('\n' + '='.repeat(60));
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
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
 * Run all memory benchmarks
 */
export async function runAllMemoryBenchmarks(inputFile?: string): Promise<void> {
  console.log('\n💾 Running Memory Usage Benchmarks\n');
  console.log('='.repeat(60));

  await benchmarkMemoryH264Transcode(inputFile);
  await benchmarkMemoryStreamCopy(inputFile);
  await profileNodeAVMemory(inputFile);

  console.log('\n' + '='.repeat(60));
  console.log('Memory benchmarks completed\n');
}
