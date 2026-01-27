/**
 * FFmpeg CLI Wrapper
 *
 * Provides utilities for running FFmpeg CLI commands and measuring
 * their performance for comparison with node-av.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';

import { ffmpegPath, isFfmpegAvailable } from '../../src/ffmpeg/index.js';

import type { MeasureResult } from './measure.js';

export interface FFmpegRunOptions {
  /** Input file path */
  input: string;
  /** Output file path */
  output: string;
  /** Additional FFmpeg arguments */
  args?: string[];
  /** Timeout in milliseconds */
  timeout?: number;
}

export interface FFmpegRunResult {
  /** Exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error (contains progress) */
  stderr: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Parsed frame count if available */
  framesProcessed?: number;
  /** Parsed FPS if available */
  fps?: number;
  /** Peak memory (estimated from /usr/bin/time if available) */
  peakMemoryBytes?: number;
}

/**
 * Get the FFmpeg binary path, checking if it exists
 */
export function getFFmpegPath(): string {
  if (isFfmpegAvailable()) {
    return ffmpegPath();
  }

  // Try system ffmpeg
  const systemPaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg'];

  for (const path of systemPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error('FFmpeg binary not found. Please install FFmpeg or run npm install to download the bundled binary.');
}

/**
 * Run FFmpeg CLI with the given arguments
 */
export async function runFFmpegCLI(options: FFmpegRunOptions): Promise<FFmpegRunResult> {
  const { input, output, args = [], timeout = 300000 } = options;

  const ffmpeg = getFFmpegPath();

  const ffmpegArgs = ['-hide_banner', '-y', '-i', input, ...args, output];

  // Use /usr/bin/time to measure memory usage
  // macOS: /usr/bin/time -l outputs "maximum resident set size" in bytes
  // Linux: /usr/bin/time -v outputs "Maximum resident set size (kbytes)"
  const os = platform();
  const useTime = os === 'darwin' || os === 'linux';
  const timePath = '/usr/bin/time';
  const timeExists = useTime && existsSync(timePath);

  let command: string;
  let fullArgs: string[];

  if (timeExists) {
    command = timePath;
    if (os === 'darwin') {
      // macOS: -l for resource usage
      fullArgs = ['-l', ffmpeg, ...ffmpegArgs];
    } else {
      // Linux: -v for verbose (includes memory)
      fullArgs = ['-v', ffmpeg, ...ffmpegArgs];
    }
  } else {
    command = ffmpeg;
    fullArgs = ffmpegArgs;
  }

  return new Promise((resolve, reject) => {
    const startTime = process.hrtime.bigint();

    const proc = spawn(command, fullArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`FFmpeg timed out after ${timeout}ms`));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;

      // Parse frame count from stderr (look for the last occurrence)
      const frameMatches = [...stderr.matchAll(/frame=\s*(\d+)/g)];
      const frameCount = frameMatches.length > 0 ? parseInt(frameMatches[frameMatches.length - 1][1], 10) : undefined;

      // Parse FPS - try multiple methods:
      // 1. Direct fps= value (if > 0)
      // 2. Calculate from speed= multiplier and video duration
      // 3. Calculate from frame count and our measured duration
      let fps: number | undefined;

      const fpsMatch = /fps=\s*([\d.]+)/.exec(stderr);
      if (fpsMatch && parseFloat(fpsMatch[1]) > 0) {
        fps = parseFloat(fpsMatch[1]);
      } else if (frameCount && durationMs > 0) {
        // Calculate FPS from frames processed and actual duration
        fps = (frameCount / durationMs) * 1000;
      }

      // Parse peak memory from /usr/bin/time output
      let peakMemoryBytes: number | undefined;
      if (timeExists) {
        if (os === 'darwin') {
          // macOS: "maximum resident set size" is in bytes
          // Format: "    123456789  maximum resident set size"
          const memMatch = /(\d+)\s+maximum resident set size/.exec(stderr);
          if (memMatch) {
            peakMemoryBytes = parseInt(memMatch[1], 10);
          }
        } else {
          // Linux: "Maximum resident set size (kbytes): 123456"
          const memMatch = /Maximum resident set size.*?:\s*(\d+)/.exec(stderr);
          if (memMatch) {
            peakMemoryBytes = parseInt(memMatch[1], 10) * 1024; // Convert KB to bytes
          }
        }
      }

      resolve({
        exitCode: code ?? 0,
        stdout,
        stderr,
        durationMs,
        framesProcessed: frameCount,
        fps,
        peakMemoryBytes,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Run FFmpeg CLI and return a MeasureResult for comparison
 */
export async function measureFFmpegCLI(options: FFmpegRunOptions): Promise<MeasureResult> {
  const result = await runFFmpegCLI(options);

  if (result.exitCode !== 0) {
    throw new Error(`FFmpeg failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  // Calculate FPS from frames and duration if not available from output
  const fps = result.fps ?? (result.framesProcessed ? (result.framesProcessed / result.durationMs) * 1000 : undefined);

  return {
    durationMs: result.durationMs,
    peakMemoryBytes: result.peakMemoryBytes ?? 0,
    memorySamples: [],
    framesProcessed: result.framesProcessed,
    fps,
  };
}

/**
 * Get FFmpeg version string
 */
export async function getFFmpegVersion(): Promise<string> {
  const ffmpeg = getFFmpegPath();

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, ['-version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to get FFmpeg version'));
        return;
      }

      // Parse version from first line
      const match = /ffmpeg version (\S+)/.exec(stdout);
      resolve(match ? match[1] : 'unknown');
    });

    proc.on('error', reject);
  });
}

/**
 * Probe a media file using ffprobe
 */
export async function probeMediaFile(
  filePath: string,
): Promise<{ duration: number; videoCodec?: string; audioCodec?: string; width?: number; height?: number; fps?: number }> {
  const ffmpeg = getFFmpegPath();
  const ffprobe = ffmpeg.replace('ffmpeg', 'ffprobe');

  // Check if ffprobe exists, otherwise use ffmpeg -i
  const probeExists = existsSync(ffprobe);

  return new Promise((resolve, reject) => {
    if (probeExists) {
      const proc = spawn(ffprobe, ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Failed to probe media file'));
          return;
        }

        try {
          const info = JSON.parse(stdout);
          const videoStream = info.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');
          const audioStream = info.streams?.find((s: { codec_type: string }) => s.codec_type === 'audio');

          let fps: number | undefined;
          if (videoStream?.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
            fps = num / den;
          }

          resolve({
            duration: parseFloat(info.format?.duration ?? '0'),
            videoCodec: videoStream?.codec_name,
            audioCodec: audioStream?.codec_name,
            width: videoStream?.width,
            height: videoStream?.height,
            fps,
          });
        } catch (e) {
          reject(e);
        }
      });

      proc.on('error', reject);
    } else {
      // Fallback: use ffmpeg -i and parse stderr
      const proc = spawn(ffmpeg, ['-i', filePath], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', () => {
        // Parse duration
        const durationMatch = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(stderr);
        let duration = 0;
        if (durationMatch) {
          duration = parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseFloat(durationMatch[3]);
        }

        // Parse video stream info
        const videoMatch = /Stream #\d+:\d+.*Video: (\w+).*, (\d+)x(\d+).*, ([\d.]+) fps/.exec(stderr);

        // Parse audio stream info
        const audioMatch = /Stream #\d+:\d+.*Audio: (\w+)/.exec(stderr);

        resolve({
          duration,
          videoCodec: videoMatch?.[1],
          width: videoMatch ? parseInt(videoMatch[2]) : undefined,
          height: videoMatch ? parseInt(videoMatch[3]) : undefined,
          fps: videoMatch ? parseFloat(videoMatch[4]) : undefined,
          audioCodec: audioMatch?.[1],
        });
      });

      proc.on('error', reject);
    }
  });
}

/**
 * Build common FFmpeg arguments for different test cases
 * Note: -threads 0 enables auto-detection (same as node-av default)
 */
export const FFmpegArgs = {
  /** Software H.264 encoding */
  swH264: (crf = 23): string[] => ['-threads', '0', '-c:v', 'libx264', '-preset', 'medium', '-crf', crf.toString(), '-c:a', 'copy'],

  /** Software H.265/HEVC encoding */
  swH265: (crf = 28): string[] => ['-threads', '0', '-c:v', 'libx265', '-preset', 'medium', '-crf', crf.toString(), '-c:a', 'copy'],

  /** Hardware H.264 encoding (VideoToolbox) */
  hwH264VideoToolbox: (): string[] => ['-threads', '0', '-c:v', 'h264_videotoolbox', '-b:v', '2M', '-c:a', 'copy'],

  /** Hardware H.264 encoding (NVENC) */
  hwH264Nvenc: (): string[] => ['-threads', '0', '-c:v', 'h264_nvenc', '-preset', 'p4', '-b:v', '2M', '-c:a', 'copy'],

  /** Hardware H.264 encoding (VAAPI) */
  hwH264Vaapi: (): string[] => ['-threads', '0', '-vaapi_device', '/dev/dri/renderD128', '-c:v', 'h264_vaapi', '-b:v', '2M', '-c:a', 'copy'],

  /** Hardware H.264 encoding (QSV) */
  hwH264Qsv: (): string[] => ['-threads', '0', '-c:v', 'h264_qsv', '-preset', 'medium', '-b:v', '2M', '-c:a', 'copy'],

  /** Stream copy (no re-encoding) */
  streamCopy: (): string[] => ['-c', 'copy'],

  /** Video only (no audio) */
  videoOnly: (videoArgs: string[]): string[] => [...videoArgs, '-an'],

  /** First N seconds only */
  duration: (seconds: number, args: string[]): string[] => ['-t', seconds.toString(), ...args],
};
