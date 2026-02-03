import { bindings } from './binding.js';

import type { AVLogLevel } from '../constants/constants.js';

/**
 * Log callback options for performance tuning.
 */
export interface LogOptions {
  maxLevel?: AVLogLevel; // Messages above this level are ignored
}

/**
 * FFmpeg logging control and configuration.
 *
 * Provides control over FFmpeg's internal logging system.
 * Allows setting log levels, custom callbacks, and formatting options.
 * Essential for debugging, monitoring, and error tracking in FFmpeg operations.
 *
 * Direct mapping to FFmpeg's logging API.
 *
 * @example
 * ```typescript
 * import { Log } from 'node-av';
 * import { AV_LOG_ERROR, AV_LOG_WARNING, AV_LOG_INFO, AV_LOG_DEBUG } from 'node-av/constants';
 *
 * // Set log level
 * Log.setLevel(AV_LOG_WARNING); // Only show warnings and errors
 *
 * // Get current log level
 * const level = Log.getLevel();
 * console.log(`Current log level: ${level}`);
 *
 * // Custom log callback
 * Log.setCallback((level, message) => {
 *   if (level <= AV_LOG_ERROR) {
 *     console.error(`FFmpeg Error: ${message}`);
 *   } else if (level <= AV_LOG_WARNING) {
 *     console.warn(`FFmpeg Warning: ${message}`);
 *   } else {
 *     console.log(`FFmpeg: ${message}`);
 *   }
 * }, {
 *   printPrefix: true,
 *   skipRepeated: true
 * });
 *
 * // Log a custom message
 * Log.log(AV_LOG_INFO, 'Custom log message');
 *
 * // Reset to default callback
 * Log.resetCallback();
 * ```
 *
 * @see [av_log](https://ffmpeg.org/doxygen/trunk/group__lavu__log.html) - FFmpeg Doxygen
 */
export class Log {
  /**
   * Set global log level.
   *
   * Sets the minimum log level for FFmpeg messages.
   * Messages below this level will be suppressed.
   *
   * Direct mapping to av_log_set_level().
   *
   * @param level - Minimum log level to display
   *
   * @example
   * ```typescript
   * import { AV_LOG_QUIET, AV_LOG_ERROR, AV_LOG_WARNING, AV_LOG_INFO } from 'node-av/constants';
   *
   * Log.setLevel(AV_LOG_QUIET);   // Disable all logging
   * Log.setLevel(AV_LOG_ERROR);   // Only errors
   * Log.setLevel(AV_LOG_WARNING); // Errors and warnings
   * Log.setLevel(AV_LOG_INFO);    // Errors, warnings, and info
   * ```
   */
  static setLevel(level: AVLogLevel): void {
    bindings.Log.setLevel(level);
  }

  /**
   * Get current log level.
   *
   * Returns the current minimum log level setting.
   *
   * Direct mapping to av_log_get_level().
   *
   * @returns Current log level
   *
   * @example
   * ```typescript
   * const level = Log.getLevel();
   * if (level <= AV_LOG_WARNING) {
   *   console.log('Logging warnings and above');
   * }
   * ```
   *
   * @see {@link setLevel} To change log level
   */
  static getLevel(): AVLogLevel {
    return bindings.Log.getLevel();
  }

  /**
   * Log a message.
   *
   * Sends a log message through FFmpeg's logging system.
   * The message will be processed according to current settings.
   *
   * Direct mapping to av_log().
   *
   * @param level - Log level for this message
   *
   * @param message - Message to log
   *
   * @example
   * ```typescript
   * import { AV_LOG_ERROR, AV_LOG_WARNING, AV_LOG_INFO } from 'node-av/constants';
   *
   * Log.log(AV_LOG_ERROR, 'Critical error occurred');
   * Log.log(AV_LOG_WARNING, 'Non-fatal warning');
   * Log.log(AV_LOG_INFO, 'Processing started');
   * ```
   */
  static log(level: AVLogLevel, message: string): void {
    bindings.Log.log(level, message);
  }

  /**
   * Set custom log callback.
   *
   * Installs a custom callback to handle FFmpeg log messages.
   * Allows redirecting logs to custom handlers or loggers.
   *
   * Direct mapping to av_log_set_callback().
   *
   * @param callback - Function to handle log messages, or null to remove
   *
   * @param options - Additional logging options
   *
   * @example
   * ```typescript
   * import { AV_LOG_ERROR, AV_LOG_WARNING } from 'node-av/constants';
   *
   * // Set custom callback with options
   * Log.setCallback((level, message) => {
   *   const timestamp = new Date().toISOString();
   *
   *   if (level <= AV_LOG_ERROR) {
   *     console.error(`[${timestamp}] ERROR: ${message}`);
   *   } else if (level <= AV_LOG_WARNING) {
   *     console.warn(`[${timestamp}] WARN: ${message}`);
   *   } else {
   *     console.log(`[${timestamp}] INFO: ${message}`);
   *   }
   * }, {
   *   printPrefix: true,    // Include context prefix
   *   skipRepeated: true,   // Skip repeated messages
   *   level: AV_LOG_WARNING // Filter level
   * });
   *
   * // Remove custom callback
   * Log.setCallback(null);
   * ```
   *
   * @see {@link resetCallback} To restore default
   */
  static setCallback(callback: ((level: AVLogLevel, message: string) => void) | null, options?: LogOptions): void {
    if (callback === null) {
      bindings.Log.setCallback(null);
    } else {
      bindings.Log.setCallback(callback, options);
    }
  }

  /**
   * Reset to default log callback.
   *
   * Restores the default FFmpeg logging behavior.
   * Removes any custom callback previously set.
   *
   * Direct mapping to av_log_set_callback() with default handler.
   *
   * @example
   * ```typescript
   * // After using custom callback
   * Log.resetCallback();
   * // Now using default FFmpeg logging
   * ```
   *
   * @see {@link setCallback} To set custom callback
   */
  static resetCallback(): void {
    bindings.Log.resetCallback();
  }
}
