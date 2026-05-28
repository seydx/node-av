import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_CODEC_ID_AAC,
  AV_CODEC_ID_AC3,
  AV_CODEC_ID_AV1,
  AV_CODEC_ID_FLAC,
  AV_CODEC_ID_H264,
  AV_CODEC_ID_HEVC,
  AV_CODEC_ID_MJPEG,
  AV_CODEC_ID_MP3,
  AV_CODEC_ID_MPEG4,
  AV_CODEC_ID_OPUS,
  AV_CODEC_ID_PCM_S16LE,
  AV_CODEC_ID_PNG,
  AV_CODEC_ID_VORBIS,
  AV_CODEC_ID_VP8,
  AV_CODEC_ID_VP9,
  AV_HWDEVICE_TYPE_CUDA,
  AV_HWDEVICE_TYPE_D3D11VA,
  AV_HWDEVICE_TYPE_DXVA2,
  AV_HWDEVICE_TYPE_QSV,
  AV_HWDEVICE_TYPE_VAAPI,
  AV_HWDEVICE_TYPE_VIDEOTOOLBOX,
  AVMEDIA_TYPE_AUDIO,
  AVMEDIA_TYPE_VIDEO,
  Codec,
  FF_DECODER_AAC,
  FF_DECODER_H264,
  FF_DECODER_H264_CUVID,
  FF_DECODER_H264_QSV,
  FF_DECODER_HEVC_CUVID,
  FF_DECODER_HEVC_QSV,
  FF_ENCODER_H264_NVENC,
  FF_ENCODER_H264_QSV,
  FF_ENCODER_H264_VAAPI,
  FF_ENCODER_H264_VIDEOTOOLBOX,
  FF_ENCODER_HEVC_NVENC,
  FF_ENCODER_HEVC_VIDEOTOOLBOX,
  FF_ENCODER_LIBX264,
  type AVHWDeviceType,
  type FFDecoderCodec,
  type FFEncoderCodec,
} from '../src/index.js';

describe('Codec', () => {
  describe('Find Decoders', () => {
    it('should find H.264 decoder by ID', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);
      assert.ok(decoder.isDecoder());
      assert.equal(decoder.id, AV_CODEC_ID_H264);
      assert.equal(decoder.type, AVMEDIA_TYPE_VIDEO);
      assert.ok(decoder.name);
      assert.ok(decoder.longName);
    });

    it('should find AAC decoder by ID', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_AAC);
      assert.ok(decoder);
      assert.ok(decoder.isDecoder());
      assert.equal(decoder.id, AV_CODEC_ID_AAC);
      assert.equal(decoder.type, AVMEDIA_TYPE_AUDIO);
    });

    it('should find decoder by name', () => {
      const decoder = Codec.findDecoderByName(FF_DECODER_H264);
      assert.ok(decoder);
      assert.ok(decoder.isDecoder());
      assert.equal(decoder.name, FF_DECODER_H264);
      assert.equal(decoder.type, AVMEDIA_TYPE_VIDEO);
    });

    it('should find AAC decoder by name', () => {
      const decoder = Codec.findDecoderByName(FF_DECODER_AAC);
      assert.ok(decoder);
      assert.ok(decoder.isDecoder());
      assert.equal(decoder.name, 'aac');
      assert.equal(decoder.type, AVMEDIA_TYPE_AUDIO);
    });

    it('should return null for non-existent decoder ID', () => {
      // Use an extremely high ID that's unlikely to exist
      const decoder = Codec.findDecoder(999999 as any);
      assert.equal(decoder, null);
    });

    it('should return null for non-existent decoder name', () => {
      const decoder = Codec.findDecoderByName('nonexistent_codec_xyz' as any);
      assert.equal(decoder, null);
    });

    it('should find common video decoders', () => {
      const codecIds = [
        AV_CODEC_ID_H264,
        AV_CODEC_ID_HEVC, // H.265
        AV_CODEC_ID_VP8,
        AV_CODEC_ID_VP9,
        AV_CODEC_ID_AV1,
        AV_CODEC_ID_MPEG4,
        AV_CODEC_ID_MJPEG,
      ];

      for (const id of codecIds) {
        const decoder = Codec.findDecoder(id);
        assert.ok(decoder, `Decoder for codec ID ${id} should exist`);
        assert.ok(decoder.isDecoder());
        assert.equal(decoder.type, AVMEDIA_TYPE_VIDEO);
      }
    });

    it('should find common audio decoders', () => {
      const codecIds = [AV_CODEC_ID_AAC, AV_CODEC_ID_MP3, AV_CODEC_ID_OPUS, AV_CODEC_ID_VORBIS, AV_CODEC_ID_FLAC, AV_CODEC_ID_AC3, AV_CODEC_ID_PCM_S16LE];

      for (const id of codecIds) {
        const decoder = Codec.findDecoder(id);
        assert.ok(decoder, `Decoder for codec ID ${id} should exist`);
        assert.ok(decoder.isDecoder());
        assert.equal(decoder.type, AVMEDIA_TYPE_AUDIO);
      }
    });
  });

  describe('Find Encoders', () => {
    it('should find H.264 encoder by ID', () => {
      const encoder = Codec.findEncoder(AV_CODEC_ID_H264);
      // H.264 encoder might not be available in all builds
      if (encoder) {
        assert.ok(encoder.isEncoder());
        assert.equal(encoder.id, AV_CODEC_ID_H264);
        assert.equal(encoder.type, AVMEDIA_TYPE_VIDEO);
      }
    });

    it('should find encoder by name', () => {
      // Try to find libx264 encoder (common software encoder)
      const encoder = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      // libx264 might not be available in all builds
      if (encoder) {
        assert.ok(encoder.isEncoder());
        assert.equal(encoder.name, FF_ENCODER_LIBX264);
        assert.equal(encoder.type, AVMEDIA_TYPE_VIDEO);
      } else {
        // Try fallback to any h264 encoder
        const fallback = Codec.findEncoder(AV_CODEC_ID_H264);
        // Skip test if no H.264 encoder is available
        if (!fallback) {
          return;
        }
      }
    });

    it('should find AAC encoder by ID', () => {
      const encoder = Codec.findEncoder(AV_CODEC_ID_AAC);
      if (encoder) {
        assert.ok(encoder.isEncoder());
        assert.equal(encoder.id, AV_CODEC_ID_AAC);
        assert.equal(encoder.type, AVMEDIA_TYPE_AUDIO);
      }
    });

    it('should return null for non-existent encoder', () => {
      const encoder = Codec.findEncoderByName('nonexistent_encoder_xyz' as any);
      assert.equal(encoder, null);
    });

    it('should find PNG encoder', () => {
      const encoder = Codec.findEncoder(AV_CODEC_ID_PNG);
      assert.ok(encoder);
      assert.ok(encoder.isEncoder());
      assert.equal(encoder.id, AV_CODEC_ID_PNG);
      assert.equal(encoder.type, AVMEDIA_TYPE_VIDEO);
    });

    it('should find PCM encoder', () => {
      const encoder = Codec.findEncoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(encoder);
      assert.ok(encoder.isEncoder());
      assert.equal(encoder.id, AV_CODEC_ID_PCM_S16LE);
      assert.equal(encoder.type, AVMEDIA_TYPE_AUDIO);
    });
  });

  describe('Codec Properties', () => {
    it('should have correct properties for H.264 decoder', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);

      // Basic properties
      assert.equal(decoder.name, FF_DECODER_H264);
      assert.ok(decoder.longName);
      assert.ok(decoder.longName.includes('H.264') || decoder.longName.includes('AVC'));
      assert.equal(decoder.type, AVMEDIA_TYPE_VIDEO);
      assert.equal(decoder.id, AV_CODEC_ID_H264);

      // Capabilities
      assert.ok(typeof decoder.capabilities === 'number');

      // Check if decoder, not encoder
      assert.ok(decoder.isDecoder());
      assert.ok(!decoder.isEncoder());
    });

    it('should have correct properties for AAC decoder', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_AAC);
      assert.ok(decoder);

      assert.equal(decoder.name, 'aac');
      assert.ok(decoder.longName);
      assert.equal(decoder.type, AVMEDIA_TYPE_AUDIO);
      assert.equal(decoder.id, AV_CODEC_ID_AAC);

      assert.ok(decoder.isDecoder());
      assert.ok(!decoder.isEncoder());
    });

    it('should have max lowres property', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);
      assert.ok(typeof decoder.maxLowres === 'number');
      assert.ok(decoder.maxLowres >= 0);
    });

    it('should check experimental flag', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);
      // H.264 decoder should not be experimental
      assert.ok(!decoder.isExperimental());
    });

    it('should check for single capability using hasCapabilities', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);

      const caps = decoder.capabilities;
      assert.ok(typeof caps === 'number');

      // Test hasCapabilities with an actual capability
      if (caps !== 0) {
        // Find first capability bit that is set
        for (let i = 0; i < 32; i++) {
          const testCap = (1 << i) as any;
          if ((caps & testCap) === testCap) {
            assert.equal(decoder.hasCapabilities(testCap), true);
            break;
          }
        }
      }
    });

    it('should check for multiple capabilities using hasCapabilities', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);

      const caps = decoder.capabilities;

      // Find two capability bits that are set
      const foundCaps: any[] = [];
      for (let i = 0; i < 32 && foundCaps.length < 2; i++) {
        const testCap = (1 << i) as any;
        if ((caps & testCap) === testCap) {
          foundCaps.push(testCap);
        }
      }

      // If we found at least 2 capabilities, test with both
      if (foundCaps.length >= 2) {
        assert.equal(decoder.hasCapabilities(foundCaps[0], foundCaps[1]), true);
      }
    });

    it('should return false when capability is not set', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);

      const caps = decoder.capabilities;

      // Find a capability bit that is NOT set
      for (let i = 0; i < 32; i++) {
        const testCap = (1 << i) as any;
        if ((caps & testCap) !== testCap) {
          assert.equal(decoder.hasCapabilities(testCap), false);
          break;
        }
      }
    });

    it('should have wrapper property', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);
      // wrapper can be null or a string
      const wrapper = decoder.wrapper;
      assert.ok(wrapper === null || typeof wrapper === 'string');
    });
  });

  describe('Codec Formats and Profiles', () => {
    it('should have pixel formats for video decoder', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);

      const pixelFormats = decoder.pixelFormats;
      // H.264 decoder should support pixel formats
      if (pixelFormats) {
        assert.ok(Array.isArray(pixelFormats));
        assert.ok(pixelFormats.length > 0);
        // Should be numbers (AVPixelFormat enum values)
        assert.ok(pixelFormats.every((fmt) => typeof fmt === 'number'));
      }
    });

    it('should have sample formats for audio decoder', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_AAC);
      assert.ok(decoder);

      const sampleFormats = decoder.sampleFormats;
      if (sampleFormats) {
        assert.ok(Array.isArray(sampleFormats));
        assert.ok(sampleFormats.length > 0);
        // Should be numbers (AVSampleFormat enum values)
        assert.ok(sampleFormats.every((fmt) => typeof fmt === 'number'));
      }
    });

    it('should have supported sample rates for audio codec', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_AAC);
      assert.ok(decoder);

      const sampleRates = decoder.supportedSamplerates;
      // AAC typically supports specific sample rates
      if (sampleRates) {
        assert.ok(Array.isArray(sampleRates));
        assert.ok(sampleRates.length > 0);
        // Common sample rates
        assert.ok(sampleRates.every((rate) => typeof rate === 'number' && rate > 0));
      }
    });

    it('should have channel layouts for audio codec', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_AAC);
      assert.ok(decoder);

      const channelLayouts = decoder.channelLayouts;
      if (channelLayouts) {
        assert.ok(Array.isArray(channelLayouts));
        // Channel layouts are complex objects
      }
    });

    it('should have profiles for H.264', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);

      const profiles = decoder.profiles;
      // H.264 has profiles like Baseline, Main, High
      if (profiles) {
        assert.ok(Array.isArray(profiles));
        assert.ok(profiles.length > 0);
        // Each profile should have profile and name properties
        profiles.forEach((p) => {
          assert.ok(typeof p.profile === 'number');
          assert.ok(typeof p.name === 'string');
        });
      }
    });

    it('should get hardware configurations', () => {
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);

      // Try to get first hardware config
      const hwConfig = decoder.getHwConfig(0);

      // hwConfig might be null if no hardware acceleration available
      if (hwConfig) {
        assert.ok(typeof hwConfig === 'object');
        assert.ok('pixFmt' in hwConfig);
        assert.ok('methods' in hwConfig);
        assert.ok('deviceType' in hwConfig);
        assert.ok(typeof hwConfig.pixFmt === 'number');
        assert.ok(typeof hwConfig.methods === 'number');
        assert.ok(typeof hwConfig.deviceType === 'number');
      } else {
        // It's ok to have no hardware config
        assert.equal(hwConfig, null);
      }
    });

    it('should have supported framerates for some codecs', () => {
      // MPEG-2 typically has specific supported framerates
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);

      const framerates = decoder.supportedFramerates;
      // Can be null (any framerate) or array of Rationals
      if (framerates) {
        assert.ok(Array.isArray(framerates));
        framerates.forEach((rate) => {
          assert.ok(typeof rate.num === 'number');
          assert.ok(typeof rate.den === 'number');
          assert.ok(rate.den !== 0);
        });
      }
    });
  });

  describe('Codec List and Iteration', () => {
    it('should get codec list', () => {
      const codecs = Codec.getCodecList();
      assert.ok(Array.isArray(codecs));
      assert.ok(codecs.length > 0);

      // Should have both encoders and decoders
      const encoders = codecs.filter((c) => c.isEncoder());
      const decoders = codecs.filter((c) => c.isDecoder());
      assert.ok(encoders.length > 0);
      assert.ok(decoders.length > 0);

      // Should have both audio and video codecs
      const videoCodecs = codecs.filter((c) => c.type === AVMEDIA_TYPE_VIDEO);
      const audioCodecs = codecs.filter((c) => c.type === AVMEDIA_TYPE_AUDIO);
      assert.ok(videoCodecs.length > 0);
      assert.ok(audioCodecs.length > 0);
    });

    it('should iterate through codecs', () => {
      const codecs: Codec[] = [];
      let opaque: bigint | null = null;
      let count = 0;
      const maxIterations = 1000; // Safety limit

      while (count < maxIterations) {
        const result = Codec.iterateCodecs(opaque);
        if (!result) break;

        codecs.push(result.codec);
        opaque = result.opaque;
        count++;

        // Verify codec has required properties
        assert.ok(result.codec.name);
        assert.ok(typeof result.codec.type === 'number');
        assert.ok(typeof result.codec.id === 'number');
      }

      assert.ok(codecs.length > 0);
      assert.ok(codecs.length < maxIterations, 'Iteration should terminate');

      // Should find common codecs
      const h264 = codecs.find((c) => c.name === FF_DECODER_H264 && c.isDecoder());
      assert.ok(h264, 'Should find H.264 decoder through iteration');
    });

    it('should match getCodecList with iteration', () => {
      // Get all codecs via list
      const listCodecs = Codec.getCodecList();

      // Get all codecs via iteration
      const iterCodecs: Codec[] = [];
      let opaque: bigint | null = null;

      while (true) {
        const result = Codec.iterateCodecs(opaque);
        if (!result) break;
        iterCodecs.push(result.codec);
        opaque = result.opaque;
      }

      // Should have same number of codecs
      assert.equal(iterCodecs.length, listCodecs.length);

      // Both should find same common codecs
      const listH264 = listCodecs.find((c) => c.name === FF_DECODER_H264 && c.isDecoder());
      const iterH264 = iterCodecs.find((c) => c.name === FF_DECODER_H264 && c.isDecoder());
      assert.ok(listH264);
      assert.ok(iterH264);
      assert.equal(listH264.id, iterH264.id);
    });
  });

  describe('Codec Options (getOptions)', () => {
    it('should return private options for an encoder', () => {
      const libx264 = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      assert.ok(libx264);

      const options = libx264.getOptions();
      assert.ok(Array.isArray(options));
      assert.ok(options.length > 0);

      // libx264 exposes the well-known 'preset' option
      const preset = options.find((o) => o.name === 'preset');
      assert.ok(preset, "libx264 should expose a 'preset' option");
    });

    it('should expose valid metadata for each option', () => {
      const mjpeg = Codec.findEncoder(AV_CODEC_ID_MJPEG);
      assert.ok(mjpeg);

      const options = mjpeg.getOptions();
      assert.ok(options.length > 0);

      for (const opt of options) {
        assert.equal(typeof opt.name, 'string');
        assert.ok(opt.name.length > 0);
        assert.equal(typeof opt.type, 'number'); // AVOptionType
        assert.equal(typeof opt.flags, 'number');
        assert.equal(typeof opt.min, 'number');
        assert.equal(typeof opt.max, 'number');
        assert.ok(opt.help === null || typeof opt.help === 'string');
        assert.ok(opt.unit === null || typeof opt.unit === 'string');
      }
    });

    it('should return an empty array for codecs without private options', () => {
      const pcm = Codec.findEncoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(pcm);

      const options = pcm.getOptions();
      assert.ok(Array.isArray(options));
      assert.equal(options.length, 0);
    });
  });

  describe('Encoder vs Decoder', () => {
    it('should distinguish between encoder and decoder', () => {
      // Find H.264 decoder
      const decoder = Codec.findDecoder(AV_CODEC_ID_H264);
      assert.ok(decoder);
      assert.ok(decoder.isDecoder());
      assert.ok(!decoder.isEncoder());

      // Find any H.264 encoder if available
      const encoder = Codec.findEncoder(AV_CODEC_ID_H264);
      if (encoder) {
        assert.ok(encoder.isEncoder());
        assert.ok(!encoder.isDecoder());
        // Both should have same codec ID but different names
        assert.equal(encoder.id, decoder.id);
      }
    });

    it('should find different implementations of same codec', () => {
      // Try to find different H.264 decoder implementations
      const h264 = Codec.findDecoderByName(FF_DECODER_H264);
      const h264_cuvid = Codec.findDecoderByName(FF_DECODER_H264_CUVID);

      if (h264) {
        assert.equal(h264.name, FF_DECODER_H264);
        assert.ok(h264.isDecoder());
      }

      // h264_cuvid is NVIDIA hardware decoder, might not be available
      if (h264_cuvid) {
        assert.equal(h264_cuvid.name, FF_DECODER_H264_CUVID);
        assert.ok(h264_cuvid.isDecoder());
        // Both decode H.264
        assert.equal(h264_cuvid.id, AV_CODEC_ID_H264);
      }
    });
  });

  describe('Hardware Detection', () => {
    it('should detect hardware acceleration with hasHardwareAcceleration()', () => {
      // Test pure software codec
      const libx264 = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      if (libx264) {
        assert.strictEqual(libx264.hasHardwareAcceleration(), false, 'libx264 software encoder should not have hardware acceleration');
      }

      // Test generic decoder with hardware support (on macOS)
      const h264 = Codec.findDecoderByName(FF_DECODER_H264);
      if (h264) {
        const hasHw = h264.hasHardwareAcceleration();
        assert.ok(typeof hasHw === 'boolean');
      }

      const h264VTEnc = Codec.findEncoderByName(FF_ENCODER_H264_VIDEOTOOLBOX);
      if (h264VTEnc) {
        assert.strictEqual(h264VTEnc.hasHardwareAcceleration(), true, 'h264_videotoolbox encoder should have hardware acceleration');
      }

      // Test other hardware codecs if available
      const hwDecoders: FFDecoderCodec[] = [FF_DECODER_H264_CUVID, FF_DECODER_H264_QSV, FF_DECODER_HEVC_CUVID, FF_DECODER_HEVC_QSV];

      const hwEncoders: FFEncoderCodec[] = [
        FF_ENCODER_H264_NVENC,
        FF_ENCODER_H264_QSV,
        FF_ENCODER_H264_VAAPI,
        FF_ENCODER_H264_VIDEOTOOLBOX,
        FF_ENCODER_HEVC_NVENC,
        FF_ENCODER_HEVC_VIDEOTOOLBOX,
      ];

      for (const name of hwDecoders) {
        const codec = Codec.findDecoderByName(name);
        if (codec) {
          assert.strictEqual(codec.hasHardwareAcceleration(), true, `${name} should have hardware acceleration`);
        }
      }

      for (const name of hwEncoders) {
        const codec = Codec.findEncoderByName(name);
        if (codec) {
          assert.strictEqual(codec.hasHardwareAcceleration(), true, `${name} should have hardware acceleration`);
        }
      }
    });

    it('should check device type support with supportsDevice()', () => {
      // Test VideoToolbox encoder
      const h264VTEnc = Codec.findEncoderByName(FF_ENCODER_H264_VIDEOTOOLBOX);
      if (h264VTEnc) {
        // VideoToolbox should support VIDEOTOOLBOX device type
        assert.strictEqual(h264VTEnc.supportsDevice(AV_HWDEVICE_TYPE_VIDEOTOOLBOX), true, 'h264_videotoolbox encoder should support VIDEOTOOLBOX device');

        // Should not support other device types
        assert.strictEqual(h264VTEnc.supportsDevice(AV_HWDEVICE_TYPE_CUDA), false, 'h264_videotoolbox encoder should not support CUDA device');
      }

      // Test CUDA codec if available
      const h264Cuvid = Codec.findDecoderByName(FF_DECODER_H264_CUVID);
      if (h264Cuvid) {
        assert.strictEqual(h264Cuvid.supportsDevice(AV_HWDEVICE_TYPE_CUDA), true, 'h264_cuvid should support CUDA device');
        assert.strictEqual(h264Cuvid.supportsDevice(AV_HWDEVICE_TYPE_VIDEOTOOLBOX), false, 'h264_cuvid should not support VIDEOTOOLBOX device');
      }

      // Generic h264 decoder may support hardware on some platforms
      const h264 = Codec.findDecoderByName(FF_DECODER_H264);
      if (h264) {
        const supportsVT = h264.supportsDevice(AV_HWDEVICE_TYPE_VIDEOTOOLBOX);
        assert.ok(typeof supportsVT === 'boolean');
      }

      // Pure software codec should not support any hardware device
      const libx264 = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      if (libx264) {
        const deviceTypes = [AV_HWDEVICE_TYPE_CUDA, AV_HWDEVICE_TYPE_VIDEOTOOLBOX, AV_HWDEVICE_TYPE_VAAPI, AV_HWDEVICE_TYPE_QSV];

        for (const deviceType of deviceTypes) {
          assert.strictEqual(libx264.supportsDevice(deviceType), false, `libx264 should not support hardware device type ${deviceType}`);
        }
      }
    });

    it('should identify hardware-accelerated decoders with isHardwareAcceleratedDecoder()', () => {
      // Generic h264 decoder may have hardware acceleration
      const h264 = Codec.findDecoderByName(FF_DECODER_H264);
      if (h264) {
        const isHwAccelerated = h264.isHardwareAcceleratedDecoder();
        assert.ok(typeof isHwAccelerated === 'boolean');
      }

      // Software encoder should return false
      const libx264 = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      if (libx264) {
        assert.strictEqual(libx264.isHardwareAcceleratedDecoder(), false, 'Encoder should not be hardware decoder');
      }

      // Test QSV decoder (exists as both decoder and encoder)
      const h264QSV = Codec.findDecoderByName(FF_DECODER_H264_QSV);
      if (h264QSV) {
        assert.strictEqual(h264QSV.isHardwareAcceleratedDecoder(), true, 'h264_qsv should be hardware-accelerated decoder');
        assert.strictEqual(h264QSV.isHardwareAcceleratedDecoder(AV_HWDEVICE_TYPE_QSV), true, 'h264_qsv should support QSV');
        assert.strictEqual(h264QSV.isHardwareAcceleratedDecoder(AV_HWDEVICE_TYPE_CUDA), false, 'h264_qsv should not support CUDA');
      }

      // Test various hardware decoders
      const hwDecoders: { name: FFDecoderCodec; device: AVHWDeviceType }[] = [
        { name: FF_DECODER_H264_CUVID, device: AV_HWDEVICE_TYPE_CUDA },
        { name: FF_DECODER_HEVC_CUVID, device: AV_HWDEVICE_TYPE_CUDA },
        { name: FF_DECODER_H264_QSV, device: AV_HWDEVICE_TYPE_QSV },
        { name: FF_DECODER_HEVC_QSV, device: AV_HWDEVICE_TYPE_QSV },
      ];

      for (const { name, device } of hwDecoders) {
        const codec = Codec.findDecoderByName(name);
        if (codec) {
          assert.strictEqual(codec.isHardwareAcceleratedDecoder(), true, `${name} should be hardware-accelerated decoder`);
          assert.strictEqual(codec.isHardwareAcceleratedDecoder(device), true, `${name} should support its device type`);
        }
      }
    });

    it('should identify hardware-accelerated encoders with isHardwareAcceleratedEncoder()', () => {
      // Software encoder
      const libx264 = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      if (libx264) {
        assert.strictEqual(libx264.isHardwareAcceleratedEncoder(), false, 'libx264 should not be hardware-accelerated encoder');
        assert.strictEqual(libx264.isHardwareAcceleratedEncoder(AV_HWDEVICE_TYPE_VIDEOTOOLBOX), false, 'libx264 should not support any device type');
      }

      // Decoder should return false
      const h264 = Codec.findDecoderByName(FF_DECODER_H264);
      if (h264) {
        assert.strictEqual(h264.isHardwareAcceleratedEncoder(), false, 'Decoder should not be encoder');
      }

      // Hardware encoder
      const h264VTEnc = Codec.findEncoderByName(FF_ENCODER_H264_VIDEOTOOLBOX);
      if (h264VTEnc) {
        assert.strictEqual(h264VTEnc.isHardwareAcceleratedEncoder(), true, 'h264_videotoolbox should be hardware-accelerated encoder');
        assert.strictEqual(h264VTEnc.isHardwareAcceleratedEncoder(AV_HWDEVICE_TYPE_VIDEOTOOLBOX), true, 'h264_videotoolbox should support VIDEOTOOLBOX');
        assert.strictEqual(h264VTEnc.isHardwareAcceleratedEncoder(AV_HWDEVICE_TYPE_CUDA), false, 'h264_videotoolbox should not support CUDA');
      }

      // Test various hardware encoders
      const hwEncoders: { name: FFEncoderCodec; device: AVHWDeviceType }[] = [
        { name: FF_ENCODER_H264_NVENC, device: AV_HWDEVICE_TYPE_CUDA },
        { name: FF_ENCODER_HEVC_NVENC, device: AV_HWDEVICE_TYPE_CUDA },
        { name: FF_ENCODER_H264_QSV, device: AV_HWDEVICE_TYPE_QSV },
        { name: FF_ENCODER_H264_VAAPI, device: AV_HWDEVICE_TYPE_VAAPI },
        { name: FF_ENCODER_HEVC_VIDEOTOOLBOX, device: AV_HWDEVICE_TYPE_VIDEOTOOLBOX },
      ];

      for (const { name, device } of hwEncoders) {
        const codec = Codec.findEncoderByName(name);
        if (codec) {
          assert.strictEqual(codec.isHardwareAcceleratedEncoder(), true, `${name} should be hardware-accelerated encoder`);
          assert.strictEqual(codec.isHardwareAcceleratedEncoder(device), true, `${name} should support its device type`);
        }
      }
    });

    it('should have consistent hardware detection methods', () => {
      // Test that hardware detection methods are consistent with each other
      const codecs = Codec.getCodecList();

      for (const codec of codecs.slice(0, 100)) {
        // Test first 100 to avoid timeout
        const hasHwAccel = codec.hasHardwareAcceleration();
        const isHwDec = codec.isHardwareAcceleratedDecoder();
        const isHwEnc = codec.isHardwareAcceleratedEncoder();

        // If it's a hardware-accelerated decoder or encoder, hasHardwareAcceleration should be true
        if (isHwDec || isHwEnc) {
          assert.strictEqual(hasHwAccel, true, `${codec.name}: If hardware-accelerated decoder/encoder, should have hardware acceleration`);
        }

        // Can't be both decoder and encoder
        assert.ok(!(isHwDec && isHwEnc), `${codec.name}: Cannot be both decoder and encoder`);

        // If it supports any hardware device, it should have hardware acceleration
        const deviceTypes = [
          AV_HWDEVICE_TYPE_CUDA,
          AV_HWDEVICE_TYPE_VIDEOTOOLBOX,
          AV_HWDEVICE_TYPE_VAAPI,
          AV_HWDEVICE_TYPE_QSV,
          AV_HWDEVICE_TYPE_DXVA2,
          AV_HWDEVICE_TYPE_D3D11VA,
        ];

        let supportsAnyDevice = false;
        for (const deviceType of deviceTypes) {
          if (codec.supportsDevice(deviceType)) {
            supportsAnyDevice = true;
            break;
          }
        }

        if (supportsAnyDevice) {
          assert.strictEqual(hasHwAccel, true, `${codec.name}: If supports hardware device, should have hardware acceleration`);
        }
      }
    });

    it('should get supported device types with getSupportedDeviceTypes()', () => {
      // Test pure software codec
      const libx264 = Codec.findEncoderByName(FF_ENCODER_LIBX264);
      if (libx264) {
        const devices = libx264.getSupportedDeviceTypes();
        assert.strictEqual(devices.length, 0, 'libx264 should not support any hardware devices');
      }

      // Test dedicated hardware codec
      const h264QSV = Codec.findDecoderByName(FF_DECODER_H264_QSV);
      if (h264QSV) {
        const devices = h264QSV.getSupportedDeviceTypes();
        assert.ok(devices.length > 0, 'h264_qsv should support at least one device');
        assert.ok(devices.includes(AV_HWDEVICE_TYPE_QSV), 'h264_qsv should support QSV');
      }

      // Test generic decoder
      const h264 = Codec.findDecoderByName(FF_DECODER_H264);
      if (h264) {
        const devices = h264.getSupportedDeviceTypes();
        assert.ok(Array.isArray(devices), 'h264 decoder should return an array of supported devices');
      }
    });

    it('should get hardware method with getHardwareMethod()', () => {
      const h264VTEnc = Codec.findEncoderByName(FF_ENCODER_H264_VIDEOTOOLBOX);
      if (h264VTEnc) {
        const method = h264VTEnc.getHardwareMethod(AV_HWDEVICE_TYPE_VIDEOTOOLBOX);
        assert.ok(method !== null, 'h264_videotoolbox encoder should have hardware method for VideoToolbox');
        assert.ok(method > 0, 'Hardware method should have valid flags');

        const methodCuda = h264VTEnc.getHardwareMethod(AV_HWDEVICE_TYPE_CUDA);
        assert.strictEqual(methodCuda, null, 'h264_videotoolbox encoder should not have method for CUDA');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined gracefully', () => {
      // Empty string should return null
      const decoder = Codec.findDecoderByName('' as any);
      assert.equal(decoder, null);
    });

    it('should handle special codec IDs', () => {
      // PCM codecs should always be available
      const pcmDecoder = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(pcmDecoder);
      assert.equal(pcmDecoder.type, AVMEDIA_TYPE_AUDIO);

      // PCM codecs typically don't need complex initialization
      assert.ok(pcmDecoder.isDecoder());
    });

    it('should handle codecs without certain properties', () => {
      // PCM codecs might not have profiles
      const pcmDecoder = Codec.findDecoder(AV_CODEC_ID_PCM_S16LE);
      assert.ok(pcmDecoder);

      // These can be null for simple codecs
      const profiles = pcmDecoder.profiles;
      // profiles can be null
      assert.ok(profiles === null || Array.isArray(profiles));
    });
  });
});
