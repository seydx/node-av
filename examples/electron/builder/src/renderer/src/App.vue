<script setup lang="ts">
import { ref } from 'vue'

const output = ref('Click a button to get started...')
const outputClass = ref('')

function setLoading(message: string): void {
  outputClass.value = 'loading'
  output.value = message
}

function setError(message: string): void {
  outputClass.value = 'error'
  output.value = message
}

function setSuccess(message: string): void {
  outputClass.value = ''
  output.value = message
}

async function getFFmpegInfo(): Promise<void> {
  setLoading('Loading FFmpeg Info...')
  try {
    const info = await window.nodeAv.getFFmpegInfo()
    setSuccess(JSON.stringify(info, null, 2))
  } catch (error) {
    setError(`Error: ${error}`)
  }
}

async function getFFmpegCli(): Promise<void> {
  setLoading('Running FFmpeg CLI...')
  try {
    const result = await window.nodeAv.getFFmpegCliVersion()
    if (result.error) {
      setError(`Error: ${result.error}`)
    } else {
      setSuccess(`Path: ${result.path}\n\n${result.output}`)
    }
  } catch (error) {
    setError(`Error: ${error}`)
  }
}

async function getHardwareInfo(): Promise<void> {
  setLoading('Detecting hardware acceleration...')
  try {
    const result = await window.nodeAv.getHardwareInfo()
    if (result.error) {
      setError(`Error: ${result.error}`)
    } else if (!result.available) {
      setSuccess(result.message || 'No hardware acceleration available')
    } else {
      setSuccess(
        `Hardware Acceleration Detected!\n\n` +
          `Type:         ${result.typeName}\n` +
          `Type ID:      ${result.type}\n` +
          `Pixel Format: ${result.pixelFormat}`
      )
    }
  } catch (error) {
    setError(`Error: ${error}`)
  }
}

async function testGpuTexture(): Promise<void> {
  setLoading('Testing GPU texture import (IOSurface → Frame)...')
  try {
    const result = await window.nodeAv.testGpuTexture()
    if (result.error) {
      const stepsText = result.steps?.length ? '\n\nSteps:\n' + result.steps.join('\n') : ''
      setError(`Error: ${result.error}${stepsText}`)
    } else {
      const stepsText = result.steps?.join('\n') || ''
      const frameText = result.frameInfo
        ? '\n\nFrame Info:\n' + JSON.stringify(result.frameInfo, null, 2)
        : ''
      setSuccess(`GPU Texture Import: SUCCESS!\n\n${stepsText}${frameText}`)
    }
  } catch (error) {
    setError(`Error: ${error}`)
  }
}
</script>

<template>
  <div class="container">
    <header>
      <h1>node-av</h1>
      <p>FFmpeg bindings for Node.js & Electron</p>
    </header>

    <div class="button-group">
      <button @click="getFFmpegInfo">FFmpeg Info</button>
      <button @click="getFFmpegCli">FFmpeg CLI</button>
      <button @click="getHardwareInfo">Detect Hardware</button>
      <button @click="testGpuTexture">Test GPU Texture</button>
    </div>

    <div class="output-container">
      <div class="output-header">
        <div class="indicator"></div>
        <span>Output</span>
      </div>
      <pre :class="outputClass">{{ output }}</pre>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  margin: 0;
  padding: 0;
  background: #181818;
  min-height: 100vh;
  color: #e4e4e4;
}

.container {
  max-width: 700px;
  margin: 0 auto;
  padding: 40px 20px;
}

header {
  text-align: center;
  margin-bottom: 40px;
}

header h1 {
  font-size: 2rem;
  margin: 0 0 8px 0;
  color: #df2a4c;
}

header p {
  color: #888;
  margin: 0;
  font-size: 0.95rem;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

button {
  background: #df2a4c;
  border: none;
  color: white;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #c4223f;
}

button:active {
  background: #a91d36;
}

.output-container {
  background: #222;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #333;
}

.output-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #333;
}

.output-header .indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
}

.output-header span {
  font-weight: 500;
  color: #888;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

pre {
  margin: 0;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #ccc;
  background: transparent;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 350px;
  overflow: auto;
}

pre::-webkit-scrollbar {
  width: 6px;
}

pre::-webkit-scrollbar-track {
  background: #181818;
}

pre::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.loading {
  color: #f59e0b !important;
}

.error {
  color: #ef4444 !important;
}
</style>
