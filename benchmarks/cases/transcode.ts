/**
 * Transcode Speed Benchmark Tests
 *
 * Compares transcoding performance between FFmpeg CLI and node-av
 * for various codec configurations.
 */

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Decoder, Demuxer, Encoder, HardwareContext, Muxer, pipeline } from '../../src/api/index.js';
import { FF_ENCODER_LIBX264, FF_ENCODER_LIBX265 } from '../../src/constants/encoders.js';
import { runner } from '../runner.js';
import { FFmpegArgs } from '../utils/ffmpeg-cli.js';

import type { BenchmarkConfig } from '../runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default paths
const testDataDir = resolve(__dirname, '../../testdata');
const resultsDir = resolve(__dirname, '../results');

/**
 * Default benchmark configuration
 */
const defaultConfig = {
  iterations: 5,
  warmupIterations: 1,
};

/**
 * Software H.264 Transcode Benchmark
 */
export async function benchmarkSWH264(inputFile?: string, outputFile?: string): Promise<void> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');
  const output = outputFile ?? join(resultsDir, 'sw-h264-output.mp4');

  const config: BenchmarkConfig = {
    name: 'SW H.264 Transcode',
    description: 'Software H.264 encoding with libx264 (CPU)',
    category: 'transcode',
    inputFile: input,
    outputFile: output,
    ...defaultConfig,
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
 * Software H.265/HEVC Transcode Benchmark
 */
export async function benchmarkSWH265(inputFile?: string, outputFile?: string): Promise<void> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');
  const output = outputFile ?? join(resultsDir, 'sw-h265-output.mp4');

  const config: BenchmarkConfig = {
    name: 'SW H.265 Transcode',
    description: 'Software H.265/HEVC encoding with libx265 (CPU)',
    category: 'transcode',
    inputFile: input,
    outputFile: output,
    ...defaultConfig,
  };

  const ffmpegOptions = {
    input,
    output,
    args: FFmpegArgs.swH265(28),
  };

  const nodeAVFn = async () => {
    await using demuxer = await Demuxer.open(input);
    const videoStream = demuxer.video();
    if (!videoStream) throw new Error('No video stream found');

    const decoder = await Decoder.create(videoStream);
    const encoder = await Encoder.create(FF_ENCODER_LIBX265, {
      decoder,
      options: { preset: 'medium', crf: 28 },
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
 * Hardware H.264 Transcode Benchmark (platform-dependent)
 */
export async function benchmarkHWH264(inputFile?: string, outputFile?: string): Promise<void> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');
  const output = outputFile ?? join(resultsDir, 'hw-h264-output.mp4');

  // Check hardware availability
  const hw = HardwareContext.auto();
  if (!hw) {
    console.log('⚠️  Skipping HW H.264 benchmark: No hardware acceleration available');
    return;
  }

  const hwEncoderCodec = hw.getEncoderCodec('h264');
  if (!hwEncoderCodec) {
    console.log('⚠️  Skipping HW H.264 benchmark: No hardware H.264 encoder available');
    hw.dispose();
    return;
  }

  // Determine FFmpeg hardware encoder based on platform
  let ffmpegArgs: string[];
  const platform = process.platform;

  if (platform === 'darwin') {
    ffmpegArgs = FFmpegArgs.hwH264VideoToolbox();
  } else if (platform === 'linux') {
    // Try VAAPI first, then NVENC
    ffmpegArgs = FFmpegArgs.hwH264Vaapi();
  } else if (platform === 'win32') {
    ffmpegArgs = FFmpegArgs.hwH264Nvenc();
  } else {
    console.log('⚠️  Skipping HW H.264 benchmark: Unknown platform');
    hw.dispose();
    return;
  }

  const config: BenchmarkConfig = {
    name: 'HW H.264 Transcode',
    description: `Hardware H.264 encoding (${hw.deviceTypeName})`,
    category: 'transcode',
    inputFile: input,
    outputFile: output,
    ...defaultConfig,
  };

  const ffmpegOptions = {
    input,
    output,
    args: ffmpegArgs,
  };

  const nodeAVFn = async () => {
    await using demuxer = await Demuxer.open(input);
    const videoStream = demuxer.video();
    if (!videoStream) throw new Error('No video stream found');

    const decoder = await Decoder.create(videoStream, { hardware: hw });
    const encoder = await Encoder.create(hwEncoderCodec, {
      decoder,
      bitrate: '2M',
    });

    await using muxer = await Muxer.open(output);

    const control = pipeline(demuxer, decoder, encoder, muxer);
    await control.completion;

    // Get frame count from codec context
    const ctx = encoder.getCodecContext();
    return { framesProcessed: ctx?.frameNumber };
  };

  try {
    await runner.runBenchmark(config, ffmpegOptions, nodeAVFn);
  } finally {
    hw.dispose();
  }
}

/**
 * Stream Copy (Remux) Benchmark
 */
export async function benchmarkStreamCopy(inputFile?: string, outputFile?: string): Promise<void> {
  const input = inputFile ?? join(testDataDir, 'video.mp4');
  const output = outputFile ?? join(resultsDir, 'stream-copy-output.mp4');

  const config: BenchmarkConfig = {
    name: 'Stream Copy (Remux)',
    description: 'Copy streams without re-encoding',
    category: 'transcode',
    inputFile: input,
    outputFile: output,
    ...defaultConfig,
  };

  const ffmpegOptions = {
    input,
    output,
    args: FFmpegArgs.streamCopy(),
  };

  const nodeAVFn = async () => {
    await using demuxer = await Demuxer.open(input);
    await using muxer = await Muxer.open(output);

    // Add streams from demuxer to muxer (required for stream copy)
    const streamMap = new Map<number, number>();
    for (const stream of demuxer.streams) {
      const outIndex = muxer.addStream(stream);
      streamMap.set(stream.index, outIndex);
    }

    // Manual packet copy to count packets
    let packetCount = 0;
    for await (const packet of demuxer.packets()) {
      if (!packet) break;
      const outIndex = streamMap.get(packet.streamIndex);
      if (outIndex !== undefined) {
        await muxer.writePacket(packet, outIndex);
        packetCount++;
      }
      packet.free();
    }

    return { framesProcessed: packetCount };
  };

  await runner.runBenchmark(config, ffmpegOptions, nodeAVFn);
}

/**
 * Run all transcode benchmarks
 */
export async function runAllTranscodeBenchmarks(inputFile?: string): Promise<void> {
  console.log('\n🎬 Running Transcode Speed Benchmarks\n');
  console.log('='.repeat(60));

  await benchmarkSWH264(inputFile);
  await benchmarkSWH265(inputFile);
  await benchmarkHWH264(inputFile);
  await benchmarkStreamCopy(inputFile);

  console.log('\n' + '='.repeat(60));
  console.log('Transcode benchmarks completed\n');
}
