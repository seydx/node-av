import { bindings } from './binding.js';

import type { NativeDeviceInfo, NativeDeviceMode } from './native-types.js';

/**
 * Device information for capture devices.
 */
export interface DeviceInfo {
  /** Device name or identifier */
  name: string;
  /** Device description or friendly name */
  description: string;
  /** Device type */
  type: 'video' | 'audio';
  /** Whether this is the default device */
  isDefault: boolean;
}

/**
 * Device capture mode (resolution + frame rate range).
 */
export interface DeviceMode {
  /** Resolution width in pixels */
  width: number;
  /** Resolution height in pixels */
  height: number;
  /** Minimum supported frame rate */
  minFrameRate: number;
  /** Maximum supported frame rate */
  maxFrameRate: number;
}

/**
 * Low-level device enumeration and format detection.
 *
 * Provides direct access to system capture devices (cameras, microphones)
 * and platform-specific input format names for FFmpeg.
 *
 * Direct mapping to platform-specific APIs:
 * - macOS: AVFoundation
 * - Linux: V4L2/ALSA
 * - Windows: DirectShow
 *
 * @example
 * ```typescript
 * import { Device } from 'node-av/lib';
 *
 * // List all capture devices
 * const devices = await Device.list();
 * for (const device of devices) {
 *   console.log(`[${device.type}] ${device.name}: ${device.description}`);
 * }
 *
 * // Get platform-specific format names
 * console.log(`Video format: ${Device.getVideoFormat()}`);
 * console.log(`Audio format: ${Device.getAudioFormat()}`);
 * console.log(`Screen format: ${Device.getScreenFormat()}`);
 * ```
 *
 * @see {@link DeviceInfo} For device structure
 */
export class Device {
  /**
   * List all available capture devices.
   *
   * Enumerates video and audio capture devices on the system.
   * Uses platform-specific APIs for device discovery.
   *
   * @returns Array of device information
   *
   * @example
   * ```typescript
   * const devices = await Device.list();
   * const cameras = devices.filter(d => d.type === 'video');
   * const microphones = devices.filter(d => d.type === 'audio');
   * ```
   */
  static async list(): Promise<DeviceInfo[]> {
    const nativeDevices = await bindings.Device.listDevices();
    return nativeDevices.map((d: NativeDeviceInfo) => ({
      name: d.name,
      description: d.description,
      type: d.type,
      isDefault: d.isDefault,
    }));
  }

  /**
   * List all available capture devices synchronously.
   *
   * @returns Array of device information
   *
   * @example
   * ```typescript
   * const devices = Device.listSync();
   * ```
   *
   * @see {@link list} For async version
   */
  static listSync(): DeviceInfo[] {
    const nativeDevices = bindings.Device.listDevicesSync();
    return nativeDevices.map((d: NativeDeviceInfo) => ({
      name: d.name,
      description: d.description,
      type: d.type,
      isDefault: d.isDefault,
    }));
  }

  /**
   * Query supported capture modes for a video device.
   *
   * Returns supported resolutions and frame rate ranges for the specified device.
   * Modes are sorted descending by resolution (area), then by max frame rate.
   *
   * @param deviceName - Device name as returned by `list()` (e.g. uniqueID on macOS, /dev/video0 on Linux)
   *
   * @returns Array of supported device modes
   *
   * @example
   * ```typescript
   * const devices = await Device.list();
   * const camera = devices.find(d => d.type === 'video');
   * if (camera) {
   *   const modes = await Device.modes(camera.name);
   *   console.log('Supported modes:', modes);
   * }
   * ```
   */
  static async modes(deviceName: string): Promise<DeviceMode[]> {
    const nativeModes = await bindings.Device.listDeviceModes(deviceName);
    return nativeModes.map((m: NativeDeviceMode) => ({
      width: m.width,
      height: m.height,
      minFrameRate: m.minFrameRate,
      maxFrameRate: m.maxFrameRate,
    }));
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
   * const devices = Device.listSync();
   * const camera = devices.find(d => d.type === 'video');
   * if (camera) {
   *   const modes = Device.modesSync(camera.name);
   *   console.log('Supported modes:', modes);
   * }
   * ```
   *
   * @see {@link modes} For async version
   */
  static modesSync(deviceName: string): DeviceMode[] {
    const nativeModes = bindings.Device.listDeviceModesSync(deviceName);
    return nativeModes.map((m: NativeDeviceMode) => ({
      width: m.width,
      height: m.height,
      minFrameRate: m.minFrameRate,
      maxFrameRate: m.maxFrameRate,
    }));
  }

  /**
   * Get platform-specific video input format name.
   *
   * @returns Format name for FFmpeg input
   *
   * | Platform | Format |
   * |----------|--------|
   * | macOS    | avfoundation |
   * | Linux    | v4l2 |
   * | Windows  | dshow |
   *
   * @example
   * ```typescript
   * const format = Device.getVideoFormat();
   * // Use with Demuxer.open(deviceName, { format })
   * ```
   */
  static getVideoFormat(): string {
    return bindings.Device.getVideoFormat();
  }

  /**
   * Get platform-specific audio input format name.
   *
   * @returns Format name for FFmpeg input
   *
   * | Platform | Format |
   * |----------|--------|
   * | macOS    | avfoundation |
   * | Linux    | alsa |
   * | Windows  | dshow |
   *
   * @example
   * ```typescript
   * const format = Device.getAudioFormat(); // 'avfoundation' on macOS
   * ```
   */
  static getAudioFormat(): string {
    return bindings.Device.getAudioFormat();
  }

  /**
   * Get platform-specific screen capture format name.
   *
   * @returns Format name for FFmpeg input
   *
   * | Platform | Format |
   * |----------|--------|
   * | macOS    | avfoundation |
   * | Linux    | x11grab |
   * | Windows  | gdigrab |
   *
   * @example
   * ```typescript
   * const format = Device.getScreenFormat(); // 'avfoundation' on macOS
   * ```
   */
  static getScreenFormat(): string {
    return bindings.Device.getScreenFormat();
  }

  /**
   * Check if the application has screen capture permission (macOS only).
   *
   * Uses `CGPreflightScreenCaptureAccess()` on macOS 11+.
   * Always returns `true` on Linux, Windows, and macOS < 11.
   *
   * @returns `true` if screen capture is permitted
   *
   * @example
   * ```typescript
   * if (Device.hasScreenCapturePermission()) {
   *   console.log('Screen capture is permitted');
   * } else {
   *   console.log('Screen capture permission not granted');
   * }
   * ```
   */
  static hasScreenCapturePermission(): boolean {
    return bindings.Device.hasScreenCapturePermission();
  }

  /**
   * Request screen capture permission from the user (macOS only).
   *
   * Uses `CGRequestScreenCaptureAccess()` on macOS 11+.
   * This will trigger the system permission dialog if not already granted.
   * Always returns `true` on Linux, Windows, and macOS < 11.
   *
   * @returns `true` if permission was already granted (does not wait for dialog)
   *
   * @example
   * ```typescript
   * const granted = Device.requestScreenCaptureAccess();
   * if (granted) {
   *   console.log('Screen capture permission already granted');
   * } else {
   *   console.log('Screen capture permission dialog shown to user');
   * }
   * ```
   */
  static requestScreenCaptureAccess(): boolean {
    return bindings.Device.requestScreenCaptureAccess();
  }
}
