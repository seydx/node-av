/**
 * High-Level API Example: Decoder Audio Resampling
 *
 * Demonstrates the Decoder `resample` option (the audio mirror of the encoder's
 * `autoResample`). It pins the decoded audio to a target sample rate regardless
 * of what the source actually delivers.
 *
 * This is the fix for the avfoundation microphone case (issue #229): on macOS the
 * capture device ignores a sample-rate request, so the mic keeps delivering its
 * own rate (e.g. 44100 Hz) even when you ask for 48000. Decoding with
 * `{ resample: { sampleRate: 48000 } }` forces every downstream frame to 48000.
 *
 * The decoder pins the RATE; the encoder's `autoResample` handles the codec's
 * sample-format need (e.g. AAC wanting planar `fltp`).
 *
 * Usage:
 *   tsx examples/api-decoder-resample.ts                 # 5s, target 48000 Hz
 *   tsx examples/api-decoder-resample.ts -r 48000 -d 5   # explicit rate/duration
 *   tsx examples/api-decoder-resample.ts -m 0            # pick microphone by index
 */

import { parseArgs } from 'node:util';

import { Decoder, Demuxer, DeviceAPI, Encoder, FF_ENCODER_AAC, Muxer } from '../src/index.js';
import { getOutputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const args = parseArgs({
  options: {
    rate: { type: 'string', short: 'r', default: '48000' },
    duration: { type: 'string', short: 'd', default: '5' },
    microphone: { type: 'string', short: 'm' },
  },
});

async function main() {
  const targetRate = parseInt(args.values.rate);
  const durationSec = parseInt(args.values.duration);
  const outputPath = getOutputFile('mic-resampled.m4a');

  console.log(`Target sample rate: ${targetRate} Hz`);
  console.log(`Duration: ${durationSec}s`);
  console.log(`Output: ${outputPath}\n`);

  // Request the target rate from the device. On macOS avfoundation this is just
  // a hint — the device keeps its own rate, which we correct below.
  await using input = await DeviceAPI.openMicrophone({
    audioDevice: args.values.microphone,
    sampleRate: targetRate,
    channels: 1,
  });

  const audioStream = input.audio(0);
  if (!audioStream) {
    throw new Error('No audio stream from microphone');
  }

  const deviceRate = audioStream.codecpar.sampleRate;
  console.log(`Microphone delivers: ${deviceRate} Hz (requested ${targetRate} Hz)`);
  console.log(deviceRate === targetRate ? '  -> device honored the request' : `  -> device ignored it; decoder will resample ${deviceRate} -> ${targetRate}`);

  // The key bit: pin decoded audio to the target rate no matter the device rate.
  using decoder = await Decoder.create(audioStream, {
    resample: { sampleRate: targetRate },
  });

  // An audio-only recording starts at 0, so there's no device clock offset to
  // strip — we don't pass `startTime`. (Audio encoders re-stamp their output to a
  // 0 baseline anyway; the muxer now safely ignores a startTime such a stream
  // doesn't carry. For video capture you DO want `startTime: input.startTime`, to
  // normalize the device's boot-relative timestamps.)
  await using output = await Muxer.open(outputPath);
  // Encoder takes the codec format need (AAC wants planar fltp) off our hands.
  using encoder = await Encoder.create(FF_ENCODER_AAC, { decoder, autoResample: true });
  const outIdx = output.addStream(encoder);

  const start = Date.now();
  console.log('\nRecording...');
  for await (using packet of input.packets(audioStream.index)) {
    if (Date.now() - start >= durationSec * 1000) {
      break;
    }
    for await (using frame of decoder.frames(packet)) {
      if (frame === null) {
        continue;
      }
      for await (using outPacket of encoder.packets(frame)) {
        await output.writePacket(outPacket, outIdx);
      }
    }
  }

  // Flush decoder (drains the resampler) and encoder.
  for await (using frame of decoder.frames(null)) {
    if (frame === null) {
      continue;
    }
    for await (using outPacket of encoder.packets(frame)) {
      await output.writePacket(outPacket, outIdx);
    }
  }
  for await (using outPacket of encoder.packets(null)) {
    await output.writePacket(outPacket, outIdx);
  }
  await output.close();

  console.log(`Saved ${outputPath}`);

  // Verify the saved file really is at the target rate.
  await using check = await Demuxer.open(outputPath);
  const savedRate = check.audio()?.codecpar.sampleRate;
  console.log(`\nOutput file sample rate: ${savedRate} Hz (expected ${targetRate})`);
  console.log(savedRate === targetRate ? 'OK — resample pinned the rate end-to-end.' : 'MISMATCH');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
