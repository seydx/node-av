import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AV_FIFO_FLAG_AUTO_GROW, Fifo } from '../src/index.js';
import { prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

describe('Fifo', () => {
  describe('Creation and Lifecycle', () => {
    it('should create a new Fifo', () => {
      const fifo = new Fifo();
      assert.ok(fifo instanceof Fifo, 'Should create Fifo instance');
    });

    it('should allocate FIFO with fixed size', () => {
      const fifo = new Fifo();
      fifo.alloc(100, 4); // 100 elements of 4 bytes each
      assert.ok(fifo, 'Should allocate FIFO');
      assert.equal(fifo.canRead, 0, 'Should start empty');
      assert.ok(fifo.canWrite >= 100, 'Should have at least initial space');
      assert.equal(fifo.elemSize, 4, 'Should have correct element size');
      fifo.free();
    });

    it('should allocate FIFO with auto-grow flag', () => {
      const fifo = new Fifo();
      fifo.alloc(50, 8, AV_FIFO_FLAG_AUTO_GROW);
      assert.ok(fifo, 'Should allocate FIFO with auto-grow');
      assert.equal(fifo.canRead, 0, 'Should start empty');
      assert.ok(fifo.canWrite >= 50, 'Should have at least initial space');
      assert.equal(fifo.elemSize, 8, 'Should have correct element size');
      fifo.free();
    });

    it('should free FIFO', () => {
      const fifo = new Fifo();
      fifo.alloc(100, 4);
      fifo.free();
      // FIFO is now freed - no crash should occur
      assert.ok(true, 'Should free without error');
    });

    it('should support Symbol.dispose', () => {
      const fifo = new Fifo();
      fifo.alloc(100, 4);

      if (typeof fifo[Symbol.dispose] === 'function') {
        fifo[Symbol.dispose]();
      }
      assert.ok(true, 'Should dispose without error');
    });

    it('should handle multiple free calls safely', () => {
      const fifo = new Fifo();
      fifo.alloc(100, 4);
      fifo.free();
      fifo.free(); // Should not crash
      assert.ok(true, 'Should handle multiple free calls');
    });
  });

  describe('Element Size Support', () => {
    const elemSizes = [1, 2, 4, 8, 16, 32, 64];

    elemSizes.forEach((elemSize) => {
      it(`should handle ${elemSize}-byte elements`, () => {
        const fifo = new Fifo();
        fifo.alloc(100, elemSize);

        assert.ok(fifo, `Should allocate with ${elemSize}-byte elements`);
        assert.equal(fifo.elemSize, elemSize, 'Should have correct element size');

        fifo.free();
      });
    });
  });

  describe('Write and Read Operations', () => {
    it('should write and read elements (async)', async () => {
      const fifo = new Fifo();
      const elemSize = 4;
      const nbElems = 10;

      fifo.alloc(50, elemSize);

      // Create test data (10 32-bit integers)
      const writeBuffer = Buffer.alloc(nbElems * elemSize);
      for (let i = 0; i < nbElems; i++) {
        writeBuffer.writeUInt32LE(i * 100, i * elemSize);
      }

      // Write elements
      const written = await fifo.write(writeBuffer, nbElems);
      assert.equal(written, nbElems, 'Should write all elements');
      assert.equal(fifo.canRead, nbElems, 'canRead should reflect written elements');

      // Read elements back
      const readBuffer = Buffer.alloc(nbElems * elemSize);
      const read = await fifo.read(readBuffer, nbElems);
      assert.equal(read, nbElems, 'Should read all elements');
      assert.equal(fifo.canRead, 0, 'FIFO should be empty after reading');

      // Verify data
      assert.deepEqual(readBuffer, writeBuffer, 'Read data should match written data');

      fifo.free();
    });

    it('should write and read elements (sync)', () => {
      const fifo = new Fifo();
      const elemSize = 4;
      const nbElems = 10;

      fifo.alloc(50, elemSize);

      // Create test data (10 32-bit integers)
      const writeBuffer = Buffer.alloc(nbElems * elemSize);
      for (let i = 0; i < nbElems; i++) {
        writeBuffer.writeUInt32LE(i * 100, i * elemSize);
      }

      // Write elements
      const written = fifo.writeSync(writeBuffer, nbElems);
      assert.equal(written, nbElems, 'Should write all elements');
      assert.equal(fifo.canRead, nbElems, 'canRead should reflect written elements');

      // Read elements back
      const readBuffer = Buffer.alloc(nbElems * elemSize);
      const read = fifo.readSync(readBuffer, nbElems);
      assert.equal(read, nbElems, 'Should read all elements');
      assert.equal(fifo.canRead, 0, 'FIFO should be empty after reading');

      // Verify data
      assert.deepEqual(readBuffer, writeBuffer, 'Read data should match written data');

      fifo.free();
    });

    it('should handle partial writes and reads (async)', async () => {
      const fifo = new Fifo();
      const elemSize = 4;

      fifo.alloc(50, elemSize); // Small FIFO

      // Write data
      const writeBuffer = Buffer.alloc(100 * elemSize); // 100 elements
      for (let i = 0; i < 100; i++) {
        writeBuffer.writeUInt32LE(i, i * elemSize);
      }
      const written = await fifo.write(writeBuffer, 100);
      assert.ok(written <= 100, 'Should write up to capacity or auto-grow');

      if (written === 100) {
        // Read part of the data
        const partialBuffer = Buffer.alloc(30 * elemSize);
        const read1 = await fifo.read(partialBuffer, 30);
        assert.equal(read1, 30, 'Should read 30 elements');
        assert.equal(fifo.canRead, 70, 'Should have 70 elements left');

        // Read another part
        const read2 = await fifo.read(partialBuffer, 30);
        assert.equal(read2, 30, 'Should read another 30 elements');
        assert.equal(fifo.canRead, 40, 'Should have 40 elements left');
      }

      fifo.free();
    });

    it('should handle partial writes and reads (sync)', () => {
      const fifo = new Fifo();
      const elemSize = 4;

      fifo.alloc(50, elemSize); // Small FIFO

      // Write data
      const writeBuffer = Buffer.alloc(100 * elemSize); // 100 elements
      for (let i = 0; i < 100; i++) {
        writeBuffer.writeUInt32LE(i, i * elemSize);
      }
      const written = fifo.writeSync(writeBuffer, 100);
      assert.ok(written <= 100, 'Should write up to capacity or auto-grow');

      if (written === 100) {
        // Read part of the data
        const partialBuffer = Buffer.alloc(30 * elemSize);
        const read1 = fifo.readSync(partialBuffer, 30);
        assert.equal(read1, 30, 'Should read 30 elements');
        assert.equal(fifo.canRead, 70, 'Should have 70 elements left');

        // Read another part
        const read2 = fifo.readSync(partialBuffer, 30);
        assert.equal(read2, 30, 'Should read another 30 elements');
        assert.equal(fifo.canRead, 40, 'Should have 40 elements left');
      }

      fifo.free();
    });

    it('should handle writing zero elements (async)', async () => {
      const fifo = new Fifo();
      fifo.alloc(100, 4);

      const buffer = Buffer.alloc(0);
      const written = await fifo.write(buffer, 0);
      assert.equal(written, 0, 'Should handle zero elements write');
      assert.equal(fifo.canRead, 0, 'canRead should remain 0');

      fifo.free();
    });

    it('should handle writing zero elements (sync)', () => {
      const fifo = new Fifo();
      fifo.alloc(100, 4);

      const buffer = Buffer.alloc(0);
      const written = fifo.writeSync(buffer, 0);
      assert.equal(written, 0, 'Should handle zero elements write');
      assert.equal(fifo.canRead, 0, 'canRead should remain 0');

      fifo.free();
    });

    it('should handle reading from empty FIFO (async)', async () => {
      const fifo = new Fifo();
      fifo.alloc(100, 4);

      const buffer = Buffer.alloc(10 * 4);
      const read = await fifo.read(buffer, 10);
      assert.equal(read, 0, 'Should read 0 elements from empty FIFO');

      fifo.free();
    });

    it('should handle reading from empty FIFO (sync)', () => {
      const fifo = new Fifo();
      fifo.alloc(100, 4);

      const buffer = Buffer.alloc(10 * 4);
      const read = fifo.readSync(buffer, 10);
      assert.equal(read, 0, 'Should read 0 elements from empty FIFO');

      fifo.free();
    });
  });

  describe('Peek Operation', () => {
    it('should peek without removing elements (async)', async () => {
      const fifo = new Fifo();
      const elemSize = 4;
      const nbElems = 20;

      fifo.alloc(100, elemSize);

      // Write test data
      const writeBuffer = Buffer.alloc(nbElems * elemSize);
      for (let i = 0; i < nbElems; i++) {
        writeBuffer.writeUInt32LE(i * 10, i * elemSize);
      }
      await fifo.write(writeBuffer, nbElems);

      // Peek at the data
      const peekBuffer = Buffer.alloc(nbElems * elemSize);
      const peeked = await fifo.peek(peekBuffer, nbElems);
      assert.equal(peeked, nbElems, 'Should peek all elements');
      assert.equal(fifo.canRead, nbElems, 'canRead should remain unchanged after peek');

      // Verify peeked data matches written data
      assert.deepEqual(peekBuffer, writeBuffer, 'Peeked data should match written data');

      // Read the data (should be the same)
      const readBuffer = Buffer.alloc(nbElems * elemSize);
      const read = await fifo.read(readBuffer, nbElems);
      assert.equal(read, nbElems, 'Should read all elements');
      assert.equal(fifo.canRead, 0, 'FIFO should be empty after reading');
      assert.deepEqual(readBuffer, writeBuffer, 'Read data should match written data');

      fifo.free();
    });

    it('should peek without removing elements (sync)', () => {
      const fifo = new Fifo();
      const elemSize = 4;
      const nbElems = 20;

      fifo.alloc(100, elemSize);

      // Write test data
      const writeBuffer = Buffer.alloc(nbElems * elemSize);
      for (let i = 0; i < nbElems; i++) {
        writeBuffer.writeUInt32LE(i * 10, i * elemSize);
      }
      fifo.writeSync(writeBuffer, nbElems);

      // Peek at the data
      const peekBuffer = Buffer.alloc(nbElems * elemSize);
      const peeked = fifo.peekSync(peekBuffer, nbElems);
      assert.equal(peeked, nbElems, 'Should peek all elements');
      assert.equal(fifo.canRead, nbElems, 'canRead should remain unchanged after peek');

      // Verify peeked data matches written data
      assert.deepEqual(peekBuffer, writeBuffer, 'Peeked data should match written data');

      // Read the data (should be the same)
      const readBuffer = Buffer.alloc(nbElems * elemSize);
      const read = fifo.readSync(readBuffer, nbElems);
      assert.equal(read, nbElems, 'Should read all elements');
      assert.equal(fifo.canRead, 0, 'FIFO should be empty after reading');
      assert.deepEqual(readBuffer, writeBuffer, 'Read data should match written data');

      fifo.free();
    });

    it('should peek with offset (async)', async () => {
      const fifo = new Fifo();
      const elemSize = 4;
      const nbElems = 20;

      fifo.alloc(100, elemSize);

      // Write test data
      const writeBuffer = Buffer.alloc(nbElems * elemSize);
      for (let i = 0; i < nbElems; i++) {
        writeBuffer.writeUInt32LE(i, i * elemSize);
      }
      await fifo.write(writeBuffer, nbElems);

      // Peek at offset 5 (skip first 5 elements)
      const peekBuffer = Buffer.alloc(10 * elemSize);
      const peeked = await fifo.peek(peekBuffer, 10, 5);
      assert.equal(peeked, 10, 'Should peek 10 elements from offset');
      assert.equal(fifo.canRead, nbElems, 'canRead should remain unchanged');

      // Verify peeked data starts from element 5
      for (let i = 0; i < 10; i++) {
        const expected = i + 5;
        const actual = peekBuffer.readUInt32LE(i * elemSize);
        assert.equal(actual, expected, `Element ${i} should be ${expected}`);
      }

      fifo.free();
    });

    it('should peek with offset (sync)', () => {
      const fifo = new Fifo();
      const elemSize = 4;
      const nbElems = 20;

      fifo.alloc(100, elemSize);

      // Write test data
      const writeBuffer = Buffer.alloc(nbElems * elemSize);
      for (let i = 0; i < nbElems; i++) {
        writeBuffer.writeUInt32LE(i, i * elemSize);
      }
      fifo.writeSync(writeBuffer, nbElems);

      // Peek at offset 5 (skip first 5 elements)
      const peekBuffer = Buffer.alloc(10 * elemSize);
      const peeked = fifo.peekSync(peekBuffer, 10, 5);
      assert.equal(peeked, 10, 'Should peek 10 elements from offset');
      assert.equal(fifo.canRead, nbElems, 'canRead should remain unchanged');

      // Verify peeked data starts from element 5
      for (let i = 0; i < 10; i++) {
        const expected = i + 5;
        const actual = peekBuffer.readUInt32LE(i * elemSize);
        assert.equal(actual, expected, `Element ${i} should be ${expected}`);
      }

      fifo.free();
    });
  });

  describe('Reset Operation', () => {
    it('should reset FIFO (async)', async () => {
      const fifo = new Fifo();
      const elemSize = 4;

      fifo.alloc(100, elemSize);

      // Write elements
      const buffer = Buffer.alloc(50 * elemSize);
      await fifo.write(buffer, 50);
      assert.equal(fifo.canRead, 50, 'Should have 50 elements');

      // Reset
      fifo.reset();
      assert.equal(fifo.canRead, 0, 'Should be empty after reset');

      // Should be able to write again
      await fifo.write(buffer, 30);
      assert.equal(fifo.canRead, 30, 'Should accept new elements after reset');

      fifo.free();
    });

    it('should reset FIFO (sync)', () => {
      const fifo = new Fifo();
      const elemSize = 4;

      fifo.alloc(100, elemSize);

      // Write elements
      const buffer = Buffer.alloc(50 * elemSize);
      fifo.writeSync(buffer, 50);
      assert.equal(fifo.canRead, 50, 'Should have 50 elements');

      // Reset
      fifo.reset();
      assert.equal(fifo.canRead, 0, 'Should be empty after reset');

      // Should be able to write again
      fifo.writeSync(buffer, 30);
      assert.equal(fifo.canRead, 30, 'Should accept new elements after reset');

      fifo.free();
    });
  });

  describe('Grow Operation', () => {
    it('should manually grow FIFO', () => {
      const fifo = new Fifo();
      fifo.alloc(50, 4);

      const initialCanWrite = fifo.canWrite;
      assert.ok(initialCanWrite >= 50, 'Should have at least initial space');

      // Grow by 100 elements
      const ret = fifo.grow(100);
      assert.equal(ret, 0, 'Should grow successfully');
      assert.ok(fifo.canWrite >= initialCanWrite + 100, 'Should have increased space');

      fifo.free();
    });

    it('should grow multiple times', () => {
      const fifo = new Fifo();
      fifo.alloc(10, 8);

      let previousCanWrite = fifo.canWrite;

      // Grow three times
      for (let i = 0; i < 3; i++) {
        const ret = fifo.grow(20);
        assert.equal(ret, 0, `Growth ${i + 1} should succeed`);
        assert.ok(fifo.canWrite > previousCanWrite, `Should have more space after growth ${i + 1}`);
        previousCanWrite = fifo.canWrite;
      }

      fifo.free();
    });
  });

  describe('Auto-Grow with Limit', () => {
    it('should auto-grow FIFO (async)', async () => {
      const fifo = new Fifo();
      const elemSize = 4;

      // Allocate small FIFO with auto-grow
      fifo.alloc(10, elemSize, AV_FIFO_FLAG_AUTO_GROW);
      fifo.setAutoGrowLimit(1000); // Set limit to 1000 elements

      // Write more than initial capacity
      const largeBuffer = Buffer.alloc(100 * elemSize);
      for (let i = 0; i < 100; i++) {
        largeBuffer.writeUInt32LE(i, i * elemSize);
      }

      const written = await fifo.write(largeBuffer, 100);
      assert.equal(written, 100, 'Should write all elements with auto-grow');
      assert.equal(fifo.canRead, 100, 'Should contain all written elements');

      fifo.free();
    });

    it('should auto-grow FIFO (sync)', () => {
      const fifo = new Fifo();
      const elemSize = 4;

      // Allocate small FIFO with auto-grow
      fifo.alloc(10, elemSize, AV_FIFO_FLAG_AUTO_GROW);
      fifo.setAutoGrowLimit(1000); // Set limit to 1000 elements

      // Write more than initial capacity
      const largeBuffer = Buffer.alloc(100 * elemSize);
      for (let i = 0; i < 100; i++) {
        largeBuffer.writeUInt32LE(i, i * elemSize);
      }

      const written = fifo.writeSync(largeBuffer, 100);
      assert.equal(written, 100, 'Should write all elements with auto-grow');
      assert.equal(fifo.canRead, 100, 'Should contain all written elements');

      fifo.free();
    });

    it('should respect auto-grow limit (async)', async () => {
      const fifo = new Fifo();
      const elemSize = 4;

      fifo.alloc(10, elemSize, AV_FIFO_FLAG_AUTO_GROW);
      fifo.setAutoGrowLimit(50); // Limit to 50 elements

      // Try to write more than limit
      const hugeBuffer = Buffer.alloc(200 * elemSize);
      const written = await fifo.write(hugeBuffer, 200);

      // Should write up to limit or fail
      assert.ok(written <= 50, 'Should respect auto-grow limit');

      fifo.free();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single element operations', async () => {
      const fifo = new Fifo();
      const elemSize = 4;

      fifo.alloc(100, elemSize);

      const buffer = Buffer.alloc(elemSize);
      buffer.writeUInt32LE(12345, 0);

      const written = await fifo.write(buffer, 1);
      assert.equal(written, 1, 'Should write single element');
      assert.equal(fifo.canRead, 1, 'Should have 1 element');

      const readBuffer = Buffer.alloc(elemSize);
      const read = await fifo.read(readBuffer, 1);
      assert.equal(read, 1, 'Should read single element');
      assert.deepEqual(readBuffer, buffer, 'Single element should match');

      fifo.free();
    });

    it('should handle very large elements', async () => {
      const fifo = new Fifo();
      const elemSize = 256; // Large element size
      const nbElems = 10;

      fifo.alloc(50, elemSize);

      const largeElemBuffer = Buffer.alloc(nbElems * elemSize);
      const written = await fifo.write(largeElemBuffer, nbElems);
      assert.ok(written <= nbElems, 'Should handle large elements');

      fifo.free();
    });

    it('should handle consecutive operations', async () => {
      const fifo = new Fifo();
      const elemSize = 4;

      fifo.alloc(100, elemSize);

      // Multiple write-read cycles
      for (let cycle = 0; cycle < 5; cycle++) {
        const elems = (cycle + 1) * 5;
        const buffer = Buffer.alloc(elems * elemSize);

        await fifo.write(buffer, elems);
        assert.equal(fifo.canRead, elems, `Cycle ${cycle}: should have ${elems} elements`);

        const readBuffer = Buffer.alloc(elems * elemSize);
        await fifo.read(readBuffer, elems);
        assert.equal(fifo.canRead, 0, `Cycle ${cycle}: should be empty`);
      }

      fifo.free();
    });
  });

  describe('Memory Management', () => {
    it('should not crash when free() races in-flight async operations', { timeout: 10000 }, async () => {
      const fifo = new Fifo();
      fifo.alloc(1024, 4);

      const buffer = Buffer.alloc(64 * 4);
      // Queue a burst of async writes, then free while they may still be on
      // the threadpool - free() waits for in-flight operations (previously a
      // use-after-free)
      const pending = Array.from({ length: 16 }, async () => fifo.write(buffer, 64));
      fifo.free();

      const results = await Promise.allSettled(pending);
      for (const r of results) {
        assert.notEqual(r.status, undefined);
      }
    });

    it('should handle multiple allocations', () => {
      const fifo = new Fifo();

      // First allocation
      fifo.alloc(100, 4);
      assert.ok(fifo.canWrite >= 100, 'Should allocate first time');
      fifo.free();

      // Second allocation
      fifo.alloc(200, 8);
      assert.ok(fifo.canWrite >= 200, 'Should allocate second time');
      fifo.free();

      assert.ok(true, 'Should handle multiple allocations');
    });

    it('should clean up on FIFO replacement', () => {
      const fifo = new Fifo();

      // First FIFO
      fifo.alloc(50, 4);
      assert.ok(fifo.canWrite >= 50, 'Should allocate first FIFO');

      // Replace with new FIFO (should free old one internally)
      fifo.alloc(100, 8);
      assert.ok(fifo.canWrite >= 100, 'Should allocate new FIFO');
      assert.equal(fifo.elemSize, 8, 'Should have new element size');

      fifo.free();
      assert.ok(true, 'Should replace FIFO cleanly');
    });
  });

  describe('Different Data Types', () => {
    it('should handle byte data', async () => {
      const fifo = new Fifo();
      fifo.alloc(100, 1); // 1-byte elements

      const data = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      await fifo.write(data, 10);

      const readData = Buffer.alloc(10);
      await fifo.read(readData, 10);

      assert.deepEqual(readData, data, 'Byte data should match');

      fifo.free();
    });

    it('should handle 64-bit integers', async () => {
      const fifo = new Fifo();
      fifo.alloc(50, 8); // 8-byte elements

      const data = Buffer.alloc(5 * 8);
      for (let i = 0; i < 5; i++) {
        data.writeBigUInt64LE(BigInt(i * 1000000), i * 8);
      }

      await fifo.write(data, 5);

      const readData = Buffer.alloc(5 * 8);
      await fifo.read(readData, 5);

      assert.deepEqual(readData, data, '64-bit integer data should match');

      fifo.free();
    });

    it('should handle structures (16-byte)', async () => {
      const fifo = new Fifo();
      fifo.alloc(100, 16); // 16-byte elements (e.g., struct with 4 ints)

      const structs = Buffer.alloc(3 * 16);
      for (let i = 0; i < 3; i++) {
        const offset = i * 16;
        structs.writeUInt32LE(i, offset + 0);
        structs.writeUInt32LE(i * 10, offset + 4);
        structs.writeUInt32LE(i * 100, offset + 8);
        structs.writeUInt32LE(i * 1000, offset + 12);
      }

      await fifo.write(structs, 3);

      const readStructs = Buffer.alloc(3 * 16);
      await fifo.read(readStructs, 3);

      assert.deepEqual(readStructs, structs, 'Structure data should match');

      fifo.free();
    });
  });

  describe('Properties', () => {
    it('should correctly report size, canRead, canWrite, and elemSize', async () => {
      const fifo = new Fifo();
      const elemSize = 4;
      const capacity = 100;

      fifo.alloc(capacity, elemSize);

      assert.equal(fifo.size, 0, 'size should be 0 initially');
      assert.equal(fifo.canRead, 0, 'canRead should be 0 initially');
      assert.ok(fifo.canWrite >= capacity, 'canWrite should be at least capacity');
      assert.equal(fifo.elemSize, elemSize, 'elemSize should be correct');

      // Write 30 elements
      const buffer = Buffer.alloc(30 * elemSize);
      await fifo.write(buffer, 30);

      assert.equal(fifo.size, 30, 'size should be 30 after writing');
      assert.equal(fifo.canRead, 30, 'canRead should be 30 after writing');

      // Read 10 elements
      const readBuffer = Buffer.alloc(10 * elemSize);
      await fifo.read(readBuffer, 10);

      assert.equal(fifo.size, 20, 'size should be 20 after reading 10');
      assert.equal(fifo.canRead, 20, 'canRead should be 20 after reading 10');

      fifo.free();
    });
  });
});
