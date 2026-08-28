import assert from 'node:assert';
import { existsSync, unlinkSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { after, afterEach, beforeEach, describe, it } from 'node:test';

import {
  AV_CODEC_ID_H264,
  AV_CODEC_ID_PCM_S16LE,
  AVERROR_EXIT,
  AV_SAMPLE_FMT_S16,
  AVFLAG_NONE,
  AVFMT_FLAG_GENPTS,
  AVSEEK_CUR,
  AVSEEK_END,
  AVSEEK_FLAG_BACKWARD,
  AVSEEK_SET,
  AVSEEK_SIZE,
  AVFMT_FLAG_IGNIDX,
  AV_DISPOSITION_ATTACHED_PIC,
  AVIO_FLAG_WRITE,
  AVMEDIA_TYPE_AUDIO,
  AVMEDIA_TYPE_VIDEO,
  Codec,
  Dictionary,
  FormatContext,
  IOContext,
  OutputFormat,
  Packet,
  Rational,
} from '../src/index.js';

import type { AVFormatFlag } from '../src/index.js';
import { getInputFile, getOutputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const testFile = getOutputFile('test.mp4');
const testAudioFile = getOutputFile('test-audio.wav');
const inputVideoFile = getInputFile('video.mp4');

describe('FormatContext', () => {
  let ctx: FormatContext;

  after(() => {
    // Clean up test files
    try {
      if (existsSync(testFile)) unlinkSync(testFile);
      if (existsSync(testAudioFile)) unlinkSync(testAudioFile);
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    ctx = new FormatContext();
  });

  afterEach(() => {
    // Clean up context if not already done
    // Note: Some tests may have already freed the context
    try {
      if (ctx) {
        ctx.freeContext();
      }
    } catch {
      // Already freed or error during cleanup
      // This is expected for some tests
    }
    ctx = null as any; // Clear reference
  });

  describe('Lifecycle', () => {
    it('should create an uninitialized format context', () => {
      assert.ok(ctx);
    });

    it('should allocate output context', () => {
      const ret = ctx.allocOutputContext2(null, null, testFile);
      assert.equal(ret, 0);
      // Context should be allocated for output
    });

    it('should allocate output context with format', () => {
      const format = OutputFormat.guessFormat('mp4', null, null);
      assert.ok(format);

      const ret = ctx.allocOutputContext2(format, null, null);
      assert.equal(ret, 0);
    });

    it('should open input (async)', async () => {
      // Use existing test video file
      const ret = await ctx.openInput(inputVideoFile, null, null);
      assert.equal(ret, 0);
    });

    it('should open input (sync)', () => {
      // Use existing test video file
      const ret = ctx.openInputSync(inputVideoFile, null, null);
      assert.equal(ret, 0);
    });

    it('should free context', () => {
      ctx.allocOutputContext2(null, null, testFile);
      ctx.freeContext();
      // After free, context is invalid
      ctx = null as any; // Clear reference so afterEach doesn't double-free
    });

    it('should support using statement for automatic disposal', async () => {
      await using testCtx = new FormatContext();
      testCtx.allocOutputContext2(null, null, testFile);
      assert.ok(testCtx);
      // testCtx will be automatically disposed when leaving scope
    });

    it('should fully free an output context on async dispose', async () => {
      const disposeFile = getOutputFile('dispose-output.mp4');
      const testCtx = new FormatContext();

      let ret = testCtx.allocOutputContext2(null, null, disposeFile);
      assert.equal(ret, 0);

      ret = await testCtx.openOutput();
      assert.equal(ret, 0);

      await testCtx[Symbol.asyncDispose]();

      // Context is freed: properties fall back to defaults
      assert.equal(testCtx.nbStreams, 0);
      assert.equal(testCtx.url, null);
      assert.equal(testCtx.oformat, null);

      // Double dispose and manual free must be no-ops (no double-free)
      await testCtx[Symbol.asyncDispose]();
      testCtx.freeContext();

      try {
        if (existsSync(disposeFile)) unlinkSync(disposeFile);
      } catch {
        // Ignore cleanup errors
      }
    });
  });

  describe('Input Operations', () => {
    it('should open input file (async)', async () => {
      const ret = await ctx.openInput(inputVideoFile, null, null);
      assert.equal(ret, 0);
      assert.ok(ctx.nbStreams > 0);
    });

    it('should open input file (sync)', () => {
      const ret = ctx.openInputSync(inputVideoFile, null, null);
      assert.equal(ret, 0);
      assert.ok(ctx.nbStreams > 0);
    });

    it('should open input with options (async)', async () => {
      const options = new Dictionary();
      options.alloc();

      const ret = await ctx.openInput(inputVideoFile, null, options);
      assert.equal(ret, 0);
      options.free();
    });

    it('should open input with options (sync)', () => {
      const options = new Dictionary();
      options.alloc();

      const ret = ctx.openInputSync(inputVideoFile, null, options);
      assert.equal(ret, 0);
      options.free();
    });

    it('should find stream info (async)', async () => {
      await ctx.openInput(inputVideoFile, null, null);
      const ret = await ctx.findStreamInfo(null);
      assert.equal(ret, 0);
    });

    it('should find stream info (sync)', () => {
      ctx.openInputSync(inputVideoFile, null, null);
      const ret = ctx.findStreamInfoSync(null);
      assert.equal(ret, 0);
    });

    it('should find stream info with per-stream options array (async)', async () => {
      await ctx.openInput(inputVideoFile, null, null);
      // video.mp4 has a video and an audio stream
      assert.ok(ctx.nbStreams >= 2);

      const videoOptions = Dictionary.fromObject({ threads: '1' });
      const audioOptions = Dictionary.fromObject({ threads: '1' });

      const ret = await ctx.findStreamInfo([videoOptions, audioOptions]);
      assert.ok(ret >= 0);
      assert.ok(ctx.nbStreams >= 2);
      assert.equal(ctx.streams.length, ctx.nbStreams);

      // Options are copied internally, the wrappers stay owned by us
      videoOptions.free();
      audioOptions.free();
    });

    it('should find stream info with per-stream options array (sync)', () => {
      ctx.openInputSync(inputVideoFile, null, null);
      // video.mp4 has a video and an audio stream
      assert.ok(ctx.nbStreams >= 2);

      const videoOptions = Dictionary.fromObject({ threads: '1' });
      const audioOptions = Dictionary.fromObject({ threads: '1' });

      const ret = ctx.findStreamInfoSync([videoOptions, audioOptions]);
      assert.ok(ret >= 0);
      assert.ok(ctx.nbStreams >= 2);
      assert.equal(ctx.streams.length, ctx.nbStreams);

      videoOptions.free();
      audioOptions.free();
    });

    it('should find stream info with fewer options than streams (sync)', () => {
      ctx.openInputSync(inputVideoFile, null, null);
      assert.ok(ctx.nbStreams >= 2);

      // Missing entries are treated as no options for that stream
      const options = Dictionary.fromObject({ threads: '1' });
      const ret = ctx.findStreamInfoSync([options]);
      assert.ok(ret >= 0);
      options.free();
    });

    it('should reject non-array non-null options for find stream info', async () => {
      await ctx.openInput(inputVideoFile, null, null);

      // Bypass the TS layer to exercise the native argument validation
      const native = ctx.getNative() as any;
      assert.throws(() => native.findStreamInfoSync('invalid'), TypeError);
      assert.throws(() => native.findStreamInfo('invalid'), TypeError);
    });

    it('should read packets (async)', async () => {
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      const packet = new Packet();
      packet.alloc();

      const ret = await ctx.readFrame(packet);
      // Should succeed with video.mp4
      assert.equal(ret, 0);

      packet.free();
    });

    it('should read packets (sync)', () => {
      ctx.openInputSync(inputVideoFile, null, null);
      ctx.findStreamInfoSync(null);

      const packet = new Packet();
      packet.alloc();

      const ret = ctx.readFrameSync(packet);
      // Should succeed with video.mp4
      assert.equal(ret, 0);

      packet.free();
    });

    it('should seek to timestamp (async)', async () => {
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      const ret = await ctx.seekFrame(-1, 0n, AVFLAG_NONE);
      // Seeking should work for mp4
      assert.equal(ret, 0);
    });

    it('should seek to timestamp (sync)', () => {
      ctx.openInputSync(inputVideoFile, null, null);
      ctx.findStreamInfoSync(null);

      const ret = ctx.seekFrameSync(-1, 0n, AVFLAG_NONE);
      // Seeking should work for mp4
      assert.equal(ret, 0);
    });

    it('should seek file with bounds (async)', async () => {
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      // Stream index -1 uses AV_TIME_BASE units
      const ret = await ctx.seekFile(-1, 0n, 0n, 1000000n, AVFLAG_NONE);
      assert.ok(ret >= 0);
    });

    it('should seek file with bounds (sync)', () => {
      ctx.openInputSync(inputVideoFile, null, null);
      ctx.findStreamInfoSync(null);

      // Stream index -1 uses AV_TIME_BASE units
      const ret = ctx.seekFileSync(-1, 0n, 0n, 1000000n, AVFLAG_NONE);
      assert.ok(ret >= 0);
    });

    it('should close input (async)', async () => {
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      // Should be able to close input without error
      await ctx.closeInput();

      // After closing, we should be able to open again
      const ret = await ctx.openInput(inputVideoFile, null, null);
      assert.equal(ret, 0);
    });

    it('should close input (sync)', () => {
      ctx.openInputSync(inputVideoFile, null, null);
      ctx.findStreamInfoSync(null);

      // Should be able to close input without error
      ctx.closeInputSync();

      // After closing, we should be able to open again
      const ret = ctx.openInputSync(inputVideoFile, null, null);
      assert.equal(ret, 0);
    });
  });

  describe('Output Operations', () => {
    beforeEach(() => {
      ctx.allocOutputContext2(null, null, testFile);
    });

    it('should create new stream', () => {
      const stream = ctx.newStream(null);
      assert.ok(stream);
      assert.equal(ctx.nbStreams, 1);
    });

    it('should create stream with codec', () => {
      const codec = Codec.findEncoder(AV_CODEC_ID_H264);
      if (codec) {
        const stream = ctx.newStream(codec);
        assert.ok(stream);
        // Note: newStream with codec doesn't automatically set codecpar
        // The codec is used as a hint, but codecpar must still be set manually
        stream.codecpar.codecId = AV_CODEC_ID_H264;
        assert.equal(stream.codecpar.codecId, AV_CODEC_ID_H264);
      }
    });

    it('should write header (async)', async () => {
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 1920;
      stream.codecpar.height = 1080;

      // Open output file explicitly
      const openRet = await ctx.openOutput();
      assert.equal(openRet, 0);

      const ret = await ctx.writeHeader(null);
      assert.equal(ret, 0);

      // ctx.closeOutput();
    });

    it('should write header (sync)', () => {
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 1920;
      stream.codecpar.height = 1080;

      // Open output file explicitly
      const openRet = ctx.openOutputSync();
      assert.equal(openRet, 0);

      const ret = ctx.writeHeaderSync(null);
      assert.equal(ret, 0);

      // ctx.closeOutput();
    });

    it('should write header with options (async)', async () => {
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 1920;
      stream.codecpar.height = 1080;

      await ctx.openOutput();

      const options = new Dictionary();
      options.alloc();

      const ret = await ctx.writeHeader(options);
      assert.equal(ret, 0);

      // ctx.closeOutput();
      options.free();
    });

    it('should write header with options (sync)', () => {
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 1920;
      stream.codecpar.height = 1080;

      ctx.openOutputSync();

      const options = new Dictionary();
      options.alloc();

      const ret = ctx.writeHeaderSync(options);
      assert.equal(ret, 0);

      // ctx.closeOutput();
      options.free();
    });

    it('should write packet (async)', async () => {
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 1920;
      stream.codecpar.height = 1080;

      await ctx.openOutput();
      await ctx.writeHeader(null);

      const packet = new Packet();
      packet.alloc();
      packet.streamIndex = 0;
      packet.pts = 0n;
      packet.dts = 0n;

      const ret = await ctx.writeFrame(packet);
      // Writing might fail without proper packet data
      assert.ok(ret <= 0);

      // ctx.closeOutput();
      packet.free();
    });

    it('should write packet (sync)', () => {
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 1920;
      stream.codecpar.height = 1080;

      ctx.openOutputSync();
      ctx.writeHeaderSync(null);

      const packet = new Packet();
      packet.alloc();
      packet.streamIndex = 0;
      packet.pts = 0n;
      packet.dts = 0n;

      const ret = ctx.writeFrameSync(packet);
      // Writing might fail without proper packet data
      assert.ok(ret <= 0);

      // ctx.closeOutput();
      packet.free();
    });

    it('should write trailer (async)', async () => {
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 1920;
      stream.codecpar.height = 1080;

      await ctx.openOutput();
      await ctx.writeHeader(null);
      const ret = await ctx.writeTrailer();
      assert.equal(ret, 0);

      // ctx.closeOutput();
    });

    it('should write trailer (sync)', () => {
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 1920;
      stream.codecpar.height = 1080;

      ctx.openOutputSync();
      ctx.writeHeaderSync(null);
      const ret = ctx.writeTrailerSync();
      assert.equal(ret, 0);

      // ctx.closeOutput();
    });

    it('should interleave and write packet (async)', async () => {
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 1920;
      stream.codecpar.height = 1080;

      await ctx.openOutput();
      await ctx.writeHeader(null);

      const packet = new Packet();
      packet.alloc();
      packet.streamIndex = 0;

      const ret = await ctx.interleavedWriteFrame(packet);
      // Writing might fail without proper packet data
      assert.ok(ret <= 0);

      // ctx.closeOutput();
      packet.free();
    });

    it('should interleave and write packet (sync)', () => {
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 1920;
      stream.codecpar.height = 1080;

      ctx.openOutputSync();
      ctx.writeHeaderSync(null);

      const packet = new Packet();
      packet.alloc();
      packet.streamIndex = 0;
      packet.pts = 0n;
      packet.dts = 0n;

      const ret = ctx.interleavedWriteFrameSync(packet);
      assert.ok(ret <= 0);

      // ctx.closeOutput();
      packet.free();
    });
  });

  describe('Stream Selection', () => {
    it('should find best stream without decoder', async () => {
      // Need an actual file with streams for this test
      // We'll use allocOutputContext2 and add a stream as simulation
      ctx.allocOutputContext2(null, 'mp4', null);
      const stream = ctx.newStream(null);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;

      // Find best stream without decoder (original API)
      const streamIndex = ctx.findBestStream(AVMEDIA_TYPE_VIDEO, -1, -1);
      // With our mock setup, it should find stream 0 or return error
      assert.ok(typeof streamIndex === 'number');
    });

    it('should find best stream with decoder', async () => {
      ctx.allocOutputContext2(null, 'mp4', null);
      const stream = ctx.newStream(null);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;

      // Find best stream with decoder (new API)
      const result = ctx.findBestStream(AVMEDIA_TYPE_VIDEO, -1, -1, true, 0);
      assert.ok(typeof result === 'object');
      assert.ok('streamIndex' in result);
      assert.ok('decoder' in result);
      assert.ok(typeof result.streamIndex === 'number');
      // decoder might be null if no decoder found for the stream
      if (result.decoder) {
        assert.ok(result.decoder.name);
      }
    });
  });

  describe('Stream Access', () => {
    beforeEach(() => {
      ctx.allocOutputContext2(null, null, testFile);
    });

    it('should get number of streams', () => {
      assert.equal(ctx.nbStreams, 0);

      ctx.newStream(null);
      assert.equal(ctx.nbStreams, 1);

      ctx.newStream(null);
      assert.equal(ctx.nbStreams, 2);
    });

    it('should get stream by index', () => {
      const stream1 = ctx.newStream(null);
      const stream2 = ctx.newStream(null);

      assert.ok(stream1);
      assert.ok(stream2);
      assert.equal(stream1.index, 0);
      assert.equal(stream2.index, 1);

      const streams = ctx.streams;
      assert.ok(streams);
      assert.equal(streams.length, 2);
      assert.equal(streams[0].index, 0);
      assert.equal(streams[1].index, 1);
    });

    it('should handle invalid stream index', () => {
      ctx.newStream(null);

      const streams = ctx.streams;
      assert.ok(streams);
      assert.equal(streams.length, 1);
      assert.equal(streams[10], undefined);
    });

    it('should get all streams', () => {
      ctx.newStream(null);
      ctx.newStream(null);
      ctx.newStream(null);

      const streams = ctx.streams;
      assert.ok(Array.isArray(streams));
      assert.equal(streams.length, 3);
    });
  });

  describe('Metadata and Attached Pictures', () => {
    it('should return metadata as a copy', () => {
      const ret = ctx.allocOutputContext2(null, 'mp4', null);
      assert.equal(ret, 0, 'Should allocate output context');

      ctx.metadata = Dictionary.fromObject({ title: 'original' });
      const copy = ctx.metadata;
      assert.ok(copy, 'Should return metadata');
      assert.equal(copy.get('title'), 'original');

      // The getter returns an av_dict_copy - mutations must not affect the context
      copy.set('title', 'mutated');
      assert.equal(ctx.metadata?.get('title'), 'original', 'Mutating the returned copy must not affect the context');

      // Assigning the dictionary back applies the change
      ctx.metadata = copy;
      assert.equal(ctx.metadata?.get('title'), 'mutated', 'Assigning back applies changes');
    });

    it('should expose attached pictures as functional packets', async () => {
      const ret = await ctx.openInput(getInputFile('audio-cover.mp3'), null, null);
      assert.equal(ret, 0, 'Should open input with cover art');
      const ret2 = await ctx.findStreamInfo(null);
      assert.ok(ret2 >= 0, 'Should find stream info');

      const picStream = (ctx.streams ?? []).find((s) => (s.disposition & AV_DISPOSITION_ATTACHED_PIC) !== 0);
      assert.ok(picStream, 'Should find attached picture stream');

      const pic = picStream.attachedPic;
      assert.ok(pic, 'Should return attached picture packet');
      assert.ok(pic.size > 0, 'Attached picture has data');

      // Previously the raw native object was returned - wrapper methods threw TypeError
      const clone = pic.clone();
      assert.ok(clone, 'Wrapper methods must work on the returned packet');
      clone.free();

      await ctx.closeInput();
    });
  });

  describe('Properties', () => {
    beforeEach(() => {
      ctx.allocOutputContext2(null, null, testFile);
    });

    it('should dump format for output', () => {
      // Create a stream first
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 640;
      stream.codecpar.height = 480;

      // Should not throw
      assert.doesNotThrow(() => {
        ctx.dumpFormat(0, testFile, true);
      });
    });

    it('should dump format for input', async () => {
      // Open existing file as input
      ctx.freeContext();
      ctx = new FormatContext();
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      // Should not throw
      assert.doesNotThrow(() => {
        ctx.dumpFormat(0, inputVideoFile, false);
      });
    });

    it('should get start time', () => {
      // Start time is read-only
      const startTime = ctx.startTime;
      assert.ok(typeof startTime === 'bigint');
    });

    it('should get duration', () => {
      // Duration is read-only
      const duration = ctx.duration;
      assert.ok(typeof duration === 'bigint');
    });

    it('should get bit rate', () => {
      // Bit rate is read-only
      const bitRate = ctx.bitRate;
      assert.ok(typeof bitRate === 'bigint');
    });

    it('should get and set flags', () => {
      ctx.flags = AVFMT_FLAG_GENPTS;
      assert.equal(ctx.flags, AVFMT_FLAG_GENPTS);
    });

    it('should get and set probesize', () => {
      ctx.probesize = 5000000n;
      assert.equal(ctx.probesize, 5000000n);
    });

    it('should get and set max analyze duration', () => {
      ctx.maxAnalyzeDuration = 5000000n;
      assert.equal(ctx.maxAnalyzeDuration, 5000000n);
    });

    it('should get and set maxInterleaveDelta', () => {
      // Default is 10000000 (10 seconds)
      const defaultValue = ctx.maxInterleaveDelta;
      assert.ok(typeof defaultValue === 'bigint');

      // Set to 5 seconds
      ctx.maxInterleaveDelta = 5000000n;
      assert.equal(ctx.maxInterleaveDelta, 5000000n);

      // Set to unlimited buffering
      ctx.maxInterleaveDelta = 0n;
      assert.equal(ctx.maxInterleaveDelta, 0n);

      // Set to 20 seconds
      ctx.maxInterleaveDelta = 20000000n;
      assert.equal(ctx.maxInterleaveDelta, 20000000n);
    });

    it('should get and set metadata', () => {
      const metadata = new Dictionary();
      metadata.alloc();

      metadata.set('title', 'Test Video', AVFLAG_NONE);
      metadata.set('artist', 'Test Artist', AVFLAG_NONE);

      ctx.metadata = metadata;

      const retrieved = ctx.metadata;
      assert.ok(retrieved);
      assert.equal(retrieved.get('title', AVFLAG_NONE), 'Test Video');
      assert.equal(retrieved.get('artist', AVFLAG_NONE), 'Test Artist');

      metadata.free();
      retrieved.free();
    });

    it('should read metadata from input file', async () => {
      // Open existing file as input
      ctx.freeContext();
      ctx = new FormatContext();
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      const metadata = ctx.metadata;
      assert.ok(metadata);

      // Get all metadata entries
      const entries = metadata.getAll();
      assert.ok(typeof entries === 'object');

      // Check that expected metadata exists
      assert.ok('major_brand' in entries);
      assert.ok('encoder' in entries);

      metadata.free();
    });

    it('should get url/filename', () => {
      assert.equal(ctx.url, testFile);
    });

    it('should get oformat', () => {
      const oformat = ctx.oformat;
      assert.ok(oformat);
    });

    it('should get iformat when opened as input', async () => {
      // Create a file first
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 640;
      stream.codecpar.height = 480;
      await ctx.openOutput();
      await ctx.writeHeader(null);
      await ctx.writeTrailer();
      // ctx.closeOutput();
      ctx.freeContext();
      ctx = null as any; // Clear reference so afterEach doesn't double-free

      // Open as input
      ctx = new FormatContext();
      await ctx.openInput(testFile, null, null);

      const iformat = ctx.iformat;
      assert.ok(iformat);
    });
  });

  describe('IO Context', () => {
    it('should create custom IO context', () => {
      const ioCtx = new IOContext();
      ioCtx.allocContext(4096, AVIO_FLAG_WRITE);

      ctx.allocOutputContext2(null, 'mp4', null);
      ctx.pb = ioCtx;

      const retrieved = ctx.pb;
      assert.ok(retrieved);

      // Don't free IOContext here - it's now owned by FormatContext
      // It will be freed when FormatContext is freed
    });

    it('should work with custom IO', async () => {
      const ioCtx = new IOContext();
      ioCtx.allocContext(4096, AVIO_FLAG_WRITE);

      ctx.allocOutputContext2(null, 'mp4', null);
      ctx.pb = ioCtx;

      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 640;
      stream.codecpar.height = 480;

      // Should work with custom IO
      // Custom IO doesn't need openOutput as it manages its own I/O
      // Just verify we can set the custom IO context
      assert.ok(ctx.pb);

      // Don't free IOContext here - it's now owned by FormatContext
      // It will be freed when FormatContext is freed
    });
  });

  describe('Audio-specific Operations', () => {
    it('should create audio stream', () => {
      ctx.allocOutputContext2(null, null, testAudioFile);

      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_AUDIO;
      stream.codecpar.codecId = AV_CODEC_ID_PCM_S16LE;
      stream.codecpar.sampleRate = 44100;
      stream.codecpar.channels = 2;
      stream.codecpar.format = AV_SAMPLE_FMT_S16;

      assert.equal(stream.codecpar.codecType, AVMEDIA_TYPE_AUDIO);
      assert.equal(stream.codecpar.sampleRate, 44100);
    });

    it('should set audio time base', () => {
      ctx.allocOutputContext2(null, null, testAudioFile);

      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_AUDIO;
      stream.codecpar.sampleRate = 48000;

      const timeBase = new Rational(1, 48000);
      stream.timeBase = timeBase;

      const retrieved = stream.timeBase;
      assert.equal(retrieved.num, 1);
      assert.equal(retrieved.den, 48000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null filename', () => {
      const ret = ctx.allocOutputContext2(null, 'mp4', null);
      assert.equal(ret, 0);
    });

    it('should handle invalid format', () => {
      assert.throws(
        () => {
          ctx.allocOutputContext2(null, 'invalid_format_xyz', null);
        },
        {
          message: /Failed to allocate output context/,
        },
      );
    });

    it('should handle non-existent input file', async () => {
      const ret = await ctx.openInput('/non/existent/file.mp4', null, null);
      assert.ok(ret < 0);
    });

    it('should handle empty streams array', () => {
      ctx.allocOutputContext2(null, null, testFile);
      const streams = ctx.streams;
      assert.ok(Array.isArray(streams));
      assert.equal(streams.length, 0);
    });

    it('should handle closeInputSync on a never-opened context', () => {
      // Without any allocation - should be a no-op
      ctx.closeInputSync();

      // Allocated but never opened - must free and return promptly, no crash
      ctx.allocContext();
      ctx.closeInputSync();

      // Properties should return sensible defaults after close
      assert.equal(ctx.nbStreams, 0);
      assert.deepEqual(ctx.streams, []);
      assert.equal(ctx.url, null);

      // Closing again must not crash (context pointer was cleared)
      ctx.closeInputSync();

      // Context can be reused afterwards
      const ret = ctx.openInputSync(inputVideoFile, null, null);
      assert.equal(ret, 0);
    });
  });

  describe('Async Operations', () => {
    it('should read frame asynchronously', async () => {
      // Use existing test video
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      const packet = new Packet();
      packet.alloc();

      const ret = await ctx.readFrame(packet);
      assert.equal(ret, 0); // Should succeed with video.mp4

      packet.free();
    });

    it('should write frame asynchronously', async () => {
      // Need to allocate context for this specific test
      ctx.allocOutputContext2(null, null, testFile);
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 640;
      stream.codecpar.height = 480;

      await ctx.openOutput();
      await ctx.writeHeader(null);

      const packet = new Packet();
      packet.alloc();
      packet.streamIndex = 0;

      const ret = await ctx.writeFrame(packet);
      assert.ok(ret <= 0);

      // ctx.closeOutput();
      packet.free();
    });

    it('should interleave write frame asynchronously', async () => {
      // Need to allocate context for this specific test
      ctx.allocOutputContext2(null, null, testFile);
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 640;
      stream.codecpar.height = 480;

      await ctx.openOutput();
      await ctx.writeHeader(null);

      const packet = new Packet();
      packet.alloc();
      packet.streamIndex = 0;

      const ret = await ctx.interleavedWriteFrame(packet);
      assert.ok(ret <= 0);

      // ctx.closeOutput();
      packet.free();
    });

    it('should not crash when closeInput()/freeContext() race in-flight readFrame calls', { timeout: 10000 }, async () => {
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      const packets = Array.from({ length: 8 }, () => {
        const packet = new Packet();
        packet.alloc();
        return packet;
      });

      // Queue a burst of async reads, then close and free while they may
      // still be on the threadpool - the close paths interrupt blocked
      // readers and wait for in-flight operations (previously a
      // use-after-free)
      const pending = packets.map(async (packet) => ctx.readFrame(packet));
      const closing = ctx.closeInput();
      ctx.freeContext();

      // Every read must settle (0, EOF or AVERROR_EXIT) without crashing
      const results = await Promise.allSettled([...pending, closing]);
      for (const r of results) {
        assert.notEqual(r.status, undefined);
      }

      for (const packet of packets) {
        packet.free();
      }
    });

    it('should abort readFrame after interrupt()', async () => {
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      const packet = new Packet();
      packet.alloc();

      // interrupt() flags the context; the pending read must observe it and
      // bail out with AVERROR_EXIT instead of returning a packet
      ctx.interrupt();
      const ret = await ctx.readFrame(packet);
      assert.equal(ret, AVERROR_EXIT);

      packet.free();
    });

    it('should serve concurrent readFrame calls in order from the owner thread', async () => {
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      const packets = Array.from({ length: 6 }, () => {
        const packet = new Packet();
        packet.alloc();
        return packet;
      });

      // every call registers a pending read before the reader has delivered
      // anything - the queue must hand them out first come, first served
      const results = await Promise.all(packets.map((packet) => ctx.readFrame(packet)));
      assert.ok(results.every((r) => r === 0));

      const perStream = new Map<number, bigint>();
      for (const packet of packets) {
        const previous = perStream.get(packet.streamIndex);
        if (previous !== undefined) {
          assert.ok(packet.dts >= previous, 'packets of one stream arrive in read order');
        }
        perStream.set(packet.streamIndex, packet.dts);
        packet.free();
      }
    });

    it('should reject sync reads while the async reader is active', async () => {
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      const packet = new Packet();
      packet.alloc();

      assert.equal(await ctx.readFrame(packet), 0);
      assert.throws(() => ctx.readFrameSync(packet), /active async reader/);
      assert.throws(() => ctx.seekFrameSync(-1, 0n, AVSEEK_FLAG_BACKWARD), /active async reader/);

      packet.free();
    });

    it('should drop read-ahead packets on seek', async () => {
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      const packet = new Packet();
      packet.alloc();

      // first packet of stream 0, then let the owner thread fill its queue
      let firstDts: bigint | undefined;
      while (firstDts === undefined) {
        assert.equal(await ctx.readFrame(packet), 0);
        if (packet.streamIndex === 0) {
          firstDts = packet.dts;
        }
        packet.unref();
      }
      for (let i = 0; i < 20; i++) {
        assert.equal(await ctx.readFrame(packet), 0);
        packet.unref();
      }

      assert.ok((await ctx.seekFrame(-1, 0n, AVSEEK_FLAG_BACKWARD)) >= 0);

      // without the flush the next packet would be the 21st, not the first
      let afterSeek: bigint | undefined;
      while (afterSeek === undefined) {
        assert.equal(await ctx.readFrame(packet), 0);
        if (packet.streamIndex === 0) {
          afterSeek = packet.dts;
        }
        packet.unref();
      }
      assert.ok(afterSeek <= firstDts, `seek returned to the start (${afterSeek} <= ${firstDts})`);

      packet.free();
    });

    it('should settle a parked readFrame with AVERROR_EXIT on closeInput', async () => {
      await ctx.openInput(inputVideoFile, null, null);
      await ctx.findStreamInfo(null);

      const packet = new Packet();
      packet.alloc();

      // drain the file so the reader parks on EOF, then a further read must
      // not hang across the close
      let ret = 0;
      while (ret >= 0) {
        ret = await ctx.readFrame(packet);
        packet.unref();
      }
      const pending = ctx.readFrame(packet);
      await ctx.closeInput();
      assert.ok((await pending) < 0);

      packet.free();
    });

    it('should refuse to swap pb while the async reader is active', async () => {
      const buffer = await readFile(inputVideoFile);
      let position = 0;
      const ioCtx = new IOContext();
      ioCtx.allocContextWithCallbacks(
        4096,
        0,
        (size: number) => {
          if (position >= buffer.length) {
            return null;
          }
          const chunk = buffer.subarray(position, Math.min(position + size, buffer.length));
          position += chunk.length;
          return chunk;
        },
        null,
        (offset: bigint, whence: number) => {
          if (whence === AVSEEK_SIZE) {
            return BigInt(buffer.length);
          }
          if (whence === AVSEEK_SET) {
            position = Number(offset);
          } else if (whence === AVSEEK_CUR) {
            position += Number(offset);
          } else if (whence === AVSEEK_END) {
            position = buffer.length + Number(offset);
          }
          return BigInt(position);
        },
      );
      ctx.allocContext();
      ctx.pb = ioCtx;
      await ctx.openInput('', null, null);
      await ctx.findStreamInfo(null);

      const packet = new Packet();
      packet.alloc();
      assert.equal(await ctx.readFrame(packet), 0);

      // the reader thread dereferences pb on every read; the detach belongs
      // to closeInput(true), which runs it after the thread stopped
      assert.throws(() => {
        ctx.pb = null;
      }, /active async reader/);

      await ctx.closeInput(true);
      packet.free();
      ioCtx.freeContext();
      ctx = null as any;
    });

    it('should refuse to free a packet while a muxer write still uses it', { timeout: 10000 }, async () => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      // raw h264 writes no header, so the first write callback is the packet's
      const ioCtx = new IOContext();
      ioCtx.allocContextWithCallbacks(4096, 1, null, async (buffer: Buffer) => {
        await gate;
        return buffer.length;
      });
      ctx.allocOutputContext2(null, 'h264', null);
      ctx.pb = ioCtx;
      const stream = ctx.newStream(null);
      assert.ok(stream);
      stream.codecpar.codecType = AVMEDIA_TYPE_VIDEO;
      stream.codecpar.codecId = AV_CODEC_ID_H264;
      stream.codecpar.width = 640;
      stream.codecpar.height = 480;
      assert.ok((await ctx.writeHeader(null)) >= 0);

      const packet = new Packet();
      packet.alloc();
      packet.data = Buffer.alloc(8192, 1);
      packet.streamIndex = 0;

      // the write parks on the gated callback with the packet on the
      // threadpool; freeing it now used to be a use-after-free
      const pending = ctx.interleavedWriteFrame(packet);
      assert.throws(() => packet.free(), /busy/);

      release();
      assert.ok((await pending) >= 0);
      packet.free();

      // the format context leaves a custom pb alone, the wrapper frees it
      ctx.freeContext();
      ioCtx.freeContext();
      ctx = null as any;
    });
  });

  describe('Flag Operations', () => {
    beforeEach(() => {
      ctx.allocContext();
    });

    it('should set single flag using setFlags', () => {
      ctx.setFlags(AVFMT_FLAG_GENPTS);
      assert.equal(ctx.flags & AVFMT_FLAG_GENPTS, AVFMT_FLAG_GENPTS);
    });

    it('should set multiple flags using setFlags', () => {
      ctx.setFlags(AVFMT_FLAG_GENPTS, AVFMT_FLAG_IGNIDX);
      assert.equal(ctx.flags & AVFMT_FLAG_GENPTS, AVFMT_FLAG_GENPTS);
      assert.equal(ctx.flags & AVFMT_FLAG_IGNIDX, AVFMT_FLAG_IGNIDX);
    });

    it('should clear single flag using clearFlags', () => {
      ctx.setFlags(AVFMT_FLAG_GENPTS, AVFMT_FLAG_IGNIDX);

      ctx.clearFlags(AVFMT_FLAG_IGNIDX);
      assert.equal(ctx.flags & AVFMT_FLAG_GENPTS, AVFMT_FLAG_GENPTS);
      assert.equal(ctx.flags & AVFMT_FLAG_IGNIDX, 0);
    });

    it('should clear multiple flags using clearFlags', () => {
      ctx.setFlags(AVFMT_FLAG_GENPTS, AVFMT_FLAG_IGNIDX);

      ctx.clearFlags(AVFMT_FLAG_GENPTS, AVFMT_FLAG_IGNIDX);
      assert.equal(ctx.flags & AVFMT_FLAG_GENPTS, 0);
      assert.equal(ctx.flags & AVFMT_FLAG_IGNIDX, 0);
    });

    it('should preserve existing flags when setting new flags', () => {
      ctx.setFlags(AVFMT_FLAG_GENPTS);
      assert.equal(ctx.flags & AVFMT_FLAG_GENPTS, AVFMT_FLAG_GENPTS);

      ctx.setFlags(AVFMT_FLAG_IGNIDX);
      assert.equal(ctx.flags & AVFMT_FLAG_GENPTS, AVFMT_FLAG_GENPTS);
      assert.equal(ctx.flags & AVFMT_FLAG_IGNIDX, AVFMT_FLAG_IGNIDX);
    });

    it('should support direct flag assignment (backward compatibility)', () => {
      ctx.flags = (AVFMT_FLAG_GENPTS | AVFMT_FLAG_IGNIDX) as AVFormatFlag;
      assert.equal(ctx.flags & AVFMT_FLAG_GENPTS, AVFMT_FLAG_GENPTS);
      assert.equal(ctx.flags & AVFMT_FLAG_IGNIDX, AVFMT_FLAG_IGNIDX);
    });

    it('should check for single flag using hasFlags', () => {
      ctx.flags = AVFLAG_NONE;
      assert.equal(ctx.hasFlags(AVFMT_FLAG_GENPTS), false);

      ctx.setFlags(AVFMT_FLAG_GENPTS);
      assert.equal(ctx.hasFlags(AVFMT_FLAG_GENPTS), true);
      assert.equal(ctx.hasFlags(AVFMT_FLAG_IGNIDX), false);

      ctx.setFlags(AVFMT_FLAG_IGNIDX);
      assert.equal(ctx.hasFlags(AVFMT_FLAG_GENPTS), true);
      assert.equal(ctx.hasFlags(AVFMT_FLAG_IGNIDX), true);
    });

    it('should check for multiple flags using hasFlags', () => {
      ctx.flags = AVFLAG_NONE;
      assert.equal(ctx.hasFlags(AVFMT_FLAG_GENPTS, AVFMT_FLAG_IGNIDX), false);

      ctx.setFlags(AVFMT_FLAG_GENPTS);
      assert.equal(ctx.hasFlags(AVFMT_FLAG_GENPTS, AVFMT_FLAG_IGNIDX), false);

      ctx.setFlags(AVFMT_FLAG_IGNIDX);
      assert.equal(ctx.hasFlags(AVFMT_FLAG_GENPTS, AVFMT_FLAG_IGNIDX), true);
    });

    it('should return false when only some flags are set', () => {
      ctx.setFlags(AVFMT_FLAG_GENPTS);
      assert.equal(ctx.hasFlags(AVFMT_FLAG_GENPTS), true);
      assert.equal(ctx.hasFlags(AVFMT_FLAG_GENPTS, AVFMT_FLAG_IGNIDX), false);
    });
  });
});
