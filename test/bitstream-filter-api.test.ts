import assert from 'node:assert';
import { existsSync, unlinkSync } from 'node:fs';
import { describe, it } from 'node:test';

import { AV_CODEC_ID_H264, BitStreamFilterAPI, Decoder, Demuxer, Encoder, FF_ENCODER_LIBX264, Muxer, Packet, pipeline } from '../src/index.js';
import { getInputFile, getOutputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputFile = getInputFile('demux.mp4');

describe('BitStreamFilterAPI', () => {
  describe('Basic Operations', () => {
    it('should throw for non-existent filter', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();

      assert.throws(() => BitStreamFilterAPI.create('non_existent_filter', stream!), /not found/);
    });
  });

  describe('Packet Processing', () => {
    it('should filter packets through null filter (async)', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using bsf = BitStreamFilterAPI.create('null', stream);

      // Process a few packets
      let packetsProcessed = 0;
      const maxPackets = 5;

      for await (using packet of media.packets()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex !== stream.index) {
          continue;
        }

        const filtered = await bsf.filterAll(packet);

        // null filter should pass packets through
        assert.ok(Array.isArray(filtered), 'Should return array of packets');

        for (const outPacket of filtered) {
          assert.ok(outPacket instanceof Packet);
          assert.ok(outPacket.size >= 0);
          outPacket.free(); // Free packet after use
        }

        packetsProcessed++;
        if (packetsProcessed >= maxPackets) {
          break;
        }
      }

      assert.ok(packetsProcessed > 0, 'Should have processed at least one packet');
    });

    it('should filter packets through null filter (sync)', () => {
      using media = Demuxer.openSync(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using bsf = BitStreamFilterAPI.create('null', stream);

      // Process a few packets
      let packetsProcessed = 0;
      const maxPackets = 5;

      for (using packet of media.packetsSync()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex !== stream.index) {
          continue;
        }

        const filtered = bsf.filterAllSync(packet);

        // null filter should pass packets through
        assert.ok(Array.isArray(filtered), 'Should return array of packets');

        for (const outPacket of filtered) {
          assert.ok(outPacket instanceof Packet);
          assert.ok(outPacket.size >= 0);
          outPacket.free(); // Free packet after use
        }

        packetsProcessed++;
        if (packetsProcessed >= maxPackets) {
          break;
        }
      }

      assert.ok(packetsProcessed > 0, 'Should have processed at least one packet');
    });

    it('should handle flush correctly (async)', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using bsf = BitStreamFilterAPI.create('null', stream);

      // Process one packet
      for await (using packet of media.packets()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex !== stream.index) {
          continue;
        }

        await bsf.filter(packet);
        break; // Just filter one
      }

      // Flush
      const remaining: Packet[] = [];
      for await (using pkt of bsf.flushPackets()) {
        remaining.push(pkt);
      }
      assert.ok(Array.isArray(remaining), 'Flush should return array');
    });

    it('should handle flush correctly (sync)', () => {
      using media = Demuxer.openSync(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using bsf = BitStreamFilterAPI.create('null', stream);

      // Process one packet
      for (using packet of media.packetsSync()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex !== stream.index) {
          continue;
        }

        bsf.filterSync(packet);
        break; // Just filter one
      }

      const remaining: Packet[] = [];
      for (const pkt of bsf.flushPacketsSync()) {
        remaining.push(pkt);
      }

      assert.ok(Array.isArray(remaining), 'Flush should return array');
    });

    it('should handle flushPackets generator (async)', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using bsf = BitStreamFilterAPI.create('null', stream);

      // Process one packet
      for await (using packet of media.packets()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex !== stream.index) {
          continue;
        }

        await bsf.filter(packet);
        break; // Just filter one
      }

      // Flush with generator
      let flushedCount = 0;
      for await (using packet of bsf.flushPackets()) {
        assert.ok(packet instanceof Packet);
        flushedCount++;
      }

      // null filter may or may not have buffered packets
      assert.ok(flushedCount >= 0, 'Should filter flush packets');
    });

    it('should handle flushPackets generator (sync)', () => {
      using media = Demuxer.openSync(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using bsf = BitStreamFilterAPI.create('null', stream);

      // Process one packet
      for (using packet of media.packetsSync()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex !== stream.index) {
          continue;
        }

        bsf.filterSync(packet);
        break; // Just filter one
      }

      // Flush with generator
      let flushedCount = 0;
      for (using packet of bsf.flushPacketsSync()) {
        assert.ok(packet instanceof Packet);
        flushedCount++;
      }

      // null filter may or may not have buffered packets
      assert.ok(flushedCount >= 0, 'Should filter flush packets');
    });

    it('should reset filter state', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using bsf = BitStreamFilterAPI.create('null', stream);

      // Reset should not throw
      assert.doesNotThrow(() => bsf.reset());
    });
  });

  describe('Stream Processing', () => {
    it('should filter packet stream with packets (async)', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using bsf = BitStreamFilterAPI.create('null', stream);

      // Create filtered packet stream
      async function* videoPackets() {
        let count = 0;
        for await (using packet of media.packets()) {
          if (!packet) {
            break;
          }

          if (packet.streamIndex === stream?.index) {
            yield packet;
            count++;
            if (count >= 5) break; // Limit for test
          }
        }
      }

      let processedCount = 0;
      for await (using filtered of bsf.packets(videoPackets())) {
        if (!filtered) {
          break;
        }
        assert.ok(filtered instanceof Packet);
        assert.ok(filtered.size >= 0);
        processedCount++;
      }

      assert.ok(processedCount > 0, 'Should have processed packets');
    });

    it('should filter packet stream with packets (sync)', () => {
      using media = Demuxer.openSync(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using bsf = BitStreamFilterAPI.create('null', stream);

      // Create filtered packet stream
      function* videoPackets() {
        let count = 0;
        for (using packet of media.packetsSync()) {
          if (!packet) {
            break;
          }

          if (packet.streamIndex === stream?.index) {
            yield packet;
            count++;
            if (count >= 5) break; // Limit for test
          }
        }
      }

      let processedCount = 0;
      for (using filtered of bsf.packetsSync(videoPackets())) {
        if (!filtered) {
          break;
        }

        assert.ok(filtered instanceof Packet);
        assert.ok(filtered.size >= 0);
        processedCount++;
      }

      assert.ok(processedCount > 0, 'Should have processed packets');
    });
  });

  describe('H.264 Filtering', () => {
    it('should filter H.264 with h264_mp4toannexb filter (async)', async function (t) {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();

      if (stream?.codecpar.codecId !== AV_CODEC_ID_H264) {
        t.skip();
        return;
      }

      // Try to create h264_mp4toannexb filter
      using bsf = BitStreamFilterAPI.create('h264_mp4toannexb', stream);

      // Check output parameters
      assert.ok(bsf.outputCodecParameters, 'Should have output codec parameters');
      assert.ok(bsf.outputTimeBase, 'Should have output time base');

      // Process a few packets
      let packetsProcessed = 0;
      const maxPackets = 3;

      for await (using packet of media.packets()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex !== stream.index) {
          continue;
        }

        const filtered = await bsf.filterAll(packet);

        for (const outPacket of filtered) {
          if (!outPacket) {
            continue;
          }

          assert.ok(outPacket.size > 0, 'Filtered packet should have data');
          // h264_mp4toannexb converts MP4 format to Annex B
          // The output should be valid H.264 Annex B stream
        }

        packetsProcessed++;
        if (packetsProcessed >= maxPackets) {
          break;
        }
      }

      assert.ok(packetsProcessed > 0, 'Should have processed at least one packet');
    });

    it('should filter H.264 with h264_mp4toannexb filter (sync)', function (t) {
      using media = Demuxer.openSync(inputFile);
      const stream = media.video();

      if (stream?.codecpar.codecId !== AV_CODEC_ID_H264) {
        t.skip();
        return;
      }

      // Try to create h264_mp4toannexb filter
      using bsf = BitStreamFilterAPI.create('h264_mp4toannexb', stream);

      // Check output parameters
      assert.ok(bsf.outputCodecParameters, 'Should have output codec parameters');
      assert.ok(bsf.outputTimeBase, 'Should have output time base');

      // Process a few packets
      let packetsProcessed = 0;
      const maxPackets = 3;

      for (using packet of media.packetsSync()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex !== stream.index) {
          continue;
        }

        const filtered = bsf.filterAllSync(packet);

        for (const outPacket of filtered) {
          assert.ok(outPacket.size > 0, 'Filtered packet should have data');
          // h264_mp4toannexb converts MP4 format to Annex B
          // The output should be valid H.264 Annex B stream
        }

        packetsProcessed++;
        if (packetsProcessed >= maxPackets) {
          break;
        }
      }

      assert.ok(packetsProcessed > 0, 'Should have processed at least one packet');
    });
  });

  describe('Error Handling', () => {
    it('should not throw when using disposed filter', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      const bsf = BitStreamFilterAPI.create('null', stream);
      bsf.close();

      // Create a test packet
      const packet = new Packet();
      packet.alloc();

      // Should not throw when trying to use disposed filter
      await assert.doesNotReject(async () => await bsf.filter(packet));
      await assert.doesNotReject(async () => await bsf.flush());
      assert.doesNotThrow(() => bsf.reset());

      packet.unref();
    });

    it('should not throw when using disposed filter (sync)', () => {
      using media = Demuxer.openSync(inputFile);
      const stream = media.video();
      assert.ok(stream);

      const bsf = BitStreamFilterAPI.create('null', stream);
      bsf.close();

      // Create a test packet
      const packet = new Packet();
      packet.alloc();

      // Should not throw when trying to use disposed filter
      assert.doesNotThrow(() => bsf.filterSync(packet));
      assert.doesNotThrow(() => bsf.flushSync());
      assert.doesNotThrow(() => bsf.reset());

      packet.unref();
    });
  });

  describe('Filter Options', () => {
    it('should accept filter options for h264_metadata', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      // Check if codec is H.264
      if (stream.codecpar.codecId !== AV_CODEC_ID_H264) {
        // Skip test if not H.264
        return;
      }

      // Create filter with options
      using bsf = BitStreamFilterAPI.create('h264_metadata', stream, {
        options: {
          aud: 'remove',
        },
      });

      assert.ok(bsf);
      assert.strictEqual(bsf.name, 'h264_metadata');

      // Process a few packets to verify it works
      let packetsProcessed = 0;
      const maxPackets = 3;

      for await (using packet of media.packets()) {
        if (!packet) break;
        if (packet.streamIndex !== stream.index) continue;

        const filtered = await bsf.filterAll(packet);
        assert.ok(Array.isArray(filtered));

        for (const outPacket of filtered) {
          outPacket.free();
        }

        packetsProcessed++;
        if (packetsProcessed >= maxPackets) break;
      }

      assert.ok(packetsProcessed > 0, 'Should have processed at least one packet');
    });

    it('should throw for invalid filter option', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      // Try to create filter with invalid option
      assert.throws(
        () =>
          BitStreamFilterAPI.create('null', stream, {
            options: {
              invalid_option_that_does_not_exist: 'value',
            },
          }),
        /Failed to set bitstream filter option/,
      );
    });
  });

  describe('Lazy Initialization', () => {
    it('should initialize on the first packet (async)', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using bsf = BitStreamFilterAPI.create('null', stream);
      assert.strictEqual(bsf.isInitialized, false, 'Should not be initialized before the first packet');

      for await (using packet of media.packets()) {
        if (!packet) break;
        if (packet.streamIndex !== stream.index) continue;

        const filtered = await bsf.filterAll(packet);
        for (const outPacket of filtered) {
          outPacket.free();
        }
        break;
      }

      assert.strictEqual(bsf.isInitialized, true, 'Should be initialized after the first packet');
    });

    it('should initialize on the first packet (sync)', () => {
      using media = Demuxer.openSync(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using bsf = BitStreamFilterAPI.create('null', stream);
      assert.strictEqual(bsf.isInitialized, false);

      for (using packet of media.packetsSync()) {
        if (!packet) break;
        if (packet.streamIndex !== stream.index) continue;

        const filtered = bsf.filterAllSync(packet);
        for (const outPacket of filtered) {
          outPacket.free();
        }
        break;
      }

      assert.strictEqual(bsf.isInitialized, true);
    });
  });

  describe('Encoder Source', () => {
    it('should throw from getStream() when created from an encoder', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using decoder = await Decoder.create(stream);
      using encoder = await Encoder.create(FF_ENCODER_LIBX264, { decoder, bitrate: '1M' });
      using bsf = BitStreamFilterAPI.create('h264_metadata', encoder, { options: { aud: 'remove' } });

      assert.throws(() => bsf.getStream(), /No associated stream/);
    });

    it('should derive parameters from the encoder and write them to the container (transcode)', async () => {
      const outputFile = getOutputFile('bsf-encoder-source.mp4');

      try {
        await using input = await Demuxer.open(inputFile);
        const videoStream = input.video();
        assert.ok(videoStream);

        using decoder = await Decoder.create(videoStream);
        using encoder = await Encoder.create(FF_ENCODER_LIBX264, { decoder, bitrate: '1M' });

        // The filter derives its parameters from the encoder's output (lazy),
        // and rewrites the H.264 level - which must reach the container.
        using bsf = BitStreamFilterAPI.create('h264_metadata', encoder, {
          options: { aud: 'remove', level: '4.1' },
        });

        const output = await Muxer.open(outputFile);
        const { completion } = pipeline(input, decoder, encoder, bsf, output);
        await completion;
        await output.close();

        assert.ok(existsSync(outputFile), 'Output file should exist');

        // h264_metadata level '4.1' -> level_idc 41 in the written avcC.
        await using result = await Demuxer.open(outputFile);
        const outVideo = result.video();
        assert.ok(outVideo);
        assert.strictEqual(outVideo.codecpar.level, 41, 'Container level should reflect the bitstream filter output');
      } finally {
        if (existsSync(outputFile)) {
          unlinkSync(outputFile);
        }
      }
    });
  });
});
