import { readFileSync } from 'fs';
import { createServer } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';

import { Device, DeviceAPI, WebRTCStream } from '../../../src/index.js';

import type { Demuxer } from '../../../src/index.js';

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

async function buildDeviceInput(
  message: Record<string, string | number | undefined>,
): Promise<{ demuxer: Demuxer } | { deviceName: string; format: string; formatOptions: Record<string, string> }> {
  if (message.deviceType === 'screen') {
    const demuxer = await DeviceAPI.openScreen({
      screenIndex: Number(message.screenIndex ?? 0),
      frameRate: Number(message.framerate ?? 30),
      captureSystemAudio: true,
    });
    return { demuxer };
  }

  if (message.deviceType === 'camera') {
    const format = Device.getVideoFormat();
    const deviceName = String(message.device ?? '0');
    const formatOptions: Record<string, string> = {
      pixel_format: format === 'avfoundation' ? 'nv12' : 'yuv420p',
      framerate: String(message.framerate ?? 30),
    };
    if (message.width && message.height) {
      formatOptions.video_size = `${message.width}x${message.height}`;
    }
    return { deviceName, format, formatOptions };
  }

  // microphone
  const format = Device.getAudioFormat();
  let deviceName = String(message.device ?? '0');
  if (format === 'avfoundation') {
    deviceName = `:${deviceName}`;
  }
  return { deviceName, format, formatOptions: {} };
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
        const devices = await Device.list();
        ws.send(
          JSON.stringify({
            type: 'devices',
            value: devices,
            formats: {
              video: Device.getVideoFormat(),
              audio: Device.getAudioFormat(),
              screen: Device.getScreenFormat(),
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
        let inputOptions: Record<string, unknown> | undefined;

        if (message.source === 'device') {
          const result = await buildDeviceInput(message);
          if ('demuxer' in result) {
            input = result.demuxer;
            console.log('[WebSocket] Received SDP offer with device from client:', message.deviceType, '(using Device.openScreen)');
          } else {
            input = result.deviceName;
            inputOptions = { format: result.format, options: { ...result.formatOptions, probesize: 5000000, analyzeduration: 2000000 } };
            console.log('[WebSocket] Received SDP offer with device from client:', message.deviceType, result.deviceName);
          }
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
          ...(inputOptions ? { inputOptions } : {}),
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
