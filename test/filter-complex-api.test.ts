import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AV_PIX_FMT_RGBA, AV_PIX_FMT_YUV420P, Decoder, Demuxer, FilterComplexAPI, FilterComplexGraph, Frame, Rational } from '../src/index.js';
import { getInputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const testVideoPath = getInputFile('demux.mp4');

describe('High-Level FilterComplex API', () => {
  describe('Filter Creation', () => {
    it('should create a simple single-input filter', () => {
      const filter = FilterComplexAPI.create('[0:v]scale=1280:720[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });

      assert.ok(filter);
      assert.equal(filter.isOpen, true);
      assert.equal(filter.isInitialized, false); // Not initialized until first frame
      filter.close();
    });

    it('should create a multi-input overlay filter', () => {
      const filter = FilterComplexAPI.create('[1:v]scale=320:240[scaled];[0:v][scaled]overlay=x=10:y=10[out]', {
        inputs: [{ label: '0:v' }, { label: '1:v' }],
        outputs: [{ label: 'out' }],
      });

      assert.ok(filter);
      assert.equal(filter.isOpen, true);
      filter.close();
    });

    it('should create a multi-output split filter', () => {
      const filter = FilterComplexAPI.create('[0:v]split=2[a][b];[a]scale=1280:720[hd];[b]scale=640:480[sd]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'hd' }, { label: 'sd' }],
      });

      assert.ok(filter);
      assert.equal(filter.isOpen, true);
      filter.close();
    });

    it('should create a complex grid filter (4 inputs, 1 output)', () => {
      const filter = FilterComplexAPI.create(
        `
        [1:v] negate [a];
        [2:v] hflip [b];
        [3:v] edgedetect [c];
        [0:v][a] hstack=inputs=2 [top];
        [b][c] hstack=inputs=2 [bottom];
        [top][bottom] vstack=inputs=2 [out]
      `,
        {
          inputs: [{ label: '0:v' }, { label: '1:v' }, { label: '2:v' }, { label: '3:v' }],
          outputs: [{ label: 'out' }],
        },
      );

      assert.ok(filter);
      assert.equal(filter.isOpen, true);
      filter.close();
    });

    it('should create filter with framerate option', () => {
      const filter = FilterComplexAPI.create('[0:v]scale=640:480[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
        framerate: { num: 30, den: 1 },
      });

      assert.ok(filter);
      assert.equal(filter.isOpen, true);
      filter.close();
    });
  });

  describe('Frame Processing - Single Input/Output', () => {
    it('should process a single frame (async)', async () => {
      const filter = FilterComplexAPI.create('[0:v]scale=1280:720[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });

      // Create a test frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 30);
      const ret = frame.getBuffer();
      assert.ok(ret >= 0);

      await filter.process('0:v', frame);

      while (true) {
        using output = await filter.receive('out');
        if (!output) break;
        assert.ok(output);
        assert.equal(output.width, 1280);
        assert.equal(output.height, 720);
      }

      filter.close();
    });

    it('should process a single frame (sync)', () => {
      const filter = FilterComplexAPI.create('[0:v]scale=1280:720[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });

      // Create a test frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 30);
      const ret = frame.getBuffer();
      assert.ok(ret >= 0);

      filter.processSync('0:v', frame);

      while (true) {
        using output = filter.receiveSync('out');
        if (!output) break;
        assert.ok(output);
        assert.equal(output.width, 1280);
        assert.equal(output.height, 720);
      }

      filter.close();
    });

    it('should flush and receive remaining frames (async)', async () => {
      const filter = FilterComplexAPI.create('[0:v]scale=640:480[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });

      // Send some frames
      for (let i = 0; i < 5; i++) {
        using frame = new Frame();
        frame.alloc();
        frame.width = 1920;
        frame.height = 1080;
        frame.format = AV_PIX_FMT_YUV420P;
        frame.pts = BigInt(i);
        frame.timeBase = new Rational(1, 30);
        const ret = frame.getBuffer();
        assert.ok(ret >= 0);

        await filter.process('0:v', frame);
      }

      // Flush
      await filter.flush();

      // Receive remaining frames
      let remainingCount = 0;
      while (true) {
        using frame = await filter.receive('out');
        if (!frame) break;
        remainingCount++;
      }

      assert.ok(remainingCount >= 0);
      filter.close();
    });

    it('should flush specific input (async)', async () => {
      const filter = FilterComplexAPI.create('[0:v]scale=640:480[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });

      // Send some frames
      for (let i = 0; i < 3; i++) {
        using frame = new Frame();
        frame.alloc();
        frame.width = 1920;
        frame.height = 1080;
        frame.format = AV_PIX_FMT_YUV420P;
        frame.pts = BigInt(i);
        frame.timeBase = new Rational(1, 30);
        frame.getBuffer();

        await filter.process('0:v', frame);
      }

      // Flush specific input
      await filter.flush('0:v');

      // Receive remaining frames
      let remainingCount = 0;
      while (true) {
        using frame = await filter.receive('out');
        if (!frame) break;
        remainingCount++;
      }

      assert.ok(remainingCount >= 0);
      filter.close();
    });
  });

  describe('Frame Processing - Multiple Inputs', () => {
    it('should process two input streams (overlay)', async () => {
      const filter = FilterComplexAPI.create('[1:v]scale=320:240[scaled];[0:v][scaled]overlay=x=10:y=10[out]', {
        inputs: [{ label: '0:v' }, { label: '1:v' }],
        outputs: [{ label: 'out' }],
      });

      // Create main video frame
      using mainFrame = new Frame();
      mainFrame.alloc();
      mainFrame.width = 640;
      mainFrame.height = 480;
      mainFrame.format = AV_PIX_FMT_YUV420P;
      mainFrame.pts = 0n;
      mainFrame.timeBase = new Rational(1, 30);
      mainFrame.getBuffer();

      // Create overlay frame
      using overlayFrame = new Frame();
      overlayFrame.alloc();
      overlayFrame.width = 640;
      overlayFrame.height = 480;
      overlayFrame.format = AV_PIX_FMT_YUV420P;
      overlayFrame.pts = 0n;
      overlayFrame.timeBase = new Rational(1, 30);
      overlayFrame.getBuffer();

      // Process both inputs
      await filter.process('0:v', mainFrame);
      await filter.process('1:v', overlayFrame);

      // Receive output
      while (true) {
        using output = await filter.receive('out');
        if (!output) break;
        assert.ok(output);
        assert.equal(output.width, 640);
        assert.equal(output.height, 480);
      }

      filter.close();
    });
  });

  describe('Frame Processing - Multiple Outputs', () => {
    it('should split to multiple outputs', async () => {
      const filter = FilterComplexAPI.create('[0:v]split=2[a][b];[a]scale=1280:720[hd];[b]scale=640:480[sd]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'hd' }, { label: 'sd' }],
      });

      // Create input frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 30);
      frame.getBuffer();

      // Process input
      await filter.process('0:v', frame);

      // Receive from both outputs
      let hdCount = 0;
      let sdCount = 0;

      while (true) {
        using hdFrame = await filter.receive('hd');
        if (!hdFrame) break;
        assert.equal(hdFrame.width, 1280);
        assert.equal(hdFrame.height, 720);
        hdCount++;
      }

      while (true) {
        using sdFrame = await filter.receive('sd');
        if (!sdFrame) break;
        assert.equal(sdFrame.width, 640);
        assert.equal(sdFrame.height, 480);
        sdCount++;
      }

      assert.ok(hdCount > 0);
      assert.ok(sdCount > 0);

      filter.close();
    });
  });

  describe('Async Generator Interface - Single Output', () => {
    it('should process frames via async generator', async () => {
      const media = await Demuxer.open(testVideoPath);
      const videoStream = media.video();
      assert.ok(videoStream);
      const decoder = await Decoder.create(videoStream);

      const filter = FilterComplexAPI.create('[0:v]scale=320:240[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
        framerate: videoStream.avgFrameRate,
      });

      let frameCount = 0;
      const maxFrames = 10;

      for await (using filtered of filter.frames('out', {
        '0:v': decoder.frames(media.packets(videoStream.index)),
      })) {
        if (!filtered) {
          break;
        }
        assert.ok(filtered);
        assert.equal(filtered.width, 320);
        assert.equal(filtered.height, 240);
        frameCount++;

        if (frameCount >= maxFrames) break;
      }

      assert.ok(frameCount > 0);

      filter.close();
      decoder.close();
      media.close();
    });

    it('should process with single frame input (logo overlay)', async () => {
      const media = await Demuxer.open(testVideoPath);
      const videoStream = media.video();
      assert.ok(videoStream);
      const decoder = await Decoder.create(videoStream);

      // Create a static logo frame
      using logoFrame = new Frame();
      logoFrame.alloc();
      logoFrame.width = 100;
      logoFrame.height = 100;
      logoFrame.format = AV_PIX_FMT_RGBA;
      logoFrame.pts = 0n;
      logoFrame.timeBase = new Rational(1, 30);
      logoFrame.getBuffer();

      const filter = FilterComplexAPI.create('[1:v]scale=64:-1[logo];[0:v][logo]overlay=x=10:y=10[out]', {
        inputs: [{ label: '0:v' }, { label: '1:v' }],
        outputs: [{ label: 'out' }],
      });

      let frameCount = 0;
      const maxFrames = 5;

      for await (using filtered of filter.frames('out', {
        '0:v': decoder.frames(media.packets(videoStream.index)),
        '1:v': logoFrame, // Single frame - reused for all video frames
      })) {
        if (!filtered) {
          break;
        }
        assert.ok(filtered);
        frameCount++;

        if (frameCount >= maxFrames) break;
      }

      assert.ok(frameCount > 0);

      filter.close();
      decoder.close();
      media.close();
    });

    it('should handle null input for flushing', async () => {
      const filter = FilterComplexAPI.create('[0:v]scale=640:480[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });

      async function* frameGenerator() {
        // Generate a few frames
        for (let i = 0; i < 3; i++) {
          using frame = new Frame();
          frame.alloc();
          frame.width = 1920;
          frame.height = 1080;
          frame.format = AV_PIX_FMT_YUV420P;
          frame.pts = BigInt(i);
          frame.timeBase = new Rational(1, 30);
          frame.getBuffer();
          yield frame;
        }
        // Explicit flush
        yield null;
      }

      let frameCount = 0;
      for await (using filtered of filter.frames('out', { '0:v': frameGenerator() })) {
        if (filtered) frameCount++;
      }

      assert.ok(frameCount >= 3);
      filter.close();
    });
  });

  describe('Utility Methods', () => {
    it('should check if filter is initialized (async)', async () => {
      const filter = FilterComplexAPI.create('[0:v]scale=1280:720[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });

      // Filter not initialized until first frame
      assert.ok(!filter.isInitialized);

      // Initialize with a frame
      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 30);
      frame.getBuffer();

      await filter.process('0:v', frame);

      // Now should be initialized
      assert.ok(filter.isInitialized);

      filter.close();
      assert.ok(!filter.isInitialized);
    });

    it('should check if filter is open', () => {
      const filter = FilterComplexAPI.create('[0:v]scale=1280:720[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });

      assert.ok(filter.isOpen);

      filter.close();
      assert.ok(!filter.isOpen);
    });
  });

  describe('Symbol.dispose', () => {
    it('should support using syntax', () => {
      {
        using filter = FilterComplexAPI.create('[0:v]scale=1280:720[out]', {
          inputs: [{ label: '0:v' }],
          outputs: [{ label: 'out' }],
        });
        assert.ok(filter);
      }
      // Filter should be automatically freed here
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid filter description', async () => {
      // Invalid label reference - error occurs during initialization (lazy)
      const filter = FilterComplexAPI.create('[invalid]scale=640:480[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });

      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 30);
      frame.getBuffer();

      // Error should occur when processing first frame
      await assert.rejects(async () => {
        await filter.process('0:v', frame);
      });

      filter.close();
    });

    it('should throw when processing after close (async)', async () => {
      const filter = FilterComplexAPI.create('[0:v]scale=1280:720[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });
      filter.close();

      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 30);
      frame.getBuffer();

      // FilterComplexAPI throws when processing after close
      await assert.rejects(async () => {
        await filter.process('0:v', frame);
      }, /FilterComplexAPI is already closed/);
    });

    it('should return null when receiving after close', async () => {
      const filter = FilterComplexAPI.create('[0:v]scale=1280:720[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });
      filter.close();

      const result = await filter.receive('out');
      assert.equal(result, null);
    });

    it('should handle flush after close', async () => {
      const filter = FilterComplexAPI.create('[0:v]scale=1280:720[out]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });
      filter.close();

      // flush() returns void and doesn't throw when closed
      await filter.flush();
      assert.ok(true, 'flush() handled gracefully after close');
    });
  });

  describe('Real Media Processing', () => {
    it('should process real video with overlay', async () => {
      const media1 = await Demuxer.open(testVideoPath);
      const media2 = await Demuxer.open(testVideoPath);

      const stream1 = media1.video();
      const stream2 = media2.video();
      assert.ok(stream1);
      assert.ok(stream2);

      const decoder1 = await Decoder.create(stream1);
      const decoder2 = await Decoder.create(stream2);

      const filter = FilterComplexAPI.create('[1:v]scale=160:120[scaled];[0:v][scaled]overlay=x=10:y=10[out]', {
        inputs: [{ label: '0:v' }, { label: '1:v' }],
        outputs: [{ label: 'out' }],
      });

      let processedFrames = 0;
      const maxFrames = 5;

      for await (using filtered of filter.frames('out', {
        '0:v': decoder1.frames(media1.packets(stream1.index)),
        '1:v': decoder2.frames(media2.packets(stream2.index)),
      })) {
        if (!filtered) break;
        assert.ok(filtered);
        processedFrames++;

        if (processedFrames >= maxFrames) break;
      }

      assert.ok(processedFrames > 0);

      filter.close();
      decoder1.close();
      decoder2.close();
      await media1.close();
      await media2.close();
    });

    it('should process real video with split outputs', async () => {
      const media = await Demuxer.open(testVideoPath);
      const videoStream = media.video();
      assert.ok(videoStream);
      const decoder = await Decoder.create(videoStream);

      const filter = FilterComplexAPI.create('[0:v]split=2[a][b];[a]scale=320:240[hd];[b]scale=160:120[sd]', {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'hd' }, { label: 'sd' }],
      });

      let hdCount = 0;
      let sdCount = 0;
      const maxFrames = 3;

      for await (using packet of media.packets(videoStream.index)) {
        for await (using frame of decoder.frames(packet)) {
          if (!frame) continue;

          // Send frame to input
          await filter.process('0:v', frame);

          // Receive from both outputs
          while (true) {
            using hdFrame = await filter.receive('hd');
            if (!hdFrame) break;
            assert.equal(hdFrame.width, 320);
            assert.equal(hdFrame.height, 240);
            hdCount++;
          }

          while (true) {
            using sdFrame = await filter.receive('sd');
            if (!sdFrame) break;
            assert.equal(sdFrame.width, 160);
            assert.equal(sdFrame.height, 120);
            sdCount++;
          }

          if (hdCount >= maxFrames) break;
        }
        if (hdCount >= maxFrames) break;
      }

      assert.ok(hdCount > 0);
      assert.ok(sdCount > 0);

      filter.close();
      decoder.close();
      await media.close();
    });
  });

  describe('FilterComplexGraph builder', () => {
    it('should render labeled chains to a description string', () => {
      const description = FilterComplexGraph.create()
        .chain({ inputs: ['0:v', '1:v'], outputs: 'tmp' }, (c) => c.filter('overlay', { x: 100, y: 50 }))
        .chain({ inputs: 'tmp', outputs: 'out' }, (c) => c.filter('hue', { s: 0 }))
        .build();

      assert.strictEqual(description, '[0:v][1:v]overlay=x=100:y=50[tmp];[tmp]hue=s=0[out]');
    });

    it('should support a single input/output label and custom segments', () => {
      const description = FilterComplexGraph.create()
        .custom('[0:v]split=2[a][b]')
        .chain({ inputs: 'a', outputs: 'hd' }, (c) => c.filter('scale', { width: 1280, height: 720 }))
        .build();

      assert.strictEqual(description, '[0:v]split=2[a][b];[a]scale=width=1280:height=720[hd]');
    });

    it('should drive FilterComplexAPI.create() directly', () => {
      const graph = FilterComplexGraph.create().chain({ inputs: '0:v', outputs: 'out' }, (c) => c.filter('scale', { width: 1280, height: 720 }));

      const filter = FilterComplexAPI.create(graph, {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });

      assert.ok(filter);
      assert.strictEqual(filter.isOpen, true);
      filter.close();
    });

    it('should process a frame through a builder-defined graph', async () => {
      const graph = FilterComplexGraph.create().chain({ inputs: '0:v', outputs: 'out' }, (c) => c.filter('scale', { width: 1280, height: 720 }));

      const filter = FilterComplexAPI.create(graph, {
        inputs: [{ label: '0:v' }],
        outputs: [{ label: 'out' }],
      });

      using frame = new Frame();
      frame.alloc();
      frame.width = 1920;
      frame.height = 1080;
      frame.format = AV_PIX_FMT_YUV420P;
      frame.pts = 0n;
      frame.timeBase = new Rational(1, 30);
      assert.ok(frame.getBuffer() >= 0);

      await filter.process('0:v', frame);

      let got = false;
      while (true) {
        using output = await filter.receive('out');
        if (!output) break;
        assert.strictEqual(output.width, 1280);
        assert.strictEqual(output.height, 720);
        got = true;
      }

      assert.ok(got, 'Should produce at least one filtered frame');
      filter.close();
    });
  });
});
