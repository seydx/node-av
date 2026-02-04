/**
 * High-Level API Example: Device Capture
 *
 * Demonstrates webcam, microphone, and screen capture functionality.
 *
 * Usage:
 *   tsx examples/api-device-capture.ts --list
 *   tsx examples/api-device-capture.ts --modes [device]
 *   tsx examples/api-device-capture.ts --camera [device] -o output.mp4 -d 5
 *   tsx examples/api-device-capture.ts --microphone [device] -o output.wav -d 5
 *   tsx examples/api-device-capture.ts --screen -o output.mp4 -d 5
 *   tsx examples/api-device-capture.ts --device [video] [audio] -o output.mp4 -d 5
 */

import { parseArgs } from 'node:util';

import { PixelFormatUtils } from '../src/api/utilities/pixel-format.js';
import { SampleFormatUtils } from '../src/api/utilities/sample-format.js';
import { Decoder, DeviceAPI, Encoder, FF_ENCODER_AAC, FF_ENCODER_LIBX264, Muxer } from '../src/index.js';
import { prepareTestEnvironment } from './index.js';

const args = parseArgs({
  options: {
    list: { type: 'boolean', short: 'l' },
    modes: { type: 'string' },
    camera: { type: 'string', short: 'c' },
    microphone: { type: 'string', short: 'm' },
    device: { type: 'boolean' },
    screen: { type: 'boolean', short: 's' },
    output: { type: 'string', short: 'o' },
    duration: { type: 'string', short: 'd', default: '5' },
    width: { type: 'string', short: 'w' },
    height: { type: 'string', short: 'h' },
    framerate: { type: 'string', short: 'f', default: '30' },
  },
  allowPositionals: true,
});

async function listDevices() {
  console.log('Enumerating capture devices...\n');

  const devices = await DeviceAPI.list();

  if (devices.length === 0) {
    console.log('No capture devices found.');
    return;
  }

  console.log('Video Devices:');
  const videoDevices = devices.filter((d) => d.type === 'video');
  if (videoDevices.length === 0) {
    console.log('  (none)');
  } else {
    for (const device of videoDevices) {
      const defaultTag = device.isDefault ? ' (default)' : '';
      console.log(`  [${device.name}] ${device.description}${defaultTag}`);

      const modes = await DeviceAPI.modes(device.name);
      if (modes.length > 0) {
        for (const mode of modes) {
          const fps = mode.minFrameRate === mode.maxFrameRate ? `${mode.maxFrameRate}` : `${mode.minFrameRate}-${mode.maxFrameRate}`;
          const fmtName = PixelFormatUtils.getName(mode.pixelFormat);
          const fmt = fmtName ? ` [${fmtName}]` : '';
          console.log(`    ${mode.width}x${mode.height} @ ${fps} fps${fmt}`);
        }
      }
    }
  }

  console.log('\nAudio Devices:');
  const audioDevices = devices.filter((d) => d.type === 'audio');
  if (audioDevices.length === 0) {
    console.log('  (none)');
  } else {
    for (const device of audioDevices) {
      const defaultTag = device.isDefault ? ' (default)' : '';
      console.log(`  [${device.name}] ${device.description}${defaultTag}`);

      const audioModes = await DeviceAPI.audioModes(device.name);
      if (audioModes.length > 0) {
        for (const mode of audioModes) {
          const fmtName = SampleFormatUtils.getName(mode.sampleFormat);
          const fmt = fmtName ? ` [${fmtName}]` : '';
          console.log(`    ${mode.sampleRate}Hz ${mode.channels}ch${fmt}`);
        }
      }
    }
  }

  console.log('\nScreen Devices:');
  const screenDevices = devices.filter((d) => d.type === 'screen');
  if (screenDevices.length === 0) {
    console.log('  (none)');
  } else {
    for (const device of screenDevices) {
      const defaultTag = device.isDefault ? ' (default)' : '';
      const bounds = device.bounds ? ` (${device.bounds.width}x${device.bounds.height}+${device.bounds.x}+${device.bounds.y})` : '';
      console.log(`  [${device.name}] ${device.description}${bounds}${defaultTag}`);
    }
  }

  console.log('\nPlatform-specific formats:');
  console.log(`  Video input format: ${DeviceAPI.getVideoFormat()}`);
  console.log(`  Audio input format: ${DeviceAPI.getAudioFormat()}`);
  console.log(`  Screen capture format: ${DeviceAPI.getScreenFormat()}`);
}

async function resolveVideoDevice(input: string): Promise<{ name: string; description: string }> {
  const devices = await DeviceAPI.list();
  const videoDevices = devices.filter((d) => d.type === 'video');

  // Try as numeric index
  const index = parseInt(input);
  if (!isNaN(index) && index >= 0 && index < videoDevices.length) {
    return videoDevices[index];
  }

  // Try as exact name (uniqueID)
  const byName = videoDevices.find((d) => d.name === input);
  if (byName) return byName;

  // Try as description (case-insensitive)
  const byDesc = videoDevices.find((d) => d.description.toLowerCase() === input.toLowerCase());
  if (byDesc) return byDesc;

  // Try as partial description match
  const byPartial = videoDevices.find((d) => d.description.toLowerCase().includes(input.toLowerCase()));
  if (byPartial) return byPartial;

  throw new Error(`Video device not found: "${input}"\nAvailable devices:\n${videoDevices.map((d, i) => `  [${i}] ${d.description} (${d.name})`).join('\n')}`);
}

async function listModes(input: string) {
  const device = await resolveVideoDevice(input);
  console.log(`Querying capture modes for: ${device.description} [${device.name}]\n`);

  const modes = await DeviceAPI.modes(device.name);

  if (modes.length === 0) {
    console.log('No modes found for this device.');
    return;
  }

  console.log(`Found ${modes.length} mode(s):\n`);
  console.log('  Resolution      Frame Rate          Pixel Format');
  console.log('  ──────────────  ──────────────────  ────────────');

  for (const mode of modes) {
    const res = `${mode.width}x${mode.height}`.padEnd(14);
    const fps = (mode.minFrameRate === mode.maxFrameRate ? `${mode.maxFrameRate} fps` : `${mode.minFrameRate}-${mode.maxFrameRate} fps`).padEnd(18);
    const fmt = PixelFormatUtils.getName(mode.pixelFormat) ?? '(unknown)';
    console.log(`  ${res}  ${fps}  ${fmt}`);
  }
}

async function captureCamera(deviceId: string, outputPath: string, durationSec: number) {
  const width = args.values.width ? parseInt(args.values.width) : 1280;
  const height = args.values.height ? parseInt(args.values.height) : 720;
  const frameRate = parseInt(args.values.framerate);

  console.log(`Opening camera device: ${deviceId}`);
  console.log(`Resolution: ${width}x${height} @ ${frameRate}fps`);
  console.log(`Duration: ${durationSec} seconds`);
  console.log(`Output: ${outputPath}`);

  await using input = await DeviceAPI.openCamera({
    videoDevice: deviceId,
    width,
    height,
    frameRate,
  });

  const videoStream = input.video(0);
  if (!videoStream) {
    throw new Error('No video stream from camera');
  }

  console.log(`Camera opened: ${videoStream.codecpar.width}x${videoStream.codecpar.height}`);

  using decoder = await Decoder.create(videoStream);

  await using output = await Muxer.open(outputPath, {
    input,
    startTime: input.startTime,
  });
  using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
    decoder,
    options: {
      preset: 'ultrafast',
      crf: '23',
    },
  });

  const outStreamIndex = output.addStream(encoder);

  const startTime = Date.now();
  const durationMs = durationSec * 1000;

  console.log('Recording...');

  for await (using packet of input.packets(videoStream.index)) {
    if (Date.now() - startTime >= durationMs) {
      break;
    }

    for await (using frame of decoder.frames(packet)) {
      for await (using outPacket of encoder.packets(frame)) {
        await output.writePacket(outPacket, outStreamIndex);
      }
    }
  }

  // Flush decoder and encoder
  for await (using frame of decoder.frames(null)) {
    for await (using outPacket of encoder.packets(frame)) {
      await output.writePacket(outPacket, outStreamIndex);
    }
  }
  for await (using outPacket of encoder.packets(null)) {
    await output.writePacket(outPacket, outStreamIndex);
  }

  console.log(`Recording saved to ${outputPath}`);
}

async function captureMicrophone(deviceId: string, outputPath: string, durationSec: number) {
  console.log(`Opening microphone device: ${deviceId}`);
  console.log(`Duration: ${durationSec} seconds`);
  console.log(`Output: ${outputPath}`);

  await using input = await DeviceAPI.openMicrophone({
    audioDevice: deviceId,
    sampleRate: 48000,
    channels: 2,
  });

  const audioStream = input.audio(0);
  if (!audioStream) {
    throw new Error('No audio stream from microphone');
  }

  console.log(`Microphone opened: ${audioStream.codecpar.sampleRate}Hz, ${audioStream.codecpar.channels}ch`);

  using decoder = await Decoder.create(audioStream);

  await using output = await Muxer.open(outputPath, {
    startTime: input.startTime,
  });
  using encoder = await Encoder.create(FF_ENCODER_AAC, {
    decoder,
  });

  const outStreamIndex = output.addStream(encoder);

  const startTime = Date.now();
  const durationMs = durationSec * 1000;

  console.log('Recording...');

  for await (using packet of input.packets(audioStream.index)) {
    if (Date.now() - startTime >= durationMs) {
      break;
    }

    for await (using frame of decoder.frames(packet)) {
      for await (using outPacket of encoder.packets(frame)) {
        await output.writePacket(outPacket, outStreamIndex);
      }
    }
  }

  // Flush decoder and encoder
  for await (using frame of decoder.frames(null)) {
    for await (using outPacket of encoder.packets(frame)) {
      await output.writePacket(outPacket, outStreamIndex);
    }
  }
  for await (using outPacket of encoder.packets(null)) {
    await output.writePacket(outPacket, outStreamIndex);
  }

  console.log(`Recording saved to ${outputPath}`);
}

async function captureDevice(outputPath: string, durationSec: number) {
  const width = args.values.width ? parseInt(args.values.width) : 1280;
  const height = args.values.height ? parseInt(args.values.height) : 720;
  const frameRate = parseInt(args.values.framerate);

  const videoDevice = args.positionals[0] ?? '0';
  const audioDevice = args.positionals[1] ?? '0';

  console.log(`Opening combined device: video=${videoDevice}, audio=${audioDevice}`);
  console.log(`Resolution: ${width}x${height} @ ${frameRate}fps`);
  console.log(`Duration: ${durationSec} seconds`);
  console.log(`Output: ${outputPath}`);

  await using input = await DeviceAPI.openDevice({
    videoDevice,
    audioDevice,
    width,
    height,
    frameRate,
    sampleRate: 48000,
    channels: 2,
  });

  const videoStream = input.video(0);
  const audioStream = input.audio(0);
  if (!videoStream) {
    throw new Error('No video stream from device');
  }

  console.log(`Device opened: ${videoStream.codecpar.width}x${videoStream.codecpar.height}`);
  if (audioStream) {
    console.log(`Audio: ${audioStream.codecpar.sampleRate}Hz, ${audioStream.codecpar.channels}ch`);
  }

  using videoDecoder = await Decoder.create(videoStream);

  await using output = await Muxer.open(outputPath, {
    input,
    startTime: input.startTime,
  });
  using videoEncoder = await Encoder.create(FF_ENCODER_LIBX264, {
    decoder: videoDecoder,
    options: { preset: 'ultrafast', crf: '23' },
  });
  const videoOutIndex = output.addStream(videoEncoder);

  let audioDecoder: Decoder | undefined;
  let audioEncoder: Encoder | undefined;
  let audioOutIndex: number | undefined;

  if (audioStream) {
    audioDecoder = await Decoder.create(audioStream);
    audioEncoder = await Encoder.create(FF_ENCODER_AAC, { decoder: audioDecoder });
    audioOutIndex = output.addStream(audioEncoder);
  }

  const startTime = Date.now();
  const durationMs = durationSec * 1000;

  console.log('Recording...');

  for await (using packet of input.packets()) {
    if (Date.now() - startTime >= durationMs) {
      break;
    }

    if (packet?.streamIndex === videoStream.index) {
      for await (using frame of videoDecoder.frames(packet)) {
        for await (using outPacket of videoEncoder.packets(frame)) {
          await output.writePacket(outPacket, videoOutIndex);
        }
      }
    } else if (audioDecoder && audioEncoder && audioOutIndex !== undefined && packet?.streamIndex === audioStream!.index) {
      for await (using frame of audioDecoder.frames(packet)) {
        for await (using outPacket of audioEncoder.packets(frame)) {
          await output.writePacket(outPacket, audioOutIndex);
        }
      }
    }
  }

  // Flush video
  for await (using frame of videoDecoder.frames(null)) {
    for await (using outPacket of videoEncoder.packets(frame)) {
      await output.writePacket(outPacket, videoOutIndex);
    }
  }
  for await (using outPacket of videoEncoder.packets(null)) {
    await output.writePacket(outPacket, videoOutIndex);
  }

  // Flush audio
  if (audioDecoder && audioEncoder && audioOutIndex !== undefined) {
    for await (using frame of audioDecoder.frames(null)) {
      for await (using outPacket of audioEncoder.packets(frame)) {
        await output.writePacket(outPacket, audioOutIndex);
      }
    }
    for await (using outPacket of audioEncoder.packets(null)) {
      await output.writePacket(outPacket, audioOutIndex);
    }
    audioDecoder.close();
    audioEncoder.close();
  }

  console.log(`Recording saved to ${outputPath}`);
}

async function captureScreen(outputPath: string, durationSec: number) {
  const width = args.values.width ? parseInt(args.values.width) : undefined;
  const height = args.values.height ? parseInt(args.values.height) : undefined;
  const frameRate = parseInt(args.values.framerate);

  console.log('Opening screen capture');
  if (width && height) {
    console.log(`Resolution: ${width}x${height}`);
  }
  console.log(`Frame rate: ${frameRate}fps`);
  console.log(`Duration: ${durationSec} seconds`);
  console.log(`Output: ${outputPath}`);

  await using input = await DeviceAPI.openScreen({
    width,
    height,
    frameRate,
    drawMouse: true,
  });

  const videoStream = input.video(0);
  if (!videoStream) {
    throw new Error('No video stream from screen capture');
  }

  console.log(`Screen capture opened: ${videoStream.codecpar.width}x${videoStream.codecpar.height}`);

  using decoder = await Decoder.create(videoStream);

  await using output = await Muxer.open(outputPath, {
    startTime: input.startTime,
  });
  using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
    decoder,
    options: {
      preset: 'ultrafast',
      crf: '23',
    },
  });

  const outStreamIndex = output.addStream(encoder);

  const startTime = Date.now();
  const durationMs = durationSec * 1000;

  console.log('Recording...');

  for await (using packet of input.packets(videoStream.index)) {
    if (Date.now() - startTime >= durationMs) {
      break;
    }

    for await (using frame of decoder.frames(packet)) {
      for await (using outPacket of encoder.packets(frame)) {
        await output.writePacket(outPacket, outStreamIndex);
      }
    }
  }

  // Flush decoder and encoder
  for await (using frame of decoder.frames(null)) {
    for await (using outPacket of encoder.packets(frame)) {
      await output.writePacket(outPacket, outStreamIndex);
    }
  }
  for await (using outPacket of encoder.packets(null)) {
    await output.writePacket(outPacket, outStreamIndex);
  }

  console.log(`Recording saved to ${outputPath}`);
}

async function main() {
  prepareTestEnvironment();

  if (args.values.list) {
    await listDevices();
    return;
  }

  if (args.values.modes !== undefined) {
    await listModes(args.values.modes);
    return;
  }

  const duration = parseInt(args.values.duration);

  if (args.values.camera !== undefined) {
    const output = args.values.output ?? 'examples/.tmp/camera-capture.mp4';
    const device = args.values.camera ?? '0';
    await captureCamera(device, output, duration);
    return;
  }

  if (args.values.microphone !== undefined) {
    const output = args.values.output ?? 'examples/.tmp/microphone-capture.m4a';
    const device = args.values.microphone ?? '0';
    await captureMicrophone(device, output, duration);
    return;
  }

  if (args.values.device) {
    const output = args.values.output ?? 'examples/.tmp/device-capture.mp4';
    await captureDevice(output, duration);
    return;
  }

  if (args.values.screen) {
    const output = args.values.output ?? 'examples/.tmp/screen-capture.mp4';
    await captureScreen(output, duration);
    return;
  }

  console.log('Device Capture Example');
  console.log('');
  console.log('Usage:');
  console.log('  tsx examples/api-device-capture.ts --list');
  console.log('  tsx examples/api-device-capture.ts --modes <device-name|index|description>');
  console.log('  tsx examples/api-device-capture.ts --camera [device] -o output.mp4 -d 5');
  console.log('  tsx examples/api-device-capture.ts --microphone [device] -o output.wav -d 5');
  console.log('  tsx examples/api-device-capture.ts --screen -o output.mp4 -d 5');
  console.log('');
  console.log('Options:');
  console.log('  -l, --list          List available devices and their supported modes');
  console.log('      --modes         Query capture modes (by index, name, or description)');
  console.log('  -c, --camera        Capture from camera (device name or index)');
  console.log('  -m, --microphone    Capture from microphone (device name or index)');
  console.log('      --device        Combined video+audio capture (positional: [video] [audio])');
  console.log('  -s, --screen        Capture screen');
  console.log('  -o, --output        Output file path');
  console.log('  -d, --duration      Recording duration in seconds (default: 5)');
  console.log('  -w, --width         Video width');
  console.log('  -h, --height        Video height');
  console.log('  -f, --framerate     Frame rate (default: 30)');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
