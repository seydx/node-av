/**
 * Encode Audio Example - Low Level API
 *
 * Port of FFmpeg's doc/examples/encode_audio.c
 * Generate a synthetic audio signal and encode it to an output MP2 file.
 *
 * Usage: tsx examples/encode-audio.ts <output>
 * Example: tsx examples/encode-audio.ts examples/.tmp/encode_audio.mp2
 *
 * The output can be played with:
 * ffplay output.mp2
 */

import { closeSync, openSync, writeSync } from 'node:fs';

import {
  AV_CHANNEL_LAYOUT_STEREO,
  AV_CODEC_ID_MP2,
  AV_SAMPLE_FMT_S16,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  Codec,
  CodecContext,
  FFmpegError,
  Frame,
  Packet,
} from '../src/index.js';

import type { AVSampleFormat, ChannelLayout } from '../src/index.js';

/**
 * Check that a given sample format is supported by the encoder
 */
function checkSampleFormat(codec: Codec, sampleFormat: AVSampleFormat): boolean {
  const supportedFormats = codec.sampleFormats;
  if (!supportedFormats) {
    return false;
  }

  for (const fmt of supportedFormats) {
    if (fmt === sampleFormat) {
      return true;
    }
  }
  return false;
}

/**
 * Select the best supported sample rate (closest to 44100 Hz)
 */
function selectSampleRate(codec: Codec): number {
  const supportedRates = codec.supportedSamplerates;
  if (!supportedRates || supportedRates.length === 0) {
    return 44100;
  }

  let bestSampleRate = 0;
  for (const rate of supportedRates) {
    if (!bestSampleRate || Math.abs(44100 - rate) < Math.abs(44100 - bestSampleRate)) {
      bestSampleRate = rate;
    }
  }
  return bestSampleRate;
}

/**
 * Select layout with the highest channel count
 */
function selectChannelLayout(codec: Codec): ChannelLayout {
  const supportedLayouts = codec.channelLayouts;
  if (!supportedLayouts || supportedLayouts.length === 0) {
    // Default to stereo
    return AV_CHANNEL_LAYOUT_STEREO;
  }

  let bestLayout = supportedLayouts[0];
  let bestChannelCount = bestLayout.nbChannels;

  for (const layout of supportedLayouts) {
    if (layout.nbChannels > bestChannelCount) {
      bestLayout = layout;
      bestChannelCount = layout.nbChannels;
    }
  }

  return bestLayout;
}

/**
 * Encode one frame and write packets to file
 */
async function encode(ctx: CodecContext, frame: Frame | null, pkt: Packet, outfile: number): Promise<void> {
  // Send the frame for encoding
  const sendRet = await ctx.sendFrame(frame);
  FFmpegError.throwIfError(sendRet, 'Error sending the frame to the encoder');

  // Read all the available output packets
  while (true) {
    const ret = await ctx.receivePacket(pkt);
    if (FFmpegError.is(ret, AVERROR_EAGAIN) || FFmpegError.is(ret, AVERROR_EOF)) {
      return;
    }
    FFmpegError.throwIfError(ret, 'Error encoding audio frame');

    const data = pkt.data;
    if (data) {
      writeSync(outfile, data);
    }
    pkt.unref();
  }
}

/**
 * Main encode audio function
 */
async function encodeAudio(filename: string): Promise<void> {
  let codec: Codec | null = null;
  let codecCtx: CodecContext | null = null;
  let packet: Packet | null = null;
  let frame: Frame | null = null;
  let outfile: number | null = null;

  try {
    // Find the MP2 encoder
    codec = Codec.findEncoder(AV_CODEC_ID_MP2);
    if (!codec) {
      throw new Error('MP2 codec not found');
    }

    // Allocate codec context
    codecCtx = new CodecContext();
    codecCtx.allocContext3(codec);

    // Set sample parameters
    codecCtx.bitRate = 64000n;

    // Check that the encoder supports s16 pcm input
    codecCtx.sampleFormat = AV_SAMPLE_FMT_S16;
    if (!checkSampleFormat(codec, codecCtx.sampleFormat)) {
      throw new Error('Encoder does not support sample format S16');
    }

    // Select other audio parameters supported by the encoder
    codecCtx.sampleRate = selectSampleRate(codec);
    codecCtx.channelLayout = selectChannelLayout(codec);

    // Open codec
    const openRet = await codecCtx.open2(codec, null);
    FFmpegError.throwIfError(openRet, 'Could not open codec');

    // Open output file
    outfile = openSync(filename, 'w');

    // Allocate packet for holding encoded output
    packet = new Packet();
    packet.alloc();

    // Allocate frame containing input raw audio
    frame = new Frame();
    frame.alloc();
    frame.nbSamples = codecCtx.frameSize;
    frame.format = codecCtx.sampleFormat;
    frame.channelLayout = codecCtx.channelLayout;

    // Allocate the data buffers
    const bufferRet = frame.getBuffer(0);
    FFmpegError.throwIfError(bufferRet, 'Could not allocate audio data buffers');

    // Generate a single tone sound (440 Hz - A4 note)
    let t = 0;
    const sampleRate = codecCtx.sampleRate;
    const tincr = (2 * Math.PI * 440.0) / sampleRate;
    const nbChannels = codecCtx.channelLayout?.nbChannels || 2;

    console.log('Encoding with:');
    console.log(`  Sample rate: ${sampleRate} Hz`);
    console.log(`  Channels: ${nbChannels}`);
    console.log(`  Frame size: ${codecCtx.frameSize} samples`);
    console.log(`  Bit rate: ${codecCtx.bitRate} bps`);

    // Encode 200 frames (approximately 4 seconds at 44100 Hz with 1024 samples per frame)
    for (let i = 0; i < 200; i++) {
      // Make sure the frame is writable
      const writableRet = frame.makeWritable();
      FFmpegError.throwIfError(writableRet, 'Could not make frame writable');

      const frameData = frame.data;
      if (!frameData?.[0]) {
        throw new Error('Frame data not allocated');
      }

      // Generate samples (interleaved for S16)
      // S16 is signed 16-bit little-endian
      const samples = new Int16Array(frameData[0].buffer, frameData[0].byteOffset, frameData[0].byteLength / 2);

      for (let j = 0; j < codecCtx.frameSize; j++) {
        const sampleValue = Math.round(Math.sin(t) * 10000);

        // Write to all channels (interleaved)
        for (let k = 0; k < nbChannels; k++) {
          samples[j * nbChannels + k] = sampleValue;
        }

        t += tincr;
      }

      // Set presentation timestamp
      frame.pts = BigInt(i * codecCtx.frameSize);

      // Encode the frame
      await encode(codecCtx, frame, packet, outfile);
    }

    // Flush the encoder
    console.log('Flushing encoder...');
    await encode(codecCtx, null, packet, outfile);

    console.log('Audio encoding completed successfully!');
    console.log(`Output written to: ${filename}`);
    console.log('You can play it with:');
    console.log(`  ffplay ${filename}`);
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  } finally {
    // Cleanup
    if (outfile !== null) {
      closeSync(outfile);
    }
    if (frame) {
      frame.free();
    }
    if (packet) {
      packet.free();
    }
    if (codecCtx) {
      codecCtx.freeContext();
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: tsx examples/encode-audio.ts <output>');
    console.log('Example: tsx examples/encode-audio.ts output.mp2');
    console.log('');
    console.log('This will generate a 440 Hz tone (A4 note) and encode it as MP2.');
    process.exit(1);
  }

  const filename = args[0];

  try {
    await encodeAudio(filename);
    process.exit(0);
  } catch (error) {
    if (error instanceof FFmpegError) {
      console.error(`FFmpeg Error: ${error.message} (code: ${error.code})`);
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
