/**
 * AbortSignal / AbortController Example
 *
 * This example demonstrates:
 * - Cancelling a transcode pipeline after a timeout
 * - Cancelling manual frame iteration with AbortSignal
 * - Handling pre-aborted signals
 *
 * Use case: When you need to limit processing time, implement user-initiated
 * cancellation, or integrate with frameworks that use AbortController
 *
 * Usage: tsx api-abort-signal.ts <input> <output>
 * Example: tsx examples/api-abort-signal.ts testdata/video.mp4 examples/.tmp/api-abort-signal.mp4
 */

import { Decoder, Demuxer, Encoder, FF_ENCODER_LIBX264, Muxer, pipeline } from '../src/index.js';

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.log('Usage: tsx api-abort-signal.ts <input> <output>');
  console.log('Example: tsx api-abort-signal.ts input.mp4 output.mp4');
  process.exit(1);
}

// ─── Example 1: Pipeline with AbortSignal ────────────────────────────────────

console.log('=== Example 1: Pipeline with AbortSignal ===');
console.log(`Input: ${inputFile}`);
console.log(`Output: ${outputFile}`);

{
  await using input = await Demuxer.open(inputFile);
  const videoStream = input.video();

  if (!videoStream) {
    throw new Error('No video stream found in input file');
  }

  using decoder = await Decoder.create(videoStream);
  using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
    decoder,
    bitrate: '2M',
    options: { preset: 'ultrafast', crf: 23 },
  });

  await using output = await Muxer.open(outputFile);
  output.addStream(encoder);

  // Abort the pipeline after 2 seconds
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.log('Aborting pipeline after timeout...');
    controller.abort();
  }, 2000);

  const control = pipeline(input, decoder, encoder, output, { signal: controller.signal });
  await control.completion;
  clearTimeout(timeout);

  console.log('Pipeline finished (stopped early or completed).');
}

// ─── Example 2: Manual iteration with AbortSignal ────────────────────────────

console.log('');
console.log('=== Example 2: Manual iteration with AbortSignal ===');

{
  const controller = new AbortController();

  await using input = await Demuxer.open(inputFile, { signal: controller.signal });
  const videoStream = input.video();

  if (!videoStream) {
    throw new Error('No video stream found in input file');
  }

  using decoder = await Decoder.create(videoStream, { signal: controller.signal });

  let frameCount = 0;
  const maxFrames = 30;

  try {
    for await (using packet of input.packets(videoStream.index)) {
      for await (using frame of decoder.frames(packet)) {
        if (frame) {
          frameCount++;
          if (frameCount % 10 === 0) {
            console.log(`Decoded ${frameCount} frames...`);
          }
          // Abort after maxFrames
          if (frameCount >= maxFrames) {
            console.log(`Reached ${maxFrames} frames, aborting...`);
            controller.abort();
          }
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log(`Aborted after ${frameCount} frames.`);
    } else {
      throw err;
    }
  }
}

// ─── Example 3: Pre-aborted signal ──────────────────────────────────────────

console.log('');
console.log('=== Example 3: Pre-aborted signal ===');

{
  const controller = new AbortController();
  controller.abort(); // Abort immediately

  try {
    await using input = await Demuxer.open(inputFile, { signal: controller.signal });
    console.log('This should not be reached');
    void input;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Correctly rejected: Cannot open with pre-aborted signal.');
    } else {
      throw err;
    }
  }
}

console.log('');
console.log('All examples completed.');
