/**
 * High-Level API Example: Picture-in-Picture over fMP4 (MSE)
 *
 * Composites two video sources into one picture-in-picture image with
 * FilterComplexAPI (overlay), then streams the result to a browser as
 * fragmented MP4 via FMP4Stream's frame-source input - the browser plays it
 * with Media Source Extensions from a plain HTTP stream.
 *
 * The MSE counterpart of `api-webrtc-pip.ts`: same compositing, but the
 * transport is a single chunked HTTP response instead of WebRTC - no
 * signaling, works through any proxy. The server stays up between sessions -
 * reload the page to start again.
 *
 * The inputs can be files or RTSP URLs, with different codecs (each input has
 * its own decoder). With --hw, decoding, compositing (hardware scale/overlay
 * filters) and encoding all run on the GPU.
 *
 * Usage: tsx examples/api-fmp4-pip.ts [base] [pip] [options]
 *
 * Options:
 *   --port <n>   HTTP port to serve on (default: 8788)
 *   --hw         Full GPU pipeline via HardwareContext.auto() (falls back to
 *                software when the build lacks a hardware overlay filter)
 *
 * Examples:
 *   tsx examples/api-fmp4-pip.ts testdata/bunny-30s.mp4 testdata/video.mp4
 *   tsx examples/api-fmp4-pip.ts rtsp://cam1/stream rtsp://cam2/stream --hw
 */

import { createServer } from 'node:http';

import { AV_PIX_FMT_YUV420P, Decoder, Demuxer, Filter, FilterComplexAPI, FilterComplexGraph, FMP4Stream, HardwareContext } from '../src/index.js';

import type { ServerResponse } from 'node:http';
import type { Frame } from '../src/index.js';

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 8788;
const useHw = args.includes('--hw');
// Positional file args, excluding flags and the --port value.
const files = args.filter((a, i) => !a.startsWith('--') && !(portIdx !== -1 && i === portIdx + 1));
const base = files[0] ?? 'testdata/bunny-30s.mp4';
const pip = files[1] ?? 'testdata/video.mp4';

// Demuxer options for live RTSP inputs (cameras); files ignore these.
const isLive = (url: string) => url.toLowerCase().startsWith('rtsp');
const inputOptions = (url: string) => (isLive(url) ? { options: { rtsp_transport: 'tcp' } } : {});

/**
 * A running picture-in-picture composite: its output frames plus everything
 * needed to release the input pipeline when the session ends.
 */
interface Composite {
  /** Composited output frames (feeds the fMP4 video stream). */
  frames: AsyncIterable<Frame | null>;
  /** Whether the chain runs on the GPU. */
  hw: boolean;
  /** Close demuxers, decoders, filter graph, and hardware context. */
  dispose: () => Promise<void>;
}

/**
 * Pace file playback to realtime (like ffmpeg's -re).
 *
 * Files decode as fast as the CPU allows; live sources (RTSP) pace themselves
 * and skip this.
 */
async function* pace(frames: AsyncIterable<Frame | null>, fps: number): AsyncGenerator<Frame | null> {
  const frameMs = 1000 / fps;
  let next = performance.now();
  for await (const frame of frames) {
    const now = performance.now();
    if (now < next) {
      await new Promise((r) => setTimeout(r, next - now));
    }
    next = Math.max(next + frameMs, now - 5 * frameMs); // don't accumulate lag
    yield frame;
  }
}

/**
 * Build the composited PiP frame stream: pip scaled to 320x240 in the top-right
 * corner of base.
 *
 * With --hw the whole chain runs on the GPU: hardware decode -> hardware
 * scale/overlay filters -> hardware frames out, which the encoder consumes
 * zero-copy.
 */
async function buildComposite(): Promise<Composite> {
  let hw = useHw ? HardwareContext.auto() : null;
  if (useHw && !hw) console.log('(--hw requested but no hardware available - falling back to software)');

  // A hardware overlay filter is not guaranteed even when decode works - e.g.
  // overlay_videotoolbox additionally requires an FFmpeg build with Metal.
  if (hw && !Filter.getByName(`overlay_${hw.deviceTypeName}`)) {
    console.log(`(no overlay_${hw.deviceTypeName} in this FFmpeg build - falling back to software compositing)`);
    hw.dispose();
    hw = null;
  }

  const d0 = await Demuxer.open(base, inputOptions(base));
  const d1 = await Demuxer.open(pip, inputOptions(pip));
  const v0 = d0.video();
  const v1 = d1.video();
  if (!v0 || !v1) throw new Error('both inputs need a video stream');

  const dec0 = await Decoder.create(v0, hw ? { hardware: hw } : {});
  const dec1 = await Decoder.create(v1, hw ? { hardware: hw } : {});

  // The graph builder picks the right filters for the hardware context
  // (scale -> scale_vaapi / scale_vt, overlay -> overlay_vaapi / overlay_videotoolbox).
  const pipX = v0.codecpar.width - 320 - 10;
  const graph = FilterComplexGraph.create(hw)
    .chain({ inputs: '1:v', outputs: 'pip' }, (c) => c.scale(320, 240))
    .chain({ inputs: ['0:v', 'pip'], outputs: 'out' }, (c) => (hw ? c.overlay(pipX, 10) : c.overlay(pipX, 10).format(AV_PIX_FMT_YUV420P)));

  const complex = FilterComplexAPI.create(graph, {
    inputs: [{ label: '0:v' }, { label: '1:v' }],
    outputs: [{ label: 'out' }],
    hardware: hw,
  });

  const composited = complex.frames('out', {
    '0:v': dec0.frames(d0.packets(v0.index)),
    '1:v': dec1.frames(d1.packets(v1.index)),
  });

  // File inputs need realtime pacing; live inputs pace themselves.
  const frames = isLive(base) ? composited : pace(composited, 30);

  const dispose = async (): Promise<void> => {
    complex.close();
    dec0.close();
    dec1.close();
    await d0.close();
    await d1.close();
    hw?.dispose();
  };

  return { frames, hw: !!hw, dispose };
}

const PAGE = `<!doctype html><meta charset=utf8><title>node-av PiP over fMP4</title>
<style>body{font-family:sans-serif;margin:2rem}video{max-width:100%;background:#000;border-radius:8px}#s{color:#666}</style>
<h3>node-av — picture-in-picture over fMP4 (MSE)</h3>
<button id=go>Start</button> <span id=s></span>
<div><video id=v autoplay playsinline muted controls></video></div>
<script>
const log = (t) => { s.textContent = t; console.log(t); };
go.onclick = async () => {
  go.disabled = true;

  // The codec string travels in a response header so the SourceBuffer can be
  // created before the first bytes arrive.
  const resp = await fetch('/stream');
  const codecs = resp.headers.get('x-codec-string');
  const mime = 'video/mp4; codecs="' + codecs + '"';
  log('mime: ' + mime);

  const MSE = window.ManagedMediaSource || window.MediaSource;
  const ms = new MSE();
  v.src = URL.createObjectURL(ms);
  await new Promise((r) => ms.addEventListener('sourceopen', r, { once: true }));
  const sb = ms.addSourceBuffer(mime);

  // Serialize appends: SourceBuffer accepts one append at a time.
  const queue = [];
  const pump = () => {
    if (!sb.updating && queue.length) sb.appendBuffer(queue.shift());
  };
  sb.addEventListener('updateend', pump);

  const reader = resp.body.getReader();
  let bytes = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    queue.push(value);
    pump();
    log('received ' + (bytes / 1024).toFixed(0) + ' KiB, buffered ' + (v.buffered.length ? v.buffered.end(0).toFixed(1) : 0) + 's');
  }
  if (ms.readyState === 'open') ms.endOfStream();
  log('stream ended');
};
</script>`;

let activeRes: ServerResponse | null = null; // single streaming client (example)

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' }).end(PAGE);
      return;
    }

    // Composite + encode into a single chunked fMP4 response.
    if (req.method === 'GET' && req.url === '/stream') {
      // One session at a time - a new client replaces the previous one.
      activeRes?.end();
      activeRes = res;

      const composite = await buildComposite();
      const stream = FMP4Stream.create(
        { video: composite.frames },
        {
          video: { fps: 30 },
          hardware: composite.hw ? 'auto' : undefined,
          fragDuration: 1,
          onData: (data) => {
            if (!res.writableEnded) res.write(data);
          },
          onClose: (err) => {
            console.log(err ? `stream error: ${err.message}` : 'stream ended - reload the page to start again (Ctrl+C to quit)');
            if (!res.writableEnded) res.end();
            composite.dispose();
          },
        },
      );

      res.writeHead(200, {
        'content-type': 'video/mp4',
        'cache-control': 'no-store',
        // getCodecString() works before start() for frame sources - the target
        // codecs are fixed (H.264/AAC).
        'x-codec-string': stream.getCodecString(),
      });

      // Tear down when the browser goes away (tab closed/reloaded).
      req.on('close', () => {
        if (activeRes === res) activeRes = null;
        stream.stop();
      });

      await stream.start();
      console.log('streaming to browser…');
      return;
    }

    res.writeHead(404).end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500);
    res.end(String((err as Error).message));
  }
});

server.listen(port, () => {
  console.log(`base : ${base}`);
  console.log(`pip  : ${pip}`);
  console.log(`\nOpen http://localhost:${port} in a browser and click "Start".`);
});

process.on('SIGINT', () => {
  activeRes?.end();
  server.close();
  process.exit(0);
});
