import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// node-av API for renderer
const nodeAv = {
  getFFmpegInfo: (): Promise<unknown> => ipcRenderer.invoke('get-ffmpeg-info'),
  getFFmpegCliVersion: (): Promise<{ path?: string; output?: string; error?: string }> =>
    ipcRenderer.invoke('get-ffmpeg-cli-version'),
  getHardwareInfo: (): Promise<{
    available?: boolean
    type?: number
    typeName?: string
    pixelFormat?: number
    message?: string
    error?: string
  }> => ipcRenderer.invoke('get-hardware-info'),
  testGpuTexture: (): Promise<{
    success?: boolean
    error?: string
    steps?: string[]
    frameInfo?: Record<string, unknown>
  }> => ipcRenderer.invoke('test-gpu-texture'),
  testBackPressure: (): Promise<{
    success?: boolean
    error?: string
    logs?: string[]
  }> => ipcRenderer.invoke('test-back-pressure')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('nodeAv', nodeAv)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.nodeAv = nodeAv
}
