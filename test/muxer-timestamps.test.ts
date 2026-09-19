import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Demuxer, FMP4Stream, Muxer } from '../src/index.js';
import { getInputFile } from './index.js';

import type { Packet } from '../src/index.js';

async function checkRegression(seconds: number, maxDtsCorrection: number | undefined, sync: boolean, rejects: boolean) {
  const input = Demuxer.openSync(getInputFile('demux.mp4'));
  const output = Muxer.openSync(
    { write: (data) => data.length },
    {
      format: 'mp4',
      useAsyncWrite: false,
      exitOnError: false,
      maxDtsCorrection,
      options: { movflags: '+frag_keyframe+empty_moov+default_base_moof' },
    },
  );
  const video = input.video()!;
  const index = output.addStream(video);
  let packet: Packet | undefined;
  try {
    for (const p of input.packetsSync()) {
      if (p?.streamIndex === video.index) {
        packet = p.clone()!;
        break;
      }
    }
    assert.ok(packet);
    const ticks = (time: number) => BigInt(Math.round((time * video.timeBase.den) / video.timeBase.num));
    const write = () => (sync ? output.writePacketSync(packet, index) : output.writePacket(packet, index));
    packet.dts = packet.pts = ticks(60);
    await write();
    packet.dts = packet.pts = ticks(60 - seconds);
    if (rejects) await assert.rejects(async () => write(), /Timestamp discontinuity/);
    else await write();
    assert.ok(packet.size > 0, 'the caller still owns its original packet');
  } finally {
    packet?.free();
    try {
      await output.close();
    } finally {
      input.closeSync();
    }
  }
}

describe('Opt-in muxer DTS policy', () => {
  for (const sync of [false, true]) {
    it(`keeps 2s and 30s backward jumps permissive by default (${sync ? 'sync' : 'async'})`, async () => {
      await checkRegression(2, undefined, sync, false);
      await checkRegression(30, undefined, sync, false);
      await checkRegression(30, 0, sync, false);
    });
    it(`rejects only regressions beyond the explicit threshold (${sync ? 'sync' : 'async'})`, async () => {
      await checkRegression(0.5, 1_000_000, sync, false);
      await checkRegression(1, 1_000_000, sync, false);
      await checkRegression(2, 1_000_000, sync, true);
      await checkRegression(30, 1_000_000, sync, true);
    });
  }

  it('keeps FMP4 timestamp rejection opt-in and passes the selected value to its muxer', async () => {
    for (const value of [undefined, 0, 1_000_000]) {
      const stream = FMP4Stream.create(getInputFile('demux.mp4'), { maxDtsCorrection: value });
      const state = stream as unknown as { createOutput(): Promise<Muxer> };
      const output = await state.createOutput();
      try {
        const options = (output as unknown as { options: { maxDtsCorrection: number } }).options;
        assert.equal(options.maxDtsCorrection, value ?? 0);
      } finally {
        await output.close();
        await stream.stop();
      }
    }
  });

  it('rejects invalid thresholds', () => {
    for (const value of [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => Muxer.openSync('unused.mp4', { maxDtsCorrection: value }), /non-negative safe integer/);
    }
  });
});
