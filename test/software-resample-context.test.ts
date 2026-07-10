import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_CHANNEL_LAYOUT_5POINT1_BACK,
  AV_CHANNEL_LAYOUT_7POINT1,
  AV_CHANNEL_LAYOUT_MONO,
  AV_CHANNEL_LAYOUT_STEREO,
  AV_SAMPLE_FMT_FLT,
  AV_SAMPLE_FMT_FLTP,
  AV_SAMPLE_FMT_S16,
  AV_SAMPLE_FMT_S16P,
  AV_SAMPLE_FMT_S32,
  AV_SAMPLE_FMT_S32P,
  AV_SAMPLE_FMT_U8,
  AV_SAMPLE_FMT_U8P,
  Frame,
  SoftwareResampleContext,
} from '../src/index.js';

describe('SoftwareResampleContext', () => {
  // Use imported channel layouts
  const MONO = AV_CHANNEL_LAYOUT_MONO;
  const STEREO = AV_CHANNEL_LAYOUT_STEREO;
  const SURROUND_5_1 = AV_CHANNEL_LAYOUT_5POINT1_BACK;

  describe('Creation and Lifecycle', () => {
    it('should create a new SoftwareResampleContext', () => {
      const swr = new SoftwareResampleContext();
      assert.ok(swr instanceof SoftwareResampleContext, 'Should create SoftwareResampleContext instance');
    });

    it('should allocate context', () => {
      const swr = new SoftwareResampleContext();
      swr.alloc();
      // Context is allocated but not initialized
      assert.ok(swr, 'Should allocate context');
      swr.free();
    });

    it('should free context', () => {
      const swr = new SoftwareResampleContext();
      swr.alloc();
      swr.free();
      // Context is now freed - no crash should occur
      assert.ok(true, 'Should free without error');
    });

    it('should support Symbol.dispose', () => {
      const swr = new SoftwareResampleContext();
      swr.alloc();

      if (typeof swr[Symbol.dispose] === 'function') {
        swr[Symbol.dispose]();
      }
      assert.ok(true, 'Should dispose without error');
    });

    it('should handle multiple free calls safely', () => {
      const swr = new SoftwareResampleContext();
      swr.alloc();
      swr.free();
      swr.free(); // Should not crash
      assert.ok(true, 'Should handle multiple free calls');
    });
  });

  describe('Context Configuration', () => {
    it('should allocate and set options with same format', () => {
      const swr = new SoftwareResampleContext();

      const ret = swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);

      assert.equal(typeof ret, 'number', 'Should return status code');
      assert.equal(ret, 0, 'Should allocate successfully');

      const initRet = swr.init();
      assert.equal(initRet, 0, 'Should initialize successfully');

      swr.free();
    });

    it('should resample between different sample rates', () => {
      const swr = new SoftwareResampleContext();

      // 48kHz to 44.1kHz
      const ret = swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 48000);

      assert.equal(ret, 0, 'Should allocate for resampling');

      const initRet = swr.init();
      assert.equal(initRet, 0, 'Should initialize resampling');

      swr.free();
    });

    it('should convert between different sample formats', () => {
      const swr = new SoftwareResampleContext();

      // Float to S16
      const ret = swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_FLT, 44100);

      assert.equal(ret, 0, 'Should allocate for format conversion');

      const initRet = swr.init();
      assert.equal(initRet, 0, 'Should initialize format conversion');

      swr.free();
    });

    it('should handle channel layout conversion', () => {
      const swr = new SoftwareResampleContext();

      // 5.1 to Stereo
      const ret = swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, SURROUND_5_1, AV_SAMPLE_FMT_S16, 44100);

      assert.equal(ret, 0, 'Should allocate for channel conversion');

      const initRet = swr.init();
      assert.equal(initRet, 0, 'Should initialize channel conversion');

      swr.free();
    });

    it('should handle mono to stereo conversion', () => {
      const swr = new SoftwareResampleContext();

      const ret = swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, MONO, AV_SAMPLE_FMT_S16, 44100);

      assert.equal(ret, 0, 'Should allocate for mono to stereo');

      const initRet = swr.init();
      assert.equal(initRet, 0, 'Should initialize mono to stereo');

      swr.free();
    });

    it('should handle complex conversion (rate + format + channels)', () => {
      const swr = new SoftwareResampleContext();

      // 5.1 48kHz Float -> Stereo 44.1kHz S16
      const ret = swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, SURROUND_5_1, AV_SAMPLE_FMT_FLTP, 48000);

      assert.equal(ret, 0, 'Should allocate for complex conversion');

      const initRet = swr.init();
      assert.equal(initRet, 0, 'Should initialize complex conversion');

      swr.free();
    });

    it('should reinitialize after configuration change', () => {
      const swr = new SoftwareResampleContext();

      // First configuration
      let ret = swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 48000);
      assert.equal(ret, 0);

      let initRet = swr.init();
      assert.equal(initRet, 0);

      // Change configuration
      ret = swr.allocSetOpts2(MONO, AV_SAMPLE_FMT_FLT, 22050, STEREO, AV_SAMPLE_FMT_S32, 96000);
      assert.equal(ret, 0);

      initRet = swr.init();
      assert.equal(initRet, 0, 'Should reinitialize with new config');

      swr.free();
    });
  });

  describe('Sample Format Support', () => {
    const formats = [
      { name: 'U8', format: AV_SAMPLE_FMT_U8 },
      { name: 'S16', format: AV_SAMPLE_FMT_S16 },
      { name: 'S32', format: AV_SAMPLE_FMT_S32 },
      { name: 'FLT', format: AV_SAMPLE_FMT_FLT },
      { name: 'U8P', format: AV_SAMPLE_FMT_U8P },
      { name: 'S16P', format: AV_SAMPLE_FMT_S16P },
      { name: 'S32P', format: AV_SAMPLE_FMT_S32P },
      { name: 'FLTP', format: AV_SAMPLE_FMT_FLTP },
    ];

    formats.forEach(({ name, format }) => {
      it(`should handle ${name} format`, () => {
        const swr = new SoftwareResampleContext();

        const ret = swr.allocSetOpts2(STEREO, format, 44100, STEREO, format, 44100);

        assert.equal(ret, 0, `Should allocate with ${name} format`);

        const initRet = swr.init();
        assert.equal(initRet, 0, `Should initialize with ${name} format`);

        swr.free();
      });
    });
  });

  describe('Conversion Operations', () => {
    it('should convert audio buffers (async)', async () => {
      const swr = new SoftwareResampleContext();

      // Simple stereo S16 passthrough
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      // Create input buffers (1024 samples, stereo, S16)
      const samplesPerChannel = 1024;
      const bytesPerSample = 2; // S16
      const channels = 2;

      const inBuffer = Buffer.alloc(samplesPerChannel * bytesPerSample * channels);
      const outBuffer = Buffer.alloc(samplesPerChannel * bytesPerSample * channels);

      const inBuffers = [inBuffer];
      const outBuffers = [outBuffer];

      const ret = await swr.convert(outBuffers, samplesPerChannel, inBuffers, samplesPerChannel);

      assert.equal(typeof ret, 'number', 'Should return sample count');
      assert.ok(ret >= 0, 'Should convert successfully');

      swr.free();
    });

    it('should convert audio buffers (sync)', () => {
      const swr = new SoftwareResampleContext();

      // Simple stereo S16 passthrough
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      // Create input buffers (1024 samples, stereo, S16)
      const samplesPerChannel = 1024;
      const bytesPerSample = 2; // S16
      const channels = 2;

      const inBuffer = Buffer.alloc(samplesPerChannel * bytesPerSample * channels);
      const outBuffer = Buffer.alloc(samplesPerChannel * bytesPerSample * channels);

      const inBuffers = [inBuffer];
      const outBuffers = [outBuffer];

      const ret = swr.convertSync(outBuffers, samplesPerChannel, inBuffers, samplesPerChannel);

      assert.equal(typeof ret, 'number', 'Should return sample count');
      assert.ok(ret >= 0, 'Should convert successfully');

      swr.free();
    });

    it('should handle null input (flush) (async)', async () => {
      const swr = new SoftwareResampleContext();

      // Resampling that might buffer samples
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 48000);
      swr.init();

      const samplesPerChannel = 1024;
      const bytesPerSample = 2;
      const channels = 2;

      const outBuffer = Buffer.alloc(samplesPerChannel * bytesPerSample * channels);
      const outBuffers = [outBuffer];

      // Flush buffered samples
      const ret = await swr.convert(outBuffers, samplesPerChannel, null, 0);

      assert.equal(typeof ret, 'number', 'Should return sample count');
      assert.ok(ret >= 0, 'Should flush successfully');

      swr.free();
    });

    it('should handle null input (flush) (sync)', () => {
      const swr = new SoftwareResampleContext();

      // Resampling that might buffer samples
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 48000);
      swr.init();

      const samplesPerChannel = 1024;
      const bytesPerSample = 2;
      const channels = 2;

      const outBuffer = Buffer.alloc(samplesPerChannel * bytesPerSample * channels);
      const outBuffers = [outBuffer];

      // Flush buffered samples
      const ret = swr.convertSync(outBuffers, samplesPerChannel, null, 0);

      assert.equal(typeof ret, 'number', 'Should return sample count');
      assert.ok(ret >= 0, 'Should flush successfully');

      swr.free();
    });

    it('should convert frame objects', () => {
      const swr = new SoftwareResampleContext();

      // Simple passthrough (no conversion)
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      // Create input frame
      const inFrame = new Frame();
      inFrame.alloc();
      inFrame.format = AV_SAMPLE_FMT_S16;
      inFrame.sampleRate = 44100;
      inFrame.nbSamples = 1024;
      inFrame.channelLayout = STEREO;
      const inRet = inFrame.getBuffer();
      assert.equal(inRet, 0, 'Should allocate input buffer');

      // Create output frame
      const outFrame = new Frame();
      outFrame.alloc();
      outFrame.format = AV_SAMPLE_FMT_S16;
      outFrame.sampleRate = 44100;
      outFrame.nbSamples = 1024;
      outFrame.channelLayout = STEREO;
      const outRet = outFrame.getBuffer();
      assert.equal(outRet, 0, 'Should allocate output buffer');

      const ret = swr.convertFrame(outFrame, inFrame);
      assert.equal(typeof ret, 'number', 'Should return status code');
      assert.equal(ret, 0, 'Should convert frame successfully');

      inFrame.free();
      outFrame.free();
      swr.free();
    });

    it('should handle planar format conversion (async)', async () => {
      const swr = new SoftwareResampleContext();

      // Interleaved to planar
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16P, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      const samplesPerChannel = 512;
      const bytesPerSample = 2;

      // Interleaved input
      const inBuffer = Buffer.alloc(samplesPerChannel * bytesPerSample * 2); // stereo
      const inBuffers = [inBuffer];

      // Planar output (separate buffers for each channel)
      const outLeft = Buffer.alloc(samplesPerChannel * bytesPerSample);
      const outRight = Buffer.alloc(samplesPerChannel * bytesPerSample);
      const outBuffers = [outLeft, outRight];

      const ret = await swr.convert(outBuffers, samplesPerChannel, inBuffers, samplesPerChannel);

      assert.ok(ret >= 0, 'Should convert to planar format');

      swr.free();
    });

    it('should handle planar format conversion (sync)', () => {
      const swr = new SoftwareResampleContext();

      // Interleaved to planar
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16P, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      const samplesPerChannel = 512;
      const bytesPerSample = 2;

      // Interleaved input
      const inBuffer = Buffer.alloc(samplesPerChannel * bytesPerSample * 2); // stereo
      const inBuffers = [inBuffer];

      // Planar output (separate buffers for each channel)
      const outLeft = Buffer.alloc(samplesPerChannel * bytesPerSample);
      const outRight = Buffer.alloc(samplesPerChannel * bytesPerSample);
      const outBuffers = [outLeft, outRight];

      const ret = swr.convertSync(outBuffers, samplesPerChannel, inBuffers, samplesPerChannel);

      assert.ok(ret >= 0, 'Should convert to planar format');

      swr.free();
    });
  });

  describe('Delay and Buffering', () => {
    it('should get delay', () => {
      const swr = new SoftwareResampleContext();

      // Resampling with potential delay
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 48000);
      swr.init();

      const delay = swr.getDelay(48000n);
      assert.equal(typeof delay, 'bigint', 'Should return delay as bigint');
      assert.ok(delay >= 0n, 'Should have non-negative delay');

      swr.free();
    });

    it('should get output samples', () => {
      const swr = new SoftwareResampleContext();

      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 48000);
      swr.init();

      const inputSamples = 1024;
      const outputSamples = swr.getOutSamples(inputSamples);

      assert.equal(typeof outputSamples, 'number', 'Should return sample count');
      assert.ok(outputSamples > 0, 'Should calculate output samples');

      swr.free();
    });

    it('should inject silence', () => {
      const swr = new SoftwareResampleContext();

      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      const count = 100;
      const ret = swr.injectSilence(count);

      assert.equal(typeof ret, 'number', 'Should return status code');
      assert.ok(ret >= 0, 'Should inject silence');

      swr.free();
    });

    it('should handle next pts calculation', () => {
      const swr = new SoftwareResampleContext();

      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 48000);
      swr.init();

      const pts = 1000n;
      const nextPts = swr.nextPts(pts);

      assert.equal(typeof nextPts, 'bigint', 'Should return bigint pts');
      assert.ok(nextPts >= pts, 'Should return valid next pts');

      swr.free();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high sample rates', () => {
      const swr = new SoftwareResampleContext();

      const ret = swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 192000, STEREO, AV_SAMPLE_FMT_S16, 192000);

      assert.equal(ret, 0, 'Should handle 192kHz');

      const initRet = swr.init();
      assert.equal(initRet, 0, 'Should initialize with high sample rate');

      swr.free();
    });

    it('should handle very low sample rates', () => {
      const swr = new SoftwareResampleContext();

      const ret = swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 8000, STEREO, AV_SAMPLE_FMT_S16, 8000);

      assert.equal(ret, 0, 'Should handle 8kHz');

      const initRet = swr.init();
      assert.equal(initRet, 0, 'Should initialize with low sample rate');

      swr.free();
    });

    it('should handle extreme sample rate conversion', () => {
      const swr = new SoftwareResampleContext();

      // 192kHz to 8kHz
      const ret = swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 8000, STEREO, AV_SAMPLE_FMT_S16, 192000);

      assert.equal(ret, 0, 'Should handle extreme downsampling');

      const initRet = swr.init();
      assert.equal(initRet, 0, 'Should initialize extreme conversion');

      swr.free();
    });

    it('should handle single sample conversion (async)', async () => {
      const swr = new SoftwareResampleContext();

      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      const inBuffer = Buffer.alloc(2 * 2); // 1 sample, stereo, S16
      const outBuffer = Buffer.alloc(2 * 2);

      const ret = await swr.convert([outBuffer], 1, [inBuffer], 1);

      assert.ok(ret >= 0, 'Should convert single sample');

      swr.free();
    });

    it('should handle single sample conversion (sync)', () => {
      const swr = new SoftwareResampleContext();

      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      const inBuffer = Buffer.alloc(2 * 2); // 1 sample, stereo, S16
      const outBuffer = Buffer.alloc(2 * 2);

      const ret = swr.convertSync([outBuffer], 1, [inBuffer], 1);

      assert.ok(ret >= 0, 'Should convert single sample');

      swr.free();
    });

    it('should handle zero samples (async)', async () => {
      const swr = new SoftwareResampleContext();

      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      const outBuffer = Buffer.alloc(1024);

      const ret = await swr.convert([outBuffer], 512, null, 0);

      assert.equal(typeof ret, 'number', 'Should handle zero input samples');
      assert.ok(ret >= 0, 'Should not fail on zero samples');

      swr.free();
    });

    it('should handle zero samples (sync)', () => {
      const swr = new SoftwareResampleContext();

      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      const outBuffer = Buffer.alloc(1024);

      const ret = swr.convertSync([outBuffer], 512, null, 0);

      assert.equal(typeof ret, 'number', 'Should handle zero input samples');
      assert.ok(ret >= 0, 'Should not fail on zero samples');

      swr.free();
    });

    it('should handle many channels', () => {
      const swr = new SoftwareResampleContext();

      // 7.1 channel layout (8 channels)
      const sevenPointOne = AV_CHANNEL_LAYOUT_7POINT1;

      const ret = swr.allocSetOpts2(sevenPointOne, AV_SAMPLE_FMT_S16, 44100, sevenPointOne, AV_SAMPLE_FMT_S16, 44100);

      assert.equal(ret, 0, 'Should handle 8 channels');

      const initRet = swr.init();
      assert.equal(initRet, 0, 'Should initialize with 8 channels');

      swr.free();
    });
  });

  describe('Memory Management', () => {
    it('should handle multiple allocations', () => {
      const swr = new SoftwareResampleContext();

      // First allocation
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 48000);
      swr.init();
      swr.free();

      // Second allocation
      swr.allocSetOpts2(MONO, AV_SAMPLE_FMT_FLT, 22050, SURROUND_5_1, AV_SAMPLE_FMT_S32, 96000);
      swr.init();
      swr.free();

      assert.ok(true, 'Should handle multiple allocations');
    });

    it('should clean up on context replacement', () => {
      const swr = new SoftwareResampleContext();

      // First context
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 48000);
      swr.init();

      // Replace with new context (should free old one)
      swr.allocSetOpts2(MONO, AV_SAMPLE_FMT_FLT, 22050, STEREO, AV_SAMPLE_FMT_S32, 96000);
      swr.init();

      swr.free();
      assert.ok(true, 'Should replace context cleanly');
    });

    it('should not crash when free() races an in-flight convert', { timeout: 10000 }, async () => {
      const swr = new SoftwareResampleContext();
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      const samplesPerChannel = 8192;
      const inBuffer = Buffer.alloc(samplesPerChannel * 2 * 2);
      const outBuffer = Buffer.alloc(samplesPerChannel * 2 * 2);

      // Free while the conversion may still be on the threadpool - free()
      // waits for the in-flight operation (previously a use-after-free)
      const pending = swr.convert([outBuffer], samplesPerChannel, [inBuffer], samplesPerChannel);
      swr.free();

      const results = await Promise.allSettled([pending]);
      assert.notEqual(results[0].status, undefined);
    });

    it('should handle frame conversion with auto-allocated destination', () => {
      const swr = new SoftwareResampleContext();

      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      // Source frame
      const srcFrame = new Frame();
      srcFrame.alloc();
      srcFrame.format = AV_SAMPLE_FMT_S16;
      srcFrame.sampleRate = 44100;
      srcFrame.nbSamples = 1024;
      srcFrame.channelLayout = STEREO;
      srcFrame.getBuffer();

      // Destination frame without pre-allocated buffer
      const dstFrame = new Frame();
      dstFrame.alloc();
      dstFrame.format = AV_SAMPLE_FMT_S16;
      dstFrame.sampleRate = 44100;
      dstFrame.channelLayout = STEREO;
      // Don't set nbSamples or call getBuffer() - let convertFrame handle it

      const ret = swr.convertFrame(dstFrame, srcFrame);
      assert.equal(ret, 0, 'Should auto-allocate destination');

      srcFrame.free();
      dstFrame.free();
      swr.free();
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle real-time audio processing', () => {
      const swr = new SoftwareResampleContext();

      // Typical real-time audio: 48kHz stereo
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 48000, STEREO, AV_SAMPLE_FMT_S16, 48000);
      swr.init();

      assert.ok(swr, 'Should configure for real-time audio');
      swr.free();
    });

    it('should handle broadcast format conversion', () => {
      const swr = new SoftwareResampleContext();

      // Broadcast: 48kHz 24-bit to consumer 44.1kHz 16-bit
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, STEREO, AV_SAMPLE_FMT_S32, 48000);
      swr.init();

      assert.ok(swr, 'Should configure for broadcast conversion');
      swr.free();
    });

    it('should handle surround sound downmix', () => {
      const swr = new SoftwareResampleContext();

      // 5.1 surround to stereo for headphones
      swr.allocSetOpts2(STEREO, AV_SAMPLE_FMT_S16, 44100, SURROUND_5_1, AV_SAMPLE_FMT_S16, 44100);
      swr.init();

      assert.ok(swr, 'Should configure for surround downmix');
      swr.free();
    });
  });
});
