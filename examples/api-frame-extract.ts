/**
 * High-Level API Example: Frame Extraction and Processing
 *
 * Shows how to extract frames from video and save them as images.
 * Demonstrates frame manipulation capabilities of the high-level API.
 *
 * Usage: tsx examples/api-frame-extract.ts <input> <output>
 * Example: tsx examples/api-frame-extract.ts testdata/demux.mp4 examples/.tmp
 */

import { mkdir, writeFile } from 'fs/promises';

import {
  AV_LOG_DEBUG,
  AV_PIX_FMT_RGB24,
  AV_PIX_FMT_RGB8,
  Decoder,
  Demuxer,
  Encoder,
  FF_ENCODER_GIF,
  FF_ENCODER_MJPEG,
  FF_ENCODER_PNG,
  FilterAPI,
  FilterPreset,
  Log,
  Muxer,
} from '../src/index.js';
import { prepareTestEnvironment } from './index.js';

const inputFile = process.argv[2];
const outputDir = process.argv[3];

if (!inputFile || !outputDir) {
  console.error('Usage: tsx examples/api-frame-extract.ts <input> <output>');
  process.exit(1);
}

async function extractFrameAsPNG(frameNumber: number) {
  await using input = await Demuxer.open(inputFile);

  const videoStream = input.video(0);
  if (!videoStream) {
    throw new Error('No video stream found');
  }

  // Create decoder
  using decoder = await Decoder.create(videoStream);

  // Create filter to convert to RGB24
  const filterChain = FilterPreset.chain().format(AV_PIX_FMT_RGB24).build();
  using filter = FilterAPI.create(filterChain, {
    framerate: videoStream.avgFrameRate,
  });

  // Create PNG encoder
  using pngEncoder = await Encoder.create(FF_ENCODER_PNG, {
    decoder,
    filter,
  });

  let currentFrame = 0;
  for await (using packet of input.packets(videoStream.index)) {
    // Decode packet to frames
    for await (using frame of decoder.frames(packet)) {
      // Filter frame
      for await (using filteredFrame of filter.frames(frame)) {
        if (filteredFrame) {
          if (currentFrame === frameNumber) {
            console.log(`Frame ${frameNumber}: ${filteredFrame.width}x${filteredFrame.height}, PTS: ${filteredFrame.pts}`);

            // Encode frame as PNG
            for await (using pngPacket of pngEncoder.packets(filteredFrame)) {
              if (pngPacket?.data) {
                const filename = `${outputDir}/frame_${frameNumber}.png`;
                await writeFile(filename, pngPacket.data);
                console.log(`Saved to ${filename}`);
              }
            }

            // Flush encoder for single frame
            for await (using flushPacket of pngEncoder.packets(null)) {
              if (flushPacket?.data) {
                const filename = `${outputDir}/frame_${frameNumber}_flush.png`;
                await writeFile(filename, flushPacket.data);
                console.log(`Saved to ${filename}`);
              }
            }

            return; // Exit function after extracting target frame
          }
          currentFrame++;
        }
      }
    }
  }
}

async function extractFramesAtInterval(intervalSeconds: number, count: number) {
  await using input = await Demuxer.open(inputFile);

  const videoStream = input.video(0);
  if (!videoStream) {
    throw new Error('No video stream found');
  }

  // Get frame rate from the stream
  const fps = videoStream.avgFrameRate.toDouble();
  const frameInterval = Math.floor(fps * intervalSeconds);

  console.log(`Video FPS: ~${fps.toFixed(1)}`);
  console.log(`Frame interval: ${frameInterval} frames`);

  // Create decoder
  using decoder = await Decoder.create(videoStream);

  // Create JPEG encoder for thumbnails
  using jpegEncoder = await Encoder.create(FF_ENCODER_MJPEG, {
    decoder,
    bitrate: '2M',
    options: { strict: 'experimental' },
  });

  let currentFrame = 0;
  let extractedCount = 0;

  for await (using packet of input.packets(videoStream.index)) {
    // Decode packet to frames
    for await (using frame of decoder.frames(packet)) {
      if (frame) {
        if (currentFrame % frameInterval === 0 && extractedCount < count) {
          console.log(`Extracting frame ${currentFrame} (${(currentFrame / fps).toFixed(1)}s)`);

          // Encode frame as JPEG
          for await (using jpegPacket of jpegEncoder.packets(frame)) {
            if (jpegPacket?.data) {
              const filename = `${outputDir}/thumb_${extractedCount}.jpg`;
              await writeFile(filename, jpegPacket.data);
              console.log(`Saved: ${filename}`);
            }
          }

          extractedCount++;
        }
        currentFrame++;

        if (extractedCount >= count) {
          return; // Exit function after extracting all thumbnails
        }
      }
    }
  }

  console.log(`Extracted ${extractedCount} thumbnails`);
}

async function generateGIF(startTime: number, duration: number) {
  await using input = await Demuxer.open(inputFile);
  await using output = await Muxer.open(`${outputDir}/output.gif`);

  const videoStream = input.video(0);
  if (!videoStream) {
    throw new Error('No video stream found');
  }

  // Get frame rate from the stream
  const fps = videoStream.avgFrameRate.toDouble();
  const startFrame = Math.floor(startTime * fps);
  const endFrame = Math.floor((startTime + duration) * fps);

  console.log(`Processing frames ${startFrame} to ${endFrame}`);

  // Create decoder
  using decoder = await Decoder.create(videoStream);

  // Create filter to convert to RGB24 (GIF requires this)
  const filterChain = FilterPreset.chain().format(AV_PIX_FMT_RGB8).build();
  using filter = FilterAPI.create(filterChain, {
    framerate: videoStream.avgFrameRate,
  });

  // Create encoder
  using encoder = await Encoder.create(FF_ENCODER_GIF, {
    decoder,
    filter,
    options: {
      // GIF specific options can be set here
      // e.g., loop count, palette size, etc.
      // For simplicity, we use defaults
    },
  });

  const outputStreamIndex = output.addStream(encoder);

  let currentFrame = 0;

  for await (using packet of input.packets(videoStream.index)) {
    // Process both null (EOF) and video packets
    if (packet === null || packet.streamIndex === videoStream.index) {
      for await (using frame of decoder.frames(packet)) {
        if (frame === null) break; // EOF

        // Skip frames before start
        if (currentFrame < startFrame) {
          currentFrame++;
          continue;
        }

        // Stop after end frame
        if (currentFrame >= endFrame) {
          // Flush remaining frames in pipeline
          for await (using filteredFrame of filter.frames(null)) {
            if (filteredFrame === null) break;
            for await (using encodedPacket of encoder.packets(filteredFrame)) {
              if (encodedPacket === null) break;
              await output.writePacket(encodedPacket, outputStreamIndex);
            }
          }
          return;
        }

        // Process frame
        for await (using filteredFrame of filter.frames(frame)) {
          if (filteredFrame === null) break; // EOF
          for await (using encodedPacket of encoder.packets(filteredFrame)) {
            if (encodedPacket === null) break; // EOF
            await output.writePacket(encodedPacket, outputStreamIndex);
          }
        }

        currentFrame++;
      }
    }
  }
}

prepareTestEnvironment();
Log.setLevel(AV_LOG_DEBUG);

console.log('Input:', inputFile);
console.log('Output Directory:', outputDir);

// Create output directory
await mkdir(outputDir, { recursive: true });

// Extract specific frame
console.log('Extracting specific frame:');
await extractFrameAsPNG(10);

// Extract thumbnails
console.log('Extracting thumbnails:');
await extractFramesAtInterval(2, 5);

// Generate GIF (demo)
console.log('Generating GIF:');
await generateGIF(0, 3);

console.log('Done!');
