import assert from 'node:assert';
import { spawn } from 'node:child_process';
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
  AV_CODEC_ID_NONE,
  AVMEDIA_TYPE_UNKNOWN,
  CodecParameters,
  Demuxer,
  Dictionary,
  FormatContext,
  Packet,
  Rational,
} from '../src/index.js';

import type { AVStreamEventFlag, Stream } from '../src/index.js';
import { getInputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputFile = getInputFile('video.mp4');

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

  describe('Parser', () => {
    // The stream's parser belongs to the thread that reads the input, which frees it at the
    // end of the stream and on a seek, so stream.parser hands out a copy of its state
    for (const mode of ['sync', 'async'] as const) {
      it(`reports the parser state of the last packet read and keeps its copy (${mode})`, async () => {
        const input = new FormatContext();
        if (mode === 'sync') {
          assert.equal(input.openInputSync(getInputFile('test.mp4'), null, null), 0);
          assert.ok(input.findStreamInfoSync(null) >= 0);
        } else {
          assert.equal(await input.openInput(getInputFile('test.mp4'), null, null), 0);
          assert.ok((await input.findStreamInfo(null)) >= 0);
        }
        const video = input.streams[0];
        assert.equal(video.parser, null, 'no packet read yet');

        using packet = new Packet();
        packet.alloc();
        const read = async (): Promise<number> => (mode === 'sync' ? input.readFrameSync(packet) : await input.readFrame(packet));
        assert.equal(await read(), 0);
        const parser = video.parser;
        assert.ok(parser, 'the H.264 stream of an MP4 is parsed');
        assert.equal(parser.repeatPict, 1);

        while ((await read()) >= 0) {
          packet.unref();
        }
        if (mode === 'sync') {
          input.closeInputSync();
        } else {
          await input.closeInput();
        }

        assert.equal(video.parser, null);
        assert.equal(parser.repeatPict, 1, 'the copy outlives the parser and its input');
      });
    }
  });

  describe('After its format context is freed', () => {
    // A Stream and the codecpar it hands out point into the AVFormatContext. Once that
    // is freed they must read defaults, not freed memory (an access violation on Windows).
    const assertDetached = (detached: Stream, par: CodecParameters): void => {
      assert.equal(detached.index, -1);
      assert.equal(detached.id, 0);
      assert.deepEqual({ ...detached.timeBase }, { num: 0, den: 1 });
      assert.equal(detached.duration, 0n);
      assert.equal(detached.metadata, null);
      assert.equal(detached.parser, null);
      assert.equal(par.codecType, AVMEDIA_TYPE_UNKNOWN);
      assert.equal(par.codecId, AV_CODEC_ID_NONE);
      assert.equal(par.width, 0);
      assert.equal(par.extradata, null);
      // writes go nowhere
      detached.id = 7;
      par.width = 640;
      assert.equal(detached.id, 0);
      assert.equal(par.width, 0);
    };

    const openInput = async (): Promise<FormatContext> => {
      const input = new FormatContext();
      assert.equal(await input.openInput(inputFile, null, null), 0);
      assert.ok((await input.findStreamInfo(null)) >= 0);
      return input;
    };

    it('reads defaults after freeContext() of an output context', () => {
      const output = new FormatContext();
      output.allocOutputContext2(null, 'mp4', 'test.mp4');
      const detached = output.newStream(null);
      detached.id = 42;
      detached.codecpar.width = 1920;
      const par = detached.codecpar;
      output.freeContext();
      assertDetached(detached, par);
    });

    it('reads defaults after an output context is disposed asynchronously', async () => {
      const output = new FormatContext();
      output.allocOutputContext2(null, 'mp4', 'test.mp4');
      const detached = output.newStream(null);
      const par = detached.codecpar;
      await output[Symbol.asyncDispose]();
      assertDetached(detached, par);
    });

    it('reads defaults after closeInput()', async () => {
      const input = await openInput();
      const detached = input.streams[0];
      const par = detached.codecpar;
      assert.equal(detached.index, 0);
      assert.ok(par.width > 0);
      await input.closeInput();
      assertDetached(detached, par);
    });

    it('reads defaults after closeInputSync()', async () => {
      const input = await openInput();
      const detached = input.streams[0];
      const par = detached.codecpar;
      input.closeInputSync();
      assertDetached(detached, par);
    });

    it('reads defaults after the Demuxer that returned it closed', async () => {
      const demuxer = await Demuxer.open(inputFile);
      const video = demuxer.video()!;
      const par = video.codecpar;
      assert.ok(par.width > 0);
      await demuxer.close();
      assertDetached(video, par);
    });

    it('keeps parameters it copied after the context is freed', async () => {
      const input = await openInput();
      const copy = new CodecParameters();
      copy.alloc();
      input.streams[0].codecpar.copy(copy);
      await input.closeInput();
      assert.ok(copy.width > 0);
      copy.free();
    });

    it('survives garbage collection of either side first', { timeout: 30000 }, async () => {
      const script = `
        const { FormatContext } = await import(${JSON.stringify(new URL('../src/index.ts', import.meta.url).href)});
        const settle = () => new Promise((resolve) => setImmediate(resolve));
        // context collected while its stream and codecpar live on
        let ctx = new FormatContext();
        ctx.allocOutputContext2(null, 'mp4', 'a.mp4');
        const stream = ctx.newStream(null);
        const par = stream.codecpar;
        par.width = 320;
        ctx = null;
        for (let i = 0; i < 5; i++) { globalThis.gc(); await settle(); }
        console.log('after context gc', stream.index, par.width);
        // streams collected while their context lives on, then freed
        const kept = new FormatContext();
        kept.allocOutputContext2(null, 'mp4', 'b.mp4');
        for (let i = 0; i < 100; i++) kept.newStream(null).codecpar;
        for (let i = 0; i < 5; i++) { globalThis.gc(); await settle(); }
        kept.freeContext();
        console.log('done');
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
      assert.match(result.stdout, /after context gc -1 0\ndone/);
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
