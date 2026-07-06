/**
 * High-Level API Example: Picture-in-Picture over WebRTC
 *
 * Composites two video sources into one picture-in-picture image with
 * FilterComplexAPI (overlay), then streams the result to a browser with
 * WebRTCStream's frame-source input - a filtered/composited frame stream
 * drives WebRTC directly, without a single Demuxer input.
 *
 * Serves a small page with a video element and does WebRTC signaling over
 * plain HTTP: the browser sends its full offer (after ICE gathering) and
 * receives the answer; the server trickles its ICE candidates back over SSE.
 * The server stays up between sessions - reload the page to start again.
 *
 * The inputs can be files or RTSP URLs, with different codecs (each input has
 * its own decoder). With --hw, decoding, compositing (hardware scale/overlay
 * filters) and encoding all run on the GPU.
 *
 * Usage: tsx examples/api-webrtc-pip.ts [base] [pip] [options]
 *
 * Options:
 *   --port <n>   HTTP port to serve on (default: 8787)
 *   --hw         Full GPU pipeline via HardwareContext.auto() (falls back to
 *                software when the build lacks a hardware overlay filter)
 *
 * Examples:
 *   tsx examples/api-webrtc-pip.ts testdata/bunny-30s.mp4 testdata/video.mp4
 *   tsx examples/api-webrtc-pip.ts rtsp://cam1/stream rtsp://cam2/stream --hw
 */

import { createServer } from 'node:http';

import { AV_PIX_FMT_YUV420P, Decoder, Demuxer, Filter, FilterComplexAPI, FilterComplexGraph, HardwareContext } from '../src/index.js';
import { WebRTCStream } from '../src/webrtc/index.js';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Frame } from '../src/index.js';

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 8787;
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
  /** Composited output frames (feeds the WebRTC video track). */
  frames: AsyncIterable<Frame | null>;
  /** Output dimensions (from the base input). */
  width: number;
  height: number;
  /** Whether the chain runs on the GPU. */
  hw: boolean;
  /** Close demuxers, decoders, filter graph, and hardware context. */
  dispose: () => Promise<void>;
}

/**
 * Pace file playback to realtime (like ffmpeg's -re).
 *
 * Files decode as fast as the CPU allows, which would blast 30s of video into
 * the browser in seconds - live sources (RTSP) pace themselves and skip this.
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

  return { frames, width: v0.codecpar.width, height: v0.codecpar.height, hw: !!hw, dispose };
}

const PAGE = `<!doctype html><meta charset=utf8><title>node-av PiP over WebRTC</title>
<style>body{font-family:sans-serif;margin:2rem}video{max-width:100%;background:#000;border-radius:8px}#s{color:#666}</style>
<h3>node-av — picture-in-picture over WebRTC</h3>
<button id=go>Start</button> <span id=s></span>
<div><video id=v autoplay playsinline muted controls></video></div>
<script>
const log = (t) => { s.textContent = t; console.log(t); };
go.onclick = async () => {
  go.disabled = true;
  const pc = new RTCPeerConnection();
  // Attach the receiver track directly - more robust than relying on
  // ontrack's event.streams (which depends on msid signaling in the answer).
  const transceiver = pc.addTransceiver('video', { direction: 'recvonly' });
  v.srcObject = new MediaStream([transceiver.receiver.track]);
  pc.onconnectionstatechange = () => log('connection: ' + pc.connectionState);

  // Live inbound stats - shows whether RTP arrives and frames get decoded.
  setInterval(async () => {
    let line = pc.connectionState + ' (no inbound-rtp yet)';
    for (const stat of (await pc.getStats()).values()) {
      if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
        line = 'pkts=' + stat.packetsReceived + ' frames=' + (stat.framesDecoded ?? 0) +
          ' key=' + (stat.keyFramesDecoded ?? 0) + ' pli=' + (stat.pliCount ?? 0) + ' ' + pc.connectionState;
      }
    }
    log(line);
  }, 1000);

  // Trickle: apply the server's ICE candidates as they arrive over SSE.
  const es = new EventSource('/ice');
  es.onmessage = (m) => pc.addIceCandidate(JSON.parse(m.data)).catch(() => {});

  // Non-trickle offer: gather all local candidates, then send the full SDP.
  await pc.setLocalDescription(await pc.createOffer());
  await new Promise((r) => {
    if (pc.iceGatheringState === 'complete') return r();
    pc.addEventListener('icegatheringstatechange', () => pc.iceGatheringState === 'complete' && r());
  });

  log('negotiating…');
  const answer = await (await fetch('/offer', { method: 'POST', body: pc.localDescription.sdp })).text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });
};
</script>`;

let session: WebRTCStream | null = null;
let composite: Composite | null = null;
let iceClient: ServerResponse | null = null; // single SSE client (example)
let pendingServerIce: string[] = []; // server candidates gathered before the SSE connects

/**
 * Send a server-side ICE candidate to the browser over SSE, buffering
 * candidates that arrive before the SSE connection is up.
 */
function sendServerIce(candidate: string): void {
  if (iceClient) {
    iceClient.write(`data: ${JSON.stringify({ candidate, sdpMLineIndex: 0 })}\n\n`);
  } else {
    pendingServerIce.push(candidate);
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' }).end(PAGE);
      return;
    }

    // SSE stream of server-side ICE candidates (server -> browser).
    if (req.method === 'GET' && req.url === '/ice') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write(': connected\n\n');
      iceClient = res;
      for (const c of pendingServerIce.splice(0)) sendServerIce(c);
      req.on('close', () => (iceClient = null));
      return;
    }

    // Offer (with the browser's candidates baked in) -> composite + stream -> answer.
    if (req.method === 'POST' && req.url === '/offer') {
      const offer = await readBody(req);

      await session?.stop();
      session = null;
      await composite?.dispose();
      composite = null;
      pendingServerIce = [];

      const built = await buildComposite();
      composite = built;
      // WebRTCStream encodes the frame source to H.264 (its first supported codec).
      // With --hw the composited frames are hardware frames and 'auto' picks the
      // matching hardware encoder (h264_videotoolbox / h264_vaapi) - the encoder
      // adopts the frames' hardware context, so encoding stays on the GPU.
      session = WebRTCStream.create(
        { video: built.frames },
        {
          hardware: built.hw ? 'auto' : undefined,
          video: { fps: 30, width: built.width, height: built.height },
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          onIceCandidate: (candidate) => sendServerIce(candidate),
          // Fires when the stream ends - including when the browser disconnects
          // (WebRTCStream detects the lost peer via ICE consent and stops itself).
          // Release the input pipeline; the HTTP server stays up for the next
          // client. Guard against a stale close: a lost peer times out after
          // ~10s, by which time a new offer may already own `composite`.
          onClose: (err) => {
            console.log(err ? `stream error: ${err.message}` : 'stream ended - reload the page to start again (Ctrl+C to quit)');
            if (composite === built) {
              void built.dispose();
              composite = null;
              session = null;
            }
          },
        },
      );

      // setOffer negotiates and starts the stream.
      const answer = await session.setOffer(offer);
      console.log('streaming to browser…');
      res.writeHead(200, { 'content-type': 'application/sdp' }).end(answer);
      return;
    }

    res.writeHead(404).end();
  } catch (err) {
    console.error(err);
    res.writeHead(500).end(String((err as Error).message));
  }
});

/**
 * Read a request body as a string.
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

server.listen(port, () => {
  console.log(`base : ${base}`);
  console.log(`pip  : ${pip}`);
  console.log(`\nOpen http://localhost:${port} in a browser and click "Start".`);
});

process.on('SIGINT', async () => {
  await session?.stop();
  await composite?.dispose();
  server.close();
  process.exit(0);
});
