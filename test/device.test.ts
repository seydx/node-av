import assert from 'node:assert';
import { describe, it } from 'node:test';

import { DeviceAPI } from '../src/api/device.js';
import { skipInCI } from './index.js';

describe('Device', () => {
  describe('Device (Low-Level)', () => {
    describe('list()', () => {
      it('should return an array', async () => {
        const devices = await DeviceAPI.list();
        assert(Array.isArray(devices));
      });

      it('should have correct device structure', async () => {
        const devices = await DeviceAPI.list();
        for (const device of devices) {
          assert(typeof device.name === 'string');
          assert(typeof device.description === 'string');
          assert(typeof device.type === 'string');
          assert(['video', 'audio', 'screen'].includes(device.type));
          assert(typeof device.isDefault === 'boolean');
        }
      });
    });

    describe('listSync()', () => {
      it('should return an array', () => {
        const devices = DeviceAPI.listSync();
        assert(Array.isArray(devices));
      });

      it('should return same result as async version', async () => {
        const asyncDevices = await DeviceAPI.list();
        const syncDevices = DeviceAPI.listSync();

        assert.strictEqual(syncDevices.length, asyncDevices.length);

        for (let i = 0; i < syncDevices.length; i++) {
          assert.strictEqual(syncDevices[i].name, asyncDevices[i].name);
          assert.strictEqual(syncDevices[i].type, asyncDevices[i].type);
        }
      });
    });

    describe('getVideoFormat()', () => {
      it('should return platform-specific format', () => {
        const format = DeviceAPI.getVideoFormat();
        const expected: Record<string, string> = {
          darwin: 'avfoundation',
          linux: 'v4l2',
          win32: 'dshow',
        };
        assert.strictEqual(format, expected[process.platform]);
      });
    });

    describe('getAudioFormat()', () => {
      it('should return platform-specific format', () => {
        const format = DeviceAPI.getAudioFormat();
        const expected: Record<string, string> = {
          darwin: 'avfoundation',
          linux: 'alsa',
          win32: 'dshow',
        };
        assert.strictEqual(format, expected[process.platform]);
      });
    });

    describe('getScreenFormat()', () => {
      it('should return platform-specific format', () => {
        const format = DeviceAPI.getScreenFormat();
        const expected: Record<string, string> = {
          darwin: 'avfoundation',
          linux: 'x11grab',
          win32: 'gdigrab',
        };
        assert.strictEqual(format, expected[process.platform]);
      });
    });
  });

  describe('Device (High-Level)', () => {
    describe('list()', () => {
      it('should return an array', async () => {
        const devices = await DeviceAPI.list();
        assert(Array.isArray(devices));
      });

      it('should filter video devices correctly', async () => {
        const devices = await DeviceAPI.list();
        const videoDevices = devices.filter((d) => d.type === 'video');
        for (const device of videoDevices) {
          assert.strictEqual(device.type, 'video');
        }
      });

      it('should filter audio devices correctly', async () => {
        const devices = await DeviceAPI.list();
        const audioDevices = devices.filter((d) => d.type === 'audio');
        for (const device of audioDevices) {
          assert.strictEqual(device.type, 'audio');
        }
      });

      it('should filter screen devices correctly', async () => {
        const devices = await DeviceAPI.list();
        const screenDevices = devices.filter((d) => d.type === 'screen');
        for (const device of screenDevices) {
          assert.strictEqual(device.type, 'screen');
        }
      });

      it('should include screen devices on supported platforms', async () => {
        const devices = await DeviceAPI.list();
        const screenDevices = devices.filter((d) => d.type === 'screen');

        if (process.platform === 'darwin') {
          assert(screenDevices.length > 0, 'Expected at least one screen device on macOS');
          assert(screenDevices[0].name.startsWith('Capture screen '), 'Expected macOS screen name to start with "Capture screen "');
        }
      });

      it('should include bounds for screen devices', async () => {
        const devices = await DeviceAPI.list();
        const screenDevices = devices.filter((d) => d.type === 'screen');

        for (const device of screenDevices) {
          assert(device.bounds, `Screen device "${device.name}" should have bounds`);
          assert(typeof device.bounds.x === 'number', 'bounds.x should be a number');
          assert(typeof device.bounds.y === 'number', 'bounds.y should be a number');
          assert(typeof device.bounds.width === 'number', 'bounds.width should be a number');
          assert(typeof device.bounds.height === 'number', 'bounds.height should be a number');
          assert(device.bounds.width > 0, `Screen device "${device.name}" should have positive width`);
          assert(device.bounds.height > 0, `Screen device "${device.name}" should have positive height`);
        }
      });
    });

    describe('listSync()', () => {
      it('should return an array', () => {
        const devices = DeviceAPI.listSync();
        assert(Array.isArray(devices));
      });
    });

    describe('getVideoFormat()', () => {
      it('should return string', () => {
        const format = DeviceAPI.getVideoFormat();
        assert(typeof format === 'string');
        assert(format.length > 0);
      });
    });

    describe('getAudioFormat()', () => {
      it('should return string', () => {
        const format = DeviceAPI.getAudioFormat();
        assert(typeof format === 'string');
        assert(format.length > 0);
      });
    });

    describe('getScreenFormat()', () => {
      it('should return string', () => {
        const format = DeviceAPI.getScreenFormat();
        assert(typeof format === 'string');
        assert(format.length > 0);
      });
    });
  });

  describe('Device Capture', () => {
    describe('modes()', () => {
      it('should return an array of modes for a video device', async () => {
        const devices = await DeviceAPI.list();
        const camera = devices.find((d) => d.type === 'video');

        if (!camera) {
          console.log('No camera device available, skipping test');
          return;
        }

        const modes = await DeviceAPI.modes(camera.name);
        assert(Array.isArray(modes));
        assert(modes.length > 0, 'Expected at least one mode');

        for (const mode of modes) {
          assert(typeof mode.width === 'number');
          assert(typeof mode.height === 'number');
          assert(typeof mode.minFrameRate === 'number');
          assert(typeof mode.maxFrameRate === 'number');
          assert(typeof mode.pixelFormat === 'number');
          assert(mode.width > 0);
          assert(mode.height > 0);
          assert(mode.minFrameRate > 0);
          assert(mode.maxFrameRate >= mode.minFrameRate);
        }
      });

      it('should return modes sorted descending by resolution', async () => {
        const devices = await DeviceAPI.list();
        const camera = devices.find((d) => d.type === 'video');

        if (!camera) {
          console.log('No camera device available, skipping test');
          return;
        }

        const modes = await DeviceAPI.modes(camera.name);

        for (let i = 1; i < modes.length; i++) {
          const prevArea = modes[i - 1].width * modes[i - 1].height;
          const currArea = modes[i].width * modes[i].height;
          assert(
            prevArea > currArea || (prevArea === currArea && modes[i - 1].maxFrameRate >= modes[i].maxFrameRate),
            `Modes not sorted descending: ${modes[i - 1].width}x${modes[i - 1].height} should come before ${modes[i].width}x${modes[i].height}`,
          );
        }
      });
    });

    describe('audioModes()', () => {
      it('should return an array of modes for an audio device', async () => {
        const devices = await DeviceAPI.list();
        const mic = devices.find((d) => d.type === 'audio');

        if (!mic) {
          console.log('No audio device available, skipping test');
          return;
        }

        const modes = await DeviceAPI.audioModes(mic.name);
        assert(Array.isArray(modes));

        for (const mode of modes) {
          assert(typeof mode.sampleRate === 'number');
          assert(typeof mode.channels === 'number');
          assert(typeof mode.sampleFormat === 'number');
          assert(mode.sampleRate > 0);
          assert(mode.channels > 0);
        }
      });

      it('should return audio modes sorted descending by sample rate', async () => {
        const devices = await DeviceAPI.list();
        const mic = devices.find((d) => d.type === 'audio');

        if (!mic) {
          console.log('No audio device available, skipping test');
          return;
        }

        const modes = await DeviceAPI.audioModes(mic.name);

        for (let i = 1; i < modes.length; i++) {
          const prev = modes[i - 1];
          const curr = modes[i];
          const sorted = prev.sampleRate > curr.sampleRate || (prev.sampleRate === curr.sampleRate && prev.channels >= curr.channels);
          assert(sorted, `Audio modes not sorted: ${prev.sampleRate}Hz/${prev.channels}ch before ${curr.sampleRate}Hz/${curr.channels}ch`);
        }
      });

      it('should return same result as sync version', async () => {
        const devices = await DeviceAPI.list();
        const mic = devices.find((d) => d.type === 'audio');

        if (!mic) {
          console.log('No audio device available, skipping test');
          return;
        }

        const asyncModes = await DeviceAPI.audioModes(mic.name);
        const syncModes = DeviceAPI.audioModesSync(mic.name);

        assert.strictEqual(syncModes.length, asyncModes.length);

        for (let i = 0; i < syncModes.length; i++) {
          assert.strictEqual(syncModes[i].sampleRate, asyncModes[i].sampleRate);
          assert.strictEqual(syncModes[i].channels, asyncModes[i].channels);
          assert.strictEqual(syncModes[i].sampleFormat, asyncModes[i].sampleFormat);
        }
      });
    });

    describe('openCamera()', () => {
      it('should open camera device', async () => {
        const devices = await DeviceAPI.list();
        const camera = devices.find((d) => d.type === 'video');

        if (!camera) {
          console.log('No camera device available, skipping test');
          return;
        }

        const modes = await DeviceAPI.modes(camera.name);
        const mode = modes.length > 0 ? modes[modes.length - 1] : null;

        await using demuxer = await DeviceAPI.openCamera({
          videoDevice: 0,
          width: mode?.width ?? 640,
          height: mode?.height ?? 480,
          frameRate: mode?.maxFrameRate ?? 30,
        });

        assert(demuxer.streams.length > 0);
      });
    });

    // In CI environments, audio devices may be listed (alsa) but not accessible
    describe('openMicrophone()', skipInCI, () => {
      it('should open microphone device', async () => {
        const devices = await DeviceAPI.list();
        const microphone = devices.find((d) => d.type === 'audio');

        if (!microphone) {
          console.log('No microphone device available, skipping test');
          return;
        }

        await using demuxer = await DeviceAPI.openMicrophone({
          audioDevice: 0,
        });

        assert(demuxer.streams.length > 0);
      });
    });

    describe('openDevice()', skipInCI, () => {
      it('should open combined video + audio device', async () => {
        if (process.platform === 'linux') {
          console.log('Combined capture not supported on Linux, skipping test');
          return;
        }

        const devices = await DeviceAPI.list();
        const camera = devices.find((d) => d.type === 'video');
        const microphone = devices.find((d) => d.type === 'audio');

        if (!camera || !microphone) {
          console.log('No camera or microphone device available, skipping test');
          return;
        }

        const modes = await DeviceAPI.modes(camera.name);
        const mode = modes.length > 0 ? modes[modes.length - 1] : null;

        await using demuxer = await DeviceAPI.openDevice({
          videoDevice: 0,
          audioDevice: 0,
          width: mode?.width ?? 640,
          height: mode?.height ?? 480,
          frameRate: mode?.maxFrameRate ?? 30,
        });

        assert(demuxer.streams.length > 1, 'Expected both video and audio streams');
      });
    });
  });

  describe('Screen Capture', () => {
    describe('permissions', () => {
      it('hasScreenCapturePermission() should return a boolean', () => {
        const result = DeviceAPI.hasScreenCapturePermission();
        assert.strictEqual(typeof result, 'boolean');
      });

      it('requestScreenCaptureAccess() should return a boolean', () => {
        const result = DeviceAPI.requestScreenCaptureAccess();
        assert.strictEqual(typeof result, 'boolean');
      });
    });

    describe('openScreen()', skipInCI, () => {
      it('should open screen capture if permission is granted', async function () {
        const devices = await DeviceAPI.list();
        const screens = devices.filter((d) => d.type === 'screen');

        if (screens.length === 0) {
          console.log('No screen device available, skipping test');
          return;
        }

        if (!DeviceAPI.hasScreenCapturePermission()) {
          console.log('Screen capture permission not granted, skipping test');
          return;
        }

        await using demuxer = await DeviceAPI.openScreen({
          frameRate: 30,
        });
        assert(demuxer.streams.length > 0);
      });
    });
  });
});
