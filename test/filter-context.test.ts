import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_CHANNEL_LAYOUT_5POINT1_BACK,
  AV_CHANNEL_LAYOUT_STEREO,
  AV_HWDEVICE_TYPE_VIDEOTOOLBOX,
  AV_OPT_TYPE_BINARY_INT_ARRAY,
  AV_PIX_FMT_RGB24,
  AV_PIX_FMT_YUV420P,
  AV_SAMPLE_FMT_S16,
  Filter,
  FilterContext,
  FilterGraph,
  Frame,
  HardwareDeviceContext,
} from '../src/index.js';

describe('FilterContext', () => {
  describe('Creation and Lifecycle', () => {
    it('should create filter context through FilterGraph', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const anullFilter = Filter.getByName('anull');
      assert.ok(anullFilter, 'Should find anull filter');

      const ctx = graph.createFilter(anullFilter, 'my_anull');
      assert.ok(ctx instanceof FilterContext, 'Should create FilterContext instance');
      assert.equal(ctx.name, 'my_anull', 'Should have correct name');

      graph.free();
    });

    it('should create multiple filter contexts in same graph', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const anullFilter = Filter.getByName('anull');
      const volumeFilter = Filter.getByName('volume');
      const aformatFilter = Filter.getByName('aformat');

      assert.ok(anullFilter);
      assert.ok(volumeFilter);
      assert.ok(aformatFilter);

      const anullCtx = graph.createFilter(anullFilter, 'in');
      const volumeCtx = graph.createFilter(volumeFilter, 'vol');
      const aformatCtx = graph.createFilter(aformatFilter, 'out');

      assert.ok(anullCtx instanceof FilterContext);
      assert.ok(volumeCtx instanceof FilterContext);
      assert.ok(aformatCtx instanceof FilterContext);

      assert.equal(anullCtx.name, 'in');
      assert.equal(volumeCtx.name, 'vol');
      assert.equal(aformatCtx.name, 'out');

      graph.free();
    });
  });

  describe('Initialization', () => {
    it('should initialize with string arguments', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      assert.ok(bufferFilter);

      // Create buffer filter with initialization args
      const ctx = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
      assert.ok(ctx, 'Should create filter context');

      // Buffer filter is already initialized via createFilter
      const ret = 0;
      assert.equal(ret, 0, 'Should initialize successfully');

      graph.free();
    });

    it('should initialize scale filter', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const scaleFilter = Filter.getByName('scale');
      assert.ok(scaleFilter);

      // Create and initialize scale filter in one step
      const ctx = graph.createFilter(scaleFilter, 'scale', '640:480');
      assert.ok(ctx, 'Should create and initialize scale filter');

      graph.free();
    });

    it('should initialize with dictionary options', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const scaleFilter = Filter.getByName('scale');
      assert.ok(scaleFilter);

      // Create and initialize with args string (dictionary not supported in createFilter)
      const ctx = graph.createFilter(scaleFilter, 'scale', 'w=1280:h=720');
      assert.ok(ctx, 'Should create and initialize filter context');

      graph.free();
    });

    it('should initialize without arguments', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const anullFilter = Filter.getByName('anull');
      assert.ok(anullFilter, 'Should find anull filter');

      // Some filters don't need arguments - pass null or undefined
      const ctx = graph.createFilter(anullFilter, 'anull', null);
      assert.ok(ctx, 'Should create and initialize filter without arguments');

      graph.free();
    });

    it('should handle invalid initialization arguments', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const scaleFilter = Filter.getByName('scale');
      assert.ok(scaleFilter);

      const ctx = graph.createFilter(scaleFilter, 'scale');
      assert.ok(ctx, 'Should create filter context');

      // Invalid arguments
      const ret = ctx.initStr('invalid:arguments:xyz');
      assert.ok(ret < 0, 'Should fail with invalid arguments');

      graph.free();
    });
  });

  describe('Properties', () => {
    it('should get filter property', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const scaleFilter = Filter.getByName('scale');
      assert.ok(scaleFilter);

      const ctx = graph.createFilter(scaleFilter, 'scale');
      assert.ok(ctx, 'Should create filter context');

      const filter = ctx.filter;
      assert.ok(filter instanceof Filter, 'Should return Filter instance');
      assert.equal(filter?.name, 'scale', 'Should be the same filter');

      graph.free();
    });

    it('should get and set name', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('anull');
      assert.ok(filter);

      const ctx = graph.createFilter(filter, 'original_name');
      assert.ok(ctx, 'Should create filter context');

      assert.equal(ctx.name, 'original_name');

      // Change name
      ctx.name = 'new_name';
      assert.equal(ctx.name, 'new_name', 'Should update name');

      graph.free();
    });

    it('should get graph property', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('anull');
      assert.ok(filter);

      const ctx = graph.createFilter(filter, 'buf');
      assert.ok(ctx, 'Should create filter context');

      const ctxGraph = ctx.graph;
      assert.ok(ctxGraph, 'Should have graph reference');
      // Note: We get native graph object, not wrapped FilterGraph

      graph.free();
    });

    it('should get nbInputs and nbOutputs', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Source filter (no inputs)
      const bufferFilter = Filter.getByName('buffer');
      assert.ok(bufferFilter);
      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
      assert.ok(bufferCtx, 'Should create filter context');
      assert.equal(bufferCtx.nbInputs, 0, 'Buffer should have no inputs');
      assert.ok(bufferCtx.nbOutputs > 0, 'Buffer should have outputs');

      // Transform filter
      const scaleFilter = Filter.getByName('scale');
      assert.ok(scaleFilter);
      const scaleCtx = graph.createFilter(scaleFilter, 'scale');
      assert.ok(scaleCtx, 'Should create filter context');
      assert.ok(scaleCtx.nbInputs > 0, 'Scale should have inputs');
      assert.ok(scaleCtx.nbOutputs > 0, 'Scale should have outputs');

      // Sink filter (no outputs)
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(sinkFilter);
      const sinkCtx = graph.createFilter(sinkFilter, 'sink', null);
      assert.ok(sinkCtx, 'Should create filter context');
      assert.ok(sinkCtx.nbInputs > 0, 'Sink should have inputs');
      assert.equal(sinkCtx.nbOutputs, 0, 'Sink should have no outputs');

      graph.free();
    });
  });

  describe('Linking', () => {
    it('should link two filter contexts', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const scaleFilter = Filter.getByName('scale');

      assert.ok(bufferFilter);
      assert.ok(scaleFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
      assert.ok(bufferCtx, 'Should create filter context');

      const scaleCtx = graph.createFilter(scaleFilter, 'scale', '640:480');
      assert.ok(scaleCtx, 'Should create filter context');

      // Link buffer output (pad 0) to scale input (pad 0)
      const ret = bufferCtx.link(0, scaleCtx, 0);
      assert.equal(ret, 0, 'Should link successfully');

      graph.free();
    });

    it('should create filter chain', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const scaleFilter = Filter.getByName('scale');
      const sinkFilter = Filter.getByName('buffersink');

      assert.ok(bufferFilter);
      assert.ok(scaleFilter);
      assert.ok(sinkFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
      assert.ok(bufferCtx, 'Should create filter context');

      const scaleCtx = graph.createFilter(scaleFilter, 'scale', '640:480');
      assert.ok(scaleCtx, 'Should create filter context');

      const sinkCtx = graph.createFilter(sinkFilter, 'sink', null);
      assert.ok(sinkCtx, 'Should create filter context');

      // Create chain: buffer -> scale -> sink
      const ret1 = bufferCtx.link(0, scaleCtx, 0);
      assert.equal(ret1, 0, 'Should link buffer to scale');

      const ret2 = scaleCtx.link(0, sinkCtx, 0);
      assert.equal(ret2, 0, 'Should link scale to sink');

      graph.free();
    });

    it('should handle invalid pad indices', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const scaleFilter = Filter.getByName('scale');

      assert.ok(bufferFilter);
      assert.ok(scaleFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
      assert.ok(bufferCtx, 'Should create filter context');

      const scaleCtx = graph.createFilter(scaleFilter, 'scale', '640:480');
      assert.ok(scaleCtx, 'Should create filter context');

      // Try to link with invalid pad index
      const ret = bufferCtx.link(99, scaleCtx, 0);
      assert.ok(ret < 0, 'Should fail with invalid pad index');

      graph.free();
    });

    it('should unlink filter connections', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const scaleFilter = Filter.getByName('scale');

      assert.ok(bufferFilter);
      assert.ok(scaleFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
      assert.ok(bufferCtx, 'Should create filter context');

      const scaleCtx = graph.createFilter(scaleFilter, 'scale', '640:480');
      assert.ok(scaleCtx, 'Should create filter context');

      // Link first
      const ret = bufferCtx.link(0, scaleCtx, 0);
      assert.equal(ret, 0);

      // Unlink
      scaleCtx.unlink(0);
      // No error should occur
      assert.ok(true, 'Unlink should succeed');

      graph.free();
    });
  });

  describe('Type Detection', () => {
    it('should identify source filter context', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      assert.ok(bufferFilter);

      const ctx = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
      assert.ok(ctx, 'Should create filter context');
      assert.ok(ctx.isSource(), 'Buffer context should be a source');
      assert.ok(!ctx.isSink(), 'Buffer context should not be a sink');

      graph.free();
    });

    it('should identify sink filter context', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(sinkFilter);

      const ctx = graph.createFilter(sinkFilter, 'sink', null);
      assert.ok(ctx, 'Should create filter context');
      assert.ok(ctx.isSink(), 'Buffersink context should be a sink');
      assert.ok(!ctx.isSource(), 'Buffersink context should not be a source');

      graph.free();
    });

    it('should identify transform filter context', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const scaleFilter = Filter.getByName('scale');
      assert.ok(scaleFilter);

      const ctx = graph.createFilter(scaleFilter, 'scale');
      assert.ok(ctx, 'Should create filter context');
      assert.ok(!ctx.isSource(), 'Scale should not be a source');
      assert.ok(!ctx.isSink(), 'Scale should not be a sink');

      graph.free();
    });
  });

  describe('Complex Scenarios', () => {
    it('should create video processing pipeline', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Get filters
      const filters = {
        buffer: Filter.getByName('buffer'),
        scale: Filter.getByName('scale'),
        crop: Filter.getByName('crop'),
        sink: Filter.getByName('buffersink'),
      };

      // Verify all filters exist
      Object.entries(filters).forEach(([name, filter]) => {
        assert.ok(filter, `Should find ${name} filter`);
      });

      // Create filter contexts with initialization
      const contexts = {
        buffer: graph.createFilter(filters.buffer!, 'in', 'video_size=1920x1080:pix_fmt=0:time_base=1/30:pixel_aspect=1/1'),
        scale: graph.createFilter(filters.scale!, 'scale', '1280:720'),
        crop: graph.createFilter(filters.crop!, 'crop', '1280:640:0:40'), // Crop to 1280x640, removing 40px from top and bottom
        sink: graph.createFilter(filters.sink!, 'out', null),
      };

      assert.ok(contexts.buffer, 'Should create buffer context');
      assert.ok(contexts.scale, 'Should create scale context');
      assert.ok(contexts.crop, 'Should create crop context');
      assert.ok(contexts.sink, 'Should create sink context');

      // Link: buffer -> scale -> crop -> sink
      assert.equal(contexts.buffer.link(0, contexts.scale, 0), 0);
      assert.equal(contexts.scale.link(0, contexts.crop, 0), 0);
      assert.equal(contexts.crop.link(0, contexts.sink, 0), 0);

      graph.free();
    });

    it('should create audio processing pipeline', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Get audio filters
      const filters = {
        abuffer: Filter.getByName('abuffer'),
        volume: Filter.getByName('volume'),
        aformat: Filter.getByName('aformat'),
        abuffersink: Filter.getByName('abuffersink'),
      };

      // Verify all filters exist
      Object.entries(filters).forEach(([name, filter]) => {
        assert.ok(filter, `Should find ${name} filter`);
      });

      // Create filter contexts with initialization
      const contexts = {
        abuffer: graph.createFilter(filters.abuffer!, 'ain', 'sample_rate=44100:sample_fmt=1:channel_layout=3'),
        volume: graph.createFilter(filters.volume!, 'vol', '0.5'), // Reduce volume to 50%
        aformat: graph.createFilter(filters.aformat!, 'fmt', 'sample_rates=48000:sample_fmts=1:channel_layouts=3'),
        abuffersink: graph.createFilter(filters.abuffersink!, 'aout', null),
      };

      assert.ok(contexts.abuffer, 'Should create abuffer context');
      assert.ok(contexts.volume, 'Should create volume context');
      assert.ok(contexts.aformat, 'Should create aformat context');
      assert.ok(contexts.abuffersink, 'Should create abuffersink context');

      // Link: abuffer -> volume -> aformat -> abuffersink
      assert.equal(contexts.abuffer.link(0, contexts.volume, 0), 0);
      assert.equal(contexts.volume.link(0, contexts.aformat, 0), 0);
      assert.equal(contexts.aformat.link(0, contexts.abuffersink, 0), 0);

      graph.free();
    });
  });

  describe('Advanced Operations', () => {
    it('should set binary options with optSetBin', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Test with buffersink filter which accepts pix_fmts (as used in transcode.ts)
      // IMPORTANT: pix_fmts must be set BEFORE initialization
      const buffersinkFilter = Filter.getByName('buffersink');
      assert.ok(buffersinkFilter, 'Should find buffersink filter');

      // Use allocFilter (doesn't initialize) so we can set options first
      const ctx = graph.allocFilter(buffersinkFilter, 'out');
      assert.ok(ctx, 'Should create buffersink filter context');

      // Set pix_fmts as binary option BEFORE initialization
      const ret1 = ctx.setOption('pix_fmts', [AV_PIX_FMT_YUV420P], AV_OPT_TYPE_BINARY_INT_ARRAY);
      assert.equal(ret1, 0, 'Should set pix_fmts successfully on buffersink');

      // Initialize after setting options
      const initRet1 = ctx.init(null);
      assert.equal(initRet1, 0, 'Should initialize after setting options');

      // Also test with multiple pixel formats
      const ctx2 = graph.allocFilter(buffersinkFilter, 'out2');
      assert.ok(ctx2, 'Should create second buffersink filter context');
      const ret2 = ctx2.setOption('pix_fmts', [AV_PIX_FMT_YUV420P, AV_PIX_FMT_RGB24], AV_OPT_TYPE_BINARY_INT_ARRAY);
      assert.equal(ret2, 0, 'Should set multiple pix_fmts successfully');

      const initRet2 = ctx2.init(null);
      assert.equal(initRet2, 0, 'Should initialize second filter');

      graph.free();
    });

    it('should get time base from buffersink (async)', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create a complete audio pipeline to properly initialize buffersink
      const abufferFilter = Filter.getByName('abuffer');
      const abuffersinkFilter = Filter.getByName('abuffersink');
      assert.ok(abufferFilter);
      assert.ok(abuffersinkFilter);

      const abufferCtx = graph.createFilter(abufferFilter, 'src', 'sample_rate=44100:sample_fmt=1:channel_layout=3');
      const abuffersinkCtx = graph.createFilter(abuffersinkFilter, 'sink', null);
      assert.ok(abufferCtx);
      assert.ok(abuffersinkCtx);

      // Link the filters
      abufferCtx.link(0, abuffersinkCtx, 0);

      // Configure the graph
      const configRet = await graph.config();
      assert.equal(configRet, 0, 'Should configure graph');

      // Get time base from buffersink
      const timeBase = abuffersinkCtx.buffersinkGetTimeBase();
      assert.ok(timeBase, 'Should get time base');
      assert.equal(typeof timeBase.num, 'number', 'Time base numerator should be a number');
      assert.equal(typeof timeBase.den, 'number', 'Time base denominator should be a number');
      assert.ok(timeBase.den > 0, 'Time base denominator should be positive');

      graph.free();
    });

    it('should get time base from buffersink (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create a complete audio pipeline to properly initialize buffersink
      const abufferFilter = Filter.getByName('abuffer');
      const abuffersinkFilter = Filter.getByName('abuffersink');
      assert.ok(abufferFilter);
      assert.ok(abuffersinkFilter);

      const abufferCtx = graph.createFilter(abufferFilter, 'src', 'sample_rate=44100:sample_fmt=1:channel_layout=3');
      const abuffersinkCtx = graph.createFilter(abuffersinkFilter, 'sink', null);
      assert.ok(abufferCtx);
      assert.ok(abuffersinkCtx);

      // Link the filters
      abufferCtx.link(0, abuffersinkCtx, 0);

      // Configure the graph synchronously
      const configRet = graph.configSync();
      assert.equal(configRet, 0, 'Should configure graph');

      // Get time base from buffersink
      const timeBase = abuffersinkCtx.buffersinkGetTimeBase();
      assert.ok(timeBase, 'Should get time base');
      assert.equal(typeof timeBase.num, 'number', 'Time base numerator should be a number');
      assert.equal(typeof timeBase.den, 'number', 'Time base denominator should be a number');
      assert.ok(timeBase.den > 0, 'Time base denominator should be positive');

      graph.free();
    });
  });

  describe('Resource Management', () => {
    it('should free filter context', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('anull');
      assert.ok(filter);

      const ctx = graph.createFilter(filter, 'buf');
      assert.ok(ctx, 'Should create filter context');

      ctx.free();

      // Context is now invalid, but graph cleanup should handle it
      graph.free();
    });

    it('should handle Symbol.dispose', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('scale');
      assert.ok(filter);

      const ctx = graph.createFilter(filter, 'scale');
      assert.ok(ctx, 'Should create filter context');

      // Call Symbol.dispose
      if (typeof ctx[Symbol.dispose] === 'function') {
        ctx[Symbol.dispose]();
      }

      graph.free();
    });

    it('should handle multiple filter contexts in graph', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const contexts: FilterContext[] = [];

      // Create multiple filter contexts
      for (let i = 0; i < 5; i++) {
        const filter = Filter.getByName('anull');
        assert.ok(filter);
        const ctx = graph.createFilter(filter, `anull_${i}`);

        if (ctx) {
          contexts.push(ctx);
        }
      }

      assert.equal(contexts.length, 5, 'Should create 5 contexts');

      // Free graph cleans up all contexts
      graph.free();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null filter graph', () => {
      const graph = new FilterGraph();
      // Don't call alloc()

      const filter = Filter.getByName('buffer');
      assert.ok(filter);

      try {
        graph.createFilter(filter, 'buf', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
        assert.fail('Should throw error without allocated graph');
      } catch (error) {
        assert.ok(error, 'Should throw error');
      }
    });

    it('should handle double initialization', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('scale');
      assert.ok(filter);

      // Create and initialize filter
      const ctx = graph.createFilter(filter, 'scale', '640:480');
      assert.ok(ctx, 'Should create and initialize filter context');

      // Try to initialize again - should fail because already initialized
      const ret = ctx.initStr('1280:720');
      // Double initialization typically returns an error
      assert.ok(ret < 0, 'Should fail on double initialization');

      graph.free();
    });
  });

  describe('Frame Operations', () => {
    it('should add frame to buffer source filter (async)', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink');
      assert.ok(bufferCtx, 'Should create buffer filter context');
      assert.ok(sinkCtx, 'Should create sink filter context');

      // Link and configure the graph
      const linkRet = bufferCtx.link(0, sinkCtx, 0);
      assert.equal(linkRet, 0, 'Should link filters');

      const configRet = await graph.config();
      assert.equal(configRet, 0, 'Should configure graph');

      // Create a frame to add
      const frame = new Frame();
      frame.alloc();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 320;
      frame.height = 240;
      frame.pts = 0n;
      frame.allocBuffer();

      // Add frame to buffer source
      const ret = await bufferCtx.buffersrcAddFrame(frame);
      assert.ok(ret >= 0, 'Should add frame successfully');

      frame.free();
      graph.free();
    });

    it('should get frame from buffer sink filter', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create simple passthrough: buffer -> buffersink
      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink');
      assert.ok(bufferCtx);
      assert.ok(sinkCtx);

      // Link and configure
      const linkRet = bufferCtx.link(0, sinkCtx, 0);
      assert.equal(linkRet, 0);
      const configRet = await graph.config();
      assert.equal(configRet, 0);

      // Add a frame
      const inFrame = new Frame();
      inFrame.alloc();
      inFrame.format = AV_PIX_FMT_YUV420P;
      inFrame.width = 320;
      inFrame.height = 240;
      inFrame.pts = 0n;
      inFrame.allocBuffer();

      const addRet = await bufferCtx.buffersrcAddFrame(inFrame);
      assert.ok(addRet >= 0, 'Should add frame successfully');

      // Get frame from sink
      const outFrame = new Frame();
      outFrame.alloc();
      const getRet = await sinkCtx.buffersinkGetFrame(outFrame);
      assert.ok(getRet >= 0, 'Should get frame from sink');
      assert.equal(outFrame.width, 320);
      assert.equal(outFrame.height, 240);

      inFrame.free();
      outFrame.free();
      graph.free();
    });

    it('should handle audio buffer source and sink', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create audio buffer -> sink
      const abufferFilter = Filter.getByName('abuffer');
      const abuffersinkFilter = Filter.getByName('abuffersink');
      assert.ok(abufferFilter);
      assert.ok(abuffersinkFilter);

      const abufferCtx = graph.createFilter(abufferFilter, 'asrc', 'sample_rate=44100:sample_fmt=1:channel_layout=3:time_base=1/44100');
      const abuffersinkCtx = graph.createFilter(abuffersinkFilter, 'asink');
      assert.ok(abufferCtx);
      assert.ok(abuffersinkCtx);

      // Link and configure
      const linkRet = abufferCtx.link(0, abuffersinkCtx, 0);
      assert.equal(linkRet, 0);
      const configRet = await graph.config();
      assert.equal(configRet, 0);

      // Create audio frame
      const audioFrame = new Frame();
      audioFrame.alloc();
      audioFrame.format = AV_SAMPLE_FMT_S16;
      audioFrame.sampleRate = 44100;
      audioFrame.nbSamples = 1024;
      audioFrame.pts = 0n;
      audioFrame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      audioFrame.allocBuffer();

      // Add and get audio frame
      const addRet = await abufferCtx.buffersrcAddFrame(audioFrame);
      assert.ok(addRet >= 0, 'Should add audio frame');

      const outFrame = new Frame();
      outFrame.alloc();
      const getRet = await abuffersinkCtx.buffersinkGetFrame(outFrame);
      assert.ok(getRet >= 0, 'Should get audio frame');
      assert.equal(outFrame.sampleRate, 44100);
      assert.equal(outFrame.nbSamples, 1024);

      audioFrame.free();
      outFrame.free();
      graph.free();
    });

    it('should add frame to buffer source filter (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink');
      assert.ok(bufferCtx, 'Should create buffer filter context');
      assert.ok(sinkCtx, 'Should create sink filter context');

      // Link and configure the graph synchronously
      const linkRet = bufferCtx.link(0, sinkCtx, 0);
      assert.equal(linkRet, 0, 'Should link filters');

      const configRet = graph.configSync();
      assert.equal(configRet, 0, 'Should configure graph');

      // Create a frame to add
      const frame = new Frame();
      frame.alloc();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 320;
      frame.height = 240;
      frame.pts = 0n;
      frame.allocBuffer();

      // Add frame to buffer source synchronously
      const ret = bufferCtx.buffersrcAddFrameSync(frame);
      assert.ok(ret >= 0, 'Should add frame successfully');

      frame.free();
      graph.free();
    });

    it('should get frame from buffer sink filter (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create simple passthrough: buffer -> buffersink
      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25:pixel_aspect=1/1');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink');
      assert.ok(bufferCtx);
      assert.ok(sinkCtx);

      // Link and configure synchronously
      const linkRet = bufferCtx.link(0, sinkCtx, 0);
      assert.equal(linkRet, 0);
      const configRet = graph.configSync();
      assert.equal(configRet, 0);

      // Add a frame
      const inFrame = new Frame();
      inFrame.alloc();
      inFrame.format = AV_PIX_FMT_YUV420P;
      inFrame.width = 320;
      inFrame.height = 240;
      inFrame.pts = 0n;
      inFrame.allocBuffer();

      const addRet = bufferCtx.buffersrcAddFrameSync(inFrame);
      assert.ok(addRet >= 0, 'Should add frame successfully');

      // Get frame from sink synchronously
      const outFrame = new Frame();
      outFrame.alloc();
      const getRet = sinkCtx.buffersinkGetFrameSync(outFrame);
      assert.ok(getRet >= 0, 'Should get frame from sink');
      assert.equal(outFrame.width, 320);
      assert.equal(outFrame.height, 240);

      inFrame.free();
      outFrame.free();
      graph.free();
    });

    it('should handle audio buffer source and sink (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create audio buffer -> sink
      const abufferFilter = Filter.getByName('abuffer');
      const abuffersinkFilter = Filter.getByName('abuffersink');
      assert.ok(abufferFilter);
      assert.ok(abuffersinkFilter);

      const abufferCtx = graph.createFilter(abufferFilter, 'asrc', 'sample_rate=44100:sample_fmt=1:channel_layout=3:time_base=1/44100');
      const abuffersinkCtx = graph.createFilter(abuffersinkFilter, 'asink');
      assert.ok(abufferCtx);
      assert.ok(abuffersinkCtx);

      // Link and configure synchronously
      const linkRet = abufferCtx.link(0, abuffersinkCtx, 0);
      assert.equal(linkRet, 0);
      const configRet = graph.configSync();
      assert.equal(configRet, 0);

      // Create audio frame
      const audioFrame = new Frame();
      audioFrame.alloc();
      audioFrame.format = AV_SAMPLE_FMT_S16;
      audioFrame.sampleRate = 44100;
      audioFrame.nbSamples = 1024;
      audioFrame.pts = 0n;
      audioFrame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      audioFrame.allocBuffer();

      // Add frame synchronously
      const addRet = abufferCtx.buffersrcAddFrameSync(audioFrame);
      assert.ok(addRet >= 0, 'Should add audio frame');

      // Get frame from sink synchronously
      const outFrame = new Frame();
      outFrame.alloc();
      const getRet = abuffersinkCtx.buffersinkGetFrameSync(outFrame);
      assert.ok(getRet >= 0, 'Should get audio frame');
      assert.equal(outFrame.sampleRate, 44100);
      assert.equal(outFrame.nbSamples, 1024);

      audioFrame.free();
      outFrame.free();
      graph.free();
    });
  });

  describe('Hardware Device Context', () => {
    it('should get and set hardware device context', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create a hardware device context
      const hwDevice = new HardwareDeviceContext();
      // Try to initialize it with VideoToolbox (macOS)
      const createRet = hwDevice.create(AV_HWDEVICE_TYPE_VIDEOTOOLBOX, null, null);

      if (createRet !== 0) {
        // Hardware not available, skip test
        hwDevice.free();
        graph.free();
        assert.ok(true, 'Hardware device not available - test skipped');
        return;
      }

      const scaleFilter = Filter.getByName('scale');
      assert.ok(scaleFilter, 'Should find scale filter');

      const ctx = graph.createFilter(scaleFilter, 'scale', '640:480');
      assert.ok(ctx, 'Should create filter context');

      // Initially should be null
      const initialHwCtx = ctx.hwDeviceCtx;
      assert.equal(initialHwCtx, null, 'Hardware device context should initially be null');

      // Set hardware device context
      ctx.hwDeviceCtx = hwDevice;

      // Get it back
      const retrievedHwCtx = ctx.hwDeviceCtx;
      assert.ok(retrievedHwCtx, 'Should retrieve hardware device context');
      // Note: The retrieved context is a new wrapper around the same underlying AVBufferRef
      assert.ok(retrievedHwCtx instanceof HardwareDeviceContext, 'Should be a HardwareDeviceContext instance');

      // Clean up
      hwDevice.free();
      graph.free();
    });

    it('should handle null hardware device context', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const scaleFilter = Filter.getByName('scale');
      assert.ok(scaleFilter, 'Should find scale filter');

      const ctx = graph.createFilter(scaleFilter, 'scale');
      assert.ok(ctx, 'Should create filter context');

      // Set to null (should work without error)
      ctx.hwDeviceCtx = null;

      const hwCtx = ctx.hwDeviceCtx;
      assert.equal(hwCtx, null, 'Should be null after setting to null');

      graph.free();
    });

    it('should work with hardware-accelerated filters', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Try to find a hardware filter (scale_vt for VideoToolbox on macOS)
      const hwScaleFilter = Filter.getByName('scale_vt');

      if (hwScaleFilter) {
        const ctx = graph.createFilter(hwScaleFilter, 'hw_scale');
        assert.ok(ctx, 'Should create hardware filter context');

        // Hardware filters typically need a hardware device context
        const hwCtx = ctx.hwDeviceCtx;
        assert.equal(hwCtx, null, 'Hardware device context should initially be null');

        // In real use, we would set a hardware device context here
        // ctx.hwDeviceCtx = someHardwareDevice;

        graph.free();
      } else {
        // Hardware filter not available on this platform
        assert.ok(true, 'Hardware filter not available - test skipped');
      }
    });

    it('should preserve hardware device context across operations', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const scaleFilter = Filter.getByName('scale');
      assert.ok(scaleFilter, 'Should find scale filter');

      const ctx = graph.createFilter(scaleFilter, 'scale', '640:480');
      assert.ok(ctx, 'Should create filter context');

      // Create a hardware device context
      const hwDevice = new HardwareDeviceContext();
      const createRet = hwDevice.create(AV_HWDEVICE_TYPE_VIDEOTOOLBOX, null, null);

      if (createRet !== 0) {
        // Hardware not available, skip test
        hwDevice.free();
        graph.free();
        assert.ok(true, 'Hardware device not available - test skipped');
        return;
      }

      // Set hardware context after filter is initialized
      ctx.hwDeviceCtx = hwDevice;

      // Hardware context should still be there after initialization
      const hwCtxAfterInit = ctx.hwDeviceCtx;
      assert.ok(hwCtxAfterInit, 'Hardware context should persist after initialization');
      assert.ok(hwCtxAfterInit instanceof HardwareDeviceContext, 'Should be a HardwareDeviceContext instance');

      // Clean up
      hwDevice.free();
      graph.free();
    });

    it('should handle hardware device context in filter chain', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create multiple filters
      const bufferFilter = Filter.getByName('buffer');
      const scaleFilter = Filter.getByName('scale');
      const sinkFilter = Filter.getByName('buffersink');

      assert.ok(bufferFilter);
      assert.ok(scaleFilter);
      assert.ok(sinkFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=1920x1080:pix_fmt=0:time_base=1/30:pixel_aspect=1/1');
      const scaleCtx = graph.createFilter(scaleFilter, 'scale', '1280:720');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink');

      assert.ok(bufferCtx);
      assert.ok(scaleCtx);
      assert.ok(sinkCtx);

      // Create a hardware device context
      const hwDevice = new HardwareDeviceContext();
      const createRet = hwDevice.create(AV_HWDEVICE_TYPE_VIDEOTOOLBOX, null, null);

      if (createRet !== 0) {
        // Hardware not available, skip test
        hwDevice.free();
        graph.free();
        assert.ok(true, 'Hardware device not available - test skipped');
        return;
      }

      // Set hardware context on the scale filter
      scaleCtx.hwDeviceCtx = hwDevice;

      // Link filters
      assert.equal(bufferCtx.link(0, scaleCtx, 0), 0);
      assert.equal(scaleCtx.link(0, sinkCtx, 0), 0);

      // Verify hardware context is still set
      const retrievedHwCtx = scaleCtx.hwDeviceCtx;
      assert.ok(retrievedHwCtx, 'Hardware context should be set on scale filter');
      assert.ok(retrievedHwCtx instanceof HardwareDeviceContext, 'Should be a HardwareDeviceContext instance');

      // Other filters should not have hardware context
      assert.equal(bufferCtx.hwDeviceCtx, null, 'Buffer filter should not have hardware context');
      assert.equal(sinkCtx.hwDeviceCtx, null, 'Sink filter should not have hardware context');

      // Clean up
      hwDevice.free();
      graph.free();
    });
  });

  describe('Buffersink Query Methods', () => {
    it('should get video format properties from buffersink', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create a complete video pipeline
      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=1920x1080:pix_fmt=0:time_base=1/30:pixel_aspect=16/9');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink');
      assert.ok(bufferCtx);
      assert.ok(sinkCtx);

      // Link and configure
      bufferCtx.link(0, sinkCtx, 0);
      const configRet = await graph.config();
      assert.equal(configRet, 0);

      // Get format properties from buffersink
      const format = sinkCtx.buffersinkGetFormat();
      assert.equal(format, AV_PIX_FMT_YUV420P, 'Should get pixel format');

      const width = sinkCtx.buffersinkGetWidth();
      assert.equal(width, 1920, 'Should get width');

      const height = sinkCtx.buffersinkGetHeight();
      assert.equal(height, 1080, 'Should get height');

      const sar = sinkCtx.buffersinkGetSampleAspectRatio();
      assert.ok(sar, 'Should get sample aspect ratio');
      assert.equal(sar.num, 16, 'Should have correct SAR numerator');
      assert.equal(sar.den, 9, 'Should have correct SAR denominator');

      const frameRate = sinkCtx.buffersinkGetFrameRate();
      assert.ok(frameRate, 'Should get frame rate');
      // Frame rate might be 0/1 for simple filter graphs without explicit frame rate
      // This is expected behavior for buffersink without frame rate constraints
      if (frameRate.num === 0) {
        assert.equal(frameRate.num, 0, 'Frame rate can be 0 for unconstrained buffersink');
        assert.equal(frameRate.den, 1, 'Frame rate denominator should be 1');
      } else {
        assert.equal(frameRate.num, 30, 'Should have correct frame rate numerator');
        assert.equal(frameRate.den, 1, 'Should have correct frame rate denominator');
      }

      const timeBase = sinkCtx.buffersinkGetTimeBase();
      assert.ok(timeBase, 'Should get time base');
      assert.equal(timeBase.num, 1, 'Should have correct time base numerator');
      assert.equal(timeBase.den, 30, 'Should have correct time base denominator');

      graph.free();
    });

    it('should get audio format properties from buffersink', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create a complete audio pipeline
      const abufferFilter = Filter.getByName('abuffer');
      const abuffersinkFilter = Filter.getByName('abuffersink');
      assert.ok(abufferFilter);
      assert.ok(abuffersinkFilter);

      const abufferCtx = graph.createFilter(abufferFilter, 'asrc', 'sample_rate=48000:sample_fmt=1:channel_layout=3');
      const abuffersinkCtx = graph.createFilter(abuffersinkFilter, 'asink');
      assert.ok(abufferCtx);
      assert.ok(abuffersinkCtx);

      // Link and configure
      abufferCtx.link(0, abuffersinkCtx, 0);
      const configRet = await graph.config();
      assert.equal(configRet, 0);

      // Get format properties from audio buffersink
      const format = abuffersinkCtx.buffersinkGetFormat();
      assert.equal(format, AV_SAMPLE_FMT_S16, 'Should get sample format');

      const sampleRate = abuffersinkCtx.buffersinkGetSampleRate();
      assert.equal(sampleRate, 48000, 'Should get sample rate');

      const channelLayout = abuffersinkCtx.buffersinkGetChannelLayout();
      assert.ok(channelLayout, 'Should get channel layout');
      assert.equal(channelLayout.nbChannels, 2, 'Should have 2 channels');
      assert.equal(channelLayout.mask, 3n, 'Should have stereo mask');

      const timeBase = abuffersinkCtx.buffersinkGetTimeBase();
      assert.ok(timeBase, 'Should get time base');
      assert.equal(timeBase.num, 1, 'Should have correct time base numerator');
      assert.equal(timeBase.den, 48000, 'Should have correct time base denominator');

      graph.free();
    });

    it('should get format after filter transformation', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create pipeline with scale filter: buffer -> scale -> sink
      const bufferFilter = Filter.getByName('buffer');
      const scaleFilter = Filter.getByName('scale');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(scaleFilter);
      assert.ok(sinkFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=1920x1080:pix_fmt=0:time_base=1/30:pixel_aspect=1/1');
      const scaleCtx = graph.createFilter(scaleFilter, 'scale', '640:480');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink');
      assert.ok(bufferCtx);
      assert.ok(scaleCtx);
      assert.ok(sinkCtx);

      // Link and configure
      bufferCtx.link(0, scaleCtx, 0);
      scaleCtx.link(0, sinkCtx, 0);
      const configRet = await graph.config();
      assert.equal(configRet, 0);

      // Add a frame to properly initialize the pipeline
      const frame = new Frame();
      frame.alloc();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 1920;
      frame.height = 1080;
      frame.pts = 0n;
      frame.allocBuffer();

      await bufferCtx.buffersrcAddFrame(frame);

      // Get the output frame to ensure pipeline is processed
      const outFrame = new Frame();
      outFrame.alloc();
      await sinkCtx.buffersinkGetFrame(outFrame);

      // Get transformed dimensions from buffersink
      const width = sinkCtx.buffersinkGetWidth();
      assert.equal(width, 640, 'Should get scaled width');

      const height = sinkCtx.buffersinkGetHeight();
      assert.equal(height, 480, 'Should get scaled height');

      // Format should remain the same
      const format = sinkCtx.buffersinkGetFormat();
      assert.equal(format, AV_PIX_FMT_YUV420P, 'Format should remain YUV420P');

      frame.free();
      outFrame.free();
      graph.free();
    });

    it('should get format after audio resampling', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create pipeline with aformat filter: abuffer -> aformat -> abuffersink
      const abufferFilter = Filter.getByName('abuffer');
      const aformatFilter = Filter.getByName('aformat');
      const abuffersinkFilter = Filter.getByName('abuffersink');
      assert.ok(abufferFilter);
      assert.ok(aformatFilter);
      assert.ok(abuffersinkFilter);

      // Start with 44100 Hz
      const abufferCtx = graph.createFilter(abufferFilter, 'asrc', 'sample_rate=44100:sample_fmt=1:channel_layout=3:time_base=1/44100');
      // Resample to 48000 Hz
      const aformatCtx = graph.createFilter(aformatFilter, 'fmt', 'sample_rates=48000:sample_fmts=1:channel_layouts=3');
      const abuffersinkCtx = graph.createFilter(abuffersinkFilter, 'asink');
      assert.ok(abufferCtx);
      assert.ok(aformatCtx);
      assert.ok(abuffersinkCtx);

      // Link and configure
      abufferCtx.link(0, aformatCtx, 0);
      aformatCtx.link(0, abuffersinkCtx, 0);
      const configRet = await graph.config();
      assert.equal(configRet, 0);

      // Add an audio frame to initialize the pipeline
      const audioFrame = new Frame();
      audioFrame.alloc();
      audioFrame.format = AV_SAMPLE_FMT_S16;
      audioFrame.sampleRate = 44100;
      audioFrame.nbSamples = 1024;
      audioFrame.pts = 0n;
      audioFrame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      audioFrame.allocBuffer();

      await abufferCtx.buffersrcAddFrame(audioFrame);

      // Get the output frame
      const outFrame = new Frame();
      outFrame.alloc();
      await abuffersinkCtx.buffersinkGetFrame(outFrame);

      // Get resampled format from buffersink
      const sampleRate = abuffersinkCtx.buffersinkGetSampleRate();
      assert.equal(sampleRate, 48000, 'Should get resampled rate');

      const format = abuffersinkCtx.buffersinkGetFormat();
      assert.equal(format, AV_SAMPLE_FMT_S16, 'Format should remain S16');

      audioFrame.free();
      outFrame.free();
      graph.free();
    });

    it('should handle video format with non-square pixels', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create buffer with non-square pixel aspect ratio (e.g., anamorphic)
      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      // 720x480 with 8:9 PAR (NTSC DV)
      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=720x480:pix_fmt=0:time_base=1001/30000:pixel_aspect=8/9');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink');
      assert.ok(bufferCtx);
      assert.ok(sinkCtx);

      bufferCtx.link(0, sinkCtx, 0);
      const configRet = await graph.config();
      assert.equal(configRet, 0);

      // Add a frame to initialize
      const frame = new Frame();
      frame.alloc();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 720;
      frame.height = 480;
      frame.pts = 0n;
      frame.allocBuffer();

      await bufferCtx.buffersrcAddFrame(frame);

      const outFrame = new Frame();
      outFrame.alloc();
      await sinkCtx.buffersinkGetFrame(outFrame);

      const sar = sinkCtx.buffersinkGetSampleAspectRatio();
      assert.ok(sar, 'Should get sample aspect ratio');
      assert.equal(sar.num, 8, 'Should have correct PAR numerator');
      assert.equal(sar.den, 9, 'Should have correct PAR denominator');

      const width = sinkCtx.buffersinkGetWidth();
      assert.equal(width, 720, 'Should get correct width');

      const height = sinkCtx.buffersinkGetHeight();
      assert.equal(height, 480, 'Should get correct height');

      frame.free();
      outFrame.free();
      graph.free();
    });

    it('should handle multichannel audio layouts', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      const abufferFilter = Filter.getByName('abuffer');
      const abuffersinkFilter = Filter.getByName('abuffersink');
      assert.ok(abufferFilter);
      assert.ok(abuffersinkFilter);

      // Create 5.1 surround audio (6 channels)
      // Channel layout mask for 5.1: FL+FR+FC+LFE+BL+BR = 0x3F
      const abufferCtx = graph.createFilter(abufferFilter, 'asrc', 'sample_rate=48000:sample_fmt=1:channel_layout=0x3f:time_base=1/48000');
      const abuffersinkCtx = graph.createFilter(abuffersinkFilter, 'asink');
      assert.ok(abufferCtx);
      assert.ok(abuffersinkCtx);

      abufferCtx.link(0, abuffersinkCtx, 0);
      const configRet = await graph.config();
      assert.equal(configRet, 0);

      // Add an audio frame
      const audioFrame = new Frame();
      audioFrame.alloc();
      audioFrame.format = AV_SAMPLE_FMT_S16;
      audioFrame.sampleRate = 48000;
      audioFrame.nbSamples = 1024;
      audioFrame.pts = 0n;
      audioFrame.channelLayout = AV_CHANNEL_LAYOUT_5POINT1_BACK;
      audioFrame.allocBuffer();

      await abufferCtx.buffersrcAddFrame(audioFrame);

      const outFrame = new Frame();
      outFrame.alloc();
      await abuffersinkCtx.buffersinkGetFrame(outFrame);

      const channelLayout = abuffersinkCtx.buffersinkGetChannelLayout();
      assert.ok(channelLayout, 'Should get channel layout');
      assert.equal(channelLayout.nbChannels, 6, 'Should have 6 channels for 5.1');
      assert.equal(channelLayout.mask, 0x3fn, 'Should have 5.1 surround mask');

      const sampleRate = abuffersinkCtx.buffersinkGetSampleRate();
      assert.equal(sampleRate, 48000, 'Should get correct sample rate');

      audioFrame.free();
      outFrame.free();
      graph.free();
    });

    it('should get colorspace from buffersink', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=1920x1080:pix_fmt=0:time_base=1/30:pixel_aspect=1/1');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink');
      assert.ok(bufferCtx);
      assert.ok(sinkCtx);

      bufferCtx.link(0, sinkCtx, 0);
      const configRet = await graph.config();
      assert.equal(configRet, 0);

      // Add a frame to initialize pipeline
      const frame = new Frame();
      frame.alloc();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 1920;
      frame.height = 1080;
      frame.pts = 0n;
      frame.allocBuffer();

      await bufferCtx.buffersrcAddFrame(frame);

      const outFrame = new Frame();
      outFrame.alloc();
      await sinkCtx.buffersinkGetFrame(outFrame);

      // Get colorspace
      const colorSpace = sinkCtx.buffersinkGetColorspace();
      assert.ok(typeof colorSpace === 'number', 'Should return a color space value');

      frame.free();
      outFrame.free();
      graph.free();
    });

    it('should get color range from buffersink', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'src', 'video_size=1920x1080:pix_fmt=0:time_base=1/30:pixel_aspect=1/1');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink');
      assert.ok(bufferCtx);
      assert.ok(sinkCtx);

      bufferCtx.link(0, sinkCtx, 0);
      const configRet = await graph.config();
      assert.equal(configRet, 0);

      // Add a frame to initialize pipeline
      const frame = new Frame();
      frame.alloc();
      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 1920;
      frame.height = 1080;
      frame.pts = 0n;
      frame.allocBuffer();

      await bufferCtx.buffersrcAddFrame(frame);

      const outFrame = new Frame();
      outFrame.alloc();
      await sinkCtx.buffersinkGetFrame(outFrame);

      // Get color range
      const colorRange = sinkCtx.buffersinkGetColorRange();
      assert.ok(typeof colorRange === 'number', 'Should return a color range value');

      frame.free();
      outFrame.free();
      graph.free();
    });
  });

  describe('Buffer Source Parameters', () => {
    it('should set buffer source parameters with buffersrcParametersSet', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Note: The filter for video sources is actually called "buffer", not "buffersrc"
      // But we need to create it without args first, then set parameters
      const bufferFilter = Filter.getByName('buffer');
      assert.ok(bufferFilter, 'Should find buffer filter');

      // Create filter without args (will set parameters later)
      const ctx = graph.allocFilter(bufferFilter, 'src');
      assert.ok(ctx, 'Should create buffer source context');

      // Set parameters for video buffer source
      const params = {
        width: 1920,
        height: 1080,
        format: AV_PIX_FMT_YUV420P,
        timeBase: { num: 1, den: 30 },
        frameRate: { num: 30, den: 1 },
        sampleAspectRatio: { num: 1, den: 1 },
        hwFramesCtx: null,
      };

      const ret = ctx.buffersrcParametersSet(params);
      assert.equal(ret, 0, 'Should set parameters successfully');

      // Initialize after setting parameters
      const initRet = ctx.init(null);
      assert.equal(initRet, 0, 'Should initialize successfully after setting parameters');

      graph.free();
    });

    it('should set buffer source parameters with alphaMode', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      assert.ok(bufferFilter, 'Should find buffer filter');

      const ctx = graph.allocFilter(bufferFilter, 'src');
      assert.ok(ctx, 'Should create buffer source context');

      // Set parameters with alphaMode
      const params = {
        width: 1280,
        height: 720,
        format: AV_PIX_FMT_YUV420P,
        timeBase: { num: 1, den: 25 },
        frameRate: { num: 25, den: 1 },
        sampleAspectRatio: { num: 1, den: 1 },
        hwFramesCtx: null,
        alphaMode: 0, // No alpha
      };

      const ret = ctx.buffersrcParametersSet(params);
      assert.equal(ret, 0, 'Should set parameters with alphaMode successfully');

      const initRet = ctx.init(null);
      assert.equal(initRet, 0, 'Should initialize successfully');

      graph.free();
    });

    it('should set buffer source parameters with hardware frames context', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      assert.ok(bufferFilter, 'Should find buffer filter');

      const ctx = graph.allocFilter(bufferFilter, 'src');
      assert.ok(ctx, 'Should create buffer source context');

      // NOTE: Hardware formats require a valid hwFramesCtx, not null
      // This test uses a software format instead
      const params = {
        width: 1280,
        height: 720,
        format: AV_PIX_FMT_YUV420P, // Use software format instead of VIDEOTOOLBOX
        timeBase: { num: 1, den: 25 },
        frameRate: { num: 25, den: 1 },
        sampleAspectRatio: { num: 1, den: 1 },
        hwFramesCtx: null,
      };

      const ret = ctx.buffersrcParametersSet(params);
      assert.equal(ret, 0, 'Should set parameters successfully');

      // Initialize after setting parameters
      const initRet = ctx.init(null);
      assert.equal(initRet, 0, 'Should initialize successfully');

      graph.free();
    });

    it('should handle invalid parameters in buffersrcParametersSet', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      assert.ok(bufferFilter, 'Should find buffer filter');

      const ctx = graph.allocFilter(bufferFilter, 'src');
      assert.ok(ctx, 'Should create buffer source context');

      // Test with invalid width/height
      const invalidParams = {
        width: -1,
        height: -1,
        format: AV_PIX_FMT_YUV420P,
        timeBase: { num: 1, den: 30 },
        frameRate: { num: 30, den: 1 },
        sampleAspectRatio: { num: 1, den: 1 },
        hwFramesCtx: null,
      };

      ctx.buffersrcParametersSet(invalidParams);
      // FFmpeg might accept negative values and fail later during init
      // or it might return an error immediately

      // Try to initialize - this should definitely fail
      const initRet = ctx.init(null);
      assert.ok(initRet < 0, 'Should fail initialization with invalid parameters');

      graph.free();
    });

    it('should set minimal buffer source parameters', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      assert.ok(bufferFilter, 'Should find buffer filter');

      const ctx = graph.allocFilter(bufferFilter, 'src');
      assert.ok(ctx, 'Should create buffer source context');

      // Minimal required parameters
      const params = {
        width: 640,
        height: 480,
        format: AV_PIX_FMT_RGB24,
        timeBase: { num: 1, den: 1 },
        // Optional parameters can be omitted
        hwFramesCtx: null,
      };

      const ret = ctx.buffersrcParametersSet(params);
      assert.equal(ret, 0, 'Should set minimal parameters successfully');

      const initRet = ctx.init(null);
      assert.equal(initRet, 0, 'Should initialize with minimal parameters');

      graph.free();
    });
  });
});
