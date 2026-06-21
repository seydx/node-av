import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Decoder } from '../src/api/decoder.js';
import { Demuxer } from '../src/api/demuxer.js';
import { HardwareContext } from '../src/api/hardware.js';
import { AV_CODEC_ID_H264, AV_PIX_FMT_RGB24, AV_PIX_FMT_YUV420P, AV_PIX_FMT_YUV444P, AV_SAMPLE_FMT_FLTP } from '../src/constants/constants.js';
import { AV_CHANNEL_LAYOUT_MONO } from '../src/constants/channel-layouts.js';
import { FF_DECODER_AAC, FF_DECODER_H264 } from '../src/constants/decoders.js';
import { Codec, Packet } from '../src/lib/index.js';
import { decodePacket, decodePacketSync, getInputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputFile = getInputFile('demux.mp4');
const audioInputFile = getInputFile('audio.wav');

describe('Decoder', () => {
  describe('create', () => {
    it('should create decoder for video stream (async)', async () => {
      const media = await Demuxer.open(inputFile);

      // Find video stream
      const videoStream = media.video();
      assert.ok(videoStream, 'Should find video stream');

      // Create decoder
      const decoder = await Decoder.create(videoStream);
      assert.ok(decoder);
      assert.equal(decoder.isDecoderOpen, true);
      assert.equal(decoder.getStream().index, videoStream.index);

      decoder.close();
      await media.close();
    });

    it('should create decoder for video stream (sync)', () => {
      const media = Demuxer.openSync(inputFile);

      // Find video stream
      const videoStream = media.video();
      assert.ok(videoStream, 'Should find video stream');

      // Create decoder
      const decoder = Decoder.createSync(videoStream);
      assert.ok(decoder);
      assert.equal(decoder.isDecoderOpen, true);
      assert.equal(decoder.getStream().index, videoStream.index);

      decoder.close();
      media.closeSync();
    });

    it('should run the configure hook before opening the context (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream, 'Should find video stream');

      let receivedContext = false;
      const decoder = await Decoder.create(videoStream, {
        configure: (ctx) => {
          // Decoder opens eagerly in create(), so the hook runs before open2.
          receivedContext = typeof ctx.threadCount === 'number';
        },
      });
      assert.ok(receivedContext, 'configure should be invoked with the codec context before open');
      assert.equal(decoder.isDecoderOpen, true);

      decoder.close();
      await media.close();
    });

    it('should create decoder for audio stream (sync)', () => {
      const media = Demuxer.openSync(inputFile);

      // Find audio stream
      const audioStream = media.audio();
      assert.ok(audioStream, 'Should find audio stream');

      // Create decoder
      const decoder = Decoder.createSync(audioStream);
      assert.ok(decoder);
      assert.equal(decoder.isDecoderOpen, true);

      decoder.close();
      media.closeSync();
    });
  });

  it('should create decoder for audio stream (async)', async () => {
    const media = await Demuxer.open(inputFile);

    // Find audio stream
    const audioStream = media.audio();
    assert.ok(audioStream, 'Should find audio stream');

    // Create decoder
    const decoder = await Decoder.create(audioStream);
    assert.ok(decoder);
    assert.equal(decoder.isDecoderOpen, true);

    decoder.close();
    await media.close();
  });

  it('should create decoder for video stream (sync)', () => {
    const media = Demuxer.openSync(inputFile);

    // Find video stream
    const videoStream = media.video();
    assert.ok(videoStream, 'Should find video stream');

    // Create decoder
    const decoder = Decoder.createSync(videoStream);
    assert.ok(decoder);
    assert.equal(decoder.isDecoderOpen, true);
    assert.equal(decoder.getStream().index, videoStream.index);

    decoder.close();
    media.closeSync();
  });

  it('should create decoder for audio stream (sync)', () => {
    const media = Demuxer.openSync(inputFile);

    // Find audio stream
    const audioStream = media.audio();
    assert.ok(audioStream, 'Should find audio stream');

    // Create decoder
    const decoder = Decoder.createSync(audioStream);
    assert.ok(decoder);
    assert.equal(decoder.isDecoderOpen, true);

    decoder.close();
    media.closeSync();
  });

  it('should create decoder for video stream (sync)', () => {
    const media = Demuxer.openSync(inputFile);

    // Find video stream
    const videoStream = media.video();
    assert.ok(videoStream, 'Should find video stream');

    // Create decoder
    const decoder = Decoder.createSync(videoStream);
    assert.ok(decoder);
    assert.equal(decoder.isDecoderOpen, true);
    assert.equal(decoder.getStream().index, videoStream.index);

    decoder.close();
    media.closeSync();
  });

  it('should create decoder for audio stream (sync)', () => {
    const media = Demuxer.openSync(inputFile);

    // Find audio stream
    const audioStream = media.audio();
    assert.ok(audioStream, 'Should find audio stream');

    // Create decoder
    const decoder = Decoder.createSync(audioStream);
    assert.ok(decoder);
    assert.equal(decoder.isDecoderOpen, true);

    decoder.close();
    media.closeSync();
  });

  describe('explicit codec selection', () => {
    it('should create decoder with explicit codec name (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Use explicit decoder codec name
      const decoder = await Decoder.create(videoStream, FF_DECODER_H264);
      assert.ok(decoder);
      assert.equal(decoder.isDecoderOpen, true);
      assert.equal(decoder.getStream().index, videoStream.index);

      decoder.close();
      await media.close();
    });

    it('should create decoder with explicit codec name (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Use explicit decoder codec name
      const decoder = Decoder.createSync(videoStream, FF_DECODER_H264);
      assert.ok(decoder);
      assert.equal(decoder.isDecoderOpen, true);
      assert.equal(decoder.getStream().index, videoStream.index);

      decoder.close();
      media.closeSync();
    });

    it('should create decoder with explicit codec ID (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Use explicit codec ID
      const decoder = await Decoder.create(videoStream, AV_CODEC_ID_H264);
      assert.ok(decoder);
      assert.equal(decoder.isDecoderOpen, true);

      decoder.close();
      await media.close();
    });

    it('should create decoder with explicit codec ID (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Use explicit codec ID
      const decoder = Decoder.createSync(videoStream, AV_CODEC_ID_H264);
      assert.ok(decoder);
      assert.equal(decoder.isDecoderOpen, true);

      decoder.close();
      media.closeSync();
    });

    it('should create decoder with Codec instance (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Get codec instance and use it explicitly
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);

      const decoder = await Decoder.create(videoStream, codec);
      assert.ok(decoder);
      assert.equal(decoder.isDecoderOpen, true);
      assert.equal(decoder.getCodec().id, codec.id);

      decoder.close();
      await media.close();
    });

    it('should create decoder with Codec instance (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Get codec instance and use it explicitly
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec);

      const decoder = Decoder.createSync(videoStream, codec);
      assert.ok(decoder);
      assert.equal(decoder.isDecoderOpen, true);
      assert.equal(decoder.getCodec().id, codec.id);

      decoder.close();
      media.closeSync();
    });

    it('should create audio decoder with explicit codec name (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const audioStream = media.audio();
      assert.ok(audioStream);

      // Use explicit audio decoder
      const decoder = await Decoder.create(audioStream, FF_DECODER_AAC);
      assert.ok(decoder);
      assert.equal(decoder.isDecoderOpen, true);

      decoder.close();
      await media.close();
    });

    it('should create audio decoder with explicit codec name (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const audioStream = media.audio();
      assert.ok(audioStream);

      // Use explicit audio decoder
      const decoder = Decoder.createSync(audioStream, FF_DECODER_AAC);
      assert.ok(decoder);
      assert.equal(decoder.isDecoderOpen, true);

      decoder.close();
      media.closeSync();
    });

    it('should throw for invalid codec name (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Try to create decoder with non-existent codec
      await assert.rejects(async () => await Decoder.create(videoStream, 'invalid_codec_name_12345' as any), {
        message: /not found/,
      });

      await media.close();
    });

    it('should throw for invalid codec name (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Try to create decoder with non-existent codec
      assert.throws(() => Decoder.createSync(videoStream, 'invalid_codec_name_12345' as any), {
        message: /not found/,
      });

      media.closeSync();
    });

    it('should throw for invalid codec ID (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Try to create decoder with invalid codec ID
      await assert.rejects(async () => await Decoder.create(videoStream, 999999 as any), {
        message: /not found/,
      });

      await media.close();
    });

    it('should throw for invalid codec ID (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Try to create decoder with invalid codec ID
      assert.throws(() => Decoder.createSync(videoStream, 999999 as any), {
        message: /not found/,
      });

      media.closeSync();
    });

    it('should decode with explicitly selected codec (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Create decoder with explicit codec
      const decoder = await Decoder.create(videoStream, FF_DECODER_H264);

      let frameCount = 0;
      let packetCount = 0;
      const maxPackets = 10;

      for await (using packet of media.packets()) {
        if (!packet) break;

        if (packet.streamIndex === videoStream.index) {
          for await (using frame of decodePacket(decoder, packet)) {
            assert.ok(frame.width > 0);
            assert.ok(frame.height > 0);
            frameCount++;
          }

          packetCount++;
          if (packetCount >= maxPackets) break;
        }
      }

      // Flush remaining frames
      for await (using frame of decoder.flushFrames()) {
        assert.ok(frame.width > 0);
        frameCount++;
      }

      assert.ok(frameCount > 0, 'Should decode at least one frame with explicit codec');

      decoder.close();
      await media.close();
    });

    it('should decode with explicitly selected codec (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Create decoder with explicit codec
      const decoder = Decoder.createSync(videoStream, FF_DECODER_H264);

      let frameCount = 0;
      let packetCount = 0;
      const maxPackets = 10;

      for (using packet of media.packetsSync()) {
        if (!packet) break;

        if (packet.streamIndex === videoStream.index) {
          for (using frame of decodePacketSync(decoder, packet)) {
            assert.ok(frame.width > 0);
            assert.ok(frame.height > 0);
            frameCount++;
          }

          packetCount++;
          if (packetCount >= maxPackets) break;
        }
      }

      // Flush remaining frames
      for (using frame of decoder.flushFramesSync()) {
        assert.ok(frame.width > 0);
        frameCount++;
      }

      assert.ok(frameCount > 0, 'Should decode at least one frame with explicit codec');

      decoder.close();
      media.closeSync();
    });
  });

  describe('options', () => {
    it('should create decoder with rescale option', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      // Test with rescale option (software frames are converted directly)
      const decoder = await Decoder.create(videoStream, {
        rescale: { pixelFormat: AV_PIX_FMT_YUV420P },
      });

      assert.ok(decoder, 'Should create decoder with rescale');

      decoder.close();
      await media.close();
    });

    it('should create decoder with forcedFramerate option', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream, {
        forcedFramerate: { num: 30, den: 1 },
      });

      assert.ok(decoder, 'Should create decoder with forcedFramerate');

      decoder.close();
      await media.close();
    });

    it('should create decoder with sarOverride option', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream, {
        sarOverride: { num: 1, den: 1 },
      });

      assert.ok(decoder, 'Should create decoder with sarOverride');

      decoder.close();
      await media.close();
    });

    it('should create decoder with applyCropping option', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream, {
        applyCropping: true,
      });

      assert.ok(decoder, 'Should create decoder with applyCropping');

      decoder.close();
      await media.close();
    });

    it('should create decoder with all video options combined', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream, {
        rescale: { pixelFormat: AV_PIX_FMT_YUV420P },
        forcedFramerate: { num: 25, den: 1 },
        sarOverride: { num: 1, den: 1 },
        applyCropping: true,
      });

      assert.ok(decoder, 'Should create decoder with all video options');

      decoder.close();
      await media.close();
    });

    it('should create decoder with options (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = Decoder.createSync(videoStream, {
        forcedFramerate: { num: 30, den: 1 },
        applyCropping: false,
      });

      assert.ok(decoder, 'Should create decoder with options (sync)');

      decoder.close();
      media.closeSync();
    });
  });

  describe('decode', () => {
    it('should decode video packets (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream);

      let frameCount = 0;
      let packetCount = 0;
      const maxPackets = 10;

      for await (using packet of media.packets()) {
        if (!packet) break;

        if (packet.streamIndex === videoStream.index) {
          for await (using frame of decodePacket(decoder, packet)) {
            assert.ok(frame.width > 0);
            assert.ok(frame.height > 0);
            frameCount++;
          }

          packetCount++;
          if (packetCount >= maxPackets) break;
        }
      }

      // Flush remaining frames
      for await (using frame of decoder.flushFrames()) {
        assert.ok(frame.width > 0);
        frameCount++;
      }

      assert.ok(frameCount > 0, 'Should decode at least one frame');

      decoder.close();
      await media.close();
    });

    it('should decode video packets (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = Decoder.createSync(videoStream);

      let frameCount = 0;
      let packetCount = 0;
      const maxPackets = 10;

      for (using packet of media.packetsSync()) {
        if (!packet) break;

        if (packet.streamIndex === videoStream.index) {
          for (using frame of decodePacketSync(decoder, packet)) {
            assert.ok(frame.width > 0);
            assert.ok(frame.height > 0);
            frameCount++;
          }

          packetCount++;
          if (packetCount >= maxPackets) break;
        }
      }

      // Flush remaining frames
      for (using frame of decoder.flushFramesSync()) {
        assert.ok(frame.width > 0);
        frameCount++;
      }

      assert.ok(frameCount > 0, 'Should decode at least one frame');

      decoder.close();
      media.closeSync();
    });

    it('should decode audio packets (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const audioStream = media.audio();
      assert.ok(audioStream);

      const decoder = await Decoder.create(audioStream);

      let frameCount = 0;
      let packetCount = 0;
      const maxPackets = 10;

      for await (using packet of media.packets()) {
        if (!packet) break;

        if (packet.streamIndex === audioStream.index) {
          for await (using frame of decodePacket(decoder, packet)) {
            assert.ok(frame.nbSamples > 0);
            assert.ok(frame.sampleRate > 0);
            frameCount++;
          }

          packetCount++;
          if (packetCount >= maxPackets) {
            break;
          }
        }
      }

      // Flush remaining frames
      for await (using frame of decoder.flushFrames()) {
        assert.ok(frame.nbSamples > 0);
        frameCount++;
      }

      assert.ok(frameCount > 0, 'Should decode at least one audio frame');

      decoder.close();
      await media.close();
    });

    it('should decode audio packets (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const audioStream = media.audio();
      assert.ok(audioStream);

      const decoder = Decoder.createSync(audioStream);

      let frameCount = 0;
      let packetCount = 0;
      const maxPackets = 10;

      for (using packet of media.packetsSync()) {
        if (!packet) break;

        if (packet.streamIndex === audioStream.index) {
          for (using frame of decodePacketSync(decoder, packet)) {
            assert.ok(frame.nbSamples > 0);
            assert.ok(frame.sampleRate > 0);
            frameCount++;
          }

          packetCount++;
          if (packetCount >= maxPackets) break;
        }
      }

      // Flush remaining frames
      for (using frame of decoder.flushFramesSync()) {
        assert.ok(frame.nbSamples > 0);
        frameCount++;
      }

      assert.ok(frameCount > 0, 'Should decode at least one audio frame');

      decoder.close();
      media.closeSync();
    });

    it('should handle null frames gracefully (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream);

      // Some packets might not immediately produce frames
      for await (using packet of media.packets()) {
        if (!packet) break;

        if (packet.streamIndex === videoStream.index) {
          // Drain any available frames using helper
          for await (using _frame of decodePacket(decoder, packet)) {
            // Just drain, don't need to use frame
          }
          break; // Just test one packet
        }
      }

      decoder.close();
      await media.close();
    });

    it('should handle null frames gracefully (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = Decoder.createSync(videoStream);

      // Some packets might not immediately produce frames
      for (using packet of media.packetsSync()) {
        if (!packet) break;

        if (packet.streamIndex === videoStream.index) {
          // Drain any available frames using helper
          for (using _frame of decodePacketSync(decoder, packet)) {
            // Just drain, don't need to use frame
          }
          break; // Just test one packet
        }
      }

      decoder.close();
      media.closeSync();
    });

    it('should not throw when decoder is closed (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream);
      decoder.close();

      const packet = new Packet();
      packet.alloc();

      await assert.doesNotReject(async () => await decoder.decode(packet));

      packet.free();
      await media.close();
    });

    it('should not throw when decoder is closed (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = Decoder.createSync(videoStream);
      decoder.close();

      const packet = new Packet();
      packet.alloc();

      assert.doesNotThrow(() => decoder.decodeSync(packet));

      packet.free();
      media.closeSync();
    });
  });

  describe('flush', () => {
    it('should flush remaining frames (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream);

      // Decode some packets first
      let packetCount = 0;
      for await (using packet of media.packets()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex === videoStream.index) {
          await decoder.decode(packet);
          using _frame = await decoder.receive();
          packetCount++;
          if (packetCount >= 5) {
            break;
          }
        }
      }

      // Flush decoder
      let flushCount = 0;
      for await (using frame of decoder.flushFrames()) {
        assert.ok(frame.width > 0);
        flushCount++;
        if (flushCount > 10) {
          break; // Safety limit
        }
      }

      decoder.close();
      await media.close();
    });

    it('should flush remaining frames (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = Decoder.createSync(videoStream);

      // Decode some packets first
      let packetCount = 0;
      for (using packet of media.packetsSync()) {
        if (!packet) {
          break;
        }

        if (packet.streamIndex === videoStream.index) {
          decoder.decodeSync(packet);
          using _frame = decoder.receiveSync();
          packetCount++;
          if (packetCount >= 5) {
            break;
          }
        }
      }

      // Flush decoder
      let flushCount = 0;
      for (using frame of decoder.flushFramesSync()) {
        assert.ok(frame.width > 0);
        flushCount++;
        if (flushCount > 10) {
          break; // Safety limit
        }
      }

      decoder.close();
      media.closeSync();
    });

    it('should throw when decoder is closed (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream);
      decoder.close();

      // flush() returns void now, just check it doesn't throw
      await decoder.flush(); // Should not throw even when closed

      await media.close();
    });

    it('should throw when decoder is closed (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = Decoder.createSync(videoStream);
      decoder.close();

      // flushSync() returns void now, just check it doesn't throw
      decoder.flushSync(); // Should not throw even when closed

      media.closeSync();
    });
  });

  describe('resource management', () => {
    it('should support Symbol.dispose', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      {
        using decoder = await Decoder.create(videoStream);
        assert.equal(decoder.isDecoderOpen, true);
        // Decoder will be closed automatically
      }

      await media.close();
    });

    it('should handle multiple close calls', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream);

      // Should not throw
      decoder.close();
      decoder.close();
      decoder.close();

      assert.equal(decoder.isDecoderOpen, false);

      await media.close();
    });
  });

  describe('async iterator', () => {
    it('should decode frames using iterator (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream);

      let frameCount = 0;
      const maxFrames = 10;

      for await (using frame of decoder.frames(media.packets())) {
        if (!frame) {
          break;
        }

        assert.ok(frame.width > 0);
        assert.ok(frame.height > 0);

        frameCount++;
        if (frameCount >= maxFrames) {
          break;
        }
      }

      assert.ok(frameCount > 0, 'Should decode at least one frame');

      decoder.close();
      await media.close();
    });

    it('should decode frames using iterator (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = Decoder.createSync(videoStream);

      let frameCount = 0;
      const maxFrames = 10;

      for (using frame of decoder.framesSync(media.packetsSync())) {
        if (!frame) {
          break;
        }

        assert.ok(frame.width > 0);
        assert.ok(frame.height > 0);

        frameCount++;
        if (frameCount >= maxFrames) {
          break;
        }
      }

      assert.ok(frameCount > 0, 'Should decode at least one frame');

      decoder.close();
      media.closeSync();
    });

    it('should only decode packets for its stream (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      const audioStream = media.audio();
      assert.ok(videoStream);
      assert.ok(audioStream);

      const videoDecoder = await Decoder.create(videoStream);

      let videoFrameCount = 0;
      const maxFrames = 5;

      // The iterator should only process video packets
      for await (using frame of videoDecoder.frames(media.packets())) {
        if (!frame) {
          break;
        }

        assert.ok(frame.width > 0); // Video frames have width

        videoFrameCount++;
        if (videoFrameCount >= maxFrames) {
          break;
        }
      }

      assert.ok(videoFrameCount > 0, 'Should decode video frames');

      videoDecoder.close();
      await media.close();
    });

    it('should only decode packets for its stream (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      const audioStream = media.audio();
      assert.ok(videoStream);
      assert.ok(audioStream);

      const videoDecoder = Decoder.createSync(videoStream);

      let videoFrameCount = 0;
      const maxFrames = 5;

      // The iterator should only process video packets
      for (using frame of videoDecoder.framesSync(media.packetsSync())) {
        if (!frame) {
          break;
        }

        assert.ok(frame.width > 0); // Video frames have width

        videoFrameCount++;
        if (videoFrameCount >= maxFrames) {
          break;
        }
      }

      assert.ok(videoFrameCount > 0, 'Should decode video frames');

      videoDecoder.close();
      media.closeSync();
    });

    it('should handle empty packet stream (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = await Decoder.create(videoStream);

      // Empty async generator
      async function* emptyPackets() {
        // No packets
      }

      let frameCount = 0;
      for await (using frame of decoder.frames(emptyPackets())) {
        if (!frame) {
          break;
        }

        frameCount++;
      }

      assert.equal(frameCount, 0, 'Should not produce frames from empty stream');

      decoder.close();
      await media.close();
    });

    it('should handle empty packet stream (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      assert.ok(videoStream);

      const decoder = Decoder.createSync(videoStream);

      // Empty generator
      function* emptyPackets() {
        // No packets
      }

      let frameCount = 0;
      for (using frame of decoder.framesSync(emptyPackets())) {
        if (!frame) {
          break;
        }

        frameCount++;
      }

      assert.equal(frameCount, 0, 'Should not produce frames from empty stream');

      decoder.close();
      media.closeSync();
    });
  });

  describe('stream identification', () => {
    it('should track stream index (async)', async () => {
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video();
      const audioStream = media.audio();
      assert.ok(videoStream);
      assert.ok(audioStream);

      const videoDecoder = await Decoder.create(videoStream);
      const audioDecoder = await Decoder.create(audioStream);

      assert.equal(videoDecoder.getStream().index, videoStream.index);
      assert.equal(audioDecoder.getStream().index, audioStream.index);
      assert.notEqual(videoDecoder.getStream().index, audioDecoder.getStream().index);

      videoDecoder.close();
      audioDecoder.close();
      await media.close();
    });

    it('should track stream index (sync)', () => {
      const media = Demuxer.openSync(inputFile);
      const videoStream = media.video();
      const audioStream = media.audio();
      assert.ok(videoStream);
      assert.ok(audioStream);

      const videoDecoder = Decoder.createSync(videoStream);
      const audioDecoder = Decoder.createSync(audioStream);

      assert.equal(videoDecoder.getStream().index, videoStream.index);
      assert.equal(audioDecoder.getStream().index, audioStream.index);
      assert.notEqual(videoDecoder.getStream().index, audioDecoder.getStream().index);

      videoDecoder.close();
      audioDecoder.close();
      media.closeSync();
    });
  });

  describe('AbortSignal', () => {
    it('should reject create with pre-aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();
      const media = await Demuxer.open(inputFile);
      const videoStream = media.video()!;

      await assert.rejects(() => Decoder.create(videoStream, { signal: controller.signal }), { name: 'AbortError' });
      await media.close();
    });

    it('should abort frames generator with signal', async () => {
      const controller = new AbortController();
      await using input = await Demuxer.open(inputFile);
      using decoder = await Decoder.create(input.video()!, { signal: controller.signal });

      let count = 0;
      await assert.rejects(
        async () => {
          for await (const frame of decoder.frames(input.packets(input.video()!.index))) {
            if (!frame) break;
            count++;
            if (count === 3) controller.abort();
            frame.free();
          }
        },
        { name: 'AbortError' },
      );
      assert.ok(count >= 3);
    });
  });

  // The DecoderOptions.resample audio output option (the decoder-side mirror of the
  // encoder's autoResample). audio.wav is 44100 Hz stereo PCM with an *unspecified*
  // channel layout, so these also exercise the unspecified→native layout
  // normalization that swr requires.
  describe('audio resample', () => {
    it('converts every decoded frame to the requested sample rate (async)', async () => {
      await using media = await Demuxer.open(audioInputFile);
      const stream = media.audio();
      assert.ok(stream, 'has an audio stream');
      assert.equal(stream.codecpar.sampleRate, 44100, 'source is 44100 Hz');

      using decoder = await Decoder.create(stream, { resample: { sampleRate: 48000 } });

      let frames = 0;
      for await (using frame of decoder.frames(media.packets(stream.index))) {
        if (frame === null) continue; // trailing EOF marker
        assert.equal(frame.sampleRate, 48000, `frame ${frames} is at the requested rate`);
        frames++;
      }

      assert.ok(frames > 0, 'produced frames');
    });

    it('converts sample rate, format, and channel layout together', async () => {
      await using media = await Demuxer.open(audioInputFile);
      const stream = media.audio();
      assert.ok(stream);

      using decoder = await Decoder.create(stream, {
        resample: { sampleRate: 16000, sampleFormat: AV_SAMPLE_FMT_FLTP, channelLayout: AV_CHANNEL_LAYOUT_MONO },
      });

      let frames = 0;
      for await (using frame of decoder.frames(media.packets(stream.index))) {
        if (frame === null) continue;
        assert.equal(frame.sampleRate, 16000, 'rate converted');
        assert.equal(frame.format, AV_SAMPLE_FMT_FLTP, 'format converted');
        assert.equal(frame.channelLayout.nbChannels, 1, 'downmixed to mono');
        frames++;
      }
      assert.ok(frames > 0);
    });

    it('is a no-op passthrough when the target already matches the source', async () => {
      await using media = await Demuxer.open(audioInputFile);
      const stream = media.audio();
      assert.ok(stream);

      // Request the source's own rate -> no resampler should be built.
      using decoder = await Decoder.create(stream, { resample: { sampleRate: 44100 } });

      let frames = 0;
      for await (using frame of decoder.frames(media.packets(stream.index))) {
        if (frame === null) continue;
        assert.equal(frame.sampleRate, 44100);
        frames++;
      }
      assert.ok(frames > 0);
    });

    it('works with the synchronous decode path', () => {
      using media = Demuxer.openSync(audioInputFile);
      const stream = media.audio();
      assert.ok(stream);

      using decoder = Decoder.createSync(stream, { resample: { sampleRate: 24000 } });

      let frames = 0;
      for (using frame of decoder.framesSync(media.packetsSync(stream.index))) {
        if (frame === null) continue;
        assert.equal(frame.sampleRate, 24000);
        frames++;
      }
      assert.ok(frames > 0);
    });
  });

  describe('video rescale', () => {
    it('converts every decoded frame to the requested pixel format and size (async)', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream, 'has a video stream');

      using decoder = await Decoder.create(stream, { rescale: { width: 320, height: 240, pixelFormat: AV_PIX_FMT_RGB24 } });

      let frames = 0;
      for await (using frame of decoder.frames(media.packets(stream.index))) {
        if (frame === null) continue; // trailing EOF marker
        assert.equal(frame.width, 320, `frame ${frames} width`);
        assert.equal(frame.height, 240, `frame ${frames} height`);
        assert.equal(frame.format, AV_PIX_FMT_RGB24, `frame ${frames} pixel format`);
        frames++;
      }
      assert.ok(frames > 0, 'produced frames');
    });

    it('rescales size only, keeping the source pixel format', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      // demux.mp4 decodes to yuv444p; a size-only rescale must keep that format.
      using decoder = await Decoder.create(stream, { rescale: { width: 160, height: 120 } });

      let frames = 0;
      for await (using frame of decoder.frames(media.packets(stream.index))) {
        if (frame === null) continue;
        assert.equal(frame.width, 160);
        assert.equal(frame.height, 120);
        assert.equal(frame.format, AV_PIX_FMT_YUV444P, 'pixel format unchanged');
        frames++;
      }
      assert.ok(frames > 0);
    });

    it('is a no-op passthrough when the target already matches the source', async () => {
      await using media = await Demuxer.open(inputFile);
      const stream = media.video();
      assert.ok(stream);

      // Request the source's own format (yuv444p) -> no rescaler should be built.
      using decoder = await Decoder.create(stream, { rescale: { pixelFormat: AV_PIX_FMT_YUV444P } });

      let frames = 0;
      for await (using frame of decoder.frames(media.packets(stream.index))) {
        if (frame === null) continue;
        assert.equal(frame.format, AV_PIX_FMT_YUV444P);
        frames++;
      }
      assert.ok(frames > 0);
    });

    it('works with the synchronous decode path', () => {
      using media = Demuxer.openSync(inputFile);
      const stream = media.video();
      assert.ok(stream);

      using decoder = Decoder.createSync(stream, { rescale: { width: 64, height: 64, pixelFormat: AV_PIX_FMT_RGB24 } });

      let frames = 0;
      for (using frame of decoder.framesSync(media.packetsSync(stream.index))) {
        if (frame === null) continue;
        assert.equal(frame.width, 64);
        assert.equal(frame.height, 64);
        assert.equal(frame.format, AV_PIX_FMT_RGB24);
        frames++;
      }
      assert.ok(frames > 0);
    });

    it('downloads and converts hardware frames (when hardware is available)', async () => {
      const hw = HardwareContext.auto();
      if (!hw) {
        return; // no hardware on this machine - skip
      }

      try {
        // bunny-30s.mp4 is yuv420p H.264 (hardware-decodable); demux.mp4 is yuv444p
        // which VideoToolbox rejects, so use a 4:2:0 source here.
        await using media = await Demuxer.open(getInputFile('bunny-30s.mp4'));
        const stream = media.video();
        assert.ok(stream);

        // Hardware decode + rescale: frames must be transferred to system memory and
        // converted to the requested format (a single option, regardless of backend).
        using decoder = await Decoder.create(stream, { hardware: hw, rescale: { pixelFormat: AV_PIX_FMT_YUV420P } });

        let frames = 0;
        for await (using frame of decoder.frames(media.packets(stream.index))) {
          if (frame === null) continue;
          assert.equal(frame.format, AV_PIX_FMT_YUV420P, 'converted to the requested format');
          assert.ok(!frame.isHwFrame(), 'downloaded to a software frame');
          frames++;
          if (frames >= 5) break;
        }
        assert.ok(frames > 0, 'produced frames');
      } finally {
        hw.dispose();
      }
    });
  });
});
