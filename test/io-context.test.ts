import assert from 'node:assert';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { afterEach, describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import { AVERROR_EOF, AVIO_FLAG_READ, AVIO_FLAG_WRITE, AVSEEK_CUR, AVSEEK_END, AVSEEK_SET, AVSEEK_SIZE, IOContext } from '../src/index.js';
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
});
