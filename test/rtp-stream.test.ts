import assert from 'node:assert';
import { writeFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { FF_ENCODER_LIBX264 } from '../src/index.js';
import { getInputFile, getOutputFile, prepareTestEnvironment } from './index.js';

import type { RtpPacket } from 'werift';
import type { RTPStreamOptions } from '../src/webrtc/index.js';

prepareTestEnvironment();

const weriftAvailable = await import('werift').then(
  () => true,
  () => false,
);
const skipWerift = { skip: weriftAvailable ? false : 'werift not installed (optional dependency)' };

interface VideoRtpInfo {
  timestamp: number;
  marker: boolean;
}

async function collectVideoRtp(input: string, options: RTPStreamOptions = {}): Promise<VideoRtpInfo[]> {
  const { RTPStream } = await import('../src/webrtc/index.js');
  const packets: VideoRtpInfo[] = [];
  let resolveClosed!: () => void;
  let rejectClosed!: (error: Error) => void;
  const closed = new Promise<void>((resolve, reject) => {
    resolveClosed = resolve;
    rejectClosed = reject;
  });

  const stream = RTPStream.create(input, {
    ...options,
    onVideoPacket: (rtp: RtpPacket) => {
      packets.push({ timestamp: rtp.header.timestamp, marker: rtp.header.marker });
    },
    onClose: (error) => (error ? rejectClosed(error) : resolveClosed()),
  });

  await stream.start();
  await closed;
  await stream.stop();
  return packets;
}

function frameTimestamps(packets: VideoRtpInfo[]): number[] {
  return packets.filter((p) => p.marker).map((p) => p.timestamp);
}

function rtpDelta(from: number, to: number): number {
  const delta = (to - from) >>> 0;
  return delta > 0x7fffffff ? delta - 0x100000000 : delta;
}

function increments(timestamps: number[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    result.push(rtpDelta(timestamps[i - 1], timestamps[i]));
  }
  return result;
}

describe('RTPStream', skipWerift, () => {
  describe('RTP timestamps', () => {
    it('derives passthrough timestamps from packet PTS (24 fps input, not the old 20 fps default)', async () => {
      // video.mp4: h264, 24 fps, no B-frames => exactly 3750 ticks per frame.
      const packets = await collectVideoRtp(getInputFile('video.mp4'));
      const frames = frameTimestamps(packets);
      assert.ok(frames.length >= 24, `expected at least 24 frames, got ${frames.length}`);

      for (const inc of increments(frames)) {
        assert.strictEqual(inc, 3750, `expected 90000/24 = 3750 ticks per frame, got ${inc}`);
      }
    });

    it('keeps presentation times for B-frame passthrough (uniform 30 fps cadence)', async () => {
      // demux.mp4: h264 with B-frames, 30 fps. Packets leave in decode order, so
      // timestamps are not monotonic - but sorted by presentation time they must
      // be spaced exactly 90000/30 = 3000 ticks apart.
      const packets = await collectVideoRtp(getInputFile('demux.mp4'));
      const frames = frameTimestamps(packets);
      assert.ok(frames.length >= 30, `expected at least 30 frames, got ${frames.length}`);

      const base = frames[0];
      const relative = frames.map((t) => rtpDelta(base, t)).sort((a, b) => a - b);
      for (let i = 1; i < relative.length; i++) {
        assert.strictEqual(relative[i] - relative[i - 1], 3000, `expected uniform 3000-tick presentation spacing, got ${relative[i] - relative[i - 1]}`);
      }
    });
  });

  describe('fps fallback', () => {
    it('keeps the input frame rate when transcoding without an fps option', async () => {
      // video-vp8.webm: 30 fps in a 1/1000 timebase (33/34 ms per frame), forced
      // to transcode via libx264. Without an explicit fps option no fps filter
      // may be inserted - increments must track the input cadence (~3000 ticks),
      // not the removed 20 fps default (4500 ticks).
      const packets = await collectVideoRtp(getInputFile('video-vp8.webm'), {
        supportedVideoCodecs: [FF_ENCODER_LIBX264],
      });
      const frames = frameTimestamps(packets);
      assert.ok(frames.length >= 5, `expected at least 5 frames, got ${frames.length}`);

      for (const inc of increments(frames)) {
        assert.ok(inc >= 2900 && inc <= 3100, `expected ~3000 ticks (30 fps input), got ${inc}`);
      }
    });

    it('applies an explicit fps option when transcoding', async () => {
      const packets = await collectVideoRtp(getInputFile('video-vp8.webm'), {
        supportedVideoCodecs: [FF_ENCODER_LIBX264],
        video: { fps: 10 },
      });
      const frames = frameTimestamps(packets);
      assert.ok(frames.length >= 3, `expected at least 3 frames, got ${frames.length}`);

      for (const inc of increments(frames)) {
        assert.ok(Math.abs(inc - 9000) <= 90, `expected ~9000 ticks (10 fps option), got ${inc}`);
      }
    });
  });

  describe('scaling', () => {
    it('transcodes and scales a packed yuyv422 source (issue #294)', async () => {
      // A yuyv422 (packed 4:2:2) source fed through scale=WxH used to fail: swscale can't
      // scale packed yuyv422 in place (yuyv422 -> yuyv422 => ENOSYS on some builds) and
      // libx264 rejects yuyv422 outright. The scale chain must pin the output to yuv420p.
      // Synthesize a few frames of gray yuyv422 rawvideo - the exact pixel values don't
      // matter, only that the demuxer reads them as yuyv422 and the graph has to convert.
      const width = 320;
      const height = 240;
      const frames = 6;
      const frame = Buffer.alloc(width * height * 2, 0x80);
      const raw = Buffer.concat(Array.from({ length: frames }, () => frame));
      const rawPath = getOutputFile('issue-294-yuyv422.raw');
      writeFileSync(rawPath, raw);

      const packets = await collectVideoRtp(rawPath, {
        supportedVideoCodecs: [FF_ENCODER_LIBX264],
        inputOptions: { format: 'rawvideo', options: { pixel_format: 'yuyv422', video_size: `${width}x${height}`, framerate: '12' } },
        video: { width: 160, height: 120 },
      });

      assert.ok(packets.length > 0, 'expected RTP packets from the scaled yuyv422 source');
    });
  });

  describe('abort handling', () => {
    it('aborts via signal without unhandled rejections', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');
      const rejections: unknown[] = [];
      const onRejection = (reason: unknown) => rejections.push(reason);
      process.on('unhandledRejection', onRejection);

      try {
        const controller = new AbortController();
        const stream = RTPStream.create(getInputFile('video.mp4'), { signal: controller.signal });
        await stream.start();
        controller.abort();

        const deadline = Date.now() + 5000;
        while (stream.isStreamActive && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        assert.ok(!stream.isStreamActive, 'stream must stop after abort');

        await stream.stop();
        await new Promise((resolve) => setImmediate(resolve));
        assert.strictEqual(rejections.length, 0, `unhandled rejections after abort: ${String(rejections[0])}`);
      } finally {
        process.off('unhandledRejection', onRejection);
      }
    });

    it('removes the abort listener on stop and does not accumulate listeners across restarts', async () => {
      const { RTPStream } = await import('../src/webrtc/index.js');
      const rejections: unknown[] = [];
      const onRejection = (reason: unknown) => rejections.push(reason);
      process.on('unhandledRejection', onRejection);

      const warnings: Error[] = [];
      const onWarning = (warning: Error) => warnings.push(warning);
      process.on('warning', onWarning);

      try {
        const controller = new AbortController();
        const stream = RTPStream.create(getInputFile('video.mp4'), { signal: controller.signal });

        // One abort listener per start() would trip MaxListenersExceededWarning here.
        for (let i = 0; i < 15; i++) {
          await stream.start();
          await stream.stop();
        }

        // Aborting after stop() must be a no-op (listener already detached).
        controller.abort();
        await new Promise((resolve) => setImmediate(resolve));

        assert.strictEqual(rejections.length, 0, `unhandled rejections: ${String(rejections[0])}`);
        assert.ok(!warnings.some((w) => w.name === 'MaxListenersExceededWarning'), 'abort listeners accumulated across restarts');
      } finally {
        process.off('unhandledRejection', onRejection);
        process.off('warning', onWarning);
      }
    });
  });
});
