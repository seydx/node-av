import { existsSync } from 'fs';

import { Device } from '../lib/device.js';
import { avGetPixFmtName } from '../lib/utilities.js';
import { Demuxer } from './demuxer.js';

import type { AVPixelFormat } from '../constants/constants.js';
import type { FFVideoDecoder } from '../constants/decoders.js';
import type { AudioDeviceMode, DeviceInfo, DeviceMode, ScreenBounds } from '../lib/device.js';

/**
 * Options for opening a camera device.
 */
export interface CameraOptions {
  videoDevice?: string | number;
  frameRate?: number;
  width?: number;
  height?: number;
  pixelFormat?: AVPixelFormat;
  avfoundation?: {
    captureRawData?: boolean;
  };
  v4l2?: {
    inputFormat?: FFVideoDecoder;
  };
  dshow?: {
    videoDeviceNumber?: number;
    videoPinName?: string;
  };
  formatOptions?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Options for opening a microphone device.
 */
export interface MicrophoneOptions {
  audioDevice?: string | number;
  sampleRate?: number;
  channels?: number;
  alsa?: {
    configPath?: string;
  };
  dshow?: {
    sampleSize?: number;
    audioDeviceNumber?: number;
    audioPinName?: string;
    audioBufferSize?: number;
  };
  formatOptions?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Options for screen capture.
 */
export interface ScreenCaptureOptions {
  screenIndex?: number;
  windowId?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  drawMouse?: boolean;
  pixelFormat?: AVPixelFormat;
  avfoundation?: {
    captureMouseClicks?: boolean;
    captureSystemAudio?: boolean;
    excludeProcessAudio?: boolean;
    audioSampleRate?: 8000 | 16000 | 24000 | 48000;
    audioChannels?: 1 | 2;
  };
  x11grab?: {
    display?: string;
    followMouse?: 'centered' | number;
    showRegion?: boolean;
  };
  gdigrab?: {
    windowTitle?: string;
    showRegion?: boolean;
  };
  formatOptions?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Options for combined video + audio device capture.
 */
export interface DeviceOptions {
  videoDevice?: string | number;
  audioDevice?: string | number;
  frameRate?: number;
  width?: number;
  height?: number;
  pixelFormat?: AVPixelFormat;
  sampleRate?: number;
  channels?: number;
  avfoundation?: {
    captureRawData?: boolean;
  };
  dshow?: {
    videoDeviceNumber?: number;
    audioDeviceNumber?: number;
    videoPinName?: string;
    audioPinName?: string;
    audioBufferSize?: number;
  };
  formatOptions?: Record<string, string | number | boolean | undefined | null>;
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
 *
 * // Combined video + audio capture
 * await using input = await DeviceAPI.openDevice({
 *   videoDevice: 0,
 *   audioDevice: 0,
 *   width: 1280,
 *   height: 720,
 *   frameRate: 30,
 * });
 * ```
 *
 * @see {@link CameraOptions} For camera options
 * @see {@link MicrophoneOptions} For microphone options
 * @see {@link ScreenCaptureOptions} For screen capture options
 * @see {@link DeviceOptions} For combined video+audio capture options
 * @see {@link Demuxer} For processing captured streams
 */
/**
 * Standard ALSA configuration file search paths (same order as ALSA's configure.ac).
 *
 * @internal
 */
const ALSA_CONFIG_SEARCH_PATHS = ['/usr/share/alsa/alsa.conf', '/usr/local/share/alsa/alsa.conf', '/etc/alsa/alsa.conf'];

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
    DeviceAPI.ensureAlsaConfig();
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
    DeviceAPI.ensureAlsaConfig();
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
   * Query supported audio capture modes for an audio device.
   *
   * Returns supported sample rates, channel counts and sample formats,
   * sorted descending by sample rate, then by channel count.
   *
   * @param deviceName - Device name as returned by `list()` (e.g. uniqueID on macOS)
   *
   * @returns Array of supported audio device modes
   *
   * @example
   * ```typescript
   * const devices = await DeviceAPI.list();
   * const mic = devices.find(d => d.type === 'audio');
   * if (mic) {
   *   const modes = await DeviceAPI.audioModes(mic.name);
   *   for (const mode of modes) {
   *     console.log(`${mode.sampleRate}Hz ${mode.channels}ch`);
   *   }
   * }
   * ```
   *
   * @see {@link audioModesSync} For sync version
   */
  static async audioModes(deviceName: string): Promise<AudioDeviceMode[]> {
    DeviceAPI.ensureAlsaConfig();
    return Device.audioModes(deviceName);
  }

  /**
   * Query supported audio capture modes for an audio device synchronously.
   *
   * @param deviceName - Device name as returned by `listSync()`
   *
   * @returns Array of supported audio device modes
   *
   * @example
   * ```typescript
   * const devices = DeviceAPI.listSync();
   * const mic = devices.find(d => d.type === 'audio');
   * if (mic) {
   *   const modes = DeviceAPI.audioModesSync(mic.name);
   *   for (const mode of modes) {
   *     console.log(`${mode.sampleRate}Hz ${mode.channels}ch`);
   *   }
   * }
   * ```
   *
   * @see {@link audioModes} For async version
   */
  static audioModesSync(deviceName: string): AudioDeviceMode[] {
    DeviceAPI.ensureAlsaConfig();
    return Device.audioModesSync(deviceName);
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
  static async openCamera(options: CameraOptions = {}): Promise<Demuxer> {
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
  static openCameraSync(options: CameraOptions = {}): Demuxer {
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
  static async openMicrophone(options: MicrophoneOptions = {}): Promise<Demuxer> {
    DeviceAPI.ensureAlsaConfig(options.alsa?.configPath);
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
  static openMicrophoneSync(options: MicrophoneOptions = {}): Demuxer {
    DeviceAPI.ensureAlsaConfig(options.alsa?.configPath);
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
   * // Capture specific screen (works cross-platform)
   * await using input = await DeviceAPI.openScreen({
   *   screenIndex: 1,
   *   frameRate: 30,
   * });
   * ```
   */
  static async openScreen(options: ScreenCaptureOptions = {}): Promise<Demuxer> {
    const format = Device.getScreenFormat();
    const { deviceName, formatOptions } = DeviceAPI.buildScreenCaptureParams(options);

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

    return Demuxer.openSync(deviceName, {
      format,
      options: formatOptions,
    });
  }

  /**
   * Open a combined video + audio device for capture.
   *
   * Creates a single Demuxer that captures both video and audio simultaneously.
   * Supported on macOS (AVFoundation) and Windows (DirectShow).
   * Not supported on Linux — use separate `openCamera()` and `openMicrophone()` calls instead.
   *
   * @param options - Combined device capture options
   *
   * @returns Demuxer for the combined video + audio stream
   *
   * @throws {Error} If devices cannot be opened or platform does not support combined capture
   *
   * @example
   * ```typescript
   * await using input = await DeviceAPI.openDevice({
   *   videoDevice: 0,
   *   audioDevice: 0,
   *   width: 1280,
   *   height: 720,
   *   frameRate: 30,
   *   sampleRate: 48000,
   *   channels: 2,
   * });
   * ```
   */
  static async openDevice(options: DeviceOptions): Promise<Demuxer> {
    const format = Device.getVideoFormat();
    const deviceName = DeviceAPI.buildCombinedDeviceName(options);
    const formatOptions = DeviceAPI.buildDeviceFormatOptions(options);

    return Demuxer.open(deviceName, {
      format,
      options: formatOptions,
    });
  }

  /**
   * Open a combined video + audio device for capture synchronously.
   *
   * @param options - Combined device capture options
   *
   * @returns Demuxer for the combined video + audio stream
   *
   * @example
   * ```typescript
   * using input = DeviceAPI.openDeviceSync({
   *   videoDevice: 0,
   *   audioDevice: 0,
   * });
   * ```
   *
   * @see {@link openDevice} For async version
   */
  static openDeviceSync(options: DeviceOptions): Demuxer {
    const format = Device.getVideoFormat();
    const deviceName = DeviceAPI.buildCombinedDeviceName(options);
    const formatOptions = DeviceAPI.buildDeviceFormatOptions(options);

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
   * @returns Format name (avfoundation/x11grab/gdigrab)
   *
   * @example
   * ```typescript
   * const format = DeviceAPI.getScreenFormat();
   * // Returns 'avfoundation' on macOS, 'x11grab' on Linux, 'gdigrab' on Windows
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
   * @param options - Camera options containing videoDevice
   *
   * @returns Platform-specific device name string
   *
   * @internal
   */
  private static buildVideoDeviceName(options: CameraOptions): string {
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
   * @param options - Microphone options containing audioDevice
   *
   * @returns Platform-specific device name string
   *
   * @internal
   */
  private static buildAudioDeviceName(options: MicrophoneOptions): string {
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
   * Build platform-specific combined video + audio device name.
   *
   * @param options - Device options containing videoDevice and audioDevice
   *
   * @returns Platform-specific combined device name string
   *
   * @internal
   */
  private static buildCombinedDeviceName(options: DeviceOptions): string {
    const video = options.videoDevice ?? 0;
    const audio = options.audioDevice ?? 0;
    const format = Device.getVideoFormat();

    switch (format) {
      case 'avfoundation':
        return `${video}:${audio}`;

      case 'dshow':
        return `video=${video}:audio=${audio}`;

      default:
        throw new Error('Combined video+audio capture is not supported on Linux. ' + 'Use separate openCamera() and openMicrophone() calls.');
    }
  }

  /**
   * Build video format options.
   *
   * @param options - Camera options containing video parameters
   *
   * @returns FFmpeg format options dictionary
   *
   * @internal
   */
  private static buildVideoFormatOptions(options: CameraOptions): Record<string, string> {
    const formatOptions: Record<string, string> = {};
    const format = Device.getVideoFormat();

    if (options.frameRate) {
      formatOptions.framerate = String(options.frameRate);
    }
    if (options.width && options.height) {
      formatOptions.video_size = `${options.width}x${options.height}`;
    }
    if (options.pixelFormat !== undefined) {
      const name = avGetPixFmtName(options.pixelFormat);
      if (name) formatOptions.pixel_format = name;
    } else if (format === 'avfoundation') {
      formatOptions.pixel_format = 'nv12';
    }

    // Platform-specific
    if (format === 'avfoundation' && options.avfoundation) {
      if (options.avfoundation.captureRawData) {
        formatOptions.capture_raw_data = 'true';
      }
    }
    if (format === 'v4l2' && options.v4l2) {
      if (options.v4l2.inputFormat) {
        formatOptions.input_format = options.v4l2.inputFormat;
      }
    }
    if (format === 'dshow' && options.dshow) {
      if (options.dshow.videoDeviceNumber !== undefined) {
        formatOptions.video_device_number = String(options.dshow.videoDeviceNumber);
      }
      if (options.dshow.videoPinName) {
        formatOptions.video_pin_name = options.dshow.videoPinName;
      }
    }

    // Escape hatch
    if (options.formatOptions) {
      Object.assign(formatOptions, options.formatOptions);
    }

    return formatOptions;
  }

  /**
   * Build audio format options.
   *
   * @param options - Microphone options containing audio parameters
   *
   * @returns FFmpeg format options dictionary
   *
   * @internal
   */
  private static buildAudioFormatOptions(options: MicrophoneOptions): Record<string, string> {
    const formatOptions: Record<string, string> = {};
    const format = Device.getAudioFormat();

    if (options.sampleRate) {
      formatOptions.sample_rate = String(options.sampleRate);
    }
    if (options.channels) {
      formatOptions.channels = String(options.channels);
    }

    // Platform-specific (dshow)
    if (format === 'dshow' && options.dshow) {
      if (options.dshow.sampleSize) {
        formatOptions.sample_size = String(options.dshow.sampleSize);
      }
      if (options.dshow.audioDeviceNumber !== undefined) {
        formatOptions.audio_device_number = String(options.dshow.audioDeviceNumber);
      }
      if (options.dshow.audioPinName) {
        formatOptions.audio_pin_name = options.dshow.audioPinName;
      }
      if (options.dshow.audioBufferSize) {
        formatOptions.audio_buffer_size = String(options.dshow.audioBufferSize);
      }
    }

    // Escape hatch
    if (options.formatOptions) {
      Object.assign(formatOptions, options.formatOptions);
    }

    return formatOptions;
  }

  /**
   * Build combined video + audio format options.
   *
   * @param options - Device options containing both video and audio parameters
   *
   * @returns FFmpeg format options dictionary
   *
   * @internal
   */
  private static buildDeviceFormatOptions(options: DeviceOptions): Record<string, string> {
    const formatOptions: Record<string, string> = {};
    const format = Device.getVideoFormat();

    // Video
    if (options.frameRate) {
      formatOptions.framerate = String(options.frameRate);
    }
    if (options.width && options.height) {
      formatOptions.video_size = `${options.width}x${options.height}`;
    }
    if (options.pixelFormat !== undefined) {
      const name = avGetPixFmtName(options.pixelFormat);
      if (name) formatOptions.pixel_format = name;
    } else if (format === 'avfoundation') {
      formatOptions.pixel_format = 'nv12';
    }

    // Audio
    if (options.sampleRate) {
      formatOptions.sample_rate = String(options.sampleRate);
    }
    if (options.channels) {
      formatOptions.channels = String(options.channels);
    }

    // Platform-specific
    if (format === 'avfoundation' && options.avfoundation?.captureRawData) {
      formatOptions.capture_raw_data = 'true';
    }
    if (format === 'dshow' && options.dshow) {
      if (options.dshow.videoDeviceNumber !== undefined) {
        formatOptions.video_device_number = String(options.dshow.videoDeviceNumber);
      }
      if (options.dshow.audioDeviceNumber !== undefined) {
        formatOptions.audio_device_number = String(options.dshow.audioDeviceNumber);
      }
      if (options.dshow.videoPinName) {
        formatOptions.video_pin_name = options.dshow.videoPinName;
      }
      if (options.dshow.audioPinName) {
        formatOptions.audio_pin_name = options.dshow.audioPinName;
      }
      if (options.dshow.audioBufferSize) {
        formatOptions.audio_buffer_size = String(options.dshow.audioBufferSize);
      }
    }

    // Escape hatch
    if (options.formatOptions) {
      Object.assign(formatOptions, options.formatOptions);
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

    // Resolve screen bounds from screenIndex if provided
    const screenBounds = DeviceAPI.resolveScreenBounds(options.screenIndex);

    switch (format) {
      case 'avfoundation': {
        const screenIdx = options.screenIndex ?? 0;
        deviceName = `Capture screen ${screenIdx}`;
        if (options.frameRate) {
          formatOptions.framerate = String(options.frameRate);
        }
        if (options.width && options.height) {
          formatOptions.video_size = `${options.width}x${options.height}`;
        }
        if (options.drawMouse !== undefined) {
          formatOptions.capture_cursor = options.drawMouse ? '1' : '0';
        }
        if (options.pixelFormat !== undefined) {
          const name = avGetPixFmtName(options.pixelFormat);
          if (name) formatOptions.pixel_format = name;
        }
        // Window capture via ScreenCaptureKit
        if (options.windowId !== undefined) {
          formatOptions.capture_window_id = String(options.windowId);
        }
        // AVFoundation-specific
        if (options.avfoundation?.captureMouseClicks) {
          formatOptions.capture_mouse_clicks = '1';
        }
        if (options.avfoundation?.captureSystemAudio) {
          formatOptions.capture_system_audio = '1';
        }
        if (options.avfoundation?.excludeProcessAudio) {
          formatOptions.exclude_process_audio = '1';
        }
        if (options.avfoundation?.audioSampleRate) {
          formatOptions.sck_audio_sample_rate = String(options.avfoundation.audioSampleRate);
        }
        if (options.avfoundation?.audioChannels) {
          formatOptions.sck_audio_channels = String(options.avfoundation.audioChannels);
        }
        break;
      }

      case 'x11grab': {
        const display = options.x11grab?.display ?? ':0.0';
        // Use screen bounds offset if screenIndex is set, otherwise use manual x/y
        const offsetX = screenBounds ? screenBounds.x : (options.x ?? 0);
        const offsetY = screenBounds ? screenBounds.y : (options.y ?? 0);
        const hasOffset = screenBounds !== undefined || options.x !== undefined || options.y !== undefined;
        const offset = hasOffset ? `+${offsetX},${offsetY}` : '';
        deviceName = `${display}${offset}`;
        if (options.frameRate) {
          formatOptions.framerate = String(options.frameRate);
        }
        // Use screen bounds for video_size if screenIndex is set and no explicit size
        if (options.width && options.height) {
          formatOptions.video_size = `${options.width}x${options.height}`;
        } else if (screenBounds && screenBounds.width > 0 && screenBounds.height > 0) {
          formatOptions.video_size = `${screenBounds.width}x${screenBounds.height}`;
        }
        if (options.drawMouse !== undefined) {
          formatOptions.draw_mouse = options.drawMouse ? '1' : '0';
        }
        // Window capture
        if (options.windowId !== undefined) {
          formatOptions.window_id = String(options.windowId);
        }
        if (options.x11grab?.showRegion) {
          formatOptions.show_region = '1';
        }
        // X11-specific
        if (options.x11grab?.followMouse !== undefined) {
          formatOptions.follow_mouse = typeof options.x11grab.followMouse === 'number' ? String(options.x11grab.followMouse) : options.x11grab.followMouse;
        }
        break;
      }

      case 'gdigrab': {
        if (options.windowId !== undefined) {
          deviceName = `hwnd=${options.windowId}`;
        } else if (options.gdigrab?.windowTitle) {
          deviceName = `title=${options.gdigrab.windowTitle}`;
        } else {
          deviceName = 'desktop';
        }
        if (options.frameRate) {
          formatOptions.framerate = String(options.frameRate);
        }
        // Use screen bounds for offset/size if screenIndex is set
        if (screenBounds) {
          formatOptions.offset_x = String(screenBounds.x);
          formatOptions.offset_y = String(screenBounds.y);
          if (!options.width && !options.height && screenBounds.width > 0 && screenBounds.height > 0) {
            formatOptions.video_size = `${screenBounds.width}x${screenBounds.height}`;
          }
        } else {
          if (options.x !== undefined) {
            formatOptions.offset_x = String(options.x);
          }
          if (options.y !== undefined) {
            formatOptions.offset_y = String(options.y);
          }
        }
        if (options.width && options.height) {
          formatOptions.video_size = `${options.width}x${options.height}`;
        }
        if (options.drawMouse !== undefined) {
          formatOptions.draw_mouse = options.drawMouse ? '1' : '0';
        }
        if (options.gdigrab?.showRegion) {
          formatOptions.show_region = '1';
        }
        break;
      }

      default:
        deviceName = 'desktop';
    }

    // Escape hatch
    if (options.formatOptions) {
      Object.assign(formatOptions, options.formatOptions);
    }

    return { deviceName, formatOptions };
  }

  /**
   * Resolve screen bounds for a given screen index.
   *
   * @param screenIndex - 0-based screen index
   *
   * @returns Screen bounds or undefined if not found
   *
   * @internal
   */
  private static resolveScreenBounds(screenIndex: number | undefined): ScreenBounds | undefined {
    if (screenIndex === undefined) return undefined;

    const devices = Device.listSync();
    const screens = devices.filter((d) => d.type === 'screen');
    if (screenIndex < 0 || screenIndex >= screens.length) return undefined;

    return screens[screenIndex].bounds;
  }

  /**
   * Ensure ALSA configuration is available on Linux.
   *
   * Auto-detects the ALSA configuration file from standard paths and sets
   * `ALSA_CONFIG_PATH` if not already defined. This ensures ALSA can find
   * its configuration even if it is installed at a non-standard location.
   *
   * @param configPath - Optional explicit path to alsa.conf
   *
   * @internal
   */
  private static ensureAlsaConfig(configPath?: string): void {
    if (process.platform !== 'linux') return;
    if (process.env.ALSA_CONFIG_PATH) return;

    if (configPath) {
      process.env.ALSA_CONFIG_PATH = configPath;
      return;
    }

    for (const searchPath of ALSA_CONFIG_SEARCH_PATHS) {
      if (existsSync(searchPath)) {
        process.env.ALSA_CONFIG_PATH = searchPath;
        return;
      }
    }
  }
}
