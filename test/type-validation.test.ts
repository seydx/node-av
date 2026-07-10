import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AV_CODEC_ID_H264, AV_PIX_FMT_YUV420P, Codec, CodecContext, Filter, FilterGraph, Frame, Packet, SoftwareScaleContext, SWS_BILINEAR } from '../src/index.js';

describe('Native Type Validation', () => {
  describe('CodecContext', () => {
    it('should throw TypeError when a Frame is passed where a Packet is expected (sync)', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec, 'Should find H264 decoder');

      const ctx = new CodecContext();
      ctx.allocContext3(codec);
      const openRet = ctx.open2Sync(codec, null);
      assert.equal(openRet, 0, 'Should open codec');

      const frame = new Frame();
      frame.alloc();

      assert.throws(() => ctx.sendPacketSync(frame as unknown as Packet), TypeError, 'Should throw TypeError instead of reinterpreting Frame as Packet');

      frame.free();
      ctx.freeContext();
    });

    it('should throw TypeError when a Frame is passed where a Packet is expected (async)', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec, 'Should find H264 decoder');

      const ctx = new CodecContext();
      ctx.allocContext3(codec);
      const openRet = await ctx.open2(codec, null);
      assert.equal(openRet, 0, 'Should open codec');

      const frame = new Frame();
      frame.alloc();

      await assert.rejects(async () => ctx.receivePacket(frame as unknown as Packet), TypeError, 'Should throw TypeError instead of reinterpreting Frame as Packet');

      frame.free();
      ctx.freeContext();
    });

    it('should throw TypeError when a Packet is passed where a Frame is expected (sync)', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec, 'Should find H264 decoder');

      const ctx = new CodecContext();
      ctx.allocContext3(codec);
      const openRet = ctx.open2Sync(codec, null);
      assert.equal(openRet, 0, 'Should open codec');

      const packet = new Packet();
      packet.alloc();

      assert.throws(() => ctx.receiveFrameSync(packet as unknown as Frame), TypeError, 'Should throw TypeError instead of reinterpreting Packet as Frame');

      packet.free();
      ctx.freeContext();
    });

    it('should throw TypeError when a Packet is passed where a Frame is expected (async)', async () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec, 'Should find H264 decoder');

      const ctx = new CodecContext();
      ctx.allocContext3(codec);
      const openRet = await ctx.open2(codec, null);
      assert.equal(openRet, 0, 'Should open codec');

      const packet = new Packet();
      packet.alloc();

      await assert.rejects(async () => ctx.receiveFrame(packet as unknown as Frame), TypeError, 'Should throw TypeError instead of reinterpreting Packet as Frame');

      packet.free();
      ctx.freeContext();
    });

    it('should still accept a valid Frame after a failed call', () => {
      const codec = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(codec, 'Should find H264 decoder');

      const ctx = new CodecContext();
      ctx.allocContext3(codec);
      const openRet = ctx.open2Sync(codec, null);
      assert.equal(openRet, 0, 'Should open codec');

      const packet = new Packet();
      packet.alloc();
      const frame = new Frame();
      frame.alloc();

      // Wrong type throws, but the context must remain usable afterwards
      assert.throws(() => ctx.receiveFrameSync(packet as unknown as Frame), TypeError);
      const ret = ctx.receiveFrameSync(frame);
      assert.equal(typeof ret, 'number', 'Should return an error code for a valid Frame');

      packet.free();
      frame.free();
      ctx.freeContext();
    });
  });

  describe('SoftwareScaleContext', () => {
    it('should throw TypeError when a Packet is passed where a Frame is expected (sync)', () => {
      const sws = new SoftwareScaleContext();
      sws.getContext(640, 480, AV_PIX_FMT_YUV420P, 320, 240, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      const packet = new Packet();
      packet.alloc();

      assert.throws(() => sws.scaleFrameSync(packet as unknown as Frame, packet as unknown as Frame), TypeError, 'Should throw TypeError instead of crashing');

      packet.free();
      sws.freeContext();
    });

    it('should throw TypeError when a Packet is passed where a Frame is expected (async)', async () => {
      const sws = new SoftwareScaleContext();
      sws.getContext(640, 480, AV_PIX_FMT_YUV420P, 320, 240, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

      const packet = new Packet();
      packet.alloc();

      await assert.rejects(async () => sws.scaleFrame(packet as unknown as Frame, packet as unknown as Frame), TypeError, 'Should throw TypeError instead of crashing');

      packet.free();
      sws.freeContext();
    });
  });

  describe('FilterContext', () => {
    it('should throw TypeError when a Packet is passed where a Frame is expected (buffersink sync)', () => {
      const graph = new FilterGraph();
      graph.alloc();

      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(sinkFilter, 'Should find buffersink filter');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink', null);
      assert.ok(sinkCtx, 'Should create buffersink context');

      const packet = new Packet();
      packet.alloc();

      assert.throws(() => sinkCtx.buffersinkGetFrameSync(packet as unknown as Frame), TypeError, 'Should throw TypeError instead of crashing');

      packet.free();
      graph.free();
    });

    it('should throw TypeError when a Packet is passed where a Frame is expected (buffersink async)', async () => {
      const graph = new FilterGraph();
      graph.alloc();

      const sinkFilter = Filter.getByName('buffersink');
      assert.ok(sinkFilter, 'Should find buffersink filter');
      const sinkCtx = graph.createFilter(sinkFilter, 'sink', null);
      assert.ok(sinkCtx, 'Should create buffersink context');

      const packet = new Packet();
      packet.alloc();

      await assert.rejects(async () => sinkCtx.buffersinkGetFrame(packet as unknown as Frame), TypeError, 'Should throw TypeError instead of crashing');

      packet.free();
      graph.free();
    });
  });
});
