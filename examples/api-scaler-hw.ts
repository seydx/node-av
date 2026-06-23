/**
 * High-Level API Example: Scaler on software vs hardware frames
 *
 * Runs the `Scaler` over decoded frames in both modes - with and without a
 * `HardwareContext` - across several output pixel formats, and prints which
 * (mode × format) combinations succeed on the current machine. Hardware frames
 * are scaled/converted on the GPU and downloaded; software frames go through
 * swscale. Useful for checking which GPU backend (VAAPI, QSV, VideoToolbox, …)
 * supports which conversion.
 *
 * Usage: tsx examples/api-scaler-hw.ts [input] [--frames N] [--debug|--trace]
 *
 * Examples:
 *   tsx examples/api-scaler-hw.ts                                  # bundled test file, HW auto
 *   tsx examples/api-scaler-hw.ts testdata/bunny-30s.mp4 --frames 2
 *   tsx examples/api-scaler-hw.ts testdata/bunny-30s.mp4 --trace   # dump filter-graph negotiation
 */

import { AV_LOG_DEBUG, AV_LOG_TRACE, AV_LOG_WARNING, avGetPixFmtName, Decoder, Demuxer, HardwareContext, Log, Scaler } from '../src/index.js';

import type { AVPixelFormat, Frame } from '../src/index.js';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--')) ?? 'testdata/bunny-30s.mp4';
const framesIdx = args.indexOf('--frames');
const maxFrames = framesIdx !== -1 ? parseInt(args[framesIdx + 1], 10) : 3;

Log.setLevel(args.includes('--trace') ? AV_LOG_TRACE : args.includes('--debug') ? AV_LOG_DEBUG : AV_LOG_WARNING);

const FORMATS = ['nv12', 'gray', 'rgb'] as const;
const isRTSP = input.startsWith('rtsp://') || input.startsWith('rtsps://');

// scaler-mode × format -> "ok" | "FAIL: <msg>"
const matrix: Record<string, Record<string, string>> = { 'sw (no hw ctx)': {}, 'hw (gpu ctx)': {} };

function fmtName(frame: Frame): string {
  try {
    return avGetPixFmtName(frame.format as AVPixelFormat) ?? String(frame.format);
  } catch {
    return String(frame.format);
  }
}

async function tryScale(mode: 'sw (no hw ctx)' | 'hw (gpu ctx)', hw: HardwareContext | null, frame: Frame, format: (typeof FORMATS)[number]): Promise<string> {
  // Fresh scaler per test so a failure can't contaminate the next combination.
  using scaler = new Scaler(mode === 'hw (gpu ctx)' && hw ? { hardware: hw } : {});
  try {
    const buf = await scaler.toBuffer(frame, { resize: { width: 320, height: 180 }, format });
    return `ok (${buf.length}b)`;
  } catch (error) {
    return `FAIL: ${(error as Error).message}`;
  }
}

console.log(`input        : ${input}${isRTSP ? ' (rtsp)' : ''}`);

await using demuxer = await Demuxer.open(input, isRTSP ? { options: { rtsp_transport: 'tcp', timeout: 10_000_000 } } : {});
const video = demuxer.video();
if (!video) throw new Error('No video stream found');

using hw = HardwareContext.auto();
console.log(`hwaccel      : ${hw ? hw.deviceTypeName : 'none (software decode)'}`);
console.log(`resolution   : ${video.codecpar.width}x${video.codecpar.height}`);

using decoder = await Decoder.create(video, hw ? { hardware: hw } : {});

let n = 0;
outer: for await (using packet of demuxer.packets(video.index)) {
  for await (using frame of decoder.frames(packet)) {
    if (!frame) continue;

    console.log(`\nframe ${n}: ${frame.width}x${frame.height} format=${fmtName(frame)} isHwFrame=${frame.isHwFrame()}`);
    for (const format of FORMATS) {
      const sw = await tryScale('sw (no hw ctx)', hw, frame, format);
      const hwRes = hw ? await tryScale('hw (gpu ctx)', hw, frame, format) : 'skipped (no hw)';
      console.log(`  ${format.padEnd(5)}  sw=${sw.padEnd(16)}  hw=${hwRes}`);
      matrix['sw (no hw ctx)'][format] ??= sw;
      matrix['hw (gpu ctx)'][format] ??= hwRes;
    }

    if (++n >= maxFrames) break outer;
  }
}

console.log(`\n===== summary (first frame) — hwaccel: ${hw ? hw.deviceTypeName : 'software'} =====`);
for (const mode of Object.keys(matrix)) {
  for (const format of FORMATS) {
    console.log(`  ${mode.padEnd(16)} ${format.padEnd(5)} -> ${matrix[mode][format] ?? '-'}`);
  }
}
console.log(`\nDone — processed ${n} frame(s).`);
