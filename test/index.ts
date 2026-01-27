import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BitStreamFilterAPI } from '../src/api/bitstream-filter.js';
import type { Decoder } from '../src/api/decoder.js';
import type { Encoder } from '../src/api/encoder.js';
import type { FilterAPI } from '../src/api/filter.js';
import type { Frame } from '../src/lib/frame.js';
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
