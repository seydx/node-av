import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('nodeAv', {
  getFFmpegInfo: () => ipcRenderer.invoke('get-ffmpeg-info'),
  getFFmpegCliVersion: () => ipcRenderer.invoke('get-ffmpeg-cli-version'),
  getHardwareInfo: () => ipcRenderer.invoke('get-hardware-info'),
  testGpuTexture: () => ipcRenderer.invoke('test-gpu-texture'),
  testBackPressure: () => ipcRenderer.invoke('test-back-pressure'),
});
