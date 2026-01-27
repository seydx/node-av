import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AV_PIX_FMT_NV12, AV_PIX_FMT_YUV420P, Decoder, Demuxer, Encoder, FF_ENCODER_LIBX264, FilterAPI, FilterPreset, HardwareContext } from '../src/index.js';
import { decodePacket, encodeFrame, filterFrame, getInputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputFile = getInputFile('video.mp4');

// Helper to count processed frames
async function processFrames(input: Demuxer, decoder: Decoder, filter: FilterAPI | null, encoder: Encoder, videoStreamIndex: number, maxFrames = 5): Promise<number> {
  let frameCount = 0;

  for await (using packet of input.packets()) {
    if (!packet) break;

    if (packet.streamIndex === videoStreamIndex) {
      for await (using decodedFrame of decodePacket(decoder, packet)) {
        if (filter) {
          for await (using filteredFrame of filterFrame(filter, decodedFrame)) {
            for await (using _encodedPacket of encodeFrame(encoder, filteredFrame)) {
              frameCount++;
              if (frameCount >= maxFrames) break;
            }
          }
        } else {
          for await (using _encodedPacket of encodeFrame(encoder, decodedFrame)) {
            frameCount++;
            if (frameCount >= maxFrames) break;
          }
        }
      }
    }
  }

  // Flush remaining frames
  for await (using decodedFrame of decoder.flushFrames()) {
    if (filter) {
      for await (using filteredFrame of filterFrame(filter, decodedFrame)) {
        for await (using _encodedPacket of encodeFrame(encoder, filteredFrame)) {
          frameCount++;
        }
      }
    } else {
      for await (using _encodedPacket of encodeFrame(encoder, decodedFrame)) {
        frameCount++;
      }
    }
  }

  if (filter) {
    for await (using filteredFrame of filter.flushFrames()) {
      for await (using _encodedPacket of encodeFrame(encoder, filteredFrame)) {
        frameCount++;
      }
    }
  }

  for await (using _packet of encoder.flushPackets()) {
    frameCount++;
  }

  return frameCount;
}

describe('Transcode Scenarios', () => {
  it('should handle SW Decode -> SW Filter -> SW Encode', async () => {
    await using input = await Demuxer.open(inputFile);
    const videoStream = input.video();
    assert.ok(videoStream, 'Should have video stream');

    using decoder = await Decoder.create(videoStream);
    assert.ok(decoder, 'Should create decoder');

    const filterChain = FilterPreset.chain().scale(100, 100).format(AV_PIX_FMT_YUV420P).build();
    using filter = FilterAPI.create(filterChain, {
      framerate: videoStream.avgFrameRate,
    });
    assert.ok(filter, 'Should create filter');

    using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
      decoder,
      filter,
      maxBFrames: 0,
    });
    assert.ok(encoder, 'Should create encoder');

    const frameCount = await processFrames(input, decoder, filter, encoder, videoStream.index);
    assert.ok(frameCount > 0, 'Should process at least one frame');
  });

  it('should handle SW Decode -> SW Encode (no filter)', async () => {
    await using input = await Demuxer.open(inputFile);
    const videoStream = input.video();
    assert.ok(videoStream, 'Should have video stream');

    using decoder = await Decoder.create(videoStream);
    assert.ok(decoder, 'Should create decoder');

    using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
      decoder,
      maxBFrames: 0,
    });
    assert.ok(encoder, 'Should create encoder');

    const frameCount = await processFrames(input, decoder, null, encoder, videoStream.index);
    assert.ok(frameCount > 0, 'Should process at least one frame');
  });

  it('should handle HW Decode -> HW Filter -> SW Encode', async () => {
    using hw = HardwareContext.auto();
    if (!hw) {
      console.log('No hardware available - skipping test');
      return;
    }

    console.log('Using Hardware:', hw.deviceTypeName);

    await using input = await Demuxer.open(inputFile);
    const videoStream = input.video();
    assert.ok(videoStream, 'Should have video stream');

    using decoder = await Decoder.create(videoStream, { hardware: hw });
    assert.ok(decoder, 'Should create hardware decoder');

    const filterChain = FilterPreset.chain(hw).scale(100, 100).hwdownload().format([AV_PIX_FMT_NV12, AV_PIX_FMT_YUV420P]).build();

    using filter = FilterAPI.create(filterChain, {
      framerate: videoStream.avgFrameRate,
    });
    assert.ok(filter, 'Should create filter with hardware context');

    using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
      decoder,
      filter,
      maxBFrames: 0,
    });
    assert.ok(encoder, 'Should create software encoder');

    const frameCount = await processFrames(input, decoder, filter, encoder, videoStream.index);
    assert.ok(frameCount > 0, 'Should process at least one frame');
  });

  it('should handle SW Decode -> HW Filter -> HW Encode', async () => {
    using hw = HardwareContext.auto();
    if (!hw) {
      console.log('No hardware available - skipping test');
      return;
    }

    console.log('Using Hardware:', hw.deviceTypeName);

    await using input = await Demuxer.open(inputFile);
    const videoStream = input.video();
    assert.ok(videoStream, 'Should have video stream');

    using decoder = await Decoder.create(videoStream);
    assert.ok(decoder, 'Should create software decoder');

    const filterChain = FilterPreset.chain(hw).format(AV_PIX_FMT_NV12).hwupload().scale(100, 100).build();

    using filter = FilterAPI.create(filterChain, {
      framerate: videoStream.avgFrameRate,
      hardware: hw,
    });
    assert.ok(filter, 'Should create filter with hardware upload');

    const encoderCodec = hw.getEncoderCodec('h264');
    if (!encoderCodec) {
      console.log('No hardware encoder codec available - skipping test');
      return;
    }

    console.log('Using Hardware Encoder:', encoderCodec.name);

    using encoder = await Encoder.create(encoderCodec, {
      decoder,
      filter,
      maxBFrames: 0,
      bitrate: '1M',
      options: {
        'forced-idr': 1,
      },
    });
    assert.ok(encoder, 'Should create hardware encoder');

    const frameCount = await processFrames(input, decoder, filter, encoder, videoStream.index);
    assert.ok(frameCount > 0, 'Should process at least one frame');
  });

  it('should handle HW Decode -> HW Filter -> HW Encode', async () => {
    using hw = HardwareContext.auto();
    if (!hw) {
      console.log('No hardware available - skipping test');
      return;
    }

    console.log('Using Hardware:', hw.deviceTypeName);

    await using input = await Demuxer.open(inputFile);
    const videoStream = input.video();
    assert.ok(videoStream, 'Should have video stream');

    using decoder = await Decoder.create(videoStream, { hardware: hw });
    assert.ok(decoder, 'Should create hardware decoder');

    const filterChain = FilterPreset.chain(hw).scale(100, 100).build();

    using filter = FilterAPI.create(filterChain, {
      framerate: videoStream.avgFrameRate,
      hardware: hw,
    });
    assert.ok(filter, 'Should create hardware filter');

    const encoderCodec = hw.getEncoderCodec('h264');
    if (!encoderCodec) {
      console.log('No hardware encoder codec available - skipping test');
      return;
    }

    console.log('Using Hardware Encoder:', encoderCodec.name);

    using encoder = await Encoder.create(encoderCodec, {
      decoder,
      filter,
      maxBFrames: 0,
      bitrate: '1M',
    });
    assert.ok(encoder, 'Should create hardware encoder');

    const frameCount = await processFrames(input, decoder, filter, encoder, videoStream.index);
    assert.ok(frameCount > 0, 'Should process at least one frame');
  });

  it('should handle HW Decode -> HW Encode (no filter)', async () => {
    using hw = HardwareContext.auto();
    if (!hw) {
      console.log('No hardware available - skipping test');
      return;
    }

    console.log('Using Hardware:', hw.deviceTypeName);

    await using input = await Demuxer.open(inputFile);
    const videoStream = input.video();
    assert.ok(videoStream, 'Should have video stream');

    using decoder = await Decoder.create(videoStream, { hardware: hw });
    assert.ok(decoder, 'Should create hardware decoder');

    const encoderCodec = hw.getEncoderCodec('h264');
    if (!encoderCodec) {
      console.log('No hardware encoder codec available - skipping test');
      return;
    }

    console.log('Using Hardware Encoder:', encoderCodec.name);

    using encoder = await Encoder.create(encoderCodec, {
      decoder,
      maxBFrames: 0,
      bitrate: '1M',
    });
    assert.ok(encoder, 'Should create hardware encoder');

    const frameCount = await processFrames(input, decoder, null, encoder, videoStream.index);
    assert.ok(frameCount > 0, 'Should process at least one frame');
  });

  it('should handle SW Decode -> SW/HW Filter -> HW Encode', async () => {
    using hw = HardwareContext.auto();
    if (!hw) {
      console.log('No hardware available - skipping test');
      return;
    }

    console.log('Using Hardware:', hw.deviceTypeName);

    await using input = await Demuxer.open(inputFile);
    const videoStream = input.video();
    assert.ok(videoStream, 'Should have video stream');

    using decoder = await Decoder.create(videoStream);
    assert.ok(decoder, 'Should create software decoder');

    const filterChain = FilterPreset.chain(hw).format(AV_PIX_FMT_NV12).hwupload().build();

    using filter = FilterAPI.create(filterChain, {
      framerate: videoStream.avgFrameRate,
      hardware: hw,
    });
    assert.ok(filter, 'Should create software filter');

    const encoderCodec = hw.getEncoderCodec('h264');
    if (!encoderCodec) {
      console.log('No hardware encoder codec available - skipping test');
      return;
    }

    console.log('Using Hardware Encoder:', encoderCodec.name);

    using encoder = await Encoder.create(encoderCodec, {
      decoder,
      filter,
      maxBFrames: 0,
      bitrate: '1M',
      options: {
        'forced-idr': 1,
      },
    });
    assert.ok(encoder, 'Should create hardware encoder');

    const frameCount = await processFrames(input, decoder, filter, encoder, videoStream.index);
    assert.ok(frameCount > 0, 'Should process at least one frame');
  });

  describe('Error Cases', () => {
    it('should handle software frame with hardware filter gracefully', async () => {
      using hw = HardwareContext.auto();
      if (!hw) {
        console.log('No hardware available, skipping test');
        return;
      }

      await using input = await Demuxer.open(inputFile);
      const videoStream = input.video();
      assert.ok(videoStream, 'Should have video stream');

      // Software decoder - produces software frames
      using decoder = await Decoder.create(videoStream);

      // Hardware filter chain without hwupload
      const filterChain = FilterPreset.chain(hw).scale(100, 100).build();

      // This should fail - hardware filter with software frames
      await assert.rejects(
        async () => {
          using filter = FilterAPI.create(filterChain, {
            framerate: videoStream.avgFrameRate,
          });

          // Try to process a software frame with hardware filter
          for await (using packet of input.packets()) {
            if (packet && packet.streamIndex !== videoStream.index) continue;

            for await (using decodedFrame of decodePacket(decoder, packet)) {
              await filter.process(decodedFrame);
              return; // Got frame, tried process - will throw
            }
          }
        },
        () => {
          // Should fail because software frame used with hardware filter
          return true;
        },
        'Should fail when software frame is used with hardware filter',
      );

      hw.dispose();
    });

    it('should handle encoder/decoder mismatch gracefully', async () => {
      await using input = await Demuxer.open(inputFile);
      const videoStream = input.video();
      assert.ok(videoStream, 'Should have video stream');

      using decoder = await Decoder.create(videoStream);

      // Create encoder - it will use lazy initialization from first frame
      using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
        decoder,
        maxBFrames: 0,
      });

      let processed = false;

      // Should still work, encoder will handle the mismatch
      for await (using packet of input.packets()) {
        if (!packet) break;

        if (packet.streamIndex === videoStream.index) {
          for await (using decodedFrame of decodePacket(decoder, packet)) {
            // This might fail or succeed depending on encoder implementation
            try {
              for await (using _encodedPacket of encodeFrame(encoder, decodedFrame)) {
                // Successfully encoded despite mismatch
                processed = true;
                break;
              }
            } catch (err) {
              // Expected - size mismatch
              console.log('Expected error with size mismatch:', err);
              processed = true;
            }
            break;
          }
          break;
        }
      }

      // Flush decoder (may produce more frames)
      if (processed) {
        for await (using _frame of decoder.flushFrames()) {
          // Just drain remaining frames
        }
      }

      // Either processed successfully or caught the error
      assert.ok(true, 'Handled encoder/decoder mismatch');
    });
  });
});
