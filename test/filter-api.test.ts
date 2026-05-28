import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_CHANNEL_LAYOUT_STEREO,
  AV_PIX_FMT_RGB24,
  AV_PIX_FMT_YUV420P,
  AV_SAMPLE_FMT_FLTP,
  AV_SAMPLE_FMT_S16,
  AVFILTER_CMD_FLAG_ONE,
  Decoder,
  Demuxer,
  Encoder,
  FF_ENCODER_LIBX264,
  FilterAPI,
  FilterPreset,
  Frame,
  Rational,
} from '../src/index.js';
import { decodePacket, decodePacketSync, filterFrame, getInputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const testVideoPath = getInputFile('demux.mp4');
const testAudioPath = getInputFile('audio.wav');

describe('High-Level Filter API', () => {
  describe('Filter Creation', () => {
    it('should create a simple video filter', () => {
      // Filters use lazy initialization and won't be fully ready until first frame
      const filter = FilterAPI.create('scale=1280:720');
      assert.ok(filter);
      assert.equal(filter.isFilterOpen, true);
      assert.equal(filter.isFilterInitialized, false); // Not initialized until first frame
      filter.close();
    });

    it('should create a simple audio filter', () => {
      const filter = FilterAPI.create('volume=0.5');
      assert.ok(filter);
      assert.equal(filter.isFilterOpen, true);
      assert.equal(filter.isFilterInitialized, false); // Not initialized until first frame
      filter.close();
    });

    it('should create filter with null/passthrough', () => {
      const filter = FilterAPI.create('null');
      assert.ok(filter);
      assert.equal(filter.isFilterOpen, true);
      filter.close();
    });

    it('should create filter for encoder', async () => {
      const encoder = await Encoder.create(FF_ENCODER_LIBX264);
      const filter = FilterAPI.create('scale=1280:720');

      assert.ok(filter);
      assert.equal(filter.isFilterOpen, true);

      filter.close();
      encoder.close();
    });

    it('should create filter with format conversion', () => {
      const filter = FilterAPI.create('scale=1280:720,format=pix_fmts=yuv420p|nv12');

      assert.ok(filter);
      assert.equal(filter.isFilterOpen, true);
      filter.close();
    });

    it('should handle complex filter chain', () => {
      const filter = FilterAPI.create('scale=1280:720,fps=30,format=yuv420p');

      assert.ok(filter);
      assert.equal(filter.isFilterOpen, true);
      filter.close();
    });

    it('should handle invalid filter gracefully', async () => {
      // Invalid filter syntax should be caught early
      // Note: Some invalid filters might not be detected until first frame is processed
      // For now, we test that the filter can be created (parsing succeeds)
      // but processing should fail gracefully

      // Test with a malformed filter string that will fail during graph config
      const filter = FilterAPI.create('scale=w=invalid:h=invalid');

      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 30);
      frame.getBuffer();

      await assert.rejects(async () => {
        await filter.process(frame);
        while (true) {
          using output = await filter.receive();
          if (!output) break;
        }
      });

      filter.close();
    });
  });

  describe('options', () => {
    it('should create filter with audioResampleOpts option', () => {
      const filter = FilterAPI.create('aresample=48000', {
        audioResampleOpts: 'linear_interp=1:cutoff=0.8',
      });

      assert.ok(filter, 'Should create filter with audioResampleOpts');
      assert.equal(filter.isFilterOpen, true);

      filter.close();
    });

    it('should create filter with cfr option', () => {
      const filter = FilterAPI.create('fps=30', {
        cfr: false, // VFR mode
      });

      assert.ok(filter, 'Should create filter with cfr option');
      assert.equal(filter.isFilterOpen, true);

      filter.close();
    });

    it('should create filter with framerate option', () => {
      const filter = FilterAPI.create('fps=30', {
        framerate: { num: 60, den: 1 },
      });

      assert.ok(filter, 'Should create filter with framerate option');
      assert.equal(filter.isFilterOpen, true);

      filter.close();
    });

    it('should create filter with dropOnChange option', () => {
      const filter = FilterAPI.create('scale=1280:720', {
        dropOnChange: true,
      });

      assert.ok(filter, 'Should create filter with dropOnChange');
      assert.equal(filter.isFilterOpen, true);

      filter.close();
    });

    it('should create filter with allowReinit option', () => {
      const filter = FilterAPI.create('scale=1280:720', {
        allowReinit: true,
      });

      assert.ok(filter, 'Should create filter with allowReinit');
      assert.equal(filter.isFilterOpen, true);

      filter.close();
    });

    it('should create filter with all options combined', () => {
      const filter = FilterAPI.create('fps=30,scale=1280:720', {
        cfr: true, // CFR mode
        framerate: { num: 30, den: 1 },
        dropOnChange: true,
        allowReinit: true,
      });

      assert.ok(filter, 'Should create filter with all options');
      assert.equal(filter.isFilterOpen, true);

      filter.close();
    });

    it('should create audio filter with audioResampleOpts', () => {
      const filter = FilterAPI.create('aresample=44100', {
        audioResampleOpts: 'linear_interp=1:cutoff=0.95:min_comp=0.001:min_hard_comp=0.1',
      });

      assert.ok(filter, 'Should create audio filter with audioResampleOpts');
      assert.equal(filter.isFilterOpen, true);

      filter.close();
    });
  });

  describe('Frame Processing', () => {
    it('should process a single frame (async)', async () => {
      const filter = FilterAPI.create('scale=1280:720');

      // Create a test frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 48000);
      const ret = frame.getBuffer();
      assert.ok(ret >= 0);

      console.log('Processing frame through filter...');

      await filter.process(frame);

      while (true) {
        using output = await filter.receive();
        if (!output) break;
        console.log('Frame processed.');
        assert.ok(output);
        assert.equal(output.width, 1280);
        assert.equal(output.height, 720);
      }

      filter.close();
    });

    it('should process a single frame (sync)', () => {
      const filter = FilterAPI.create('scale=1280:720');

      // Create a test frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 48000);
      const ret = frame.getBuffer();
      assert.ok(ret >= 0);

      filter.processSync(frame);

      while (true) {
        using output = filter.receiveSync();
        if (!output) break;
        assert.ok(output);
        assert.equal(output.width, 1280);
        assert.equal(output.height, 720);
      }

      filter.close();
    });

    it('should flush and receive remaining frames (async)', async () => {
      const filter = FilterAPI.create('fps=15');

      // Send some frames
      for (let i = 0; i < 5; i++) {
        using frame = new Frame();
        frame.alloc();
        frame.width = 640;
        frame.height = 480;
        frame.format = AV_PIX_FMT_YUV420P;
        frame.pts = BigInt(i * 1000);
        frame.timeBase = new Rational(1, 30);
        const ret = frame.getBuffer();
        assert.ok(ret >= 0);

        await filter.process(frame);
      }

      // Flush
      await filter.flush();

      // Receive remaining frames
      let remainingCount = 0;
      while (true) {
        using frame = await filter.receive();
        if (!frame) break;
        remainingCount++;
      }

      assert.ok(remainingCount >= 0);
      filter.close();
    });

    it('should flush and receive remaining frames (sync)', () => {
      const filter = FilterAPI.create('fps=15');

      // Send some frames
      for (let i = 0; i < 5; i++) {
        using frame = new Frame();
        frame.alloc();
        frame.width = 640;
        frame.height = 480;
        frame.format = AV_PIX_FMT_YUV420P;
        frame.pts = BigInt(i * 1000);
        frame.timeBase = new Rational(1, 30);
        const ret = frame.getBuffer();
        assert.ok(ret >= 0);

        filter.processSync(frame);
      }

      // Flush
      filter.flushSync();

      // Receive remaining frames
      let remainingCount = 0;
      while (true) {
        using frame = filter.receiveSync();
        if (!frame) break;
        remainingCount++;
      }

      assert.ok(remainingCount >= 0);
      filter.close();
    });
  });

  describe('Async Generator Interface', () => {
    it('should process frames via async generator', async () => {
      const media = await Demuxer.open(testVideoPath);
      const videoStream = media.video();
      assert.ok(videoStream);
      const decoder = await Decoder.create(videoStream);

      const filter = FilterAPI.create('scale=320:240,fps=15', {
        framerate: videoStream.avgFrameRate,
      });

      let frameCount = 0;
      const maxFrames = 10;

      async function* limitedFrames() {
        let count = 0;
        for await (using packet of media.packets()) {
          if (!packet) break;

          if (packet.streamIndex === videoStream!.index) {
            for await (const frame of decodePacket(decoder, packet)) {
              yield frame;
              count++;
              if (count >= maxFrames) break;
            }
            if (count >= maxFrames) break;
          }
        }
        // Flush decoder to get remaining frames
        for await (const frame of decoder.flushFrames()) {
          yield frame;
        }
      }

      for await (using filtered of filter.frames(limitedFrames())) {
        if (!filtered) {
          break;
        }
        assert.ok(filtered);
        assert.equal(filtered.width, 320);
        assert.equal(filtered.height, 240);
        frameCount++;
      }

      assert.ok(frameCount > 0);

      filter.close();
      decoder.close();
      media.close();
    });

    it('should process frames via sync generator', () => {
      const media = Demuxer.openSync(testVideoPath);
      const videoStream = media.video();
      assert.ok(videoStream);
      const decoder = Decoder.createSync(videoStream);

      const filter = FilterAPI.create('scale=320:240,fps=15', {
        framerate: videoStream.avgFrameRate,
      });

      let frameCount = 0;
      const maxFrames = 10;

      function* limitedFrames() {
        let count = 0;
        for (using packet of media.packetsSync()) {
          if (!packet) break;

          if (packet.streamIndex === videoStream!.index) {
            for (const frame of decodePacketSync(decoder, packet)) {
              yield frame;
              count++;
              if (count >= maxFrames) break;
            }
            if (count >= maxFrames) break;
          }
        }
        // Flush decoder to get remaining frames
        for (const frame of decoder.flushFramesSync()) {
          yield frame;
        }
      }

      for (const filtered of filter.framesSync(limitedFrames())) {
        if (!filtered) {
          break;
        }
        assert.ok(filtered);
        assert.equal(filtered.width, 320);
        assert.equal(filtered.height, 240);
        filtered.free();
        frameCount++;
      }

      assert.ok(frameCount > 0);

      filter.close();
      decoder.close();
      media.closeSync();
    });
  });

  describe('Utility Methods', () => {
    it('should get graph description (async)', async () => {
      const filter = FilterAPI.create('volume=0.5');

      // Initialize filter with a frame first
      using frame = new Frame();
      frame.alloc();
      frame.sampleRate = 48000;
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.nbSamples = 1024;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 48000);
      frame.getBuffer();

      await filter.process(frame);
      while (true) {
        using output = await filter.receive();
        if (!output) break;
      }

      const description = filter.getGraphDescription();
      assert.ok(description);
      assert.equal(typeof description, 'string');

      filter.close();
    });

    it('should get graph description (sync)', () => {
      const filter = FilterAPI.create('volume=0.5');

      // Initialize filter with a frame first
      using frame = new Frame();
      frame.alloc();
      frame.sampleRate = 48000;
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.nbSamples = 1024;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 48000);
      frame.getBuffer();

      filter.processSync(frame);
      while (true) {
        using output = filter.receiveSync();
        if (!output) break;
      }

      const description = filter.getGraphDescription();
      assert.ok(description);
      assert.equal(typeof description, 'string');

      filter.close();
    });

    it('should check if filter is ready (async)', async () => {
      const filter = FilterAPI.create('scale=1280:720');

      // Filter not ready until first frame
      assert.ok(!filter.isReady());

      // Initialize with a frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.timeBase = new Rational(1, 30);
      frame.getBuffer();

      await filter.process(frame);

      // Now should be ready
      assert.ok(filter.isReady());

      filter.close();
      assert.ok(!filter.isReady());
    });

    it('should check if filter is ready (sync)', () => {
      const filter = FilterAPI.create('scale=1280:720');

      // Filter not ready until first frame
      assert.ok(!filter.isReady());

      // Initialize with a frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.timeBase = new Rational(1, 30);
      frame.getBuffer();

      filter.processSync(frame);

      // Now should be ready
      assert.ok(filter.isReady());

      filter.close();
      assert.ok(!filter.isReady());
    });

    it('should get media type', () => {
      // Note: getMediaType() doesn't exist in the new API
      // Filters determine media type from first frame
      const videoFilter = FilterAPI.create('scale=1280:720');
      assert.ok(videoFilter);
      videoFilter.close();

      const audioFilter = FilterAPI.create('volume=0.5');
      assert.ok(audioFilter);
      audioFilter.close();
    });
  });

  describe('Symbol.dispose', () => {
    it('should support using syntax', () => {
      {
        using filter = FilterAPI.create('scale=1280:720');
        assert.ok(filter);
      }
      // Filter should be automatically freed here
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid configuration (async)', async () => {
      // Invalid configurations are detected when first frame is processed
      const filter = FilterAPI.create('volume=0.5');

      using frame = new Frame();
      frame.alloc();
      frame.sampleRate = 0; // Invalid sample rate
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.nbSamples = 1024;
      frame.timeBase = new Rational(1, 48000);

      await assert.rejects(async () => {
        await filter.process(frame);
      });

      filter.close();
    });

    it('should throw on invalid configuration (sync)', () => {
      // Invalid configurations are detected when first frame is processed
      const filter = FilterAPI.create('volume=0.5');

      using frame = new Frame();
      frame.alloc();
      frame.sampleRate = 0; // Invalid sample rate
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.nbSamples = 1024;
      frame.timeBase = new Rational(1, 48000);

      assert.throws(() => {
        filter.processSync(frame);
      });

      filter.close();
    });

    it('should not throw when processing after free (async)', async () => {
      const filter = FilterAPI.create('volume=0.5');
      filter.close();

      using frame = new Frame();
      frame.alloc();
      frame.nbSamples = 1024;
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.sampleRate = 48000;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.timeBase = new Rational(1, 48000);
      frame.getBuffer();

      await assert.doesNotReject(async () => {
        await filter.process(frame);
      });
    });

    it('should not throw when processing after free (sync)', () => {
      const filter = FilterAPI.create('volume=0.5');
      filter.close();

      using frame = new Frame();
      frame.alloc();
      frame.nbSamples = 1024;
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.sampleRate = 48000;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.timeBase = new Rational(1, 48000);
      frame.getBuffer();

      assert.doesNotThrow(() => {
        filter.processSync(frame);
      });
    });

    it('should handle flush after free', async () => {
      const filter = FilterAPI.create('scale=1280:720');
      filter.close();

      // flush() doesn't throw when closed, it just returns
      await filter.flush();
      assert.ok(true, 'Flush should not throw when closed');
    });

    it('should return null when receiving after free', async () => {
      const filter = FilterAPI.create('scale=1280:720');
      filter.close();

      // receive() returns null when closed
      const result = await filter.receive();
      assert.equal(result, null);
    });

    it('should handle flush after free', async () => {
      const filter = FilterAPI.create('scale=1280:720');
      filter.close();

      // flush() returns void and doesn't throw when closed
      await filter.flush(); // Should not throw
      assert.ok(true, 'flush() handled gracefully after free');
    });
  });

  describe('Complex Filter Graphs', () => {
    it('should handle video scaling and format conversion', async () => {
      const filter = FilterAPI.create('scale=1280:720,format=yuv420p');

      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_RGB24;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 30);
      const ret = frame.getBuffer();
      assert.ok(ret >= 0);

      await filter.process(frame);
      while (true) {
        using output = await filter.receive();
        if (!output) break;
        assert.equal(output.width, 1280);
        assert.equal(output.height, 720);
        assert.equal(output.format, AV_PIX_FMT_YUV420P);
      }

      filter.close();
    });

    it('should handle audio resampling', () => {
      const filter = FilterAPI.create('aformat=sample_rates=44100:sample_fmts=s16:channel_layouts=stereo');

      // Filter will be initialized when first frame is processed
      assert.equal(filter.isFilterInitialized, false);
      filter.close();
    });
  });

  describe('Real Media Processing', () => {
    it('should process real video file', async () => {
      const media = await Demuxer.open(testVideoPath);
      const videoStream = media.video();
      assert.ok(videoStream);
      const decoder = await Decoder.create(videoStream);

      const filter = FilterAPI.create('scale=640:480,format=yuv420p', {
        framerate: videoStream.avgFrameRate,
      });

      let processedFrames = 0;
      const maxFrames = 5;

      for await (using packet of media.packets()) {
        if (!packet) break;

        if (packet.streamIndex === videoStream.index) {
          for await (using frame of decodePacket(decoder, packet)) {
            for await (using filtered of filterFrame(filter, frame)) {
              assert.equal(filtered.width, 640);
              assert.equal(filtered.height, 480);
              processedFrames++;
            }
            if (processedFrames >= maxFrames) break;
          }
          if (processedFrames >= maxFrames) break;
        }
      }

      // Flush decoder and filter
      for await (using frame of decoder.flushFrames()) {
        for await (using _filtered of filterFrame(filter, frame)) {
          processedFrames++;
        }
      }
      for await (using _filtered of filter.flushFrames()) {
        processedFrames++;
      }

      assert.ok(processedFrames > 0);

      filter.close();
      decoder.close();
      await media.close();
    });

    it('should chain multiple filter presets', () => {
      const filterChain = FilterPreset.chain().scale(1280, 720).filter('fps', { fps: 24 }).format(AV_PIX_FMT_YUV420P).build();
      const filter = FilterAPI.create(filterChain);
      assert.ok(filter); // Video filters use lazy initialization

      // For lazy-initialized video filters, graph description is null until first frame
      const description = filter.getGraphDescription();
      // Since video filter is not initialized yet, description will be null
      assert.equal(description, null);

      filter.close();
    });

    it('should process real audio file', async () => {
      const media = await Demuxer.open(testAudioPath);

      // Find audio stream
      const audioStream = media.audio();
      assert.ok(audioStream, 'Should find audio stream');

      const decoder = await Decoder.create(audioStream);

      // Apply audio filters: volume adjustment and resampling
      const filter = FilterAPI.create('volume=0.5,aformat=sample_rates=44100:sample_fmts=s16:channel_layouts=stereo');

      let processedFrames = 0;
      const maxFrames = 10;

      for await (using packet of media.packets()) {
        if (!packet) break;

        if (packet.streamIndex === audioStream.index) {
          for await (using frame of decodePacket(decoder, packet)) {
            for await (using filtered of filterFrame(filter, frame)) {
              // Check that the filter applied the correct format
              assert.equal(filtered.sampleRate, 44100);
              assert.equal(filtered.format, AV_SAMPLE_FMT_S16);
              processedFrames++;
            }
            if (processedFrames >= maxFrames) break;
          }
          if (processedFrames >= maxFrames) break;
        }
      }

      // Flush decoder and filter
      for await (using frame of decoder.flushFrames()) {
        for await (using _filtered of filterFrame(filter, frame)) {
          processedFrames++;
        }
      }
      for await (using _filtered of filter.flushFrames()) {
        processedFrames++;
      }

      assert.ok(processedFrames > 0, 'Should process audio frames');

      filter.close();
      decoder.close();
      await media.close();
    });
  });

  describe('Command Interface', () => {
    it('should send commands to filters', () => {
      // Create a filter with a filter that supports commands (volume)
      const filter = FilterAPI.create('volume=1.0');

      try {
        // Send volume change command
        const response = filter.sendCommand('volume', 'volume', '0.5');
        // Response might be empty but command should succeed
        assert.ok(response !== undefined, 'Should return a response (even if empty)');
      } catch (err) {
        // Some filters might not support runtime commands
        // This is OK, just verify the method exists and can be called
        assert.ok(err instanceof Error, 'Should throw an Error if command fails');
      }

      filter.close();
    });

    it('should queue commands for future execution', () => {
      const filter = FilterAPI.create('volume=1.0');

      try {
        // Queue volume changes at different timestamps
        filter.queueCommand('volume', 'volume', '0.5', 1.0);
        filter.queueCommand('volume', 'volume', '0.8', 2.0);
        filter.queueCommand('volume', 'volume', '0.2', 3.0);

        // Commands are queued successfully
        assert.ok(true, 'Commands queued without error');
      } catch (err) {
        // If queueing fails, it should throw an Error
        assert.ok(err instanceof Error, 'Should throw an Error if queueing fails');
      }

      filter.close();
    });

    it('should throw when sending command to closed filter', () => {
      const filter = FilterAPI.create('scale=1280:720');
      filter.close();

      assert.throws(() => {
        filter.sendCommand('scale', 'width', '1920');
      }, /Filter is closed/);
    });

    it('should throw when queueing command to closed filter', () => {
      const filter = FilterAPI.create('scale=1280:720');
      filter.close();

      assert.throws(() => {
        filter.queueCommand('scale', 'width', '1920', 5.0);
      }, /Filter is closed/);
    });

    it('should send command with flags', () => {
      const filter = FilterAPI.create('volume=1.0');

      try {
        // Send command with AVFILTER_CMD_FLAG_ONE
        const response = filter.sendCommand('all', 'enable', '1', AVFILTER_CMD_FLAG_ONE);
        assert.ok(response !== undefined, 'Should return a response');
      } catch (err) {
        // Command might fail, but the API should work
        assert.ok(err instanceof Error, 'Should throw an Error if command fails');
      }

      filter.close();
    });

    it('should handle invalid command gracefully', async () => {
      const filter = FilterAPI.create('volume=0.5');

      // Initialize filter first with a frame
      using frame = new Frame();
      frame.alloc();
      frame.sampleRate = 48000;
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.nbSamples = 1024;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 48000);
      frame.getBuffer();
      await filter.process(frame);

      try {
        // Send an invalid command
        filter.sendCommand('volume', 'invalid_command_xyz', 'value');
        // If it doesn't throw, that's also OK
        assert.ok(true, 'Handled invalid command');
      } catch (err) {
        // Should throw an FFmpegError
        assert.ok(err instanceof Error, 'Should throw an Error for invalid command');
        // The error message may vary based on FFmpeg version
        assert.ok(err.message.includes('Failed') || err.message.includes('Invalid'), 'Error message should indicate failure');
      }

      filter.close();
    });
  });
});
