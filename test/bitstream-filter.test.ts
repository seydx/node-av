import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_CODEC_ID_AAC,
  AV_CODEC_ID_H264,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  AVMEDIA_TYPE_VIDEO,
  BitStreamFilter,
  BitStreamFilterContext,
  FormatContext,
  Packet,
  Rational,
} from '../src/index.js';
import { getInputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputFile = getInputFile('demux.mp4');

describe('BitStreamFilter', () => {
  describe('Basic Operations', () => {
    it('should find h264_mp4toannexb filter by name', () => {
      const filter = BitStreamFilter.getByName('h264_mp4toannexb');
      assert.ok(filter, 'h264_mp4toannexb filter should exist');
      assert.equal(filter.name, 'h264_mp4toannexb');

      // Check if it supports H.264
      if (filter.codecIds) {
        assert.ok(filter.codecIds.includes(AV_CODEC_ID_H264), 'Should support H.264 codec');
      }
    });

    it('should find aac_adtstoasc filter by name', () => {
      const filter = BitStreamFilter.getByName('aac_adtstoasc');
      assert.ok(filter, 'aac_adtstoasc filter should exist');
      assert.equal(filter.name, 'aac_adtstoasc');

      // Check if it supports AAC
      if (filter.codecIds) {
        assert.ok(filter.codecIds.includes(AV_CODEC_ID_AAC), 'Should support AAC codec');
      }
    });

    it('should return null for non-existent filter', () => {
      const filter = BitStreamFilter.getByName('non_existent_filter');
      assert.equal(filter, null);
    });

    it('should iterate through all available filters', () => {
      const filters = BitStreamFilter.iterate();
      assert.ok(filters.length > 0, 'Should have at least one filter');

      // Check that all filters have names
      for (const filter of filters) {
        assert.ok(filter.name, 'Filter should have a name');
      }

      // Common filters that should exist
      const expectedFilters = ['h264_mp4toannexb', 'aac_adtstoasc', 'null'];
      for (const expectedName of expectedFilters) {
        const found = filters.some((f) => f.name === expectedName);
        assert.ok(found, `Should find ${expectedName} filter`);
      }
    });
  });

  describe('BitStreamFilterContext', () => {
    it('should create and initialize context', () => {
      const filter = BitStreamFilter.getByName('null'); // null filter passes everything through
      assert.ok(filter, 'null filter should exist');

      const ctx = new BitStreamFilterContext();

      // Allocate context
      const allocRet = ctx.alloc(filter);
      assert.equal(allocRet, 0, 'alloc should succeed');

      // Initialize context
      const initRet = ctx.init();
      assert.equal(initRet, 0, 'init should succeed');

      assert.ok(ctx.isInitialized, 'Context should be initialized');

      // Clean up
      ctx.free();
    });

    it('should handle dispose pattern', () => {
      const filter = BitStreamFilter.getByName('null');
      assert.ok(filter);

      {
        using ctx = new BitStreamFilterContext();
        const allocRet = ctx.alloc(filter);
        assert.equal(allocRet, 0);

        const initRet = ctx.init();
        assert.equal(initRet, 0);

        assert.ok(ctx.isInitialized);
      }
      // Context should be automatically freed when leaving scope
    });

    it('should have correct properties after initialization', () => {
      const filter = BitStreamFilter.getByName('null');
      assert.ok(filter);

      const ctx = new BitStreamFilterContext();
      ctx.alloc(filter);

      // Set input time base before init
      ctx.inputTimeBase = new Rational(1, 1000);

      ctx.init();

      // Check properties
      assert.ok(ctx.filter, 'Should have filter reference');
      assert.equal(ctx.filter?.name, 'null');

      assert.ok(ctx.inputTimeBase, 'Should have input time base');
      assert.equal(ctx.inputTimeBase.num, 1);
      assert.equal(ctx.inputTimeBase.den, 1000);

      // Output time base is set by the filter during init
      assert.ok(ctx.outputTimeBase, 'Should have output time base');

      ctx.free();
    });
  });

  describe('Packet Filtering', () => {
    it('should filter packets through null filter (async)', async () => {
      const filter = BitStreamFilter.getByName('null');
      assert.ok(filter);

      const ctx = new BitStreamFilterContext();
      ctx.alloc(filter);
      ctx.init();

      // Create a test packet
      const inputPacket = new Packet();
      inputPacket.alloc(); // Allocate packet structure

      // Send packet
      const sendRet = await ctx.sendPacket(inputPacket);
      assert.ok(sendRet === 0 || sendRet === AVERROR_EAGAIN, 'Send should succeed or need drain'); // 0 or EAGAIN

      // Receive filtered packet
      const outputPacket = new Packet();
      outputPacket.alloc();
      const recvRet = await ctx.receivePacket(outputPacket);

      // null filter should pass packets through
      if (recvRet === 0) {
        assert.ok(outputPacket.size >= 0, 'Output packet should have data');
        outputPacket.unref();
      } else if (recvRet === AVERROR_EAGAIN) {
        // Need to send more packets (EAGAIN)
      } else if (recvRet === AVERROR_EOF) {
        // No more packets
      } else {
        assert.fail(`Unexpected error: ${recvRet}`);
      }

      outputPacket.free();
      inputPacket.unref();
      inputPacket.free();
      ctx.free();
    });

    it('should filter packets through null filter (sync)', () => {
      const filter = BitStreamFilter.getByName('null');
      assert.ok(filter);

      const ctx = new BitStreamFilterContext();
      ctx.alloc(filter);
      ctx.init();

      // Create a test packet
      const inputPacket = new Packet();
      inputPacket.alloc(); // Allocate packet structure

      // Send packet
      const sendRet = ctx.sendPacketSync(inputPacket);
      assert.ok(sendRet === 0 || sendRet === AVERROR_EAGAIN, 'Send should succeed or need drain'); // 0 or EAGAIN

      // Receive filtered packet
      const outputPacket = new Packet();
      outputPacket.alloc();
      const recvRet = ctx.receivePacketSync(outputPacket);

      // null filter should pass packets through
      if (recvRet === 0) {
        assert.ok(outputPacket.size >= 0, 'Output packet should have data');
        outputPacket.unref();
      } else if (recvRet === AVERROR_EAGAIN) {
        // Need to send more packets (EAGAIN)
      } else if (recvRet === AVERROR_EOF) {
        // No more packets
      } else {
        assert.fail(`Unexpected error: ${recvRet}`);
      }

      outputPacket.free();
      inputPacket.unref();
      inputPacket.free();
      ctx.free();
    });

    it('should handle EOF correctly (async)', async () => {
      const filter = BitStreamFilter.getByName('null');
      assert.ok(filter);

      const ctx = new BitStreamFilterContext();
      ctx.alloc(filter);
      ctx.init();

      // Send EOF (null packet)
      const sendRet = await ctx.sendPacket(null);
      assert.equal(sendRet, 0, 'Sending EOF should succeed');

      // Try to receive - should eventually get EOF
      for (let i = 0; i < 10; i++) {
        const outputPacket = new Packet();
        outputPacket.alloc();
        const recvRet = await ctx.receivePacket(outputPacket);

        if (recvRet === AVERROR_EOF) {
          outputPacket.free();
          break;
        } else if (recvRet === 0) {
          // Got a packet, continue
          outputPacket.unref();
          outputPacket.free();
        } else if (recvRet === AVERROR_EAGAIN) {
          // EAGAIN
          // No more packets available right now
          outputPacket.free();
          break;
        } else {
          outputPacket.free();
        }
      }

      ctx.free();
    });

    it('should handle EOF correctly (sync)', () => {
      const filter = BitStreamFilter.getByName('null');
      assert.ok(filter);

      const ctx = new BitStreamFilterContext();
      ctx.alloc(filter);
      ctx.init();

      // Send EOF (null packet)
      const sendRet = ctx.sendPacketSync(null);
      assert.equal(sendRet, 0, 'Sending EOF should succeed');

      // Try to receive - should eventually get EOF
      for (let i = 0; i < 10; i++) {
        const outputPacket = new Packet();
        outputPacket.alloc();
        const recvRet = ctx.receivePacketSync(outputPacket);

        if (recvRet === AVERROR_EOF) {
          outputPacket.free();
          break;
        } else if (recvRet === 0) {
          // Got a packet, continue
          outputPacket.unref();
          outputPacket.free();
        } else if (recvRet === AVERROR_EAGAIN) {
          // EAGAIN
          // No more packets available right now
          outputPacket.free();
          break;
        } else {
          outputPacket.free();
        }
      }

      ctx.free();
    });

    it('should flush context', () => {
      const filter = BitStreamFilter.getByName('null');
      assert.ok(filter);

      const ctx = new BitStreamFilterContext();
      ctx.alloc(filter);
      ctx.init();

      // Flush should not throw
      assert.doesNotThrow(() => {
        ctx.flush();
      });

      ctx.free();
    });
  });

  describe('Real-world Usage with H.264', () => {
    it('should process H.264 stream with h264_mp4toannexb filter (async)', async function (t) {
      // Skip if h264_mp4toannexb is not available
      const filter = BitStreamFilter.getByName('h264_mp4toannexb');
      if (!filter) {
        t.skip();
        return;
      }

      // Open input file
      const formatCtx = new FormatContext();
      await formatCtx.openInput(inputFile, null, null);
      await formatCtx.findStreamInfo(null);

      // Find video stream
      const streams = formatCtx.streams;
      assert.ok(streams, 'Should have streams');
      const videoStream = streams.find((s) => s.codecpar.codecType === AVMEDIA_TYPE_VIDEO);
      assert.ok(videoStream, 'Should find video stream');

      // Only proceed if it's H.264
      if (videoStream.codecpar.codecId !== AV_CODEC_ID_H264) {
        formatCtx.closeInput();
        t.skip();
        return;
      }

      // Create and initialize filter context
      const bsfCtx = new BitStreamFilterContext();
      bsfCtx.alloc(filter);

      // Copy codec parameters
      assert.ok(bsfCtx.inputCodecParameters, 'Input codec parameters should be allocated after alloc()');
      videoStream.codecpar.copy(bsfCtx.inputCodecParameters);
      bsfCtx.inputTimeBase = videoStream.timeBase;

      const initRet = bsfCtx.init();
      assert.equal(initRet, 0, 'BSF init should succeed');

      // Process a few packets
      let packetsProcessed = 0;
      const maxPackets = 5;

      while (packetsProcessed < maxPackets) {
        const packet = new Packet();
        packet.alloc(); // Must allocate packet before reading
        const readRet = await formatCtx.readFrame(packet);

        if (readRet < 0) {
          packet.unref();
          packet.free();
          break;
        }

        // Only process video packets
        if (packet.streamIndex !== videoStream.index) {
          packet.unref();
          packet.free();
          continue;
        }

        // Send packet to filter
        const sendRet = await bsfCtx.sendPacket(packet);
        packet.unref();
        packet.free();

        if (sendRet < 0 && sendRet !== AVERROR_EAGAIN) {
          // Not EAGAIN
          assert.fail(`Failed to send packet: ${sendRet}`);
        }

        // Receive filtered packets
        while (true) {
          const filteredPacket = new Packet();
          filteredPacket.alloc();
          const recvRet = await bsfCtx.receivePacket(filteredPacket);

          if (recvRet === AVERROR_EAGAIN || recvRet === AVERROR_EOF) {
            // EAGAIN or EOF
            filteredPacket.unref();
            filteredPacket.free();
            break;
          }

          if (recvRet < 0) {
            filteredPacket.unref();
            filteredPacket.free();
            assert.fail(`Failed to receive packet: ${recvRet}`);
          }

          // Packet was successfully filtered
          assert.ok(filteredPacket.size > 0, 'Filtered packet should have data');
          filteredPacket.unref();
          filteredPacket.free();
        }

        packetsProcessed++;
      }

      assert.ok(packetsProcessed > 0, 'Should have processed at least one packet');

      // Clean up
      bsfCtx.free();
      formatCtx.closeInput();
    });

    it('should process H.264 stream with h264_mp4toannexb filter (sync)', function (t) {
      // Skip if h264_mp4toannexb is not available
      const filter = BitStreamFilter.getByName('h264_mp4toannexb');
      if (!filter) {
        t.skip();
        return;
      }

      // Open input file
      const formatCtx = new FormatContext();
      formatCtx.openInputSync(inputFile, null, null);
      formatCtx.findStreamInfoSync(null);

      // Find video stream
      const streams = formatCtx.streams;
      assert.ok(streams, 'Should have streams');
      const videoStream = streams.find((s) => s.codecpar.codecType === AVMEDIA_TYPE_VIDEO);
      assert.ok(videoStream, 'Should find video stream');

      // Only proceed if it's H.264
      if (videoStream.codecpar.codecId !== AV_CODEC_ID_H264) {
        formatCtx.closeInputSync();
        t.skip();
        return;
      }

      // Create and initialize filter context
      const bsfCtx = new BitStreamFilterContext();
      bsfCtx.alloc(filter);

      // Copy codec parameters
      assert.ok(bsfCtx.inputCodecParameters, 'Input codec parameters should be allocated after alloc()');
      videoStream.codecpar.copy(bsfCtx.inputCodecParameters);
      bsfCtx.inputTimeBase = videoStream.timeBase;

      const initRet = bsfCtx.init();
      assert.equal(initRet, 0, 'BSF init should succeed');

      // Process a few packets
      let packetsProcessed = 0;
      const maxPackets = 5;

      while (packetsProcessed < maxPackets) {
        const packet = new Packet();
        packet.alloc(); // Must allocate packet before reading
        const readRet = formatCtx.readFrameSync(packet);

        if (readRet < 0) {
          packet.unref();
          packet.free();
          break;
        }

        // Only process video packets
        if (packet.streamIndex !== videoStream.index) {
          packet.unref();
          packet.free();
          continue;
        }

        // Send packet to filter
        const sendRet = bsfCtx.sendPacketSync(packet);
        packet.unref();
        packet.free();

        if (sendRet < 0 && sendRet !== AVERROR_EAGAIN) {
          // Not EAGAIN
          assert.fail(`Failed to send packet: ${sendRet}`);
        }

        // Receive filtered packets
        while (true) {
          const filteredPacket = new Packet();
          filteredPacket.alloc();
          const recvRet = bsfCtx.receivePacketSync(filteredPacket);

          if (recvRet === AVERROR_EAGAIN || recvRet === AVERROR_EOF) {
            // EAGAIN or EOF
            filteredPacket.unref();
            filteredPacket.free();
            break;
          }

          if (recvRet < 0) {
            filteredPacket.unref();
            filteredPacket.free();
            assert.fail(`Failed to receive packet: ${recvRet}`);
          }

          // Packet was successfully filtered
          assert.ok(filteredPacket.size > 0, 'Filtered packet should have data');
          filteredPacket.unref();
          filteredPacket.free();
        }

        packetsProcessed++;
      }

      assert.ok(packetsProcessed > 0, 'Should have processed at least one packet');

      // Clean up
      bsfCtx.free();
      formatCtx.closeInputSync();
    });
  });
});
