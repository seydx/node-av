import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { ffmpegPath, getFFmpegInfo, HardwareContext } from 'node-av'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import icon from '../../resources/icon.png?asset'

const execFileAsync = promisify(execFile)

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC handler for getFFmpegInfo
ipcMain.handle('get-ffmpeg-info', () => {
  return getFFmpegInfo()
})

// IPC handler for FFmpeg CLI version
ipcMain.handle('get-ffmpeg-cli-version', async () => {
  const ffmpeg = ffmpegPath()
  if (!ffmpeg) {
    return { error: 'FFmpeg binary not found' }
  }

  try {
    const { stdout, stderr } = await execFileAsync(ffmpeg, ['-version'])
    return { path: ffmpeg, output: stdout || stderr }
  } catch (error) {
    return { error: String(error) }
  }
})

// IPC handler for hardware detection
ipcMain.handle('get-hardware-info', () => {
  try {
    const hw = HardwareContext.auto()
    if (!hw) {
      return { available: false, message: 'No hardware acceleration available' }
    }
    return {
      available: true,
      type: hw.deviceType,
      typeName: hw.deviceTypeName,
      pixelFormat: hw.devicePixelFormat
    }
  } catch (error) {
    return { error: String(error) }
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
