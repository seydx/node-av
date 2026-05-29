/**
 * High-Level API Example: probe()
 *
 * Demonstrates the high-level `probe()` helper - a one-call, typed equivalent of
 * `ffprobe -show_format -show_streams` that returns a plain object (no manual
 * Demuxer handling).
 *
 * Usage: tsx examples/api-probe.ts [input]
 * Example: tsx examples/api-probe.ts testdata/video.mp4
 */

import { probe } from '../src/index.js';

const inputFile = process.argv[2] ?? 'testdata/video.mp4';

const info = await probe(inputFile);

console.log(`Format:   ${info.format} (${info.formatLongName})`);
console.log(`Duration: ${info.duration.toFixed(2)}s`);
console.log(`Bitrate:  ${Math.round(info.bitrate / 1000)} kb/s`);
console.log(`Streams:  ${info.nbStreams}`);

for (const stream of info.streams) {
  if (stream.type === 'video') {
    console.log(`  #${stream.index} video: ${stream.codec} ${stream.width}x${stream.height} @ ${stream.frameRate?.toFixed(2)} fps, ${stream.pixelFormat}`);
  } else if (stream.type === 'audio') {
    console.log(`  #${stream.index} audio: ${stream.codec} ${stream.sampleRate} Hz, ${stream.channels} ch, ${stream.sampleFormat}`);
  } else {
    console.log(`  #${stream.index} ${stream.type}: ${stream.codec}`);
  }
}

// Convenience accessors for the common case.
if (info.video) {
  console.log(`\nPrimary video: ${info.video.codec} ${info.video.width}x${info.video.height}`);
}
if (info.audio) {
  console.log(`Primary audio: ${info.audio.codec} ${info.audio.channels}ch @ ${info.audio.sampleRate} Hz`);
}
