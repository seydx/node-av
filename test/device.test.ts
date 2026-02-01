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
          assert(['video', 'audio'].includes(device.type));
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
