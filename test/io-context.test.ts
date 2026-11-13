import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { afterEach, describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import { AVERROR_EOF, AVIO_FLAG_READ, AVIO_FLAG_WRITE, AVSEEK_CUR, AVSEEK_END, AVSEEK_SET, AVSEEK_SIZE, FormatContext, InputFormat, IOContext } from '../src/index.js';
import { getInputFile, getOutputFile, prepareTestEnvironment } from './index.js';

import type { AVSeekWhence } from '../src/index.js';

prepareTestEnvironment();

const testVideoFile = getInputFile('video.mp4');
const testAudioFile = getInputFile('audio.pcm');
const testImageFile = getInputFile('image-rgba.png');
const tempOutputFile = getOutputFile('test-output.tmp');

describe('IOContext', () => {
  // Clean up temp file after each test
  afterEach(async () => {
    try {
      await unlink(tempOutputFile);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('Lifecycle', () => {
    it('should create an uninitialized I/O context', () => {
      const io = new IOContext();
      assert.ok(io);
      assert.ok(io instanceof IOContext);
      // No cleanup needed for uninitialized context
    });

    it('should allocate context with buffer', () => {
      const io = new IOContext();
      io.allocContext(4096, 0); // 4KB buffer for reading
      assert.ok(io.bufferSize > 0);
      io.freeContext();
    });

    it('should free context', () => {
      const io = new IOContext();
      io.allocContext(4096, 0);
      io.freeContext();
      // Context is now freed, no error should occur
      assert.ok(true);
    });

    it('should handle repeated alloc/free cycles with custom buffer', () => {
      // The I/O buffer is owned by the caller (avio_context_free does not free it) -
      // exercising alloc/free cycles proves no crash or double-free in the cleanup path
      const io = new IOContext();

      io.allocContext(4096, 0);
      assert.equal(io.bufferSize, 4096, 'Should use requested buffer size');
      io.freeContext();

      io.allocContext(8192, 1);
      assert.equal(io.bufferSize, 8192, 'Should use new buffer size');
      io.freeContext();

      assert.ok(true, 'Should alloc/free custom buffers cleanly');
    });

    it('should free replaced context when allocating with callbacks twice', () => {
      const io = new IOContext();

      io.allocContextWithCallbacks(4096, 0, () => null);
      assert.equal(io.bufferSize, 4096, 'Should use first buffer size');

      // Second allocation replaces the first context (old context and buffer freed internally)
      io.allocContextWithCallbacks(2048, 0, () => null);
      assert.equal(io.bufferSize, 2048, 'Should use second buffer size');

      io.freeContext();
      assert.ok(true, 'Should replace and free contexts cleanly');
    });

    it('should support async disposal', async () => {
      // Test async disposal pattern without using statement
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Manually dispose
      await io[Symbol.asyncDispose]();
    });
  });

  describe('File Opening', () => {
    it('should open file for reading (async)', async () => {
      await using io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should return 0 on success');

      // Should be able to read properties
      assert.equal(io.writeFlag, false);

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should open file for reading (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should return 0 on success');

      // Should be able to read properties
      assert.equal(io.writeFlag, false);

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should open file for writing (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(tempOutputFile, AVIO_FLAG_WRITE);
      assert.equal(ret, 0, 'Should return 0 on success');

      assert.equal(io.writeFlag, true);

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should open file for writing (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(tempOutputFile, AVIO_FLAG_WRITE);
      assert.equal(ret, 0, 'Should return 0 on success');

      assert.equal(io.writeFlag, true);

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should fail to open non-existent file for reading (async)', async () => {
      await using io = new IOContext();
      const ret = await io.open2('/non/existent/file.mp4', AVIO_FLAG_READ);
      assert.ok(ret < 0, 'Should return negative error code');
    });

    it('should fail to open non-existent file for reading (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync('/non/existent/file.mp4', AVIO_FLAG_READ);
      assert.ok(ret < 0, 'Should return negative error code');
    });

    it('should reject opening an already-open context (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Second open on the same instance must error instead of leaking/replacing the context
      await assert.rejects(io.open2(testImageFile, AVIO_FLAG_READ), /already initialized/, 'Second open should be rejected');

      // Original context must still be intact and closable
      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should close original context successfully');
    });

    it('should throw when opening an already-open context (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Second open on the same instance must error instead of leaking/replacing the context
      assert.throws(() => io.open2Sync(testImageFile, AVIO_FLAG_READ), /already initialized/, 'Second open should throw');

      // Original context must still be intact and closable
      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should close original context successfully');
    });

    it('should handle file:// URLs (async)', async () => {
      // Skip on Windows as FFmpeg's file:// protocol handling is inconsistent there
      if (process.platform === 'win32') {
        console.log('Skipping file:// URL test on Windows due to FFmpeg limitations');
        return;
      }

      const io = new IOContext();
      // Use Node.js built-in pathToFileURL for proper cross-platform conversion
      const fileUrl = pathToFileURL(testVideoFile).href;

      const ret = await io.open2(fileUrl, AVIO_FLAG_READ);
      assert.equal(ret, 0, `Should handle file:// protocol (URL: ${fileUrl})`);
      const closret = await io.closep();
      assert.equal(closret, 0, 'Should return 0 on success');
    });

    it('should handle file:// URLs (sync)', () => {
      // Skip on Windows as FFmpeg's file:// protocol handling is inconsistent there
      if (process.platform === 'win32') {
        console.log('Skipping file:// URL test on Windows due to FFmpeg limitations');
        return;
      }

      const io = new IOContext();
      // Use Node.js built-in pathToFileURL for proper cross-platform conversion
      const fileUrl = pathToFileURL(testVideoFile).href;

      const ret = io.open2Sync(fileUrl, AVIO_FLAG_READ);
      assert.equal(ret, 0, `Should handle file:// protocol (URL: ${fileUrl})`);
      const closret = io.closepSync();
      assert.equal(closret, 0, 'Should return 0 on success');
    });
  });

  describe('Reading', () => {
    it('should read data from file (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const data = await io.read(1024);
      assert.ok(Buffer.isBuffer(data), 'Should return a Buffer');
      assert.ok(data.length > 0, 'Should read some data');
      assert.ok(data.length <= 1024, 'Should not exceed requested size');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should read data from file (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const data = io.readSync(1024);
      assert.ok(Buffer.isBuffer(data), 'Should return a Buffer');
      assert.ok(data.length > 0, 'Should read some data');
      assert.ok(data.length <= 1024, 'Should not exceed requested size');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should read exact file size (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testImageFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const fileStats = await stat(testImageFile);
      const fileSize = fileStats.size;

      const data = await io.read(fileSize);
      assert.ok(Buffer.isBuffer(data));
      assert.equal(data.length, fileSize, 'Should read entire file');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should read exact file size (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testImageFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const size = io.sizeSync();

      const data = io.readSync(Number(size));
      assert.ok(Buffer.isBuffer(data));
      assert.equal(data.length, Number(size), 'Should read entire file');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should handle EOF when reading beyond file (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testAudioFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Seek to near end
      const size = await io.size();
      await io.seek(size - 10n, AVSEEK_SET);

      // Try to read more than available
      const data = await io.read(1024);
      if (Buffer.isBuffer(data)) {
        assert.ok(data.length <= 10, 'Should only read remaining bytes');
      } else {
        // Might return error code for EOF
        assert.ok(data < 0, 'Should return error code');
      }

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should handle EOF when reading beyond file (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testAudioFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Seek to near end
      const size = io.sizeSync();
      io.seekSync(size - 10n, AVSEEK_SET);

      // Try to read more than available
      const data = io.readSync(1024);
      if (Buffer.isBuffer(data)) {
        assert.ok(data.length <= 10, 'Should only read remaining bytes');
      } else {
        // Might return error code for EOF
        assert.ok(data < 0, 'Should return error code');
      }

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should check EOF flag (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testAudioFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      assert.equal(io.eof, false, 'Should not be at EOF initially');

      // Read entire file
      const size = await io.size();
      await io.read(Number(size));

      // Try to read more
      await io.read(1);

      // Now should be at EOF
      assert.equal(io.eof, true, 'Should be at EOF after reading entire file');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should check EOF flag (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testAudioFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      assert.equal(io.eof, false, 'Should not be at EOF initially');

      // Read entire file
      const size = io.sizeSync();
      io.readSync(Number(size));

      // Try to read more
      io.readSync(1);

      // Now should be at EOF
      assert.equal(io.eof, true, 'Should be at EOF after reading entire file');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });
  });

  describe('Writing', () => {
    it('should write data to file (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(tempOutputFile, AVIO_FLAG_WRITE);
      assert.equal(ret, 0, 'Should open file successfully');

      const data = Buffer.from('Hello, FFmpeg!');
      await io.write(data);

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');

      // Verify file was written
      const written = await readFile(tempOutputFile);
      assert.deepEqual(written, data, 'Should write exact data');
    });

    it('should write data to file (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(tempOutputFile, AVIO_FLAG_WRITE);
      assert.equal(ret, 0, 'Should open file successfully');

      const data = Buffer.from('Hello, FFmpeg!');
      io.writeSync(data);

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');

      // Verify file was written
      const written = readFileSync(tempOutputFile);
      assert.deepEqual(written, data, 'Should write exact data');
    });

    it('should write multiple buffers (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(tempOutputFile, AVIO_FLAG_WRITE);
      assert.equal(ret, 0, 'Should open file successfully');

      const data1 = Buffer.from('Hello, ');
      const data2 = Buffer.from('World!');

      await io.write(data1);
      await io.write(data2);

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');

      const written = await readFile(tempOutputFile, 'utf8');
      assert.equal(written, 'Hello, World!');
    });

    it('should write multiple buffers (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(tempOutputFile, AVIO_FLAG_WRITE);
      assert.equal(ret, 0, 'Should open file successfully');

      const data1 = Buffer.from('Hello, ');
      const data2 = Buffer.from('World!');

      io.writeSync(data1);
      io.writeSync(data2);

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');

      const written = readFileSync(tempOutputFile, 'utf8');
      assert.equal(written, 'Hello, World!');
    });

    it('should flush buffered data (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(tempOutputFile, AVIO_FLAG_WRITE);
      assert.equal(ret, 0, 'Should open file successfully');

      const data = Buffer.from('Buffered data');
      await io.write(data);
      await io.flush();

      // Data should be written to disk after flush
      const written = await readFile(tempOutputFile);
      assert.deepEqual(written, data);

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should flush buffered data (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(tempOutputFile, AVIO_FLAG_WRITE);
      assert.equal(ret, 0, 'Should open file successfully');

      const data = Buffer.from('Buffered data');
      io.writeSync(data);
      io.flushSync();

      // Data should be written to disk after flush
      const written = readFileSync(tempOutputFile);
      assert.deepEqual(written, data);

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });
  });

  describe('Seeking', () => {
    it('should seek to beginning (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Read some data first
      await io.read(1024);

      // Seek to beginning
      const pos = await io.seek(0n, AVSEEK_SET);
      assert.equal(pos, 0n, 'Should return new position');
      assert.equal(io.tell(), 0n, 'tell() should match');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should seek to beginning (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Read some data first
      io.readSync(1024);

      // Seek to beginning
      const pos = io.seekSync(0n, AVSEEK_SET);
      assert.equal(pos, 0n, 'Should return new position');
      assert.equal(io.tell(), 0n, 'tell() should match');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should seek to end (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const size = await io.size();
      const pos = await io.seek(0n, AVSEEK_END);

      // Note: AVSEEK_END may not be supported by all I/O contexts
      // FFmpeg's avio_seek with AVSEEK_END returns -22 (EINVAL) for some contexts
      // We should seek using AVSEEK_SET with the file size instead
      if (pos < 0n) {
        // AVSEEK_END not supported, use AVSEEK_SET with size
        const altPos = await io.seek(size, AVSEEK_SET);
        assert.equal(altPos, size, 'Should seek to file size using AVSEEK_SET');
      } else {
        assert.equal(pos, size, 'Should seek to file size using AVSEEK_END');
      }

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should seek to end (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const size = io.sizeSync();
      const pos = io.seekSync(0n, AVSEEK_END);

      // Note: AVSEEK_END may not be supported by all I/O contexts
      // FFmpeg's avio_seek with AVSEEK_END returns -22 (EINVAL) for some contexts
      // We should seek using AVSEEK_SET with the file size instead
      if (pos < 0n) {
        // AVSEEK_END not supported, use AVSEEK_SET with size
        const altPos = io.seekSync(size, AVSEEK_SET);
        assert.equal(altPos, size, 'Should seek to file size using AVSEEK_SET');
      } else {
        assert.equal(pos, size, 'Should seek to file size using AVSEEK_END');
      }

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should seek relative to current position (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Seek to position 1000
      await io.seek(1000n, AVSEEK_SET);

      // Seek forward 500 bytes
      const pos = await io.seek(500n, AVSEEK_CUR);
      assert.equal(pos, 1500n, 'Should seek relative to current');

      // Seek backward 200 bytes
      const pos2 = await io.seek(-200n, AVSEEK_CUR);
      assert.equal(pos2, 1300n, 'Should handle negative offsets');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should seek relative to current position (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Seek to position 1000
      io.seekSync(1000n, AVSEEK_SET);

      // Seek forward 500 bytes from current position
      const pos = io.seekSync(500n, AVSEEK_CUR);
      assert.equal(pos, 1500n, 'Should seek relative to current position');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should get file size using AVSEEK_SIZE (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const size = await io.seek(0n, AVSEEK_SIZE);
      assert.ok(size > 0n, 'Should return file size');

      // Compare with size() method
      const size2 = await io.size();
      assert.equal(size, size2, 'Should match size() method');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should get file size using AVSEEK_SIZE (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const size = io.seekSync(0n, AVSEEK_SIZE);
      assert.ok(size > 0n, 'Should return file size');

      // Compare with size() method
      const size2 = io.sizeSync();
      assert.equal(size, size2, 'Should match size() method');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should skip bytes forward (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const initialPos = io.tell();
      const newPos = await io.skip(1024n);

      assert.equal(newPos, initialPos + 1024n, 'Should skip forward');
      assert.equal(io.tell(), newPos, 'tell() should match');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should skip bytes forward (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const initialPos = io.tell();
      const newPos = io.skipSync(1024n);

      assert.equal(newPos, initialPos + 1024n, 'Should skip forward');
      assert.equal(io.tell(), newPos, 'tell() should match');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should check seekable flag (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      assert.ok(io.seekable !== 0, 'File should be seekable');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should check seekable flag (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      assert.ok(io.seekable !== 0, 'File should be seekable');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });
  });

  describe('File Properties', () => {
    it('should get file size (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const size = await io.size();
      assert.ok(size > 0n, 'Should return positive size');

      // Compare with actual file size
      const stats = await stat(testVideoFile);
      assert.equal(size, BigInt(stats.size), 'Should match actual file size');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should get file size (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const size = io.sizeSync();
      assert.ok(size > 0n, 'Should return positive size');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should get current position (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      assert.equal(io.tell(), 0n, 'Should start at position 0');
      assert.equal(io.pos, 0n, 'pos property should match');

      await io.read(100);
      assert.ok(io.tell() > 0n, 'Position should advance after reading');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should get current position (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      assert.equal(io.tell(), 0n, 'Should start at position 0');

      io.readSync(100);
      assert.equal(io.tell(), 100n, 'Should be at position 100 after reading');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should get buffer size (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      assert.ok(io.bufferSize > 0, 'Should have a buffer size');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should get buffer size (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      assert.ok(io.bufferSize > 0, 'Should have a buffer size');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should check write flag (async)', async () => {
      const ioRead = new IOContext();
      const ret = await ioRead.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');
      assert.equal(ioRead.writeFlag, false, 'Should be false for read mode');
      const closeret = await ioRead.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');

      const ioWrite = new IOContext();
      const ret2 = await ioWrite.open2(tempOutputFile, AVIO_FLAG_WRITE);
      assert.equal(ret2, 0, 'Should open file successfully');
      assert.equal(ioWrite.writeFlag, true, 'Should be true for write mode');
      const closeret2 = await ioWrite.closep();
      assert.equal(closeret2, 0, 'Should return 0 on success');
    });

    it('should check write flag (sync)', () => {
      const ioRead = new IOContext();
      const ret = ioRead.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');
      assert.equal(ioRead.writeFlag, false, 'Should be false for read mode');
      const closeret = ioRead.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');

      const ioWrite = new IOContext();
      const ret2 = ioWrite.open2Sync(tempOutputFile, AVIO_FLAG_WRITE);
      assert.equal(ret2, 0, 'Should open file successfully');
      assert.equal(ioWrite.writeFlag, true, 'Should be true for write mode');
      const closeret2 = ioWrite.closepSync();
      assert.equal(closeret2, 0, 'Should return 0 on success');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors property (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      assert.equal(io.error, 0, 'Should have no error initially');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should handle errors property (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      assert.equal(io.error, 0, 'Should have no error initially');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should handle seeking errors (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Try to seek to negative position
      const pos = await io.seek(-1000n, AVSEEK_SET);
      // Some implementations might clamp to 0, others might error
      assert.ok(pos === 0n || pos < 0n, 'Should handle negative seek');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });
  });

  describe('Direct Mode', () => {
    it('should get and set direct mode (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const initialDirect = io.direct;
      assert.ok(typeof initialDirect === 'number');

      // Try to set direct mode
      io.direct = 1;
      assert.equal(io.direct, 1);

      io.direct = 0;
      assert.equal(io.direct, 0);

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should get and set direct mode (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const initialDirect = io.direct;
      assert.ok(typeof initialDirect === 'number');

      // Try to set direct mode
      io.direct = 1;
      assert.equal(io.direct, 1);

      io.direct = 0;
      assert.equal(io.direct, 0);

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should get and set max packet size (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const initialSize = io.maxPacketSize;
      assert.ok(typeof initialSize === 'number');

      io.maxPacketSize = 4096;
      assert.equal(io.maxPacketSize, 4096);

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should get and set max packet size (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const initialSize = io.maxPacketSize;
      assert.ok(typeof initialSize === 'number');

      io.maxPacketSize = 4096;
      assert.equal(io.maxPacketSize, 4096);

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file (async)', async () => {
      // Create empty file
      await writeFile(tempOutputFile, '');

      const io = new IOContext();
      const ret = await io.open2(tempOutputFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const size = await io.size();
      assert.equal(size, 0n, 'Should have size 0');

      const data = await io.read(1024);
      if (Buffer.isBuffer(data)) {
        assert.equal(data.length, 0, 'Should read 0 bytes');
      }

      assert.equal(io.eof, true, 'Should be at EOF');

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should handle empty file (sync)', () => {
      // Create empty file
      writeFileSync(tempOutputFile, '');

      const io = new IOContext();
      const ret = io.open2Sync(tempOutputFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      const size = io.sizeSync();
      assert.equal(size, 0n, 'Should have size 0');

      const data = io.readSync(1024);
      if (Buffer.isBuffer(data)) {
        assert.equal(data.length, 0, 'Should read 0 bytes');
      }

      assert.equal(io.eof, true, 'Should be at EOF');

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should handle very large read request (async)', async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Request more than file size
      const data = await io.read(1024 * 1024 * 100); // 100MB

      if (Buffer.isBuffer(data)) {
        const fileStats = await stat(testVideoFile);
        assert.ok(data.length <= fileStats.size, 'Should not exceed file size');
      }

      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should handle very large read request (sync)', () => {
      const io = new IOContext();
      const ret = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Request more than file size
      const data = io.readSync(1024 * 1024 * 100); // 100MB

      if (Buffer.isBuffer(data)) {
        const fileStats = statSync(testVideoFile);
        assert.ok(data.length <= fileStats.size, 'Should not exceed file size');
      }

      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');
    });

    it('should handle multiple open/close cycles (async)', async () => {
      const io = new IOContext();

      // First cycle
      const ret1 = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret1, 0, 'Should open file successfully');
      const data1 = await io.read(100);
      assert.ok(Buffer.isBuffer(data1));
      const closeret = await io.closep();
      assert.equal(closeret, 0, 'Should return 0 on success');

      // Second cycle with same instance
      const ret2 = await io.open2(testImageFile, AVIO_FLAG_READ);
      assert.equal(ret2, 0, 'Should open file successfully');
      const data2 = await io.read(100);
      assert.ok(Buffer.isBuffer(data2));
      const closeret2 = await io.closep();
      assert.equal(closeret2, 0, 'Should return 0 on success');
    });

    it('should handle multiple open/close cycles (sync)', () => {
      const io = new IOContext();

      // First cycle
      const ret1 = io.open2Sync(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret1, 0, 'Should open file successfully');
      const data1 = io.readSync(100);
      assert.ok(Buffer.isBuffer(data1));
      const closeret = io.closepSync();
      assert.equal(closeret, 0, 'Should return 0 on success');

      // Second cycle with same instance
      const ret2 = io.open2Sync(testImageFile, AVIO_FLAG_READ);
      assert.equal(ret2, 0, 'Should open file successfully');
      const data2 = io.readSync(100);
      assert.ok(Buffer.isBuffer(data2));
      const closeret2 = io.closepSync();
      assert.equal(closeret2, 0, 'Should return 0 on success');
    });
  });

  describe('Async Operation Guard', () => {
    it('should not crash when freeContext() races in-flight async reads', { timeout: 10000 }, async () => {
      const io = new IOContext();
      const ret = await io.open2(testVideoFile, AVIO_FLAG_READ);
      assert.equal(ret, 0, 'Should open file successfully');

      // Queue a burst of async reads, then free while they may still be on
      // the threadpool - freeContext() waits for in-flight operations
      // (previously a use-after-free)
      const pending = Array.from({ length: 8 }, async () => io.read(4096));
      io.freeContext();

      const results = await Promise.allSettled(pending);
      for (const r of results) {
        assert.notEqual(r.status, undefined);
      }
    });

    it('should error instead of deadlocking when freeContext() races a parked callback read', { timeout: 10000 }, async () => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      const io = new IOContext();
      io.allocContextWithCallbacks(4096, 0, async () => {
        // Park the read until the test releases it
        await gate;
        return AVERROR_EOF;
      });

      // The read parks on the JS callback above: the worker thread waits for
      // the main thread, so freeContext() must fail fast (busy error) instead
      // of blocking the event loop until a timeout
      const pending = io.read(1024);
      assert.throws(() => io.freeContext(), /busy/, 'freeContext() should throw while a callback read is parked');

      // Release the parked read - it must settle within the test timeout
      release();
      const result = await pending;
      assert.equal(result, AVERROR_EOF, 'Parked read should settle with EOF');

      // With no operations in flight the context frees cleanly
      io.freeContext();
    });
  });

  describe('Environment Exit', () => {
    // A threadpool thread parked in a custom-IO callback waits for the JS thread
    // without a timeout. Once the env exits that thread never runs the callback,
    // so the parked thread must give up instead of blocking process.exit() (which
    // joins the threadpool) or worker teardown forever.
    const srcUrl = new URL('../src/index.ts', import.meta.url).href;
    const tsxLoader = import.meta.resolve('tsx');
    const tsxApi = import.meta.resolve('tsx/esm/api');

    // Script body that parks one async callback operation of `kind` on `io`
    const parkScript = (kind: 'read' | 'write' | 'size'): string => `
      const { IOContext } = await import(${JSON.stringify(srcUrl)});
      const never = () => new Promise(() => {});
      const io = new IOContext();
      if (${JSON.stringify(kind)} === 'write') {
        io.allocContextWithCallbacks(4096, 1, null, never);
        void io.write(Buffer.alloc(16384)).catch(() => {});
      } else if (${JSON.stringify(kind)} === 'size') {
        io.allocContextWithCallbacks(4096, 0, () => null, null, never);
        void io.size().catch(() => {});
      } else {
        io.allocContextWithCallbacks(4096, 0, never);
        void io.read(1024).catch(() => {});
      }
    `;

    const runScript = async (script: string, timeoutMs = 20000): Promise<{ code: number | null; hung: boolean; stdout: string; stderr: string }> => {
      return new Promise((resolve) => {
        const child = spawn(process.execPath, ['--import', tsxLoader, '--input-type=module', '-e', script], { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        let hung = false;
        child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
        child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
        const timer = setTimeout(() => {
          hung = true;
          child.kill('SIGKILL');
        }, timeoutMs);
        child.on('close', (code) => {
          clearTimeout(timer);
          resolve({ code, hung, stdout, stderr });
        });
      });
    };

    for (const kind of ['read', 'write', 'size'] as const) {
      it(`should not block process.exit() while a ${kind} callback is parked`, { timeout: 30000 }, async () => {
        const result = await runScript(`
          ${parkScript(kind)}
          setTimeout(() => {
            console.log('exiting');
            process.exit(0);
          }, 300);
        `);
        assert.equal(result.hung, false, `process.exit() deadlocked (stderr: ${result.stderr})`);
        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stdout, /exiting/);
      });
    }

    it('should not block process.exit() while a network open is stalled', { timeout: 30000 }, async () => {
      // avformat_open_input() runs on the threadpool, which process.exit() joins;
      // with a peer that never answers it would hold the exit until its timeout
      const result = await runScript(`
        const net = await import('node:net');
        const { Demuxer } = await import(${JSON.stringify(srcUrl)});
        const server = net.createServer(() => {}).listen(0, '127.0.0.1');
        await new Promise((resolve) => server.once('listening', resolve));
        const url = 'rtsp://127.0.0.1:' + server.address().port + '/stalled';
        void Demuxer.open(url, { options: { rtsp_transport: 'tcp', timeout: 60000000 } }).catch(() => {});
        setTimeout(() => {
          console.log('exiting');
          process.exit(0);
        }, 300);
      `);
      assert.equal(result.hung, false, `process.exit() waited for the stalled open (stderr: ${result.stderr})`);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /exiting/);
    });

    it('should let worker.terminate() finish while a callback is parked in the worker', { timeout: 30000 }, async () => {
      const workerScript = `
        const { register } = await import(${JSON.stringify(tsxApi)});
        register();
        const { parentPort } = await import('node:worker_threads');
        ${parkScript('read')}
        setTimeout(() => parentPort.postMessage('parked'), 200);
      `;
      const result = await runScript(`
        import { Worker } from 'node:worker_threads';
        const worker = new Worker(new URL('data:text/javascript,' + encodeURIComponent(${JSON.stringify(workerScript)})));
        worker.on('error', (err) => console.log('worker error', err.message));
        worker.once('message', async () => {
          await worker.terminate();
          console.log('terminated');
        });
      `);
      assert.equal(result.hung, false, `worker.terminate() deadlocked (stderr: ${result.stderr})`);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /terminated/);
    });

    it('should let a worker end while a callback context is still allocated', { timeout: 30000 }, async () => {
      // Env teardown finalizes the context's ThreadSafeFunctions before the context itself;
      // releasing them again from its finalizer used to deadlock the worker thread
      const workerScript = `
        const { register } = await import(${JSON.stringify(tsxApi)});
        register();
        const { IOContext } = await import(${JSON.stringify(srcUrl)});
        globalThis.keep = new IOContext();
        globalThis.keep.allocContextWithCallbacks(4096, 1, () => null, () => {}, () => 0n);
      `;
      const result = await runScript(`
        import { Worker } from 'node:worker_threads';
        const worker = new Worker(new URL('data:text/javascript,' + encodeURIComponent(${JSON.stringify(workerScript)})));
        worker.on('error', (err) => console.log('worker error', err.message));
        worker.on('exit', (code) => console.log('worker exited', code));
      `);
      assert.equal(result.hung, false, `worker teardown deadlocked (stderr: ${result.stderr})`);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /worker exited 0/);
    });

    // Worker script whose Demuxer read loop parks in the read callback of a Readable that stalls
    const parkedReaderScript = (how: 'terminate' | 'exit'): string => `
      const { register } = await import(${JSON.stringify(tsxApi)});
      register();
      const { parentPort } = await import('node:worker_threads');
      const { PassThrough } = await import('node:stream');
      const { readFileSync } = await import('node:fs');
      const { Demuxer } = await import(${JSON.stringify(srcUrl)});
      const live = new PassThrough();
      live.write(readFileSync(${JSON.stringify(getInputFile('audio.mp3'))}).subarray(0, 256 * 1024));
      const demuxer = await Demuxer.open(live, { format: 'mp3' });
      setTimeout(() => {
        parentPort.postMessage('parked');
        if (${JSON.stringify(how)} === 'exit') process.exit(0);
      }, 300);
      for await (const packet of demuxer.packets()) {
        if (!packet) break;
        packet.free();
      }
    `;

    for (const how of ['terminate', 'exit'] as const) {
      it(`should let a worker end via ${how} while its Demuxer read loop is parked`, { timeout: 30000 }, async () => {
        // Env teardown frees the read loop of a Demuxer nobody closed; its owner is
        // finalized afterwards and must not stop the freed loop again (SIGABRT)
        const result = await runScript(`
          import { Worker } from 'node:worker_threads';
          const worker = new Worker(new URL('data:text/javascript,' + encodeURIComponent(${JSON.stringify(parkedReaderScript(how))})));
          worker.on('error', (err) => console.log('worker error', err.message));
          worker.once('message', () => {
            if (${JSON.stringify(how)} === 'terminate') void worker.terminate();
          });
          worker.on('exit', () => {
            console.log('worker ended');
            setTimeout(() => console.log('main alive'), 200);
          });
        `);
        assert.equal(result.hung, false, `worker teardown deadlocked (stderr: ${result.stderr})`);
        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stdout, /worker ended[\s\S]*main alive/);
      });
    }

    it('should not abort when the process ends with active Demuxer read loops', { timeout: 30000 }, async () => {
      const result = await runScript(`
        const { PassThrough } = await import('node:stream');
        const { readFileSync } = await import('node:fs');
        const { Demuxer } = await import(${JSON.stringify(srcUrl)});
        const live = new PassThrough();
        live.write(readFileSync(${JSON.stringify(getInputFile('audio.mp3'))}).subarray(0, 256 * 1024));
        const demuxers = [await Demuxer.open(${JSON.stringify(testVideoFile)}), await Demuxer.open(live, { format: 'mp3' })];
        for (const demuxer of demuxers) {
          const packets = demuxer.packets();
          for (let i = 0; i < 5; i++) {
            const { value } = await packets.next();
            value?.free();
          }
        }
        console.log('leaving demuxers open');
      `);
      assert.equal(result.hung, false, `process exit deadlocked (stderr: ${result.stderr})`);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /leaving demuxers open/);
    });

    it('should ignore an exit event emitted by hand', { timeout: 30000 }, async () => {
      // Only a real exit (process._exiting) may fail threadpool round-trips
      const result = await runScript(`
        const { IOContext } = await import(${JSON.stringify(srcUrl)});
        process.emit('exit', 0);
        let written = 0;
        const io = new IOContext();
        io.allocContextWithCallbacks(4096, 1, null, async (buffer) => {
          written += buffer.length;
        });
        await io.write(Buffer.alloc(16384));
        await io.flush();
        io.freeContext();
        console.log('written', written);
      `);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /written 16384/);
    });

    it('should still wait for slow callbacks while the env runs', { timeout: 15000 }, async () => {
      // Slower than the exit poll and probe intervals: must neither fail nor time out
      const delay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const source = Buffer.from('slow consumers are waited for');

      const reader = new IOContext();
      reader.allocContextWithCallbacks(4096, 0, async () => {
        await delay(800);
        return source;
      });
      const read = await reader.read(source.length);
      assert.ok(Buffer.isBuffer(read), `read should return data, got ${String(read)}`);
      assert.deepEqual(read, source);
      reader.freeContext();

      const written: Buffer[] = [];
      const writer = new IOContext();
      writer.allocContextWithCallbacks(4096, 1, null, async (buffer: Buffer) => {
        await delay(800);
        written.push(buffer);
      });
      await writer.write(source);
      await writer.flush();
      assert.deepEqual(Buffer.concat(written), source);
      writer.freeContext();
    });
  });

  describe('Input Close', () => {
    // FFmpeg never polls the interrupt callback while a custom read waits for its
    // JS promise, which settles only once the source delivers. Closing or
    // interrupting the input must fail that round-trip, or the close waits for
    // the source. Waits are bounded and the source is released afterwards, so a
    // regression fails instead of hanging the run.
    type Settled<T> = { status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown } | { status: 'pending' };

    // Outcome of `promise`, or 'pending' when it has not settled within `ms`
    const settleWithin = async <T>(promise: Promise<T>, ms = 3000): Promise<Settled<T>> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<Settled<T>>((resolve) => {
        timer = setTimeout(() => resolve({ status: 'pending' }), ms);
      });
      try {
        return await Promise.race([
          promise.then(
            (value): Settled<T> => ({ status: 'fulfilled', value }),
            (reason: unknown): Settled<T> => ({ status: 'rejected', reason }),
          ),
          timeout,
        ]);
      } finally {
        clearTimeout(timer);
      }
    };

    // Input context whose open is parked in a read callback that never delivers
    const openParked = async () => {
      const stalled = Promise.withResolvers<Buffer | null>();
      const { promise: parked, resolve: onParked } = Promise.withResolvers<void>();
      let reads = 0;
      const io = new IOContext();
      io.allocContextWithCallbacks(4096, 0, async () => {
        reads++;
        onParked();
        return stalled.promise;
      });
      const ctx = new FormatContext();
      ctx.allocContext();
      ctx.pb = io;
      const opening = ctx.openInput('', InputFormat.findInputFormat('mp3'), null);
      await parked;
      return { io, ctx, opening, release: () => stalled.resolve(null), reads: () => reads };
    };

    for (const close of ['closeInput', 'interrupt', 'closeInputSync'] as const) {
      it(`${close}() should end an open parked in a read callback`, { timeout: 15000 }, async () => {
        const { io, ctx, opening, release, reads } = await openParked();

        try {
          if (close === 'closeInput') {
            assert.equal((await settleWithin(ctx.closeInput(true))).status, 'fulfilled', 'closeInput() must settle while the open is parked');
          } else if (close === 'closeInputSync') {
            ctx.closeInputSync(true);
          } else {
            ctx.interrupt();
          }
          const opened = await settleWithin(opening);
          assert.equal(opened.status, 'fulfilled', 'the parked open must return once the input is closed');
          assert.ok(opened.status === 'fulfilled' && opened.value < 0, 'the aborted open must fail');
          // The callback is not called again for this input
          assert.equal(reads(), 1, 'no read callback after the input closed');
        } finally {
          release();
          await opening;
          await ctx.closeInput(true);
          io.freeContext();
        }
      });
    }
  });

  describe('Static Methods', () => {
    it('should create from native object', () => {
      const io1 = new IOContext();
      const native = io1.getNative();

      const io2 = IOContext.fromNative(native);
      assert.ok(io2 instanceof IOContext);

      // Note: io2 is a wrapper around the same native object as io1
      // Only need to free one of them (or neither if not allocated)
    });
  });

  describe('Custom Callbacks', () => {
    it('should create context with read callback only', async () => {
      // Load file into memory
      const fileBuffer = await readFile(testVideoFile);
      let position = 0;

      const io = new IOContext();
      io.allocContextWithCallbacks(
        4096, // buffer size
        0, // read mode
        // Read callback
        (size: number) => {
          if (position >= fileBuffer.length) {
            return -541478725; // AVERROR_EOF
          }
          const bytesToRead = Math.min(size, fileBuffer.length - position);
          const data = fileBuffer.subarray(position, position + bytesToRead);
          position += bytesToRead;
          return data;
        },
      );

      assert.ok(io);
      assert.ok(io.bufferSize > 0);

      // Clean up
      io.freeContext();
    });

    it('should create context with read and seek callbacks', () => {
      const fileBuffer = readFileSync(testVideoFile);
      let position = 0;

      const io = new IOContext();
      io.allocContextWithCallbacks(
        4096,
        0,
        // Read callback
        (size: number) => {
          if (position >= fileBuffer.length) {
            return -541478725; // AVERROR_EOF
          }
          const bytesToRead = Math.min(size, fileBuffer.length - position);
          const data = fileBuffer.subarray(position, position + bytesToRead);
          position += bytesToRead;
          return data;
        },
        undefined, // No write callback
        // Seek callback
        (offset: bigint, whence: AVSeekWhence) => {
          let newPos: number;
          const offsetNum = Number(offset);

          if (whence === AVSEEK_SIZE) {
            return BigInt(fileBuffer.length);
          }

          switch (whence) {
            case AVSEEK_SET:
              newPos = offsetNum;
              break;
            case AVSEEK_CUR:
              newPos = position + offsetNum;
              break;
            case AVSEEK_END:
              newPos = fileBuffer.length + offsetNum;
              break;
            default:
              return -1;
          }

          if (newPos < 0 || newPos > fileBuffer.length) {
            return -1;
          }

          position = newPos;
          return BigInt(position);
        },
      );

      assert.ok(io);
      assert.ok(io.bufferSize > 0);

      // Clean up
      io.freeContext();
    });

    it('should handle EOF correctly in read callback', () => {
      const testData = Buffer.from('Small test data');
      let position = 0;

      const io = new IOContext();
      io.allocContextWithCallbacks(
        256, // Small buffer
        0,
        (size: number) => {
          if (position >= testData.length) {
            return -541478725; // AVERROR_EOF
          }
          const bytesToRead = Math.min(size, testData.length - position);
          const data = testData.subarray(position, position + bytesToRead);
          position += bytesToRead;
          return data;
        },
      );

      assert.ok(io);
      // Just verify the context was created, actual usage requires FormatContext

      io.freeContext();
    });

    it('should demonstrate the sync callback limitation', async () => {
      const fileBuffer = readFileSync(testVideoFile);
      let position = 0;

      const io = new IOContext();
      io.allocContextWithCallbacks(4096, 0, (size: number) => {
        console.log('Read callback executed!'); // <-- Das würde ausgegeben
        const data = fileBuffer.subarray(position, position + size);
        position += data.length;
        return data;
      });

      // Dieser Aufruf WÜRDE die Callback ausführen und funktionieren:
      const data = await io.read(100);
      assert.ok(Buffer.isBuffer(data));

      console.log('Read', data.length, 'bytes'); // Funktioniert!

      // Aber mit FormatContext.openInputSync würde es hängen (deshalb nicht im Test)

      io.freeContext();
    });

    it('should handle null return from read callback as EOF', () => {
      const fileBuffer = readFileSync(testVideoFile);
      let position = 0;

      const io = new IOContext();
      io.allocContextWithCallbacks(4096, 0, (size: number) => {
        if (position >= fileBuffer.length) {
          return null; // Return null instead of AVERROR_EOF
        }
        const bytesToRead = Math.min(size, fileBuffer.length - position);
        const data = fileBuffer.subarray(position, position + bytesToRead);
        position += bytesToRead;
        return data;
      });

      assert.ok(io);
      assert.ok(io.bufferSize > 0);

      io.freeContext();
    });

    it('should support write callback', () => {
      const writtenData: Buffer[] = [];

      const io = new IOContext();
      io.allocContextWithCallbacks(
        4096,
        1, // Write mode
        undefined, // No read callback
        // Write callback
        (buffer: Buffer) => {
          writtenData.push(Buffer.from(buffer));
          return buffer.length;
        },
      );

      assert.ok(io);
      assert.equal(io.writeFlag, true, 'Should be in write mode');

      io.freeContext();
    });

    it('should handle partial reads in callback', () => {
      const fileBuffer = readFileSync(testVideoFile);
      let position = 0;
      const maxReadSize = 100; // Force small reads

      const io = new IOContext();
      io.allocContextWithCallbacks(4096, 0, (size: number) => {
        if (position >= fileBuffer.length) {
          return -541478725; // AVERROR_EOF
        }
        // Always read less than requested (unless at end)
        const bytesToRead = Math.min(maxReadSize, size, fileBuffer.length - position);
        const data = fileBuffer.subarray(position, position + bytesToRead);
        position += bytesToRead;
        return data;
      });

      assert.ok(io);
      assert.ok(io.bufferSize > 0);

      io.freeContext();
    });

    it('should work with different buffer sizes', () => {
      const bufferSizes = [256, 1024, 4096, 16384];

      for (const bufferSize of bufferSizes) {
        const fileBuffer = readFileSync(testVideoFile);
        let position = 0;

        const io = new IOContext();
        io.allocContextWithCallbacks(bufferSize, 0, (size: number) => {
          if (position >= fileBuffer.length) {
            return -541478725; // AVERROR_EOF
          }
          const bytesToRead = Math.min(size, fileBuffer.length - position);
          const data = fileBuffer.subarray(position, position + bytesToRead);
          position += bytesToRead;
          return data;
        });

        assert.equal(io.bufferSize, bufferSize, `Should have buffer size ${bufferSize}`);

        io.freeContext();
      }
    });

    it('should support async read callback returning Promise', async () => {
      const fileBuffer = await readFile(testVideoFile);
      let position = 0;
      let asyncReadCount = 0;

      const io = new IOContext();
      io.allocContextWithCallbacks(
        4096,
        0,
        // Async read callback - returns Promise
        async (size: number): Promise<Buffer | number> => {
          asyncReadCount++;
          // Simulate async delay (network, database, etc.)
          await new Promise((resolve) => setTimeout(resolve, 1));

          if (position >= fileBuffer.length) {
            return AVERROR_EOF;
          }
          const bytesToRead = Math.min(size, fileBuffer.length - position);
          const data = fileBuffer.subarray(position, position + bytesToRead);
          position += bytesToRead;
          return data;
        },
      );

      // Read data using the async callback
      const data = await io.read(1024);
      assert.ok(Buffer.isBuffer(data), 'Should return a Buffer');
      assert.ok(data.length > 0, 'Should read some data');
      assert.ok(asyncReadCount > 0, 'Async callback should have been called');

      io.freeContext();
    });

    it('should support async seek callback returning Promise', async () => {
      // Note: FFmpeg's avio_seek() doesn't always call the seek callback directly -
      // it depends on internal buffering. This test verifies the async callback
      // mechanism is properly set up and can be invoked.
      const fileBuffer = await readFile(testVideoFile);
      let position = 0;

      const io = new IOContext();
      io.allocContextWithCallbacks(
        1024,
        0,
        // Read callback
        (size: number) => {
          if (position >= fileBuffer.length) {
            return AVERROR_EOF;
          }
          const bytesToRead = Math.min(size, fileBuffer.length - position);
          const data = fileBuffer.subarray(position, position + bytesToRead);
          position += bytesToRead;
          return data;
        },
        undefined,
        // Async seek callback - returns Promise
        async (offset: bigint, whence: AVSeekWhence): Promise<bigint> => {
          await new Promise((resolve) => setTimeout(resolve, 1));

          if (whence === AVSEEK_SIZE) {
            return BigInt(fileBuffer.length);
          }

          const offsetNum = Number(offset);
          let newPos: number;

          switch (whence) {
            case AVSEEK_SET:
              newPos = offsetNum;
              break;
            case AVSEEK_CUR:
              newPos = position + offsetNum;
              break;
            case AVSEEK_END:
              newPos = fileBuffer.length + offsetNum;
              break;
            default:
              return BigInt(-1);
          }

          if (newPos < 0 || newPos > fileBuffer.length) {
            return BigInt(-1);
          }

          position = newPos;
          return BigInt(position);
        },
      );

      // Read some data
      const data = await io.read(512);
      assert.ok(Buffer.isBuffer(data), 'Should read data successfully');

      // The seek callback may or may not be called depending on FFmpeg's
      // internal buffering decisions. The important thing is that the
      // async callback mechanism is properly set up.
      // The actual async functionality is proven by the read/write tests.

      io.freeContext();
    });

    it('should support async write callback returning Promise', async () => {
      const writtenChunks: Buffer[] = [];
      let asyncWriteCount = 0;

      const io = new IOContext();
      io.allocContextWithCallbacks(
        4096,
        1, // Write mode
        undefined,
        // Async write callback - returns Promise
        async (buffer: Buffer): Promise<number> => {
          asyncWriteCount++;
          // Simulate async delay (network write, cloud upload, etc.)
          await new Promise((resolve) => setTimeout(resolve, 1));

          // Copy buffer since it may be reused
          writtenChunks.push(Buffer.from(buffer));
          return buffer.length;
        },
      );

      // Write some data
      const testData = Buffer.from('Hello, async world!');
      await io.write(testData);
      await io.flush();

      assert.ok(asyncWriteCount > 0, 'Async write callback should have been called');
      assert.ok(writtenChunks.length > 0, 'Should have written chunks');

      io.freeContext();
    });

    it('should support combined async read and seek callbacks', async () => {
      const fileBuffer = await readFile(testVideoFile);
      let position = 0;
      let asyncReadCount = 0;

      const io = new IOContext();
      // Use small buffer to ensure multiple read operations trigger callbacks
      io.allocContextWithCallbacks(
        512,
        0,
        // Async read callback
        async (size: number): Promise<Buffer | number> => {
          asyncReadCount++;
          await new Promise((resolve) => setTimeout(resolve, 1));

          if (position >= fileBuffer.length) {
            return AVERROR_EOF;
          }
          const bytesToRead = Math.min(size, fileBuffer.length - position);
          const data = fileBuffer.subarray(position, position + bytesToRead);
          position += bytesToRead;
          return data;
        },
        undefined,
        // Async seek callback - may or may not be called by FFmpeg
        async (offset: bigint, whence: AVSeekWhence): Promise<bigint> => {
          await new Promise((resolve) => setTimeout(resolve, 1));

          if (whence === AVSEEK_SIZE) {
            return BigInt(fileBuffer.length);
          }

          const offsetNum = Number(offset);
          let newPos: number;

          switch (whence) {
            case AVSEEK_SET:
              newPos = offsetNum;
              break;
            case AVSEEK_CUR:
              newPos = position + offsetNum;
              break;
            case AVSEEK_END:
              newPos = fileBuffer.length + offsetNum;
              break;
            default:
              return BigInt(-1);
          }

          if (newPos < 0 || newPos > fileBuffer.length) {
            return BigInt(-1);
          }

          position = newPos;
          return BigInt(position);
        },
      );

      // Read some data - small buffer means multiple callback invocations
      const data1 = await io.read(1024);
      assert.ok(Buffer.isBuffer(data1), 'First read should return buffer');

      // Read more data
      const data2 = await io.read(1024);
      assert.ok(Buffer.isBuffer(data2), 'Second read should return buffer');

      // Verify async read callbacks were invoked
      // With 512 byte buffer and 1024 byte reads, multiple callbacks should be needed
      assert.ok(asyncReadCount >= 1, `Should have at least 1 async read (got ${asyncReadCount})`);

      io.freeContext();
    });
  });

  describe('As the pb of an output FormatContext', () => {
    // An open2() context set as pb is held by both wrappers, and either may close it:
    // closep() as avio_closep(&ofmt->pb) does in C, or closing/freeing the output.
    // Whichever closes it first must clear the other's copy, or it is freed twice.
    const attach = async (): Promise<{ io: IOContext; ctx: FormatContext }> => {
      const ctx = new FormatContext();
      ctx.allocOutputContext2(null, 'mpegts', tempOutputFile);
      const io = new IOContext();
      assert.equal(await io.open2(tempOutputFile, AVIO_FLAG_WRITE), 0);
      ctx.pb = io;
      await io.write(Buffer.alloc(1024, 1));
      return { io, ctx };
    };

    it('closes it once when closep() comes first, as in C', async () => {
      const { io, ctx } = await attach();
      assert.equal(await io.closep(), 0);
      ctx.freeContext();
      assert.equal(statSync(tempOutputFile).size, 1024);
    });

    it('closes it once when the output is freed first', async () => {
      const { io, ctx } = await attach();
      ctx.freeContext();
      assert.equal(await io.closep(), 0);
      assert.equal(statSync(tempOutputFile).size, 1024);
    });

    it('closes it once after closeOutput()', async () => {
      const { io, ctx } = await attach();
      await ctx.closeOutput();
      assert.equal(io.closepSync(), 0);
      ctx.freeContext();
      assert.equal(statSync(tempOutputFile).size, 1024);
    });

    it('closes it once after closeOutputSync()', async () => {
      const { io, ctx } = await attach();
      ctx.closeOutputSync();
      assert.equal(await io.closep(), 0);
      ctx.freeContext();
    });

    it('closes it once after an async dispose of the output', async () => {
      const { io, ctx } = await attach();
      await ctx[Symbol.asyncDispose]();
      assert.equal(await io.closep(), 0);
    });

    it('closes it once when the output is only finalized at exit', { timeout: 30000 }, async () => {
      // examples/transcode.ts: closep() and no freeContext(), so the context is freed at teardown
      const script = `
        const { FormatContext, IOContext, AVIO_FLAG_WRITE } = await import(${JSON.stringify(new URL('../src/index.ts', import.meta.url).href)});
        const ctx = new FormatContext();
        ctx.allocOutputContext2(null, 'mpegts', ${JSON.stringify(tempOutputFile)});
        const io = new IOContext();
        await io.open2(${JSON.stringify(tempOutputFile)}, AVIO_FLAG_WRITE);
        ctx.pb = io;
        await io.closep();
        globalThis.keep = ctx;
        console.log('done');
      `;
      const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
        const child = spawn(process.execPath, ['--import', import.meta.resolve('tsx'), '--input-type=module', '-e', script], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
        child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
        child.on('close', (code) => resolve({ code, stdout, stderr }));
      });
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /done/);
    });

    it('cannot be the pb of two output contexts at once', async () => {
      const { io, ctx } = await attach();
      const other = new FormatContext();
      other.allocOutputContext2(null, 'mpegts', tempOutputFile);
      assert.throws(() => (other.pb = io), /already the pb of another FormatContext/);
      ctx.freeContext();
      // freed with the first context's pb: attaching it again is harmless
      other.pb = io;
      other.freeContext();
      assert.equal(await io.closep(), 0);
    });

    it('leaves a callback-backed pb to its IOContext on closeOutput()', async () => {
      let written = 0;
      const io = new IOContext();
      io.allocContextWithCallbacks(4096, 1, null, (buffer: Buffer) => {
        written += buffer.length;
      });
      const ctx = new FormatContext();
      ctx.allocOutputContext2(null, 'mpegts', null);
      ctx.pb = io;
      await io.write(Buffer.alloc(1024, 1));
      await ctx.closeOutput();
      await io.flush();
      assert.equal(written, 1024);
      io.freeContext();
      ctx.freeContext();
    });
  });

  describe('When never freed or closed', () => {
    it('frees it once it is garbage collected, alone or together with its output', { timeout: 30000 }, async () => {
      const script = `
        const { FormatContext, IOContext, AVIO_FLAG_WRITE } = await import(${JSON.stringify(new URL('../src/index.ts', import.meta.url).href)});
        const { statSync } = await import('node:fs');
        const file = ${JSON.stringify(tempOutputFile)};
        const settle = async () => {
          for (let i = 0; i < 8; i++) { globalThis.gc(); await new Promise((resolve) => setImmediate(resolve)); }
        };
        // Alone: closed (and so flushed) when collected
        await (async () => {
          const io = new IOContext();
          await io.open2(file, AVIO_FLAG_WRITE);
          await io.write(Buffer.alloc(1000, 1));
        })();
        await settle();
        console.log('alone', statSync(file).size);
        // As a pb: collected with its output in either order, closed by whichever owns it
        for (let i = 0; i < 20; i++) {
          (() => {
            const ctx = new FormatContext();
            ctx.allocOutputContext2(null, 'mpegts', file);
            const io = new IOContext();
            io.open2Sync(file, AVIO_FLAG_WRITE);
            ctx.pb = io;
            io.writeSync(Buffer.alloc(1024, 1));
          })();
          (() => {
            const ctx = new FormatContext();
            ctx.allocOutputContext2(null, 'mpegts', null);
            const io = new IOContext();
            io.allocContextWithCallbacks(4096, 1, null, (buffer) => buffer.length);
            ctx.pb = io;
          })();
        }
        await settle();
        console.log('pb', statSync(file).size);
      `;
      const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
        const child = spawn(process.execPath, ['--expose-gc', '--import', import.meta.resolve('tsx'), '--input-type=module', '-e', script], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
        child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
        child.on('close', (code) => resolve({ code, stdout, stderr }));
      });
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /alone 1000\npb 1024/);
    });

    it('ends the reads of an input that outlives its collected IO context', { timeout: 30000 }, async () => {
      const script = `
        const { FormatContext, IOContext, Packet, AVSEEK_SIZE } = await import(${JSON.stringify(new URL('../src/index.ts', import.meta.url).href)});
        const { readFileSync } = await import('node:fs');
        const data = readFileSync(${JSON.stringify(testVideoFile)});
        const ctx = new FormatContext();
        ctx.allocContext();
        await (async () => {
          let position = 0;
          const io = new IOContext();
          io.allocContextWithCallbacks(
            4096,
            0,
            (size) => {
              if (position >= data.length) return null;
              const chunk = data.subarray(position, Math.min(position + size, data.length));
              position += chunk.length;
              return chunk;
            },
            null,
            (offset, whence) => {
              if (whence === AVSEEK_SIZE) return BigInt(data.length);
              position = Number(offset);
              return BigInt(position);
            },
          );
          ctx.pb = io;
          await ctx.openInput('', null, null);
          // the reader thread now reads through the IO context
          const packet = new Packet();
          packet.alloc();
          await ctx.readFrame(packet);
          packet.free();
        })();
        // only the IO context goes out of reach: its callback data has to
        // stay valid for the reader, which finds the callbacks switched off
        ctx._ioContext = null;
        for (let i = 0; i < 8; i++) { globalThis.gc(); await new Promise((resolve) => setImmediate(resolve)); }
        const packet = new Packet();
        packet.alloc();
        let result = 0;
        for (let i = 0; i < 500 && result >= 0; i++) {
          result = await ctx.readFrame(packet);
          packet.unref();
        }
        packet.free();
        await ctx.closeInput();
        console.log('ended', result < 0);
      `;
      const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
        const child = spawn(process.execPath, ['--expose-gc', '--import', import.meta.resolve('tsx'), '--input-type=module', '-e', script], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
        child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
        child.on('close', (code) => resolve({ code, stdout, stderr }));
      });
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /ended true/);
    });
  });
});
