/**
 * High-Level API Example: Pipeline API with Raw Media Muxing
 *
 * Shows how to use the Pipeline API to process raw video and audio data.
 * Demonstrates muxing separate raw streams into a single output file.
 *
 * Usage: tsx examples/api-pipeline-raw-muxing.ts <video.yuv> <audio.pcm> <output>
 *
 * Options:
 *   --video-size <WxH>    Video dimensions (default: 1280x720)
 *   --video-fps <n>       Video frame rate (default: 30)
 *   --audio-rate <n>      Audio sample rate (default: 48000)
 *   --audio-channels <n>  Audio channels (default: 2)
 *
 * Examples:
 *   tsx examples/api-pipeline-raw-muxing.ts testdata/input.yuv testdata/audio.pcm examples/.tmp/api-pipeline-raw-muxed.mp4
 *   tsx examples/api-pipeline-raw-muxing.ts video.yuv audio.pcm output.mp4 --video-size 1920x1080
 *   tsx examples/api-pipeline-raw-muxing.ts raw.yuv raw.pcm out.mp4 --video-fps 60 --audio-rate 44100
 */

import { Decoder, Demuxer, Encoder, FilterAPI, FilterPreset, Muxer, pipeline } from '../src/api/index.js';
import { AV_LOG_DEBUG, AV_PIX_FMT_YUV420P, AV_SAMPLE_FMT_FLTP, AV_SAMPLE_FMT_S16, FF_ENCODER_AAC, FF_ENCODER_LIBX264, Log } from '../src/index.js';
import { prepareTestEnvironment } from './index.js';

// Parse command line arguments
const args = process.argv.slice(2);
const videoFile = args[0];
const audioFile = args[1];
const outputFile = args[2];

if (!videoFile || !audioFile || !outputFile || videoFile.startsWith('--') || audioFile.startsWith('--') || outputFile.startsWith('--')) {
  console.error('Usage: tsx examples/api-pipeline-raw-muxing.ts <video.yuv> <audio.pcm> <output> [options]');
  console.error('Options:');
  console.error('  --video-size <WxH>    Video dimensions (default: 1280x720)');
  console.error('  --video-fps <n>       Video frame rate (default: 30)');
  console.error('  --audio-rate <n>      Audio sample rate (default: 48000)');
  console.error('  --audio-channels <n>  Audio channels (default: 2)');
  process.exit(1);
}

// Parse video options
const videoSizeIndex = args.indexOf('--video-size');
let videoWidth = 1280;
let videoHeight = 720;
if (videoSizeIndex !== -1) {
  const [w, h] = args[videoSizeIndex + 1].split('x');
  videoWidth = parseInt(w);
  videoHeight = parseInt(h);
}

const videoFpsIndex = args.indexOf('--video-fps');
const videoFps = videoFpsIndex !== -1 ? parseInt(args[videoFpsIndex + 1]) : 30;

// Parse audio options
const audioRateIndex = args.indexOf('--audio-rate');
const audioRate = audioRateIndex !== -1 ? parseInt(args[audioRateIndex + 1]) : 48000;

const audioChannelsIndex = args.indexOf('--audio-channels');
const audioChannels = audioChannelsIndex !== -1 ? parseInt(args[audioChannelsIndex + 1]) : 2;

prepareTestEnvironment();
Log.setLevel(AV_LOG_DEBUG);

console.log(`Video input: ${videoFile} (${videoWidth}x${videoHeight} @ ${videoFps}fps)`);
console.log(`Audio input: ${audioFile} (${audioRate}Hz, ${audioChannels} channels)`);
console.log(`Output: ${outputFile}`);

// Open raw YUV video
console.log('Opening raw video input...');
await using videoInput = await Demuxer.open({
  type: 'video',
  input: videoFile,
  width: videoWidth,
  height: videoHeight,
  pixelFormat: AV_PIX_FMT_YUV420P,
  frameRate: { num: videoFps, den: 1 },
});

// Open raw PCM audio
console.log('Opening raw audio input...');
await using audioInput = await Demuxer.open(
  {
    type: 'audio',
    input: audioFile,
    sampleRate: audioRate,
    channels: audioChannels,
    sampleFormat: AV_SAMPLE_FMT_S16,
  },
  {
    format: 's16le', // Specify raw audio format
  },
);

// Create output
console.log('Creating output file...');
await using output = await Muxer.open(outputFile);

// Get streams
const videoStream = videoInput.video();
const audioStream = audioInput.audio();

if (!videoStream || !audioStream) {
  throw new Error('Missing streams');
}

console.log('Stream Information:');
console.log(`Video: ${videoStream.codecpar.width}x${videoStream.codecpar.height}, codec: ${videoStream.codecpar.codecId}`);
console.log(`Audio: ${audioStream.codecpar.sampleRate}Hz, ${audioStream.codecpar.channels} channels, codec: ${audioStream.codecpar.codecId}`);

// Create decoders
console.log('Creating decoders...');
using videoDecoder = await Decoder.create(videoStream);
using audioDecoder = await Decoder.create(audioStream);

// Create encoders
console.log('Creating encoders...');
using videoEncoder = await Encoder.create(FF_ENCODER_LIBX264, {
  decoder: videoDecoder,
  bitrate: '2M',
  gopSize: 60,
  options: {
    preset: 'fast',
    crf: 23,
  },
});

using audioEncoder = await Encoder.create(FF_ENCODER_AAC, {
  decoder: audioDecoder,
  bitrate: '192k',
});

// Create audio filter to handle frame size and format conversion
console.log('Creating audio filter for format conversion...');
const filterChain = FilterPreset.chain().aformat([AV_SAMPLE_FMT_FLTP], 48000, 'stereo').filter('asetnsamples', { n: 1024 }).build();
using audioFilter = FilterAPI.create(filterChain);

// Process with pipeline
console.log('Setting up muxing pipeline...');
const pipelineControl = pipeline(
  { video: videoInput, audio: audioInput },
  {
    video: [videoDecoder, videoEncoder],
    audio: [audioDecoder, audioFilter, audioEncoder],
  },
  output,
);

console.log('Processing media...');
const startTime = Date.now();

await pipelineControl.completion;

const elapsed = (Date.now() - startTime) / 1000;

console.log('Processing complete!');
console.log(`Time: ${elapsed.toFixed(2)} seconds`);
console.log(`Output file: ${outputFile}`);
console.log(`Video: H.264 ${videoWidth}x${videoHeight} @ ${videoFps}fps`);
console.log(`Audio: AAC ${audioRate}Hz, ${audioChannels} channels`);
