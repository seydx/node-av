import { createWriteStream, existsSync } from 'node:fs';
import { access, constants, mkdir, rename, unlink } from 'node:fs/promises';
import { Agent, get } from 'node:https';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { IncomingMessage } from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Download error carrying the HTTP status (and a numeric Retry-After, when sent)
 * so the retry logic can tell transient failures from permanent ones.
 *
 * @internal
 */
class DownloadHttpError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

/**
 * Model type for Whisper downloads
 */
export type WhisperModelType = 'ggml' | 'vad';

/**
 * Options for downloading a Whisper model
 */
export interface DownloadOptions {
  model: WhisperModelName | WhisperVADModelName;
  outputPath?: string;
  type?: WhisperModelType;
}

/**
 * Standard GGML Whisper models
 */
export const WHISPER_MODELS = [
  'tiny',
  'tiny.en',
  'tiny-q5_1',
  'tiny.en-q5_1',
  'tiny-q8_0',
  'base',
  'base.en',
  'base-q5_1',
  'base.en-q5_1',
  'base-q8_0',
  'small',
  'small.en',
  'small.en-tdrz',
  'small-q5_1',
  'small.en-q5_1',
  'small-q8_0',
  'medium',
  'medium.en',
  'medium-q5_0',
  'medium.en-q5_0',
  'medium-q8_0',
  'large-v1',
  'large-v2',
  'large-v2-q5_0',
  'large-v2-q8_0',
  'large-v3',
  'large-v3-q5_0',
  'large-v3-turbo',
  'large-v3-turbo-q5_0',
  'large-v3-turbo-q8_0',
] as const;

/**
 * Whisper VAD (Voice Activity Detection) models
 */
export const WHISPER_VAD_MODELS = ['silero-v5.1.2', 'silero-v6.2.0'] as const;

export type WhisperModelName = (typeof WHISPER_MODELS)[number];
export type WhisperVADModelName = (typeof WHISPER_VAD_MODELS)[number];

/**
 * Whisper.cpp model downloader utilities.
 *
 * Provides static methods for downloading GGML and VAD models from HuggingFace,
 * validating model names, and checking model availability. Supports automatic
 * model type detection and prevents concurrent downloads of the same model.
 *
 * @example
 * ```typescript
 * import { WhisperDownloader } from 'node-av';
 *
 * // Download a GGML model
 * const modelPath = await WhisperDownloader.downloadModel({
 *   model: 'base',
 *   outputPath: './models'
 * });
 *
 * // Download a VAD model
 * const vadPath = await WhisperDownloader.downloadVADModel('silero-v5.1.2', './models');
 *
 * // Check available models
 * const categories = WhisperDownloader.getModelsByCategory();
 * console.log(categories); // Map { 'tiny' => ['tiny', 'tiny.en', ...], ... }
 * ```
 */
export class WhisperDownloader {
  public static readonly DEFAULT_MODEL_PATH = resolve(__dirname, '../../../models');

  private static readonly DEFAULT_SRC = 'https://huggingface.co/ggerganov/whisper.cpp';
  private static readonly DEFAULT_PFX = 'resolve/main/ggml';
  private static readonly TDRZ_SRC = 'https://huggingface.co/akashmjn/tinydiarize-whisper.cpp';
  private static readonly TDRZ_PFX = 'resolve/main/ggml';
  private static readonly VAD_SRC = 'https://huggingface.co/ggml-org/whisper-vad';
  private static readonly VAD_PFX = 'resolve/main/ggml';

  // Global map to track ongoing downloads and prevent race conditions
  private static readonly activeDownloads = new Map<string, Promise<string>>();

  // Private constructor to prevent instantiation
  private constructor() {}

  /**
   * Check if a model name is a valid GGML model.
   *
   * Validates whether the provided string matches one of the available
   * GGML Whisper model names.
   *
   * @param model - Model name to validate
   *
   * @returns True if the model is a valid GGML model name
   *
   * @example
   * ```typescript
   * import { WhisperDownloader } from 'node-av';
   *
   * console.log(WhisperDownloader.isValidModel('base'));      // true
   * console.log(WhisperDownloader.isValidModel('large-v3'));  // true
   * console.log(WhisperDownloader.isValidModel('invalid'));   // false
   * ```
   */
  static isValidModel(model: string): model is WhisperModelName {
    return WHISPER_MODELS.includes(model as WhisperModelName);
  }

  /**
   * Check if a model name is a valid VAD model.
   *
   * Validates whether the provided string matches one of the available
   * Silero VAD model names.
   *
   * @param model - Model name to validate
   *
   * @returns True if the model is a valid VAD model name
   *
   * @example
   * ```typescript
   * import { WhisperDownloader } from 'node-av';
   *
   * console.log(WhisperDownloader.isValidVADModel('silero-v5.1.2')); // true
   * console.log(WhisperDownloader.isValidVADModel('invalid'));       // false
   * ```
   */
  static isValidVADModel(model: string): model is WhisperVADModelName {
    return WHISPER_VAD_MODELS.includes(model as WhisperVADModelName);
  }

  /**
   * Get all available GGML models grouped by category.
   *
   * Returns a map of model categories (tiny, base, small, medium, large)
   * with their corresponding model variants.
   *
   * @returns Map of category names to model name arrays
   *
   * @example
   * ```typescript
   * import { WhisperDownloader } from 'node-av';
   *
   * const categories = WhisperDownloader.getModelsByCategory();
   * console.log(categories.get('base'));
   * // ['base', 'base.en', 'base-q5_1', 'base.en-q5_1', 'base-q8_0']
   *
   * // List all categories
   * for (const [category, models] of categories) {
   *   console.log(`${category}: ${models.length} variants`);
   * }
   * ```
   */
  static getModelsByCategory(): Map<string, string[]> {
    const categories = new Map<string, string[]>();

    for (const model of WHISPER_MODELS) {
      const category = model.split(/[.-]/)[0];
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(model);
    }

    return categories;
  }

  /**
   * Get the download URL for a model.
   *
   * Constructs the HuggingFace download URL for a given model name.
   * Automatically detects whether it's a GGML or VAD model if type is not specified.
   * Handles special models like tinydiarize variants.
   *
   * @param model - Model name
   *
   * @param type - Model type (auto-detected if not provided)
   *
   * @returns Full download URL for the model
   *
   * @example
   * ```typescript
   * import { WhisperDownloader } from 'node-av';
   *
   * // GGML model URL
   * const url = WhisperDownloader.getModelUrl('base');
   * console.log(url);
   * // 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin'
   *
   * // VAD model URL
   * const vadUrl = WhisperDownloader.getModelUrl('silero-v5.1.2');
   * console.log(vadUrl);
   * // 'https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v5.1.2.bin'
   * ```
   */
  static getModelUrl(model: string, type?: WhisperModelType): string {
    // Auto-detect type if not provided
    if (!type) {
      if (this.isValidVADModel(model)) {
        type = 'vad';
      } else {
        type = 'ggml';
      }
    }

    if (type === 'vad') {
      return `${this.VAD_SRC}/${this.VAD_PFX}-${model}.bin`;
    }

    // GGML models
    const isTdrz = model.includes('tdrz');
    const src = isTdrz ? this.TDRZ_SRC : this.DEFAULT_SRC;
    const pfx = isTdrz ? this.TDRZ_PFX : this.DEFAULT_PFX;

    return `${src}/${pfx}-${model}.bin`;
  }

  /**
   * Check if a model file already exists.
   *
   * Checks whether a model file has already been downloaded to the specified path.
   * Useful for skipping redundant downloads.
   *
   * @param model - Model name
   *
   * @param outputPath - Directory path to check
   *
   * @returns True if the model file exists
   *
   * @example
   * ```typescript
   * import { WhisperDownloader } from 'node-av';
   *
   * if (WhisperDownloader.modelExists('base', './models')) {
   *   console.log('Model already downloaded');
   * } else {
   *   await WhisperDownloader.downloadModel({
   *     model: 'base',
   *     outputPath: './models'
   *   });
   * }
   * ```
   */
  static modelExists(model: string, outputPath: string): boolean {
    const filePath = resolve(outputPath, `ggml-${model}.bin`);
    return existsSync(filePath);
  }

  /**
   * Find whisper-cli executable in system PATH.
   *
   * Searches for whisper-cli binary in system PATH and local build directory.
   * Returns the path to the executable if found.
   *
   * @returns Path to whisper-cli executable, or null if not found
   *
   * @example
   * ```typescript
   * import { WhisperDownloader } from 'node-av';
   *
   * const cliPath = await WhisperDownloader.findWhisperCli();
   * if (cliPath) {
   *   console.log(`Found whisper-cli at: ${cliPath}`);
   * } else {
   *   console.log('whisper-cli not found');
   * }
   * ```
   */
  static async findWhisperCli(): Promise<string | null> {
    const pathEnv = process.env.PATH ?? '';
    const paths = pathEnv.split(':');

    for (const path of paths) {
      const whisperPath = resolve(path, 'whisper-cli');
      try {
        await access(whisperPath, constants.X_OK);
        return 'whisper-cli';
      } catch {
        continue;
      }
    }

    // Check local build
    const localPath = './build/bin/whisper-cli';
    try {
      await access(localPath, constants.X_OK);
      return localPath;
    } catch {
      return null;
    }
  }

  /**
   * Download a Whisper model file.
   *
   * Downloads a GGML or VAD model from HuggingFace to the specified directory.
   * Automatically detects model type based on model name if not specified.
   * Prevents race conditions when the same model is downloaded concurrently.
   * Returns immediately if the model file already exists.
   *
   * @param options - Download configuration options
   *
   * @returns Path to the downloaded model file
   *
   * @example
   * ```typescript
   * import { WhisperDownloader } from 'node-av';
   *
   * // Download GGML model (auto-detected)
   * const path = await WhisperDownloader.downloadModel({
   *   model: 'base',
   *   outputPath: './models'
   * });
   * console.log(`Downloaded to: ${path}`);
   *
   * // Download VAD model (auto-detected)
   * const vadPath = await WhisperDownloader.downloadModel({
   *   model: 'silero-v5.1.2',
   *   outputPath: './models'
   * });
   *
   * // Explicit type specification
   * const explicitPath = await WhisperDownloader.downloadModel({
   *   model: 'base',
   *   outputPath: './models',
   *   type: 'ggml'
   * });
   * ```
   */
  static async downloadModel(options: DownloadOptions): Promise<string> {
    const { model, outputPath = this.DEFAULT_MODEL_PATH, type } = options;

    // Auto-detect type if not provided
    let modelType: WhisperModelType = type ?? 'ggml';
    if (!type) {
      if (this.isValidVADModel(model)) {
        modelType = 'vad';
      } else if (this.isValidModel(model)) {
        modelType = 'ggml';
      } else {
        throw new Error(`Invalid model: ${model}. Use getModelsByCategory() to see available GGML models or WHISPER_VAD_MODELS for VAD models.`);
      }
    }

    // Validate model name based on type
    if (modelType === 'vad' && !this.isValidVADModel(model)) {
      throw new Error(`Invalid VAD model: ${model}. Available: ${WHISPER_VAD_MODELS.join(', ')}`);
    } else if (modelType === 'ggml' && !this.isValidModel(model)) {
      throw new Error(`Invalid GGML model: ${model}. Use getModelsByCategory() to see available models.`);
    }

    const filePath = resolve(outputPath, `ggml-${model}.bin`);

    // Check if download is already in progress
    const downloadKey = `${modelType}:${model}:${outputPath}`;
    const existingDownload = this.activeDownloads.get(downloadKey);
    if (existingDownload) {
      return existingDownload;
    }

    // If file already exists AND no download in progress, return path immediately
    if (existsSync(filePath)) {
      return filePath;
    }

    // Create output directory recursively if it doesn't exist
    await mkdir(outputPath, { recursive: true });

    // Start new download to temporary file
    const url = this.getModelUrl(model, modelType);
    const tmpFilePath = `${filePath}.tmp`;

    const downloadPromise = this.downloadWithRetry(url, tmpFilePath)
      .then(async () => {
        // Rename temporary file to final name after successful download
        await rename(tmpFilePath, filePath);
        return filePath;
      })
      .catch(async (error) => {
        // Clean up temporary file on error
        try {
          await unlink(tmpFilePath);
        } catch {
          // Ignore errors when deleting temp file
        }
        throw error;
      })
      .finally(() => {
        // Clean up from active downloads map
        this.activeDownloads.delete(downloadKey);
      });

    // Store in map to prevent concurrent downloads
    this.activeDownloads.set(downloadKey, downloadPromise);

    return downloadPromise;
  }

  /**
   * Download a VAD model (convenience method).
   *
   * Convenience wrapper for downloading VAD models without specifying type.
   * Equivalent to calling downloadModel() with type: 'vad'.
   *
   * @param model - VAD model name
   *
   * @param outputPath - Directory path for download (default: current directory)
   *
   * @returns Path to the downloaded VAD model file
   *
   * @example
   * ```typescript
   * import { WhisperDownloader } from 'node-av';
   *
   * const vadPath = await WhisperDownloader.downloadVADModel(
   *   'silero-v5.1.2',
   *   './models'
   * );
   * console.log(`VAD model downloaded to: ${vadPath}`);
   * ```
   */
  static async downloadVADModel(model: WhisperVADModelName, outputPath?: string): Promise<string> {
    return this.downloadModel({ model, outputPath, type: 'vad' });
  }

  /**
   * Download multiple Whisper models.
   *
   * Downloads multiple models sequentially to avoid overwhelming the network.
   * Each model is validated and downloaded using the same logic as downloadModel().
   *
   * @param models - Array of model names to download
   *
   * @param outputPath - Directory path for downloads (default: current directory)
   *
   * @param type - Model type for all models (auto-detected if not provided)
   *
   * @returns Array of paths to downloaded model files
   *
   * @example
   * ```typescript
   * import { WhisperDownloader } from 'node-av';
   *
   * // Download multiple GGML models
   * const paths = await WhisperDownloader.downloadModels(
   *   ['tiny', 'base', 'small'],
   *   './models'
   * );
   * console.log(`Downloaded ${paths.length} models`);
   *
   * // Download multiple VAD models
   * const vadPaths = await WhisperDownloader.downloadModels(
   *   ['silero-v5.1.2', 'silero-v6.2.0'],
   *   './models',
   *   'vad'
   * );
   * ```
   */
  static async downloadModels(models: (WhisperModelName | WhisperVADModelName)[], outputPath?: string, type?: WhisperModelType): Promise<string[]> {
    const downloadedPaths: string[] = [];

    for (const model of models) {
      const filePath = await this.downloadModel({ model, outputPath, type });
      downloadedPaths.push(filePath);
    }

    return downloadedPaths;
  }

  /**
   * Download a URL to a file, retrying transient failures.
   *
   * Rate limiting (HTTP 429, common when several CI runners hit the model host
   * from a shared IP pool), server errors (5xx), and network errors are retried
   * with exponential backoff, honoring a numeric `Retry-After` header as the
   * lower bound (capped at 30 s per wait). Other HTTP errors (e.g. 404) fail
   * immediately. Each attempt truncates and rewrites the output file.
   *
   * @param url - URL to download
   *
   * @param outputPath - Local file path to save the download
   *
   * @returns Promise that resolves when the download is complete
   *
   * @throws {Error} The last download error once the retries are exhausted
   *
   * @internal
   */
  private static async downloadWithRetry(url: string, outputPath: string): Promise<void> {
    const maxRetries = 3;
    for (let attempt = 0; ; attempt++) {
      try {
        await this.followRedirect(url, outputPath, 0);
        return;
      } catch (error) {
        // Permanent client errors (404 wrong URL, 403, ...) are not retryable;
        // 429/5xx and plain network errors (no statusCode) are.
        const status = error instanceof DownloadHttpError ? error.statusCode : undefined;
        const retryable = status === undefined || status === 429 || status >= 500;
        if (!retryable || attempt >= maxRetries) {
          throw error;
        }
        const backoffMs = 1000 * 2 ** attempt;
        const retryAfterMs = error instanceof DownloadHttpError && error.retryAfterSeconds !== undefined ? error.retryAfterSeconds * 1000 : 0;
        await new Promise((r) => setTimeout(r, Math.min(Math.max(backoffMs, retryAfterMs), 30_000)));
      }
    }
  }

  /**
   * Follow HTTP redirects recursively to download a file.
   *
   * Handles HTTP redirects (301, 302, 307, 308) up to a maximum of 5 redirects.
   * Downloads the file to the specified output path.
   *
   * @param url - URL to download
   *
   * @param outputPath - Local file path to save the download
   *
   * @param redirectCount - Current redirect count (used internally)
   *
   * @returns Promise that resolves when the download is complete
   *
   * @internal
   */
  private static followRedirect(url: string, outputPath: string, redirectCount = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      // Use an agent with keepAlive disabled to ensure connections are closed
      const agent = new Agent({ keepAlive: false });
      const request = get(url, { agent }, (response: IncomingMessage) => {
        // Handle redirects
        if ([301, 302, 307, 308].includes(response.statusCode ?? 0)) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            // Destroy the response to close the connection
            response.destroy();
            this.followRedirect(redirectUrl, outputPath, redirectCount + 1)
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          // Destroy the response to close the connection
          response.destroy();
          // Carry the status (and a numeric Retry-After, e.g. on 429 rate limits)
          // so downloadWithRetry can decide whether and how long to back off.
          const retryAfter = Number(response.headers['retry-after']);
          const retryAfterSeconds = Number.isFinite(retryAfter) ? retryAfter : undefined;
          reject(new DownloadHttpError(`Failed to download: HTTP ${response.statusCode}`, response.statusCode ?? 0, retryAfterSeconds));
          return;
        }

        const fileStream = createWriteStream(outputPath);
        let hasError = false;

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          // Don't close if we already had an error
          if (!hasError) {
            fileStream.close((err) => {
              // Destroy the response to close the HTTP connection
              response.destroy();
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }
        });

        fileStream.on('error', (err) => {
          hasError = true;
          // Destroy the response to close the HTTP connection
          response.destroy();
          fileStream.close(() => {
            reject(err);
          });
        });

        response.on('error', (err) => {
          hasError = true;
          fileStream.close(() => {
            reject(err);
          });
        });
      });

      request.on('error', (err) => {
        reject(err);
      });
    });
  }
}
