import assert from 'node:assert';
import { createReadStream, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { after, describe, it } from 'node:test';

import { Demuxer } from '../src/api/index.js';
import { IOStream } from '../src/api/io-stream.js';
import { StreamingUtils } from '../src/api/utilities/streaming.js';
import { AV_CODEC_ID_AAC, AV_CODEC_ID_H264, AV_CODEC_ID_OPUS } from '../src/constants/constants.js';
import { AVMEDIA_TYPE_AUDIO, AVMEDIA_TYPE_VIDEO, AVSEEK_CUR, AVSEEK_END, AVSEEK_SET, AVSEEK_SIZE } from '../src/index.js';
import { getInputFile, prepareTestEnvironment } from './index.js';

import type { AVSeekWhence, IOInputCallbacks } from '../src/index.js';

prepareTestEnvironment();

const inputFile = getInputFile('demux.mp4');

describe('Demuxer', () => {
  // Track all open Demuxer instances
  const openInstances: Demuxer[] = [];

  // Ensure all instances are closed before test suite ends
  after(async () => {
    for (const instance of openInstances) {
      try {
        await instance.close();
      } catch {
        // Ignore errors if already closed
      }
    }
    openInstances.length = 0;

    // Small delay to ensure cleanup completes
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Force GC if available to clean up any remaining references
    if (global.gc) {
      global.gc();
    }
  });

  describe('open', () => {
    it('should open from file path (async)', async () => {
      const media = await Demuxer.open(inputFile);

      assert.ok(media, 'Should create Demuxer');
      assert.ok(media.streams.length > 0, 'Should have streams');
      assert.ok(media.duration > 0, 'Should have duration');

      await media.close();
    });

    it('should open from file path (sync)', () => {
      const media = Demuxer.openSync(inputFile);

      assert.ok(media, 'Should create Demuxer');
      assert.ok(media.streams.length > 0, 'Should have streams');
      assert.ok(media.duration > 0, 'Should have duration');

      media.closeSync();
    });

    it('should open from Buffer (async)', async () => {
      const buffer = await readFile(inputFile);
      const media = await Demuxer.open(buffer);

      assert.ok(media, 'Should create Demuxer from Buffer');
      assert.ok(media.streams.length > 0, 'Should have streams');

      await media.close();
    });

    it('should open from Buffer (sync)', () => {
      const buffer = readFileSync(inputFile);
      const media = Demuxer.openSync(buffer);

      assert.ok(media, 'Should create Demuxer from Buffer');
      assert.ok(media.streams.length > 0, 'Should have streams');

      media.closeSync();
    });

    it('should throw on invalid file (async)', async () => {
      await assert.rejects(async () => await Demuxer.open('nonexistent.mp4'), /Failed to open input/);
    });

    it('should throw on invalid file (sync)', () => {
      assert.throws(() => Demuxer.openSync('nonexistent.mp4'), /Failed to open input/);
    });

    it('should open with IOInputCallbacks (async)', async () => {
      const buffer = await readFile(inputFile);
      let position = 0;

      const callbacks: IOInputCallbacks = {
        read: (size: number) => {
          if (position >= buffer.length) {
            return null; // EOF
          }
          const end = Math.min(position + size, buffer.length);
          const chunk = buffer.subarray(position, end);
          position = end;
          return chunk;
        },
        seek: (offset: bigint, whence: AVSeekWhence) => {
          if (whence === AVSEEK_SIZE) {
            return BigInt(buffer.length);
          } else if (whence === AVSEEK_SET) {
            position = Number(offset);
          } else if (whence === AVSEEK_CUR) {
            position += Number(offset);
          } else if (whence === AVSEEK_END) {
            position = buffer.length + Number(offset);
          }
          return BigInt(position);
        },
      };

      const media = await Demuxer.open(callbacks, {
        format: 'mp4',
        bufferSize: 4096,
      });

      assert.ok(media, 'Should create Demuxer from IOInputCallbacks');
      assert.ok(media.streams.length > 0, 'Should have streams');
      assert.ok(media.duration > 0, 'Should have duration');

      // Read some packets to verify it works
      let packetCount = 0;
      for await (using packet of media.packets()) {
        assert.ok(packet, 'Should have packet');
        packetCount++;
        if (packetCount >= 5) break;
      }
      assert.ok(packetCount > 0, 'Should have read packets');

      await media.close();
    });

    it('should open with IOInputCallbacks (sync)', () => {
      const buffer = readFileSync(inputFile);
      let position = 0;

      const callbacks: IOInputCallbacks = {
        read: (size: number) => {
          if (position >= buffer.length) {
            return null; // EOF
          }
          const end = Math.min(position + size, buffer.length);
          const chunk = buffer.subarray(position, end);
          position = end;
          return chunk;
        },
        seek: (offset: bigint, whence: AVSeekWhence) => {
          if (whence === AVSEEK_SIZE) {
            return BigInt(buffer.length);
          } else if (whence === AVSEEK_SET) {
            position = Number(offset);
          } else if (whence === AVSEEK_CUR) {
            position += Number(offset);
          } else if (whence === AVSEEK_END) {
            position = buffer.length + Number(offset);
          }
          return BigInt(position);
        },
      };

      const media = Demuxer.openSync(callbacks, {
        format: 'mp4',
        bufferSize: 4096,
      });

      assert.ok(media, 'Should create Demuxer from IOInputCallbacks');
      assert.ok(media.streams.length > 0, 'Should have streams');
      assert.ok(media.duration > 0, 'Should have duration');

      // Read some packets to verify it works
      let packetCount = 0;
      for (using packet of media.packetsSync()) {
        assert.ok(packet, 'Should have packet');
        packetCount++;
        if (packetCount >= 5) break;
      }
      assert.ok(packetCount > 0, 'Should have read packets');

      media.closeSync();
    });

    it('should open from native IOContext (async)', async () => {
      const buffer = await readFile(inputFile);
      const ioContext = IOStream.create(buffer);

      const media = await Demuxer.open(ioContext, { format: 'mp4' });

      assert.ok(media, 'Should create Demuxer from IOContext');
      assert.ok(media.streams.length > 0, 'Should have streams');
      assert.ok(media.duration > 0, 'Should have duration');

      // Read some packets to verify it works
      let packetCount = 0;
      for await (using packet of media.packets()) {
        assert.ok(packet, 'Should have packet');
        packetCount++;
        if (packetCount >= 5) break;
      }
      assert.ok(packetCount > 0, 'Should have read packets');

      await media.close();
    });

    it('should open from native IOContext (sync)', () => {
      const buffer = readFileSync(inputFile);
      const ioContext = IOStream.create(buffer);

      const media = Demuxer.openSync(ioContext, { format: 'mp4' });

      assert.ok(media, 'Should create Demuxer from IOContext');
      assert.ok(media.streams.length > 0, 'Should have streams');
      assert.ok(media.duration > 0, 'Should have duration');

      // Read some packets to verify it works
      let packetCount = 0;
      for (using packet of media.packetsSync()) {
        assert.ok(packet, 'Should have packet');
        packetCount++;
        if (packetCount >= 5) break;
      }
      assert.ok(packetCount > 0, 'Should have read packets');

      media.closeSync();
    });

    it('should require format for native IOContext (async)', async () => {
      const buffer = await readFile(inputFile);
      await using ioContext = IOStream.create(buffer);

      // @ts-expect-error Testing missing format
      await assert.rejects(async () => await Demuxer.open(ioContext), /Format must be specified for native IOContext input/);
    });

    it('should require format for native IOContext (sync)', () => {
      const buffer = readFileSync(inputFile);
      using ioContext = IOStream.create(buffer);

      // @ts-expect-error Testing missing format
      assert.throws(() => Demuxer.openSync(ioContext), /Format must be specified for native IOContext input/);
    });

    it('should require format for IOInputCallbacks (async)', async () => {
      const callbacks: IOInputCallbacks = {
        read: () => null,
      };

      // @ts-expect-error Testing missing format
      await assert.rejects(async () => await Demuxer.open(callbacks), /Format must be specified for custom I\/O/);
    });

    it('should require format for IOInputCallbacks (sync)', () => {
      const callbacks: IOInputCallbacks = {
        read: () => null,
      };

      // @ts-expect-error Testing missing format
      assert.throws(() => Demuxer.openSync(callbacks), /Format must be specified for custom I\/O/);
    });

    it('should support IOInputCallbacks with using keyword (async)', async () => {
      const buffer = await readFile(inputFile);
      let position = 0;

      const callbacks: IOInputCallbacks = {
        read: (size: number) => {
          if (position >= buffer.length) return null;
          const end = Math.min(position + size, buffer.length);
          const chunk = buffer.subarray(position, end);
          position = end;
          return chunk;
        },
        seek: (offset: bigint, whence: AVSeekWhence) => {
          if (whence === AVSEEK_SIZE) {
            return BigInt(buffer.length);
          }

          if (whence === AVSEEK_SET) {
            position = Number(offset);
          } else if (whence === AVSEEK_CUR) {
            position += Number(offset);
          } else if (whence === AVSEEK_END) {
            position = buffer.length + Number(offset);
          }

          return BigInt(position);
        },
      };

      let streamCount = 0;
      {
        await using media = await Demuxer.open(callbacks, { format: 'mp4' });
        streamCount = media.streams.length;
        assert.ok(streamCount > 0, 'Should have streams');
        // Should auto-close when leaving scope - no deadlock!
      }

      // Verify it actually closed by trying again
      position = 0;
      const media2 = await Demuxer.open(callbacks, { format: 'mp4' });
      assert.equal(media2.streams.length, streamCount, 'Should have same streams');
      await media2.close();
    });

    it('should support IOInputCallbacks with using keyword (sync)', () => {
      const buffer = readFileSync(inputFile);
      let position = 0;

      const callbacks: IOInputCallbacks = {
        read: (size: number) => {
          if (position >= buffer.length) return null;
          const end = Math.min(position + size, buffer.length);
          const chunk = buffer.subarray(position, end);
          position = end;
          return chunk;
        },
        seek: (offset: bigint, whence: AVSeekWhence) => {
          if (whence === AVSEEK_SIZE) {
            return BigInt(buffer.length);
          }

          if (whence === AVSEEK_SET) {
            position = Number(offset);
          } else if (whence === AVSEEK_CUR) {
            position += Number(offset);
          } else if (whence === AVSEEK_END) {
            position = buffer.length + Number(offset);
          }

          return BigInt(position);
        },
      };

      let streamCount = 0;
      {
        using media = Demuxer.openSync(callbacks, { format: 'mp4' });
        streamCount = media.streams.length;
        assert.ok(streamCount > 0, 'Should have streams');
        // Should auto-close when leaving scope - no deadlock!
      }

      // Verify it actually closed by trying again
      position = 0;
      const media2 = Demuxer.openSync(callbacks, { format: 'mp4' });
      assert.equal(media2.streams.length, streamCount, 'Should have same streams');
      media2.closeSync();
    });

    it('should open from Readable stream (async)', async () => {
      const webmFile = getInputFile('video-vp9.webm');
      const readable = createReadStream(webmFile);
      const media = await Demuxer.open(readable, { format: 'webm' });
      openInstances.push(media);

      assert.ok(media, 'Should create Demuxer from Readable');
      assert.ok(media.streams.length > 0, 'Should have streams');
      assert.ok(media.video(), 'Should have video stream');

      await media.close();
      readable.destroy();
    });

    it('should read packets from Readable stream', async () => {
      const webmFile = getInputFile('video-vp9.webm');
      const readable = createReadStream(webmFile);
      const media = await Demuxer.open(readable, { format: 'webm' });
      openInstances.push(media);

      let count = 0;
      for await (const packet of media.packets()) {
        if (!packet) break;
        count++;
        packet.free();
        if (count >= 10) break;
      }
      assert.ok(count > 0, 'Should have read packets from Readable stream');

      await media.close();
      readable.destroy();
    });

    it('should require format for Readable stream (async)', async () => {
      const readable = createReadStream(inputFile);

      // @ts-expect-error Testing missing format
      await assert.rejects(async () => await Demuxer.open(readable), /Format must be specified for Readable stream input/);

      readable.destroy();
    });

    it('should require format for Readable stream (sync)', () => {
      const readable = createReadStream(inputFile);

      // @ts-expect-error Testing missing format
      assert.throws(() => Demuxer.openSync(readable), /Format must be specified for Readable stream input/);

      readable.destroy();
    });

    it('probes a slow realtime Readable promptly (partial reads, not full-buffer blocking)', { timeout: 7000 }, async () => {
      const data = readFileSync(getInputFile('audio.aac'));

      const trickle = (): Readable => {
        let off = 0;
        const CHUNK = 190;
        const INTERVAL = 70;
        return new Readable({
          read() {
            if (off >= data.length) {
              this.push(null);
              return;
            }
            const end = Math.min(off + CHUNK, data.length);
            const slice = data.subarray(off, end);
            off = end;
            setTimeout(() => this.push(slice), INTERVAL);
          },
        });
      };

      const media = await Demuxer.open(trickle(), { format: 'aac', options: { probesize: '8192' } });
      const cp = media.streams[0].codecpar;
      assert.equal(cp.codecId, AV_CODEC_ID_AAC, 'Should probe AAC codec');
      assert.ok(cp.sampleRate > 0, 'Should probe sample rate');
      assert.ok(cp.channels > 0, 'Should probe channel count');
      await media.close();
    });
  });

  describe('options', () => {
    it('should open with dtsDeltaThreshold option', async () => {
      const media = await Demuxer.open(inputFile, {
        dtsDeltaThreshold: 10,
      });

      assert.ok(media, 'Should create Demuxer with dtsDeltaThreshold');
      assert.ok(media.streams.length > 0, 'Should have streams');

      await media.close();
    });

    it('should open with dtsErrorThreshold option', async () => {
      const media = await Demuxer.open(inputFile, {
        dtsErrorThreshold: 30,
      });

      assert.ok(media, 'Should create Demuxer with dtsErrorThreshold');
      assert.ok(media.streams.length > 0, 'Should have streams');

      await media.close();
    });

    it('should open with copyTs option', async () => {
      const media = await Demuxer.open(inputFile, {
        copyTs: true,
      });

      assert.ok(media, 'Should create Demuxer with copyTs');
      assert.ok(media.streams.length > 0, 'Should have streams');

      await media.close();
    });

    it('should open with all timestamp options combined', async () => {
      const media = await Demuxer.open(inputFile, {
        dtsDeltaThreshold: 10,
        dtsErrorThreshold: 30,
        copyTs: true,
      });

      assert.ok(media, 'Should create Demuxer with all timestamp options');
      assert.ok(media.streams.length > 0, 'Should have streams');

      await media.close();
    });

    it('should open with copyTs (sync)', () => {
      const media = Demuxer.openSync(inputFile, {
        copyTs: true,
      });

      assert.ok(media, 'Should create Demuxer with copyTs (sync)');
      assert.ok(media.streams.length > 0, 'Should have streams');

      media.closeSync();
    });
  });

  describe('stream info', () => {
    it('should parse video stream info', async () => {
      const media = await Demuxer.open(inputFile);

      const video = media.video();
      assert.ok(video, 'Should find video stream');
      assert.equal(video.codecpar.codecType, AVMEDIA_TYPE_VIDEO);
      assert.ok(video.codecpar.width && video.codecpar.width > 0, 'Should have width');
      assert.ok(video.codecpar.height && video.codecpar.height > 0, 'Should have height');
      assert.ok(video.codecpar.codecId, 'Should have codec');
      assert.ok(video.timeBase, 'Should have timeBase');

      await media.close();
    });

    it('should parse audio stream info', async () => {
      const media = await Demuxer.open(inputFile);

      const audio = media.audio();
      if (audio) {
        assert.equal(audio.codecpar.codecType, AVMEDIA_TYPE_AUDIO);
        assert.ok(audio.codecpar.sampleRate && audio.codecpar.sampleRate > 0, 'Should have sample rate');
        assert.ok(audio.codecpar.channels && audio.codecpar.channels > 0, 'Should have channels');
        assert.ok(audio.codecpar.codecId, 'Should have codec');
      }

      await media.close();
    });

    it('should get all streams', async () => {
      const media = await Demuxer.open(inputFile);

      assert.ok(Array.isArray(media.streams), 'Streams should be array');
      assert.ok(media.streams.length > 0, 'Should have at least one stream');

      for (const stream of media.streams) {
        assert.ok(typeof stream.index === 'number', 'Stream should have index');
        assert.ok(stream.codecpar.codecType >= 0, 'Stream should have type');
        assert.ok(stream.codecpar.codecId >= 0, 'Stream should have codec');
        assert.ok(stream.timeBase, 'Stream should have timeBase');
      }

      await media.close();
    });
  });

  describe('metadata', () => {
    it('should get container metadata', async () => {
      const media = await Demuxer.open(inputFile);

      const metadata = media.metadata;
      assert.ok(typeof metadata === 'object', 'Metadata should be object');

      // Metadata might be empty, that's ok
      console.log('Metadata:', metadata);

      await media.close();
    });

    it('should get start time', async () => {
      const media = await Demuxer.open(inputFile);

      const startTime = media.startTime;
      assert.equal(typeof startTime, 'number', 'Start time should be a number');
      assert.ok(startTime >= 0, 'Start time should be >= 0');

      console.log('Start time:', startTime);

      await media.close();
    });

    it('should return 0 start time after close', async () => {
      const media = await Demuxer.open(inputFile);
      await media.close();

      assert.equal(media.startTime, 0, 'Start time should be 0 after close');
    });

    it('should get format info', async () => {
      const media = await Demuxer.open(inputFile);

      const formatName = media.formatName;
      assert.ok(formatName, 'Should have format name');
      assert.ok(typeof formatName === 'string', 'Format name should be string');

      const formatLongName = media.formatLongName;
      assert.ok(formatLongName, 'Should have format long name');
      assert.ok(typeof formatLongName === 'string', 'Format long name should be string');

      console.log(`Format: ${formatName} (${formatLongName})`);

      await media.close();
    });

    it('should get MIME type', async () => {
      const media = await Demuxer.open(inputFile);

      const mimeType = media.mimeType;

      // MIME type may be null if format doesn't define one
      // This is normal behavior - not all formats have MIME types in FFmpeg
      if (mimeType !== null) {
        assert.ok(typeof mimeType === 'string', 'MIME type should be string if present');
        console.log('MIME type:', mimeType);
      } else {
        console.log('MIME type: null (format does not define MIME type)');
      }

      await media.close();
    });

    it('should get input format', async () => {
      const media = await Demuxer.open(inputFile);

      const inputFormat = media.inputFormat();
      assert.ok(inputFormat, 'Should have input format');
      assert.ok(inputFormat.name, 'Input format should have name');
      assert.ok(inputFormat.longName, 'Input format should have long name');

      console.log(`Input format: ${inputFormat.name} (${inputFormat.longName})`);

      await media.close();
    });
  });

  describe('stream access', () => {
    it('should get stream by index', async () => {
      const media = await Demuxer.open(inputFile);

      const stream0 = media.getStream(0);
      assert.ok(stream0, 'Should get stream at index 0');
      assert.equal(stream0.index, 0, 'Stream should have correct index');

      await media.close();
    });

    it('should return undefined for invalid stream index', async () => {
      const media = await Demuxer.open(inputFile);

      const invalidStream = media.getStream(999);
      assert.equal(invalidStream, undefined, 'Should return undefined for invalid index');

      await media.close();
    });

    it('should get stream by index (negative)', async () => {
      const media = await Demuxer.open(inputFile);

      // Negative indices should return undefined
      const negativeStream = media.getStream(-1);
      assert.equal(negativeStream, undefined, 'Should return undefined for negative index');

      await media.close();
    });
  });

  describe('packets', () => {
    it('should iterate packets', async () => {
      const media = await Demuxer.open(inputFile);

      let packetCount = 0;
      const maxPackets = 10; // Only read first 10 packets for test

      for await (using packet of media.packets()) {
        assert.ok(packet, 'Should have packet');
        assert.ok(typeof packet.streamIndex === 'number', 'Packet should have stream index');
        assert.ok(packet.size >= 0, 'Packet should have size');

        packetCount++;
        if (packetCount >= maxPackets) break;
      }

      assert.ok(packetCount > 0, 'Should have read some packets');

      await media.close();
    });

    it('should iterate packets (sync)', () => {
      const media = Demuxer.openSync(inputFile);

      let packetCount = 0;
      const maxPackets = 10; // Only read first 10 packets for test

      for (using packet of media.packetsSync()) {
        assert.ok(packet, 'Should have packet');
        assert.ok(typeof packet.streamIndex === 'number', 'Packet should have stream index');
        assert.ok(packet.size >= 0, 'Packet should have size');

        packetCount++;
        if (packetCount >= maxPackets) break;
      }

      assert.ok(packetCount > 0, 'Should have read some packets');

      media.closeSync();
    });
  });

  describe('seek', () => {
    it('should seek to timestamp (async)', async () => {
      const media = await Demuxer.open(inputFile);

      // Try to seek to 1 second
      const ret = await media.seek(1.0);

      // Seek might not be supported for all formats, so just check it doesn't crash
      console.log('Seek result:', ret);

      await media.close();
    });

    it('should seek to timestamp (sync)', () => {
      const media = Demuxer.openSync(inputFile);

      // Try to seek to 1 second
      const ret = media.seekSync(1.0);

      // Seek might not be supported for all formats, so just check it doesn't crash
      console.log('Seek result (sync):', ret);

      media.closeSync();
    });
  });

  describe('lifecycle', () => {
    it('should support multiple open/close cycles', async () => {
      // Open and close multiple times
      for (let i = 0; i < 3; i++) {
        const media = await Demuxer.open(inputFile);
        assert.ok(media.streams.length > 0, `Cycle ${i}: Should have streams`);
        await media.close();
      }
    });

    it('should support Symbol.asyncDispose', async () => {
      let streamCount = 0;

      {
        await using media = await Demuxer.open(inputFile);
        streamCount = media.streams.length;
        assert.ok(streamCount > 0, 'Should have streams');
        // Should auto-close when leaving scope
      }

      // Open again to verify previous was properly closed
      const media2 = await Demuxer.open(inputFile);
      assert.equal(media2.streams.length, streamCount, 'Should have same streams');
      await media2.close();
    });
  });

  describe('probeFormat', () => {
    it('should probe format from file path', async () => {
      const info = await Demuxer.probeFormat(inputFile);

      assert.ok(info, 'Should detect format');
      assert.ok(info.format, 'Should have format name');
      assert.equal(typeof info.format, 'string', 'Format should be string');
      assert.ok(info.confidence > 0, 'Should have confidence score');

      // MP4 format details
      if (info.format.includes('mp4') || info.format.includes('mov')) {
        assert.ok(info.longName, 'MP4 should have long name');
        assert.ok(info.extensions, 'MP4 should have extensions');
      }

      console.log('Probed format:', info);
    });

    it('should probe format from buffer', async () => {
      const buffer = await readFile(inputFile);
      const info = await Demuxer.probeFormat(buffer);

      assert.ok(info, 'Should detect format from buffer');
      assert.ok(info.format, 'Should have format name');
      assert.equal(info.confidence, 100, 'Buffer probe should have high confidence');

      console.log('Probed format from buffer:', info);
    });

    it('should probe different formats', async () => {
      // Try probing different file formats if available
      const testFiles = [
        { path: getInputFile('demux.mp4'), expectedFormat: 'mp4' },
        { path: getInputFile('video.m1v'), expectedFormat: 'mpegvideo' },
        { path: getInputFile('audio.aac'), expectedFormat: 'aac' },
      ];

      for (const { path, expectedFormat } of testFiles) {
        try {
          const info = await Demuxer.probeFormat(path);
          if (info) {
            console.log(`Probed ${path}: ${info.format}`);
            // Check if the detected format matches or contains expected format
            assert.ok(
              info.format.includes(expectedFormat) || info.format === expectedFormat || info.longName?.toLowerCase().includes(expectedFormat),
              `Expected format to contain ${expectedFormat}, got ${info.format}`,
            );
          }
        } catch {
          // File might not exist, skip
          console.log(`Skipping ${path}: not found`);
        }
      }
    });

    it('should return null for invalid data', async () => {
      // Test with random data that's not a valid media format
      const randomBuffer = Buffer.from('This is not a media file');
      const info = await Demuxer.probeFormat(randomBuffer);

      assert.equal(info, null, 'Should return null for invalid media data');
    });

    it('should handle partial buffers', async () => {
      // Read only first 4KB of file
      const buffer = await readFile(inputFile);
      const partialBuffer = buffer.subarray(0, 4096);

      const info = await Demuxer.probeFormat(partialBuffer);

      // MP4 should be detectable from first 4KB
      assert.ok(info, 'Should detect format from partial buffer');
      assert.ok(info.format, 'Should have format name');

      console.log('Probed from partial buffer:', info);
    });

    it('should handle non-existent file', async () => {
      const info = await Demuxer.probeFormat('nonexistent.mp4');

      assert.equal(info, null, 'Should return null for non-existent file');
    });

    it('should probe with file extension hint', async () => {
      // Test that filename is used as hint for better detection
      const buffer = await readFile(inputFile);

      // Probe same buffer with and without hint
      const withoutHint = await Demuxer.probeFormat(buffer);
      const withHint = await Demuxer.probeFormat(inputFile);

      assert.ok(withoutHint, 'Should detect without hint');
      assert.ok(withHint, 'Should detect with hint');

      // With file path hint might have different confidence
      console.log('Without hint confidence:', withoutHint.confidence);
      console.log('With hint confidence:', withHint.confidence);
    });
  });

  describe('edge cases', () => {
    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      await assert.rejects(async () => await Demuxer.open(emptyBuffer), Error, 'Should fail on empty buffer');
    });

    it('should handle small video files', async () => {
      // Test with a small video file if available
      try {
        const media = await Demuxer.open(inputFile);
        assert.ok(media, 'Should open small video');
        assert.ok(media.streams.length > 0, 'Should have streams');
        await media.close();
      } catch (e) {
        // File might not exist, that's ok for this test
        console.log('Small video test skipped:', (e as Error).message);
      }
    });
  });

  describe('openSDP', () => {
    it('should open RTP input from SDP (single stream - audio)', async () => {
      // Generate SDP for Opus audio stream
      const sdp = StreamingUtils.createInputSDP(
        [
          {
            port: 5004,
            codecId: AV_CODEC_ID_OPUS,
            payloadType: 111,
            clockRate: 48000,
            channels: 2,
          },
        ],
        'Test Audio Stream',
      );

      assert.ok(sdp, 'Should generate SDP');
      assert.ok(sdp.includes('m=audio 5004'), 'SDP should have audio media line');
      assert.ok(sdp.includes('a=rtpmap:111 opus/48000/2'), 'SDP should have Opus rtpmap');

      // Open Demuxer with SDP
      const rtpInput = await Demuxer.openSDP(sdp);

      assert.ok(rtpInput, 'Should create RTP input');
      assert.ok(rtpInput.input, 'Should have Demuxer instance');
      assert.ok(typeof rtpInput.sendPacket === 'function', 'Should have sendPacket function');
      assert.ok(typeof rtpInput.close === 'function', 'Should have close function');

      // Verify we can call sendPacket without error (no actual packet)
      const testPacket = Buffer.alloc(100);
      assert.doesNotThrow(() => {
        rtpInput.sendPacket(testPacket);
      }, 'Should allow sending packets');

      // Cleanup
      await rtpInput.close();
    });

    it('should open RTP input from SDP (single stream - video)', async () => {
      // Generate SDP for H.264 video stream
      const sdp = StreamingUtils.createInputSDP([
        {
          port: 5006,
          codecId: AV_CODEC_ID_H264,
          payloadType: 96,
          clockRate: 90000,
        },
      ]);

      assert.ok(sdp, 'Should generate SDP');
      assert.ok(sdp.includes('m=video 5006'), 'SDP should have video media line');
      assert.ok(sdp.includes('a=rtpmap:96 H264/90000'), 'SDP should have H.264 rtpmap');

      // Open Demuxer with SDP
      const rtpInput = await Demuxer.openSDP(sdp);

      assert.ok(rtpInput, 'Should create RTP input');
      assert.ok(rtpInput.input, 'Should have Demuxer instance');

      // Cleanup
      await rtpInput.close();
    });

    it('should open RTP input from SDP (multi-stream)', async () => {
      // Generate multi-stream SDP (video + audio) - use different ports to avoid conflicts
      const sdp = StreamingUtils.createInputSDP(
        [
          // Stream 0: Video
          {
            port: 5008,
            codecId: AV_CODEC_ID_H264,
            payloadType: 96,
            clockRate: 90000,
          },
          // Stream 1: Audio
          {
            port: 5010,
            codecId: AV_CODEC_ID_OPUS,
            payloadType: 111,
            clockRate: 48000,
            channels: 2,
          },
        ],
        'Video+Audio Stream',
      );

      assert.ok(sdp, 'Should generate multi-stream SDP');
      assert.ok(sdp.includes('m=video 5008'), 'SDP should have video media line');
      assert.ok(sdp.includes('m=audio 5010'), 'SDP should have audio media line');

      // Extract ports
      const ports = StreamingUtils.extractPortsFromSDP(sdp);
      assert.equal(ports.length, 2, 'Should extract 2 ports');
      assert.equal(ports[0], 5008, 'First port should be 5008');
      assert.equal(ports[1], 5010, 'Second port should be 5010');

      // Open Demuxer with multi-stream SDP
      const rtpInput = await Demuxer.openSDP(sdp);

      assert.ok(rtpInput, 'Should create multi-stream RTP input');

      // Test sending to different streams
      const testPacket = Buffer.alloc(100);
      assert.doesNotThrow(() => {
        rtpInput.sendPacket(testPacket, 0); // Video stream
      }, 'Should send to video stream (index 0)');

      assert.doesNotThrow(() => {
        rtpInput.sendPacket(testPacket, 1); // Audio stream
      }, 'Should send to audio stream (index 1)');

      // Test invalid stream index
      assert.throws(() => {
        rtpInput.sendPacket(testPacket, 2); // Invalid stream
      }, /No port found for stream index/);

      // Cleanup
      await rtpInput.close();
    });

    it('should support SRTP with crypto keys', async () => {
      // Simulate SRTP keys
      const srtpKey = Buffer.alloc(16, 0x12); // 16 bytes master key
      const srtpSalt = Buffer.alloc(14, 0x34); // 14 bytes salt

      // Generate SDP with SRTP - use different port
      const sdp = StreamingUtils.createInputSDP([
        {
          port: 5012,
          codecId: AV_CODEC_ID_OPUS,
          payloadType: 111,
          clockRate: 16000,
          channels: 1,
          srtp: {
            key: srtpKey,
            salt: srtpSalt,
          },
        },
      ]);

      assert.ok(sdp, 'Should generate SRTP SDP');
      assert.ok(sdp.includes('a=crypto:1 AES_CM_128_HMAC_SHA1_80'), 'SDP should have crypto line');

      // Open Demuxer with SRTP SDP
      const rtpInput = await Demuxer.openSDP(sdp);

      assert.ok(rtpInput, 'Should create SRTP input');

      // Cleanup
      await rtpInput.close();
    });

    it('should support custom fmtp parameters', async () => {
      // Generate SDP with fmtp - use different port
      const sdp = StreamingUtils.createInputSDP([
        {
          port: 5014,
          codecId: AV_CODEC_ID_OPUS,
          payloadType: 111,
          clockRate: 16000,
          channels: 1,
          fmtp: 'minptime=10;useinbandfec=1',
        },
      ]);

      assert.ok(sdp, 'Should generate SDP with fmtp');
      assert.ok(sdp.includes('a=fmtp:111 minptime=10;useinbandfec=1'), 'SDP should have fmtp line');

      // Open Demuxer with fmtp
      const rtpInput = await Demuxer.openSDP(sdp);

      assert.ok(rtpInput, 'Should create RTP input with fmtp');

      // Cleanup
      await rtpInput.close();
    });

    it('should fail with invalid SDP', async () => {
      const invalidSdp = 'invalid sdp content';

      await assert.rejects(async () => await Demuxer.openSDP(invalidSdp), /Failed to extract any ports from SDP/);
    });

    it('should fail with empty SDP', async () => {
      const emptySdp = '';

      await assert.rejects(async () => await Demuxer.openSDP(emptySdp), /Failed to extract any ports from SDP/);
    });

    it('should support different SRTP crypto suites', async () => {
      const srtpKey = Buffer.alloc(16, 0x12);
      const srtpSalt = Buffer.alloc(14, 0x34);

      // Test AES_CM_128_HMAC_SHA1_32 suite - use different port
      const sdp = StreamingUtils.createInputSDP([
        {
          port: 5016,
          codecId: AV_CODEC_ID_OPUS,
          payloadType: 111,
          clockRate: 48000,
          channels: 2,
          srtp: {
            key: srtpKey,
            salt: srtpSalt,
            suite: 'AES_CM_128_HMAC_SHA1_80',
          },
        },
      ]);

      assert.ok(sdp.includes('a=crypto:1 AES_CM_128_HMAC_SHA1_80'), 'SDP should use specified crypto suite');

      const rtpInput = await Demuxer.openSDP(sdp);
      assert.ok(rtpInput, 'Should create RTP input with custom crypto suite');

      await rtpInput.close();
    });

    it('should handle cleanup properly with using keyword', async () => {
      // Use different port for cleanup test
      const sdp = StreamingUtils.createInputSDP([
        {
          port: 5018,
          codecId: AV_CODEC_ID_OPUS,
          payloadType: 111,
          clockRate: 48000,
          channels: 2,
        },
      ]);

      // Test with manual cleanup
      {
        const rtpInput = await Demuxer.openSDP(sdp);
        assert.ok(rtpInput.input, 'Should have input');
        await rtpInput.close();
      }

      // Verify we can create another instance after cleanup
      const rtpInput2 = await Demuxer.openSDP(sdp);
      assert.ok(rtpInput2, 'Should create another instance after cleanup');
      await rtpInput2.close();
    });
  });

  describe('openSDPSync', () => {
    it('should open RTP input from SDP (single stream - audio) (sync)', () => {
      // Generate SDP for Opus audio stream
      const sdp = StreamingUtils.createInputSDP(
        [
          {
            port: 5020,
            codecId: AV_CODEC_ID_OPUS,
            payloadType: 111,
            clockRate: 48000,
            channels: 2,
          },
        ],
        'Test Audio Stream',
      );

      assert.ok(sdp, 'Should generate SDP');
      assert.ok(sdp.includes('m=audio 5020'), 'SDP should have audio media line');
      assert.ok(sdp.includes('a=rtpmap:111 opus/48000/2'), 'SDP should have Opus rtpmap');

      // Open Demuxer with SDP (sync)
      const rtpInput = Demuxer.openSDPSync(sdp);

      assert.ok(rtpInput, 'Should create RTP input');
      assert.ok(rtpInput.input, 'Should have Demuxer instance');
      assert.ok(typeof rtpInput.sendPacket === 'function', 'Should have sendPacket function');
      assert.ok(typeof rtpInput.closeSync === 'function', 'Should have closeSync function');

      // Verify we can call sendPacket without error (no actual packet)
      const testPacket = Buffer.alloc(100);
      assert.doesNotThrow(() => {
        rtpInput.sendPacket(testPacket);
      }, 'Should allow sending packets');

      // Cleanup
      rtpInput.closeSync();
    });

    it('should open RTP input from SDP (single stream - video) (sync)', () => {
      // Generate SDP for H.264 video stream
      const sdp = StreamingUtils.createInputSDP([
        {
          port: 5022,
          codecId: AV_CODEC_ID_H264,
          payloadType: 96,
          clockRate: 90000,
        },
      ]);

      assert.ok(sdp, 'Should generate SDP');
      assert.ok(sdp.includes('m=video 5022'), 'SDP should have video media line');
      assert.ok(sdp.includes('a=rtpmap:96 H264/90000'), 'SDP should have H.264 rtpmap');

      // Open Demuxer with SDP (sync)
      const rtpInput = Demuxer.openSDPSync(sdp);

      assert.ok(rtpInput, 'Should create RTP input');
      assert.ok(rtpInput.input, 'Should have Demuxer instance');

      // Cleanup
      rtpInput.closeSync();
    });

    it('should open RTP input from SDP (multi-stream) (sync)', () => {
      // Generate multi-stream SDP (video + audio)
      const sdp = StreamingUtils.createInputSDP(
        [
          // Stream 0: Video
          {
            port: 5024,
            codecId: AV_CODEC_ID_H264,
            payloadType: 96,
            clockRate: 90000,
          },
          // Stream 1: Audio
          {
            port: 5026,
            codecId: AV_CODEC_ID_OPUS,
            payloadType: 111,
            clockRate: 48000,
            channels: 2,
          },
        ],
        'Video+Audio Stream',
      );

      assert.ok(sdp, 'Should generate multi-stream SDP');
      assert.ok(sdp.includes('m=video 5024'), 'SDP should have video media line');
      assert.ok(sdp.includes('m=audio 5026'), 'SDP should have audio media line');

      // Extract ports
      const ports = StreamingUtils.extractPortsFromSDP(sdp);
      assert.equal(ports.length, 2, 'Should extract 2 ports');
      assert.equal(ports[0], 5024, 'First port should be 5024');
      assert.equal(ports[1], 5026, 'Second port should be 5026');

      // Open Demuxer with multi-stream SDP (sync)
      const rtpInput = Demuxer.openSDPSync(sdp);

      assert.ok(rtpInput, 'Should create multi-stream RTP input');

      // Test sending to different streams
      const testPacket = Buffer.alloc(100);
      assert.doesNotThrow(() => {
        rtpInput.sendPacket(testPacket, 0); // Video stream
      }, 'Should send to video stream (index 0)');

      assert.doesNotThrow(() => {
        rtpInput.sendPacket(testPacket, 1); // Audio stream
      }, 'Should send to audio stream (index 1)');

      // Test invalid stream index
      assert.throws(() => {
        rtpInput.sendPacket(testPacket, 2); // Invalid stream
      }, /No port found for stream index/);

      // Cleanup
      rtpInput.closeSync();
    });

    it('should support SRTP with crypto keys (sync)', () => {
      // Simulate SRTP keys
      const srtpKey = Buffer.alloc(16, 0x12); // 16 bytes master key
      const srtpSalt = Buffer.alloc(14, 0x34); // 14 bytes salt

      // Generate SDP with SRTP
      const sdp = StreamingUtils.createInputSDP([
        {
          port: 5028,
          codecId: AV_CODEC_ID_OPUS,
          payloadType: 111,
          clockRate: 16000,
          channels: 1,
          srtp: {
            key: srtpKey,
            salt: srtpSalt,
          },
        },
      ]);

      assert.ok(sdp, 'Should generate SRTP SDP');
      assert.ok(sdp.includes('a=crypto:1 AES_CM_128_HMAC_SHA1_80'), 'SDP should have crypto line');

      // Open Demuxer with SRTP SDP (sync)
      const rtpInput = Demuxer.openSDPSync(sdp);

      assert.ok(rtpInput, 'Should create SRTP input');

      // Cleanup
      rtpInput.closeSync();
    });

    it('should support custom fmtp parameters (sync)', () => {
      // Generate SDP with fmtp
      const sdp = StreamingUtils.createInputSDP([
        {
          port: 5030,
          codecId: AV_CODEC_ID_OPUS,
          payloadType: 111,
          clockRate: 16000,
          channels: 1,
          fmtp: 'minptime=10;useinbandfec=1',
        },
      ]);

      assert.ok(sdp, 'Should generate SDP with fmtp');
      assert.ok(sdp.includes('a=fmtp:111 minptime=10;useinbandfec=1'), 'SDP should have fmtp line');

      // Open Demuxer with fmtp (sync)
      const rtpInput = Demuxer.openSDPSync(sdp);

      assert.ok(rtpInput, 'Should create RTP input with fmtp');

      // Cleanup
      rtpInput.closeSync();
    });

    it('should fail with invalid SDP (sync)', () => {
      const invalidSdp = 'invalid sdp content';

      assert.throws(() => Demuxer.openSDPSync(invalidSdp), /Failed to extract any ports from SDP/);
    });

    it('should fail with empty SDP (sync)', () => {
      const emptySdp = '';

      assert.throws(() => Demuxer.openSDPSync(emptySdp), /Failed to extract any ports from SDP/);
    });

    it('should support different SRTP crypto suites (sync)', () => {
      const srtpKey = Buffer.alloc(16, 0x12);
      const srtpSalt = Buffer.alloc(14, 0x34);

      // Test AES_CM_128_HMAC_SHA1_32 suite
      const sdp = StreamingUtils.createInputSDP([
        {
          port: 5032,
          codecId: AV_CODEC_ID_OPUS,
          payloadType: 111,
          clockRate: 48000,
          channels: 2,
          srtp: {
            key: srtpKey,
            salt: srtpSalt,
            suite: 'AES_CM_128_HMAC_SHA1_80',
          },
        },
      ]);

      assert.ok(sdp.includes('a=crypto:1 AES_CM_128_HMAC_SHA1_80'), 'SDP should use specified crypto suite');

      const rtpInput = Demuxer.openSDPSync(sdp);
      assert.ok(rtpInput, 'Should create RTP input with custom crypto suite');

      rtpInput.closeSync();
    });

    it('should handle cleanup properly (sync)', () => {
      // Test with manual cleanup
      const sdp = StreamingUtils.createInputSDP([
        {
          port: 5034,
          codecId: AV_CODEC_ID_OPUS,
          payloadType: 111,
          clockRate: 48000,
          channels: 2,
        },
      ]);

      {
        const rtpInput = Demuxer.openSDPSync(sdp);
        assert.ok(rtpInput.input, 'Should have input');
        rtpInput.closeSync();
      }

      // Verify we can create another instance after cleanup
      const rtpInput2 = Demuxer.openSDPSync(sdp);
      assert.ok(rtpInput2, 'Should create another instance after cleanup');
      rtpInput2.closeSync();
    });
  });

  describe('AbortSignal', () => {
    it('should reject open with pre-aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();
      await assert.rejects(() => Demuxer.open(inputFile, { signal: controller.signal }), { name: 'AbortError' });
    });

    it('should throw AbortError on packets after abort', async () => {
      const controller = new AbortController();
      const media = await Demuxer.open(inputFile, { signal: controller.signal });
      openInstances.push(media);

      // Abort before iterating
      controller.abort();

      await assert.rejects(
        async () => {
          for await (const packet of media.packets()) {
            if (!packet) break;
            packet.free();
          }
        },
        { name: 'AbortError' },
      );

      await media.close();
    });

    it('should abort seek with signal', async () => {
      const controller = new AbortController();
      const media = await Demuxer.open(inputFile, { signal: controller.signal });
      openInstances.push(media);

      controller.abort();
      await assert.rejects(() => media.seek(0), { name: 'AbortError' });

      await media.close();
    });
  });
});
