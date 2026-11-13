import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AV_PIX_FMT_YUV420P } from '../src/constants/constants.js';
import { FF_ENCODER_LIBX264, FF_ENCODER_LIBX265 } from '../src/constants/encoders.js';
import { Codec } from '../src/lib/codec.js';
import { Filter } from '../src/lib/filter.js';
import { Frame } from '../src/lib/frame.js';
import { Rational } from '../src/lib/rational.js';

import type { BitStreamFilterAPI } from '../src/api/bitstream-filter.js';
import type { Decoder } from '../src/api/decoder.js';
import type { DemuxerOptions } from '../src/api/demuxer.js';
import type { Encoder } from '../src/api/encoder.js';
import type { FilterAPI } from '../src/api/filter.js';
import type { FFDecoderCodec } from '../src/constants/decoders.js';
import type { FFEncoderCodec } from '../src/constants/encoders.js';
import type { AVPixelFormat } from '../src/constants/index.js';
import type { Packet } from '../src/lib/packet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function prepareTestEnvironment() {
  const tmpDir = join(__dirname, '.tmp');
  mkdirSync(tmpDir, { recursive: true });
}

export function getInputFile(name: string) {
  const tmpDir = join(__dirname, '../testdata');
  return join(tmpDir, name);
}

export function getOutputFile(name: string) {
  const tmpDir = join(__dirname, '.tmp');
  return join(tmpDir, name);
}

export function getTmpDir() {
  return join(__dirname, '.tmp');
}

export function isCI(): boolean {
  // Check common CI environment variables
  return !!(
    process.env.CI ??
    process.env.GITHUB_ACTIONS ??
    process.env.JENKINS ??
    process.env.TRAVIS ??
    process.env.CIRCLECI ??
    process.env.GITLAB_CI ??
    process.env.BUILDKITE ??
    process.env.DRONE ??
    process.env.CONTINUOUS_INTEGRATION
  );
}

export const skipInCI = { skip: isCI() ? 'Skipping hardware tests in CI' : false };

/** FFmpeg components a test needs. */
interface RequiredComponents {
  encoders?: FFEncoderCodec[];
  decoders?: FFDecoderCodec[];
  filters?: string[];
}

/**
 * Skip option for tests that need components the FFmpeg build may leave out.
 *
 * Checks the build itself rather than the variant name, so it also covers custom builds.
 * node-av-lgpl has no libx264, libx265, libfdk_aac or GPL-only filters, node-av-light no whisper.
 *
 * @param components - Encoders, decoders and filters the test uses
 * @param extra - Further test options to merge, e.g. {@link skipInCI}
 *
 * @returns Test options with a skip reason naming what is missing
 */
export function requires(components: RequiredComponents, extra: { skip?: string | boolean } = {}): { skip: string | boolean } {
  const missing = [
    ...(components.encoders ?? []).filter((name) => !Codec.findEncoderByName(name)),
    ...(components.decoders ?? []).filter((name) => !Codec.findDecoderByName(name)),
    ...(components.filters ?? []).filter((name) => !Filter.getByName(name)),
  ];
  return { skip: missing.length > 0 ? `This FFmpeg build has no ${missing.join(', ')}` : (extra.skip ?? false) };
}

/** Tests that encode H.264 in software. */
export const needsX264 = requires({ encoders: [FF_ENCODER_LIBX264] });

/** Tests that encode H.265 in software. */
export const needsX265 = requires({ encoders: [FF_ENCODER_LIBX265] });

export async function* decodePacket(decoder: Decoder, packet: Packet | null): AsyncGenerator<Frame> {
  await decoder.decode(packet);
  while (true) {
    const frame = await decoder.receive();
    if (!frame) break;
    yield frame;
  }
}

export function* decodePacketSync(decoder: Decoder, packet: Packet | null): Generator<Frame> {
  decoder.decodeSync(packet);
  while (true) {
    const frame = decoder.receiveSync();
    if (!frame) break;
    yield frame;
  }
}

export async function decodeFirstFrame(decoder: Decoder, packets: AsyncIterable<Packet | null>, streamIndex?: number): Promise<Frame | null> {
  for await (const packet of packets) {
    if (packet && streamIndex !== undefined && packet.streamIndex !== streamIndex) {
      continue;
    }
    for await (const frame of decodePacket(decoder, packet)) {
      return frame;
    }
    if (packet === null) {
      // EOF reached without finding a frame
      return null;
    }
  }
  // Try flushing
  for await (const frame of decodePacket(decoder, null)) {
    return frame;
  }
  return null;
}

export function decodeFirstFrameSync(decoder: Decoder, packets: Iterable<Packet | null>, streamIndex?: number): Frame | null {
  for (const packet of packets) {
    if (packet && streamIndex !== undefined && packet.streamIndex !== streamIndex) {
      continue;
    }
    for (const frame of decodePacketSync(decoder, packet)) {
      return frame;
    }
    if (packet === null) {
      return null;
    }
  }
  // Try flushing
  for (const frame of decodePacketSync(decoder, null)) {
    return frame;
  }
  return null;
}

export async function* encodeFrame(encoder: Encoder, frame: Frame | null): AsyncGenerator<Packet> {
  await encoder.encode(frame);
  while (true) {
    const pkt = await encoder.receive();
    if (!pkt) break;
    yield pkt;
  }
}

export function* encodeFrameSync(encoder: Encoder, frame: Frame | null): Generator<Packet> {
  encoder.encodeSync(frame);
  while (true) {
    const pkt = encoder.receiveSync();
    if (!pkt) break;
    yield pkt;
  }
}

export async function* filterFrame(filter: FilterAPI, frame: Frame | null): AsyncGenerator<Frame> {
  await filter.process(frame);
  while (true) {
    const filtered = await filter.receive();
    if (!filtered) break;
    yield filtered;
  }
}

export function* filterFrameSync(filter: FilterAPI, frame: Frame | null): Generator<Frame> {
  filter.processSync(frame);
  while (true) {
    const filtered = filter.receiveSync();
    if (!filtered) break;
    yield filtered;
  }
}

export async function* filterPacket(filter: BitStreamFilterAPI, packet: Packet | null): AsyncGenerator<Packet> {
  await filter.filter(packet);
  while (true) {
    const filtered = await filter.receive();
    if (!filtered) break;
    yield filtered;
  }
}

export function* filterPacketSync(filter: BitStreamFilterAPI, packet: Packet | null): Generator<Packet> {
  filter.filterSync(packet);
  while (true) {
    const filtered = filter.receiveSync();
    if (!filtered) break;
    yield filtered;
  }
}

export function syntheticVideoFrame(index: number, width = 320, height = 240): Frame {
  const frame = new Frame();
  frame.alloc();
  frame.width = width;
  frame.height = height;
  frame.format = AV_PIX_FMT_YUV420P;
  frame.pts = BigInt(index);
  frame.timeBase = new Rational(1, 30);
  frame.getBuffer();
  const planes = frame.data;
  planes?.[0]?.fill(index % 256);
  planes?.[1]?.fill(128);
  planes?.[2]?.fill(128);
  return frame;
}

// gray rawvideo in the format a 4:2:2 JPEG camera decodes to, with the demuxer options to read it
export function yuvj422pSource(name: string, width = 320, height = 240, frames = 15): { file: string; inputOptions: DemuxerOptions } {
  const file = getOutputFile(name);
  const frame = Buffer.alloc(width * height * 2, 0x80);
  writeFileSync(file, Buffer.concat(Array.from({ length: frames }, () => frame)));
  return { file, inputOptions: { format: 'rawvideo', options: { pixel_format: 'yuvj422p', video_size: `${width}x${height}`, framerate: '15' } } };
}

// the format frames reach an encoder in, the software format of device frames
export function encoderInputFormat(encoder: Encoder | undefined): AVPixelFormat | undefined {
  const context = encoder?.getCodecContext();
  return context ? (context.hwFramesCtx?.swFormat ?? context.pixelFormat) : undefined;
}

export async function* stallingFrameSource(count: number, onSilent: () => void): AsyncGenerator<Frame | null> {
  for (let i = 0; i < count; i++) {
    yield syntheticVideoFrame(i);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  onSilent();
  await new Promise<void>(() => {
    // never settles
  });
}
