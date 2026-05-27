/**
 * RTSP Backchannel Example - High Level API
 *
 * Demonstrates sending audio to an RTSP camera's backchannel (talkback).
 * Uses RTPStream to read any audio file, transcode to desired codec, and send
 * RTP packets to the camera's backchannel via the RTSP connection.
 *
 * Usage: tsx examples/api-rtsp-backchannel.ts <rtsp_url> [audio_file] [options]
 *
 * Options:
 *   --codec <codec>         Target codec: aac, aac-eld, pcmu, pcma, opus (default: auto from backchannel)
 *   --sample-rate <rate>    Target sample rate in Hz (default: auto from backchannel)
 *   --channels <n>          Number of channels (default: auto from backchannel)
 *
 * Examples:
 *   tsx examples/api-rtsp-backchannel.ts "rtsp://camera/stream"
 *   tsx examples/api-rtsp-backchannel.ts "rtsp://camera/stream" music.mp3 --codec pcmu --sample-rate 8000
 *   tsx examples/api-rtsp-backchannel.ts "rtsp://camera/stream" voice.wav --codec aac-eld --sample-rate 16000
 */

import { resolve } from 'path';

import { AV_CODEC_ID_AAC, AV_CODEC_ID_OPUS, AV_CODEC_ID_PCM_ALAW, AV_CODEC_ID_PCM_MULAW, AV_CODEC_ID_PCM_S16LE } from '../src/constants/constants.js';
import { FF_ENCODER_LIBFDK_AAC } from '../src/constants/encoders.js';
import { Dictionary, FFmpegError, FormatContext } from '../src/index.js';
import { RTPStream } from '../src/webrtc/index.js';

import type { RtpPacket } from 'werift';
import type { AVCodecID, FFAudioEncoder } from '../src/index.js';
import type { RTPStreamOptions } from '../src/webrtc/index.js';

// Codec name to ID mapping
const CODEC_MAP: Record<string, AVCodecID | FFAudioEncoder> = {
  aac: AV_CODEC_ID_AAC,
  'aac-eld': FF_ENCODER_LIBFDK_AAC, // AAC Enhanced Low Delay (requires libfdk_aac)
  pcmu: AV_CODEC_ID_PCM_MULAW,
  pcma: AV_CODEC_ID_PCM_ALAW,
  opus: AV_CODEC_ID_OPUS,
  pcm: AV_CODEC_ID_PCM_S16LE,
};

// Samples per frame for different codecs (for timing calculation)
const SAMPLES_PER_FRAME: Record<string, number> = {
  aac: 1024,
  'aac-eld': 480, // AAC-ELD uses 480 samples per frame
  pcmu: 160, // 20ms at 8kHz
  pcma: 160, // 20ms at 8kHz
  opus: 960, // 20ms at 48kHz (default)
  pcm: 160, // 20ms at 8kHz
};

interface BackchannelOptions {
  rtspUrl: string;
  audioFile: string;
  codec?: string;
  sampleRate?: number;
  channels?: number;
}

/**
 * Parse command line arguments
 */
function parseArgs(): BackchannelOptions {
  const args = process.argv.slice(2);

  if (args.length < 1 || args[0].startsWith('--')) {
    console.log('Usage: tsx examples/api-rtsp-backchannel.ts <rtsp_url> [audio_file] [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  rtsp_url              RTSP stream URL with backchannel enabled');
    console.log('  audio_file            Audio file to stream (default: testdata/audio.aac)');
    console.log('');
    console.log('Options:');
    console.log('  --codec <codec>       Target codec: aac, aac-eld, pcmu, pcma, opus, pcm');
    console.log('                        (default: auto-detect from backchannel)');
    console.log('  --sample-rate <rate>  Target sample rate in Hz (default: from backchannel)');
    console.log('  --channels <n>        Number of channels: 1 or 2 (default: from backchannel)');
    console.log('');
    console.log('Examples:');
    console.log('  # Use backchannel settings (auto-detect codec)');
    console.log('  tsx examples/api-rtsp-backchannel.ts "rtsp://camera/stream"');
    console.log('');
    console.log('  # Transcode MP3 to G.711 µ-law (common for IP cameras)');
    console.log('  tsx examples/api-rtsp-backchannel.ts "rtsp://camera/stream" music.mp3 --codec pcmu');
    console.log('');
    console.log('  # Transcode WAV to AAC at 16kHz');
    console.log('  tsx examples/api-rtsp-backchannel.ts "rtsp://camera/stream" voice.wav --codec aac --sample-rate 16000');
    console.log('');
    console.log('Supported codecs:');
    console.log('  aac     - AAC (MPEG-4)');
    console.log('  aac-eld - AAC Enhanced Low Delay (libfdk_aac, ultra-low latency)');
    console.log('  pcmu    - G.711 µ-law (common for VoIP/cameras)');
    console.log('  pcma    - G.711 A-law');
    console.log('  opus    - Opus (low latency)');
    console.log('  pcm     - Raw PCM S16LE');
    process.exit(1);
  }

  const rtspUrl = args[0];
  let audioFile = 'testdata/audio.aac';
  let codec: string | undefined;
  let sampleRate: number | undefined;
  let channels: number | undefined;

  // Check if second arg is a file or an option
  if (args[1] && !args[1].startsWith('--')) {
    audioFile = args[1];
  }

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--codec' && args[i + 1]) {
      codec = args[i + 1].toLowerCase();
      if (!CODEC_MAP[codec]) {
        console.error(`Unknown codec: ${codec}`);
        console.error(`Available codecs: ${Object.keys(CODEC_MAP).join(', ')}`);
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--sample-rate' && args[i + 1]) {
      sampleRate = parseInt(args[i + 1]);
      if (isNaN(sampleRate) || sampleRate < 8000 || sampleRate > 48000) {
        console.error('Sample rate must be between 8000 and 48000 Hz');
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--channels' && args[i + 1]) {
      channels = parseInt(args[i + 1]);
      if (isNaN(channels) || channels < 1 || channels > 2) {
        console.error('Channels must be 1 or 2');
        process.exit(1);
      }
      i++;
    }
  }

  return { rtspUrl, audioFile, codec, sampleRate, channels };
}

/**
 * Main backchannel streaming function
 */
async function streamToBackchannel(options: BackchannelOptions): Promise<void> {
  const { rtspUrl, audioFile, codec: requestedCodec, sampleRate: requestedSampleRate, channels: requestedChannels } = options;

  console.log('RTSP Backchannel Streaming Example');
  console.log('='.repeat(60));
  console.log(`RTSP URL: ${rtspUrl}`);
  console.log(`Audio file: ${audioFile}`);
  if (requestedCodec) console.log(`Requested codec: ${requestedCodec}`);
  if (requestedSampleRate) console.log(`Requested sample rate: ${requestedSampleRate}Hz`);
  if (requestedChannels) console.log(`Requested channels: ${requestedChannels}`);
  console.log('='.repeat(60));

  const audioPath = resolve(audioFile);

  // Open RTSP connection
  console.log('\nOpening RTSP connection...');
  const ctx = new FormatContext();

  const rtspOptions = {
    flags: 'low_delay',
    rtsp_transport: 'tcp',
    analyzeduration: 0,
    probesize: 32,
    timeout: 10000000,
  };

  const dict = Dictionary.fromObject(rtspOptions);

  let ret = await ctx.openInput(rtspUrl, null, dict);
  FFmpegError.throwIfError(ret, 'Failed to open RTSP stream');

  ret = await ctx.findStreamInfo();
  FFmpegError.throwIfError(ret, 'Failed to find stream info');

  console.log('✓ RTSP connection established');

  // Get RTSP stream info and find backchannel
  const rtspStreams = ctx.getRTSPStreamInfo();
  if (!rtspStreams || rtspStreams.length === 0) {
    await ctx.closeInput();
    throw new Error('No RTSP stream information available. Is this a valid RTSP URL?');
  }

  console.log(`\nFound ${rtspStreams.length} stream(s):`);
  for (const stream of rtspStreams) {
    console.log(`  Stream ${stream.streamIndex}: ${stream.mediaType} (${stream.direction}) - ${stream.mimeType}`);
  }

  // Find backchannel stream (sendonly audio)
  const backchannel = rtspStreams.find((s) => s.direction === 'sendonly' && s.mediaType === 'audio');

  if (!backchannel) {
    await ctx.closeInput();
    throw new Error('No backchannel stream found!');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✓ Backchannel stream found');
  console.log('='.repeat(60));
  console.log(`Stream Index: ${backchannel.streamIndex}`);
  console.log(`Transport: ${backchannel.transport}`);
  console.log(`Codec: ${backchannel.mimeType}`);
  console.log(`Payload Type: ${backchannel.payloadType}`);
  if (backchannel.sampleRate) {
    console.log(`Audio Format: ${backchannel.sampleRate}Hz, ${backchannel.channels} channel(s)`);
  }

  // Determine target codec - use requested or detect from backchannel MIME type
  let targetCodec: AVCodecID | FFAudioEncoder;
  let codecName: string;

  if (requestedCodec) {
    targetCodec = CODEC_MAP[requestedCodec];
    codecName = requestedCodec;
  } else {
    // Auto-detect from backchannel MIME type
    const mimeType = backchannel.mimeType?.toUpperCase() ?? '';
    if (mimeType.includes('PCMU') || mimeType.includes('G711U')) {
      targetCodec = AV_CODEC_ID_PCM_MULAW;
      codecName = 'pcmu';
    } else if (mimeType.includes('PCMA') || mimeType.includes('G711A')) {
      targetCodec = AV_CODEC_ID_PCM_ALAW;
      codecName = 'pcma';
    } else if (mimeType.includes('OPUS')) {
      targetCodec = AV_CODEC_ID_OPUS;
      codecName = 'opus';
    } else if (mimeType.includes('MPEG4-GENERIC') || mimeType.includes('AAC')) {
      targetCodec = AV_CODEC_ID_AAC;
      codecName = 'aac';
    } else {
      // Default to AAC
      targetCodec = AV_CODEC_ID_AAC;
      codecName = 'aac';
    }
    console.log(`\nAuto-detected codec from backchannel: ${codecName}`);
  }

  // Determine sample rate and channels
  const targetSampleRate = requestedSampleRate ?? backchannel.sampleRate ?? 8000;
  const targetChannels = requestedChannels ?? backchannel.channels ?? 1;

  console.log('\nTarget configuration:');
  console.log(`  Codec: ${codecName}`);
  console.log(`  Sample Rate: ${targetSampleRate}Hz`);
  console.log(`  Channels: ${targetChannels}`);

  // Collect RTP packets from RTPStream
  const collectedPackets: RtpPacket[] = [];

  // Create RTPStream to read audio file, transcode, and get RTP packets
  console.log('\nCreating RTPStream for audio file...');

  // Configure audio options
  const audioConfig: RTPStreamOptions['audio'] = {
    payloadType: backchannel.payloadType,
    sampleRate: targetSampleRate,
    channels: targetChannels,
  };

  // Add encoder options for AAC-ELD (profile: aac_eld)
  if (codecName === 'aac-eld') {
    audioConfig.encoderOptions = {
      profile: 'aac_eld', // Enhanced Low Delay profile
    };
  }

  const rtpStream = RTPStream.create(audioPath, {
    // Target codec for transcoding
    supportedAudioCodecs: [targetCodec],
    // Configure audio parameters
    audio: audioConfig,
    // Collect RTP packets (FFmpeg outputs them all at once for files)
    onAudioPacket: (rtpPacket) => {
      collectedPackets.push(rtpPacket.clone());
    },
    onClose: (error) => {
      if (error) {
        console.error('\n✗ RTPStream closed with error:', error.message);
      }
    },
  });

  console.log('✓ RTPStream created');

  // Start streaming and wait for all packets to be collected
  await rtpStream.start();

  const input = rtpStream.getInput();
  if (input) {
    console.log(`\nInput file: ${input.formatName} (${input.duration.toFixed(2)}s)`);
    const audioStream = input.audio();
    if (audioStream) {
      console.log(
        `  Source: ${audioStream.codecpar.codecTagString ?? audioStream.codecpar.codecId} ` + `${audioStream.codecpar.sampleRate}Hz ${audioStream.codecpar.channels}ch`,
      );
    }
  }

  // Wait for RTPStream to finish collecting all packets
  while (rtpStream.isStreamActive) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  await rtpStream.stop();

  console.log(`✓ Collected ${collectedPackets.length} RTP packets`);

  if (collectedPackets.length === 0) {
    await ctx.closeInput();
    throw new Error('No RTP packets collected from audio file');
  }

  // Calculate frame duration based on codec and sample rate
  const samplesPerFrame = SAMPLES_PER_FRAME[codecName] ?? 160;
  const frameDurationMs = (samplesPerFrame / targetSampleRate) * 1000;
  console.log(`Frame duration: ${frameDurationMs.toFixed(1)}ms (${samplesPerFrame} samples @ ${targetSampleRate}Hz)`);

  console.log('\n' + '='.repeat(60));
  console.log('Starting backchannel streaming with real-time pacing...');
  console.log('='.repeat(60));

  // Now send packets with proper timing
  let packetsSent = 0;
  let bytesSent = 0;
  const startTime = Date.now();

  for (let i = 0; i < collectedPackets.length; i++) {
    const rtpPacket = collectedPackets[i];
    const rtpData = rtpPacket.serialize();
    const isLast = i === collectedPackets.length - 1;

    try {
      const result = ctx.sendRTSPPacketSync(backchannel.streamIndex, rtpData);
      if (result < 0) {
        console.error(`Warning: sendRTSPPacket returned ${result}`);
      } else {
        packetsSent++;
        bytesSent += rtpData.length;

        // Log progress every 10 packets
        if (packetsSent % 10 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          console.log(
            `Sent ${packetsSent}/${collectedPackets.length} packets (${elapsed.toFixed(1)}s) - ` +
              // eslint-disable-next-line @stylistic/indent-binary-ops
              `seq=${rtpPacket.header.sequenceNumber} ts=${rtpPacket.header.timestamp}`,
          );
        }
      }
    } catch (error) {
      console.error(`Error sending packet: ${error}`);
      break;
    }

    // Wait for frame duration to maintain real-time pacing (except for last packet)
    if (!isLast) {
      await new Promise((resolve) => setTimeout(resolve, frameDurationMs));
    }
  }

  const elapsed = (Date.now() - startTime) / 1000;

  console.log('\n' + '='.repeat(60));
  console.log('Streaming complete');
  console.log('='.repeat(60));
  console.log(`Duration: ${elapsed.toFixed(2)}s`);
  console.log(`Packets sent: ${packetsSent}`);
  console.log(`Bytes sent: ${bytesSent}`);
  if (elapsed > 0) {
    console.log(`Average bitrate: ${((bytesSent * 8) / elapsed / 1000).toFixed(2)} kbps`);
  }

  // Close RTSP connection
  await ctx.closeInput();
  console.log('\n✓ RTSP connection closed');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const options = parseArgs();

  // Validate RTSP URL
  if (!options.rtspUrl.toLowerCase().startsWith('rtsp://')) {
    console.error('Error: URL must start with rtsp://');
    process.exit(1);
  }

  try {
    await streamToBackchannel(options);
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    if (error instanceof FFmpegError) {
      console.error(`FFmpeg Error: ${error.message} (code: ${error.code})`);
    } else {
      console.error('Error:', error instanceof Error ? error.message : error);
    }
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);
