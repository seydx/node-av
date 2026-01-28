import { app, BrowserWindow, ipcMain } from 'electron';
import started from 'electron-squirrel-startup';
import { ffmpegPath, getFFmpegInfo, HardwareContext } from 'node-av';
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
