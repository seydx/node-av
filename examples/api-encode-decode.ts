/**
 * High-Level API Example: Encode and Decode
 *
 * Shows basic encoding and decoding operations using the high-level API.
 * Demonstrates how simple it is compared to the low-level FFmpeg API.
 *
 * Usage: tsx examples/api-encode-decode.ts <input> <output>
 * Example: tsx examples/api-encode-decode.ts testdata/video.mp4 examples/.tmp/api-encode-decode.mp4
 */

import { AV_LOG_DEBUG, Decoder, Demuxer, Encoder, FF_ENCODER_LIBX264, Log, Muxer } from '../src/index.js';
import { prepareTestEnvironment } from './index.js';

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error('Usage: tsx examples/api-encode-decode.ts <input> <output>');
  process.exit(1);
}

prepareTestEnvironment();
Log.setLevel(AV_LOG_DEBUG);

// Open input media
console.log('Opening input:', inputFile);
await using input = await Demuxer.open(inputFile);

// Get video stream
const videoStream = input.video(0);
if (!videoStream) {
  throw new Error('No video stream found');
}

// Get audio stream
const audioStream = input.audio(0);

console.log(`Input video: ${videoStream.codecpar.width}x${videoStream.codecpar.height} ${videoStream.codecpar.codecId}`);
if (audioStream) {
  console.log(`Input audio: ${audioStream.codecpar.sampleRate}Hz ${audioStream.codecpar.channels}ch ${audioStream.codecpar.codecId}`);
}

// Create decoder
console.log('Creating decoder...');
using decoder = await Decoder.create(videoStream);

// Create encoder
console.log('Creating encoder...');
using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
  decoder,
  bitrate: '1M',
  gopSize: 60,
  options: {
    preset: 'fast',
    crf: 23,
  },
});

// Create output
console.log('Creating output:', outputFile);
await using output = await Muxer.open(outputFile);

// Add stream(s) to output
const outputVideoStreamIndex = output.addStream(encoder);
let outputAudioStreamIndex = -1;
if (audioStream) {
  outputAudioStreamIndex = output.addStream(audioStream);
}

// Process frames
console.log('Processing frames...');

for await (using packet of input.packets()) {
  if (!packet || packet.streamIndex === videoStream.index) {
    for await (using frame of decoder.frames(packet)) {
      for await (using encodedPacket of encoder.packets(frame)) {
        await output.writePacket(encodedPacket, outputVideoStreamIndex);
      }
    }
  }

  if (audioStream && (!packet || packet.streamIndex === audioStream.index)) {
    await output.writePacket(packet, outputAudioStreamIndex);
  }
}

console.log('Done!');
console.log(`Output: ${outputFile}`);
