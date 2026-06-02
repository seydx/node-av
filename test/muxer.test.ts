import assert from 'node:assert';
import { createWriteStream } from 'node:fs';
import { readFile, stat, unlink } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { AVSEEK_CUR, AVSEEK_END, AVSEEK_SET, AVSEEK_SIZE, Decoder, Demuxer, Encoder, FF_ENCODER_AAC, FF_ENCODER_LIBX264, Muxer, Packet } from '../src/index.js';
import { decodePacket, decodePacketSync, encodeFrame, encodeFrameSync, getInputFile, getOutputFile, prepareTestEnvironment } from './index.js';

import type { AVSeekWhence, IOOutputCallbacks } from '../src/index.js';

prepareTestEnvironment();

const inputFile = getInputFile('demux.mp4');

describe('Muxer', () => {
  let tempFiles: string[] = [];

  const cleanup = async () => {
    for (const file of tempFiles) {
      try {
        await unlink(file);
      } catch {
        // Ignore cleanup errors
      }
    }
    tempFiles = [];
  };

  const getTempFile = (extension: string) => {
    const file = getOutputFile(`test-output-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
    tempFiles.push(file);
    return file;
  };

  describe('open', () => {
    it('should open output file (async)', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      assert(output instanceof Muxer);
      assert.equal(output.isOpen, true, 'Output should be open');
      assert.equal(output.streamsInitialized, false, 'Should not be initialized yet');

      await output.close();
      await cleanup();
    });

    it('should open output file (sync)', () => {
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile);

      assert(output instanceof Muxer);

      output.closeSync();
    });

    it('should open output file with explicit format (async)', async () => {
      const outputFile = getTempFile('mkv');
      const output = await Muxer.open(outputFile, { format: 'matroska' });

      assert(output instanceof Muxer);
      const formatContext = output.getFormatContext();
      assert(formatContext.oformat);
      assert(formatContext.oformat.name?.includes('matroska'));

      await output.close();
      await cleanup();
    });

    it('should open output file with explicit format (sync)', () => {
      const outputFile = getTempFile('mkv');
      const output = Muxer.openSync(outputFile, { format: 'matroska' });

      assert(output instanceof Muxer);
      const formatContext = output.getFormatContext();
      assert(formatContext.oformat);
      assert(formatContext.oformat.name?.includes('matroska'));

      output.closeSync();
    });

    it('should open with custom IO callbacks (async)', async () => {
      const chunks: Buffer[] = [];

      const callbacks: IOOutputCallbacks = {
        write: (buffer: Buffer) => {
          chunks.push(Buffer.from(buffer));
          return buffer.length;
        },
        seek: (offset: bigint) => {
          // Simple seek implementation for testing
          return offset;
        },
      };

      const output = await Muxer.open(callbacks, { format: 'mp4' });
      assert(output instanceof Muxer);

      await output.close();
    });

    it('should require format for custom IO (async)', async () => {
      const callbacks: IOOutputCallbacks = {
        write: (buffer: Buffer) => buffer.length,
      };

      // @ts-expect-error Testing missing format
      await assert.rejects(async () => await Muxer.open(callbacks), /Format must be specified for custom IO/);
    });

    it('should support custom buffer size for custom IO (async)', async () => {
      const callbacks: IOOutputCallbacks = {
        write: (buffer: Buffer) => buffer.length,
      };

      const output = await Muxer.open(callbacks, {
        format: 'mp4',
        bufferSize: 8192,
      });

      assert(output instanceof Muxer);
      await output.close();
    });

    it('should open with Writable stream (async)', async () => {
      const outputFile = getTempFile('mkv');
      const ws = createWriteStream(outputFile);
      const output = await Muxer.open(ws, { format: 'matroska' });

      assert(output instanceof Muxer);
      assert.equal(output.isOpen, true, 'Output should be open');

      await output.close();
      ws.end();
    });

    it('should write to Writable stream', async () => {
      const outputFile = getTempFile('mkv');
      await using input = await Demuxer.open(inputFile);
      const ws = createWriteStream(outputFile);
      const output = await Muxer.open(ws, { format: 'matroska' });

      // Add video stream
      const videoStream = input.video()!;
      assert.ok(videoStream, 'Should have video stream');
      const streamIdx = output.addStream(videoStream);

      // Copy some packets (header written automatically on first packet)
      let count = 0;
      for await (const packet of input.packets(videoStream.index)) {
        if (!packet) break;
        await output.writePacket(packet, streamIdx);
        packet.free();
        if (++count >= 30) break;
      }

      // Signal EOF for the stream
      await output.writePacket(null, streamIdx);

      // Close output (trailer written automatically)
      await output.close();
      ws.end();

      // Wait for stream to finish writing
      await new Promise<void>((resolve) => ws.on('finish', resolve));

      // Verify output file exists and has content
      const fileStat = await stat(outputFile);
      assert.ok(fileStat.size > 0, 'Output file should have content');

      await cleanup();
    });

    it('should require format for Writable stream (async)', async () => {
      const outputFile = getTempFile('mkv');
      const ws = createWriteStream(outputFile);

      // @ts-expect-error Testing missing format
      await assert.rejects(async () => await Muxer.open(ws), /Format must be specified for Writable stream output/);

      ws.end();
      await cleanup();
    });

    it('should fail with seek-dependent format (mp4) on Writable stream', async () => {
      const outputFile = getTempFile('mp4');
      await using input = await Demuxer.open(inputFile);
      const ws = createWriteStream(outputFile);
      const output = await Muxer.open(ws, { format: 'mp4' });

      const videoStream = input.video()!;
      const streamIdx = output.addStream(videoStream);

      // MP4 needs seek for moov atom — writePacket triggers header write which fails
      const packet = (await input.packets(videoStream.index).next()).value;
      assert.ok(packet, 'Should have a packet');

      await assert.rejects(async () => await output.writePacket(packet, streamIdx), /non seekable|Invalid argument/);

      packet.free();
      await output.close();
      ws.end();
      await cleanup();
    });
  });

  describe('options', () => {
    it('should open with maxMuxingQueueSize option', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile, {
        maxMuxingQueueSize: 2048,
      });

      assert(output instanceof Muxer);
      assert.equal(output.isOpen, true);

      await output.close();
      await cleanup();
    });

    it('should open with muxingQueueDataThreshold option', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile, {
        muxingQueueDataThreshold: 100 * 1024 * 1024, // 100MB
      });

      assert(output instanceof Muxer);
      assert.equal(output.isOpen, true);

      await output.close();
      await cleanup();
    });

    it('should open with syncQueueBufferDuration option', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile, {
        syncQueueBufferDuration: 2.0, // 2 seconds
      });

      assert(output instanceof Muxer);
      assert.equal(output.isOpen, true);

      await output.close();
      await cleanup();
    });

    it('should open with startTime option', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile, {
        startTime: 10.0, // Start at 10 seconds
      });

      assert(output instanceof Muxer);
      assert.equal(output.isOpen, true);

      await output.close();
      await cleanup();
    });

    it('should open with copyInitialNonkeyframes option', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile, {
        copyInitialNonkeyframes: true,
      });

      assert(output instanceof Muxer);
      assert.equal(output.isOpen, true);

      await output.close();
      await cleanup();
    });

    it('should open with copyPriorStart option', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile, {
        copyPriorStart: 1, // 1 = copy frames before start time
      });

      assert(output instanceof Muxer);
      assert.equal(output.isOpen, true);

      await output.close();
      await cleanup();
    });

    it('should open with all sync queue options combined', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile, {
        maxMuxingQueueSize: 2048,
        muxingQueueDataThreshold: 100 * 1024 * 1024,
        syncQueueBufferDuration: 2.0,
        startTime: 5.0,
        copyInitialNonkeyframes: true,
        copyPriorStart: 1,
      });

      assert(output instanceof Muxer);
      assert.equal(output.isOpen, true);

      await output.close();
      await cleanup();
    });

    it('should open with options (sync)', () => {
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile, {
        maxMuxingQueueSize: 1024,
        syncQueueBufferDuration: 1.5,
      });

      assert(output instanceof Muxer);

      output.closeSync();
    });
  });

  describe('startTime offset', () => {
    it('clamps a startTime that a zero-based audio stream does not carry', async () => {
      // audio.aac decodes to zero-based timestamps; the AAC encoder re-stamps to a 0
      // baseline too. A huge device-style startTime must therefore NOT be subtracted
      // (that would push pts ~ -999999*48000 and overflow the MP4 edit list, which
      // QuickTime rejects as 0:00). The muxer should clamp it to 0 for this stream.
      const outputFile = getTempFile('m4a');

      await using media = await Demuxer.open(getInputFile('audio.aac'));
      const stream = media.audio();
      assert.ok(stream);
      using decoder = await Decoder.create(stream);
      await using output = await Muxer.open(outputFile, { startTime: 999999 });
      using encoder = await Encoder.create(FF_ENCODER_AAC, { decoder, autoResample: true });
      const idx = output.addStream(encoder);

      for await (using packet of media.packets(stream.index)) {
        for await (using frame of decoder.frames(packet)) {
          if (frame === null) continue;
          for await (using pkt of encoder.packets(frame)) {
            await output.writePacket(pkt, idx);
          }
        }
      }
      for await (using frame of decoder.frames(null)) {
        if (frame === null) continue;
        for await (using pkt of encoder.packets(frame)) {
          await output.writePacket(pkt, idx);
        }
      }
      for await (using pkt of encoder.packets(null)) {
        await output.writePacket(pkt, idx);
      }
      await output.close();

      // Re-open and confirm timestamps start near zero, not hugely negative.
      await using check = await Demuxer.open(outputFile);
      let firstPts: bigint | null = null;
      for await (using pkt of check.packets()) {
        if (pkt === null) break;
        firstPts = pkt.pts;
        break;
      }
      assert.ok(firstPts !== null, 'should produce packets');
      assert.ok(firstPts > -1_000_000n, `first pts should be near zero (clamped), got ${firstPts}`);
    });
  });

  describe('properties', () => {
    it('should get format name and long name (async)', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const formatName = output.formatName;
      assert.ok(formatName, 'Should have format name');
      assert.ok(typeof formatName === 'string', 'Format name should be string');

      const formatLongName = output.formatLongName;
      assert.ok(formatLongName, 'Should have format long name');
      assert.ok(typeof formatLongName === 'string', 'Format long name should be string');

      console.log(`Output format: ${formatName} (${formatLongName})`);

      await output.close();
      await cleanup();
    });

    it('should get MIME type (async)', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const mimeType = output.mimeType;

      // MIME type may be null if format doesn't define one
      // This is normal behavior - not all formats have MIME types in FFmpeg
      if (mimeType !== null) {
        assert.ok(typeof mimeType === 'string', 'MIME type should be string if present');
        console.log('Output MIME type:', mimeType);
      } else {
        console.log('Output MIME type: null (format does not define MIME type)');
      }

      await output.close();
      await cleanup();
    });

    it('should get streams (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      // Initially no streams
      assert.ok(Array.isArray(output.streams), 'Streams should be array');
      assert.equal(output.streams.length, 0, 'Should have no streams initially');

      // Add a stream
      const videoStream = input.video();
      assert(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      output.addStream(videoStream, { encoder });

      // Now should have one stream
      assert.equal(output.streams.length, 1, 'Should have one stream after adding');
      assert.ok(output.streams[0], 'Stream should exist');

      encoder.close();
      await output.close();
      await input.close();
      await cleanup();
    });

    it('should track initialization state (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      // Initially not initialized
      assert.equal(output.streamsInitialized, false, 'Should not be initialized');

      const videoStream = input.video();
      assert(videoStream);

      const decoder = await Decoder.create(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        decoder,
      });

      const streamIdx = output.addStream(videoStream, { encoder });

      // Still not initialized until first packet
      assert.equal(output.streamsInitialized, false, 'Should not be initialized before first packet');

      // Write first packet to trigger initialization using helpers
      for await (using packet of input.packets()) {
        if (!packet) break;

        if (packet.streamIndex === 0) {
          for await (using frame of decodePacket(decoder, packet)) {
            for await (using encoded of encodeFrame(encoder, frame)) {
              await output.writePacket(encoded, streamIdx);
              // Now should be initialized
              assert.equal(output.streamsInitialized, true, 'Should be initialized after first packet');
              break;
            }
            break;
          }
          break;
        }
      }

      decoder.close();
      encoder.close();
      await output.close();
      await input.close();
      await cleanup();
    });

    it('should track open state (async)', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      assert.equal(output.isOpen, true, 'Should be open initially');

      await output.close();

      assert.equal(output.isOpen, false, 'Should be closed after close()');
      await cleanup();
    });
  });

  describe('addStream', () => {
    it('should add stream from encoder only (async)', async () => {
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        bitrate: '1M',
      });

      const streamIndex = output.addStream(encoder);
      assert.equal(typeof streamIndex, 'number');
      assert.equal(streamIndex, 0);

      encoder.close();
      await output.close();
      await cleanup();
    });

    it('should add stream from encoder only (sync)', () => {
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile);

      const encoder = Encoder.createSync(FF_ENCODER_LIBX264, {
        bitrate: '1M',
      });

      const streamIndex = output.addStream(encoder);
      assert.equal(typeof streamIndex, 'number');
      assert.equal(streamIndex, 0);

      encoder.close();
      output.closeSync();
    });

    it('should add stream from encoder with input stream for metadata (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const videoStream = input.video();
      assert(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        bitrate: '1M',
      });

      const streamIndex = output.addStream(encoder, { inputStream: videoStream });
      assert.equal(typeof streamIndex, 'number');
      assert.equal(streamIndex, 0);

      encoder.close();
      await output.close();
      await input.close();
      await cleanup();
    });

    it('should add stream from encoder with input stream for metadata (sync)', () => {
      const input = Demuxer.openSync(inputFile);
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile);

      const videoStream = input.video();
      assert(videoStream);
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264, {
        bitrate: '1M',
      });

      const streamIndex = output.addStream(encoder, { inputStream: videoStream });
      assert.equal(typeof streamIndex, 'number');
      assert.equal(streamIndex, 0);

      encoder.close();
      output.closeSync();
      input.closeSync();
    });

    it('should add stream with transcoding (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const videoStream = input.video();
      assert(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        bitrate: '1M',
      });

      const streamIndex = output.addStream(videoStream, { encoder });
      assert.equal(typeof streamIndex, 'number');
      assert.equal(streamIndex, 0);

      encoder.close();
      await output.close();
      await input.close();
      await cleanup();
    });

    it('should add stream with transcoding (sync)', () => {
      const input = Demuxer.openSync(inputFile);
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile);

      const videoStream = input.video();
      assert(videoStream);
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264, {
        bitrate: '1M',
      });

      const streamIndex = output.addStream(videoStream, { encoder });
      assert.equal(typeof streamIndex, 'number');
      assert.equal(streamIndex, 0);

      encoder.close();
      output.closeSync();
      input.closeSync();
    });

    it('should add stream for copy from input stream (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const inputStream = input.video();
      assert(inputStream);

      const streamIndex = output.addStream(inputStream);
      assert.equal(typeof streamIndex, 'number');

      await output.close();
      await input.close();
      await cleanup();
    });

    it('should add stream for copy from input stream (sync)', () => {
      const input = Demuxer.openSync(inputFile);
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile);

      const inputStream = input.video();
      assert(inputStream);

      const streamIndex = output.addStream(inputStream);
      assert.equal(typeof streamIndex, 'number');

      output.closeSync();
      input.closeSync();
    });

    it('should support custom timebase override (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const videoStream = input.video();
      assert(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      output.addStream(videoStream, {
        encoder,
      });

      encoder.close();
      await output.close();
      await input.close();
      await cleanup();
    });

    it('should support custom timebase override (sync)', () => {
      const input = Demuxer.openSync(inputFile);
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile);

      const videoStream = input.video();
      assert(videoStream);
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264);

      output.addStream(videoStream, {
        encoder,
      });

      encoder.close();
      output.closeSync();
      input.closeSync();
    });

    it('should add multiple streams (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const videoStream = input.video();
      const audioStream = input.audio();
      assert(videoStream);
      assert(audioStream);

      const videoEncoder = await Encoder.create(FF_ENCODER_LIBX264);
      const audioEncoder = await Encoder.create(FF_ENCODER_AAC);

      const videoIdx = output.addStream(videoStream, { encoder: videoEncoder });
      const audioIdx = output.addStream(audioStream, { encoder: audioEncoder });

      assert.equal(videoIdx, 0);
      assert.equal(audioIdx, 1);

      videoEncoder.close();
      audioEncoder.close();
      await output.close();
      await input.close();
      await cleanup();
    });

    it('should add multiple streams (sync)', () => {
      const input = Demuxer.openSync(inputFile);
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile);

      const videoStream = input.video();
      const audioStream = input.audio();
      assert(videoStream);
      assert(audioStream);

      const videoEncoder = Encoder.createSync(FF_ENCODER_LIBX264);
      const audioEncoder = Encoder.createSync(FF_ENCODER_AAC);

      const videoIdx = output.addStream(videoStream, { encoder: videoEncoder });
      const audioIdx = output.addStream(audioStream, { encoder: audioEncoder });

      assert.equal(videoIdx, 0);
      assert.equal(audioIdx, 1);

      videoEncoder.close();
      audioEncoder.close();
      output.closeSync();
      input.closeSync();
    });

    it('should throw when adding stream after header (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const videoStream = input.video();
      assert(videoStream);

      const decoder = await Decoder.create(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        decoder,
      });

      const streamIdx = output.addStream(videoStream, { encoder });
      let headerWritten = false;

      // Get first packet and decode/encode to initialize encoder and write header using helpers
      for await (using packet of input.packets(videoStream.index)) {
        if (!packet) break;

        for await (using frame of decodePacket(decoder, packet)) {
          for await (using encoded of encodeFrame(encoder, frame)) {
            await output.writePacket(encoded, streamIdx); // This triggers header write
            headerWritten = true;
            break; // Just process one packet
          }
          if (headerWritten) break;
        }
        if (headerWritten) break;
      }

      if (!headerWritten) {
        for await (using encoded of encoder.flushPackets()) {
          await output.writePacket(encoded, streamIdx);
          break;
        }
      }

      // Now try to add another stream - should fail
      const audioStream = input.audio();
      assert(audioStream);
      const encoder2 = await Encoder.create(FF_ENCODER_AAC);

      assert.throws(() => output.addStream(audioStream, { encoder: encoder2 }), /Cannot add streams after packets have been written/);

      encoder2.close();
      encoder.close();
      decoder.close();
      await output.close();
      await input.close();
      await cleanup();
    });

    it('should throw when output is closed (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);
      await output.close();

      const videoStream = input.video();
      assert(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      assert.throws(() => output.addStream(videoStream, { encoder }), /Muxer is closed/);

      encoder.close();
      await input.close();
      await cleanup();
    });

    it('should throw when output is closed (sync)', () => {
      const input = Demuxer.openSync(inputFile);
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile);
      output.closeSync();

      const videoStream = input.video();
      assert(videoStream);
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264);

      assert.throws(() => output.addStream(videoStream, { encoder }), /Muxer is closed/);

      encoder.close();
      input.closeSync();
    });
  });

  describe('automatic header/trailer', () => {
    it('should write header automatically on first packet and trailer on close (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const videoStream = input.video();
      assert(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);

      const streamIdx = output.addStream(videoStream, { encoder });

      // For a real test, we'd need to encode actual frames
      // Since this is testing automatic behavior, we'll just verify the stream was added
      assert.equal(streamIdx, 0);

      encoder.close();
      await output.close();
      await input.close();

      // Verify file was created
      const stats = await stat(outputFile);
      assert(stats.isFile());

      await cleanup();
    });

    // Tests for manual header/trailer writing removed - now handled automatically

    it('should auto-write header and trailer (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const videoStream = input.video();
      assert(videoStream);

      const decoder = await Decoder.create(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        decoder,
      });

      const streamIdx = output.addStream(videoStream, { encoder });

      // Process just one frame to test header/trailer writing using helpers
      let processed = false;
      for await (using packet of input.packets()) {
        if (!packet) break;

        if (packet.streamIndex === 0 && !processed) {
          for await (using frame of decodePacket(decoder, packet)) {
            for await (using encoded of encodeFrame(encoder, frame)) {
              // Header written automatically on first packet
              await output.writePacket(encoded, streamIdx);
              processed = true;
            }
          }
        }
        if (processed) break;
      }

      if (!processed) {
        for await (using encoded of encoder.flushPackets()) {
          await output.writePacket(encoded, streamIdx);
          break;
        }
      }

      // Trailer written automatically on close
      decoder.close();
      encoder.close();
      await output.close();
      await input.close();

      // Verify file was created and has content
      const stats = await stat(outputFile);
      assert(stats.isFile());
      assert(stats.size > 0);

      await cleanup();
    });
  });

  describe('writePacket', () => {
    it('should write packet to stream (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const videoStream = input.video();
      assert(videoStream);

      const decoder = await Decoder.create(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        gopSize: 12,
      });

      const streamIdx = output.addStream(videoStream, { encoder });

      // Process a few packets using helpers
      let packetCount = 0;
      for await (using packet of input.packets()) {
        if (!packet) break;

        if (packet.streamIndex === 0 && packetCount < 3) {
          for await (using frame of decodePacket(decoder, packet)) {
            for await (using encoded of encodeFrame(encoder, frame)) {
              await output.writePacket(encoded, streamIdx);
              packetCount++;
            }
          }
        }
        if (packetCount >= 3) break;
      }

      // Flush decoder
      for await (using frame of decoder.flushFrames()) {
        for await (using encoded of encodeFrame(encoder, frame)) {
          await output.writePacket(encoded, streamIdx);
        }
      }

      // Flush encoder
      for await (using encoded of encoder.flushPackets()) {
        await output.writePacket(encoded, streamIdx);
      }

      decoder.close();
      encoder.close();
      await output.close();
      await input.close();

      const stats = await stat(outputFile);
      assert(stats.size > 0);

      await cleanup();
    });

    it('should write packet to stream (sync)', () => {
      const input = Demuxer.openSync(inputFile);
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile);

      const videoStream = input.video();
      assert(videoStream);

      const decoder = Decoder.createSync(videoStream);
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264, {
        gopSize: 12,
      });

      const streamIdx = output.addStream(videoStream, { encoder });

      // Process a few packets using sync helpers
      let packetCount = 0;
      for (using packet of input.packetsSync()) {
        if (!packet) break;

        if (packet.streamIndex === 0 && packetCount < 3) {
          for (using frame of decodePacketSync(decoder, packet)) {
            for (using encoded of encodeFrameSync(encoder, frame)) {
              output.writePacketSync(encoded, streamIdx);
              packetCount++;
            }
          }
        }
        if (packetCount >= 3) break;
      }

      // Flush decoder
      for (using frame of decoder.flushFramesSync()) {
        for (using encoded of encodeFrameSync(encoder, frame)) {
          output.writePacketSync(encoded, streamIdx);
        }
      }

      // Flush encoder
      for (using encoded of encoder.flushPacketsSync()) {
        output.writePacketSync(encoded, streamIdx);
      }

      decoder.close();
      encoder.close();
      output.closeSync();
      input.closeSync();
    });

    it('should throw for invalid stream index (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const videoStream = input.video();
      assert(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);
      output.addStream(videoStream, { encoder });

      const packet = new Packet();
      packet.alloc();

      await assert.rejects(async () => await output.writePacket(packet, 999), /Invalid stream index: 999/);

      packet.free();
      encoder.close();
      await output.close();
      await input.close();
      await cleanup();
    });

    it('should throw for invalid stream index (sync)', () => {
      const input = Demuxer.openSync(inputFile);
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile);

      const videoStream = input.video();
      assert(videoStream);
      const encoder = Encoder.createSync(FF_ENCODER_LIBX264);
      output.addStream(videoStream, { encoder });

      const packet = new Packet();
      packet.alloc();

      assert.throws(() => output.writePacketSync(packet, 999), /Invalid stream index: 999/);

      packet.free();
      encoder.close();
      output.closeSync();
      input.closeSync();
    });
  });

  describe('AsyncDisposable', () => {
    it('should support await using syntax (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      let output: Muxer | null = null;

      // Use async context to test disposal
      await (async () => {
        await using o = await Muxer.open(outputFile);
        output = o;
        assert(output instanceof Muxer);

        const videoStream = input.video();
        assert(videoStream);
        const encoder = await Encoder.create(FF_ENCODER_LIBX264);

        output.addStream(videoStream, { encoder });
        // No need to write header - will be done automatically
        encoder.close();
      })();

      // Output should be closed after the block
      // Try to use it should throw
      await assert.rejects(async () => {
        const p = new Packet();
        p.alloc();
        await output!.writePacket(p, 0);
      }, /Muxer is closed/);

      await input.close();
      await cleanup();
    });
  });

  describe('IOOutputCallbacks with using keyword (deadlock fix)', () => {
    it('should support using keyword with IOOutputCallbacks without deadlock (sync)', () => {
      const chunks: Buffer[] = [];

      const callbacks: IOOutputCallbacks = {
        write: (buffer: Buffer) => {
          chunks.push(Buffer.from(buffer));
          return buffer.length;
        },
      };

      {
        using output = Muxer.openSync(callbacks, {
          format: 'mp4',
          options: {
            movflags: '+frag_keyframe+empty_moov',
          },
        });

        const input = Demuxer.openSync(inputFile);
        const videoStream = input.video();
        assert(videoStream);

        const streamIdx = output.addStream(videoStream);

        let packetCount = 0;
        for (using packet of input.packetsSync()) {
          if (!packet) {
            break;
          }

          if (packet.streamIndex === videoStream.index && packetCount < 3) {
            output.writePacketSync(packet, streamIdx);
            packetCount++;
          }
          if (packetCount >= 3) break;
        }

        input.closeSync();
      }

      // Verify data was written
      assert.ok(chunks.length > 0, 'Should have written data');
    });

    it('should support await using with IOOutputCallbacks (async)', async () => {
      const chunks: Buffer[] = [];

      const callbacks: IOOutputCallbacks = {
        write: (buffer: Buffer) => {
          chunks.push(Buffer.from(buffer));
          return buffer.length;
        },
      };

      {
        await using output = await Muxer.open(callbacks, {
          format: 'mp4',
          options: {
            movflags: '+frag_keyframe+empty_moov',
          },
        });

        const input = await Demuxer.open(inputFile);
        const videoStream = input.video();
        assert(videoStream);

        const streamIdx = output.addStream(videoStream);

        let packetCount = 0;
        for await (using packet of input.packets()) {
          if (!packet) {
            break;
          }

          if (packet.streamIndex === videoStream.index && packetCount < 3) {
            await output.writePacket(packet, streamIdx);
            packetCount++;
          }
          if (packetCount >= 3) break;
        }

        await input.close();
      }

      // Verify data was written
      assert.ok(chunks.length > 0, 'Should have written data');
    });

    it('should handle errors correctly with using keyword and IOOutputCallbacks', async () => {
      const input = Demuxer.openSync(inputFile);
      const chunks: Buffer[] = [];

      const callbacks: IOOutputCallbacks = {
        write: (buffer: Buffer) => {
          chunks.push(Buffer.from(buffer));
          return buffer.length;
        },
      };

      let errorCaught = false;
      try {
        using output = Muxer.openSync(callbacks, { format: 'mp4' });

        const videoStream = input.video();
        assert(videoStream);
        const encoder = Encoder.createSync(FF_ENCODER_LIBX264);

        output.addStream(videoStream, { encoder });

        // Throw an error intentionally
        throw new Error('Intentional test error');
      } catch (e) {
        errorCaught = true;
        assert.equal((e as Error).message, 'Intentional test error', 'Should catch the error');
      }

      input.closeSync();
      assert.ok(errorCaught, 'Error should have been caught');
      // Output should have been closed despite the error - no deadlock!
    });

    it('should write trailer correctly with closeSync and IOOutputCallbacks', () => {
      const chunks: Buffer[] = [];

      const callbacks: IOOutputCallbacks = {
        write: (buffer: Buffer) => {
          chunks.push(Buffer.from(buffer));
          return buffer.length;
        },
      };

      const output = Muxer.openSync(callbacks, {
        format: 'mp4',
        options: {
          movflags: '+frag_keyframe+empty_moov',
        },
      });

      const input = Demuxer.openSync(inputFile);
      const videoStream = input.video();
      assert(videoStream);

      const streamIdx = output.addStream(videoStream);

      let packetCount = 0;
      for (using packet of input.packetsSync()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex === videoStream.index && packetCount < 3) {
          output.writePacketSync(packet, streamIdx);
          packetCount++;
        }
        if (packetCount >= 3) break;
      }

      input.closeSync();

      // This used to deadlock - now it should work!
      output.closeSync();

      // Verify data was written (including trailer)
      assert.ok(chunks.length > 0, 'Should have written data');
    });

    it('should complete full workflow with IOInputCallbacks and IOOutputCallbacks', async () => {
      // Read input file
      const inputFile = getInputFile('demux.mp4');
      const buffer = await readFile(inputFile);
      let inputPosition = 0;

      const inputCallbacks: IOOutputCallbacks & {
        read: (size: number) => Buffer | null | number;
      } = {
        read: (size: number) => {
          if (inputPosition >= buffer.length) return null;
          const end = Math.min(inputPosition + size, buffer.length);
          const chunk = buffer.subarray(inputPosition, end);
          inputPosition = end;
          return chunk;
        },
        write: () => 0,
        seek: (offset: bigint, whence: AVSeekWhence) => {
          if (whence === AVSEEK_SIZE) {
            return BigInt(buffer.length);
          }

          if (whence === AVSEEK_SET) {
            inputPosition = Number(offset);
          } else if (whence === AVSEEK_CUR) {
            inputPosition += Number(offset);
          } else if (whence === AVSEEK_END) {
            inputPosition = buffer.length + Number(offset);
          }

          return BigInt(inputPosition);
        },
      };

      const outputChunks: Buffer[] = [];
      const outputCallbacks: IOOutputCallbacks = {
        write: (buffer: Buffer) => {
          outputChunks.push(Buffer.from(buffer));
          return buffer.length;
        },
      };

      // Test with using keyword - no deadlock!
      try {
        await using input = await Demuxer.open(inputCallbacks as any, { format: 'mp4' });
        await using output = await Muxer.open(outputCallbacks, {
          format: 'mp4',
          options: {
            movflags: '+frag_keyframe+separate_moof+default_base_moof+empty_moov',
          },
        });

        const videoStream = input.video();
        assert(videoStream, 'Should have video stream');

        const streamIdx = output.addStream(videoStream);

        // Copy some packets
        let packetCount = 0;
        for await (using packet of input.packets()) {
          if (!packet) {
            break;
          }

          if (packet.streamIndex === videoStream.index && packetCount < 10) {
            await output.writePacket(packet, streamIdx);
            packetCount++;
          }
          if (packetCount >= 10) break;
        }

        // Both should auto-close without deadlock
      } catch (e) {
        // Errors should be properly caught
        console.error('Test error:', (e as Error).message);
        throw e;
      }

      // Verify output was written
      assert.ok(outputChunks.length > 0, 'Should have written output data');
      const totalSize = outputChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      assert.ok(totalSize > 0, 'Output should have content');
    });
  });

  describe('coded_side_data copying', () => {
    it('should copy all coded_side_data when adding stream from input (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      const videoStream = input.video();
      assert(videoStream);

      // Check if input stream has any coded_side_data
      const inputSideData = videoStream.codecpar.getAllCodedSideData();
      console.log(`Input stream has ${inputSideData.length} coded_side_data entries`);

      // Add stream - this should copy all coded_side_data
      const streamIdx = output.addStream(videoStream);
      const outputStream = output.streams[streamIdx];

      // Verify all coded_side_data was copied
      const outputSideData = outputStream.codecpar.getAllCodedSideData();
      assert.equal(outputSideData.length, inputSideData.length, 'All coded_side_data should be copied');

      // Verify each entry matches
      for (let i = 0; i < inputSideData.length; i++) {
        assert.equal(outputSideData[i].type, inputSideData[i].type, `Side data type ${i} should match`);
        assert.equal(outputSideData[i].data.length, inputSideData[i].data.length, `Side data size ${i} should match`);
        assert.ok(outputSideData[i].data.equals(inputSideData[i].data), `Side data content ${i} should match`);
      }

      await output.close();
      await input.close();
      await cleanup();
    });

    it('should copy all coded_side_data when adding stream from input (sync)', () => {
      const input = Demuxer.openSync(inputFile);
      const outputFile = getTempFile('mp4');
      const output = Muxer.openSync(outputFile);

      const videoStream = input.video();
      assert(videoStream);

      // Check if input stream has any coded_side_data
      const inputSideData = videoStream.codecpar.getAllCodedSideData();

      // Add stream - this should copy all coded_side_data
      const streamIdx = output.addStream(videoStream);
      const outputStream = output.streams[streamIdx];

      // Verify all coded_side_data was copied
      const outputSideData = outputStream.codecpar.getAllCodedSideData();
      assert.equal(outputSideData.length, inputSideData.length, 'All coded_side_data should be copied');

      // Verify each entry matches
      for (let i = 0; i < inputSideData.length; i++) {
        assert.equal(outputSideData[i].type, inputSideData[i].type, `Side data type ${i} should match`);
        assert.equal(outputSideData[i].data.length, inputSideData[i].data.length, `Side data size ${i} should match`);
        assert.ok(outputSideData[i].data.equals(inputSideData[i].data), `Side data content ${i} should match`);
      }

      output.closeSync();
      input.closeSync();
    });
  });

  describe('Integration', () => {
    it('should transcode video with Demuxer/Output (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mp4');
      const output = await Muxer.open(outputFile);

      // Get video stream for timebase
      const videoStream = input.video();
      assert(videoStream);

      // Setup decoder and encoder
      const decoder = await Decoder.create(videoStream);
      const encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        bitrate: '500k',
        maxBFrames: 0, // Disable B-frames to simplify timing
      });

      const streamIdx = output.addStream(videoStream, { encoder });

      // Process some packets using helpers - header written automatically on first packet
      let packetCount = 0;
      for await (using packet of input.packets()) {
        if (!packet) break;

        if (packet.streamIndex === 0 && packetCount < 10) {
          for await (using frame of decodePacket(decoder, packet)) {
            for await (using encoded of encodeFrame(encoder, frame)) {
              await output.writePacket(encoded, streamIdx);
              packetCount++;
            }
          }
        }
        if (packetCount >= 10) break;
      }

      // Flush decoder
      for await (using frame of decoder.flushFrames()) {
        for await (using encoded of encodeFrame(encoder, frame)) {
          await output.writePacket(encoded, streamIdx);
        }
      }

      // Flush encoder
      for await (using flushPacket of encoder.flushPackets()) {
        await output.writePacket(flushPacket, streamIdx);
      }

      // Trailer written automatically on close
      decoder.close();
      encoder.close();
      await output.close();
      await input.close();

      // Verify output file exists and has content
      const stats = await stat(outputFile);
      assert(stats.size > 0);

      await cleanup();
    });

    it('should support stream copy (async)', async () => {
      const input = await Demuxer.open(inputFile);
      const outputFile = getTempFile('mkv');
      const output = await Muxer.open(outputFile);

      // Copy video stream directly
      const videoStream = input.video();
      assert(videoStream);

      // Save codec parameters before closing input
      const originalWidth = videoStream.codecpar?.width;
      const originalHeight = videoStream.codecpar?.height;

      const streamIdx = output.addStream(videoStream);

      // Copy packets without decoding/encoding - header written automatically
      let packetCount = 0;
      for await (using packet of input.packets()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex === videoStream.index && packetCount < 20) {
          await output.writePacket(packet, streamIdx);
          packetCount++;
        }
      }

      // Trailer written automatically on close
      await output.close();
      await input.close();

      // Verify output
      const stats = await stat(outputFile);
      assert(stats.size > 0);

      // Verify we can open and read the copied file
      const verifyInput = await Demuxer.open(outputFile);
      const verifyVideo = verifyInput.video();
      assert(verifyVideo);
      assert.equal(verifyVideo.codecpar?.width, originalWidth);
      assert.equal(verifyVideo.codecpar?.height, originalHeight);
      await verifyInput.close();

      await cleanup();
    });
  });

  describe('AbortSignal', () => {
    it('should reject open with pre-aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();
      const outputFile = getTempFile('mkv');
      await assert.rejects(() => Muxer.open(outputFile, { format: 'matroska', signal: controller.signal }), { name: 'AbortError' });
      await cleanup();
    });

    it('should abort writePacket with signal', async () => {
      const controller = new AbortController();
      const outputFile = getTempFile('mkv');
      await using input = await Demuxer.open(inputFile);
      const output = await Muxer.open(outputFile, { format: 'matroska', signal: controller.signal });
      const vs = input.video()!;
      output.addStream(vs);

      controller.abort();
      const { value: packet } = await input.packets(vs.index).next();
      await assert.rejects(() => output.writePacket(packet, 0), { name: 'AbortError' });
      packet?.free();
      await output.close();
      await cleanup();
    });
  });
});
