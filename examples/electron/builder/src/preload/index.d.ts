import { ElectronAPI } from '@electron-toolkit/preload'

interface NodeAvAPI {
  getFFmpegInfo: () => Promise<unknown>
  getFFmpegCliVersion: () => Promise<{ path?: string; output?: string; error?: string }>
  getHardwareInfo: () => Promise<{
    available?: boolean
    type?: number
    typeName?: string
    pixelFormat?: number
    message?: string
    error?: string
  }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    nodeAv: NodeAvAPI
  }
}
