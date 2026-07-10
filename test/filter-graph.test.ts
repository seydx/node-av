import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_OPT_TYPE_IMAGE_SIZE,
  AV_OPT_TYPE_PIXEL_FMT,
  AV_OPT_TYPE_RATIONAL,
  AV_OPT_TYPE_SAMPLE_FMT,
  AV_OPT_TYPE_STRING,
  AV_PIX_FMT_YUV420P,
  AV_SAMPLE_FMT_S16,
  AVFILTER_CMD_FLAG_FAST,
  AVFILTER_CMD_FLAG_ONE,
  AVFILTER_THREAD_SLICE,
  AVFLAG_NONE,
  Filter,
  FilterContext,
  FilterGraph,
} from '../src/index.js';

describe('FilterGraph', () => {
  describe('Creation and Lifecycle', () => {
    it('should create a new filter graph', () => {
      const graph = new FilterGraph();
      assert.ok(graph instanceof FilterGraph, 'Should create FilterGraph instance');
    });

    it('should allocate a filter graph', () => {
      const graph = new FilterGraph();
      graph.alloc();
      assert.ok(graph, 'Graph should be allocated');
      graph.free();
    });

    it('should free a filter graph', () => {
      const graph = new FilterGraph();
      graph.alloc();
      graph.free();
      // Graph is now freed - no crash should occur
      assert.ok(true, 'Should free without error');
    });

    it('should support Symbol.dispose', () => {
      const graph = new FilterGraph();
      graph.alloc();

      if (typeof graph[Symbol.dispose] === 'function') {
        graph[Symbol.dispose]();
      }
      assert.ok(true, 'Should dispose without error');
    });
  });

  describe('Properties', () => {
    it('should get number of filters', () => {
      const graph = new FilterGraph();
      graph.alloc();

      assert.equal(graph.nbFilters, 0, 'Should have no filters initially');

      // Add a filter
      const filter = Filter.getByName('anull');
      assert.ok(filter);
      graph.createFilter(filter, 'test');

      assert.equal(graph.nbFilters, 1, 'Should have one filter');

      graph.free();
    });

    it('should get filters array', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Initially no filters
      let filters = graph.filters;
      assert.ok(filters === null || filters?.length === 0, 'Should have no filters initially');

      // Add filters
      const anullFilter = Filter.getByName('anull');
      const volumeFilter = Filter.getByName('volume');
      assert.ok(anullFilter);
      assert.ok(volumeFilter);

      graph.createFilter(anullFilter, 'anull');
      graph.createFilter(volumeFilter, 'volume', '0.5');

      filters = graph.filters;
      assert.ok(Array.isArray(filters), 'Should return array of filters');
      assert.equal(filters?.length, 2, 'Should have two filters');

      if (filters) {
        assert.ok(filters[0] instanceof FilterContext, 'Should contain FilterContext instances');
        assert.ok(filters[1] instanceof FilterContext, 'Should contain FilterContext instances');
      }

      graph.free();
    });

    it('should get and set thread type', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const initialThreadType = graph.threadType;
      assert.equal(typeof initialThreadType, 'number', 'Should have numeric thread type');

      // Set new thread type
      graph.threadType = AVFILTER_THREAD_SLICE;
      assert.equal(graph.threadType, AVFILTER_THREAD_SLICE, 'Should update thread type');

      graph.threadType = AVFLAG_NONE;
      assert.equal(graph.threadType, AVFLAG_NONE, 'Should disable threading');

      graph.free();
    });

    it('should get and set number of threads', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const initialThreads = graph.nbThreads;
      assert.equal(typeof initialThreads, 'number', 'Should have numeric thread count');

      // Set specific thread count
      graph.nbThreads = 4;
      assert.equal(graph.nbThreads, 4, 'Should update thread count');

      // Set to auto-detect (0)
      graph.nbThreads = 0;
      assert.equal(graph.nbThreads, 0, 'Should set to auto-detect');

      graph.free();
    });

    it('should get and set scale sws options', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Initially null or empty
      const initialOpts = graph.scaleSwsOpts;
      assert.ok(initialOpts === null || typeof initialOpts === 'string', 'Should be null or string');

      // Set options
      graph.scaleSwsOpts = 'flags=bicubic';
      assert.equal(graph.scaleSwsOpts, 'flags=bicubic', 'Should update sws options');

      // Clear options
      graph.scaleSwsOpts = null;
      assert.equal(graph.scaleSwsOpts, null, 'Should clear sws options');

      graph.free();
    });

    it('should get and set aresample swr options', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Initially null or empty
      const initialOpts = graph.aresampleSwrOpts;
      assert.ok(initialOpts === null || typeof initialOpts === 'string', 'Should be null or string');

      // Set options
      graph.aresampleSwrOpts = 'dither_method=triangular';
      assert.equal(graph.aresampleSwrOpts, 'dither_method=triangular', 'Should update swr options');

      // Set multiple options
      graph.aresampleSwrOpts = 'resampler=soxr:precision=28';
      assert.equal(graph.aresampleSwrOpts, 'resampler=soxr:precision=28', 'Should update swr options with multiple values');

      // Clear options
      graph.aresampleSwrOpts = null;
      assert.equal(graph.aresampleSwrOpts, null, 'Should clear swr options');

      graph.free();
    });
  });

  describe('Filter Creation', () => {
    it('should create a filter in the graph', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const scaleFilter = Filter.getByName('scale');
      assert.ok(scaleFilter, 'Should find scale filter');

      const ctx = graph.createFilter(scaleFilter, 'my_scale', '640:480');
      assert.ok(ctx instanceof FilterContext, 'Should create FilterContext');
      assert.equal(ctx.name, 'my_scale', 'Should have correct name');

      graph.free();
    });

    it('should create multiple filters', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filters = {
        buffer: Filter.getByName('buffer'),
        scale: Filter.getByName('scale'),
        sink: Filter.getByName('buffersink'),
      };

      assert.ok(filters.buffer);
      assert.ok(filters.scale);
      assert.ok(filters.sink);

      const contexts = {
        buffer: graph.createFilter(filters.buffer, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25'),
        scale: graph.createFilter(filters.scale, 'scale', '640:480'),
        sink: graph.createFilter(filters.sink, 'out'),
      };

      assert.ok(contexts.buffer, 'Should create buffer context');
      assert.ok(contexts.scale, 'Should create scale context');
      assert.ok(contexts.sink, 'Should create sink context');

      assert.equal(graph.nbFilters, 3, 'Should have three filters');

      graph.free();
    });

    it('should create filter without args', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('anull');
      assert.ok(filter);

      const ctx = graph.createFilter(filter, 'test');
      assert.ok(ctx, 'Should create filter without args');

      graph.free();
    });

    it('should create filter with null args', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('anull');
      assert.ok(filter);

      const ctx = graph.createFilter(filter, 'test', null);
      assert.ok(ctx, 'Should create filter with null args');

      graph.free();
    });

    it('should handle duplicate filter names', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('anull');
      assert.ok(filter);

      const ctx1 = graph.createFilter(filter, 'test');
      assert.ok(ctx1);

      // Try to create another filter with same name
      const ctx2 = graph.createFilter(filter, 'test');
      // FFmpeg might allow duplicate names or return null
      assert.ok(ctx2 === null || ctx2 instanceof FilterContext, 'Should handle duplicate names');

      graph.free();
    });
  });

  describe('Filter Retrieval', () => {
    it('should get filter by name', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('scale');
      assert.ok(filter);

      const created = graph.createFilter(filter, 'my_scale', '640:480');
      assert.ok(created);

      const retrieved = graph.getFilter('my_scale');
      assert.ok(retrieved instanceof FilterContext, 'Should retrieve filter by name');
      assert.equal(retrieved?.name, 'my_scale', 'Should be the same filter');

      graph.free();
    });

    it('should return null for non-existent filter', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const retrieved = graph.getFilter('non_existent');
      assert.equal(retrieved, null, 'Should return null for non-existent filter');

      graph.free();
    });

    it('should retrieve multiple filters', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const anullFilter = Filter.getByName('anull');
      const volumeFilter = Filter.getByName('volume');
      assert.ok(anullFilter);
      assert.ok(volumeFilter);

      graph.createFilter(anullFilter, 'input');
      graph.createFilter(volumeFilter, 'vol', '0.5');

      const input = graph.getFilter('input');
      const vol = graph.getFilter('vol');

      assert.ok(input, 'Should retrieve first filter');
      assert.ok(vol, 'Should retrieve second filter');
      assert.equal(input?.name, 'input');
      assert.equal(vol?.name, 'vol');

      graph.free();
    });
  });

  describe('Graph Configuration', () => {
    it('should configure a simple graph (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const src = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25');
      const sink = graph.createFilter(sinkFilter, 'sink');

      assert.ok(src);
      assert.ok(sink);

      // Link filters
      const linkRet = src.link(0, sink, 0);
      assert.equal(linkRet, 0, 'Should link successfully');

      // Configure graph synchronously
      const ret = graph.configSync();
      assert.equal(ret, 0, 'Should configure successfully');

      graph.free();
    });

    it('should configure a simple graph (async)', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const src = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25');
      const sink = graph.createFilter(sinkFilter, 'sink');

      assert.ok(src);
      assert.ok(sink);

      // Link filters
      const linkRet = src.link(0, sink, 0);
      assert.equal(linkRet, 0, 'Should link successfully');

      // Configure graph
      const ret = await graph.config();
      assert.equal(ret, 0, 'Should configure successfully');

      graph.free();
    });

    it('should configure a chain of filters (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filters = {
        buffer: Filter.getByName('buffer'),
        scale: Filter.getByName('scale'),
        crop: Filter.getByName('crop'),
        sink: Filter.getByName('buffersink'),
      };

      Object.values(filters).forEach((f) => assert.ok(f));

      const contexts = {
        buffer: graph.createFilter(filters.buffer!, 'src', 'video_size=1920x1080:pix_fmt=0:time_base=1/30'),
        scale: graph.createFilter(filters.scale!, 'scale', '1280:720'),
        crop: graph.createFilter(filters.crop!, 'crop', '1280:640:0:40'),
        sink: graph.createFilter(filters.sink!, 'sink'),
      };

      Object.values(contexts).forEach((c) => assert.ok(c));

      // Link chain
      contexts.buffer!.link(0, contexts.scale!, 0);
      contexts.scale!.link(0, contexts.crop!, 0);
      contexts.crop!.link(0, contexts.sink!, 0);

      const ret = graph.configSync();
      assert.equal(ret, 0, 'Should configure filter chain');

      graph.free();
    });

    it('should configure a chain of filters (async)', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filters = {
        buffer: Filter.getByName('buffer'),
        scale: Filter.getByName('scale'),
        crop: Filter.getByName('crop'),
        sink: Filter.getByName('buffersink'),
      };

      Object.values(filters).forEach((f) => assert.ok(f));

      const contexts = {
        buffer: graph.createFilter(filters.buffer!, 'src', 'video_size=1920x1080:pix_fmt=0:time_base=1/30'),
        scale: graph.createFilter(filters.scale!, 'scale', '1280:720'),
        crop: graph.createFilter(filters.crop!, 'crop', '1280:640:0:40'),
        sink: graph.createFilter(filters.sink!, 'sink'),
      };

      Object.values(contexts).forEach((c) => assert.ok(c));

      // Link chain
      contexts.buffer!.link(0, contexts.scale!, 0);
      contexts.scale!.link(0, contexts.crop!, 0);
      contexts.crop!.link(0, contexts.sink!, 0);

      const ret = await graph.config();
      assert.equal(ret, 0, 'Should configure filter chain');

      graph.free();
    });

    it('should validate graph structure', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const src = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25');
      const sink = graph.createFilter(sinkFilter, 'sink');

      assert.ok(src);
      assert.ok(sink);

      src.link(0, sink, 0);

      // Validate before config
      const ret = graph.validate();
      assert.equal(ret, 0, 'Should validate successfully');

      graph.free();
    });

    it('should handle invalid graph configuration (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create unconnected filters
      const filter = Filter.getByName('scale');
      assert.ok(filter);

      graph.createFilter(filter, 'scale', '640:480');

      // Try to configure incomplete graph
      const ret = graph.configSync();
      // Should fail because scale filter has unconnected inputs/outputs
      assert.ok(ret < 0, 'Should fail to configure incomplete graph');

      graph.free();
    });

    it('should handle invalid graph configuration (async)', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create unconnected filters
      const filter = Filter.getByName('scale');
      assert.ok(filter);

      graph.createFilter(filter, 'scale', '640:480');

      // Try to configure incomplete graph
      const ret = await graph.config();
      // Should fail because scale filter has unconnected inputs/outputs
      assert.ok(ret < 0, 'Should fail to configure incomplete graph');

      graph.free();
    });
  });

  describe('Graph Parsing', () => {
    it('should parse a simple filtergraph string', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const ret = graph.parse2('anull');
      // Simple filters might parse successfully
      assert.equal(typeof ret, 'number', 'Should return status code');

      graph.free();
    });

    it('should parse complex filtergraph with parsePtr', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const ret = graph.parsePtr('anull,volume=0.5');
      assert.equal(typeof ret, 'number', 'Should return status code');

      graph.free();
    });

    it('should parse with inputs and outputs', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create buffer and sink first
      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const bufferCtx = graph.createFilter(bufferFilter, 'in', 'video_size=320x240:pix_fmt=0:time_base=1/25');
      const sinkCtx = graph.createFilter(sinkFilter, 'out');
      assert.ok(bufferCtx);
      assert.ok(sinkCtx);

      // Create FilterInOut for linking
      // const inputs = new FilterInOut();
      // const outputs = new FilterInOut();

      // Note: FilterInOut usage would require proper initialization
      // For now, test basic parse call
      const ret = graph.parse('[in] scale=640:480 [out]', null, null);
      assert.equal(typeof ret, 'number', 'Should return status code');

      graph.free();
    });

    it('should handle invalid filtergraph syntax', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const ret = graph.parse2('invalid:::syntax');
      assert.ok(ret < 0, 'Should fail with invalid syntax');

      graph.free();
    });
  });

  describe('Alternative Filter Initialization (allocFilter)', () => {
    it('should allocate filter without initialization', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      assert.ok(bufferFilter);

      // Allocate filter without initializing
      const bufferCtx = graph.allocFilter(bufferFilter, 'test_buffer');
      assert.ok(bufferCtx, 'Should allocate filter');
      assert.ok(bufferCtx instanceof FilterContext, 'Should return FilterContext');

      graph.free();
    });

    it('should use allocFilter + setOption + init workflow', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      // Allocate buffer source without initializing
      const bufferCtx = graph.allocFilter(bufferFilter, 'in');
      assert.ok(bufferCtx);

      // Set options individually
      bufferCtx.setOption('video_size', { width: 320, height: 240 }, AV_OPT_TYPE_IMAGE_SIZE);
      bufferCtx.setOption('pix_fmt', AV_PIX_FMT_YUV420P, AV_OPT_TYPE_PIXEL_FMT);
      bufferCtx.setOption('time_base', { num: 1, den: 25 }, AV_OPT_TYPE_RATIONAL);
      bufferCtx.setOption('pixel_aspect', '1/1', AV_OPT_TYPE_STRING);

      // Initialize the filter
      const initRet = bufferCtx.init();
      assert.equal(initRet, 0, 'Should initialize successfully');

      // Allocate and initialize sink
      const sinkCtx = graph.allocFilter(sinkFilter, 'out');
      assert.ok(sinkCtx);
      const sinkInitRet = sinkCtx.init();
      assert.equal(sinkInitRet, 0, 'Sink should initialize');

      graph.free();
    });

    it('should support audio filters with allocFilter', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const abufferFilter = Filter.getByName('abuffer');
      const asinkFilter = Filter.getByName('abuffersink');
      assert.ok(abufferFilter);
      assert.ok(asinkFilter);

      // Allocate audio buffer source
      const abufferCtx = graph.allocFilter(abufferFilter, 'ain');
      assert.ok(abufferCtx);

      // Set audio options
      abufferCtx.setOption('sample_rate', 44100);
      abufferCtx.setOption('sample_fmt', AV_SAMPLE_FMT_S16, AV_OPT_TYPE_SAMPLE_FMT);
      abufferCtx.setOption('channel_layout', 'stereo', AV_OPT_TYPE_STRING);
      abufferCtx.setOption('time_base', { num: 1, den: 44100 }, AV_OPT_TYPE_RATIONAL);

      // Initialize
      const initRet = abufferCtx.init();
      assert.equal(initRet, 0, 'Audio buffer should initialize');

      // Allocate and init sink
      const asinkCtx = graph.allocFilter(asinkFilter, 'aout');
      assert.ok(asinkCtx);
      asinkCtx.init();

      graph.free();
    });
  });

  describe('Graph Processing', () => {
    it('should request oldest frame (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create a complete graph
      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const src = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25');
      const sink = graph.createFilter(sinkFilter, 'sink');
      assert.ok(src);
      assert.ok(sink);

      src.link(0, sink, 0);
      graph.configSync();

      // Request oldest frame synchronously (will likely return EAGAIN without input)
      const ret = graph.requestOldestSync();
      assert.equal(typeof ret, 'number', 'Should return status code');

      graph.free();
    });

    it('should request oldest frame (async)', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create a complete graph
      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const src = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25');
      const sink = graph.createFilter(sinkFilter, 'sink');
      assert.ok(src);
      assert.ok(sink);

      src.link(0, sink, 0);
      await graph.config();

      // Request oldest frame (will likely return EAGAIN without input)
      const ret = await graph.requestOldest();
      assert.equal(typeof ret, 'number', 'Should return status code');

      graph.free();
    });
  });

  describe('Complex Graphs', () => {
    it('should create a video processing pipeline (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create video processing chain
      const filters = {
        buffer: Filter.getByName('buffer'),
        scale: Filter.getByName('scale'),
        hflip: Filter.getByName('hflip'),
        vflip: Filter.getByName('vflip'),
        sink: Filter.getByName('buffersink'),
      };

      Object.values(filters).forEach((f) => assert.ok(f, 'Filter should exist'));

      const contexts = {
        buffer: graph.createFilter(filters.buffer!, 'in', 'video_size=1920x1080:pix_fmt=0:time_base=1/30'),
        scale: graph.createFilter(filters.scale!, 'scale', '1280:720'),
        hflip: graph.createFilter(filters.hflip!, 'hflip'),
        vflip: graph.createFilter(filters.vflip!, 'vflip'),
        sink: graph.createFilter(filters.sink!, 'out'),
      };

      Object.values(contexts).forEach((c) => assert.ok(c, 'Context should be created'));

      // Link: buffer -> scale -> hflip -> vflip -> sink
      contexts.buffer!.link(0, contexts.scale!, 0);
      contexts.scale!.link(0, contexts.hflip!, 0);
      contexts.hflip!.link(0, contexts.vflip!, 0);
      contexts.vflip!.link(0, contexts.sink!, 0);

      const ret = graph.configSync();
      assert.equal(ret, 0, 'Should configure video pipeline');

      assert.equal(graph.nbFilters, 5, 'Should have 5 filters');

      graph.free();
    });

    it('should create a video processing pipeline (async)', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create video processing chain
      const filters = {
        buffer: Filter.getByName('buffer'),
        scale: Filter.getByName('scale'),
        hflip: Filter.getByName('hflip'),
        vflip: Filter.getByName('vflip'),
        sink: Filter.getByName('buffersink'),
      };

      Object.values(filters).forEach((f) => assert.ok(f, 'Filter should exist'));

      const contexts = {
        buffer: graph.createFilter(filters.buffer!, 'in', 'video_size=1920x1080:pix_fmt=0:time_base=1/30'),
        scale: graph.createFilter(filters.scale!, 'scale', '1280:720'),
        hflip: graph.createFilter(filters.hflip!, 'hflip'),
        vflip: graph.createFilter(filters.vflip!, 'vflip'),
        sink: graph.createFilter(filters.sink!, 'out'),
      };

      Object.values(contexts).forEach((c) => assert.ok(c, 'Context should be created'));

      // Link: buffer -> scale -> hflip -> vflip -> sink
      contexts.buffer!.link(0, contexts.scale!, 0);
      contexts.scale!.link(0, contexts.hflip!, 0);
      contexts.hflip!.link(0, contexts.vflip!, 0);
      contexts.vflip!.link(0, contexts.sink!, 0);

      const ret = await graph.config();
      assert.equal(ret, 0, 'Should configure video pipeline');

      assert.equal(graph.nbFilters, 5, 'Should have 5 filters');

      graph.free();
    });

    it('should create an audio processing pipeline (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create audio processing chain
      const filters = {
        abuffer: Filter.getByName('abuffer'),
        volume: Filter.getByName('volume'),
        atempo: Filter.getByName('atempo'),
        aformat: Filter.getByName('aformat'),
        abuffersink: Filter.getByName('abuffersink'),
      };

      Object.values(filters).forEach((f) => assert.ok(f, 'Filter should exist'));

      const contexts = {
        abuffer: graph.createFilter(filters.abuffer!, 'ain', 'sample_rate=44100:sample_fmt=1:channel_layout=3'),
        volume: graph.createFilter(filters.volume!, 'vol', '0.5'),
        atempo: graph.createFilter(filters.atempo!, 'tempo', '1.5'),
        aformat: graph.createFilter(filters.aformat!, 'fmt', 'sample_rates=48000:sample_fmts=1'),
        abuffersink: graph.createFilter(filters.abuffersink!, 'aout'),
      };

      Object.values(contexts).forEach((c) => assert.ok(c, 'Context should be created'));

      // Link: abuffer -> volume -> atempo -> aformat -> abuffersink
      contexts.abuffer!.link(0, contexts.volume!, 0);
      contexts.volume!.link(0, contexts.atempo!, 0);
      contexts.atempo!.link(0, contexts.aformat!, 0);
      contexts.aformat!.link(0, contexts.abuffersink!, 0);

      const ret = graph.configSync();
      assert.equal(ret, 0, 'Should configure audio pipeline');

      // FFmpeg may add automatic conversion filters during config
      assert.ok(graph.nbFilters >= 5, 'Should have at least 5 filters');

      graph.free();
    });

    it('should create an audio processing pipeline (async)', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create audio processing chain
      const filters = {
        abuffer: Filter.getByName('abuffer'),
        volume: Filter.getByName('volume'),
        atempo: Filter.getByName('atempo'),
        aformat: Filter.getByName('aformat'),
        abuffersink: Filter.getByName('abuffersink'),
      };

      Object.values(filters).forEach((f) => assert.ok(f, 'Filter should exist'));

      const contexts = {
        abuffer: graph.createFilter(filters.abuffer!, 'ain', 'sample_rate=44100:sample_fmt=1:channel_layout=3'),
        volume: graph.createFilter(filters.volume!, 'vol', '0.5'),
        atempo: graph.createFilter(filters.atempo!, 'tempo', '1.5'),
        aformat: graph.createFilter(filters.aformat!, 'fmt', 'sample_rates=48000:sample_fmts=1'),
        abuffersink: graph.createFilter(filters.abuffersink!, 'aout'),
      };

      Object.values(contexts).forEach((c) => assert.ok(c, 'Context should be created'));

      // Link: abuffer -> volume -> atempo -> aformat -> abuffersink
      contexts.abuffer!.link(0, contexts.volume!, 0);
      contexts.volume!.link(0, contexts.atempo!, 0);
      contexts.atempo!.link(0, contexts.aformat!, 0);
      contexts.aformat!.link(0, contexts.abuffersink!, 0);

      const ret = await graph.config();
      assert.equal(ret, 0, 'Should configure audio pipeline');

      // FFmpeg may add automatic conversion filters during config
      assert.ok(graph.nbFilters >= 5, 'Should have at least 5 filters');

      graph.free();
    });

    it('should handle parallel processing paths (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create graph with split
      const filters = {
        buffer: Filter.getByName('buffer'),
        split: Filter.getByName('split'),
        scale1: Filter.getByName('scale'),
        scale2: Filter.getByName('scale'),
        sink1: Filter.getByName('buffersink'),
        sink2: Filter.getByName('buffersink'),
      };

      // Check all filters exist
      assert.ok(filters.buffer);
      assert.ok(filters.split);
      assert.ok(filters.scale1);
      assert.ok(filters.scale2);
      assert.ok(filters.sink1);
      assert.ok(filters.sink2);

      const contexts = {
        buffer: graph.createFilter(filters.buffer, 'in', 'video_size=1920x1080:pix_fmt=0:time_base=1/30'),
        split: graph.createFilter(filters.split, 'split'),
        scale1: graph.createFilter(filters.scale1, 'scale1', '1280:720'),
        scale2: graph.createFilter(filters.scale2, 'scale2', '640:360'),
        sink1: graph.createFilter(filters.sink1, 'out1'),
        sink2: graph.createFilter(filters.sink2, 'out2'),
      };

      Object.values(contexts).forEach((c) => assert.ok(c));

      // Link: buffer -> split -> scale1 -> sink1
      //                      \-> scale2 -> sink2
      contexts.buffer!.link(0, contexts.split!, 0);
      contexts.split!.link(0, contexts.scale1!, 0);
      contexts.split!.link(1, contexts.scale2!, 0);
      contexts.scale1!.link(0, contexts.sink1!, 0);
      contexts.scale2!.link(0, contexts.sink2!, 0);

      const ret = graph.configSync();
      assert.equal(ret, 0, 'Should configure parallel paths');

      assert.equal(graph.nbFilters, 6, 'Should have 6 filters');

      graph.free();
    });

    it('should handle parallel processing paths (async)', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create graph with split
      const filters = {
        buffer: Filter.getByName('buffer'),
        split: Filter.getByName('split'),
        scale1: Filter.getByName('scale'),
        scale2: Filter.getByName('scale'),
        sink1: Filter.getByName('buffersink'),
        sink2: Filter.getByName('buffersink'),
      };

      // Check all filters exist
      assert.ok(filters.buffer);
      assert.ok(filters.split);
      assert.ok(filters.scale1);
      assert.ok(filters.scale2);
      assert.ok(filters.sink1);
      assert.ok(filters.sink2);

      const contexts = {
        buffer: graph.createFilter(filters.buffer, 'in', 'video_size=1920x1080:pix_fmt=0:time_base=1/30'),
        split: graph.createFilter(filters.split, 'split'),
        scale1: graph.createFilter(filters.scale1, 'scale1', '1280:720'),
        scale2: graph.createFilter(filters.scale2, 'scale2', '640:360'),
        sink1: graph.createFilter(filters.sink1, 'out1'),
        sink2: graph.createFilter(filters.sink2, 'out2'),
      };

      Object.values(contexts).forEach((c) => assert.ok(c));

      // Link: buffer -> split -> scale1 -> sink1
      //                      \-> scale2 -> sink2
      contexts.buffer!.link(0, contexts.split!, 0);
      contexts.split!.link(0, contexts.scale1!, 0);
      contexts.split!.link(1, contexts.scale2!, 0);
      contexts.scale1!.link(0, contexts.sink1!, 0);
      contexts.scale2!.link(0, contexts.sink2!, 0);

      const ret = await graph.config();
      assert.equal(ret, 0, 'Should configure parallel paths');

      assert.equal(graph.nbFilters, 6, 'Should have 6 filters');

      graph.free();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty graph (sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      assert.equal(graph.nbFilters, 0, 'Empty graph should have no filters');
      assert.ok(graph.filters === null || graph.filters?.length === 0, 'Should have empty filters array');

      const ret = graph.configSync();
      // Empty graph might configure successfully or return error
      assert.equal(typeof ret, 'number', 'Should return status code');

      graph.free();
    });

    it('should handle empty graph (async)', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      assert.equal(graph.nbFilters, 0, 'Empty graph should have no filters');
      assert.ok(graph.filters === null || graph.filters?.length === 0, 'Should have empty filters array');

      const ret = await graph.config();
      // Empty graph might configure successfully or return error
      assert.equal(typeof ret, 'number', 'Should return status code');

      graph.free();
    });

    it('should handle graph without allocation', () => {
      const graph = new FilterGraph();
      // Don't call alloc()

      const filter = Filter.getByName('anull');
      assert.ok(filter);

      try {
        graph.createFilter(filter, 'test');
        assert.fail('Should throw error without allocation');
      } catch (error) {
        assert.ok(error, 'Should throw error');
      }
    });

    it('should handle very long filter names', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('anull');
      assert.ok(filter);

      const longName = 'a'.repeat(1000);
      const ctx = graph.createFilter(filter, longName);
      // FFmpeg might truncate or handle long names
      assert.ok(ctx === null || ctx instanceof FilterContext, 'Should handle long names');

      graph.free();
    });

    it('should handle special characters in filter names', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('anull');
      assert.ok(filter);

      const specialName = 'test-filter_123.456';
      const ctx = graph.createFilter(filter, specialName);
      assert.ok(ctx, 'Should handle special characters');

      if (ctx) {
        assert.equal(ctx.name, specialName, 'Should preserve special characters');
      }

      graph.free();
    });

    it('should handle maximum number of filters', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('anull');
      assert.ok(filter);

      // Create many filters
      const contexts = [];
      for (let i = 0; i < 100; i++) {
        const ctx = graph.createFilter(filter, `filter_${i}`);
        if (ctx) {
          contexts.push(ctx);
        }
      }

      assert.ok(contexts.length > 0, 'Should create multiple filters');
      assert.equal(graph.nbFilters, contexts.length, 'Should track all filters');

      graph.free();
    });
  });

  describe('Memory Management', () => {
    it('should handle multiple alloc/free cycles', () => {
      const graph = new FilterGraph();

      // First cycle
      graph.alloc();
      const filter1 = Filter.getByName('anull');
      assert.ok(filter1);
      graph.createFilter(filter1, 'test1');
      graph.free();

      // Second cycle
      graph.alloc();
      const filter2 = Filter.getByName('volume');
      assert.ok(filter2);
      graph.createFilter(filter2, 'test2', '0.5');
      graph.free();

      assert.ok(true, 'Should handle multiple cycles');
    });

    it('should clean up filters when graph is freed', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create multiple filters
      const filters = ['anull', 'volume', 'atempo', 'aformat'];
      filters.forEach((name, i) => {
        const filter = Filter.getByName(name);
        if (filter) {
          graph.createFilter(filter, `filter_${i}`);
        }
      });

      assert.ok(graph.nbFilters > 0, 'Should have filters');

      // Free should clean up all filters
      graph.free();

      // Graph is now invalid but cleanup should be complete
      assert.ok(true, 'Should clean up all resources');
    });

    it('should not crash when free() races an in-flight config()', { timeout: 10000 }, async () => {
      const graph = new FilterGraph();
      graph.alloc();

      const bufferFilter = Filter.getByName('buffer');
      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(bufferFilter);
      assert.ok(sinkFilter);

      const src = graph.createFilter(bufferFilter, 'src', 'video_size=320x240:pix_fmt=0:time_base=1/25');
      const sink = graph.createFilter(sinkFilter, 'sink');
      assert.ok(src);
      assert.ok(sink);
      assert.equal(src.link(0, sink, 0), 0, 'Should link successfully');

      // Free while config() may still run on the threadpool - free() waits
      // for the in-flight operation (previously a use-after-free)
      const pending = graph.config();
      graph.free();

      const results = await Promise.allSettled([pending]);
      assert.notEqual(results[0].status, undefined);
    });
  });

  describe('Command Interface', () => {
    it('should send commands to filters', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create a filter that supports commands (e.g., volume)
      const volumeFilter = Filter.getByName('volume');
      assert.ok(volumeFilter, 'Volume filter should exist');

      const volumeCtx = graph.createFilter(volumeFilter, 'volume', 'volume=0.5');
      assert.ok(volumeCtx, 'Should create volume filter');

      // Need complete graph for commands to work
      const abufferFilter = Filter.getByName('abuffer');
      const abuffersinkFilter = Filter.getByName('abuffersink');
      assert.ok(abufferFilter && abuffersinkFilter);

      const src = graph.createFilter(abufferFilter, 'src', 'sample_rate=44100:sample_fmt=1:channel_layout=stereo');
      const sink = graph.createFilter(abuffersinkFilter, 'sink');
      assert.ok(src && sink);

      src.link(0, volumeCtx, 0);
      volumeCtx.link(0, sink, 0);

      const configRet = await graph.config();
      assert.equal(configRet, 0, 'Should configure graph');

      // Send volume change command
      const result = graph.sendCommand('volume', 'volume', '0.8');

      // Check result type
      if (typeof result === 'number') {
        // Command may fail if filter doesn't support runtime changes
        // or if the filter is not in the right state
        console.log('Command returned error code:', result);
      } else {
        // Success - got response
        assert.ok('response' in result, 'Should have response property');
        console.log('Command response:', result.response);
      }

      graph.free();
    });

    it('should send command to all filters', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create multiple filters
      const filter = Filter.getByName('null');
      assert.ok(filter);

      graph.createFilter(filter, 'filter1');
      graph.createFilter(filter, 'filter2');
      graph.createFilter(filter, 'filter3');

      // Send command to all filters
      const result = graph.sendCommand('all', 'enable', '1');

      // Check result
      assert.ok(typeof result === 'number' || 'response' in result, 'Should return error code or response object');

      graph.free();
    });

    it('should use command flags', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const filter = Filter.getByName('null');
      assert.ok(filter);
      graph.createFilter(filter, 'test');

      // Send command with AVFILTER_CMD_FLAG_ONE
      const result = graph.sendCommand('all', 'enable', '1', AVFILTER_CMD_FLAG_ONE);

      assert.ok(typeof result === 'number' || 'response' in result, 'Should handle command with flags');

      graph.free();
    });

    it('should queue commands for future execution', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create a filter that supports commands
      const volumeFilter = Filter.getByName('volume');
      assert.ok(volumeFilter);

      const volumeCtx = graph.createFilter(volumeFilter, 'volume', 'volume=1.0');
      assert.ok(volumeCtx);

      // Create complete audio graph
      const abufferFilter = Filter.getByName('abuffer');
      const abuffersinkFilter = Filter.getByName('abuffersink');

      const src = graph.createFilter(abufferFilter!, 'src', 'sample_rate=44100:sample_fmt=1:channel_layout=stereo');
      const sink = graph.createFilter(abuffersinkFilter!, 'sink');

      src!.link(0, volumeCtx, 0);
      volumeCtx.link(0, sink!, 0);

      await graph.config();

      // Queue volume changes at different timestamps
      const ret1 = graph.queueCommand('volume', 'volume', '0.5', 1.0);
      const ret2 = graph.queueCommand('volume', 'volume', '0.8', 2.0);
      const ret3 = graph.queueCommand('volume', 'volume', '0.2', 3.0);

      // Commands are queued, not executed immediately
      // They would be executed when processing frames with matching timestamps
      assert.equal(typeof ret1, 'number', 'Should return status code');
      assert.equal(typeof ret2, 'number', 'Should return status code');
      assert.equal(typeof ret3, 'number', 'Should return status code');

      graph.free();
    });

    it('should handle non-existent filter in sendCommand', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Send command to non-existent filter
      const result = graph.sendCommand('nonexistent', 'command', 'arg');

      // Should return error code
      assert.ok(typeof result === 'number', 'Should return error code');
      assert.ok(result < 0, 'Should be negative error code');

      graph.free();
    });

    it('should handle invalid command', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create a simple filter
      const nullFilter = Filter.getByName('null');
      assert.ok(nullFilter);

      const filter = graph.createFilter(nullFilter, 'test');
      assert.ok(filter);

      // Send an invalid command
      const result = graph.sendCommand('test', 'invalid_command_xyz', 'arg');

      // Should return error or empty response
      if (typeof result === 'number') {
        assert.ok(result <= 0, 'Should return error or zero');
      } else {
        assert.ok(result.response === null || result.response === '', 'Should have null or empty response');
      }

      graph.free();
    });

    it('should queue command with flags', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Create filter
      const filter = Filter.getByName('null');
      assert.ok(filter);
      graph.createFilter(filter, 'test');

      // Queue command with FAST flag
      const ret = graph.queueCommand('test', 'enable', '1', 5.0, AVFILTER_CMD_FLAG_FAST);

      assert.equal(typeof ret, 'number', 'Should return status code');

      graph.free();
    });

    it('should handle empty graph for commands', () => {
      const graph = new FilterGraph();
      graph.alloc();

      // Try to send command to empty graph
      const result = graph.sendCommand('all', 'enable', '1');

      // Should handle gracefully (either error or no response)
      assert.ok(typeof result === 'number' || 'response' in result, 'Should handle empty graph');

      graph.free();
    });
  });
});
