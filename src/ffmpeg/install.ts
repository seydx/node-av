#!/usr/bin/env node

import { chmodSync, createWriteStream, mkdirSync, rmSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Open } from 'unzipper';

import { ffmpegPath } from './index.js';
import { getArchitecture, getPlatform, useMingwToolchain } from './utils.js';
import { FFMPEG_VERSION } from './version.js';

import type { ARCH } from './utils.js';

if (process.env.SKIP_FFMPEG === 'true') {
  console.log('Skipping ffmpeg download');
  process.exit(0);
}

type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

type FFMPEG_BINARIES = PartialRecord<NodeJS.Platform, PartialRecord<ARCH, string>>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __require = createRequire(import.meta.url);

const releasesUrl = 'https://api.github.com/repos/seydx/node-av/releases';
const pJson = __require('../../package.json');
const ffmpegVersion = `v${FFMPEG_VERSION}`;

const binaries: FFMPEG_BINARIES = {
  darwin: {
    x64: `ffmpeg-${ffmpegVersion}-macos-x64-jellyfin.zip`,
    arm64: `ffmpeg-${ffmpegVersion}-macos-arm64-jellyfin.zip`,
  },
  linux: {
    x64: `ffmpeg-${ffmpegVersion}-linux-x64-jellyfin.zip`,
    arm64: `ffmpeg-${ffmpegVersion}-linux-arm64-jellyfin.zip`,
  },
  win32: {
    x64: `ffmpeg-${ffmpegVersion}-win-x64.zip`,
    arm64: `ffmpeg-${ffmpegVersion}-win-arm64.zip`,
  },
};

const arch = getArchitecture();
const sysPlatform = getPlatform();
let filename = binaries[sysPlatform]?.[arch];

if (!filename) {
  console.warn(`Warning: No ffmpeg binary found for architecture (${sysPlatform} / ${arch})`);
  console.warn('FFmpeg binary installation will be skipped.');
  process.exit(0);
}

// Standard (MSVC-built) Windows Node.js uses the default binary; only a MinGW
// runtime (or an explicit npm_config_libc=mingw when cross-compiling) needs the
// jellyfin build. See useMingwToolchain() for the detection rationale.
if (sysPlatform === 'win32' && useMingwToolchain()) {
  filename = filename.replace('.zip', '-jellyfin.zip');
}

console.log(`Detected platform: ${sysPlatform} / ${arch}`);
console.log(`Using binary: ${filename}`);

const ffmpegBinaryPath = resolve(__dirname, '../../binary');

const ffmpegFilePath = resolve(ffmpegBinaryPath, filename);
const ffmpegExtractedFilePath = ffmpegPath();

const isZipUrl = (url: string): boolean => {
  const pathArray = new URL(url).pathname.split('/');
  const fileName = pathArray[pathArray.length - 1];

  return fileName !== undefined && extname(fileName) === '.zip';
};

const downloadFile = async (url: string): Promise<void> => {
  console.log(`Downloading FFmpeg ${ffmpegVersion} to ${ffmpegFilePath}...`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  mkdirSync(ffmpegBinaryPath, { recursive: true });

  // Progress tracking (optional, simpler without detailed progress)
  const contentLength = response.headers.get('content-length');
  let downloaded = 0;

  const writeStream = createWriteStream(ffmpegFilePath);

  // Convert ReadableStream to Node.js stream and track progress
  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      downloaded += value.length;

      // Show progress if we have content length and not in CI
      if (!process.env.CI && contentLength) {
        const percent = Math.round((downloaded / parseInt(contentLength)) * 100);
        process.stdout.write(`\r${percent}%`);
      }

      writeStream.write(value);
    }

    if (!process.env.CI && contentLength) {
      process.stdout.write('\r');
    }
  } finally {
    reader.releaseLock();
    writeStream.end();

    // Wait for write stream to finish
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  if (isZipUrl(url)) {
    console.log(`Extracting ${ffmpegFilePath} to ${ffmpegExtractedFilePath}...`);

    try {
      const directory = await Open.file(ffmpegFilePath);

      if (directory.files?.length === 0) {
        throw new Error('No files found in ZIP archive');
      }

      await new Promise<void>((resolve, reject) => {
        directory.files[0].stream().pipe(createWriteStream(ffmpegExtractedFilePath)).on('error', reject).on('finish', resolve);
      });

      console.log(`Removing ${ffmpegFilePath}...`);
      rmSync(ffmpegFilePath);
    } catch (extractError) {
      // Clean up on extraction failure
      try {
        rmSync(ffmpegFilePath);
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(`Failed to extract ZIP: ${extractError}`);
    }
  } else {
    console.log(`Renaming ${ffmpegFilePath} to ${ffmpegExtractedFilePath}...`);
    await rename(ffmpegFilePath, ffmpegExtractedFilePath);
  }
};

const getReleaseAssets = async (version: string): Promise<{ assets: string[]; files: string[] }> => {
  const url = `${releasesUrl}/tags/v${version}`;
  console.log(`Fetching release info from ${url}...`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: any = await response.json();

  const assets = data.assets.map((asset: any) => asset.browser_download_url);
  const files = assets.map((asset: string) => asset.split(`${version}/`)[1]);

  return {
    assets,
    files,
  };
};

const downloadFFmpeg = async (): Promise<void> => {
  const release = await getReleaseAssets(pJson.version);

  if (!filename || !release.assets.find((r) => r.endsWith(filename))) {
    throw new Error(`No ffmpeg binary found for architecture (${sysPlatform} / ${arch})`);
  }

  const downloadUrl = release.assets.find((r) => r.endsWith(filename))!;

  await downloadFile(downloadUrl);

  if (sysPlatform === 'linux' || sysPlatform === 'darwin') {
    console.log(`Making ${ffmpegExtractedFilePath} executable...`);
    chmodSync(ffmpegExtractedFilePath, 0o755);
  }

  console.log('Done!');
};

downloadFFmpeg()
  .catch((error) => {
    console.warn('Warning: Failed to download FFmpeg binary:', error?.message ?? error);
    console.warn('FFmpeg binary will not be available, but the package installation will continue.');
  })
  .finally(() => {
    // Always exit successfully to avoid breaking npm install
    process.exit(0);
  });
