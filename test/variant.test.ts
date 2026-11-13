/**
 * Checks the FFmpeg variant the binding was built for (NODE_AV_VARIANT, gpl when unset):
 * its license, the components it must and must not have, and a transcode with them.
 * The full suite needs GPL components and runs on gpl only, lgpl and light run this file
 * (npm run test:variant).
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Decoder, Demuxer, Encoder, Muxer } from '../src/api/index.js';
import { FF_ENCODER_AAC, FF_ENCODER_LIBFDK_AAC, FF_ENCODER_LIBX264, FF_ENCODER_MPEG4 } from '../src/constants/index.js';
import { BitStreamFilter, Codec, Filter, InputFormat, OutputFormat, getFFmpegInfo } from '../src/lib/index.js';
import { getInputFile, getOutputFile, prepareTestEnvironment } from './index.js';

import type { FFDecoderCodec, FFEncoderCodec } from '../src/constants/index.js';

prepareTestEnvironment();

const variant = process.env.NODE_AV_VARIANT ?? 'gpl';
const configuration = getFFmpegInfo().configuration;

// Live streaming, recording and snapshots, in every variant (libx264, libx265 and libfdk_aac only in the GPL ones)
const required = {
  encoders: ['mjpeg', 'png', 'aac', 'libopus', 'pcm_alaw', 'pcm_mulaw'],
  decoders: ['h264', 'hevc', 'mjpeg', 'png', 'aac', 'libopus', 'pcm_alaw', 'pcm_mulaw', 'libdav1d'],
  muxers: ['mp4', 'rtp', 'rtsp', 'adts', 'mjpeg', 'image2', 'wav', 'null'],
  demuxers: ['rtsp', 'sdp', 'h264', 'hevc', 'aac', 'jpeg_pipe', 'png_pipe', 'image2', 'mjpeg'],
  filters: [
    'buffer',
    'buffersink',
    'abuffer',
    'abuffersink',
    'aformat',
    'aresample',
    'asetnsamples',
    'setpts',
    'fps',
    'scale',
    'format',
    'crop',
    'pad',
    'transpose',
    'hwupload',
    'hwdownload',
    'drawtext',
    'amix',
    'alimiter',
    'concat',
  ],
  bsfs: ['dump_extra', 'aac_adtstoasc', 'extract_extradata', 'h264_mp4toannexb', 'hevc_mp4toannexb'],
};

// Only in gpl and light: the GPL components, and libfdk_aac, which has its own license
const notInLgpl = {
  encoders: ['libx264', 'libx265', 'libfdk_aac'],
  decoders: ['libfdk_aac'],
  filters: ['hqdn3d', 'delogo', 'eq'],
};

// External libraries light leaves out (variants/defaults-light.sh in the builder)
const notInLight = {
  encoders: ['libvpx', 'libvpx-vp9', 'libsvtav1', 'libwebp', 'libvorbis', 'libjxl'],
  filters: ['whisper', 'zscale', 'subtitles'],
};

const hasEncoder = (name: string) => Codec.findEncoderByName(name as FFEncoderCodec) !== null;
const hasDecoder = (name: string) => Codec.findDecoderByName(name as FFDecoderCodec) !== null;
const hasFilter = (name: string) => Filter.getByName(name) !== null;
const missing = (names: string[], has: (name: string) => boolean) => names.filter((name) => !has(name));
const present = (names: string[], has: (name: string) => boolean) => names.filter((name) => has(name));

describe(`FFmpeg variant (${variant})`, () => {
  it('should be one of the published variants', () => {
    assert.ok(['gpl', 'lgpl', 'light'].includes(variant), `Unknown NODE_AV_VARIANT ${variant}`);
  });

  it('should carry the license of the variant', () => {
    assert.match(configuration, /--enable-version3/);
    // nonfree builds can't be redistributed (the CUDA filters are compiled with clang, not nvcc)
    assert.doesNotMatch(configuration, /--enable-nonfree/);
    if (variant === 'lgpl') {
      assert.doesNotMatch(configuration, /--enable-gpl/);
    } else {
      assert.match(configuration, /--enable-gpl/);
    }
  });

  it('should have the components for streaming, recording and snapshots', () => {
    assert.deepStrictEqual(missing(required.encoders, hasEncoder), [], 'encoders');
    assert.deepStrictEqual(missing(required.decoders, hasDecoder), [], 'decoders');
    assert.deepStrictEqual(missing(required.filters, hasFilter), [], 'filters');
    assert.deepStrictEqual(
      missing(required.muxers, (name) => OutputFormat.guessFormat(name, null, null) !== null),
      [],
      'muxers',
    );
    assert.deepStrictEqual(
      missing(required.demuxers, (name) => InputFormat.findInputFormat(name) !== null),
      [],
      'demuxers',
    );
    assert.deepStrictEqual(
      missing(required.bsfs, (name) => BitStreamFilter.getByName(name) !== null),
      [],
      'bitstream filters',
    );
  });

  it('should leave the GPL components and libfdk_aac out of lgpl', () => {
    if (variant === 'lgpl') {
      assert.deepStrictEqual(present(notInLgpl.encoders, hasEncoder), [], 'encoders');
      assert.deepStrictEqual(present(notInLgpl.decoders, hasDecoder), [], 'decoders');
      assert.deepStrictEqual(present(notInLgpl.filters, hasFilter), [], 'filters');
      assert.strictEqual(OutputFormat.guessFormat('chromaprint', null, null), null, 'chromaprint links fftw3f (GPL)');
    } else {
      assert.deepStrictEqual(missing(notInLgpl.encoders, hasEncoder), [], 'encoders');
      assert.deepStrictEqual(missing(notInLgpl.decoders, hasDecoder), [], 'decoders');
      assert.deepStrictEqual(missing(notInLgpl.filters, hasFilter), [], 'filters');
    }
  });

  it('should leave out the libraries light does not build', () => {
    if (variant === 'light') {
      assert.deepStrictEqual(present(notInLight.encoders, hasEncoder), [], 'encoders');
      assert.deepStrictEqual(present(notInLight.filters, hasFilter), [], 'filters');
    } else {
      assert.deepStrictEqual(missing(notInLight.encoders, hasEncoder), [], 'encoders');
      assert.deepStrictEqual(missing(notInLight.filters, hasFilter), [], 'filters');
    }
  });

  it('should transcode video to mp4', async () => {
    const outputFile = getOutputFile(`variant-${variant}.mp4`);
    await using input = await Demuxer.open(getInputFile('video.mp4'));
    const stream = input.video();
    assert.ok(stream, 'Should have a video stream');

    using decoder = await Decoder.create(stream);
    // libx264 is GPL, lgpl falls back to FFmpeg's own MPEG-4 encoder
    using encoder = await Encoder.create(variant === 'lgpl' ? FF_ENCODER_MPEG4 : FF_ENCODER_LIBX264, { decoder, maxBFrames: 0 });
    const output = await Muxer.open(outputFile);
    const index = output.addStream(encoder);

    let frames = 0;
    for await (using packet of input.packets(stream.index)) {
      for await (using frame of decoder.frames(packet)) {
        if (frame === null || frames >= 10) continue;
        frames++;
        for await (using encoded of encoder.packets(frame)) {
          await output.writePacket(encoded, index);
        }
      }
      if (frames >= 10) break;
    }
    for await (using encoded of encoder.packets(null)) {
      await output.writePacket(encoded, index);
    }
    await output.close();

    await using check = await Demuxer.open(outputFile);
    assert.strictEqual(check.video()?.codecpar.codecId, encoder.getCodec().id);
  });

  it('should encode AAC', async () => {
    await using input = await Demuxer.open(getInputFile('audio.aac'));
    const stream = input.audio();
    assert.ok(stream, 'Should have an audio stream');

    using decoder = await Decoder.create(stream);
    // libfdk_aac in the GPL variants, FFmpeg's own encoder in lgpl
    using encoder = await Encoder.create(variant === 'lgpl' ? FF_ENCODER_AAC : FF_ENCODER_LIBFDK_AAC, { decoder, autoResample: true });

    let packets = 0;
    for await (using packet of input.packets(stream.index)) {
      for await (using frame of decoder.frames(packet)) {
        if (frame === null) continue;
        for await (using _encoded of encoder.packets(frame)) {
          packets++;
        }
      }
      if (packets >= 5) break;
    }
    assert.ok(packets > 0, 'Should produce AAC packets');
  });
});
