import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AVMEDIA_TYPE_VIDEO, AV_PIX_FMT_YUV420P, AV_SAMPLE_FMT_FLTP, AVERROR_EAGAIN, AVERROR_EOF } from '../src/constants/index.js';
import { Codec, CodecContext, FormatContext, Frame, Packet } from '../src/lib/index.js';
import { AV_CHANNEL_LAYOUT_STEREO } from '../src/constants/channel-layouts.js';

const INPUT = 'testdata/video.mp4';

describe('External Memory Reporting', () => {
  describe('Frame accounting', () => {
    it('reports a video buffer on getBuffer and releases it on unref/free', () => {
      using frame = new Frame();
      frame.alloc();
      assert.equal(frame.reportedExternalMemory, 0, 'fresh frame reports nothing');

      frame.format = AV_PIX_FMT_YUV420P;
      frame.width = 1920;
      frame.height = 1080;
      assert.equal(frame.getBuffer(), 0, 'getBuffer should succeed');

      // 1920x1080 YUV420p is ~3.1 MB; reported must cover the actual planes.
      const planeBytes = (frame.data ?? []).reduce((sum, p) => sum + p.length, 0);
      assert.ok(frame.reportedExternalMemory >= planeBytes, 'reported covers the data planes');
      assert.ok(frame.reportedExternalMemory > 3_000_000, 'reported is in the expected MB range');

      frame.unref();
      assert.equal(frame.reportedExternalMemory, 0, 'unref releases the report');
    });

    it('reports an audio buffer on getBuffer', () => {
      using frame = new Frame();
      frame.alloc();
      frame.format = AV_SAMPLE_FMT_FLTP;
      frame.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
      frame.sampleRate = 48000;
      frame.nbSamples = 1024;
      assert.equal(frame.getBuffer(), 0, 'getBuffer should succeed');
      assert.ok(frame.reportedExternalMemory > 0, 'audio buffer is reported');
      frame.unref();
      assert.equal(frame.reportedExternalMemory, 0);
    });

    it('clone reports the same amount as the source', () => {
      using src = new Frame();
      src.alloc();
      src.format = AV_PIX_FMT_YUV420P;
      src.width = 320;
      src.height = 240;
      src.getBuffer();

      const cloned = src.clone();
      assert.ok(cloned, 'clone should succeed');
      using clone = cloned;
      assert.equal(clone.reportedExternalMemory, src.reportedExternalMemory, 'clone matches source');
    });

    it('ref reports the referenced buffer, unref-before-ref keeps it balanced', () => {
      using src = new Frame();
      src.alloc();
      src.format = AV_PIX_FMT_YUV420P;
      src.width = 320;
      src.height = 240;
      src.getBuffer();

      using dst = new Frame();
      dst.alloc();
      assert.equal(dst.ref(src), 0, 'ref should succeed');
      assert.equal(dst.reportedExternalMemory, src.reportedExternalMemory, 'dst reports the referenced buffer');

      // Reusing dst correctly (unref then ref) must not accumulate.
      dst.unref();
      assert.equal(dst.reportedExternalMemory, 0);
      dst.ref(src);
      assert.equal(dst.reportedExternalMemory, src.reportedExternalMemory, 'no accumulation across re-ref');
    });

    it('stays balanced across many getBuffer/unref cycles', () => {
      using frame = new Frame();
      frame.alloc();
      for (let i = 0; i < 1000; i++) {
        // unref() resets format/width/height, so reconfigure each cycle.
        frame.format = AV_PIX_FMT_YUV420P;
        frame.width = 640;
        frame.height = 480;
        frame.getBuffer();
        assert.ok(frame.reportedExternalMemory > 0);
        frame.unref();
        assert.equal(frame.reportedExternalMemory, 0, `cycle ${i} returns to zero`);
      }
    });
  });

  describe('Packet accounting', () => {
    it('reports payload on data= and releases it on unref/free', () => {
      using packet = new Packet();
      packet.alloc();
      assert.equal(packet.reportedExternalMemory, 0, 'fresh packet reports nothing');

      packet.data = Buffer.alloc(50_000, 1);
      assert.ok(packet.reportedExternalMemory >= 50_000, 'reported covers the payload');

      packet.unref();
      assert.equal(packet.reportedExternalMemory, 0, 'unref releases the report');
    });

    it('does not accumulate when the same packet is reused (the original #392 leak shape)', () => {
      using packet = new Packet();
      packet.alloc();
      const payload = Buffer.alloc(80_000, 7);
      let firstReport = 0;
      for (let i = 0; i < 1000; i++) {
        packet.data = payload; // setter unrefs first, so no growth
        if (i === 0) firstReport = packet.reportedExternalMemory;
        assert.equal(packet.reportedExternalMemory, firstReport, `cycle ${i} stays constant`);
      }
    });

    it('clone reports the same amount as the source', () => {
      using src = new Packet();
      src.alloc();
      src.data = Buffer.alloc(12_345, 3);
      const cloned = src.clone();
      assert.ok(cloned, 'clone should succeed');
      using clone = cloned;
      assert.equal(clone.reportedExternalMemory, src.reportedExternalMemory, 'clone matches source');
    });
  });

  describe('Binding-site coverage (low-level demux + decode)', () => {
    it('reports packet payload after readFrame and frame buffers after receiveFrame', async () => {
      await using fmt = new FormatContext();
      await fmt.openInput(INPUT, null, null);
      await fmt.findStreamInfo(null);
      const vIdx = fmt.findBestStream(AVMEDIA_TYPE_VIDEO, -1, -1);
      assert.ok(vIdx >= 0, 'found a video stream');
      const stream = fmt.streams[vIdx];
      const decoder = Codec.findDecoder(stream.codecpar.codecId);
      assert.ok(decoder, 'found a decoder');

      using codecContext = new CodecContext();
      codecContext.allocContext3(decoder);
      codecContext.parametersToContext(stream.codecpar);
      await codecContext.open2(decoder, null);

      using packet = new Packet();
      packet.alloc();
      using frame = new Frame();
      frame.alloc();

      let sawReadFrameReport = false;
      let sawReceiveFrameReport = false;

      for (let i = 0; i < 200 && !(sawReadFrameReport && sawReceiveFrameReport); i++) {
        if ((await fmt.readFrame(packet)) < 0) break;
        if (packet.streamIndex !== vIdx) {
          packet.unref();
          continue;
        }
        // av_read_frame must have reported the compressed payload.
        assert.ok(packet.reportedExternalMemory > 0, 'readFrame reports packet payload');
        sawReadFrameReport = true;

        if ((await codecContext.sendPacket(packet)) < 0) {
          packet.unref();
          continue;
        }
        packet.unref();
        assert.equal(packet.reportedExternalMemory, 0, 'unref clears packet report');

        while (true) {
          const ret = await codecContext.receiveFrame(frame);
          if (ret === AVERROR_EAGAIN || ret === AVERROR_EOF || ret < 0) break;
          // avcodec_receive_frame must have reported the decoded frame buffers.
          assert.ok(frame.reportedExternalMemory > 0, 'receiveFrame reports frame buffers');
          sawReceiveFrameReport = true;
          frame.unref();
          assert.equal(frame.reportedExternalMemory, 0, 'unref clears frame report');
        }
      }

      assert.ok(sawReadFrameReport, 'exercised the readFrame reporting site');
      assert.ok(sawReceiveFrameReport, 'exercised the receiveFrame reporting site');
    });
  });
});
