/* eslint-disable @stylistic/indent-binary-ops */
/**
 * High-Level API Example: RTP Streaming
 *
 * Shows how to create RTP streams from RTSP/file sources for real-time streaming.
 * Demonstrates RTP packet handling, codec negotiation, and hardware-accelerated transcoding.
 * Perfect for building WebRTC servers, SIP/VoIP systems, or custom RTP streaming solutions.
 *
 * Usage: tsx examples/api-rtp.ts <input> [options]
 *
 * Options:
 *   --duration <n>       Recording duration in seconds (default: 10)
 *   --video-codec <id>   Video codec (h264, h265, vp8, vp9, av1) (default: h264)
 *   --audio-codec <id>   Audio codec (opus, pcmu, pcma, aac) (default: opus)
 *   --video-mtu <n>      Video MTU size in bytes (default: 1200)
 *   --audio-mtu <n>      Audio MTU size in bytes (default: 1200)
 *   --video-ssrc <n>     Video SSRC (default: random)
 *   --audio-ssrc <n>     Audio SSRC (default: random)
 *   --video-pt <n>       Video payload type (default: auto)
 *   --audio-pt <n>       Audio payload type (default: auto)
 *   --fps <n>            Target FPS for video (default: auto)
 *   --hw                 Enable hardware acceleration (auto-detect)
 *
 * Examples:
 *   tsx examples/api-rtp.ts rtsp://camera.local/stream
 *   tsx examples/api-rtp.ts rtsp://admin:pass@192.168.1.100/ch1 --duration 30 --hw
 *   tsx examples/api-rtp.ts testdata/video.mp4 --video-codec h264 --audio-codec opus
 *   tsx examples/api-rtp.ts rtsp://server/live --video-mtu 1400 --fps 30
 */

import { AV_CODEC_ID_H264, AV_CODEC_ID_HEVC, AV_CODEC_ID_OPUS, AV_CODEC_ID_VP8, AV_CODEC_ID_VP9, AV_HWDEVICE_TYPE_NONE } from '../src/constants/constants.js';
import { FF_ENCODER_LIBOPUS, FF_ENCODER_LIBVPX_VP8, FF_ENCODER_LIBVPX_VP9, FF_ENCODER_LIBX264, FF_ENCODER_LIBX265 } from '../src/constants/encoders.js';
import { RTPStream } from '../src/webrtc/index.js';
import { prepareTestEnvironment } from './index.js';

import type { RtpPacket } from 'werift';
import type { AVCodecID, FFAudioEncoder, FFVideoEncoder } from '../src/index.js';

// Parse command line arguments
const args = process.argv.slice(2);
const inputUrl = args[0];

if (!inputUrl || inputUrl.startsWith('--')) {
  console.error('Usage: tsx examples/api-rtp.ts <input> [options]');
  console.error('Options:');
  console.error('  --duration <n>       Recording duration in seconds (default: 10)');
  console.error('  --video-codec <id>   Video codec (h264, h265, vp8, vp9, av1) (default: h264)');
  console.error('  --audio-codec <id>   Audio codec (opus, pcmu, pcma, aac) (default: opus)');
  console.error('  --video-mtu <n>      Video MTU size in bytes (default: 1200)');
  console.error('  --audio-mtu <n>      Audio MTU size in bytes (default: 1200)');
  console.error('  --video-ssrc <n>     Video SSRC (default: random)');
  console.error('  --audio-ssrc <n>     Audio SSRC (default: random)');
  console.error('  --video-pt <n>       Video payload type (default: auto)');
  console.error('  --audio-pt <n>       Audio payload type (default: auto)');
  console.error('  --fps <n>            Target FPS for video (default: auto)');
  console.error('  --hw                 Enable hardware acceleration (auto-detect)');
  process.exit(1);
}

// Parse options
const durationIndex = args.indexOf('--duration');
const duration = durationIndex !== -1 ? parseInt(args[durationIndex + 1]) : 10;

const videoCodecIndex = args.indexOf('--video-codec');
const videoCodecName = videoCodecIndex !== -1 ? args[videoCodecIndex + 1].toLowerCase() : 'h264';

const audioCodecIndex = args.indexOf('--audio-codec');
const audioCodecName = audioCodecIndex !== -1 ? args[audioCodecIndex + 1].toLowerCase() : 'opus';

const videoMtuIndex = args.indexOf('--video-mtu');
const videoMtu = videoMtuIndex !== -1 ? parseInt(args[videoMtuIndex + 1]) : 1200;

const audioMtuIndex = args.indexOf('--audio-mtu');
const audioMtu = audioMtuIndex !== -1 ? parseInt(args[audioMtuIndex + 1]) : 1200;

const videoSsrcIndex = args.indexOf('--video-ssrc');
const videoSsrc = videoSsrcIndex !== -1 ? parseInt(args[videoSsrcIndex + 1]) : undefined;

const audioSsrcIndex = args.indexOf('--audio-ssrc');
const audioSsrc = audioSsrcIndex !== -1 ? parseInt(args[audioSsrcIndex + 1]) : undefined;

const videoPtIndex = args.indexOf('--video-pt');
const videoPayloadType = videoPtIndex !== -1 ? parseInt(args[videoPtIndex + 1]) : undefined;

const audioPtIndex = args.indexOf('--audio-pt');
const audioPayloadType = audioPtIndex !== -1 ? parseInt(args[audioPtIndex + 1]) : undefined;

const fpsIndex = args.indexOf('--fps');
const fps = fpsIndex !== -1 ? parseInt(args[fpsIndex + 1]) : undefined;

const useHardware = args.includes('--hw');

// Map codec names to codec IDs/names
const videoCodecMap: Record<string, AVCodecID | FFVideoEncoder> = {
  h264: AV_CODEC_ID_H264,
  x264: FF_ENCODER_LIBX264,
  h265: AV_CODEC_ID_HEVC,
  hevc: AV_CODEC_ID_HEVC,
  x265: FF_ENCODER_LIBX265,
  vp8: AV_CODEC_ID_VP8,
  libvpx_vp8: FF_ENCODER_LIBVPX_VP8,
  vp9: AV_CODEC_ID_VP9,
  libvpx_vp9: FF_ENCODER_LIBVPX_VP9,
  av1: 'av1' as any,
};

const audioCodecMap: Record<string, AVCodecID | FFAudioEncoder> = {
  opus: AV_CODEC_ID_OPUS,
  libopus: FF_ENCODER_LIBOPUS,
  aac: 'aac' as any,
  pcmu: 'pcm_mulaw' as any,
  pcma: 'pcm_alaw' as any,
};

const videoCodec = videoCodecMap[videoCodecName];
const audioCodec = audioCodecMap[audioCodecName];

if (!videoCodec) {
  console.error(`Unknown video codec: ${videoCodecName}`);
  console.error('Available codecs: h264, h265, vp8, vp9, av1');
  process.exit(1);
}

if (!audioCodec) {
  console.error(`Unknown audio codec: ${audioCodecName}`);
  console.error('Available codecs: opus, aac, pcmu, pcma');
  process.exit(1);
}

prepareTestEnvironment();

console.log('='.repeat(60));
console.log('RTP Streaming Example');
console.log('='.repeat(60));
console.log(`Input: ${inputUrl}`);
console.log(`Duration: ${duration} seconds`);
console.log(`Video codec: ${videoCodecName} (${typeof videoCodec === 'string' ? videoCodec : videoCodec})`);
console.log(`Audio codec: ${audioCodecName} (${typeof audioCodec === 'string' ? audioCodec : audioCodec})`);
console.log(`Video MTU: ${videoMtu} bytes`);
console.log(`Audio MTU: ${audioMtu} bytes`);
console.log(`Video SSRC: ${videoSsrc ?? 'random'}`);
console.log(`Audio SSRC: ${audioSsrc ?? 'random'}`);
console.log(`Video payload type: ${videoPayloadType ?? 'auto'}`);
console.log(`Audio payload type: ${audioPayloadType ?? 'auto'}`);
console.log(`Target FPS: ${fps ?? 'auto'}`);
console.log(`Hardware acceleration: ${useHardware ? 'Enabled (auto-detect)' : 'Disabled'}`);
console.log('='.repeat(60));

let stop = false;
let videoPacketCount = 0;
let audioPacketCount = 0;
let startTime = Date.now();

console.log('\nCreating RTP stream...');

const onVideoPacket = (packet: RtpPacket) => {
  if (stop) return;

  videoPacketCount++;
  console.log(
    `Video Packet [#${videoPacketCount}]: seq=${packet.header.sequenceNumber} ts=${packet.header.timestamp} pt=${packet.header.payloadType} ssrc=${packet.header.ssrc}`,
  );
};

const onAudioPacket = (packet: RtpPacket) => {
  if (stop) return;

  audioPacketCount++;
  console.log(
    `Audio Packet [#${audioPacketCount}]: seq=${packet.header.sequenceNumber} ts=${packet.header.timestamp} pt=${packet.header.payloadType} ssrc=${packet.header.ssrc}`,
  );
};

const onClose = (error?: Error) => {
  if (error) {
    console.error('\n✗ Stream closed with error:', error.message);
  } else {
    console.log('\n✓ Stream closed gracefully');
  }
};

const stream = RTPStream.create(inputUrl, {
  supportedVideoCodecs: [videoCodec],
  supportedAudioCodecs: [audioCodec],
  hardware: useHardware ? 'auto' : { deviceType: AV_HWDEVICE_TYPE_NONE },
  video: {
    ssrc: videoSsrc,
    payloadType: videoPayloadType,
    mtu: videoMtu,
    fps,
  },
  audio: {
    ssrc: audioSsrc,
    payloadType: audioPayloadType,
    mtu: audioMtu,
  },
  onVideoPacket,
  onAudioPacket,
  onClose,
});

console.log('\nStarting stream...');
console.log('Press Ctrl+C to stop\n');

// Reset start time after stream starts
startTime = Date.now();

// Start streaming (returns immediately)
await stream.start();

const input = stream.getInput();
if (input) {
  console.log(`✓ Input opened: ${input.formatName} (${input.duration}s, ${(input.bitRate / 1000).toFixed(0)} kbps)`);
  const videoStream = input.video();
  const audioStream = input.audio();
  if (videoStream) {
    console.log(
      `  Video: ${videoStream.codecpar.codecTagString ?? videoStream.codecpar.codecId} ${videoStream.codecpar.width}x${videoStream.codecpar.height} ` +
        `@ ${(videoStream.avgFrameRate.num / videoStream.avgFrameRate.den).toFixed(1)} fps`,
    );
  }
  if (audioStream) {
    console.log(
      `  Audio: ${audioStream.codecpar.codecTagString ?? audioStream.codecpar.codecId} ${audioStream.codecpar.sampleRate}Hz ` + `${audioStream.codecpar.channels}ch`,
    );
  }
  console.log();
}

// Wait for duration or SIGINT
await new Promise<void>((resolve) => {
  // Set up timeout for recording duration
  const timeout = setTimeout(async () => {
    console.log(`\nDuration reached (${duration}s), stopping...`);
    stop = true;
    await stream.stop();
    resolve();
  }, duration * 1000);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, stopping...');
    stop = true;
    clearTimeout(timeout);
    await stream.stop();
    resolve();
  });
});

// Print final statistics
const elapsed = (Date.now() - startTime) / 1000;
console.log('\n' + '='.repeat(60));
console.log('Final Statistics');
console.log('='.repeat(60));
console.log(`Duration: ${elapsed.toFixed(1)}s`);
console.log(`Video packets: ${videoPacketCount}`);
console.log(`Audio packets: ${audioPacketCount}`);
console.log(`Total packets: ${videoPacketCount + audioPacketCount}`);
console.log('='.repeat(60));
