import './index.css';

declare global {
  interface Window {
    nodeAv: {
      getFFmpegInfo: () => Promise<unknown>;
      getFFmpegCliVersion: () => Promise<{ path?: string; output?: string; error?: string }>;
      getHardwareInfo: () => Promise<{
        available?: boolean;
        type?: number;
        typeName?: string;
        pixelFormat?: number;
        message?: string;
        error?: string;
      }>;
      testGpuTexture: () => Promise<{
        success?: boolean;
        error?: string;
        steps?: string[];
        frameInfo?: Record<string, unknown>;
      }>;
      testBackPressure: () => Promise<{
        success?: boolean;
        error?: string;
        logs?: string[];
      }>;
      benchmarkNSImage: () => Promise<{
        success?: boolean;
        error?: string;
        logs?: string[];
      }>;
      verifyNSImage: () => Promise<{
        success?: boolean;
        error?: string;
        logs?: string[];
        images?: {
          reference: string;
          fromVideoBuffer: string;
          fromNSImage: string;
        };
      }>;
    };
  }
}

const btnInfo = document.getElementById('btn-info');
const btnCli = document.getElementById('btn-cli');
const btnHardware = document.getElementById('btn-hardware');
const btnGpuTexture = document.getElementById('btn-gpu-texture');
const btnBackPressure = document.getElementById('btn-back-pressure');
const btnBenchmarkNSImage = document.getElementById('btn-benchmark-nsimage');
const btnVerifyNSImage = document.getElementById('btn-verify-nsimage');
const output = document.getElementById('output')!;

function setLoading(message: string) {
  output.className = 'loading';
  output.textContent = message;
}

function setError(message: string) {
  output.className = 'error';
  output.textContent = message;
}

function setSuccess(message: string) {
  output.className = '';
  output.textContent = message;
}

btnInfo?.addEventListener('click', async () => {
  setLoading('Loading FFmpeg Info...');
  try {
    const info = await window.nodeAv.getFFmpegInfo();
    setSuccess(JSON.stringify(info, null, 2));
  } catch (error) {
    setError(`Error: ${error}`);
  }
});

btnCli?.addEventListener('click', async () => {
  setLoading('Running FFmpeg CLI...');
  try {
    const result = await window.nodeAv.getFFmpegCliVersion();
    if (result.error) {
      setError(`Error: ${result.error}`);
    } else {
      setSuccess(`Path: ${result.path}\n\n${result.output}`);
    }
  } catch (error) {
    setError(`Error: ${error}`);
  }
});

btnHardware?.addEventListener('click', async () => {
  setLoading('Detecting hardware acceleration...');
  try {
    const result = await window.nodeAv.getHardwareInfo();
    if (result.error) {
      setError(`Error: ${result.error}`);
    } else if (!result.available) {
      setSuccess(result.message || 'No hardware acceleration available');
    } else {
      setSuccess(
        `Hardware Acceleration Detected!\n\n` +
          `Type:         ${result.typeName}\n` +
          `Type ID:      ${result.type}\n` +
          `Pixel Format: ${result.pixelFormat}`
      );
    }
  } catch (error) {
    setError(`Error: ${error}`);
  }
});

btnGpuTexture?.addEventListener('click', async () => {
  setLoading('Testing GPU texture import (IOSurface → Frame)...');
  try {
    const result = await window.nodeAv.testGpuTexture();
    if (result.error) {
      const stepsText = result.steps?.length ? '\n\nSteps:\n' + result.steps.join('\n') : '';
      setError(`Error: ${result.error}${stepsText}`);
    } else {
      const stepsText = result.steps?.join('\n') || '';
      const frameText = result.frameInfo
        ? '\n\nFrame Info:\n' + JSON.stringify(result.frameInfo, null, 2)
        : '';
      setSuccess(`GPU Texture Import: SUCCESS!\n\n${stepsText}${frameText}`);
    }
  } catch (error) {
    setError(`Error: ${error}`);
  }
});

btnBackPressure?.addEventListener('click', async () => {
  setLoading('Running back pressure demo (this takes a few seconds)...');
  try {
    const result = await window.nodeAv.testBackPressure();
    if (result.error) {
      setError(`Error: ${result.error}\n\n${result.logs?.join('\n') || ''}`);
    } else {
      setSuccess(result.logs?.join('\n') || 'Done');
    }
  } catch (error) {
    setError(`Error: ${error}`);
  }
});

btnBenchmarkNSImage?.addEventListener('click', async () => {
  setLoading('Running NSImage benchmark (100 iterations)...');
  try {
    const result = await window.nodeAv.benchmarkNSImage();
    if (result.error) {
      setError(`Error: ${result.error}\n\n${result.logs?.join('\n') || ''}`);
    } else {
      setSuccess(result.logs?.join('\n') || 'Done');
    }
  } catch (error) {
    setError(`Error: ${error}`);
  }
});

btnVerifyNSImage?.addEventListener('click', async () => {
  setLoading('Capturing page and creating frames...');
  try {
    const result = await window.nodeAv.verifyNSImage();
    if (result.error) {
      setError(`Error: ${result.error}\n\n${result.logs?.join('\n') || ''}`);
    } else if (result.images) {
      const logsText = result.logs?.join('\n') || '';
      output.className = '';
      output.innerHTML =
        `<div style="white-space:pre;margin-bottom:12px;font-family:monospace">${logsText}</div>` +
        `<div style="display:flex;gap:12px;flex-wrap:wrap">` +
        `<div style="text-align:center"><div style="font-weight:bold;margin-bottom:4px">Reference (Electron)</div><img src="data:image/png;base64,${result.images.reference}" style="max-width:250px;border:1px solid #444"></div>` +
        `<div style="text-align:center"><div style="font-weight:bold;margin-bottom:4px">fromVideoBuffer (2 copies)</div><img src="data:image/png;base64,${result.images.fromVideoBuffer}" style="max-width:250px;border:1px solid #444"></div>` +
        `<div style="text-align:center"><div style="font-weight:bold;margin-bottom:4px">fromNSImage (zero-copy)</div><img src="data:image/png;base64,${result.images.fromNSImage}" style="max-width:250px;border:1px solid #444"></div>` +
        `</div>`;
    }
  } catch (error) {
    setError(`Error: ${error}`);
  }
});

console.log('node-av Electron Demo loaded');
