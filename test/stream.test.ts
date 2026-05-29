import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  AV_CODEC_ID_AAC,
  AV_CODEC_ID_H264,
  AV_DISPOSITION_ATTACHED_PIC,
  AV_DISPOSITION_DEFAULT,
  AVDISCARD_ALL,
  AVDISCARD_DEFAULT,
  AVFLAG_NONE,
  AVMEDIA_TYPE_AUDIO,
  AVMEDIA_TYPE_VIDEO,
  AVSTREAM_EVENT_FLAG_METADATA_UPDATED,
  AVSTREAM_EVENT_FLAG_NEW_PACKETS,
  CodecParameters,
  Dictionary,
  FormatContext,
  Rational,
} from '../src/index.js';

import type { AVStreamEventFlag, Stream } from '../src/index.js';

describe('Stream', () => {
  let ctx: FormatContext;
  let stream: Stream;

  beforeEach(() => {
    ctx = new FormatContext();
    ctx.allocOutputContext2(null, 'mp4', 'test.mp4');
    stream = ctx.newStream(null);
  });

  afterEach(() => {
    try {
      if (ctx) {
        ctx.freeContext();
      }
    } catch {
      // Already freed
    }
  });

  describe('Basic Properties', () => {
    it('should have an index', () => {
      assert.equal(stream.index, 0);

      // Create another stream
      const stream2 = ctx.newStream(null);
      assert.equal(stream2.index, 1);
    });

    it('should get and set id', () => {
      // Default id
      const defaultId = stream.id;
      assert.ok(typeof defaultId === 'number');

      // Set custom id
      stream.id = 123;
      assert.equal(stream.id, 123);
    });

    it('should get and set time base', () => {
      // Set time base
      const timeBase = new Rational(1, 25);
      stream.timeBase = timeBase;

      const retrieved = stream.timeBase;
      assert.equal(retrieved.num, 1);
      assert.equal(retrieved.den, 25);
    });

    it('should get start time', () => {
      const startTime = stream.startTime;
      assert.ok(typeof startTime === 'bigint');
    });

    it('should get duration', () => {
      const duration = stream.duration;
      assert.ok(typeof duration === 'bigint');
    });

    it('should get nb frames', () => {
      const nbFrames = stream.nbFrames;
      assert.ok(typeof nbFrames === 'bigint');
    });

    it('should get and set disposition', () => {
      // Default disposition
      const defaultDisp = stream.disposition;
      assert.ok(typeof defaultDisp === 'number');

      // Set disposition flags
      stream.disposition = (AV_DISPOSITION_DEFAULT | AV_DISPOSITION_ATTACHED_PIC) as any;
      assert.equal(stream.disposition, AV_DISPOSITION_DEFAULT | AV_DISPOSITION_ATTACHED_PIC);
    });

    it('should get and set discard', () => {
      // Default discard
      assert.equal(stream.discard, AVDISCARD_DEFAULT);

      // Set discard
      stream.discard = AVDISCARD_ALL;
      assert.equal(stream.discard, AVDISCARD_ALL);
    });

    it('should get sample aspect ratio', () => {
      const sar = stream.sampleAspectRatio;
      assert.ok(sar);
      assert.ok(typeof sar.num === 'number');
      assert.ok(typeof sar.den === 'number');
    });

    it('should get avg frame rate', () => {
      const avgFrameRate = stream.avgFrameRate;
      assert.ok(avgFrameRate);
      assert.ok(typeof avgFrameRate.num === 'number');
      assert.ok(typeof avgFrameRate.den === 'number');
      // For a new stream, frame rates might be 0/0 which is valid in FFmpeg
      // but our Rational class doesn't allow zero denominator
      // This is expected behavior
    });

    it('should get r frame rate', () => {
      const rFrameRate = stream.rFrameRate;
      assert.ok(rFrameRate);
      assert.ok(typeof rFrameRate.num === 'number');
      assert.ok(typeof rFrameRate.den === 'number');
      // For a new stream, frame rates might be 0/0 which is valid in FFmpeg
      // but our Rational class doesn't allow zero denominator
      // This is expected behavior
    });

    it('should get and set ptsWrapBits', () => {
      // Default value (typically 64 for no wrapping)
      const defaultValue = stream.ptsWrapBits;
      assert.ok(typeof defaultValue === 'number');

      // Set to 33 (common for MPEG-TS)
      stream.ptsWrapBits = 33;
      assert.equal(stream.ptsWrapBits, 33);

      // Set to 31 (DVB)
      stream.ptsWrapBits = 31;
      assert.equal(stream.ptsWrapBits, 31);

      // Set to 64 (no wrapping)
      stream.ptsWrapBits = 64;
      assert.equal(stream.ptsWrapBits, 64);

      // Reset to default
      stream.ptsWrapBits = defaultValue;
      assert.equal(stream.ptsWrapBits, defaultValue);
    });
  });

  describe('Codec Parameters', () => {
    it('should get codec parameters', () => {
      const codecpar = stream.codecpar;
      assert.ok(codecpar);
      assert.ok(codecpar instanceof CodecParameters);
    });

    it('should set codec parameters for video', () => {
      const codecpar = stream.codecpar;
      codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      codecpar.codecId = AV_CODEC_ID_H264;
      codecpar.width = 1920;
      codecpar.height = 1080;
      codecpar.bitRate = 4000000n;

      // Verify changes
      assert.equal(stream.codecpar.codecType, AVMEDIA_TYPE_VIDEO);
      assert.equal(stream.codecpar.codecId, AV_CODEC_ID_H264);
      assert.equal(stream.codecpar.width, 1920);
      assert.equal(stream.codecpar.height, 1080);
      assert.equal(stream.codecpar.bitRate, 4000000n);
    });

    it('should set codec parameters for audio', () => {
      const codecpar = stream.codecpar;
      codecpar.codecType = AVMEDIA_TYPE_AUDIO;
      codecpar.codecId = AV_CODEC_ID_AAC;
      codecpar.sampleRate = 48000;
      codecpar.channels = 2;
      codecpar.bitRate = 128000n;

      // Verify changes
      assert.equal(stream.codecpar.codecType, AVMEDIA_TYPE_AUDIO);
      assert.equal(stream.codecpar.codecId, AV_CODEC_ID_AAC);
      assert.equal(stream.codecpar.sampleRate, 48000);
      assert.equal(stream.codecpar.channels, 2);
      assert.equal(stream.codecpar.bitRate, 128000n);
    });

    it('should replace codec parameters', () => {
      // Set initial parameters
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.width = 640;
      stream.codecpar.height = 480;

      // Create new codec parameters
      const newCodecpar = new CodecParameters();
      newCodecpar.alloc();
      newCodecpar.codecType = AVMEDIA_TYPE_AUDIO;
      newCodecpar.sampleRate = 44100;
      newCodecpar.channels = 2;

      // Replace
      stream.codecpar = newCodecpar;

      // Verify replacement
      assert.equal(stream.codecpar.codecType, AVMEDIA_TYPE_AUDIO);
      assert.equal(stream.codecpar.sampleRate, 44100);
      assert.equal(stream.codecpar.channels, 2);
      // Video params should be gone
      assert.equal(stream.codecpar.width, 0);
      assert.equal(stream.codecpar.height, 0);

      newCodecpar.free();
    });
  });

  describe('Metadata', () => {
    it('should get and set metadata', () => {
      const metadata = new Dictionary();
      metadata.alloc();

      metadata.set('title', 'Test Stream', AVFLAG_NONE);
      metadata.set('language', 'eng', AVFLAG_NONE);

      stream.metadata = metadata;

      const retrieved = stream.metadata;
      assert.ok(retrieved);
      assert.equal(retrieved.get('title', AVFLAG_NONE), 'Test Stream');
      assert.equal(retrieved.get('language', AVFLAG_NONE), 'eng');

      metadata.free();
      retrieved.free();
    });

    it('should handle empty metadata', () => {
      const metadata = stream.metadata;
      // For a new stream, metadata might be null
      if (metadata) {
        // Empty metadata should return null for keys
        assert.equal(metadata.get('nonexistent', AVFLAG_NONE), null);
        metadata.free();
      } else {
        // It's okay if metadata is null for a new stream
        assert.equal(metadata, null);
      }
    });
  });

  describe('Event Flags', () => {
    it('should get event flags', () => {
      const eventFlags = stream.eventFlags;
      assert.ok(typeof eventFlags === 'number');
    });
  });

  describe('Multiple Streams', () => {
    it('should handle multiple streams in context', () => {
      // First stream already created in beforeEach
      assert.equal(stream.index, 0);

      // Create more streams
      const stream2 = ctx.newStream(null);
      const stream3 = ctx.newStream(null);

      assert.equal(stream2.index, 1);
      assert.equal(stream3.index, 2);

      // Set different properties for each
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream2.codecpar.codecType = AVMEDIA_TYPE_AUDIO;
      stream3.codecpar.codecType = AVMEDIA_TYPE_VIDEO;

      // Verify independence
      assert.equal(stream.codecpar.codecType, AVMEDIA_TYPE_VIDEO);
      assert.equal(stream2.codecpar.codecType, AVMEDIA_TYPE_AUDIO);
      assert.equal(stream3.codecpar.codecType, AVMEDIA_TYPE_VIDEO);
    });

    it('should maintain stream references', () => {
      // Create multiple streams
      const stream2 = ctx.newStream(null);
      const stream3 = ctx.newStream(null);

      // Set unique IDs
      stream.id = 100;
      stream2.id = 200;
      stream3.id = 300;

      // Access through context
      const streams = ctx.streams;
      if (streams) {
        assert.equal(streams.length, 3);
        assert.equal(streams[0].id, 100);
        assert.equal(streams[1].id, 200);
        assert.equal(streams[2].id, 300);
      }
    });
  });

  describe('Resource Management', () => {
    it('should not crash when context is freed', () => {
      // Set some properties
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.width = 1920;
      stream.codecpar.height = 1080;
      stream.id = 42;

      // Free the context
      ctx.freeContext();
      ctx = null as any;

      // Stream reference still exists but underlying AVStream is freed
      // Accessing stream properties after context is freed would be undefined behavior
      // So we just verify that freeing the context doesn't crash
      assert.ok(true);
    });

    it('should handle streams with different time bases', () => {
      const stream2 = ctx.newStream(null);

      // Set different time bases
      stream.timeBase = new Rational(1, 25);
      stream2.timeBase = new Rational(1, 48000);

      // Verify they're independent
      const tb1 = stream.timeBase;
      const tb2 = stream2.timeBase;

      assert.equal(tb1.num, 1);
      assert.equal(tb1.den, 25);
      assert.equal(tb2.num, 1);
      assert.equal(tb2.den, 48000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      stream.id = 0;
      assert.equal(stream.id, 0);

      stream.disposition = 0 as any;
      assert.equal(stream.disposition, 0);
    });

    it('should handle maximum values', () => {
      stream.id = 0x7fffffff;
      assert.equal(stream.id, 0x7fffffff);
    });

    it('should handle negative id', () => {
      stream.id = -1;
      assert.equal(stream.id, -1);
    });
  });

  describe('Event Flag Operations', () => {
    it('should set single event flag using setEventFlags', () => {
      stream.eventFlags = 0 as AVStreamEventFlag;
      assert.equal(stream.eventFlags, 0);

      stream.setEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED);
      assert.equal(stream.eventFlags, AVSTREAM_EVENT_FLAG_METADATA_UPDATED);
    });

    it('should set multiple event flags using setEventFlags', () => {
      stream.eventFlags = 0 as AVStreamEventFlag;
      assert.equal(stream.eventFlags, 0);

      stream.setEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED, AVSTREAM_EVENT_FLAG_NEW_PACKETS);
      assert.equal(stream.eventFlags, AVSTREAM_EVENT_FLAG_METADATA_UPDATED | AVSTREAM_EVENT_FLAG_NEW_PACKETS);
    });

    it('should clear single event flag using clearEventFlags', () => {
      stream.setEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED, AVSTREAM_EVENT_FLAG_NEW_PACKETS);
      assert.equal(stream.eventFlags, AVSTREAM_EVENT_FLAG_METADATA_UPDATED | AVSTREAM_EVENT_FLAG_NEW_PACKETS);

      stream.clearEventFlags(AVSTREAM_EVENT_FLAG_NEW_PACKETS);
      assert.equal(stream.eventFlags, AVSTREAM_EVENT_FLAG_METADATA_UPDATED);
    });

    it('should clear multiple event flags using clearEventFlags', () => {
      stream.setEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED, AVSTREAM_EVENT_FLAG_NEW_PACKETS);
      assert.equal(stream.eventFlags, AVSTREAM_EVENT_FLAG_METADATA_UPDATED | AVSTREAM_EVENT_FLAG_NEW_PACKETS);

      stream.clearEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED, AVSTREAM_EVENT_FLAG_NEW_PACKETS);
      assert.equal(stream.eventFlags, 0);
    });

    it('should preserve existing event flags when setting new flags', () => {
      stream.setEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED);
      assert.equal(stream.eventFlags, AVSTREAM_EVENT_FLAG_METADATA_UPDATED);

      stream.setEventFlags(AVSTREAM_EVENT_FLAG_NEW_PACKETS);
      assert.equal(stream.eventFlags, AVSTREAM_EVENT_FLAG_METADATA_UPDATED | AVSTREAM_EVENT_FLAG_NEW_PACKETS);
    });

    it('should support direct event flag assignment (backward compatibility)', () => {
      stream.eventFlags = (AVSTREAM_EVENT_FLAG_METADATA_UPDATED | AVSTREAM_EVENT_FLAG_NEW_PACKETS) as AVStreamEventFlag;
      assert.equal(stream.eventFlags, AVSTREAM_EVENT_FLAG_METADATA_UPDATED | AVSTREAM_EVENT_FLAG_NEW_PACKETS);

      stream.eventFlags = 0 as AVStreamEventFlag;
      assert.equal(stream.eventFlags, 0);
    });

    it('should check for single event flag using hasEventFlags', () => {
      stream.eventFlags = 0 as AVStreamEventFlag;
      assert.equal(stream.hasEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED), false);

      stream.setEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED);
      assert.equal(stream.hasEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED), true);
      assert.equal(stream.hasEventFlags(AVSTREAM_EVENT_FLAG_NEW_PACKETS), false);

      stream.setEventFlags(AVSTREAM_EVENT_FLAG_NEW_PACKETS);
      assert.equal(stream.hasEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED), true);
      assert.equal(stream.hasEventFlags(AVSTREAM_EVENT_FLAG_NEW_PACKETS), true);
    });

    it('should check for multiple event flags using hasEventFlags', () => {
      stream.eventFlags = 0 as AVStreamEventFlag;
      assert.equal(stream.hasEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED, AVSTREAM_EVENT_FLAG_NEW_PACKETS), false);

      stream.setEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED);
      assert.equal(stream.hasEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED, AVSTREAM_EVENT_FLAG_NEW_PACKETS), false);

      stream.setEventFlags(AVSTREAM_EVENT_FLAG_NEW_PACKETS);
      assert.equal(stream.hasEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED, AVSTREAM_EVENT_FLAG_NEW_PACKETS), true);
    });

    it('should return false when only some event flags are set', () => {
      stream.setEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED);
      assert.equal(stream.hasEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED), true);
      assert.equal(stream.hasEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED, AVSTREAM_EVENT_FLAG_NEW_PACKETS), false);
    });
  });
});
