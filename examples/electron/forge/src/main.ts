import { app, BrowserWindow, ipcMain } from 'electron';
import started from 'electron-squirrel-startup';
import {
  AV_HWDEVICE_TYPE_D3D11VA,
  AV_HWDEVICE_TYPE_DRM,
  AV_HWDEVICE_TYPE_VIDEOTOOLBOX,
  Encoder,
  FF_THREAD_FRAME,
  ffmpegPath,
  getFFmpegInfo,
  HardwareContext,
  SharedTexture,
} from 'node-av';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// IPC handler for getFFmpegInfo
ipcMain.handle('get-ffmpeg-info', () => {
  return getFFmpegInfo();
});

// IPC handler for FFmpeg CLI version
ipcMain.handle('get-ffmpeg-cli-version', async () => {
  const ffmpeg = ffmpegPath();
  if (!ffmpeg) {
    return { error: 'FFmpeg binary not found' };
  }

  try {
    const { stdout, stderr } = await execFileAsync(ffmpeg, ['-version']);
    return { path: ffmpeg, output: stdout || stderr };
  } catch (error) {
    return { error: String(error) };
  }
});

// IPC handler for hardware detection
ipcMain.handle('get-hardware-info', async () => {
  try {
    const hw = HardwareContext.auto();
    if (!hw) {
      return { available: false, message: 'No hardware acceleration available' };
    }
    return {
      available: true,
      type: hw.deviceType,
      typeName: hw.deviceTypeName,
      pixelFormat: hw.devicePixelFormat,
    };
  } catch (error) {
    return { error: String(error) };
  }
});

// IPC handler for GPU texture import test
ipcMain.handle('test-gpu-texture', async () => {
  const steps: string[] = [];

  try {
    const platform = process.platform;
    steps.push(`Platform: ${platform} (${process.arch})`);

    // Hardware + SharedTexture setup
    const hwType =
      platform === 'darwin'
        ? AV_HWDEVICE_TYPE_VIDEOTOOLBOX
        : platform === 'win32'
          ? AV_HWDEVICE_TYPE_D3D11VA
          : AV_HWDEVICE_TYPE_DRM;

    steps.push(`Creating hardware context (type=${hwType})...`);
    using hw = HardwareContext.create(hwType);
    if (!hw) throw new Error('Failed to create hardware context');
    steps.push(`Hardware created: ${hw.deviceTypeName}`);

    steps.push('Creating SharedTexture...');
    using sharedTexture = SharedTexture.create(hw);
    steps.push('SharedTexture created');

    // Offscreen window
    steps.push('Creating offscreen BrowserWindow with shared textures...');
    const offscreen = new BrowserWindow({
      show: false,
      width: 640,
      height: 480,
      webPreferences: {
        offscreen: {
          useSharedTexture: true,
        },
      },
    });
    steps.push('Offscreen window created');

    // Wait for first paint event with a valid texture
    steps.push('Loading page and waiting for paint event with GPU texture...');

    const { texture, paintSteps } = await new Promise<{
      texture: Electron.OffscreenSharedTexture;
      paintSteps: string[];
    }>((resolve, reject) => {
      const paintSteps: string[] = [];

      const timeout = setTimeout(() => {
        offscreen.destroy();
        reject(new Error('Timeout waiting for paint event'));
      }, 10000);

      offscreen.webContents.on('paint', (event, dirty) => {
        const tex = event.texture;
        paintSteps.push(`Paint event fired! dirty=${JSON.stringify(dirty)}, hasTexture=${!!tex}`);

        if (!tex?.textureInfo) {
          paintSteps.push('No texture on event — skipping');
          try { tex?.release?.(); } catch { /* ignore */ }
          return;
        }

        clearTimeout(timeout);
        offscreen.webContents.stopPainting();
        resolve({ texture: tex, paintSteps });
      });

      offscreen.webContents.on('did-finish-load', () => {
        paintSteps.push('Page loaded, starting painting...');
        offscreen.webContents.setFrameRate(30);
        offscreen.webContents.startPainting();
        offscreen.webContents.invalidate();
      });
      offscreen.loadURL('data:text/html,<body style="background:linear-gradient(135deg,red,blue);margin:0;width:100vw;height:100vh"></body>');
    });

    steps.push(...paintSteps);
    const textureInfo = texture.textureInfo;
    steps.push(`Received texture: pixelFormat=${textureInfo.pixelFormat}, size=${textureInfo.codedSize?.width}x${textureInfo.codedSize?.height}`);

    // Import texture as Frame (zero-copy)
    steps.push('Importing texture via SharedTexture...');
    using frame = sharedTexture.importTexture(textureInfo, {
      pts: 0n,
      timeBase: { num: 1, den: 30 },
    });

    steps.push(`Frame imported! width=${frame.width}, height=${frame.height}, format=${frame.format}, colorRange=${frame.colorRange}, isHwFrame=${frame.isHwFrame()}`);

    const frameInfo = {
      width: frame.width,
      height: frame.height,
      format: frame.format,
      colorRange: frame.colorRange,
      isHwFrame: frame.isHwFrame(),
      isSwFrame: frame.isSwFrame(),
      pts: frame.pts.toString(),
    };

    // Encode the imported frame with hardware encoder
    steps.push('Testing hardware encoding of imported frame...');
    const encoderCodec = hw.getEncoderCodec('h264');

    if (encoderCodec) {
      steps.push(`Encoder codec: ${encoderCodec.name}`);
      using encoder = await Encoder.create(encoderCodec, { threadType: FF_THREAD_FRAME });

      const packets = await encoder.encodeAll(frame);
      let totalPackets = packets.length;

      for await (using _packet of encoder.flushPackets()) {
        totalPackets++;
      }

      steps.push(`Encoding succeeded! Got ${totalPackets} packet(s)`);
    } else {
      steps.push('No hardware H.264 encoder available — skipping encode test');
    }

    texture.release();
    offscreen.destroy();

    return { steps, success: true, frameInfo };
  } catch (error) {
    return { error: String(error), steps };
  }
});

// IPC handler for back pressure demo
ipcMain.handle('test-back-pressure', async () => {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  try {
    const platform = process.platform;

    // Hardware + SharedTexture setup (same as test-gpu-texture)
    const hwType =
      platform === 'darwin'
        ? AV_HWDEVICE_TYPE_VIDEOTOOLBOX
        : platform === 'win32'
          ? AV_HWDEVICE_TYPE_D3D11VA
          : AV_HWDEVICE_TYPE_DRM;

    const hw = HardwareContext.create(hwType);
    if (!hw) throw new Error('Failed to create hardware context');
    const sharedTexture = SharedTexture.create(hw);

    // Offscreen window with shared textures
    const offscreen = new BrowserWindow({
      show: false,
      width: 640,
      height: 480,
      webPreferences: {
        offscreen: {
          useSharedTexture: true,
        },
      },
    });

    const TOTAL_FRAMES = 30;
    const SIMULATED_ENCODE_MS = 200;
    let frameCount = 0;
    const startTime = performance.now();
    const receivedTimes: number[] = [];

    // Queue + sequential processing to demonstrate back pressure
    const queue: { frame: ReturnType<typeof sharedTexture.importTexture>; texture: Electron.OffscreenSharedTexture; receivedAt: number; frameNum: number }[] = [];
    let processing = false;

    log(`Back Pressure Demo — ${TOTAL_FRAMES} frames, ${SIMULATED_ENCODE_MS}ms simulated encode, 60fps requested`);
    log(`Pool capacity: 10 frames (Electron internal limit)`);
    log('');

    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const timeout = setTimeout(() => {
        offscreen.destroy();
        resolve({ success: false, error: 'Timeout after 30s — not enough paint events received' });
      }, 30000);

      async function processQueue() {
        processing = true;
        while (queue.length > 0) {
          const { frame, texture, receivedAt, frameNum } = queue.shift()!;

          // Simulated encode delay
          await new Promise((r) => setTimeout(r, SIMULATED_ENCODE_MS));

          const releasedAt = performance.now() - startTime;
          log(
            `Frame ${String(frameNum).padStart(2)}: received=${String(receivedAt.toFixed(0)).padStart(6)}ms, ` +
              `released=${String(releasedAt.toFixed(0)).padStart(6)}ms, ` +
              `held=${String((releasedAt - receivedAt).toFixed(0)).padStart(5)}ms`,
          );

          frame.free();
          texture.release(); // ← Back Pressure: Electron can reuse this pool slot now

          if (frameNum >= TOTAL_FRAMES) {
            clearTimeout(timeout);
            offscreen.destroy();
            resolve({ success: true });
            return;
          }
        }
        processing = false;
      }

      offscreen.webContents.on('paint', (event) => {
        const texture = event.texture;

        if (!texture?.textureInfo || frameCount >= TOTAL_FRAMES) {
          try {
            texture?.release?.();
          } catch {
            // ignore
          }
          return;
        }

        frameCount++;
        const receivedAt = performance.now() - startTime;
        receivedTimes.push(receivedAt);

        const frame = sharedTexture.importTexture(texture.textureInfo, {
          pts: BigInt(frameCount),
          timeBase: { num: 1, den: 60 },
        });

        queue.push({ frame, texture, receivedAt, frameNum: frameCount });
        if (!processing) processQueue();
      });

      offscreen.webContents.on('did-finish-load', () => {
        offscreen.webContents.setFrameRate(60);
        offscreen.webContents.startPainting();
      });

      // Animated gradient to ensure continuous paint events
      offscreen.loadURL(
        'data:text/html,' +
          encodeURIComponent(
            '<style>body{margin:0;width:100vw;height:100vh;background:linear-gradient(135deg,red,blue);animation:shift 2s linear infinite}' +
              '@keyframes shift{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}</style>',
          ),
      );
    });

    sharedTexture.dispose();
    hw.dispose();

    // Analysis: compute intervals between frame arrivals
    log('');
    log('--- Analysis ---');
    log(`Simulated encode time: ${SIMULATED_ENCODE_MS}ms per frame`);
    log(`Expected without back pressure (60fps): ~16ms between frames`);
    log(`Expected with back pressure: ~${SIMULATED_ENCODE_MS}ms between frames`);

    if (receivedTimes.length > 1) {
      const intervals = receivedTimes.slice(1).map((t, i) => t - receivedTimes[i]);

      // Split into early frames (pool filling) and later frames (back pressure active)
      const poolSize = Math.min(10, intervals.length);
      const earlyIntervals = intervals.slice(0, poolSize);
      const lateIntervals = intervals.slice(poolSize);

      const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

      log(`First ${poolSize} frames avg interval:  ${avg(earlyIntervals).toFixed(0)}ms (Electron fills pool freely)`);
      if (lateIntervals.length > 0) {
        log(`Remaining frames avg interval: ${avg(lateIntervals).toFixed(0)}ms (back pressure active)`);
        log('');
        if (avg(lateIntervals) > avg(earlyIntervals) * 2) {
          log("Conclusion: Electron's texture pool automatically throttles frame delivery!");
        } else {
          log('Conclusion: Back pressure effect was minimal (pool may not have filled completely)');
        }
      }
    }

    return { success: result.success, error: result.error, logs };
  } catch (error) {
    return { error: String(error), logs };
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
