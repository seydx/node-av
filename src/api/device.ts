import { Device } from '../lib/device.js';
import { Demuxer } from './demuxer.js';

import type { DeviceInfo, DeviceMode } from '../lib/device.js';

export type { DeviceInfo, DeviceMode };

/**
 * Options for opening a camera or microphone device.
 */
export interface DeviceOptions {
  /** Video device name or index (0-based) */
  videoDevice?: string | number;
  /** Audio device name or index (0-based) */
  audioDevice?: string | number;
  /** Video frame rate */
  frameRate?: number;
  /** Video resolution width */
  width?: number;
  /** Video resolution height */
  height?: number;
  /** Pixel format (e.g., 'yuyv422', 'nv12') */
  pixelFormat?: string;
  /** Audio sample rate in Hz */
  sampleRate?: number;
  /** Number of audio channels */
  channels?: number;
}

/**
 * Options for screen capture.
 */
export interface ScreenCaptureOptions {
  /** Capture region: x offset */
  x?: number;
  /** Capture region: y offset */
  y?: number;
  /** Capture region width */
  width?: number;
  /** Capture region height */
  height?: number;
  /** Frame rate for capture */
  frameRate?: number;
  /** Whether to draw the mouse cursor */
  drawMouse?: boolean;
  /** Window title (Windows gdigrab only) */
  windowTitle?: string;
  /** Screen index (macOS avfoundation: 0 = main display) */
  screenIndex?: number;
  /** Display identifier (Linux xcbgrab: e.g., ':0.0') */
  display?: string;
  /** Pixel format (e.g., 'nv12', 'uyvy422'). Defaults to 'nv12' on macOS */
  pixelFormat?: string;
  /** Capture system/desktop audio via ScreenCaptureKit (macOS 13.0+) */
  captureSystemAudio?: boolean;
  /** Exclude current process audio from system audio capture (macOS 13.0+) */
  excludeProcessAudio?: boolean;
  /** System audio sample rate in Hz (8000, 16000, 24000, 48000). Default: 48000 (macOS 13.0+) */
  audioSampleRate?: 8000 | 16000 | 24000 | 48000;
  /** System audio channel count (1=mono, 2=stereo). Default: 2 (macOS 13.0+) */
  audioChannels?: 1 | 2;
  /** Capture mouse click animations (macOS 15.0+) */
  captureMouseClicks?: boolean;
}

/**
 * Device capture API for webcams, microphones, and screen capture.
 *
 * Provides a high-level interface for accessing capture devices and screen recording.
 * Automatically handles platform-specific input formats and device name conventions.
 *
 * @example
 * ```typescript
 * import { DeviceAPI } from 'node-av/api';
 *
 * // List available devices
 * const devices = await DeviceAPI.list();
 * console.log('Video devices:', devices.filter(d => d.type === 'video'));
 * console.log('Audio devices:', devices.filter(d => d.type === 'audio'));
 *
 * // Open webcam
 * await using input = await DeviceAPI.openCamera({
 *   videoDevice: 0,
 *   width: 1920,
 *   height: 1080,
 *   frameRate: 30,
 * });
 *
 * // Open microphone
 * await using input = await DeviceAPI.openMicrophone({
 *   audioDevice: 'default',
 *   sampleRate: 48000,
 *   channels: 2,
 * });
 *
 * // Screen capture
 * await using input = await DeviceAPI.openScreen({
 *   width: 1920,
 *   height: 1080,
 *   frameRate: 30,
 * });
 * ```
 *
 * @see {@link DeviceOptions} For camera/microphone options
 * @see {@link ScreenCaptureOptions} For screen capture options
 * @see {@link Demuxer} For processing captured streams
 */
export class DeviceAPI {
  /**
   * List all available capture devices.
   *
   * Enumerates video (cameras) and audio (microphones) capture devices
   * on the system using platform-specific APIs.
   *
   * @returns Array of device information
   *
   * @example
   * ```typescript
   * const devices = await DeviceAPI.list();
   *
   * // Filter by type
   * const cameras = devices.filter(d => d.type === 'video');
   * const microphones = devices.filter(d => d.type === 'audio');
   *
   * // Find default devices
   * const defaultCamera = devices.find(d => d.type === 'video' && d.isDefault);
   * ```
   */
  static async list(): Promise<DeviceInfo[]> {
    return Device.list();
  }

  /**
   * List all available capture devices synchronously.
   *
   * @returns Array of device information
   *
   * @example
   * ```typescript
   * const devices = DeviceAPI.listSync();
   * console.log('Found', devices.length, 'devices');
   * ```
   *
   * @see {@link list} For async version
   */
  static listSync(): DeviceInfo[] {
    return Device.listSync();
  }

  /**
   * Query supported capture modes for a video device.
   *
   * Returns supported resolutions and frame rate ranges, sorted descending
   * by resolution (area), then by max frame rate.
   *
   * @param deviceName - Device name as returned by `list()` (e.g. uniqueID on macOS)
   *
   * @returns Array of supported device modes
   *
   * @example
   * ```typescript
   * const devices = await DeviceAPI.list();
   * const camera = devices.find(d => d.type === 'video');
   * if (camera) {
   *   const modes = await DeviceAPI.modes(camera.name);
   *   for (const mode of modes) {
   *     console.log(`${mode.width}x${mode.height} @ ${mode.minFrameRate}-${mode.maxFrameRate} fps`);
   *   }
   * }
   * ```
   *
   * @see {@link modesSync} For sync version
   */
  static async modes(deviceName: string): Promise<DeviceMode[]> {
    return Device.modes(deviceName);
  }

  /**
   * Query supported capture modes for a video device synchronously.
   *
   * @param deviceName - Device name as returned by `listSync()`
   *
   * @returns Array of supported device modes
   *
   * @example
   * ```typescript
   * const devices = DeviceAPI.listSync();
   * const camera = devices.find(d => d.type === 'video');
   * if (camera) {
   *   const modes = DeviceAPI.modesSync(camera.name);
   *   for (const mode of modes) {
   *     console.log(`${mode.width}x${mode.height} @ ${mode.minFrameRate}-${mode.maxFrameRate} fps`);
   *   }
   * }
   * ```
   *
   * @see {@link modes} For async version
   */
  static modesSync(deviceName: string): DeviceMode[] {
    return Device.modesSync(deviceName);
  }

  /**
   * Open a camera device for capture.
   *
   * Creates a Demuxer for the specified video capture device.
   * Uses platform-specific format and device naming conventions.
   *
   * @param options - Camera capture options
   *
   * @returns Demuxer for the camera stream
   *
   * @throws {Error} If device cannot be opened
   *
   * @example
   * ```typescript
   * // Open first camera with default settings
   * await using input = await DeviceAPI.openCamera({ videoDevice: 0 });
   *
   * // Open with specific resolution and frame rate
   * await using input = await DeviceAPI.openCamera({
   *   videoDevice: 0,
   *   width: 1280,
   *   height: 720,
   *   frameRate: 30,
   * });
   *
   * // Open by device name
   * await using input = await DeviceAPI.openCamera({
   *   videoDevice: 'FaceTime HD Camera',
   * });
   * ```
   */
  static async openCamera(options: DeviceOptions = {}): Promise<Demuxer> {
    const format = Device.getVideoFormat();
    const deviceName = DeviceAPI.buildVideoDeviceName(options);
    const formatOptions = DeviceAPI.buildVideoFormatOptions(options);

    return Demuxer.open(deviceName, {
      format,
      options: formatOptions,
    });
  }

  /**
   * Open a camera device for capture synchronously.
   *
   * @param options - Camera capture options
   *
   * @returns Demuxer for the camera stream
   *
   * @example
   * ```typescript
   * using input = DeviceAPI.openCameraSync({ videoDevice: 0 });
   * ```
   *
   * @see {@link openCamera} For async version
   */
  static openCameraSync(options: DeviceOptions = {}): Demuxer {
    const format = Device.getVideoFormat();
    const deviceName = DeviceAPI.buildVideoDeviceName(options);
    const formatOptions = DeviceAPI.buildVideoFormatOptions(options);

    return Demuxer.openSync(deviceName, {
      format,
      options: formatOptions,
    });
  }

  /**
   * Open a microphone device for capture.
   *
   * Creates a Demuxer for the specified audio capture device.
   * Uses platform-specific format and device naming conventions.
   *
   * @param options - Microphone capture options
   *
   * @returns Demuxer for the audio stream
   *
   * @throws {Error} If device cannot be opened
   *
   * @example
   * ```typescript
   * // Open first microphone
   * await using input = await DeviceAPI.openMicrophone({ audioDevice: 0 });
   *
   * // Open with specific sample rate
   * await using input = await DeviceAPI.openMicrophone({
   *   audioDevice: 'default',
   *   sampleRate: 48000,
   *   channels: 2,
   * });
   * ```
   */
  static async openMicrophone(options: DeviceOptions = {}): Promise<Demuxer> {
    const format = Device.getAudioFormat();
    const deviceName = DeviceAPI.buildAudioDeviceName(options);
    const formatOptions = DeviceAPI.buildAudioFormatOptions(options);

    return Demuxer.open(deviceName, {
      format,
      options: formatOptions,
    });
  }

  /**
   * Open a microphone device for capture synchronously.
   *
   * @param options - Microphone capture options
   *
   * @returns Demuxer for the audio stream
   *
   * @example
   * ```typescript
   * using input = DeviceAPI.openMicrophoneSync({ audioDevice: 0 });
   * ```
   *
   * @see {@link openMicrophone} For async version
   */
  static openMicrophoneSync(options: DeviceOptions = {}): Demuxer {
    const format = Device.getAudioFormat();
    const deviceName = DeviceAPI.buildAudioDeviceName(options);
    const formatOptions = DeviceAPI.buildAudioFormatOptions(options);

    return Demuxer.openSync(deviceName, {
      format,
      options: formatOptions,
    });
  }

  /**
   * Open screen capture.
   *
   * Creates a Demuxer for screen/display capture.
   * Uses platform-specific format and capture conventions.
   *
   * @param options - Screen capture options
   *
   * @returns Demuxer for the screen capture stream
   *
   * @throws {Error} If screen capture cannot be opened
   *
   * @example
   * ```typescript
   * // Capture entire screen
   * await using input = await DeviceAPI.openScreen({
   *   frameRate: 30,
   * });
   *
   * // Capture specific region
   * await using input = await DeviceAPI.openScreen({
   *   x: 100,
   *   y: 100,
   *   width: 800,
   *   height: 600,
   *   frameRate: 30,
   * });
   *
   * // macOS: Capture specific screen
   * await using input = await DeviceAPI.openScreen({
   *   screenIndex: 1,  // Secondary display
   *   frameRate: 30,
   * });
   * ```
   */
  static async openScreen(options: ScreenCaptureOptions = {}): Promise<Demuxer> {
    const format = Device.getScreenFormat();
    const { deviceName, formatOptions } = DeviceAPI.buildScreenCaptureParams(options);

    // Pass SCK options on macOS (handled natively in avfoundation.m)
    if (process.platform === 'darwin') {
      if (options.captureSystemAudio) {
        formatOptions.capture_system_audio = '1';
      }
      if (options.excludeProcessAudio) {
        formatOptions.exclude_process_audio = '1';
      }
      if (options.audioSampleRate) {
        formatOptions.sck_audio_sample_rate = String(options.audioSampleRate);
      }
      if (options.audioChannels) {
        formatOptions.sck_audio_channels = String(options.audioChannels);
      }
      if (options.captureMouseClicks) {
        formatOptions.capture_mouse_clicks = '1';
      }
    }

    return Demuxer.open(deviceName, {
      format,
      options: formatOptions,
    });
  }

  /**
   * Open screen capture synchronously.
   *
   * @param options - Screen capture options
   *
   * @returns Demuxer for the screen capture stream
   *
   * @example
   * ```typescript
   * using input = DeviceAPI.openScreenSync({ frameRate: 30 });
   * ```
   *
   * @see {@link openScreen} For async version
   */
  static openScreenSync(options: ScreenCaptureOptions = {}): Demuxer {
    const format = Device.getScreenFormat();
    const { deviceName, formatOptions } = DeviceAPI.buildScreenCaptureParams(options);

    // Pass SCK options on macOS (handled natively in avfoundation.m)
    if (process.platform === 'darwin') {
      if (options.captureSystemAudio) {
        formatOptions.capture_system_audio = '1';
      }
      if (options.excludeProcessAudio) {
        formatOptions.exclude_process_audio = '1';
      }
      if (options.audioSampleRate) {
        formatOptions.sck_audio_sample_rate = String(options.audioSampleRate);
      }
      if (options.audioChannels) {
        formatOptions.sck_audio_channels = String(options.audioChannels);
      }
      if (options.captureMouseClicks) {
        formatOptions.capture_mouse_clicks = '1';
      }
    }

    return Demuxer.openSync(deviceName, {
      format,
      options: formatOptions,
    });
  }

  /**
   * Get the platform-specific input format for video devices.
   *
   * @returns Format name (avfoundation/v4l2/dshow)
   *
   * @example
   * ```typescript
   * const format = DeviceAPI.getVideoFormat();
   * // Returns 'avfoundation' on macOS, 'v4l2' on Linux, 'dshow' on Windows
   * ```
   */
  static getVideoFormat(): string {
    return Device.getVideoFormat();
  }

  /**
   * Get the platform-specific input format for audio devices.
   *
   * @returns Format name (avfoundation/alsa/dshow)
   *
   * @example
   * ```typescript
   * const format = DeviceAPI.getAudioFormat();
   * // Returns 'avfoundation' on macOS, 'alsa' on Linux, 'dshow' on Windows
   * ```
   */
  static getAudioFormat(): string {
    return Device.getAudioFormat();
  }

  /**
   * Get the platform-specific input format for screen capture.
   *
   * @returns Format name (avfoundation/xcbgrab/gdigrab)
   *
   * @example
   * ```typescript
   * const format = DeviceAPI.getScreenFormat();
   * // Returns 'avfoundation' on macOS, 'xcbgrab' on Linux, 'gdigrab' on Windows
   * ```
   */
  static getScreenFormat(): string {
    return Device.getScreenFormat();
  }

  /**
   * Check if the application has screen capture permission.
   *
   * On macOS 11+, uses `CGPreflightScreenCaptureAccess()` to check
   * whether the app has been granted screen recording permission.
   * Always returns `true` on Linux, Windows, and macOS < 11.
   *
   * @returns `true` if screen capture is permitted
   *
   * @example
   * ```typescript
   * if (!DeviceAPI.hasScreenCapturePermission()) {
   *   console.log('Screen capture permission not granted');
   *   DeviceAPI.requestScreenCaptureAccess(); // triggers system dialog
   * }
   * ```
   *
   * @see {@link requestScreenCaptureAccess} To trigger the permission dialog
   */
  static hasScreenCapturePermission(): boolean {
    return Device.hasScreenCapturePermission();
  }

  /**
   * Request screen capture permission from the user.
   *
   * On macOS 11+, uses `CGRequestScreenCaptureAccess()` to trigger
   * the system permission dialog if not already granted.
   * Always returns `true` on Linux, Windows, and macOS < 11.
   *
   * Note: This function returns immediately. If permission was not previously
   * granted, the system dialog is shown asynchronously. The return value
   * indicates whether permission was already granted at the time of the call,
   * not the result of the dialog.
   *
   * @returns `true` if permission was already granted
   *
   * @example
   * ```typescript
   * const alreadyGranted = DeviceAPI.requestScreenCaptureAccess();
   * if (!alreadyGranted) {
   *   console.log('Permission dialog shown — restart the app after granting access');
   * }
   * ```
   *
   * @see {@link hasScreenCapturePermission} To check current permission status
   */
  static requestScreenCaptureAccess(): boolean {
    return Device.requestScreenCaptureAccess();
  }

  /**
   * Build platform-specific video device name.
   *
   * @param options - Device options containing videoDevice
   *
   * @returns Platform-specific device name string
   *
   * @internal
   */
  private static buildVideoDeviceName(options: DeviceOptions): string {
    const device = options.videoDevice ?? 0;
    const format = Device.getVideoFormat();

    switch (format) {
      case 'avfoundation':
        // macOS: "index" or "device name"
        return typeof device === 'number' ? String(device) : device;

      case 'v4l2':
        // Linux: /dev/video0, /dev/video1, etc.
        return typeof device === 'number' ? `/dev/video${device}` : device;

      case 'dshow':
        // Windows: "video=Device Name"
        return typeof device === 'number' ? `video=${device}` : `video=${device}`;

      default:
        return String(device);
    }
  }

  /**
   * Build platform-specific audio device name.
   *
   * @param options - Device options containing audioDevice
   *
   * @returns Platform-specific device name string
   *
   * @internal
   */
  private static buildAudioDeviceName(options: DeviceOptions): string {
    const device = options.audioDevice ?? 0;
    const format = Device.getAudioFormat();

    switch (format) {
      case 'avfoundation':
        // macOS: ":index" or ":device name" (colon prefix for audio)
        return typeof device === 'number' ? `:${device}` : `:${device}`;

      case 'alsa':
        // Linux: "default", "hw:0", "hw:1", etc.
        if (typeof device === 'number') {
          return device === 0 ? 'default' : `hw:${device}`;
        }
        return device;

      case 'dshow':
        // Windows: "audio=Device Name"
        return typeof device === 'number' ? `audio=${device}` : `audio=${device}`;

      default:
        return String(device);
    }
  }

  /**
   * Build video format options.
   *
   * @param options - Device options containing video parameters
   *
   * @returns FFmpeg format options dictionary
   *
   * @internal
   */
  private static buildVideoFormatOptions(options: DeviceOptions): Record<string, string> {
    const formatOptions: Record<string, string> = {};

    if (options.frameRate) {
      formatOptions.framerate = String(options.frameRate);
    }
    if (options.width && options.height) {
      formatOptions.video_size = `${options.width}x${options.height}`;
    }
    // Default to nv12 on macOS avfoundation to ensure compatibility with common encoders
    const format = Device.getVideoFormat();
    formatOptions.pixel_format = options.pixelFormat ?? (format === 'avfoundation' ? 'nv12' : 'yuv420p');

    return formatOptions;
  }

  /**
   * Build audio format options.
   *
   * @param options - Device options containing audio parameters
   *
   * @returns FFmpeg format options dictionary
   *
   * @internal
   */
  private static buildAudioFormatOptions(options: DeviceOptions): Record<string, string> {
    const formatOptions: Record<string, string> = {};

    if (options.sampleRate) {
      formatOptions.sample_rate = String(options.sampleRate);
    }
    if (options.channels) {
      formatOptions.channels = String(options.channels);
    }

    return formatOptions;
  }

  /**
   * Build screen capture parameters.
   *
   * @param options - Screen capture options
   *
   * @returns Device name and format options for screen capture
   *
   * @internal
   */
  private static buildScreenCaptureParams(options: ScreenCaptureOptions): {
    deviceName: string;
    formatOptions: Record<string, string>;
  } {
    const format = Device.getScreenFormat();
    const formatOptions: Record<string, string> = {};
    let deviceName: string;

    switch (format) {
      case 'avfoundation':
        // macOS: "Capture screen 0", "Capture screen 1", etc.
        deviceName = `Capture screen ${options.screenIndex ?? 0}`;
        if (options.frameRate) {
          formatOptions.framerate = String(options.frameRate);
        }
        if (options.width && options.height) {
          formatOptions.video_size = `${options.width}x${options.height}`;
        }
        if (options.drawMouse !== undefined) {
          formatOptions.capture_cursor = options.drawMouse ? '1' : '0';
        }
        // Default to nv12 pixel format which is supported by both avfoundation and common encoders
        formatOptions.pixel_format = options.pixelFormat ?? 'nv12';
        break;

      case 'xcbgrab':
        // Linux: ":display.screen+x,y" (e.g., ":0.0+100,200")
        const display = options.display ?? ':0.0';
        const offset = options.x !== undefined || options.y !== undefined ? `+${options.x ?? 0},${options.y ?? 0}` : '';
        deviceName = `${display}${offset}`;
        if (options.frameRate) {
          formatOptions.framerate = String(options.frameRate);
        }
        if (options.width && options.height) {
          formatOptions.video_size = `${options.width}x${options.height}`;
        }
        if (options.drawMouse !== undefined) {
          formatOptions.draw_mouse = options.drawMouse ? '1' : '0';
        }
        break;

      case 'gdigrab':
        // Windows: "desktop" or "title=Window Title"
        if (options.windowTitle) {
          deviceName = `title=${options.windowTitle}`;
        } else {
          deviceName = 'desktop';
        }
        if (options.frameRate) {
          formatOptions.framerate = String(options.frameRate);
        }
        if (options.x !== undefined) {
          formatOptions.offset_x = String(options.x);
        }
        if (options.y !== undefined) {
          formatOptions.offset_y = String(options.y);
        }
        if (options.width && options.height) {
          formatOptions.video_size = `${options.width}x${options.height}`;
        }
        if (options.drawMouse !== undefined) {
          formatOptions.draw_mouse = options.drawMouse ? '1' : '0';
        }
        break;

      default:
        deviceName = 'desktop';
    }

    return { deviceName, formatOptions };
  }
}
