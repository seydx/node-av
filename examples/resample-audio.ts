/**
 * Resample Audio Example - Low Level API
 *
 * Port of FFmpeg's doc/examples/resample_audio.c
 * Generate a synthetic audio signal and use libswresample API to perform audio resampling.
 * The output is written to a raw audio file to be played with ffplay.
 *
 * Usage: tsx examples/resample-audio.ts <output_file>
 * Example: tsx examples/resample-audio.ts examples/.tmp/resample.16
 *
 * Play the output with:
 * ffplay -f s16le -channel_layout 3.0(back) -channels 3 -ar 44100 output.s16
 */

import { Buffer } from 'node:buffer';
import { closeSync, openSync, writeSync } from 'node:fs';

import {
  AV_CHANNEL_LAYOUT_STEREO,
  AV_CHANNEL_LAYOUT_SURROUND,
  AV_ROUND_UP,
  AV_SAMPLE_FMT_DBL,
  AV_SAMPLE_FMT_FLT,
  AV_SAMPLE_FMT_S16,
  AV_SAMPLE_FMT_S32,
  AV_SAMPLE_FMT_U8,
  FFmpegError,
  Frame,
  SoftwareResampleContext,
  avGetBytesPerSample,
  avRescaleRnd,
} from '../src/index.js';

import type { AVSampleFormat } from '../src/index.js';

/**
 * Get format string from sample format for ffplay
 */
function getFormatFromSampleFmt(sampleFmt: AVSampleFormat): string | null {
  const sampleFmtEntries: {
    sampleFmt: AVSampleFormat;
    fmtBe: string;
    fmtLe: string;
  }[] = [
    { sampleFmt: AV_SAMPLE_FMT_U8, fmtBe: 'u8', fmtLe: 'u8' },
    { sampleFmt: AV_SAMPLE_FMT_S16, fmtBe: 's16be', fmtLe: 's16le' },
    { sampleFmt: AV_SAMPLE_FMT_S32, fmtBe: 's32be', fmtLe: 's32le' },
    { sampleFmt: AV_SAMPLE_FMT_FLT, fmtBe: 'f32be', fmtLe: 'f32le' },
    { sampleFmt: AV_SAMPLE_FMT_DBL, fmtBe: 'f64be', fmtLe: 'f64le' },
  ];

  for (const entry of sampleFmtEntries) {
    if (sampleFmt === entry.sampleFmt) {
      // Use little-endian on most systems
      return entry.fmtLe;
    }
  }

  console.error(`Sample format ${sampleFmt} not supported as output format`);
  return null;
}

/**
 * Fill dst buffer with nb_samples, generated starting from t
 */
function fillSamples(dst: Float64Array, nbSamples: number, nbChannels: number, sampleRate: number, t: { value: number }): void {
  const tincr = 1.0 / sampleRate;
  const c = 2 * Math.PI * 440.0; // 440 Hz tone

  // Generate sin tone with 440Hz frequency and duplicated channels
  let dstIndex = 0;
  for (let i = 0; i < nbSamples; i++) {
    const sample = Math.sin(c * t.value);
    for (let j = 0; j < nbChannels; j++) {
      dst[dstIndex++] = sample;
    }
    t.value += tincr;
  }
}

/**
 * Main resample audio function
 */
async function resampleAudio(outputFile: string): Promise<void> {
  let swrCtx: SoftwareResampleContext | null = null;
  let srcFrame: Frame | null = null;
  let dstFrame: Frame | null = null;
  let outfile: number | null = null;

  try {
    // Source and destination parameters
    const srcChLayout = AV_CHANNEL_LAYOUT_STEREO;
    const dstChLayout = AV_CHANNEL_LAYOUT_SURROUND;
    const srcRate = 48000;
    const dstRate = 44100;
    const srcSampleFmt = AV_SAMPLE_FMT_DBL;
    const dstSampleFmt = AV_SAMPLE_FMT_S16;
    const srcNbSamples = 1024;

    const srcNbChannels = srcChLayout.nbChannels;
    const dstNbChannels = dstChLayout.nbChannels;

    console.log('Resampling parameters:');
    console.log(`  Source: ${srcRate} Hz, ${srcNbChannels} channels, format: DBL`);
    console.log(`  Dest:   ${dstRate} Hz, ${dstNbChannels} channels, format: S16`);

    // Open output file
    outfile = openSync(outputFile, 'w');

    // Create resampler context
    swrCtx = new SoftwareResampleContext();

    // Set options and allocate context
    const allocRet = swrCtx.allocSetOpts2(dstChLayout, dstSampleFmt, dstRate, srcChLayout, srcSampleFmt, srcRate);
    FFmpegError.throwIfError(allocRet, 'Failed to allocate resampler context');

    // Initialize the resampling context
    const initRet = swrCtx.init();
    FFmpegError.throwIfError(initRet, 'Failed to initialize the resampling context');

    // Allocate source frame
    srcFrame = new Frame();
    srcFrame.alloc();
    srcFrame.nbSamples = srcNbSamples;
    srcFrame.format = srcSampleFmt;
    srcFrame.sampleRate = srcRate;
    srcFrame.channelLayout = srcChLayout;
    const srcBufRet = srcFrame.getBuffer(0);
    FFmpegError.throwIfError(srcBufRet, 'Could not allocate source samples');

    // Compute the number of converted samples
    let maxDstNbSamples = Number(avRescaleRnd(srcNbSamples, dstRate, srcRate, AV_ROUND_UP));
    let dstNbSamples = maxDstNbSamples;

    // Allocate destination frame
    dstFrame = new Frame();
    dstFrame.alloc();
    dstFrame.nbSamples = dstNbSamples;
    dstFrame.format = dstSampleFmt;
    dstFrame.sampleRate = dstRate;
    dstFrame.channelLayout = dstChLayout;
    let dstBufRet = dstFrame.getBuffer(0);
    FFmpegError.throwIfError(dstBufRet, 'Could not allocate destination samples');

    // Time counter for tone generation
    const t = { value: 0 };
    let iteration = 0;

    // Process audio for 10 seconds
    while (t.value < 10) {
      // Generate synthetic audio (double format, interleaved)
      const srcData = srcFrame.data;
      if (!srcData?.[0]) {
        throw new Error('Source frame data not allocated');
      }

      // Create Float64Array view for double samples
      const srcSamples = new Float64Array(srcData[0].buffer, srcData[0].byteOffset, srcNbSamples * srcNbChannels);
      fillSamples(srcSamples, srcNbSamples, srcNbChannels, srcRate, t);

      // Compute destination number of samples
      const delay = Number(swrCtx.getDelay(BigInt(srcRate)));
      dstNbSamples = Number(avRescaleRnd(delay + srcNbSamples, dstRate, srcRate, AV_ROUND_UP));

      // Reallocate destination frame if needed
      if (dstNbSamples > maxDstNbSamples) {
        dstFrame.free();
        dstFrame = new Frame();
        dstFrame.alloc();
        dstFrame.nbSamples = dstNbSamples;
        dstFrame.format = dstSampleFmt;
        dstFrame.sampleRate = dstRate;
        dstFrame.channelLayout = dstChLayout;
        dstBufRet = dstFrame.getBuffer(0);
        FFmpegError.throwIfError(dstBufRet, 'Could not reallocate destination samples');
        maxDstNbSamples = dstNbSamples;
      }

      // Convert to destination format
      // Original FFmpeg example uses swr_convert, not swr_convert_frame
      const srcDataConv = srcFrame.data;
      const dstDataConv = dstFrame.data;
      if (!srcDataConv || !dstDataConv) {
        throw new Error('Frame data not available');
      }

      const ret = await swrCtx.convert(dstDataConv, Number(dstNbSamples), srcDataConv, srcNbSamples);
      FFmpegError.throwIfError(ret, 'Error while converting');

      // Calculate buffer size for output
      const actualSamples = ret; // convert returns number of samples converted
      const bytesPerSample = avGetBytesPerSample(dstSampleFmt);
      const dstBufSize = actualSamples * dstNbChannels * bytesPerSample;

      // Write converted audio to file
      const dstData = dstFrame.data;
      if (dstData?.[0] && dstBufSize > 0) {
        const outputBuffer = Buffer.from(dstData[0].buffer, dstData[0].byteOffset, dstBufSize);
        writeSync(outfile, outputBuffer);
      }

      // Progress output
      if (iteration++ % 50 === 0) {
        console.log(`t:${t.value.toFixed(3)} in:${srcNbSamples} out:${actualSamples}`);
      }
    }

    // Flush any remaining samples
    const flushDelay = Number(swrCtx.getDelay(BigInt(srcRate)));
    if (flushDelay > 0) {
      dstNbSamples = Number(avRescaleRnd(flushDelay, dstRate, srcRate, AV_ROUND_UP));
      if (dstNbSamples > 0) {
        // Reallocate if needed
        if (dstNbSamples > maxDstNbSamples) {
          dstFrame.free();
          dstFrame = new Frame();
          dstFrame.alloc();
          dstFrame.nbSamples = dstNbSamples;
          dstFrame.format = dstSampleFmt;
          dstFrame.sampleRate = dstRate;
          dstFrame.channelLayout = dstChLayout;
          dstBufRet = dstFrame.getBuffer(0);
          FFmpegError.throwIfError(dstBufRet, 'Could not reallocate for flush');
        }

        // Flush by converting with null input
        const dstDataFlush = dstFrame.data;
        if (!dstDataFlush) {
          throw new Error('Destination frame data not available');
        }

        const flushRet = await swrCtx.convert(dstDataFlush, Number(dstNbSamples), null, 0);
        if (flushRet >= 0) {
          const actualSamples = flushRet;
          const bytesPerSample = avGetBytesPerSample(dstSampleFmt);
          const dstBufSize = actualSamples * dstNbChannels * bytesPerSample;

          const dstData = dstFrame.data;
          if (dstData?.[0] && dstBufSize > 0) {
            const outputBuffer = Buffer.from(dstData[0].buffer, dstData[0].byteOffset, dstBufSize);
            writeSync(outfile, outputBuffer);
          }
        }
      }
    }

    // Get output format info
    const fmt = getFormatFromSampleFmt(dstSampleFmt);
    if (fmt) {
      console.log('\nResampling succeeded!');
      console.log('Play the output file with the command:');
      console.log(`ffplay -f ${fmt} -channel_layout 3.0(back) -channels ${dstNbChannels} -ar ${dstRate} ${outputFile}`);
    }
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  } finally {
    // Cleanup
    if (outfile !== null) {
      closeSync(outfile);
    }
    if (srcFrame) {
      srcFrame.free();
    }
    if (dstFrame) {
      dstFrame.free();
    }
    if (swrCtx) {
      swrCtx.free();
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.log('Usage: tsx examples/resample-audio.ts <output_file>');
    console.log('');
    console.log('API example program to show how to resample an audio stream with libswresample.');
    console.log('This program generates a series of audio frames, resamples them to a specified');
    console.log('output format and rate and saves them to an output file.');
    console.log('');
    console.log('Example:');
    console.log('  tsx examples/resample-audio.ts output.s16');
    console.log('');
    console.log('The output will be:');
    console.log('  - 44100 Hz sample rate (from 48000 Hz)');
    console.log('  - 3 channels / 3.0(back) layout (from stereo)');
    console.log('  - S16 format (from DBL)');
    process.exit(1);
  }

  const outputFile = args[0];

  try {
    await resampleAudio(outputFile);
    process.exit(0);
  } catch (error) {
    if (error instanceof FFmpegError) {
      console.error(`FFmpeg Error: ${error.message} (code: ${error.code})`);
    } else {
      console.error('Fatal error:', error);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
