/**
 * High-Level API Example: Scaler (fast scale / crop / pixel-format convert)
 *
 * Demonstrates the `Scaler` - a direct, pooled, hardware-aware image transform
 * built for detection/thumbnail workloads. Unlike a streaming filtergraph, it
 * scales, crops arbitrary regions, and converts pixel formats with zero per-frame
 * allocation, returning tightly packed pixel buffers.
 *
 * Usage: tsx examples/api-scaler.ts [input]
 * Example: tsx examples/api-scaler.ts testdata/bunny-30s.mp4
 */

import { mkdir, writeFile } from 'node:fs/promises';

import { Decoder, Demuxer, HardwareContext, Scaler } from '../src/index.js';

const inputFile = process.argv[2] ?? 'testdata/bunny-30s.mp4';
const outDir = 'examples/.tmp';
await mkdir(outDir, { recursive: true });

await using input = await Demuxer.open(inputFile);
const video = input.video();
if (!video) {
  throw new Error('No video stream found');
}

// Hardware-decode if available; the Scaler downloads HW frames transparently.
using hw = HardwareContext.auto();
using decoder = await Decoder.create(video, hw ? { hardware: hw } : {});

// One scaler instance, reused for every frame and every crop - pooled internally.
using scaler = new Scaler();

let processed = 0;
for await (using packet of input.packets(video.index)) {
  for await (using frame of decoder.frames(packet)) {
    if (!frame) continue;

    // Full frame → RGB thumbnail
    const rgb = await scaler.toBuffer(frame, { resize: { width: 640, height: 360 }, format: 'rgb' });

    // Downscaled grayscale (e.g. for motion/detection input)
    const gray = await scaler.toBuffer(frame, { resize: { width: 320, height: 180 }, format: 'gray' });

    // Crop an arbitrary region and scale it (crop changes per frame - still no per-frame alloc)
    const region = await scaler.toBuffer(frame, {
      crop: { x: frame.width >> 2, y: frame.height >> 2, width: frame.width >> 1, height: frame.height >> 1 },
      resize: { width: 224, height: 224 },
      format: 'rgb',
    });

    console.log(`frame ${processed}: rgb=${rgb.length}b gray=${gray.length}b region=${region.length}b (hw=${frame.isHwFrame()})`);

    // Encode snapshots directly - the encoder is pooled and reused across frames.
    if (processed === 0) {
      const jpeg = await scaler.toJpeg(frame, { resize: { width: 1280, height: 720 }, quality: 85 });
      const png = await scaler.toPng(frame, {
        crop: { x: frame.width >> 2, y: frame.height >> 2, width: frame.width >> 1, height: frame.height >> 1 },
        resize: { width: 320, height: 320 },
      });
      await writeFile(`${outDir}/scaler-snapshot.jpg`, jpeg);
      await writeFile(`${outDir}/scaler-region.png`, png);
      console.log(`  wrote ${outDir}/scaler-snapshot.jpg (${jpeg.length}b) and ${outDir}/scaler-region.png (${png.length}b)`);
    }

    if (++processed >= 5) break;
  }
  if (processed >= 5) break;
}

console.log(`Done - processed ${processed} frames with a single reused Scaler.`);
