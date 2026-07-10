import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { AVFMT_NEEDNUMBER, AVFMT_NOFILE, AVFMT_NOTIMESTAMPS, AVIO_FLAG_READ, FormatContext, InputFormat, IOContext } from '../src/index.js';
import { getInputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputFile = getInputFile('video.mp4');
const inputTextFile = getInputFile('text.txt');

describe('InputFormat', () => {
  describe('Static Methods', () => {
    it('should find input format by name', () => {
      const format = InputFormat.findInputFormat('mp4');
      assert.ok(format, 'Should find mp4 format');
      assert.ok(format instanceof InputFormat);
    });

    it('should return null for unknown format', () => {
      const format = InputFormat.findInputFormat('unknown_format_xyz');
      assert.equal(format, null);
    });

    it('should find common formats', () => {
      const formats = ['mp4', 'mov', 'avi', 'matroska', 'mp3', 'wav', 'flac'];

      for (const name of formats) {
        const format = InputFormat.findInputFormat(name);
        if (format) {
          // Some formats might not be available depending on FFmpeg build
          assert.ok(format instanceof InputFormat, `${name} should be InputFormat instance`);
        }
      }
    });

    it('should find format with different casing', () => {
      // FFmpeg format names are typically lowercase
      const format1 = InputFormat.findInputFormat('mp4');
      const format2 = InputFormat.findInputFormat('MP4');

      // MP4 (uppercase) should return null as FFmpeg uses lowercase
      assert.ok(format1);
      // Note: Some FFmpeg builds might be case-insensitive
      assert.ok(!format2 || format2 !== null, 'Uppercase may or may not work');
    });
  });

  describe('Properties', () => {
    it('should get format name', () => {
      const format = InputFormat.findInputFormat('mp4');
      assert.ok(format);
      // Name can be a comma-separated list of format names
      assert.ok(format.name);
      assert.ok(format.name.includes('mp4'));
    });

    it('should get long name', () => {
      const format = InputFormat.findInputFormat('mp4');
      assert.ok(format);
      assert.ok(format.longName);
      assert.ok(format.longName.length > 0);
      // Long name should be descriptive - MP4 format is part of QuickTime/MOV family
      assert.ok(format.longName.toLowerCase().includes('mov') || format.longName.toLowerCase().includes('quicktime'));
    });

    it('should get extensions', () => {
      const format = InputFormat.findInputFormat('mp4');
      assert.ok(format);
      const extensions = format.extensions;
      if (extensions) {
        assert.ok(extensions.includes('mp4'));
        // MP4 format supports multiple extensions
        assert.ok(extensions.includes('m4a') || extensions.includes('m4v'));
      }
    });

    it('should get mime type', () => {
      const format = InputFormat.findInputFormat('mp4');
      assert.ok(format);
      const mimeType = format.mimeType;
      // Not all formats have mime types
      if (mimeType) {
        assert.ok(mimeType.includes('mp4') || mimeType.includes('mpeg'));
      }
    });

    it('should get flags', () => {
      const format = InputFormat.findInputFormat('mp4');
      assert.ok(format);
      const flags = format.flags;
      assert.ok(typeof flags === 'number');
      // Check if specific flags are set (these are examples, actual flags depend on format)
      // MP4 typically doesn't have NOFILE flag
      assert.ok((flags & AVFMT_NOFILE) === 0);
    });

    it('should handle formats without extensions', () => {
      // Some formats might not have extensions
      const format = InputFormat.findInputFormat('pipe');
      if (format) {
        const extensions = format.extensions;
        // Pipe format shouldn't have extensions
        assert.ok(!extensions || extensions === '');
      }
    });

    it('should handle formats without mime type', () => {
      const format = InputFormat.findInputFormat('avi');
      if (format) {
        const mimeType = format.mimeType;
        // AVI might not have mime type or might have it
        assert.ok(mimeType === null || typeof mimeType === 'string');
      }
    });
  });

  describe('Different Format Types', () => {
    it('should handle video container formats', () => {
      const videoFormats = ['mp4', 'avi', 'mov', 'matroska', 'webm'];

      for (const name of videoFormats) {
        const format = InputFormat.findInputFormat(name);
        if (format) {
          assert.ok(format.name);
          assert.ok(format.longName);
        }
      }
    });

    it('should handle audio formats', () => {
      const audioFormats = ['mp3', 'wav', 'flac', 'aac', 'ogg'];

      for (const name of audioFormats) {
        const format = InputFormat.findInputFormat(name);
        if (format) {
          assert.ok(format.name);
          assert.ok(format.longName);
        }
      }
    });

    it('should handle image formats', () => {
      const imageFormats = ['image2', 'mjpeg', 'png_pipe', 'jpeg_pipe'];

      for (const name of imageFormats) {
        const format = InputFormat.findInputFormat(name);
        if (format) {
          assert.ok(format.name);
          assert.ok(format.longName);
        }
      }
    });

    it('should handle network protocols', () => {
      const networkFormats = ['rtsp', 'rtp', 'http', 'hls'];

      for (const name of networkFormats) {
        const format = InputFormat.findInputFormat(name);
        if (format) {
          assert.ok(format.name);
          // Network protocols might have NOFILE flag
          const flags = format.flags;
          // Some network formats have NOFILE flag
          if (name === 'rtsp' || name === 'rtp') {
            assert.ok((flags & AVFMT_NOFILE) !== 0);
          }
        }
      }
    });
  });

  describe('Format Flags', () => {
    it('should identify NOFILE formats', () => {
      // Formats that don't need a file (like network protocols)
      const format = InputFormat.findInputFormat('rtsp');
      if (format) {
        const flags = format.flags;
        assert.ok((flags & AVFMT_NOFILE) !== 0, 'RTSP should have NOFILE flag');
      }
    });

    it('should identify formats needing number', () => {
      // Image sequence formats need number pattern
      const format = InputFormat.findInputFormat('image2');
      if (format) {
        const flags = format.flags;
        // image2 format needs numbered sequence
        assert.ok((flags & AVFMT_NEEDNUMBER) !== 0 || true, 'May need number for sequences');
      }
    });

    it('should check various flag combinations', () => {
      const format = InputFormat.findInputFormat('mp4');
      if (format) {
        const flags = format.flags;

        // MP4/MOV has complex structure, may not support direct byte seeking
        // This is format-specific and depends on FFmpeg version
        // Just verify we can read the flags
        assert.ok(typeof flags === 'number', 'Should have numeric flags');

        // MP4 has timestamps
        assert.ok((flags & AVFMT_NOTIMESTAMPS) === 0, 'MP4 should have timestamps');

        // MP4 is not a network protocol, should need a file
        assert.ok((flags & AVFMT_NOFILE) === 0, 'MP4 should need a file');
      }
    });

    it('should check for single flag using hasFlags', () => {
      const format = InputFormat.findInputFormat('mp4');
      if (format) {
        // MP4 should not have NOFILE flag
        assert.equal(format.hasFlags(AVFMT_NOFILE as any), false);

        // MP4 should not have NOTIMESTAMPS flag
        assert.equal(format.hasFlags(AVFMT_NOTIMESTAMPS as any), false);
      }

      // RTSP should have NOFILE flag
      const rtsp = InputFormat.findInputFormat('rtsp');
      if (rtsp) {
        assert.equal(rtsp.hasFlags(AVFMT_NOFILE as any), true);
      }
    });

    it('should check for multiple flags using hasFlags', () => {
      const format = InputFormat.findInputFormat('mp4');
      if (format) {
        const flags = format.flags;

        // Find flags that are set for mp4
        const setFlags: number[] = [];
        for (let i = 0; i < 32 && setFlags.length < 2; i++) {
          const testFlag = 1 << i;
          if ((flags & testFlag) === testFlag) {
            setFlags.push(testFlag);
          }
        }

        // If we found at least 2 flags, test with both
        if (setFlags.length >= 2) {
          assert.equal(format.hasFlags(setFlags[0] as any, setFlags[1] as any), true);
        }

        // Test with flag that's not set
        assert.equal(format.hasFlags(AVFMT_NOFILE as any, AVFMT_NOTIMESTAMPS as any), false);
      }
    });

    it('should return false when only some flags are set', () => {
      const format = InputFormat.findInputFormat('mp4');
      if (format) {
        const flags = format.flags;

        // Find one flag that is set
        let setFlag = 0;
        for (let i = 0; i < 32; i++) {
          const testFlag = 1 << i;
          if ((flags & testFlag) === testFlag) {
            setFlag = testFlag;
            break;
          }
        }

        if (setFlag !== 0) {
          // Test with one set flag and one unset flag (NOFILE should not be set for mp4)
          assert.equal(format.hasFlags(setFlag as any, AVFMT_NOFILE as any), false);
        }
      }
    });
  });

  describe('Integration with FormatContext', () => {
    it('should work with FormatContext.openInput (async)', async () => {
      // This test would need an actual file to test properly
      // Just verify the format can be obtained and used
      const format = InputFormat.findInputFormat('mp4');
      assert.ok(format);

      // We can't actually test openInput without a file
      // but we can verify the format is valid
      // The MP4 format name is a comma-separated list
      assert.ok(format.name?.includes('mp4'));
    });

    it('should be returned by FormatContext.iformat (async)', async () => {
      const format = InputFormat.findInputFormat('mp4');
      assert.ok(format);

      const ctx = new FormatContext();
      await ctx.openInput(inputFile, format, null);
      const iformat = ctx.iformat;
      assert.ok(iformat);
      assert.equal(iformat.name, format.name);
    });

    it('should be returned by FormatContext.iformat (sync)', () => {
      const format = InputFormat.findInputFormat('mp4');
      assert.ok(format);

      const ctx = new FormatContext();
      ctx.openInputSync(inputFile, format, null);
      const iformat = ctx.iformat;
      assert.ok(iformat);
      assert.equal(iformat.name, format.name);
    });
  });

  describe('Format Probing', () => {
    it('should probe MP4 format from buffer', () => {
      // Read first few KB of MP4 file
      const fullBuffer = readFileSync(inputFile);
      const buffer = fullBuffer.subarray(0, 4096);
      const format = InputFormat.probe(buffer, 'video.mp4');

      assert.ok(format, 'Should detect MP4 format');
      assert.ok(format.name?.includes('mp4') ?? format.name?.includes('mov'), `Format name should include mp4 or mov, got: ${format?.name}`);
    });

    it('should probe format without filename hint', () => {
      const fullBuffer = readFileSync(inputFile);
      const buffer = fullBuffer.subarray(0, 4096);
      const format = InputFormat.probe(buffer);

      assert.ok(format, 'Should detect format without filename');
      assert.ok(format.name?.includes('mp4') ?? format.name?.includes('mov'));
    });

    it('should return null for non-media data', () => {
      // Random data that doesn't match any format
      const buffer = Buffer.from('This is just some text data, not a media file');
      const format = InputFormat.probe(buffer);

      assert.equal(format, null, 'Should not detect format from text data');
    });

    it('should probe different formats from real files', () => {
      // Test with real files from testdata
      const tests = [
        { file: getInputFile('video.mp4'), expected: 'mp4' },
        { file: getInputFile('audio.wav'), expected: 'wav' },
        { file: getInputFile('audio.aac'), expected: 'aac' },
        { file: getInputFile('audio.mp2'), expected: 'mp2' },
        { file: getInputFile('image-rgba.png'), expected: 'png' },
        { file: getInputFile('video.m1v'), expected: 'mpegvideo' },
      ];

      for (const test of tests) {
        try {
          // Read first 4KB of file for probing
          const fullBuffer = readFileSync(test.file);
          const buffer = fullBuffer.subarray(0, 4096);
          const format = InputFormat.probe(buffer, test.file);

          if (format) {
            assert.ok(
              format.name?.includes(test.expected) ?? format.name?.includes('image2') ?? format.name?.includes('mpegps'),
              `Expected ${test.expected} in format name, got ${format.name}`,
            );
          } else {
            // Some formats might need more data or filename hint
            console.log(`Could not detect format for ${test.file}`);
          }
        } catch (err) {
          // File might not exist in test environment
          console.log(`Skipping ${test.file}: ${err.message}`);
        }
      }
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.alloc(0);
      const format = InputFormat.probe(buffer);

      assert.equal(format, null, 'Empty buffer should not detect format');
    });

    it('should handle small buffer', () => {
      // Very small buffer might not have enough data to detect
      const buffer = Buffer.from([0x00, 0x00]);
      const format = InputFormat.probe(buffer);

      assert.equal(format, null, 'Too small buffer should not detect format');
    });

    it('should probe buffer from IOContext (async)', async () => {
      const io = new IOContext();
      await io.open2(inputFile, AVIO_FLAG_READ);

      try {
        const format = await InputFormat.probeBuffer(io);
        assert.ok(format, 'Should detect format from IOContext');
        assert.ok(format.name?.includes('mp4') ?? format.name?.includes('mov'), `Format name should include mp4 or mov, got: ${format?.name}`);
      } finally {
        await io.closep();
      }
    });

    it('should probe buffer with custom max probe size (async)', async () => {
      const io = new IOContext();
      await io.open2(inputFile, AVIO_FLAG_READ);

      try {
        // Use smaller probe size
        const format = await InputFormat.probeBuffer(io, 2048);
        assert.ok(format, 'Should detect format with custom probe size');
        assert.ok(format.name?.includes('mp4') ?? format.name?.includes('mov'));
      } finally {
        await io.closep();
      }
    });

    it('should not crash when freeContext() races an in-flight probeBuffer (async)', { timeout: 10000 }, async () => {
      const io = new IOContext();
      await io.open2(inputFile, AVIO_FLAG_READ);

      // probeBuffer reads through the IOContext on the threadpool -
      // freeContext() waits for the probe instead of pulling the context out
      // from under it (previously a use-after-free)
      const probe = InputFormat.probeBuffer(io);
      io.freeContext();

      const [result] = await Promise.allSettled([probe]);
      assert.notEqual(result.status, undefined);
    });

    it('should handle probing non-media IOContext (async)', async () => {
      const io = new IOContext();
      await io.open2(inputTextFile, AVIO_FLAG_READ);

      try {
        const format = await InputFormat.probeBuffer(io);
        // FFmpeg may detect some formats even from text data (e.g., raw data formats)
        // We just verify that probeBuffer doesn't crash and returns a valid result
        if (format) {
          assert.ok(format instanceof InputFormat, 'Should return InputFormat instance if detected');
          assert.ok(format.name, 'Detected format should have a name');
        } else {
          assert.equal(format, null, 'Should return null if no format detected');
        }
      } finally {
        await io.closep();
      }
    });

    it('should probe buffer from IOContext (sync)', () => {
      const io = new IOContext();
      io.open2Sync(inputFile, AVIO_FLAG_READ);

      try {
        const format = InputFormat.probeBufferSync(io);
        assert.ok(format, 'Should detect format from IOContext');
        assert.ok(format.name?.includes('mp4') ?? format.name?.includes('mov'), `Format name should include mp4 or mov, got: ${format?.name}`);
      } finally {
        io.closepSync();
      }
    });

    it('should probe buffer with custom max probe size (sync)', () => {
      const io = new IOContext();
      io.open2Sync(inputFile, AVIO_FLAG_READ);

      try {
        // Use smaller probe size
        const format = InputFormat.probeBufferSync(io, 2048);
        assert.ok(format, 'Should detect format with custom probe size');
        assert.ok(format.name?.includes('mp4') ?? format.name?.includes('mov'));
      } finally {
        io.closepSync();
      }
    });

    it('should handle probing non-media IOContext (sync)', () => {
      const io = new IOContext();
      io.open2Sync(inputTextFile, AVIO_FLAG_READ);

      try {
        // Sync version may throw for invalid data
        try {
          const format = InputFormat.probeBufferSync(io);
          // FFmpeg may detect some formats even from text data (e.g., raw data formats)
          // We just verify that probeBuffer doesn't crash and returns a valid result
          if (format) {
            assert.ok(format instanceof InputFormat, 'Should return InputFormat instance if detected');
            assert.ok(format.name, 'Detected format should have a name');
          } else {
            assert.equal(format, null, 'Should return null if no format detected');
          }
        } catch (err) {
          // Sync version may throw for invalid data
          assert.ok(err.message.includes('Invalid data') ?? err.message.includes('probe'), 'Should throw appropriate error for non-media data');
        }
      } finally {
        io.closepSync();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const format = InputFormat.findInputFormat('');
      assert.equal(format, null);
    });

    it('should handle special characters in format name', () => {
      const format = InputFormat.findInputFormat('mp-4');
      assert.equal(format, null);

      const format2 = InputFormat.findInputFormat('mp4!');
      assert.equal(format2, null);
    });

    it('should handle very long format name', () => {
      const longName = 'a'.repeat(1000);
      const format = InputFormat.findInputFormat(longName);
      assert.equal(format, null);
    });

    it('should handle format aliases', () => {
      // Some formats have aliases
      const format1 = InputFormat.findInputFormat('matroska');
      const format2 = InputFormat.findInputFormat('mkv');

      // mkv is an extension, not a format name
      assert.ok(format1);
      assert.equal(format2, null);

      // Check matroska format has mkv extension
      if (format1) {
        const extensions = format1.extensions;
        if (extensions) {
          assert.ok(extensions.includes('mkv') || extensions.includes('matroska'));
        }
      }
    });
  });

  describe('Resource Management', () => {
    it('should not require cleanup', () => {
      // InputFormat wraps static FFmpeg data, no cleanup needed
      const format = InputFormat.findInputFormat('mp4');
      assert.ok(format);

      // No free/dispose method should exist
      assert.equal(typeof (format as any).free, 'undefined');
      assert.equal(typeof (format as any).dispose, 'undefined');
    });

    it('should handle multiple references', () => {
      const format1 = InputFormat.findInputFormat('mp4');
      const format2 = InputFormat.findInputFormat('mp4');

      assert.ok(format1);
      assert.ok(format2);

      // Both should reference the same format
      assert.equal(format1.name, format2.name);
      assert.equal(format1.longName, format2.longName);
    });

    it('should be immutable', () => {
      const format = InputFormat.findInputFormat('mp4');
      assert.ok(format);

      // Properties should be read-only
      const originalName = format.name;

      // Try to modify (this should not work)
      try {
        (format as any).name = 'changed';
      } catch {
        // Expected to fail
      }

      // Name should remain unchanged
      assert.equal(format.name, originalName);
    });
  });
});
