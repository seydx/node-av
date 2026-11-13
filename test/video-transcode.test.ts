import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_CODEC_ID_H264,
  AV_HWDEVICE_TYPE_CUDA,
  AV_HWDEVICE_TYPE_D3D11VA,
  AV_HWDEVICE_TYPE_QSV,
  AV_HWDEVICE_TYPE_VAAPI,
  AV_HWDEVICE_TYPE_VIDEOTOOLBOX,
  AV_PIX_FMT_CUDA,
  AV_PIX_FMT_D3D11,
  AV_PIX_FMT_NV12,
  AV_PIX_FMT_P010LE,
  AV_PIX_FMT_QSV,
  AV_PIX_FMT_VAAPI,
  AV_PIX_FMT_VIDEOTOOLBOX,
  AV_PIX_FMT_YUV420P,
  AV_PIX_FMT_YUV420P10LE,
  AV_PIX_FMT_YUVJ420P,
  AV_PIX_FMT_YUVJ422P,
  AV_PIX_FMT_YUYV422,
  Codec,
  FF_ENCODER_LIBX264,
  FF_HWDEVICE_TYPE_CUDA,
  FF_HWDEVICE_TYPE_D3D11VA,
  FF_HWDEVICE_TYPE_QSV,
  FF_HWDEVICE_TYPE_VAAPI,
  FF_HWDEVICE_TYPE_VIDEOTOOLBOX,
  HardwareContext,
} from '../src/index.js';
import {
  createVideoTranscodeFilter,
  describeVideoFrame,
  findDeviceFilters,
  findSoftwareEncoder,
  findUsableHardwareEncoder,
  videoTranscodeGraph,
} from '../src/api/utilities/video-transcode.js';
import { needsX264, prepareTestEnvironment, syntheticVideoFrame } from './index.js';

import type { AVHWDeviceType, AVPixelFormat, FFHWDeviceType } from '../src/index.js';
import type { DeviceFilters, VideoGraphInput } from '../src/api/utilities/video-transcode.js';

prepareTestEnvironment();

const device = (deviceType: AVHWDeviceType, deviceTypeName: FFHWDeviceType, devicePixelFormat: AVPixelFormat): HardwareContext =>
  ({ deviceType, deviceTypeName, devicePixelFormat }) as unknown as HardwareContext;
const hardwareEncoder = (...pixelFormats: AVPixelFormat[]): Codec => ({ isHardwareAcceleratedEncoder: () => true, pixelFormats }) as unknown as Codec;

const vaapi = device(AV_HWDEVICE_TYPE_VAAPI, FF_HWDEVICE_TYPE_VAAPI, AV_PIX_FMT_VAAPI);
const cuda = device(AV_HWDEVICE_TYPE_CUDA, FF_HWDEVICE_TYPE_CUDA, AV_PIX_FMT_CUDA);
const qsv = device(AV_HWDEVICE_TYPE_QSV, FF_HWDEVICE_TYPE_QSV, AV_PIX_FMT_QSV);
const videotoolbox = device(AV_HWDEVICE_TYPE_VIDEOTOOLBOX, FF_HWDEVICE_TYPE_VIDEOTOOLBOX, AV_PIX_FMT_VIDEOTOOLBOX);
const d3d11va = device(AV_HWDEVICE_TYPE_D3D11VA, FF_HWDEVICE_TYPE_D3D11VA, AV_PIX_FMT_D3D11);

const h264Vaapi = hardwareEncoder(AV_PIX_FMT_VAAPI);
const h264Nvenc = hardwareEncoder(AV_PIX_FMT_YUV420P, AV_PIX_FMT_NV12, AV_PIX_FMT_P010LE, AV_PIX_FMT_CUDA, AV_PIX_FMT_D3D11);
const h264Qsv = hardwareEncoder(AV_PIX_FMT_NV12, AV_PIX_FMT_P010LE, AV_PIX_FMT_QSV);
const h264Videotoolbox = hardwareEncoder(AV_PIX_FMT_VIDEOTOOLBOX, AV_PIX_FMT_NV12, AV_PIX_FMT_YUV420P);
const libx264 = Codec.findEncoderByName(FF_ENCODER_LIBX264)!;

const withScaler: DeviceFilters = { scaler: true, upload: true };
const scalerOnly: DeviceFilters = { scaler: true, upload: false };
const noFilters: DeviceFilters = { scaler: false, upload: false };

const onDevice = (format: AVPixelFormat): VideoGraphInput => ({ hw: true, onDevice: true, format, width: 1280, height: 720 });
const software = (format: AVPixelFormat): VideoGraphInput => ({ hw: false, onDevice: false, format, width: 1280, height: 720 });
const keep = { width: -1, height: -1 };
const half = { width: 640, height: -1 };

describe('video transcode graph', () => {
  describe('frames on the device, encoder on the device', () => {
    it('passes NV12 frames to the encoder untouched', () => {
      assert.equal(videoTranscodeGraph(onDevice(AV_PIX_FMT_NV12), { ...keep, encoder: h264Vaapi, hardware: vaapi }, withScaler), 'null');
    });

    it('converts the planar surfaces VAAPI decodes JPEG into to NV12 on the device', () => {
      assert.equal(videoTranscodeGraph(onDevice(AV_PIX_FMT_YUV420P), { ...keep, encoder: h264Vaapi, hardware: vaapi }, withScaler), 'scale_vaapi=format=nv12');
    });

    it('converts 10-bit frames to NV12 on the device, H.264 encoders take 8 bit only', () => {
      assert.equal(videoTranscodeGraph(onDevice(AV_PIX_FMT_P010LE), { ...keep, encoder: h264Nvenc, hardware: cuda }, withScaler), 'scale_cuda=format=nv12');
      assert.equal(videoTranscodeGraph(onDevice(AV_PIX_FMT_P010LE), { ...keep, encoder: h264Videotoolbox, hardware: videotoolbox }, withScaler), 'scale_vt=format=nv12');
    });

    it('scales and converts in one pass on the device', () => {
      assert.equal(videoTranscodeGraph(onDevice(AV_PIX_FMT_YUV420P), { ...half, encoder: h264Vaapi, hardware: vaapi }, withScaler), 'scale_vaapi=640:360:format=nv12');
      assert.equal(videoTranscodeGraph(onDevice(AV_PIX_FMT_NV12), { ...half, encoder: h264Qsv, hardware: qsv }, withScaler), 'vpp_qsv=w=640:h=360:format=nv12');
    });

    it('drops frames for a lower frame rate before anything else', () => {
      assert.equal(
        videoTranscodeGraph(onDevice(AV_PIX_FMT_YUV420P), { ...half, fps: 10, encoder: h264Vaapi, hardware: vaapi }, withScaler),
        'fps=10,scale_vaapi=640:360:format=nv12',
      );
    });

    it('downloads frames of a device without a scaler only when they need converting', () => {
      assert.equal(videoTranscodeGraph(onDevice(AV_PIX_FMT_NV12), { ...keep, encoder: h264Nvenc, hardware: d3d11va }, noFilters), 'null');
      assert.equal(
        videoTranscodeGraph(onDevice(AV_PIX_FMT_P010LE), { ...keep, encoder: h264Nvenc, hardware: d3d11va }, noFilters),
        'hwdownload,format=p010le,format=nv12',
      );
      assert.equal(
        videoTranscodeGraph(onDevice(AV_PIX_FMT_NV12), { ...half, encoder: h264Nvenc, hardware: d3d11va }, noFilters),
        'hwdownload,format=nv12,scale=640:360,format=nv12',
      );
    });
  });

  describe('frames on the device, encoder in software', needsX264, () => {
    it('scales on the device and downloads NV12', () => {
      assert.equal(videoTranscodeGraph(onDevice(AV_PIX_FMT_NV12), { ...keep, encoder: libx264, hardware: vaapi }, withScaler), 'hwdownload,format=nv12');
      assert.equal(
        videoTranscodeGraph(onDevice(AV_PIX_FMT_YUV420P), { ...half, encoder: libx264, hardware: vaapi }, withScaler),
        'scale_vaapi=640:360:format=nv12,hwdownload,format=nv12',
      );
    });

    it('scales with the Direct3D 11 video processor before downloading', () => {
      assert.equal(
        videoTranscodeGraph(onDevice(AV_PIX_FMT_P010LE), { ...half, encoder: libx264, hardware: d3d11va }, scalerOnly),
        'scale_d3d11=640:360:format=nv12,hwdownload,format=nv12',
      );
      assert.equal(videoTranscodeGraph(onDevice(AV_PIX_FMT_P010LE), { ...keep, encoder: h264Nvenc, hardware: d3d11va }, scalerOnly), 'scale_d3d11=format=nv12');
    });

    it('downloads first on a device without a scaler', () => {
      assert.equal(
        videoTranscodeGraph(onDevice(AV_PIX_FMT_P010LE), { ...half, encoder: libx264, hardware: d3d11va }, noFilters),
        'hwdownload,format=p010le,scale=640:360,format=yuv420p',
      );
    });
  });

  describe('frames in software, encoder on the device', () => {
    it('uploads to an encoder that takes device frames only', () => {
      assert.equal(videoTranscodeGraph(software(AV_PIX_FMT_YUVJ422P), { ...keep, encoder: h264Vaapi, hardware: vaapi }, withScaler), 'format=nv12,hwupload');
      assert.equal(
        videoTranscodeGraph(software(AV_PIX_FMT_YUVJ420P), { ...half, encoder: h264Vaapi, hardware: vaapi }, withScaler),
        'format=nv12,hwupload,scale_vaapi=640:360:format=nv12',
      );
    });

    it('converts the JPEG formats hardware encoders reject, NVDEC falls back to them for 4:2:2', () => {
      assert.equal(videoTranscodeGraph(software(AV_PIX_FMT_YUVJ422P), { ...keep, encoder: h264Nvenc, hardware: cuda }, withScaler), 'format=nv12');
      assert.equal(videoTranscodeGraph(software(AV_PIX_FMT_YUVJ420P), { ...keep, encoder: h264Videotoolbox, hardware: videotoolbox }, withScaler), 'format=nv12');
      assert.equal(videoTranscodeGraph(software(AV_PIX_FMT_YUV420P), { ...keep, encoder: h264Videotoolbox, hardware: videotoolbox }, withScaler), 'null');
    });

    it('uploads before scaling where the device scales, on the CPU elsewhere', () => {
      assert.equal(
        videoTranscodeGraph(software(AV_PIX_FMT_YUVJ420P), { ...half, encoder: h264Nvenc, hardware: cuda }, withScaler),
        'format=nv12,hwupload_cuda,scale_cuda=640:360:format=nv12',
      );
      assert.equal(videoTranscodeGraph(software(AV_PIX_FMT_YUVJ420P), { ...half, encoder: h264Qsv, hardware: qsv }, scalerOnly), 'scale=640:360,format=nv12');
    });
  });

  describe('frames in software, encoder in software', needsX264, () => {
    it('passes 8-bit 4:2:0 the encoder lists untouched', () => {
      assert.equal(videoTranscodeGraph(software(AV_PIX_FMT_YUVJ420P), { ...keep, encoder: libx264 }, noFilters), 'null');
      assert.equal(videoTranscodeGraph(software(AV_PIX_FMT_YUV420P), { ...keep, encoder: libx264 }, noFilters), 'null');
    });

    it('converts 4:2:2 and 10 bit to yuv420p, x264 would encode profiles browsers cannot play', () => {
      assert.equal(videoTranscodeGraph(software(AV_PIX_FMT_YUVJ422P), { ...keep, encoder: libx264 }, noFilters), 'format=yuv420p');
      assert.equal(videoTranscodeGraph(software(AV_PIX_FMT_YUV420P10LE), { ...keep, encoder: libx264 }, noFilters), 'format=yuv420p');
    });

    it('pins scaled output to yuv420p, swscale cannot scale packed yuyv422 in place', () => {
      assert.equal(videoTranscodeGraph(software(AV_PIX_FMT_YUYV422), { width: 160, height: 120, encoder: libx264 }, noFilters), 'scale=160:120,format=yuv420p');
    });

    it('derives the other side even, keeping the aspect ratio', () => {
      const input = { ...software(AV_PIX_FMT_YUV420P), width: 1280, height: 720 };
      assert.equal(videoTranscodeGraph(input, { width: -1, height: 240, encoder: libx264 }, noFilters), 'scale=426:240,format=yuv420p');
    });

    it('downloads frames of another device first', () => {
      const foreign = { ...onDevice(AV_PIX_FMT_NV12), onDevice: false };
      assert.equal(videoTranscodeGraph(foreign, { ...keep, encoder: libx264 }, noFilters), 'hwdownload,format=nv12');
    });
  });

  describe('describeVideoFrame', () => {
    it('describes a software frame', () => {
      using frame = syntheticVideoFrame(0, 320, 240);
      assert.deepEqual(describeVideoFrame(frame, vaapi), { hw: false, onDevice: false, format: AV_PIX_FMT_YUV420P, width: 320, height: 240 });
    });
  });

  describe('createVideoTranscodeFilter', () => {
    it('converts in software when the device filters fail', async () => {
      // the fake device has no CUDA behind it, so uploading and scaling there fails to configure
      using filter = createVideoTranscodeFilter({ ...half, width: 160, encoder: h264Nvenc, hardware: cuda }, withScaler);
      using input = syntheticVideoFrame(0, 320, 240);
      const outputs = await filter.processAll(input);
      assert.deepEqual(
        outputs.map((output) => [output.format, `${output.width}x${output.height}`]),
        [[AV_PIX_FMT_NV12, '160x120']],
      );
      outputs.forEach((output) => output.free());
      assert.match(filter.getGraphDescription() ?? '', /scale/);
    });
  });

  describe('findDeviceFilters', () => {
    it('has no filters without a device', () => {
      assert.deepEqual(findDeviceFilters(null), noFilters);
    });
  });

  describe('findSoftwareEncoder', needsX264, () => {
    // Linux arm64 builds register h264_rkmpp ahead of libx264
    it('passes over hardware encoders registered first', () => {
      assert.equal(findSoftwareEncoder(AV_CODEC_ID_H264)?.name, FF_ENCODER_LIBX264);
    });
  });

  describe('findUsableHardwareEncoder', () => {
    it('finds nothing without a device', async () => {
      assert.equal(await findUsableHardwareEncoder(null, 'h264'), null);
    });

    const hardware = HardwareContext.auto();
    it('answers the same after testing the encoder once', { skip: hardware ? false : 'no hardware' }, async () => {
      try {
        const first = await findUsableHardwareEncoder(hardware, 'h264');
        assert.ok(first === null || first.isHardwareAcceleratedEncoder());
        assert.equal((await findUsableHardwareEncoder(hardware, 'h264'))?.name, first?.name);
      } finally {
        hardware?.dispose();
      }
    });
  });
});
