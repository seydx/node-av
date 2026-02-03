/**
 * Frame Utils Benchmark Example
 *
 * This example demonstrates the FrameUtils class for high-performance NV12 frame
 * processing. It benchmarks various image processing operations including:
 *
 * - Format conversion (NV12 to RGBA, RGB, Grayscale)
 * - Resize operations (upscale and downscale)
 * - Crop operations
 * - Combined crop + resize + format conversion
 *
 * Usage: tsx examples/frame-utils.ts
 * Example: tsx examples/frame-utils.ts
 */

import { readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

import { FrameUtils } from '../src/lib/frame-utils.js';

import type { Channels } from 'sharp';
import type { ImageOptions } from '../src/lib/frame-utils.js';

async function benchmark() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const testImage = await readFile(resolve(__dirname, '../testdata/input.nv12'));
  const inputWidth = 320;
  const inputHeight = 180;

  console.log('\n=== Performance Test ===\n');

  using processor = new FrameUtils(inputWidth, inputHeight);

  const testCases: ImageOptions[] = [
    { resize: { width: 640, height: 360 }, format: { to: 'rgba' } },
    { format: { to: 'rgb' } },
    { resize: { width: 1280, height: 720 } },
    { resize: { width: 160, height: 90 }, format: { to: 'gray' } },
    { crop: { left: 0, top: 0, width: 160, height: 90 }, resize: { width: 320, height: 180 }, format: { to: 'gray' } },
    { crop: { left: 0, top: 0, width: 160, height: 90 }, resize: { width: 1920, height: 1080 }, format: { to: 'rgba' } },
  ];

  // Warm up
  console.log('Warming up...');
  for (let i = 0; i < 100; i++) {
    processor.process(testImage, testCases[0]);
  }

  // Actual benchmark
  console.log('\nBenchmarking...');
  const iterations = 100;

  for (const [idx, options] of testCases.entries()) {
    console.log(`\nTest ${idx + 1}: ${JSON.stringify(options)}`);

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      processor.process(testImage, options);
    }
    const time = performance.now() - start;
    const avg = time / iterations;

    console.log(`  Average: ${avg.toFixed(3)}ms`);
    console.log(`  FPS: ${(1000 / avg).toFixed(0)}`);
    console.log(`  Throughput: ${(iterations / (time / 1000)).toFixed(0)} frames/sec`);
  }

  // Test image output

  console.log('\nGenerating output images...');

  // Test crop + resize + format conversion (testCases[3])
  const cropTestCase = testCases[3];
  const cropData = processor.process(testImage, cropTestCase);

  let cropChannel = 4; // RGBA
  if (cropTestCase.format?.to === 'rgb') cropChannel = 3;
  else if (cropTestCase.format?.to === 'gray') cropChannel = 1;

  const cropWidth = cropTestCase.resize?.width ?? cropTestCase.crop?.width ?? inputWidth;
  const cropHeight = cropTestCase.resize?.height ?? cropTestCase.crop?.height ?? inputHeight;

  const cropImage = sharp(cropData, {
    raw: {
      width: cropWidth,
      height: cropHeight,
      channels: cropChannel as Channels,
    },
  });

  const cropOutputFile = resolve(__dirname, '.tmp/frame-utils-crop.png');
  console.log(`Writing cropped output to ${cropOutputFile}`);
  await cropImage.toFile(cropOutputFile);

  // Test simple resize (testCases[0])
  const resizeTestCase = testCases[0];
  const resizeData = processor.process(testImage, resizeTestCase);

  let resizeChannel = 4; // RGBA
  if (resizeTestCase.format?.to === 'rgb') resizeChannel = 3;
  else if (resizeTestCase.format?.to === 'gray') resizeChannel = 1;

  const resizeWidth = resizeTestCase.resize?.width ?? inputWidth;
  const resizeHeight = resizeTestCase.resize?.height ?? inputHeight;

  const resizeImage = sharp(resizeData, {
    raw: {
      width: resizeWidth,
      height: resizeHeight,
      channels: resizeChannel as Channels,
    },
  });

  const resizeOutputFile = resolve(__dirname, '.tmp/frame-utils-resize.png');
  console.log(`Writing resized output to ${resizeOutputFile}`);
  await resizeImage.toFile(resizeOutputFile);
}

// Run the benchmark
benchmark().catch(console.error);
