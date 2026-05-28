/**
 * High-Level API Example: Hardware-Accelerated Raw Video Output
 *
 * Shows how to read video from an input file, process it with hardware acceleration, and output raw video in NV12 format.
 *
 * Usage: tsx examples/api-hw-raw-output.ts <input> <output>
 *
 * Options:
 *   --scale <WxH>    Scale video to WxH (default: 640x360)
 *   --fps <n>        Frame rate (default: 30)
 *
 * Examples:
 *   tsx examples/api-hw-raw-output.ts testdata/video.mp4 examples/.tmp/api-hw-raw-output.nv12
 *   tsx examples/api-hw-raw-output.ts testdata/video.mp4 output.nv12 --scale 1280x720 --fps 10
 */

import {
  AV_LOG_DEBUG,
  AV_PIX_FMT_NV12,
  Codec,
  Decoder,
  Demuxer,
  Encoder,
  FF_ENCODER_LIBX265,
  FF_ENCODER_RAWVIDEO,
  FilterAPI,
  FilterPreset,
  HardwareContext,
  Log,
  Muxer,
} from '../src/index.js';
import { prepareTestEnvironment } from './index.js';

// Parse command line arguments
const args = process.argv.slice(2);
const inputFile = args[0];
const outputFile = args[1];

if (!inputFile || !outputFile || inputFile.startsWith('--') || outputFile.startsWith('--')) {
  console.error('Usage: tsx examples/api-hw-raw-output.ts <input> <output> [options]');
  console.error('Options:');
  console.error('  --scale <WxH>    Scale video to WxH (default: 640x360)');
  console.error('  --fps <n>        Frame rate (default: 30)');
  process.exit(1);
}

// Parse options
const scaleIndex = args.indexOf('--scale');
let scaleWidth = 640;
let scaleHeight = 360;
if (scaleIndex !== -1) {
  const [w, h] = args[scaleIndex + 1].split('x');
  scaleWidth = parseInt(w);
  scaleHeight = parseInt(h);
}

const fpsIndex = args.indexOf('--fps');
const fps = fpsIndex !== -1 ? parseInt(args[fpsIndex + 1]) : 30;

const stop = false;

prepareTestEnvironment();
Log.setLevel(AV_LOG_DEBUG);

console.log(`Input: ${inputFile}`);
console.log(`Output: ${outputFile}`);
console.log(`Scale to: ${scaleWidth}x${scaleHeight}`);
console.log(`Frame rate: ${fps} fps`);

// Open input file
console.log('Opening input file...');
await using input = await Demuxer.open(inputFile);

// Get streams
const videoStream = input.video();
if (!videoStream) {
  throw new Error('No video stream found in input file');
}

// Display input information
console.log('Input Information:');
console.log(`Video: ${videoStream.codecpar.width}x${videoStream.codecpar.height}`);
console.log(`Codec: ${videoStream.codecpar.codecId}`);
console.log(`Format: ${videoStream.codecpar.format}`);
console.log(`Time base: ${videoStream.timeBase.num}/${videoStream.timeBase.den}`);
console.log(`Frame rate: ${videoStream.avgFrameRate.num}/${videoStream.avgFrameRate.den}`);

// Auto-detect hardware
console.log('Detecting hardware acceleration...');
using hardware = HardwareContext.auto();
if (hardware) {
  console.log(`Using hardware: ${hardware.deviceTypeName}`);
} else {
  console.log('No hardware acceleration available, using software');
}

// Create decoder
console.log('Creating video decoder...');
using decoder = await Decoder.create(videoStream, {
  hardware,
});

// Create filter
const filterChain = FilterPreset.chain(hardware).scale(scaleWidth, scaleHeight).hwdownload().format(AV_PIX_FMT_NV12).filter('fps', { fps }).build();
console.log(`Creating filter: ${filterChain}`);
using filter = FilterAPI.create(filterChain, {
  framerate: videoStream.avgFrameRate,
  hardware,
});

// Create encoder
const encoderCodec = hardware?.getEncoderCodec('hevc') ?? Codec.findEncoderByName(FF_ENCODER_LIBX265);
if (!encoderCodec) {
  throw new Error('No suitable encoder found');
}

console.log(`Creating encoder: ${encoderCodec.name}...`);
using encoder = await Encoder.create(FF_ENCODER_RAWVIDEO, {
  decoder,
  filter,
  bitrate: '2M',
  gopSize: 60,
});

// Create output
console.log('Creating output file...');
await using output = await Muxer.open(outputFile, {
  format: 'rawvideo',
});

// Add video stream
const videoOutputIndex = output.addStream(encoder);

// Process streams
console.log('Recording started...');
let videoPackets = 0;

// Create video processing pipeline
const videoInputGenerator = input.packets(videoStream.index);
const videoDecoderGenerator = decoder.frames(videoInputGenerator);
const videoFilterGenerator = filter.frames(videoDecoderGenerator);
const videoEncoderGenerator = encoder.packets(videoFilterGenerator);

for await (const packet of videoEncoderGenerator) {
  if (stop) break;
  await output.writePacket(packet, videoOutputIndex);
  videoPackets++;
}

console.log('Recording complete!');
console.log(`Video packets: ${videoPackets}`);
console.log(`Output file: ${outputFile}`);
if (hardware) {
  console.log(`Hardware used: ${hardware.deviceTypeName}`);
}
