import assert from 'node:assert';
import { after, describe, it } from 'node:test';

import { AVERROR_EAGAIN, AVERROR_EOF, AVMEDIA_TYPE_AUDIO, AVMEDIA_TYPE_VIDEO, Demuxer, Packet, SyncQueue, SyncQueueType } from '../src/index.js';
import { getInputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputFile = getInputFile('demux.mp4');

describe('SyncQueue', () => {
  const openInstances: Demuxer[] = [];
  const queues: SyncQueue[] = [];

  after(async () => {
    // Close all media inputs
    for (const instance of openInstances) {
      try {
        await instance.close();
      } catch {
        // Ignore
      }
    }
    openInstances.length = 0;

    // Free all queues
    for (const queue of queues) {
      try {
        queue.free();
      } catch {
        // Ignore
      }
    }
    queues.length = 0;

    // Small delay for cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (global.gc) {
      global.gc();
    }
  });

  describe('Lifecycle', () => {
    it('should create a sync queue with default parameters', () => {
      const sq = SyncQueue.create();
      queues.push(sq);

      assert.ok(sq, 'Should create SyncQueue');
    });

    it('should create a sync queue with PACKETS type', () => {
      const sq = SyncQueue.create(SyncQueueType.PACKETS, 500000);
      queues.push(sq);

      assert.ok(sq, 'Should create SyncQueue with PACKETS type');
    });

    it('should create a sync queue with FRAMES type', () => {
      const sq = SyncQueue.create(SyncQueueType.FRAMES, 1000000);
      queues.push(sq);

      assert.ok(sq, 'Should create SyncQueue with FRAMES type');
    });

    it('should support using statement for automatic disposal', () => {
      using sq = SyncQueue.create(SyncQueueType.PACKETS, 100000);
      assert.ok(sq, 'Should create SyncQueue');
      // sq will be automatically freed when leaving scope
    });

    it('should free the queue', () => {
      const sq = SyncQueue.create();
      sq.free();

      // After free, operations should fail
      assert.throws(
        () => {
          sq.addStream(1);
        },
        {
          message: /Sync queue not initialized/,
        },
      );
    });
  });

  describe('Stream Management', () => {
    it('should add a stream to the queue', () => {
      const sq = SyncQueue.create();
      queues.push(sq);

      const streamIdx = sq.addStream(1);
      assert.equal(streamIdx, 0, 'First stream should have index 0');
    });

    it('should add multiple streams', () => {
      const sq = SyncQueue.create();
      queues.push(sq);

      const videoIdx = sq.addStream(1);
      const audioIdx = sq.addStream(1);

      assert.equal(videoIdx, 0, 'First stream index');
      assert.equal(audioIdx, 1, 'Second stream index');
    });

    it('should add limiting and non-limiting streams', () => {
      const sq = SyncQueue.create();
      queues.push(sq);

      const videoIdx = sq.addStream(1); // Limiting
      const audioIdx = sq.addStream(1); // Limiting
      const subtitleIdx = sq.addStream(0); // Non-limiting

      assert.equal(videoIdx, 0);
      assert.equal(audioIdx, 1);
      assert.equal(subtitleIdx, 2);
    });
  });

  describe('Packet Operations', () => {
    it('should send and receive packets', async () => {
      const sq = SyncQueue.create(SyncQueueType.PACKETS, 5000000);
      queues.push(sq);

      const streamIdx = sq.addStream(1);

      // Create a test packet
      const sendPacket = new Packet();
      sendPacket.alloc();
      sendPacket.streamIndex = streamIdx;
      sendPacket.pts = 1000n;
      sendPacket.dts = 1000n;
      sendPacket.duration = 40n;
      sendPacket.timeBase = { num: 1, den: 90000 }; // Standard video timebase

      // Send the packet
      const sendRet = sq.send(streamIdx, sendPacket);
      assert.equal(sendRet, 0, 'Should successfully send packet');

      // Receive the packet
      const recvPacket = new Packet();
      recvPacket.alloc();
      const recvRet = sq.receive(-1, recvPacket);

      assert.equal(recvRet, streamIdx, 'Should receive from correct stream');
      assert.equal(recvPacket.pts, 1000n, 'PTS should match');
      assert.equal(recvPacket.dts, 1000n, 'DTS should match');
      assert.equal(recvPacket.duration, 40n, 'Duration should match');

      sendPacket.free();
      recvPacket.free();
    });

    it('should return EAGAIN when no packets are ready', () => {
      const sq = SyncQueue.create(SyncQueueType.PACKETS, 100000);
      queues.push(sq);

      sq.addStream(1);

      const packet = new Packet();
      packet.alloc();

      // Try to receive without sending anything
      const ret = sq.receive(-1, packet);
      assert.equal(ret, AVERROR_EAGAIN, 'Should return EAGAIN when no packets ready');

      packet.free();
    });

    it('should handle multiple streams with FFmpeg mux pattern', async () => {
      const sq = SyncQueue.create(SyncQueueType.PACKETS, 5000000);
      queues.push(sq);

      const videoIdx = sq.addStream(1);
      const audioIdx = sq.addStream(1);

      // Send some video packets
      for (let i = 0; i < 5; i++) {
        const pkt = new Packet();
        pkt.alloc();
        pkt.streamIndex = videoIdx;
        pkt.pts = BigInt(i * 40);
        pkt.dts = BigInt(i * 40);
        pkt.duration = 40n;
        pkt.timeBase = { num: 1, den: 90000 }; // Standard video timebase

        const ret = sq.send(videoIdx, pkt);
        assert.equal(ret, 0, `Should send video packet ${i}`);
        pkt.free();
      }

      // Send some audio packets
      for (let i = 0; i < 10; i++) {
        const pkt = new Packet();
        pkt.alloc();
        pkt.streamIndex = audioIdx;
        pkt.pts = BigInt(i * 20);
        pkt.dts = BigInt(i * 20);
        pkt.duration = 20n;
        pkt.timeBase = { num: 1, den: 48000 }; // Standard audio timebase

        const ret = sq.send(audioIdx, pkt);
        assert.equal(ret, 0, `Should send audio packet ${i}`);
        pkt.free();
      }

      // Receive packets using FFmpeg mux pattern
      const receivedPackets: { streamIdx: number; pts: bigint }[] = [];
      const recvPacket = new Packet();
      recvPacket.alloc();

      while (true) {
        const ret = sq.receive(-1, recvPacket);
        if (ret === AVERROR_EAGAIN) {
          break; // No more packets ready
        }
        if (ret === AVERROR_EOF) {
          break; // All streams finished
        }
        if (ret >= 0) {
          // ret is the stream index
          receivedPackets.push({
            streamIdx: ret,
            pts: recvPacket.pts,
          });
        }
      }

      recvPacket.free();

      // Should have received some packets
      assert.ok(receivedPackets.length > 0, 'Should receive some packets');

      // Packets should be interleaved (both streams represented)
      const videoPackets = receivedPackets.filter((p) => p.streamIdx === videoIdx);
      const audioPackets = receivedPackets.filter((p) => p.streamIdx === audioIdx);

      assert.ok(videoPackets.length > 0, 'Should have video packets');
      assert.ok(audioPackets.length > 0, 'Should have audio packets');
    });
  });

  describe('Real Media File Integration', () => {
    it('should synchronize packets from real media file', async () => {
      const media = await Demuxer.open(inputFile);
      openInstances.push(media);

      const sq = SyncQueue.create(SyncQueueType.PACKETS, 5000000);
      queues.push(sq);

      // Find video and audio streams
      const videoStream = media.streams.find((s) => s.codecpar.codecType === AVMEDIA_TYPE_VIDEO);
      const audioStream = media.streams.find((s) => s.codecpar.codecType === AVMEDIA_TYPE_AUDIO);

      assert.ok(videoStream, 'Should have video stream');
      assert.ok(audioStream, 'Should have audio stream');

      // Add streams to sync queue
      const videoSqIdx = sq.addStream(1);
      const audioSqIdx = sq.addStream(1);

      // Map stream indices
      const streamMap = new Map<number, number>();
      streamMap.set(videoStream.index, videoSqIdx);
      streamMap.set(audioStream.index, audioSqIdx);

      // Read some packets from the media file
      const sentPackets = [];

      for await (using packet of media.packets()) {
        if (!packet) {
          break;
        }

        const sqIdx = streamMap.get(packet.streamIndex);
        if (sqIdx !== undefined) {
          // Set packet timeBase from stream (required by sync_queue)
          const stream = packet.streamIndex === videoStream.index ? videoStream : audioStream;
          packet.timeBase = stream.timeBase;

          const sendRet = sq.send(sqIdx, packet);
          if (sendRet === 0) {
            sentPackets.push({
              sqIdx,
              pts: packet.pts,
              dts: packet.dts,
            });
          }
        }
      }

      assert.ok(sentPackets.length > 0, 'Should have sent packets');

      // Receive synchronized packets
      const receivedPackets = [];
      const recvPacket = new Packet();
      recvPacket.alloc();

      while (true) {
        const ret = sq.receive(-1, recvPacket);
        if (ret === AVERROR_EAGAIN) {
          break; // No more packets ready
        }
        if (ret === AVERROR_EOF) {
          break;
        }
        if (ret >= 0) {
          receivedPackets.push({
            streamIdx: ret,
            pts: recvPacket.pts,
            dts: recvPacket.dts,
          });
        }
      }

      recvPacket.free();

      // Verify we received packets
      assert.ok(receivedPackets.length > 0, 'Should receive packets');

      // Verify packets are from both streams (interleaved)
      const videoReceived = receivedPackets.filter((p) => p.streamIdx === videoSqIdx);
      const audioReceived = receivedPackets.filter((p) => p.streamIdx === audioSqIdx);

      assert.ok(videoReceived.length > 0, 'Should have received video packets');
      assert.ok(audioReceived.length > 0, 'Should have received audio packets');

      console.log(`Sent ${sentPackets.length} packets, received ${receivedPackets.length} packets`);
      console.log(`Video: ${videoReceived.length}, Audio: ${audioReceived.length}`);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when operating on uninitialized queue', () => {
      const sq = SyncQueue.create();
      sq.free();

      assert.throws(
        () => {
          sq.addStream(1);
        },
        {
          message: /Sync queue not initialized/,
        },
      );
    });

    it('should handle invalid stream index', () => {
      const sq = SyncQueue.create();
      queues.push(sq);

      const packet = new Packet();
      packet.alloc();
      packet.timeBase = { num: 1, den: 90000 };

      // Try to send to non-existent stream
      const ret = sq.send(999, packet);
      assert.ok(ret < 0, 'Should return error for invalid stream index');

      packet.free();
    });

    it('should not retain memory across many send/receive cycles', () => {
      const sq = SyncQueue.create();
      queues.push(sq);
      const streamIdx = sq.addStream(0); // non-limiting: packets pass straight through

      const sendPacket = new Packet();
      sendPacket.alloc();
      sendPacket.timeBase = { num: 1, den: 90000 };
      const recvPacket = new Packet();
      recvPacket.alloc();

      const cycle = (count: number, startPts: bigint): bigint => {
        let pts = startPts;
        for (let i = 0; i < count; i++) {
          sendPacket.pts = pts;
          sendPacket.dts = pts;
          sq.send(streamIdx, sendPacket);
          sq.receive(-1, recvPacket);
          recvPacket.unref();
          pts += 3000n;
        }
        return pts;
      };

      // Warm up so allocator growth is not counted as retention.
      const warmedTo = cycle(50_000, 0n);
      const before = process.memoryUsage().rss;

      const measured = 400_000;
      cycle(measured, warmedTo);
      const perCycle = (process.memoryUsage().rss - before) / measured;

      sendPacket.free();
      recvPacket.free();

      assert.ok(perCycle < 40, `sync queue retains ${perCycle.toFixed(1)} bytes per send/receive cycle`);
    });

    it('should handle receive with specific stream index', () => {
      const sq = SyncQueue.create();
      queues.push(sq);

      const videoIdx = sq.addStream(1);

      // Send a packet
      const sendPacket = new Packet();
      sendPacket.alloc();
      sendPacket.streamIndex = videoIdx;
      sendPacket.pts = 1000n;
      sendPacket.timeBase = { num: 1, den: 90000 };
      sq.send(videoIdx, sendPacket);
      sendPacket.free();

      // Receive from specific stream
      const recvPacket = new Packet();
      recvPacket.alloc();
      const ret = sq.receive(videoIdx, recvPacket);

      assert.equal(ret, videoIdx, 'Should receive from requested stream');
      assert.equal(recvPacket.pts, 1000n);

      recvPacket.free();
    });
  });
});
