import { readFileSync } from 'fs';
import { createServer } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';

import { type Demuxer, DeviceAPI, WebRTCStream } from '../../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('WebRTC Streaming Server');
console.log('================================');

let OVERRIDE_RANDOM_PORT: number | undefined = undefined;
if (process.env.SERVER_PORT) {
  const port = Number(process.env.SERVER_PORT);
  if (!isNaN(port) && port > 0 && port < 65536) {
    console.log(`[Server] Using overridden port from SERVER_PORT: ${port}`);
    OVERRIDE_RANDOM_PORT = port;
  }
}

async function buildDeviceInput(message: Record<string, string | number | undefined>): Promise<Demuxer> {
  const framerate = Number(message.framerate ?? 30);
  const width = message.width ? Number(message.width) : undefined;
  const height = message.height ? Number(message.height) : undefined;

  switch (message.deviceType) {
    case 'screen':
      return DeviceAPI.openScreen({
        frameRate: framerate,
        avfoundation: {
          screenIndex: Number(message.screenIndex ?? 0),
          captureSystemAudio: true,
        },
      });

    case 'camera':
      return DeviceAPI.openCamera({
        videoDevice: String(message.device ?? '0'),
        frameRate: framerate,
        ...(width && height ? { width, height } : {}),
      });

    case 'device':
      return DeviceAPI.openDevice({
        videoDevice: String(message.device ?? '0'),
        audioDevice: String(message.audioDevice ?? '0'),
        frameRate: framerate,
        ...(width && height ? { width, height } : {}),
      });

    case 'microphone':
      return DeviceAPI.openMicrophone({
        audioDevice: String(message.device ?? '0'),
      });

    default:
      throw new Error(`Unknown device type: ${message.deviceType}`);
  }
}

// Create HTTP server that serves the HTML page
const httpServer = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const htmlPath = join(__dirname, 'index.html');
    let html = readFileSync(htmlPath, 'utf-8');
    // Inject the actual WS port into the HTML
    const addr = wss.address();
    const port = OVERRIDE_RANDOM_PORT ?? (typeof addr === 'object' ? addr!.port : 0);
    html = html.replace(/ws:\/\/localhost:\d+/g, `ws://localhost:${port}`);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server on random port
const wss = new WebSocketServer({ server: httpServer });

httpServer.listen(OVERRIDE_RANDOM_PORT ?? 0, () => {
  const addr = httpServer.address();
  const actualPort = typeof addr === 'object' ? addr!.port : 0;
  console.log(`\n[Server] Listening on http://localhost:${actualPort}`);
  console.log(`[Server] Open http://localhost:${actualPort} in your browser`);
});

wss.on('connection', async (ws: WebSocket) => {
  console.log('\n[WebSocket] Client connected, waiting for URL...');

  let session: WebRTCStream | null = null;

  // Step 1: Wait for URL from client
  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'list-devices') {
        const devices = await DeviceAPI.list();
        ws.send(
          JSON.stringify({
            type: 'devices',
            value: devices,
            formats: {
              video: DeviceAPI.getVideoFormat(),
              audio: DeviceAPI.getAudioFormat(),
              screen: DeviceAPI.getScreenFormat(),
            },
          }),
        );
        return;
      }

      if (message.type === 'webrtc/offer') {
        if (!message.value) {
          ws.send(JSON.stringify({ type: 'error', value: 'No SDP offer provided' }));
          return;
        }

        let input: string | Demuxer;

        if (message.source === 'device') {
          input = await buildDeviceInput(message);
          console.log('[WebSocket] Received SDP offer with device from client:', message.deviceType);
        } else {
          if (!message.url) {
            ws.send(JSON.stringify({ type: 'error', value: 'No URL provided' }));
            return;
          }
          input = message.url;
          console.log('[WebSocket] Received SDP offer with URL from client:', message.url);
        }

        // console.log('[WebSocket] SDP offer:', message.value);

        // Create WebRTC session
        session = WebRTCStream.create(input, {
          hardware: 'auto',
          onIceCandidate: (candidate) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'webrtc/candidate', value: candidate }));
            }
          },
          onClose(error) {
            if (error) {
              console.error('[WebRTC] Session closed with error:', error);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', value: String(error) }));
              }
            } else {
              console.log('[WebRTC] Session closed');
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'end' }));
              }
            }
          },
        });

        // Start streaming
        console.log('[Server] Starting streaming...');
        await session.start();

        console.log('[WebRTC] Session created with codecs:', session.getCodecs());

        console.log('[WebSocket] Processing SDP offer');

        // Set offer and get answer
        const answer = await session.setOffer(message.value);

        // console.log('[WebSocket] Created SDP answer', answer);
        ws.send(JSON.stringify({ type: 'webrtc/answer', value: answer }));

        // Start streaming
        console.log('[Server] Starting streaming...');
      } else if (message.type === 'webrtc/candidate') {
        if (!session) {
          return;
        }
        console.log('[WebSocket] Received ICE candidate from client');
        session.addIceCandidate(message.value);
      }
    } catch (error) {
      console.error('[WebSocket] Error:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', value: String(error) }));
      }
    }
  });

  ws.on('close', async () => {
    console.log('[WebSocket] Client disconnected');
    await session?.stop();
    session = null;
  });

  ws.on('error', async (error: Error) => {
    console.error('[WebSocket] Error:', error);
    await session?.stop();
    session = null;
  });
});
