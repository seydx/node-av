import { app, BrowserWindow, ipcMain } from 'electron';
import started from 'electron-squirrel-startup';
import {
  AV_HWDEVICE_TYPE_D3D11VA,
  AV_HWDEVICE_TYPE_DRM,
  AV_HWDEVICE_TYPE_VIDEOTOOLBOX,
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
    // Step 0: Log platform info
    const platform = process.platform;
    steps.push(`Platform: ${platform} (${process.arch})`);

    // Step 1: Create hardware context for SharedTexture (platform-specific)
    // - macOS: VideoToolbox (IOSurface)
    // - Windows: D3D11VA (DXGI shared handle)
    // - Linux: DRM (DMA-BUF → DRM PRIME)
    const hwType =
      platform === 'darwin'
        ? AV_HWDEVICE_TYPE_VIDEOTOOLBOX
        : platform === 'win32'
          ? AV_HWDEVICE_TYPE_D3D11VA
          : AV_HWDEVICE_TYPE_DRM;

    steps.push(`Creating hardware context (type=${hwType})...`);
    const hw = await HardwareContext.create(hwType);
    steps.push(`Hardware created: ${hw.deviceTypeName}`);

    // Step 2: Create SharedTexture
    steps.push('Creating SharedTexture...');
    const sharedTexture = SharedTexture.create(hw);
    steps.push('SharedTexture created');

    // Step 3: Create offscreen BrowserWindow with shared textures
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

    // Step 4: Wait for first paint with texture
    steps.push('Loading page and waiting for paint event with GPU texture...');

    const result = await new Promise<{
      success: boolean;
      error?: string;
      frameInfo?: Record<string, unknown>;
      textureSteps: string[];
    }>((resolve) => {
      const textureSteps: string[] = [];
      let resolved = false;

      // Timeout after 10s
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          offscreen.destroy();
          resolve({ success: false, error: 'Timeout waiting for paint event', textureSteps });
        }
      }, 10000);

      offscreen.webContents.on('paint', (event, dirty, _image) => {
        if (resolved) return;

        const texture = event.texture;

        // Debug: log what we actually receive
        textureSteps.push(`Paint event fired! dirty=${JSON.stringify(dirty)}, hasTexture=${!!texture}`);

        if (!texture || !texture.textureInfo) {
          textureSteps.push('No texture on event — skipping');
          try { 
            texture?.release?.(); 
          } catch {
            // ignore
          }
          return;
        }

        resolved = true;
        clearTimeout(timeout);

        try {
          const textureInfo = texture.textureInfo;
          textureSteps.push(`Received texture: pixelFormat=${textureInfo.pixelFormat}, size=${textureInfo.codedSize?.width}x${textureInfo.codedSize?.height}`);

          // Step 5: Import the texture as a Frame using SharedTexture (one line!)
          textureSteps.push('Importing texture via SharedTexture...');
          const frame = sharedTexture.importTexture(textureInfo, {
            pts: 0n,
            timeBase: { num: 1, den: 30 },
          });

          textureSteps.push(`Frame imported! width=${frame.width}, height=${frame.height}, format=${frame.format}, isHwFrame=${frame.isHwFrame()}`);

          const frameInfo = {
            width: frame.width,
            height: frame.height,
            format: frame.format,
            isHwFrame: frame.isHwFrame(),
            isSwFrame: frame.isSwFrame(),
            pts: frame.pts.toString(),
          };

          // Cleanup
          frame.free();
          texture.release();
          offscreen.destroy();

          resolve({ success: true, frameInfo, textureSteps });
        } catch (err) {
          textureSteps.push(`Error: ${err}`);
          try { texture?.release?.(); } catch { /* ignore */ }
          offscreen.destroy();
          resolve({ success: false, error: String(err), textureSteps });
        }
      });

      // Load a page and explicitly start painting once loaded
      offscreen.webContents.on('did-finish-load', () => {
        textureSteps.push('Page loaded, starting painting...');
        offscreen.webContents.setFrameRate(30);
        offscreen.webContents.startPainting();
        offscreen.webContents.invalidate();
      });
      offscreen.loadURL('data:text/html,<body style="background:linear-gradient(135deg,red,blue);margin:0;width:100vw;height:100vh"></body>');
    });

    // Cleanup
    sharedTexture.dispose();
    hw.dispose();

    return {
      steps: [...steps, ...result.textureSteps],
      success: result.success,
      error: result.error,
      frameInfo: result.frameInfo,
    };
  } catch (error) {
    return { error: String(error), steps };
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
