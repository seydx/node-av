/**
 * High-Level API Example: Pipeline progress reporting
 *
 * Demonstrates the `onProgress` callback (and pollable `control.progress`) on the
 * pipeline - reporting frame/fps/time/bitrate/speed like FFmpeg's CLI, suitable
 * for driving a progress bar or status line.
 *
 * Usage: tsx examples/api-pipeline-progress.ts [input] [output]
 * Example: tsx examples/api-pipeline-progress.ts testdata/bunny-30s.mp4 examples/.tmp/api-pipeline-progress.mp4
 */

import { Decoder, Demuxer, Encoder, FF_ENCODER_LIBX264, Muxer, pipeline } from '../src/index.js';
import { getOutputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputFile = process.argv[2] ?? 'testdata/bunny-30s.mp4';
const outputFile = process.argv[3] ?? getOutputFile('api-pipeline-progress.mp4');

await using input = await Demuxer.open(inputFile);
const videoStream = input.video();
if (!videoStream) {
  throw new Error('No video stream found in input file');
}

using decoder = await Decoder.create(videoStream);
using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
  decoder,
  bitrate: '2M',
  options: { preset: 'veryfast' },
});

await using output = await Muxer.open(outputFile);

const { completion } = pipeline(input, decoder, encoder, output, {
  progressInterval: 200,
  onProgress: (p) => {
    // Render an FFmpeg-style status line.
    const line =
      `frame=${p.frames.toString().padStart(6)} ` +
      `fps=${p.fps.toFixed(1).padStart(6)} ` +
      `time=${p.time.toFixed(2).padStart(7)}s ` +
      `bitrate=${(p.bitrate / 1000).toFixed(0).padStart(6)}kb/s ` +
      `speed=${p.speed.toFixed(2)}x`;
    process.stdout.write(`\r${line}`);
  },
});

await completion;

process.stdout.write('\nDone!\n');
