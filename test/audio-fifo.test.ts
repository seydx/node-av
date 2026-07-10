import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AudioFifo,
  AV_SAMPLE_FMT_FLT,
  AV_SAMPLE_FMT_FLTP,
  AV_SAMPLE_FMT_S16,
  AV_SAMPLE_FMT_S16P,
  AV_SAMPLE_FMT_S32,
  AV_SAMPLE_FMT_S32P,
  AV_SAMPLE_FMT_U8,
  AV_SAMPLE_FMT_U8P,
  avGetBytesPerSample,
  avSampleFmtIsPlanar,
} from '../src/index.js';
import { prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

describe('AudioFifo', () => {
  describe('Creation and Lifecycle', () => {
    it('should create a new AudioFifo', () => {
      const fifo = new AudioFifo();
      assert.ok(fifo instanceof AudioFifo, 'Should create AudioFifo instance');
    });

    it('should allocate FIFO for interleaved format', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 1024);
      assert.ok(fifo, 'Should allocate FIFO');
      assert.equal(fifo.size, 0, 'Should start empty');
      assert.ok(fifo.space >= 1024, 'Should have at least initial space');
      fifo.free();
    });

    it('should allocate FIFO for planar format', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_FLTP, 2, 2048);
      assert.ok(fifo, 'Should allocate FIFO');
      assert.equal(fifo.size, 0, 'Should start empty');
      assert.ok(fifo.space >= 2048, 'Should have at least initial space');
      fifo.free();
    });

    it('should free FIFO', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);
      fifo.free();
      // FIFO is now freed - no crash should occur
      assert.ok(true, 'Should free without error');
    });

    it('should support Symbol.dispose', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      if (typeof fifo[Symbol.dispose] === 'function') {
        fifo[Symbol.dispose]();
      }
      assert.ok(true, 'Should dispose without error');
    });

    it('should handle multiple free calls safely', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);
      fifo.free();
      fifo.free(); // Should not crash
      assert.ok(true, 'Should handle multiple free calls');
    });
  });

  describe('Sample Format Support', () => {
    const formats = [
      { name: 'U8 (interleaved)', format: AV_SAMPLE_FMT_U8, planar: false },
      { name: 'S16 (interleaved)', format: AV_SAMPLE_FMT_S16, planar: false },
      { name: 'S32 (interleaved)', format: AV_SAMPLE_FMT_S32, planar: false },
      { name: 'FLT (interleaved)', format: AV_SAMPLE_FMT_FLT, planar: false },
      { name: 'U8P (planar)', format: AV_SAMPLE_FMT_U8P, planar: true },
      { name: 'S16P (planar)', format: AV_SAMPLE_FMT_S16P, planar: true },
      { name: 'S32P (planar)', format: AV_SAMPLE_FMT_S32P, planar: true },
      { name: 'FLTP (planar)', format: AV_SAMPLE_FMT_FLTP, planar: true },
    ];

    formats.forEach(({ name, format, planar }) => {
      it(`should handle ${name} format`, () => {
        const fifo = new AudioFifo();
        fifo.alloc(format, 2, 512);

        assert.ok(fifo, `Should allocate with ${name} format`);
        assert.equal(avSampleFmtIsPlanar(format), planar, `Should correctly identify if ${name} is planar`);

        fifo.free();
      });
    });
  });

  describe('Write and Read Operations', () => {
    it('should write and read interleaved samples (async)', async () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const nbSamples = 128;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16);

      fifo.alloc(AV_SAMPLE_FMT_S16, channels, 512);

      // Create interleaved buffer with test data
      const writeBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      for (let i = 0; i < writeBuffer.length; i += 2) {
        writeBuffer.writeInt16LE(i / 2, i);
      }

      // Write samples
      const written = await fifo.write(writeBuffer, nbSamples);
      assert.equal(written, nbSamples, 'Should write all samples');
      assert.equal(fifo.size, nbSamples, 'Size should reflect written samples');

      // Read samples back
      const readBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      const read = await fifo.read(readBuffer, nbSamples);
      assert.equal(read, nbSamples, 'Should read all samples');
      assert.equal(fifo.size, 0, 'FIFO should be empty after reading');

      // Verify data
      assert.deepEqual(readBuffer, writeBuffer, 'Read data should match written data');

      fifo.free();
    });

    it('should write and read interleaved samples (sync)', () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const nbSamples = 128;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16);

      fifo.alloc(AV_SAMPLE_FMT_S16, channels, 512);

      // Create interleaved buffer with test data
      const writeBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      for (let i = 0; i < writeBuffer.length; i += 2) {
        writeBuffer.writeInt16LE(i / 2, i);
      }

      // Write samples
      const written = fifo.writeSync(writeBuffer, nbSamples);
      assert.equal(written, nbSamples, 'Should write all samples');
      assert.equal(fifo.size, nbSamples, 'Size should reflect written samples');

      // Read samples back
      const readBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      const read = fifo.readSync(readBuffer, nbSamples);
      assert.equal(read, nbSamples, 'Should read all samples');
      assert.equal(fifo.size, 0, 'FIFO should be empty after reading');

      // Verify data
      assert.deepEqual(readBuffer, writeBuffer, 'Read data should match written data');

      fifo.free();
    });

    it('should write and read planar samples (async)', async () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const nbSamples = 256;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_FLTP);

      fifo.alloc(AV_SAMPLE_FMT_FLTP, channels, 1024);

      // Create planar buffers (one per channel)
      const leftBuffer = Buffer.alloc(nbSamples * bytesPerSample);
      const rightBuffer = Buffer.alloc(nbSamples * bytesPerSample);

      // Fill with test data
      for (let i = 0; i < nbSamples; i++) {
        leftBuffer.writeFloatLE(i * 0.1, i * bytesPerSample);
        rightBuffer.writeFloatLE(i * 0.2, i * bytesPerSample);
      }

      // Write samples
      const written = await fifo.write([leftBuffer, rightBuffer], nbSamples);
      assert.equal(written, nbSamples, 'Should write all samples');
      assert.equal(fifo.size, nbSamples, 'Size should reflect written samples');

      // Read samples back
      const readLeftBuffer = Buffer.alloc(nbSamples * bytesPerSample);
      const readRightBuffer = Buffer.alloc(nbSamples * bytesPerSample);
      const read = await fifo.read([readLeftBuffer, readRightBuffer], nbSamples);
      assert.equal(read, nbSamples, 'Should read all samples');
      assert.equal(fifo.size, 0, 'FIFO should be empty after reading');

      // Verify data
      assert.deepEqual(readLeftBuffer, leftBuffer, 'Left channel data should match');
      assert.deepEqual(readRightBuffer, rightBuffer, 'Right channel data should match');

      fifo.free();
    });

    it('should write and read planar samples (sync)', () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const nbSamples = 256;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_FLTP);

      fifo.alloc(AV_SAMPLE_FMT_FLTP, channels, 1024);

      // Create planar buffers (one per channel)
      const leftBuffer = Buffer.alloc(nbSamples * bytesPerSample);
      const rightBuffer = Buffer.alloc(nbSamples * bytesPerSample);

      // Fill with test data
      for (let i = 0; i < nbSamples; i++) {
        leftBuffer.writeFloatLE(i * 0.1, i * bytesPerSample);
        rightBuffer.writeFloatLE(i * 0.2, i * bytesPerSample);
      }

      // Write samples
      const written = fifo.writeSync([leftBuffer, rightBuffer], nbSamples);
      assert.equal(written, nbSamples, 'Should write all samples');
      assert.equal(fifo.size, nbSamples, 'Size should reflect written samples');

      // Read samples back
      const readLeftBuffer = Buffer.alloc(nbSamples * bytesPerSample);
      const readRightBuffer = Buffer.alloc(nbSamples * bytesPerSample);
      const read = fifo.readSync([readLeftBuffer, readRightBuffer], nbSamples);
      assert.equal(read, nbSamples, 'Should read all samples');
      assert.equal(fifo.size, 0, 'FIFO should be empty after reading');

      // Verify data
      assert.deepEqual(readLeftBuffer, leftBuffer, 'Left channel data should match');
      assert.deepEqual(readRightBuffer, rightBuffer, 'Right channel data should match');

      fifo.free();
    });

    it('should handle partial writes and reads (async)', async () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16);

      fifo.alloc(AV_SAMPLE_FMT_S16, channels, 100); // Small FIFO

      // Try to write more than initial capacity (should auto-reallocate)
      const largeBuffer = Buffer.alloc(200 * channels * bytesPerSample);
      const written = await fifo.write(largeBuffer, 200);
      assert.equal(written, 200, 'Should write all samples with auto-reallocation');
      assert.equal(fifo.size, 200, 'Size should be 200');

      // Read part of the data
      const partialBuffer = Buffer.alloc(50 * channels * bytesPerSample);
      const read1 = await fifo.read(partialBuffer, 50);
      assert.equal(read1, 50, 'Should read 50 samples');
      assert.equal(fifo.size, 150, 'Size should be 150 after partial read');

      // Read another part
      const read2 = await fifo.read(partialBuffer, 50);
      assert.equal(read2, 50, 'Should read another 50 samples');
      assert.equal(fifo.size, 100, 'Size should be 100');

      fifo.free();
    });

    it('should handle partial writes and reads (sync)', () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16);

      fifo.alloc(AV_SAMPLE_FMT_S16, channels, 100); // Small FIFO

      // Try to write more than initial capacity (should auto-reallocate)
      const largeBuffer = Buffer.alloc(200 * channels * bytesPerSample);
      const written = fifo.writeSync(largeBuffer, 200);
      assert.equal(written, 200, 'Should write all samples with auto-reallocation');
      assert.equal(fifo.size, 200, 'Size should be 200');

      // Read part of the data
      const partialBuffer = Buffer.alloc(50 * channels * bytesPerSample);
      const read1 = fifo.readSync(partialBuffer, 50);
      assert.equal(read1, 50, 'Should read 50 samples');
      assert.equal(fifo.size, 150, 'Size should be 150 after partial read');

      // Read another part
      const read2 = fifo.readSync(partialBuffer, 50);
      assert.equal(read2, 50, 'Should read another 50 samples');
      assert.equal(fifo.size, 100, 'Size should be 100');

      fifo.free();
    });

    it('should handle writing zero samples (async)', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      const buffer = Buffer.alloc(0);
      const written = await fifo.write(buffer, 0);
      assert.equal(written, 0, 'Should handle zero samples write');
      assert.equal(fifo.size, 0, 'Size should remain 0');

      fifo.free();
    });

    it('should handle writing zero samples (sync)', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      const buffer = Buffer.alloc(0);
      const written = fifo.writeSync(buffer, 0);
      assert.equal(written, 0, 'Should handle zero samples write');
      assert.equal(fifo.size, 0, 'Size should remain 0');

      fifo.free();
    });

    it('should handle reading from empty FIFO (async)', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      const buffer = Buffer.alloc(100 * 2 * 2); // 100 samples, stereo, S16
      const read = await fifo.read(buffer, 100);
      assert.equal(read, 0, 'Should read 0 samples from empty FIFO');

      fifo.free();
    });

    it('should handle reading from empty FIFO (sync)', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      const buffer = Buffer.alloc(100 * 2 * 2); // 100 samples, stereo, S16
      const read = fifo.readSync(buffer, 100);
      assert.equal(read, 0, 'Should read 0 samples from empty FIFO');

      fifo.free();
    });
  });

  describe('Peek Operation', () => {
    it('should peek without removing samples (async)', async () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const nbSamples = 64;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16);

      fifo.alloc(AV_SAMPLE_FMT_S16, channels, 256);

      // Write test data
      const writeBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      for (let i = 0; i < writeBuffer.length; i += 2) {
        writeBuffer.writeInt16LE(i, i);
      }
      await fifo.write(writeBuffer, nbSamples);

      // Peek at the data
      const peekBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      const peeked = await fifo.peek(peekBuffer, nbSamples);
      assert.equal(peeked, nbSamples, 'Should peek all samples');
      assert.equal(fifo.size, nbSamples, 'Size should remain unchanged after peek');

      // Verify peeked data matches written data
      assert.deepEqual(peekBuffer, writeBuffer, 'Peeked data should match written data');

      // Read the data (should be the same)
      const readBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      const read = await fifo.read(readBuffer, nbSamples);
      assert.equal(read, nbSamples, 'Should read all samples');
      assert.equal(fifo.size, 0, 'FIFO should be empty after reading');
      assert.deepEqual(readBuffer, writeBuffer, 'Read data should match written data');

      fifo.free();
    });

    it('should peek without removing samples (sync)', () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const nbSamples = 64;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16);

      fifo.alloc(AV_SAMPLE_FMT_S16, channels, 256);

      // Write test data
      const writeBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      for (let i = 0; i < writeBuffer.length; i += 2) {
        writeBuffer.writeInt16LE(i, i);
      }
      fifo.writeSync(writeBuffer, nbSamples);

      // Peek at the data
      const peekBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      const peeked = fifo.peekSync(peekBuffer, nbSamples);
      assert.equal(peeked, nbSamples, 'Should peek all samples');
      assert.equal(fifo.size, nbSamples, 'Size should remain unchanged after peek');

      // Verify peeked data matches written data
      assert.deepEqual(peekBuffer, writeBuffer, 'Peeked data should match written data');

      // Read the data (should be the same)
      const readBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      const read = fifo.readSync(readBuffer, nbSamples);
      assert.equal(read, nbSamples, 'Should read all samples');
      assert.equal(fifo.size, 0, 'FIFO should be empty after reading');
      assert.deepEqual(readBuffer, writeBuffer, 'Read data should match written data');

      fifo.free();
    });

    it('should peek planar samples (async)', async () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const nbSamples = 32;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_FLTP);

      fifo.alloc(AV_SAMPLE_FMT_FLTP, channels, 128);

      // Write planar data
      const leftBuffer = Buffer.alloc(nbSamples * bytesPerSample);
      const rightBuffer = Buffer.alloc(nbSamples * bytesPerSample);
      for (let i = 0; i < nbSamples; i++) {
        leftBuffer.writeFloatLE(i * 1.0, i * bytesPerSample);
        rightBuffer.writeFloatLE(i * 2.0, i * bytesPerSample);
      }
      await fifo.write([leftBuffer, rightBuffer], nbSamples);

      // Peek at the data
      const peekLeft = Buffer.alloc(nbSamples * bytesPerSample);
      const peekRight = Buffer.alloc(nbSamples * bytesPerSample);
      const peeked = await fifo.peek([peekLeft, peekRight], nbSamples);
      assert.equal(peeked, nbSamples, 'Should peek all samples');
      assert.equal(fifo.size, nbSamples, 'Size should remain unchanged');

      // Verify data
      assert.deepEqual(peekLeft, leftBuffer, 'Peeked left channel should match');
      assert.deepEqual(peekRight, rightBuffer, 'Peeked right channel should match');

      fifo.free();
    });

    it('should peek planar samples (sync)', () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const nbSamples = 32;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_FLTP);

      fifo.alloc(AV_SAMPLE_FMT_FLTP, channels, 128);

      // Write planar data
      const leftBuffer = Buffer.alloc(nbSamples * bytesPerSample);
      const rightBuffer = Buffer.alloc(nbSamples * bytesPerSample);
      for (let i = 0; i < nbSamples; i++) {
        leftBuffer.writeFloatLE(i * 1.0, i * bytesPerSample);
        rightBuffer.writeFloatLE(i * 2.0, i * bytesPerSample);
      }
      fifo.writeSync([leftBuffer, rightBuffer], nbSamples);

      // Peek at the data
      const peekLeft = Buffer.alloc(nbSamples * bytesPerSample);
      const peekRight = Buffer.alloc(nbSamples * bytesPerSample);
      const peeked = fifo.peekSync([peekLeft, peekRight], nbSamples);
      assert.equal(peeked, nbSamples, 'Should peek all samples');
      assert.equal(fifo.size, nbSamples, 'Size should remain unchanged');

      // Verify data
      assert.deepEqual(peekLeft, leftBuffer, 'Peeked left channel should match');
      assert.deepEqual(peekRight, rightBuffer, 'Peeked right channel should match');

      fifo.free();
    });
  });

  describe('Drain and Reset Operations', () => {
    it('should drain samples from FIFO (with async write)', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      // Write samples
      const buffer = Buffer.alloc(100 * 2 * 2); // 100 samples
      await fifo.write(buffer, 100);
      assert.equal(fifo.size, 100, 'Should have 100 samples');

      // Drain 30 samples
      fifo.drain(30);
      assert.equal(fifo.size, 70, 'Should have 70 samples after draining 30');

      // Drain remaining
      fifo.drain(70);
      assert.equal(fifo.size, 0, 'Should be empty after draining all');

      fifo.free();
    });

    it('should drain samples from FIFO (with sync write)', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      // Write samples
      const buffer = Buffer.alloc(100 * 2 * 2); // 100 samples
      fifo.writeSync(buffer, 100);
      assert.equal(fifo.size, 100, 'Should have 100 samples');

      // Drain 30 samples
      fifo.drain(30);
      assert.equal(fifo.size, 70, 'Should have 70 samples after draining 30');

      // Drain remaining
      fifo.drain(70);
      assert.equal(fifo.size, 0, 'Should be empty after draining all');

      fifo.free();
    });

    it('should reset FIFO (with async write)', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      // Write samples
      const buffer = Buffer.alloc(200 * 2 * 2); // 200 samples
      await fifo.write(buffer, 200);
      assert.equal(fifo.size, 200, 'Should have 200 samples');

      // Reset
      fifo.reset();
      assert.equal(fifo.size, 0, 'Should be empty after reset');

      // Should be able to write again
      await fifo.write(buffer, 100);
      assert.equal(fifo.size, 100, 'Should accept new samples after reset');

      fifo.free();
    });

    it('should reset FIFO (with sync write)', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      // Write samples
      const buffer = Buffer.alloc(200 * 2 * 2); // 200 samples
      fifo.writeSync(buffer, 200);
      assert.equal(fifo.size, 200, 'Should have 200 samples');

      // Reset
      fifo.reset();
      assert.equal(fifo.size, 0, 'Should be empty after reset');

      // Should be able to write again
      fifo.writeSync(buffer, 100);
      assert.equal(fifo.size, 100, 'Should accept new samples after reset');

      fifo.free();
    });
  });

  describe('Reallocation', () => {
    it('should manually reallocate FIFO', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 100);

      const initialSpace = fifo.space;
      assert.ok(initialSpace >= 100, 'Should have at least initial space');

      // Reallocate to larger size
      const ret = fifo.realloc(1000);
      assert.equal(ret, 0, 'Should reallocate successfully');
      assert.ok(fifo.space >= 1000, 'Should have increased space');

      fifo.free();
    });

    it('should auto-reallocate on write when needed (async)', async () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16);

      // Start with small FIFO
      fifo.alloc(AV_SAMPLE_FMT_S16, channels, 50);

      // Write more than initial capacity
      const largeBuffer = Buffer.alloc(200 * channels * bytesPerSample);
      const written = await fifo.write(largeBuffer, 200);
      assert.equal(written, 200, 'Should write all with auto-reallocation');
      assert.equal(fifo.size, 200, 'Should contain all written samples');

      fifo.free();
    });

    it('should auto-reallocate on write when needed (sync)', () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16);

      // Start with small FIFO
      fifo.alloc(AV_SAMPLE_FMT_S16, channels, 50);

      // Write more than initial capacity
      const largeBuffer = Buffer.alloc(200 * channels * bytesPerSample);
      const written = fifo.writeSync(largeBuffer, 200);
      assert.equal(written, 200, 'Should write all with auto-reallocation');
      assert.equal(fifo.size, 200, 'Should contain all written samples');

      fifo.free();
    });
  });

  describe('Multi-channel Support', () => {
    it('should handle mono audio', async () => {
      const fifo = new AudioFifo();
      const channels = 1;
      const nbSamples = 128;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16);

      fifo.alloc(AV_SAMPLE_FMT_S16, channels, 512);

      const buffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      const written = await fifo.write(buffer, nbSamples);
      assert.equal(written, nbSamples, 'Should write mono samples');

      const readBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      const read = await fifo.read(readBuffer, nbSamples);
      assert.equal(read, nbSamples, 'Should read mono samples');

      fifo.free();
    });

    it('should handle 5.1 surround (6 channels)', async () => {
      const fifo = new AudioFifo();
      const channels = 6;
      const nbSamples = 64;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_FLTP);

      fifo.alloc(AV_SAMPLE_FMT_FLTP, channels, 256);

      // Create 6 channel buffers for planar format
      const buffers: Buffer[] = [];
      for (let ch = 0; ch < channels; ch++) {
        const buf = Buffer.alloc(nbSamples * bytesPerSample);
        for (let i = 0; i < nbSamples; i++) {
          buf.writeFloatLE(i * (ch + 1) * 0.1, i * bytesPerSample);
        }
        buffers.push(buf);
      }

      const written = await fifo.write(buffers, nbSamples);
      assert.equal(written, nbSamples, 'Should write 5.1 samples');

      // Read back
      const readBuffers: Buffer[] = [];
      for (let ch = 0; ch < channels; ch++) {
        readBuffers.push(Buffer.alloc(nbSamples * bytesPerSample));
      }
      const read = await fifo.read(readBuffers, nbSamples);
      assert.equal(read, nbSamples, 'Should read 5.1 samples');

      // Verify each channel
      for (let ch = 0; ch < channels; ch++) {
        assert.deepEqual(readBuffers[ch], buffers[ch], `Channel ${ch} should match`);
      }

      fifo.free();
    });

    it('should handle 7.1 surround (8 channels)', async () => {
      const fifo = new AudioFifo();
      const channels = 8;
      const nbSamples = 32;
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16P);

      fifo.alloc(AV_SAMPLE_FMT_S16P, channels, 128);

      // Create 8 channel buffers
      const buffers: Buffer[] = [];
      for (let ch = 0; ch < channels; ch++) {
        const buf = Buffer.alloc(nbSamples * bytesPerSample);
        for (let i = 0; i < nbSamples; i++) {
          buf.writeInt16LE(i * (ch + 1), i * bytesPerSample);
        }
        buffers.push(buf);
      }

      const written = await fifo.write(buffers, nbSamples);
      assert.equal(written, nbSamples, 'Should write 7.1 samples');
      assert.equal(fifo.size, nbSamples, 'Should have correct size');

      fifo.free();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single sample operations', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      const buffer = Buffer.alloc(1 * 2 * 2); // 1 sample, stereo, S16
      buffer.writeInt16LE(1000, 0);
      buffer.writeInt16LE(2000, 2);

      const written = await fifo.write(buffer, 1);
      assert.equal(written, 1, 'Should write single sample');
      assert.equal(fifo.size, 1, 'Should have 1 sample');

      const readBuffer = Buffer.alloc(1 * 2 * 2);
      const read = await fifo.read(readBuffer, 1);
      assert.equal(read, 1, 'Should read single sample');
      assert.deepEqual(readBuffer, buffer, 'Single sample should match');

      fifo.free();
    });

    it('should handle very large buffers', async () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const nbSamples = 10000; // Large number of samples
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16);

      fifo.alloc(AV_SAMPLE_FMT_S16, channels, 100); // Start small

      const largeBuffer = Buffer.alloc(nbSamples * channels * bytesPerSample);
      const written = await fifo.write(largeBuffer, nbSamples);
      assert.equal(written, nbSamples, 'Should write large buffer');
      assert.equal(fifo.size, nbSamples, 'Should contain all samples');

      fifo.free();
    });

    it('should handle drain more than available', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      const buffer = Buffer.alloc(50 * 2 * 2);
      await fifo.write(buffer, 50);
      assert.equal(fifo.size, 50, 'Should have 50 samples');

      // Try to drain more than available
      fifo.drain(100);
      assert.equal(fifo.size, 0, 'Should be empty (drained all available)');

      fifo.free();
    });

    it('should handle consecutive operations', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      // Multiple write-read cycles
      for (let cycle = 0; cycle < 5; cycle++) {
        const samples = (cycle + 1) * 10;
        const buffer = Buffer.alloc(samples * 2 * 2);

        await fifo.write(buffer, samples);
        assert.equal(fifo.size, samples, `Cycle ${cycle}: should have ${samples} samples`);

        const readBuffer = Buffer.alloc(samples * 2 * 2);
        await fifo.read(readBuffer, samples);
        assert.equal(fifo.size, 0, `Cycle ${cycle}: should be empty`);
      }

      fifo.free();
    });
  });

  describe('Buffer Count Validation', () => {
    it('should throw TypeError for too few plane buffers on planar FIFO (sync)', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_FLTP, 2, 512);

      const buffer = Buffer.alloc(128 * 4);
      assert.throws(() => fifo.writeSync([buffer], 128), TypeError, 'writeSync should throw TypeError for missing plane buffer');
      assert.throws(() => fifo.readSync([buffer], 128), TypeError, 'readSync should throw TypeError for missing plane buffer');
      assert.throws(() => fifo.peekSync([buffer], 128), TypeError, 'peekSync should throw TypeError for missing plane buffer');

      fifo.free();
    });

    it('should reject with TypeError for too few plane buffers on planar FIFO (async)', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_FLTP, 2, 512);

      const buffer = Buffer.alloc(128 * 4);
      await assert.rejects(fifo.write([buffer], 128), TypeError, 'write should reject with TypeError for missing plane buffer');
      await assert.rejects(fifo.read([buffer], 128), TypeError, 'read should reject with TypeError for missing plane buffer');
      await assert.rejects(fifo.peek([buffer], 128), TypeError, 'peek should reject with TypeError for missing plane buffer');

      fifo.free();
    });

    it('should throw TypeError for single buffer on multi-channel planar FIFO', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_FLTP, 2, 512);

      const buffer = Buffer.alloc(128 * 4 * 2);
      assert.throws(() => fifo.writeSync(buffer, 128), TypeError, 'Single interleaved buffer should be rejected on planar FIFO');
      await assert.rejects(fifo.write(buffer, 128), TypeError, 'Single interleaved buffer should be rejected on planar FIFO (async)');

      fifo.free();
    });

    it('should throw TypeError for too many plane buffers on planar FIFO', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_FLTP, 2, 512);

      const buffers = [Buffer.alloc(128 * 4), Buffer.alloc(128 * 4), Buffer.alloc(128 * 4)];
      assert.throws(() => fifo.writeSync(buffers, 128), TypeError, 'writeSync should throw TypeError for extra plane buffer');
      await assert.rejects(fifo.write(buffers, 128), TypeError, 'write should reject with TypeError for extra plane buffer');

      fifo.free();
    });

    it('should still accept the correct plane buffer count on planar FIFO', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_FLTP, 2, 512);

      const left = Buffer.alloc(128 * 4);
      const right = Buffer.alloc(128 * 4);
      const written = fifo.writeSync([left, right], 128);
      assert.equal(written, 128, 'Should write with correct plane buffer count');

      const read = await fifo.read([left, right], 128);
      assert.equal(read, 128, 'Should read with correct plane buffer count');

      fifo.free();
    });

    it('should throw TypeError for buffer array mismatch on interleaved FIFO', async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);

      const buffer = Buffer.alloc(128 * 2 * 2);
      const buffers = [buffer, Buffer.alloc(128 * 2 * 2)];
      assert.throws(() => fifo.writeSync(buffers, 128), TypeError, 'writeSync should throw TypeError for multiple buffers on interleaved FIFO');
      await assert.rejects(fifo.write(buffers, 128), TypeError, 'write should reject with TypeError for multiple buffers on interleaved FIFO');

      // Interleaved formats need exactly one buffer - both forms are accepted
      const written = fifo.writeSync(buffer, 128);
      assert.equal(written, 128, 'Single buffer should work on interleaved FIFO');
      const written2 = await fifo.write([buffer], 128);
      assert.equal(written2, 128, 'Single-element array should work on interleaved FIFO');

      fifo.free();
    });

    it('should validate against channel count for planar mono FIFO', () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_FLTP, 1, 512);

      const buffer = Buffer.alloc(128 * 4);
      // Mono planar needs exactly one buffer - both forms are accepted
      assert.equal(fifo.writeSync(buffer, 128), 128, 'Single buffer should work on mono planar FIFO');
      assert.equal(fifo.writeSync([buffer], 128), 128, 'Single-element array should work on mono planar FIFO');
      assert.throws(() => fifo.writeSync([buffer, buffer], 128), TypeError, 'Two buffers should be rejected on mono planar FIFO');

      fifo.free();
    });
  });

  describe('Memory Management', () => {
    it('should handle multiple allocations', () => {
      const fifo = new AudioFifo();

      // First allocation
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 512);
      assert.ok(fifo.space >= 512, 'Should allocate first time');
      fifo.free();

      // Second allocation
      fifo.alloc(AV_SAMPLE_FMT_FLTP, 6, 1024);
      assert.ok(fifo.space >= 1024, 'Should allocate second time');
      fifo.free();

      assert.ok(true, 'Should handle multiple allocations');
    });

    it('should clean up on FIFO replacement', () => {
      const fifo = new AudioFifo();

      // First FIFO
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 256);
      assert.ok(fifo.space >= 256, 'Should allocate first FIFO');

      // Replace with new FIFO (should free old one internally)
      fifo.alloc(AV_SAMPLE_FMT_FLT, 4, 512);
      assert.ok(fifo.space >= 512, 'Should allocate new FIFO');

      fifo.free();
      assert.ok(true, 'Should replace FIFO cleanly');
    });

    it('should not crash when free() races in-flight async operations', { timeout: 10000 }, async () => {
      const fifo = new AudioFifo();
      fifo.alloc(AV_SAMPLE_FMT_S16, 2, 1024);

      const nbSamples = 64;
      const buffer = Buffer.alloc(nbSamples * 2 * avGetBytesPerSample(AV_SAMPLE_FMT_S16));
      // Queue a burst of async writes, then free while they may still be on
      // the threadpool - free() waits for in-flight operations (previously a
      // use-after-free)
      const pending = Array.from({ length: 16 }, async () => fifo.write(buffer, nbSamples));
      fifo.free();

      const results = await Promise.allSettled(pending);
      for (const r of results) {
        assert.notEqual(r.status, undefined);
      }
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle real-time audio buffering', async () => {
      const fifo = new AudioFifo();
      const channels = 2;
      const frameSize = 1024; // Typical audio frame size
      const bytesPerSample = avGetBytesPerSample(AV_SAMPLE_FMT_S16);

      fifo.alloc(AV_SAMPLE_FMT_S16, channels, frameSize * 4); // Buffer for 4 frames

      // Simulate producer-consumer pattern
      const frame1 = Buffer.alloc(frameSize * channels * bytesPerSample);
      const frame2 = Buffer.alloc(frameSize * channels * bytesPerSample);

      // Producer writes frames
      await fifo.write(frame1, frameSize);
      await fifo.write(frame2, frameSize);
      assert.equal(fifo.size, frameSize * 2, 'Should buffer 2 frames');

      // Consumer reads one frame
      const consumeBuffer = Buffer.alloc(frameSize * channels * bytesPerSample);
      await fifo.read(consumeBuffer, frameSize);
      assert.equal(fifo.size, frameSize, 'Should have 1 frame left');

      // Producer adds another frame
      await fifo.write(frame1, frameSize);
      assert.equal(fifo.size, frameSize * 2, 'Should buffer 2 frames again');

      fifo.free();
    });

    it('should handle resampling buffer scenario', async () => {
      const fifo = new AudioFifo();

      // Resampling often produces variable output sizes
      // FIFO helps buffer these variations
      fifo.alloc(AV_SAMPLE_FMT_FLTP, 2, 4096);

      // Simulate variable-sized outputs from resampler
      const sizes = [940, 941, 940, 941, 940]; // Common with 44.1kHz -> 48kHz

      for (const size of sizes) {
        const buffers = [
          Buffer.alloc(size * 4), // Left channel
          Buffer.alloc(size * 4), // Right channel
        ];
        await fifo.write(buffers, size);
      }

      const totalSamples = sizes.reduce((a, b) => a + b, 0);
      assert.equal(fifo.size, totalSamples, 'Should accumulate all samples');

      // Read fixed-size frames
      const fixedFrameSize = 1024;
      while (fifo.size >= fixedFrameSize) {
        const readBuffers = [Buffer.alloc(fixedFrameSize * 4), Buffer.alloc(fixedFrameSize * 4)];
        const read = await fifo.read(readBuffers, fixedFrameSize);
        assert.equal(read, fixedFrameSize, 'Should read fixed frame size');
      }

      assert.ok(fifo.size < fixedFrameSize, 'Should have remainder less than frame size');

      fifo.free();
    });
  });
});
