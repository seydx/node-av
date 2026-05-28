/**
 * High-Level API Example: FilterComplexAPI - 2x2 Grid with Effects
 *
 * Recreates the FFmpeg command:
 * ffmpeg -f lavfi -i testsrc -f lavfi -i testsrc -f lavfi -i testsrc -f lavfi -i testsrc
 *   -filter_complex "[1:v]negate[a]; [2:v]hflip[b]; [3:v]edgedetect[c];
 *                    [0:v][a]hstack=inputs=2[top]; [b][c]hstack=inputs=2[bottom];
 *                    [top][bottom]vstack=inputs=2[out]"
 *   -map "[out]" -c:v libx264 output.mp4
 *
 * Creates a 2x2 grid layout:
 * ┌─────────┬─────────┐
 * │ Original│ Negate  │
 * ├─────────┼─────────┤
 * │ HFlip   │ Edge Det│
 * └─────────┴─────────┘
 *
 * Usage: tsx examples/api-filter-complex-grid.ts <output>
 * Example: tsx examples/api-filter-complex-grid.ts examples/.tmp/grid.mp4
 */

import { Decoder, Demuxer, Encoder, FF_ENCODER_LIBX264, FilterComplexAPI, Muxer } from '../src/index.js';
import { prepareTestEnvironment } from './index.js';

const outputFile = process.argv[2];

if (!outputFile) {
  console.error('Usage: tsx examples/api-filter-complex-grid.ts <output>');
  console.error('Example: tsx examples/api-filter-complex-grid.ts examples/.tmp/grid.mp4');
  process.exit(1);
}

prepareTestEnvironment();

console.log('FilterComplexAPI 2x2 Grid Example');
console.log('Creating 4 test sources with different effects...');
console.log('Output:', outputFile);
console.log('');

// For this example, we'll use an input file 4 times to simulate 4 different sources
// In production, you could use lavfi testsrc or different video files
const testInput = 'testdata/demux.mp4';

// Open the same input 4 times (simulating 4 different sources)
await using input0 = await Demuxer.open(testInput);
await using input1 = await Demuxer.open(testInput);
await using input2 = await Demuxer.open(testInput);
await using input3 = await Demuxer.open(testInput);

const stream0 = input0.video();
const stream1 = input1.video();
const stream2 = input2.video();
const stream3 = input3.video();

if (!stream0 || !stream1 || !stream2 || !stream3) {
  throw new Error('No video streams found');
}

console.log(`Input resolution: ${stream0.codecpar.width}x${stream0.codecpar.height}`);
console.log('Grid output will be: ' + stream0.codecpar.width * 2 + 'x' + stream0.codecpar.height * 2);
console.log('');

// Create decoders
using decoder0 = await Decoder.create(stream0);
using decoder1 = await Decoder.create(stream1);
using decoder2 = await Decoder.create(stream2);
using decoder3 = await Decoder.create(stream3);

const streamIndex0 = stream0.index;
const streamIndex1 = stream1.index;
const streamIndex2 = stream2.index;
const streamIndex3 = stream3.index;

// Get frame rate from the input stream
const frameRate = stream0.avgFrameRate;
console.log(`Input frame rate: ${frameRate.num}/${frameRate.den}`);

// Create 2x2 grid with effects
// Filter description matches the FFmpeg command structure:
// [1:v]negate[a]; [2:v]hflip[b]; [3:v]edgedetect[c];
// [0:v][a]hstack=inputs=2[top]; [b][c]hstack=inputs=2[bottom];
// [top][bottom]vstack=inputs=2[out]
using complex = FilterComplexAPI.create(
  `
    [1:v] negate [a];
    [2:v] hflip [b];
    [3:v] edgedetect [c];
    [0:v][a] hstack=inputs=2 [top];
    [b][c] hstack=inputs=2 [bottom];
    [top][bottom] vstack=inputs=2,format=yuv420p [out]
  `,
  {
    framerate: frameRate,
    inputs: [
      { label: '0:v' }, // Top-left: Original
      { label: '1:v' }, // Top-right: Negate
      { label: '2:v' }, // Bottom-left: HFlip
      { label: '3:v' }, // Bottom-right: EdgeDetect
    ],
    outputs: [{ label: 'out' }],
  },
);

console.log('Filter graph:');
console.log('┌─────────┬─────────┐');
console.log('│ Original│ Negate  │');
console.log('├─────────┼─────────┤');
console.log('│ HFlip   │ Edge Det│');
console.log('└─────────┴─────────┘');
console.log('');

// Create output
await using output = await Muxer.open(outputFile);

// Create encoder
using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
  decoder: decoder0, // For framerate and other metadata
  filter: complex,
  bitrate: '4M', // Higher bitrate for grid (4 videos in one)
  options: { preset: 'medium', crf: 23 },
});

const outputStreamIndex = output.addStream(encoder);

// Process frames using the high-level frames() API
let frameCount = 0;
console.log('Processing frames...');

for await (using frame of complex.frames('out', {
  '0:v': decoder0.frames(input0.packets(streamIndex0)),
  '1:v': decoder1.frames(input1.packets(streamIndex1)),
  '2:v': decoder2.frames(input2.packets(streamIndex2)),
  '3:v': decoder3.frames(input3.packets(streamIndex3)),
})) {
  // Encode filtered frame
  for await (using packet of encoder.packets(frame)) {
    await output.writePacket(packet, outputStreamIndex);
  }
  if (frame) frameCount++;

  // Progress indicator
  if (frame && frameCount % 30 === 0) {
    console.log(`Processed ${frameCount} frames...`);
  }
}

console.log('');
console.log(`✓ Done! Processed ${frameCount} frames`);
console.log(`Output: ${outputFile}`);
console.log('');
console.log('Layout:');
console.log('  Top-left:     Original video');
console.log('  Top-right:    Negate effect');
console.log('  Bottom-left:  Horizontal flip');
console.log('  Bottom-right: Edge detection');
