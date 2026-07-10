import assert from 'node:assert';
import { once } from 'node:events';
import { Readable, Writable } from 'node:stream';
import { describe, it } from 'node:test';

import { AVERROR_EIO, AVSEEK_CUR, AVSEEK_END, AVSEEK_SET, IOStream } from '../src/index.js';

describe('IOStream', () => {
  describe('create with Buffer', () => {
    it('should create IOContext from Buffer', async () => {
      const buffer = Buffer.from('test data');
      const ioContext = IOStream.create(buffer);

      assert.ok(ioContext, 'Should create IOContext');

      // Test read operation
      const result = await ioContext.read(4);
      assert.ok(Buffer.isBuffer(result), 'Should return a Buffer');
      assert.equal(result.length, 4);
      assert.equal(result.toString(), 'test');

      // Cleanup
      ioContext.freeContext();
    });

    it('should handle seek operations on Buffer', async () => {
      const buffer = Buffer.from('0123456789');
      const ioContext = IOStream.create(buffer);

      // Seek to position 5
      const seekPos = await ioContext.seek(5n, AVSEEK_SET);
      assert.equal(seekPos, 5n);

      // Read from new position
      const result = await ioContext.read(3);
      assert.ok(Buffer.isBuffer(result), 'Should return a Buffer');
      assert.equal(result.length, 3);
      assert.equal(result.toString(), '567');

      ioContext.freeContext();
    });
  });

  describe('create with custom callbacks', () => {
    it('should create IOContext with custom callbacks', async () => {
      const data = Buffer.from('custom data source');
      let position = 0;

      const ioContext = IOStream.create({
        read: (size) => {
          if (position >= data.length) return null;
          const chunk = data.subarray(position, position + size);
          position += chunk.length;
          return chunk;
        },
        seek: (offset, whence) => {
          if (whence === AVSEEK_SET) position = Number(offset);
          else if (whence === AVSEEK_CUR) position += Number(offset);
          else if (whence === AVSEEK_END) position = data.length + Number(offset);
          return BigInt(position);
        },
      });

      assert.ok(ioContext, 'Should create IOContext');

      // Read data
      const result = await ioContext.read(6);
      assert.ok(Buffer.isBuffer(result), 'Should return a Buffer');
      assert.equal(result.length, 6);
      assert.equal(result.toString(), 'custom');

      // Seek and read again
      await ioContext.seek(7n, AVSEEK_SET);
      const result2 = await ioContext.read(4);
      assert.ok(Buffer.isBuffer(result2), 'Should return a Buffer');
      assert.equal(result2.length, 4);
      assert.equal(result2.toString(), 'data');

      ioContext.freeContext();
    });

    it('should validate callbacks', () => {
      // Should throw for invalid input type
      assert.throws(() => IOStream.create(123 as any), /Invalid input type/);

      // Should throw without read callback (empty object is invalid input)
      assert.throws(() => IOStream.create({} as any), /Invalid input type/);

      // Should throw when read callback is missing - but this is also treated as invalid input
      // because we only check for 'read' property to identify IOInputCallbacks
      const invalidCallbacks = { seek: () => 0n } as any;
      assert.throws(() => IOStream.create(invalidCallbacks), /Invalid input type/);
    });
  });

  describe('create with Readable stream', () => {
    it('should surface a stream error as a read error, not EOF', { timeout: 5000 }, async () => {
      const readable = new Readable({ read() {} });
      const ioContext = IOStream.create(readable);

      try {
        readable.push(Buffer.from('0123456789'));

        // Data pushed before the error still drains normally
        const first = await ioContext.read(4);
        assert.ok(Buffer.isBuffer(first), 'Should read buffered data');

        readable.destroy(new Error('simulated stream failure'));
        // Not events.once(): that would reject as soon as 'error' fires
        await new Promise<void>((resolve) => readable.once('close', () => resolve()));

        // Drain whatever is still buffered, then expect the error code
        let result: Buffer | number;
        do {
          result = await ioContext.read(64);
        } while (Buffer.isBuffer(result) && result.length > 0);

        assert.equal(result, AVERROR_EIO, 'Should return AVERROR_EIO for a failed stream, not clean EOF');
      } finally {
        // Leaked callback contexts would keep the process alive
        ioContext.freeContext();
      }
    });

    it('should remove stream listeners when the I/O context is freed early', () => {
      const readable = new Readable({ read() {} });
      const ioContext = IOStream.create(readable);

      assert.ok(readable.listenerCount('readable') > 0, 'Should attach listeners on create');

      // Free without ever reaching EOF (e.g. demuxer closed early)
      ioContext.freeContext();

      assert.equal(readable.listenerCount('readable'), 0, 'readable listener should be removed');
      assert.equal(readable.listenerCount('end'), 0, 'end listener should be removed');
      assert.equal(readable.listenerCount('error'), 0, 'error listener should be removed');
      assert.equal(readable.listenerCount('close'), 0, 'close listener should be removed');
    });
  });

  describe('createOutput with Writable stream', () => {
    it('should fail the write instead of hanging when the stream is destroyed while awaiting drain', { timeout: 5000 }, async () => {
      const writable = new Writable({
        highWaterMark: 1,
        write() {
          // Never call the callback - a stalled sink keeps backpressure active
        },
      });

      const ioContext = IOStream.createOutput(writable, { bufferSize: 16 });

      // Larger than bufferSize, so avio writes through and parks on 'drain'
      const writePromise = ioContext.write(Buffer.alloc(1024));
      setTimeout(() => writable.destroy(), 50);
      await writePromise;

      assert.ok(ioContext.error < 0, 'IO context should record a write error after destroy');

      ioContext.freeContext();
    });

    it('should fail writes to an already destroyed stream', async () => {
      const writable = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });
      writable.destroy();
      await once(writable, 'close');

      const ioContext = IOStream.createOutput(writable, { bufferSize: 16 });

      await ioContext.write(Buffer.alloc(64));
      assert.ok(ioContext.error < 0, 'Write to a destroyed stream should record an error');

      ioContext.freeContext();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty Buffer', async () => {
      const buffer = Buffer.alloc(0);
      const ioContext = IOStream.create(buffer);

      const result = await ioContext.read(10);
      // Empty buffer might return error code or empty buffer
      if (Buffer.isBuffer(result)) {
        assert.equal(result.length, 0, 'Should read 0 bytes from empty buffer');
      } else {
        assert.ok(result < 0, 'Should return error code for empty buffer');
      }

      ioContext.freeContext();
    });

    it('should handle EOF correctly', async () => {
      const buffer = Buffer.from('short');
      const ioContext = IOStream.create(buffer);

      // Read all data
      const result = await ioContext.read(10);
      assert.ok(Buffer.isBuffer(result), 'Should return a Buffer');
      assert.equal(result.length, 5);

      // Try to read again (should return error or empty buffer for EOF)
      const result2 = await ioContext.read(10);
      if (Buffer.isBuffer(result2)) {
        assert.equal(result2.length, 0, 'Should return empty buffer at EOF');
      } else {
        assert.ok(result2 < 0, 'Should return error code at EOF');
      }

      ioContext.freeContext();
    });
  });
});
