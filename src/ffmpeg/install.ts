#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { chmodSync, createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
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
const releaseDownloadBase = 'https://github.com/seydx/node-av/releases/download';
const pJson = __require('../../package.json');
const ffmpegVersion = `v${FFMPEG_VERSION}`;

// Number of retries per download URL (in addition to the initial attempt).
const DOWNLOAD_RETRIES = 2;

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
const versionMarkerPath = resolve(ffmpegBinaryPath, '.ffmpeg-version');

if (existsSync(ffmpegExtractedFilePath) && existsSync(versionMarkerPath)) {
  try {
    if (readFileSync(versionMarkerPath, 'utf8').trim() === filename) {
      console.log(`FFmpeg ${ffmpegVersion} already installed, skipping download`);
      process.exit(0);
    }
  } catch {
    // Unreadable marker - fall through and re-download
  }
}

const isZipUrl = (url: string): boolean => {
  const pathArray = new URL(url).pathname.split('/');
  const fileName = pathArray[pathArray.length - 1];

  return fileName !== undefined && extname(fileName) === '.zip';
};

const sha256OfFile = async (path: string): Promise<string> => {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
};

const fetchExpectedSha256 = async (url: string): Promise<string | null> => {
  try {
    const sumsUrl = new URL(url);
    const parts = sumsUrl.pathname.split('/');
    parts[parts.length - 1] = 'SHA256SUMS';
    sumsUrl.pathname = parts.join('/');

    const response = await fetch(sumsUrl);
    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    for (const line of text.split('\n')) {
      // sha256sum format: "<hex>  <filename>" (binary mode prefixes "*")
      const match = /^([0-9a-fA-F]{64})\s+\*?(.+)$/.exec(line.trim());
      if (!match) {
        continue;
      }
      if (match[2] === filename) {
        return match[1].toLowerCase();
      }
    }

    return null;
  } catch {
    return null;
  }
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

  const body = Readable.fromWeb(response.body);

  if (!process.env.CI && contentLength) {
    body.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      const percent = Math.round((downloaded / parseInt(contentLength)) * 100);
      process.stdout.write(`\r${percent}%`);
    });
  }

  try {
    await pipeline(body, createWriteStream(ffmpegFilePath));

    if (!process.env.CI && contentLength) {
      process.stdout.write('\r');
    }
  } catch (downloadError) {
    try {
      rmSync(ffmpegFilePath);
    } catch {
      // Ignore cleanup errors
    }
    throw downloadError;
  }

  const expectedSha256 = await fetchExpectedSha256(url);
  if (expectedSha256) {
    const actualSha256 = await sha256OfFile(ffmpegFilePath);
    if (actualSha256 !== expectedSha256) {
      console.warn(`Warning: SHA256 mismatch for ${filename} (expected ${expectedSha256}, got ${actualSha256}); aborting extraction.`);
      try {
        rmSync(ffmpegFilePath);
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(`SHA256 checksum mismatch for ${filename}`);
    }
    console.log('SHA256 checksum verified');
  } else {
    console.log('No SHA256SUMS found for this release, skipping checksum verification');
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

const downloadFileWithRetries = async (url: string): Promise<void> => {
  for (let attempt = 0; ; attempt++) {
    try {
      await downloadFile(url);
      return;
    } catch (error) {
      if (attempt >= DOWNLOAD_RETRIES) {
        throw error;
      }

      const delayMs = 1000 * (attempt + 1);
      console.warn(`Download failed (${error instanceof Error ? error.message : error}); retrying in ${delayMs}ms (${attempt + 1}/${DOWNLOAD_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
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
  const directUrl = `${releaseDownloadBase}/v${pJson.version}/${filename}`;

  try {
    await downloadFileWithRetries(directUrl);
  } catch (directError) {
    console.warn(`Direct download failed (${directError instanceof Error ? directError.message : directError}); trying the release API...`);

    const release = await getReleaseAssets(pJson.version);
    const apiUrl = release.assets.find((r) => r.endsWith(filename));

    if (!apiUrl) {
      throw new Error(`No ffmpeg binary found for architecture (${sysPlatform} / ${arch})`);
    }

    await downloadFileWithRetries(apiUrl);
  }

  if (sysPlatform === 'linux' || sysPlatform === 'darwin') {
    console.log(`Making ${ffmpegExtractedFilePath} executable...`);
    chmodSync(ffmpegExtractedFilePath, 0o755);
  }

  writeFileSync(versionMarkerPath, `${filename}\n`);

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
