import assert from 'node:assert';
import { closeSync, openSync, readSync } from 'node:fs';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  AV_CODEC_ID_AAC,
  AV_CODEC_ID_H264,
  AV_CODEC_ID_HEVC,
  AV_CODEC_ID_MP2,
  AV_CODEC_ID_MP3,
  AV_CODEC_ID_MPEG1VIDEO,
  AV_CODEC_ID_MPEG2VIDEO,
  AV_INPUT_BUFFER_PADDING_SIZE,
  AV_NOPTS_VALUE,
  Codec,
  CodecContext,
  CodecParser,
  FFmpegError,
  Frame,
  Packet,
} from '../src/index.js';
import { getInputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputFile = getInputFile('video.m1v');

describe('CodecParser', () => {
  let parser: CodecParser;

  beforeEach(() => {
    parser = new CodecParser();
  });

  afterEach(() => {
    // Cleanup
    parser.close();
  });

  describe('Lifecycle', () => {
    it('should create a parser instance', () => {
      assert.ok(parser);
      assert.ok(parser.getNative());
    });

    it('should initialize parser with codec ID', () => {
      parser.init(AV_CODEC_ID_H264);
      // Should not throw
      assert.ok(true);
    });

    it('should close parser without error', () => {
      parser.init(AV_CODEC_ID_H264);
      parser.close();
      // Should not throw
      assert.ok(true);
    });

    it('should handle invalid codec ID', () => {
      assert.throws(() => {
        parser.init(999999 as any); // Invalid codec ID
      });
    });
  });

  describe('Parsing', () => {
    it('should parse MPEG1 video data', async () => {
      // Find MPEG1 decoder
      const codec = Codec.findDecoder(AV_CODEC_ID_MPEG1VIDEO);
      assert.ok(codec, 'MPEG1 video decoder not found');

      // Initialize parser
      parser.init(AV_CODEC_ID_MPEG1VIDEO);

      // Create codec context
      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      await codecCtx.open2(codec, null);

      // Create packet for output
      const packet = new Packet();
      packet.alloc();

      // Create a simple test buffer (not real MPEG1 data)
      const testData = Buffer.alloc(1024);

      // Parse the data
      const consumed = parser.parse2(codecCtx, packet, testData, AV_NOPTS_VALUE, AV_NOPTS_VALUE, 0);

      // Should consume some or all data (or 0 if needs more)
      assert.ok(consumed >= 0, 'Parser returned error');
      assert.ok(consumed <= testData.length, 'Parser consumed more than provided');

      // Cleanup
      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });

    it('should handle empty buffer', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);

      parser.init(AV_CODEC_ID_H264);

      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      await codecCtx.open2(codec, null);

      const packet = new Packet();
      packet.alloc();

      const emptyBuffer = Buffer.alloc(0);
      const consumed = parser.parse2(codecCtx, packet, emptyBuffer, AV_NOPTS_VALUE, AV_NOPTS_VALUE, 0);

      assert.equal(consumed, 0, 'Should consume 0 bytes from empty buffer');

      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });

    it('should pass timestamps through parser', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_MPEG1VIDEO);
      assert.ok(codec);

      parser.init(AV_CODEC_ID_MPEG1VIDEO);

      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      await codecCtx.open2(codec, null);

      const packet = new Packet();
      packet.alloc();

      const testData = Buffer.alloc(512);
      const pts = 1000n;
      const dts = 900n;
      const pos = 42;

      const consumed = parser.parse2(codecCtx, packet, testData, pts, dts, pos);

      assert.ok(consumed >= 0, 'Parser returned error');

      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });

    it('should pass timestamps through parser (sync)', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_MPEG1VIDEO);
      assert.ok(codec);

      parser.init(AV_CODEC_ID_MPEG1VIDEO);

      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      codecCtx.open2Sync(codec, null);

      const packet = new Packet();
      packet.alloc();

      const testData = Buffer.alloc(512);
      const pts = 1000n;
      const dts = 900n;
      const pos = 42;

      const consumed = parser.parse2(codecCtx, packet, testData, pts, dts, pos);

      assert.ok(consumed >= 0, 'Parser returned error');

      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });
  });

  describe('Integration with CodecContext', () => {
    it('should work with real MPEG1 video stream (async)', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_MPEG1VIDEO);
      assert.ok(codec);

      parser.init(AV_CODEC_ID_MPEG1VIDEO);

      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      await codecCtx.open2(codec, null);

      const packet = new Packet();
      packet.alloc();

      const frame = new Frame();
      frame.alloc();

      // Read some data from file
      const fd = openSync(inputFile, 'r');
      const inbuf = Buffer.alloc(4096 + AV_INPUT_BUFFER_PADDING_SIZE);
      const bytesRead = readSync(fd, inbuf, 0, 4096, null);
      closeSync(fd);

      if (bytesRead > 0) {
        let offset = 0;

        while (offset < bytesRead) {
          const consumed = parser.parse2(codecCtx, packet, inbuf.subarray(offset, bytesRead), AV_NOPTS_VALUE, AV_NOPTS_VALUE, 0);

          if (consumed < 0) {
            throw new FFmpegError(consumed);
          }

          offset += consumed;

          // If we got a complete packet, try to decode it
          if (packet.size > 0) {
            const sendRet = await codecCtx.sendPacket(packet);
            if (sendRet >= 0) {
              while (true) {
                const recvRet = await codecCtx.receiveFrame(frame);
                if (recvRet < 0) break; // EAGAIN or EOF
                frame.unref();
              }
            }
          }

          // Break if no more data consumed
          if (consumed === 0 && packet.size === 0) {
            break;
          }
        }

        // We should have parsed some data
        assert.ok(offset > 0, 'No data was parsed');
      }

      frame.free();
      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });

    it('should work with real MPEG1 video stream (sync)', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_MPEG1VIDEO);
      assert.ok(codec);

      parser.init(AV_CODEC_ID_MPEG1VIDEO);

      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      codecCtx.open2Sync(codec, null);

      const packet = new Packet();
      packet.alloc();

      const frame = new Frame();
      frame.alloc();

      // Read some data from file
      const fd = openSync(inputFile, 'r');
      const inbuf = Buffer.alloc(4096 + AV_INPUT_BUFFER_PADDING_SIZE);
      const bytesRead = readSync(fd, inbuf, 0, 4096, null);
      closeSync(fd);

      if (bytesRead > 0) {
        let offset = 0;

        while (offset < bytesRead) {
          const consumed = parser.parse2(codecCtx, packet, inbuf.subarray(offset, bytesRead), AV_NOPTS_VALUE, AV_NOPTS_VALUE, 0);

          if (consumed < 0) {
            throw new FFmpegError(consumed);
          }

          offset += consumed;

          // If we got a complete packet, try to decode it
          if (packet.size > 0) {
            const sendRet = codecCtx.sendPacketSync(packet);
            if (sendRet >= 0) {
              while (true) {
                const recvRet = codecCtx.receiveFrameSync(frame);
                if (recvRet < 0) break; // EAGAIN or EOF
                frame.unref();
              }
            }
          }

          // Break if no more data consumed
          if (consumed === 0 && packet.size === 0) {
            break;
          }
        }

        // We should have parsed some data
        assert.ok(offset > 0, 'No data was parsed');
      }

      frame.free();
      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid codec context', () => {
      parser.init(AV_CODEC_ID_H264);

      const packet = new Packet();
      packet.alloc();

      const testData = Buffer.alloc(100);

      // Using uninitialized codec context should cause issues
      const codecCtx = new CodecContext();

      assert.throws(() => {
        parser.parse2(codecCtx, packet, testData, AV_NOPTS_VALUE, AV_NOPTS_VALUE, 0);
      });

      packet.free();
    });
  });

  describe('Different Codec Support', () => {
    const codecIds = [
      { id: AV_CODEC_ID_H264, name: 'H.264' },
      { id: AV_CODEC_ID_HEVC, name: 'HEVC/H.265' },
      { id: AV_CODEC_ID_MPEG1VIDEO, name: 'MPEG1' },
      { id: AV_CODEC_ID_MPEG2VIDEO, name: 'MPEG2' },
      { id: AV_CODEC_ID_MP2, name: 'MP2 Audio' },
      { id: AV_CODEC_ID_MP3, name: 'MP3 Audio' },
      { id: AV_CODEC_ID_AAC, name: 'AAC Audio' },
    ];

    for (const { id, name } of codecIds) {
      it(`should initialize parser for ${name}`, () => {
        parser.init(id);
        // Should not throw
        assert.ok(true);
      });
    }
  });

  describe('Audio Codec Parsing', () => {
    it('should parse MP2 audio data (async)', async () => {
      // Find MP2 decoder
      const codec = Codec.findDecoder(AV_CODEC_ID_MP2);
      if (!codec) {
        // MP2 codec might not be available in all builds
        return;
      }

      // Initialize parser
      parser.init(AV_CODEC_ID_MP2);

      // Create codec context
      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      await codecCtx.open2(codec, null);

      // Create packet for output
      const packet = new Packet();
      packet.alloc();

      // Create a test buffer (not real MP2 data)
      const testData = Buffer.alloc(1024);

      // Parse the data
      const consumed = parser.parse2(codecCtx, packet, testData, AV_NOPTS_VALUE, AV_NOPTS_VALUE, 0);

      // Should consume some or all data (or 0 if needs more)
      assert.ok(consumed >= 0, 'Parser returned error');
      assert.ok(consumed <= testData.length, 'Parser consumed more than provided');

      // Cleanup
      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });

    it('should parse MP2 audio data (sync)', () => {
      // Find MP2 decoder
      const codec = Codec.findDecoder(AV_CODEC_ID_MP2);
      if (!codec) {
        // MP2 codec might not be available in all builds
        return;
      }

      // Initialize parser
      parser.init(AV_CODEC_ID_MP2);

      // Create codec context
      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      codecCtx.open2Sync(codec, null);

      // Create packet for output
      const packet = new Packet();
      packet.alloc();

      // Create a test buffer (not real MP2 data)
      const testData = Buffer.alloc(1024);

      // Parse the data
      const consumed = parser.parse2(codecCtx, packet, testData, AV_NOPTS_VALUE, AV_NOPTS_VALUE, 0);

      // Should consume some or all data (or 0 if needs more)
      assert.ok(consumed >= 0, 'Parser returned error');
      assert.ok(consumed <= testData.length, 'Parser consumed more than provided');

      // Cleanup
      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });

    it('should parse MP3 audio data (async)', async () => {
      // Find MP3 decoder
      const codec = Codec.findDecoder(AV_CODEC_ID_MP3);
      if (!codec) {
        // MP3 codec might not be available in all builds
        return;
      }

      // Initialize parser
      parser.init(AV_CODEC_ID_MP3);

      // Create codec context
      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      await codecCtx.open2(codec, null);

      // Create packet for output
      const packet = new Packet();
      packet.alloc();

      // Create a test buffer
      const testData = Buffer.alloc(2048);

      // Parse the data
      const consumed = parser.parse2(codecCtx, packet, testData, AV_NOPTS_VALUE, AV_NOPTS_VALUE, 0);

      // Should consume some or all data (or 0 if needs more)
      assert.ok(consumed >= 0, 'Parser returned error');
      assert.ok(consumed <= testData.length, 'Parser consumed more than provided');

      // Cleanup
      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });

    it('should parse MP3 audio data (sync)', () => {
      // Find MP3 decoder
      const codec = Codec.findDecoder(AV_CODEC_ID_MP3);
      if (!codec) {
        // MP3 codec might not be available in all builds
        return;
      }

      // Initialize parser
      parser.init(AV_CODEC_ID_MP3);

      // Create codec context
      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      codecCtx.open2Sync(codec, null);

      // Create packet for output
      const packet = new Packet();
      packet.alloc();

      // Create a test buffer
      const testData = Buffer.alloc(2048);

      // Parse the data
      const consumed = parser.parse2(codecCtx, packet, testData, AV_NOPTS_VALUE, AV_NOPTS_VALUE, 0);

      // Should consume some or all data (or 0 if needs more)
      assert.ok(consumed >= 0, 'Parser returned error');
      assert.ok(consumed <= testData.length, 'Parser consumed more than provided');

      // Cleanup
      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });

    it('should handle audio packet with timestamps (async)', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_AAC);
      if (!codec) {
        return;
      }

      parser.init(AV_CODEC_ID_AAC);

      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      await codecCtx.open2(codec, null);

      const packet = new Packet();
      packet.alloc();

      const testData = Buffer.alloc(1024);
      const pts = 2000n;
      const dts = 1900n;
      const pos = 100;

      const consumed = parser.parse2(codecCtx, packet, testData, pts, dts, pos);

      assert.ok(consumed >= 0, 'Parser returned error');

      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });

    it('should handle audio packet with timestamps (sync)', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_AAC);
      if (!codec) {
        return;
      }

      parser.init(AV_CODEC_ID_AAC);

      const codecCtx = new CodecContext();
      codecCtx.allocContext3(codec);
      codecCtx.open2Sync(codec, null);

      const packet = new Packet();
      packet.alloc();

      const testData = Buffer.alloc(1024);
      const pts = 2000n;
      const dts = 1900n;
      const pos = 100;

      const consumed = parser.parse2(codecCtx, packet, testData, pts, dts, pos);

      assert.ok(consumed >= 0, 'Parser returned error');

      packet.unref();
      packet.free();
      codecCtx.freeContext();
    });
  });
});
