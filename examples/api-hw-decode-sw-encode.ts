/**
 * Hardware Decode + Software Encode Example
 *
 * This example demonstrates:
 * - Hardware-accelerated decoding (GPU)
 * - Software encoding (CPU)
 * - Frame transfer from GPU to CPU memory
 *
 * Use case: When you need hardware decoding speed but want
 * software encoder quality/flexibility (e.g., x264 with specific settings)
 *
 * Usage: tsx api-hw-decode-sw-encode.ts <input> <output>
 * Example: tsx examples/api-hw-decode-sw-encode.ts testdata/video.mp4 examples/.tmp/api-hw-decode-sw-encode.mp4
 */

import {
  AV_LOG_DEBUG,
  AV_PIX_FMT_NV12,
  AV_PIX_FMT_YUV420P,
  Decoder,
  Demuxer,
  Encoder,
  FF_ENCODER_LIBX264,
  FilterAPI,
  FilterPreset,
  HardwareContext,
  Log,
  Muxer,
} from '../src/index.js';
import { prepareTestEnvironment } from './index.js';

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.log('Usage: tsx api-hw-decode-sw-encode.ts <input> <output>');
  process.exit(1);
}

prepareTestEnvironment();
Log.setLevel(AV_LOG_DEBUG);

// Check for hardware availability
console.log('Checking for hardware acceleration...');
using hw = HardwareContext.auto();
if (!hw) {
  throw new Error('No hardware acceleration available! This example requires hardware acceleration for decoding.');
}

console.log(`Hardware detected: ${hw.deviceTypeName}`);

// Open input file
await using input = await Demuxer.open(inputFile);

const audioStream = input.audio();
const videoStream = input.video();
if (!videoStream) {
  throw new Error('No video stream found in input file');
}

console.log(`Input video: ${videoStream.codecpar.width}x${videoStream.codecpar.height} ${videoStream.codecpar.codecId}`);
if (audioStream) {
  console.log(`Input audio: ${audioStream.codecpar.sampleRate}Hz ${audioStream.codecpar.channels}ch ${audioStream.codecpar.codecId}`);
}

// Create hardware decoder
console.log('Setting up hardware decoder...');
const decoder = await Decoder.create(videoStream, {
  hardware: hw,
});

// Create filter to convert from hardware to software format
console.log('Setting up format conversion filter...');
const filterChain = FilterPreset.chain(hw).hwdownload().format([AV_PIX_FMT_NV12, AV_PIX_FMT_YUV420P]).build();
using filter = FilterAPI.create(filterChain, {
  framerate: videoStream.avgFrameRate,
  hardware: hw,
});

// Create software encoder (CPU)
console.log('Setting up software encoder...');
using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
  decoder,
  filter,
  options: {
    preset: 'medium',
    crf: 23,
  },
});

// Create output using Muxer
await using output = await Muxer.open(outputFile);
const outputVideoStreamIndex = output.addStream(encoder);
const outputAudioStreamIndex = audioStream ? output.addStream(audioStream) : -1;

// Process video
console.log('Processing video...');

let frameCount = 0;
const startTime = Date.now();

for await (using packet of input.packets()) {
  // Handle video packets and EOF
  if (!packet || packet.streamIndex === videoStream.index) {
    // Hardware decode → CPU transfer → Software encode
    for await (using frame of decoder.frames(packet)) {
      // Convert from hardware to CPU format (null passes through to flush filter)
      for await (using cpuFrame of filter.frames(frame)) {
        if (cpuFrame) frameCount++;

        // Software encode (null passes through to flush encoder)
        for await (using encodedPacket of encoder.packets(cpuFrame)) {
          await output.writePacket(encodedPacket, outputVideoStreamIndex);
        }

        // Progress indicator
        if (frameCount % 30 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const fps = frameCount / elapsed;
          console.log(`Processed ${frameCount} frames @ ${fps.toFixed(1)} fps`);
        }
      }
    }
  }

  // Handle audio packets (passthrough)
  if (audioStream && (!packet || packet.streamIndex === audioStream.index)) {
    await output.writePacket(packet, outputAudioStreamIndex);
  }
}

const elapsed = (Date.now() - startTime) / 1000;
console.log('Done!');
console.log(`Total frames: ${frameCount}`);
console.log(`Total time: ${elapsed.toFixed(2)}s`);
console.log(`Average FPS: ${(frameCount / elapsed).toFixed(1)}`);
