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
    };
  }
}

const btnInfo = document.getElementById('btn-info');
const btnCli = document.getElementById('btn-cli');
const btnHardware = document.getElementById('btn-hardware');
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

console.log('node-av Electron Demo loaded');
