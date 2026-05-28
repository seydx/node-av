/**
 * High-Level API Example: Bitstream Filter in a Transcode Pipeline
 *
 * Demonstrates applying a bitstream filter (BSF) to an encoder's output inside a
 * pipeline. `h264_metadata` derives its parameters from the encoder (lazy init),
 * removes Access Unit Delimiters, and rewrites the H.264 level - and the filter's
 * output parameters are written to the container, so the change is reflected in
 * the file (just like the FFmpeg CLI's `-bsf:v` option).
 *
 * Flow: Demuxer -> Decoder -> Encoder (libx264) -> BSF (h264_metadata) -> Muxer
 *
 * Usage: tsx examples/api-bitstream-filter.ts [input] [output]
 * Example: tsx examples/api-bitstream-filter.ts testdata/bunny-30s.mp4 examples/.tmp/api-bitstream-filter.mp4
 */

import { BitStreamFilterAPI, Decoder, Demuxer, Encoder, FF_ENCODER_LIBX264, Muxer, pipeline } from '../src/index.js';
import { getOutputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputFile = process.argv[2] ?? 'testdata/bunny-30s.mp4';
const outputFile = process.argv[3] ?? getOutputFile('api-bitstream-filter.mp4');

console.log(`Input:  ${inputFile}`);
console.log(`Output: ${outputFile}`);

await using input = await Demuxer.open(inputFile);
const videoStream = input.video();
if (!videoStream) {
  throw new Error('No video stream found in input file');
}

// Decode and re-encode with libx264.
using decoder = await Decoder.create(videoStream);
using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
  decoder,
  bitrate: '2M',
  options: {
    preset: 'medium',
    crf: 23,
  },
});

// Bitstream filter on the ENCODER output. Parameters (including extradata) are
// derived from the encoder once it is open; the muxer writes the filter's output
// parameters to the container.
using bsf = BitStreamFilterAPI.create('h264_metadata', encoder, {
  options: {
    aud: 'remove', // strip Access Unit Delimiters
    level: '4.1', // rewrite the H.264 level
  },
});

// Use an explicit Muxer handle so it is fully flushed before we read it back.
const output = await Muxer.open(outputFile);

console.log('Transcoding: decode -> libx264 -> h264_metadata -> mux ...');
const { completion } = pipeline(input, decoder, encoder, bsf, output);
await completion;
await output.close();

// Verify the bitstream filter's parameters reached the container.
await using result = await Demuxer.open(outputFile);
const outVideo = result.video();

console.log('Done!');
console.log(`Output video: ${outVideo?.codecpar.width}x${outVideo?.codecpar.height}`);
console.log(`Container H.264 level: ${outVideo?.codecpar.level} (expected 41 from h264_metadata level '4.1')`);
