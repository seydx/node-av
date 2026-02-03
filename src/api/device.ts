import { existsSync } from 'fs';

import { Device } from '../lib/device.js';
import { Demuxer } from './demuxer.js';

import type { AudioDeviceMode, DeviceInfo, DeviceMode } from '../lib/device.js';

/**
 * Options for opening a camera device.
 */
export interface CameraOptions {
  /** Video device name or index (0-based) */
  videoDevice?: string | number;
  /** Video frame rate */
  frameRate?: number;
  /** Video resolution width */
  width?: number;
  /** Video resolution height */
  height?: number;
  /** Pixel format (e.g., 'nv12', 'yuyv422'). Only sent when explicitly set. */
  pixelFormat?: string;

  /** macOS AVFoundation-specific options */
  avfoundation?: {
    /** Capture raw device data (e.g., DV from tape-based camcorders) */
    captureRawData?: boolean;
  };

  /** Linux V4L2-specific options */
  v4l2?: {
    /** Preferred input format/codec (e.g., 'mjpeg', 'h264') */
    inputFormat?: string;
  };

  /** Windows DirectShow-specific options */
  dshow?: {
    /** Device number for devices with the same name (starts at 0) */
    videoDeviceNumber?: number;
    /** Select video capture pin by name */
    videoPinName?: string;
  };

  /** Additional FFmpeg format options passed directly */
  formatOptions?: Record<string, string>;
}

/**
 * Options for opening a microphone device.
 */
export interface MicrophoneOptions {
  /** Audio device name or index (0-based) */
  audioDevice?: string | number;
  /** Audio sample rate in Hz */
  sampleRate?: number;
  /** Number of audio channels */
  channels?: number;

  /** Linux ALSA-specific options */
  alsa?: {
    /** Path to ALSA configuration file (overrides auto-detection) */
    configPath?: string;
  };

  /** Windows DirectShow-specific options */
  dshow?: {
    /** Audio sample size in bits (8 or 16) */
    sampleSize?: number;
    /** Device number for devices with the same name (starts at 0) */
    audioDeviceNumber?: number;
    /** Select audio capture pin by name */
    audioPinName?: string;
    /** Audio buffer size in milliseconds */
    audioBufferSize?: number;
  };

  /** Additional FFmpeg format options passed directly */
  formatOptions?: Record<string, string>;
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
  /** Pixel format */
  pixelFormat?: string;

  /** macOS AVFoundation-specific options */
  avfoundation?: {
    /** Screen index (0 = main display) */
    screenIndex?: number;
    /** Capture mouse click animations (macOS 15.0+) */
    captureMouseClicks?: boolean;
    /** Capture system/desktop audio via ScreenCaptureKit (macOS 13.0+) */
    captureSystemAudio?: boolean;
    /** Exclude current process audio from system audio capture */
    excludeProcessAudio?: boolean;
    /** System audio sample rate (8000, 16000, 24000, 48000). Default: 48000 */
    audioSampleRate?: 8000 | 16000 | 24000 | 48000;
    /** System audio channels (1=mono, 2=stereo). Default: 2 */
    audioChannels?: 1 | 2;
  };

  /** Linux X11-specific options */
  x11grab?: {
    /** Display identifier (e.g., ':0.0') */
    display?: string;
    /** Capture specific window by X11 window ID */
    windowId?: number;
    /** Follow mouse ('centered' or pixel distance from edge) */
    followMouse?: 'centered' | number;
    /** Show grabbed region border on screen */
    showRegion?: boolean;
    /** Prompt user to graphically select capture region */
    selectRegion?: boolean;
  };

  /** Windows GDI-specific options */
  gdigrab?: {
    /** Window title to capture instead of desktop */
    windowTitle?: string;
    /** Window handle (HWND) to capture */
    windowHandle?: number;
    /** Show grabbed region border on screen */
    showRegion?: boolean;
  };

  /** Additional FFmpeg format options passed directly */
  formatOptions?: Record<string, string>;
}

/**
 * Options for combined video + audio device capture.
 */
export interface DeviceOptions {
  /** Video device name or index */
  videoDevice?: string | number;
  /** Audio device name or index */
  audioDevice?: string | number;
  /** Video frame rate */
  frameRate?: number;
  /** Video resolution width */
  width?: number;
  /** Video resolution height */
  height?: number;
  /** Pixel format */
  pixelFormat?: string;
  /** Audio sample rate in Hz */
  sampleRate?: number;
  /** Number of audio channels */
  channels?: number;

  /** macOS AVFoundation-specific options */
  avfoundation?: {
    /** Capture raw device data */
    captureRawData?: boolean;
  };

  /** Windows DirectShow-specific options */
  dshow?: {
    /** Video device number for devices with same name */
    videoDeviceNumber?: number;
    /** Audio device number for devices with same name */
    audioDeviceNumber?: number;
    /** Select video capture pin by name */
    videoPinName?: string;
    /** Select audio capture pin by name */
    audioPinName?: string;
    /** Audio buffer size in milliseconds */
    audioBufferSize?: number;
  };

  /** Additional FFmpeg format options passed directly */
  formatOptions?: Record<string, string>;
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
   * // macOS: Capture specific screen
   * await using input = await DeviceAPI.openScreen({
   *   avfoundation: { screenIndex: 1 },
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
    if (options.pixelFormat) {
      formatOptions.pixel_format = options.pixelFormat;
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
    if (options.pixelFormat) {
      formatOptions.pixel_format = options.pixelFormat;
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

    switch (format) {
      case 'avfoundation': {
        deviceName = `Capture screen ${options.avfoundation?.screenIndex ?? 0}`;
        if (options.frameRate) {
          formatOptions.framerate = String(options.frameRate);
        }
        if (options.width && options.height) {
          formatOptions.video_size = `${options.width}x${options.height}`;
        }
        if (options.drawMouse !== undefined) {
          formatOptions.capture_cursor = options.drawMouse ? '1' : '0';
        }
        if (options.pixelFormat) {
          formatOptions.pixel_format = options.pixelFormat;
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
        // X11-specific
        if (options.x11grab?.windowId !== undefined) {
          formatOptions.window_id = String(options.x11grab.windowId);
        }
        if (options.x11grab?.followMouse !== undefined) {
          formatOptions.follow_mouse = typeof options.x11grab.followMouse === 'number' ? String(options.x11grab.followMouse) : options.x11grab.followMouse;
        }
        if (options.x11grab?.showRegion) {
          formatOptions.show_region = '1';
        }
        if (options.x11grab?.selectRegion) {
          formatOptions.select_region = '1';
        }
        break;
      }

      case 'gdigrab': {
        if (options.gdigrab?.windowTitle) {
          deviceName = `title=${options.gdigrab.windowTitle}`;
        } else if (options.gdigrab?.windowHandle !== undefined) {
          deviceName = `hwnd=${options.gdigrab.windowHandle}`;
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
