import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_OPT_SEARCH_CHILDREN,
  AV_OPT_TYPE_BINARY,
  AV_OPT_TYPE_BINARY_INT_ARRAY,
  AV_OPT_TYPE_BOOL,
  AV_OPT_TYPE_CONST,
  AV_OPT_TYPE_FLOAT,
  AV_OPT_TYPE_INT,
  AV_OPT_TYPE_INT64,
  AV_OPT_TYPE_RATIONAL,
  AV_OPT_TYPE_STRING,
  AV_PIX_FMT_RGB24,
  AV_PIX_FMT_YUV420P,
  AVFLAG_NONE,
  BitStreamFilter,
  BitStreamFilterContext,
  Codec,
  CodecContext,
  FF_DECODER_H264,
  FF_ENCODER_LIBX264,
  FF_ENCODER_MPEG4,
  Filter,
  FilterGraph,
  FormatContext,
  IOContext,
  Rational,
  SoftwareResampleContext,
  SoftwareScaleContext,
} from '../src/index.js';

describe('Option API', () => {
  describe('CodecContext Options', () => {
    it('should set and get options on encoder context', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      assert.ok(codec, 'Should find h264 encoder');

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      // Set various option types
      const ret1 = ctx.setOption('preset', 'fast', AV_OPT_TYPE_STRING);
      assert.equal(ret1, 0, 'Should set string option');

      const ret2 = ctx.setOption('crf', 23, AV_OPT_TYPE_INT);
      assert.equal(ret2, 0, 'Should set int option');

      const ret3 = ctx.setOption('tune', 'zerolatency', AV_OPT_TYPE_STRING);
      assert.equal(ret3, 0, 'Should set tune option');

      // Get options back
      const preset = ctx.getOption('preset', AV_OPT_TYPE_STRING);
      assert.equal(preset, 'fast', 'Should get string option');

      const crf = ctx.getOption('crf', AV_OPT_TYPE_INT);
      assert.equal(crf, 23, 'Should get int option');

      ctx.freeContext();
    });

    it('should set and get options on decoder context', () => {
      const codec = Codec.findDecoderByName(FF_DECODER_H264);
      assert.ok(codec, 'Should find h264 decoder');

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      // Set decoder-specific options
      const ret1 = ctx.setOption('threads', 4, AV_OPT_TYPE_INT);
      assert.equal(ret1, 0, 'Should set threads option');

      const threads = ctx.getOption('threads', AV_OPT_TYPE_INT);
      assert.equal(threads, 4, 'Should get threads option');

      ctx.freeContext();
    });

    it('should handle invalid option names', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      const ret = ctx.setOption('invalid_option_xyz', 'value', AV_OPT_TYPE_STRING);
      assert.ok(ret < 0, 'Should return error for invalid option');

      const value = ctx.getOption('invalid_option_xyz', AV_OPT_TYPE_STRING);
      assert.equal(value, null, 'Should return null for invalid option');

      ctx.freeContext();
    });

    it('should list available options', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264) ?? Codec.findEncoderByName(FF_ENCODER_MPEG4);
      assert.ok(codec, 'Should find an encoder');

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      const options = ctx.listOptions();
      assert.ok(Array.isArray(options), 'Should return array of options');
      assert.ok(options.length > 0, 'Should have options');

      // Check for common encoder options that exist in most encoders
      const hasCommonOption = options.some(
        (opt) =>
          opt.name === 'b' || // bitrate
          opt.name === 'flags' || // flags
          opt.name === 'thread_count' || // threading
          opt.name === 'time_base', // time base
      );
      assert.ok(hasCommonOption, 'Should have at least one common option');

      ctx.freeContext();
    });
  });

  describe('FormatContext Options', () => {
    it('should set options on output format context', () => {
      const ctx = new FormatContext();
      const ret = ctx.allocOutputContext2(null, 'mp4', null);
      assert.equal(ret, 0, 'Should allocate output context');

      // Set format options
      const ret1 = ctx.setOption('movflags', 'faststart', AV_OPT_TYPE_STRING);
      assert.equal(ret1, 0, 'Should set movflags option');

      const movflags = ctx.getOption('movflags', AV_OPT_TYPE_STRING);
      assert.ok(movflags, 'Should get movflags option');

      ctx.freeContext();
    });

    it('should list format context options', () => {
      const ctx = new FormatContext();
      const ret = ctx.allocOutputContext2(null, 'mp4', null);
      assert.equal(ret, 0, 'Should allocate output context');

      const options = ctx.listOptions();
      assert.ok(Array.isArray(options), 'Should return array of options');
      assert.ok(options.length > 0, 'Should have options');

      ctx.freeContext();
    });
  });

  describe('Type Inference and Int64 Precision', () => {
    it('should infer the option type when none is given', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_MPEG4);
      assert.ok(codec, 'Should find mpeg4 encoder');

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      // 'g' (GOP size) is an INT option - without an explicit type the option's
      // declared type is looked up and the numeric value converted accordingly
      const ret = ctx.setOption('g', 120);
      assert.equal(ret, 0, 'Should set option without explicit type');

      const gop = ctx.getOption('g', AV_OPT_TYPE_INT);
      assert.equal(gop, 120, 'Inferred set should round-trip');

      ctx.freeContext();
    });

    it('should keep full int64 precision above 2^53', () => {
      const ctx = new FormatContext();
      const ret = ctx.allocOutputContext2(null, 'mp4', null);
      assert.equal(ret, 0, 'Should allocate output context');

      const huge = (1n << 60n) + 3n; // Not representable as a double
      const ret1 = ctx.setOption('max_interleave_delta', huge, AV_OPT_TYPE_INT64);
      assert.equal(ret1, 0, 'Should set int64 option');

      const value = ctx.getOption('max_interleave_delta', AV_OPT_TYPE_INT64);
      assert.equal(value, huge, 'Should round-trip exactly (a double-based getter truncates above 2^53)');

      ctx.freeContext();
    });
  });

  describe('FilterContext Options', () => {
    it('should set options on filter context', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Use format filter with initial configuration
      const formatFilter = Filter.getByName('format');
      assert.ok(formatFilter, 'Should find format filter');
      const filter = graph.createFilter(formatFilter, 'formatter', 'pix_fmts=yuv420p');
      assert.ok(filter, 'Should create filter');

      // Set common filter option that exists on all filters
      const ret1 = filter.setOption('enable', 'expr', AV_OPT_TYPE_STRING);
      assert.equal(ret1, 0, 'Should set enable option');

      // Get option back
      const enable = filter.getOption('enable', AV_OPT_TYPE_STRING);
      assert.ok(enable, 'Should get enable option');

      graph.free();
    });

    it('should list filter options', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const formatFilter = Filter.getByName('format');
      assert.ok(formatFilter, 'Should find format filter');
      const filter = graph.createFilter(formatFilter, 'formatter', 'pix_fmts=yuv420p');
      assert.ok(filter);

      const options = filter.listOptions();
      assert.ok(Array.isArray(options), 'Should return array of options');
      assert.ok(options.length > 0, 'Should have options');

      // Check for common filter options like enable or thread_type
      const hasCommonOption = options.some((opt) => opt.name === 'enable' || opt.name === 'thread_type' || opt.name === 'slice');
      assert.ok(hasCommonOption, 'Should have common filter options');

      graph.free();
    });
  });

  describe('FilterGraph Options', () => {
    it('should set options on filter graph', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Set graph-level options
      const ret1 = graph.setOption('threads', 2, AV_OPT_TYPE_INT);
      assert.equal(ret1, 0, 'Should set threads option');

      const threads = graph.getOption('threads', AV_OPT_TYPE_INT);
      assert.equal(threads, 2, 'Should get threads option');

      graph.free();
    });

    it('should list filter graph options', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const options = graph.listOptions();
      assert.ok(Array.isArray(options), 'Should return array of options');
      assert.ok(options.length > 0, 'Should have options');

      // Check for common graph options
      const hasThreads = options.some((opt) => opt.name === 'threads');
      assert.ok(hasThreads, 'Should have threads option');

      graph.free();
    });
  });

  describe('SoftwareScaleContext Options', () => {
    it('should set options on software scale context', () => {
      const ctx = new SoftwareScaleContext();

      // Allocate with basic parameters - getContext returns void
      ctx.getContext(640, 480, AV_PIX_FMT_YUV420P, 1920, 1080, AV_PIX_FMT_RGB24, AVFLAG_NONE);

      // Set scaling algorithm option
      const ret1 = ctx.setOption('sws_flags', 'bilinear', AV_OPT_TYPE_STRING);
      assert.equal(ret1, 0, 'Should set sws_flags option');

      const flags = ctx.getOption('sws_flags', AV_OPT_TYPE_STRING);
      assert.ok(flags, 'Should get sws_flags option');

      ctx.freeContext();
    });

    it('should list scale context options', () => {
      const ctx = new SoftwareScaleContext();

      // getContext returns void, not an error code
      ctx.getContext(640, 480, AV_PIX_FMT_YUV420P, 1920, 1080, AV_PIX_FMT_RGB24, AVFLAG_NONE);

      const options = ctx.listOptions();
      assert.ok(Array.isArray(options), 'Should return array of options');
      assert.ok(options.length > 0, 'Should have options');

      ctx.freeContext();
    });
  });

  describe('SoftwareResampleContext Options', () => {
    it('should set options on software resample context', () => {
      const ctx = new SoftwareResampleContext();
      ctx.alloc();

      // Set resampling options
      const ret1 = ctx.setOption('dither_method', 'rectangular', AV_OPT_TYPE_STRING);
      assert.equal(ret1, 0, 'Should set dither_method option');

      const ret2 = ctx.setOption('resampler', 'soxr', AV_OPT_TYPE_STRING);
      // soxr might not be available, so just check it doesn't crash
      assert.ok(typeof ret2 === 'number', 'Should return status for resampler option');

      const dither = ctx.getOption('dither_method', AV_OPT_TYPE_STRING);
      assert.ok(dither, 'Should get dither_method option');

      ctx.free();
    });

    it('should list resample context options', () => {
      const ctx = new SoftwareResampleContext();
      ctx.alloc();

      const options = ctx.listOptions();
      assert.ok(Array.isArray(options), 'Should return array of options');
      assert.ok(options.length > 0, 'Should have options');

      // Check for common resample options
      const hasDither = options.some((opt) => opt.name === 'dither_method');
      assert.ok(hasDither, 'Should have dither_method option');

      ctx.free();
    });
  });

  describe('IOContext Options', () => {
    it('should set options on IO context', () => {
      const ctx = new IOContext();
      ctx.allocContext(4096, 1); // 1 for write flag
      assert.ok(ctx, 'Should create IO context');

      // IO context might have limited options
      const options = ctx.listOptions();
      assert.ok(Array.isArray(options), 'Should return array of options');
      // Note: IO context might have no options, that's ok

      ctx.freeContext();
    });
  });

  describe('BitStreamFilterContext Options', () => {
    it('should set options on bitstream filter context', () => {
      const filter = BitStreamFilter.getByName('h264_mp4toannexb');
      assert.ok(filter, 'Should find h264_mp4toannexb filter');

      const ctx = new BitStreamFilterContext();
      ctx.alloc(filter);

      // BSF might have limited options
      const options = ctx.listOptions();
      assert.ok(Array.isArray(options), 'Should return array of options');

      // Try to set an option if available
      if (options.length > 0) {
        const firstOption = options[0];
        if (firstOption.type === AV_OPT_TYPE_INT) {
          const ret = ctx.setOption(firstOption.name!, 1, AV_OPT_TYPE_INT);
          assert.ok(typeof ret === 'number', 'Should return status');
        }
      }

      ctx.free();
    });
  });

  describe('Option Types', () => {
    it('should handle different option types', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      // Test INT type
      const ret1 = ctx.setOption('crf', 23, AV_OPT_TYPE_INT);
      assert.equal(ret1, 0, 'Should set int option');
      const crf = ctx.getOption('crf', AV_OPT_TYPE_INT);
      assert.equal(crf, 23, 'Should get int option');

      // Test STRING type
      const ret2 = ctx.setOption('preset', 'medium', AV_OPT_TYPE_STRING);
      assert.equal(ret2, 0, 'Should set string option');
      const preset = ctx.getOption('preset', AV_OPT_TYPE_STRING);
      assert.equal(preset, 'medium', 'Should get string option');

      // Test INT64 type
      const ret3 = ctx.setOption('b', 1000000n, AV_OPT_TYPE_INT64);
      assert.equal(ret3, 0, 'Should set int64 option');
      const bitrate = ctx.getOption('b', AV_OPT_TYPE_INT64);
      assert.equal(bitrate, 1000000n, 'Should get int64 option');

      // Test DOUBLE type - use a more common option
      // Many codecs don't have qcompress, so we'll just test the mechanism
      const ret4 = ctx.setOption('qblur', 0.5, AV_OPT_TYPE_FLOAT);
      // Option might not exist on all codecs, so just check it's a number
      assert.ok(typeof ret4 === 'number', 'Should return status for float option');
      if (ret4 === 0) {
        const qblur = ctx.getOption('qblur', AV_OPT_TYPE_FLOAT);
        assert.ok(typeof qblur === 'number', 'Should get float option');
      }

      // Test RATIONAL type - not all codecs have rational options
      const ret5 = ctx.setOption('aspect', new Rational(16, 9), AV_OPT_TYPE_RATIONAL);
      // Option might not exist on all codecs
      assert.ok(typeof ret5 === 'number', 'Should return status for rational option');
      if (ret5 === 0) {
        const aspect = ctx.getOption('aspect', AV_OPT_TYPE_RATIONAL);
        assert.ok(aspect instanceof Rational, 'Should get rational option');
        assert.equal(aspect.num, 16, 'Should have correct numerator');
        assert.equal(aspect.den, 9, 'Should have correct denominator');
      }

      ctx.freeContext();
    });

    it('should handle binary data options', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      // Test BINARY type
      const binaryData = Buffer.from([1, 2, 3, 4, 5]);
      const ret = ctx.setOption('stats_in', binaryData, AV_OPT_TYPE_BINARY);
      // May not be supported for this codec, just check it doesn't crash
      assert.ok(typeof ret === 'number', 'Should return status for binary option');

      ctx.freeContext();
    });

    it('should handle integer array options', () => {
      // Integer array options are less common and not all contexts support them
      // Test with a codec context that might support array options
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264) ?? Codec.findEncoderByName(FF_ENCODER_MPEG4);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      // Test BINARY_INT_ARRAY type - this is primarily used internally
      // Most user-facing options are not arrays
      const pixelFormats = [AV_PIX_FMT_YUV420P, AV_PIX_FMT_RGB24];
      const ret = ctx.setOption('pix_fmts', pixelFormats, AV_OPT_TYPE_BINARY_INT_ARRAY);
      // This option type is rarely exposed, so it might not work
      assert.ok(typeof ret === 'number', 'Should return status for array option');

      ctx.freeContext();
    });

    it('should handle boolean options', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      // Test BOOL type
      const ret1 = ctx.setOption('aud', true, AV_OPT_TYPE_BOOL);
      assert.equal(ret1, 0, 'Should set bool option to true');

      const aud = ctx.getOption('aud', AV_OPT_TYPE_BOOL);
      assert.equal(aud, true, 'Should get bool option as true');

      const ret2 = ctx.setOption('aud', false, AV_OPT_TYPE_BOOL);
      assert.equal(ret2, 0, 'Should set bool option to false');

      const audFalse = ctx.getOption('aud', AV_OPT_TYPE_BOOL);
      assert.equal(audFalse, false, 'Should get bool option as false');

      ctx.freeContext();
    });

    it('should handle flags options', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      // Test FLAGS type - x264 has 'x264flags' option
      const ret = ctx.setOption('x264flags', '+cgop', AV_OPT_TYPE_STRING);
      // May vary by build, just check it doesn't crash
      assert.ok(typeof ret === 'number', 'Should return status for flags option');

      ctx.freeContext();
    });
  });

  describe('Search Flags', () => {
    it('should use search flags when setting options', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      // Set option with search flags
      const ret = ctx.setOption('preset', 'fast', AV_OPT_TYPE_STRING, AV_OPT_SEARCH_CHILDREN);
      assert.equal(ret, 0, 'Should set option with search flags');

      const preset = ctx.getOption('preset', AV_OPT_TYPE_STRING, AV_OPT_SEARCH_CHILDREN);
      assert.equal(preset, 'fast', 'Should get option with search flags');

      ctx.freeContext();
    });
  });

  describe('Error Handling', () => {
    it('should handle unallocated context', () => {
      const ctx = new CodecContext();
      // Don't allocate

      assert.throws(
        () => {
          ctx.setOption('preset', 'fast', AV_OPT_TYPE_STRING);
        },
        /Invalid native object/,
        'Should throw for unallocated context',
      );

      // getOption also throws for unallocated context
      assert.throws(
        () => {
          ctx.getOption('preset', AV_OPT_TYPE_STRING);
        },
        /Invalid native object/,
        'Should throw for unallocated context',
      );

      // listOptions also throws for unallocated context
      assert.throws(
        () => {
          ctx.listOptions();
        },
        /Invalid native object/,
        'Should throw for unallocated context',
      );
    });

    it('should handle type mismatches', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264) ?? Codec.findEncoderByName(FF_ENCODER_MPEG4);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      // Try to set string value as int - should throw due to validation
      assert.throws(
        () => {
          ctx.setOption('b', 'not_a_number' as any, AV_OPT_TYPE_INT);
        },
        /Expected integer value/,
        'Should throw for type mismatch',
      );

      // Set a valid int value
      const ret = ctx.setOption('b', 128000, AV_OPT_TYPE_INT);
      assert.equal(ret, 0, 'Should set valid bitrate');

      // Get as string should work (FFmpeg converts)
      const value = ctx.getOption('b', AV_OPT_TYPE_STRING);
      assert.ok(value, 'Should get value as string');

      ctx.freeContext();
    });

    it('should handle null values gracefully', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264) ?? Codec.findEncoderByName(FF_ENCODER_MPEG4);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      // Try to set null - should handle gracefully
      try {
        const ret = ctx.setOption('b', null as any, AV_OPT_TYPE_INT);
        assert.ok(ret < 0, 'Should return error for null value');
      } catch (e) {
        // Validation might throw for null
        assert.ok(e, 'Should throw or return error for null');
      }

      ctx.freeContext();
    });
  });

  describe('Option Information', () => {
    it('should provide detailed option information', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264) ?? Codec.findEncoderByName(FF_ENCODER_MPEG4);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      const options = ctx.listOptions();
      assert.ok(options.length > 0, 'Should have options');

      // Find a common option and check its properties
      const bitrateOption = options.find((opt) => opt.name === 'b');
      assert.ok(bitrateOption, 'Should find bitrate option');
      assert.ok(bitrateOption.type === AV_OPT_TYPE_INT || bitrateOption.type === AV_OPT_TYPE_INT64, 'Bitrate should be int type');
      assert.ok(bitrateOption.help, 'Should have help text');
      assert.ok(typeof bitrateOption.flags === 'number', 'Should have flags');

      // Check for options with min/max values
      const optionWithRange = options.find((opt) => typeof opt.min === 'number' && typeof opt.max === 'number');
      if (optionWithRange) {
        assert.ok(typeof optionWithRange.min === 'number', 'Should have min value');
        assert.ok(typeof optionWithRange.max === 'number', 'Should have max value');
      }

      ctx.freeContext();
    });

    it('should handle const options', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264) ?? Codec.findEncoderByName(FF_ENCODER_MPEG4);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      const options = ctx.listOptions();

      // Check for const options (usually preset values)
      const constOptions = options.filter((opt) => opt.type === AV_OPT_TYPE_CONST);
      if (constOptions.length > 0) {
        assert.ok(constOptions[0].unit, 'Const options should have unit');
      }

      ctx.freeContext();
    });

    it('should check for single flag using hasFlags', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264) ?? Codec.findEncoderByName(FF_ENCODER_MPEG4);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      const options = ctx.listOptions();
      assert.ok(options.length > 0, 'Should have options');

      // Find an option with flags set
      const optionWithFlags = options.find((opt) => opt.flags !== 0);
      if (optionWithFlags) {
        const flags = optionWithFlags.flags;

        // Find the first flag bit that is set
        for (let i = 0; i < 32; i++) {
          const testFlag = 1 << i;
          if ((flags & testFlag) === testFlag) {
            assert.equal(optionWithFlags.hasFlags(testFlag as any), true);
            break;
          }
        }
      }

      ctx.freeContext();
    });

    it('should check for multiple flags using hasFlags', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264) ?? Codec.findEncoderByName(FF_ENCODER_MPEG4);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      const options = ctx.listOptions();

      // Find an option with multiple flags set
      const optionWithFlags = options.find((opt) => {
        const flags = opt.flags;
        // Count how many bits are set
        let count = 0;
        for (let i = 0; i < 32; i++) {
          if ((flags & (1 << i)) !== 0) count++;
        }
        return count >= 2;
      });

      if (optionWithFlags) {
        const flags = optionWithFlags.flags;

        // Find two flag bits that are set
        const setFlags: number[] = [];
        for (let i = 0; i < 32 && setFlags.length < 2; i++) {
          const testFlag = 1 << i;
          if ((flags & testFlag) === testFlag) {
            setFlags.push(testFlag);
          }
        }

        if (setFlags.length >= 2) {
          assert.equal(optionWithFlags.hasFlags(setFlags[0] as any, setFlags[1] as any), true);
        }
      }

      ctx.freeContext();
    });

    it('should return false when flag is not set', () => {
      const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264) ?? Codec.findEncoderByName(FF_ENCODER_MPEG4);
      assert.ok(codec);

      const ctx = new CodecContext();
      ctx.allocContext3(codec);

      const options = ctx.listOptions();

      // Find an option and test with a flag that's not set
      if (options.length > 0) {
        const option = options[0];
        const flags = option.flags;

        // Find a flag bit that is NOT set
        for (let i = 0; i < 32; i++) {
          const testFlag = 1 << i;
          if ((flags & testFlag) !== testFlag) {
            assert.equal(option.hasFlags(testFlag as any), false);
            break;
          }
        }
      }

      ctx.freeContext();
    });
  });
});
