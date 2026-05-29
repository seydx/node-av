import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { probe, probeSync } from '../src/api/index.js';
import { getInputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputFile = getInputFile('demux.mp4');

describe('probe', () => {
  it('should return structured format info (async)', async () => {
    const info = await probe(inputFile);

    assert.ok(info.format.length > 0, 'Should have a format name');
    assert.ok(info.formatLongName.length > 0, 'Should have a format long name');
    assert.ok(info.duration > 0, 'Should have a positive duration');
    assert.ok(info.nbStreams > 0, 'Should have at least one stream');
    assert.strictEqual(info.streams.length, info.nbStreams, 'streams array should match nbStreams');
    assert.strictEqual(typeof info.metadata, 'object');
  });

  it('should return structured format info (sync)', () => {
    const info = probeSync(inputFile);
    assert.ok(info.nbStreams > 0);
    assert.strictEqual(info.streams.length, info.nbStreams);
  });

  it('should populate video stream fields', async () => {
    const info = await probe(inputFile);
    const video = info.video;
    assert.ok(video, 'Should have a video stream');
    assert.strictEqual(video.type, 'video');
    assert.ok(video.codec.length > 0, 'Should have a codec name');
    assert.ok((video.width ?? 0) > 0, 'Should have width');
    assert.ok((video.height ?? 0) > 0, 'Should have height');
    assert.ok(video.pixelFormat, 'Should have a pixel format name');
    assert.strictEqual(typeof video.frameRate, 'number');
  });

  it('should expose the video convenience accessor consistently', async () => {
    const info = await probe(inputFile);
    const firstVideo = info.streams.find((s) => s.type === 'video');
    assert.deepStrictEqual(info.video, firstVideo);
  });

  it('should probe from a Buffer', async () => {
    const buffer = readFileSync(inputFile);
    const info = await probe(buffer);
    assert.ok(info.nbStreams > 0, 'Should probe in-memory buffer');
  });

  it('should reject a non-existent file', async () => {
    await assert.rejects(() => probe(getInputFile('does-not-exist.mp4')));
  });
});
