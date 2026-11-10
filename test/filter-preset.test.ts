import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_HWDEVICE_TYPE_D3D11VA,
  AV_HWDEVICE_TYPE_D3D12VA,
  AV_HWDEVICE_TYPE_DXVA2,
  AV_HWDEVICE_TYPE_MEDIACODEC,
  AV_HWDEVICE_TYPE_OPENCL,
  AV_HWDEVICE_TYPE_VIDEOTOOLBOX,
  AV_PIX_FMT_YUV420P,
  AV_PIX_FMT_YUV444P,
  AV_SAMPLE_FMT_FLTP,
  AV_SAMPLE_FMT_S16,
  FilterPreset,
} from '../src/index.js';

import type { HardwareContext } from '../src/index.js';

describe('FilterPreset', () => {
  describe('chain()', () => {
    it('should create an empty filter chain', () => {
      strictEqual(FilterPreset.chain().build(), '');
    });

    it('should create a chain with custom filter', () => {
      strictEqual(FilterPreset.chain().custom('scale=640:480').build(), 'scale=640:480');
    });
  });

  // Generic, type-safe access to every FFmpeg filter.
  describe('filter()', () => {
    it('should add a filter with a single option', () => {
      strictEqual(FilterPreset.chain().filter('fps', { fps: 30 }).build(), 'fps=fps=30');
    });

    it('should add a filter with multiple options', () => {
      strictEqual(FilterPreset.chain().filter('trim', { start: 10, end: 20 }).build(), 'trim=start=10:end=20');
    });

    it('should add a filter with an enum option', () => {
      strictEqual(FilterPreset.chain().filter('fps', { fps: 30, round: 'up' }).build(), 'fps=fps=30:round=up');
    });

    it('should accept numbers for expression (string) options', () => {
      strictEqual(FilterPreset.chain().filter('volume', { volume: 0.5 }).build(), 'volume=volume=0.5');
    });

    it('should emit only the name when no options are given', () => {
      strictEqual(FilterPreset.chain().filter('negate').build(), 'negate');
    });

    it('should skip null/undefined option values', () => {
      strictEqual(FilterPreset.chain().filter('trim', { start: 0, end: undefined }).build(), 'trim=start=0');
    });

    it('should leave bare tokens and expressions unquoted', () => {
      strictEqual(FilterPreset.chain().filter('setpts', { expr: 'PTS*2' }).build(), 'setpts=expr=PTS*2');
    });

    it('should single-quote values with special characters', () => {
      strictEqual(FilterPreset.chain().filter('setpts', { expr: 'N/(FR*TB)' }).build(), "setpts=expr='N/(FR*TB)'");
    });

    it('should quote values containing spaces', () => {
      strictEqual(FilterPreset.chain().filter('drawtext', { text: 'Hello World', x: 10, y: 10 }).build(), "drawtext=text='Hello World':x=10:y=10");
    });

    it('should escape embedded single quotes FFmpeg-style', () => {
      strictEqual(FilterPreset.chain().filter('drawtext', { text: "Test's text" }).build(), "drawtext=text='Test'\\''s text'");
    });
  });

  describe('Video Filters', () => {
    describe('scale()', () => {
      it('should add scale filter with dimensions', () => {
        strictEqual(FilterPreset.chain().scale(1920, 1080).build(), 'scale=1920:1080');
      });

      it('should add scale filter with options', () => {
        strictEqual(FilterPreset.chain().scale(1920, 1080, { flags: 'bicubic' }).build(), 'scale=1920:1080:flags=bicubic');
      });

      it('should handle -1 for maintaining aspect ratio', () => {
        strictEqual(FilterPreset.chain().scale(1920, -1).build(), 'scale=1920:-1');
      });
    });

    describe('format()', () => {
      it('should add format filter with pixel format', () => {
        strictEqual(FilterPreset.chain().format(AV_PIX_FMT_YUV420P).build(), 'format=yuv420p');
      });

      it('should handle multiple pixel formats', () => {
        strictEqual(FilterPreset.chain().format([AV_PIX_FMT_YUV420P, AV_PIX_FMT_YUV444P]).build(), 'format=yuv420p,format=yuv444p');
      });
    });

    describe('crop()', () => {
      it('should add crop filter', () => {
        strictEqual(FilterPreset.chain().crop(640, 480, 100, 50).build(), 'crop=640:480:100:50');
      });

      it('should handle crop without position', () => {
        strictEqual(FilterPreset.chain().crop(640, 480).build(), 'crop=640:480:0:0');
      });
    });

    describe('pad()', () => {
      it('should add pad filter', () => {
        strictEqual(FilterPreset.chain().pad(1920, 1080, '100', '50').build(), 'pad=1920:1080:100:50:black');
      });

      it('should handle pad with color', () => {
        strictEqual(FilterPreset.chain().pad(1920, 1080, '0', '0', 'white').build(), 'pad=1920:1080:0:0:white');
      });
    });

    describe('flip()', () => {
      it('should add hflip', () => {
        strictEqual(FilterPreset.chain().flip('h').build(), 'hflip');
      });

      it('should add vflip', () => {
        strictEqual(FilterPreset.chain().flip('v').build(), 'vflip');
      });
    });

    describe('overlay()', () => {
      it('should add overlay filter', () => {
        strictEqual(FilterPreset.chain().overlay(100, 50).build(), 'overlay=x=100:y=50');
      });

      it('should handle overlay with options', () => {
        strictEqual(FilterPreset.chain().overlay(100, 50, { format: 'rgb' }).build(), 'overlay=x=100:y=50:format=rgb');
      });
    });

    describe('deinterlace()', () => {
      it('should add yadif filter', () => {
        strictEqual(FilterPreset.chain().deinterlace().build(), 'yadif');
      });

      it('should add bwdif filter', () => {
        strictEqual(FilterPreset.chain().deinterlace('bwdif').build(), 'bwdif');
      });

      it('should handle deinterlace options', () => {
        strictEqual(FilterPreset.chain().deinterlace('yadif', { mode: 1, parity: 0 }).build(), 'yadif=mode=1:parity=0');
      });
    });
  });

  describe('Audio Filters', () => {
    describe('aformat()', () => {
      it('should add aformat with sample format', () => {
        strictEqual(FilterPreset.chain().aformat(AV_SAMPLE_FMT_FLTP).build(), 'aformat=sample_fmts=fltp');
      });

      it('should add aformat with sample rate', () => {
        strictEqual(FilterPreset.chain().aformat(AV_SAMPLE_FMT_FLTP, 48000).build(), 'aformat=sample_fmts=fltp:sample_rates=48000');
      });

      it('should add aformat with channel layout', () => {
        strictEqual(FilterPreset.chain().aformat(AV_SAMPLE_FMT_FLTP, 48000, 'stereo').build(), 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo');
      });

      it('should handle multiple sample formats', () => {
        strictEqual(FilterPreset.chain().aformat([AV_SAMPLE_FMT_FLTP, AV_SAMPLE_FMT_S16]).build(), 'aformat=sample_fmts=fltp|s16');
      });
    });
  });

  describe('Complex Chains', () => {
    it('should chain dedicated methods and filter()', () => {
      const graph = FilterPreset.chain().scale(1920, 1080).format(AV_PIX_FMT_YUV420P).filter('fps', { fps: 30 }).build();
      strictEqual(graph, 'scale=1920:1080,format=yuv420p,fps=fps=30');
    });

    it('should handle mixed audio and video filters', () => {
      const graph = FilterPreset.chain().scale(1920, 1080).aformat(AV_SAMPLE_FMT_FLTP, 48000).filter('volume', { volume: 0.8 }).build();
      strictEqual(graph, 'scale=1920:1080,aformat=sample_fmts=fltp:sample_rates=48000,volume=volume=0.8');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty chain', () => {
      strictEqual(FilterPreset.chain().build(), '');
    });

    it('should handle filter with no options', () => {
      strictEqual(FilterPreset.chain().custom('simplefilter').build(), 'simplefilter');
    });
  });

  describe('supports', () => {
    // Only the device type decides which filters a chain can use
    const fakeHardware = (deviceType: number, deviceTypeName: string): HardwareContext => ({ deviceType, deviceTypeName }) as unknown as HardwareContext;

    it('should support everything in software', () => {
      strictEqual(FilterPreset.chain().supports('scale'), true);
      strictEqual(FilterPreset.chain().supports('deinterlace'), true);
    });

    it('should report hardware without a scaler', () => {
      for (const [type, name] of [
        [AV_HWDEVICE_TYPE_DXVA2, 'dxva2'],
        [AV_HWDEVICE_TYPE_MEDIACODEC, 'mediacodec'],
      ] as const) {
        const chain = FilterPreset.chain(fakeHardware(type, name));
        strictEqual(chain.supports('scale'), false);
        // the skipped operation it reports
        strictEqual(chain.scale(1280, 720).build(), '');
      }
      strictEqual(FilterPreset.chain(fakeHardware(AV_HWDEVICE_TYPE_VIDEOTOOLBOX, 'videotoolbox')).supports('scale'), true);
    });

    it('should scale with the Direct3D video processors', () => {
      const d3d11va = fakeHardware(AV_HWDEVICE_TYPE_D3D11VA, 'd3d11va');
      const d3d12va = fakeHardware(AV_HWDEVICE_TYPE_D3D12VA, 'd3d12va');
      strictEqual(FilterPreset.chain(d3d11va).supports('scale'), true);
      strictEqual(FilterPreset.chain(d3d12va).supports('scale'), true);
      // scale_d3d11 fails without an output format
      strictEqual(FilterPreset.chain(d3d11va).scale(1280, 720).build(), 'scale_d3d11=1280:720:format=nv12');
      strictEqual(FilterPreset.chain(d3d11va).scale(1280, 720, { format: 'p010' }).build(), 'scale_d3d11=1280:720:format=p010');
      strictEqual(FilterPreset.chain(d3d12va).scale(1280, 720).build(), 'scale_d3d12=1280:720');
      strictEqual(FilterPreset.chain(d3d11va).scaleFormat('nv12').build(), 'scale_d3d11=format=nv12');
      strictEqual(FilterPreset.chain(d3d12va).scaleFormat('nv12').build(), 'scale_d3d12=format=nv12');
    });

    it('should crop OpenCL frames through scale_opencl at the crop size', () => {
      // crop keeps the link size on hardware frames; without w:h scale_opencl scales the region back up
      const opencl = fakeHardware(AV_HWDEVICE_TYPE_OPENCL, 'opencl');
      strictEqual(FilterPreset.chain(opencl).crop(640, 360, 100, 50).build(), 'crop=640:360:100:50,scale_opencl=640:360');
    });
  });
});
