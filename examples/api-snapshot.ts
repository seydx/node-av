/**
 * High-Level API Example: Image Snapshots
 *
 * Shows how to encode decoded frames to standalone JPEGs.
 * Demonstrates `Encoder.encodeOne()` for one-shot snapshots and `EncoderPool` for
 * reusing encoders across frames.
 *
 * Usage: tsx examples/api-snapshot.ts [input]
 * Example: tsx examples/api-snapshot.ts testdata/bunny-30s.mp4
 */

import { mkdir, writeFile } from 'node:fs/promises';

import { AVCOL_RANGE_JPEG, Decoder, Demuxer, Encoder, EncoderPool, FF_ENCODER_MJPEG } from '../src/index.js';

const inputFile = process.argv[2] ?? 'testdata/bunny-30s.mp4';
const outDir = 'examples/.tmp';
await mkdir(outDir, { recursive: true });

await using input = await Demuxer.open(inputFile);
const video = input.video();
if (!video) {
  throw new Error('No video stream found');
}

using decoder = await Decoder.create(video);

// A pooled MJPEG encoder. Frames are routed by resolution; here every decoded
// frame shares the stream's native size, so one encoder is reused for all of them.
// Feeding frames of different sizes (e.g. several camera streams) would keep one
// encoder per size and evict the least-recently-used once maxSize is exceeded.
using pool = new EncoderPool(FF_ENCODER_MJPEG, { maxSize: 4 });

let count = 0;
for await (using packet of input.packets(video.index)) {
  for await (using frame of decoder.frames(packet)) {
    if (!frame) {
      continue;
    }

    // mjpeg expects full-range YUV; tag the decoded frame accordingly. For exact
    // colors you would convert the range (e.g. via a Scaler / scale filter) first.
    frame.colorRange = AVCOL_RANGE_JPEG;

    // One-shot for a single ad-hoc snapshot: opens a fresh encoder, encodes, frees.
    if (count === 0) {
      const jpeg = await Encoder.encodeOne(FF_ENCODER_MJPEG, frame);
      await writeFile(`${outDir}/snapshot-oneshot.jpg`, jpeg);
      console.log(`encodeOne: ${frame.width}x${frame.height} -> ${jpeg.length}b`);
    }

    // Pooled: reuses the encoder for this resolution across every frame.
    const jpeg = await pool.encode(frame);
    await writeFile(`${outDir}/snapshot-${count}.jpg`, jpeg);
    console.log(`pool.encode #${count}: ${frame.width}x${frame.height} -> ${jpeg.length}b (pool size: ${pool.size})`);

    if (++count >= 5) {
      break;
    }
  }

  if (count >= 5) {
    break;
  }
}

console.log(`Done - wrote 1 one-shot + ${count} pooled snapshots to ${outDir} (reused ${pool.size} encoder).`);
