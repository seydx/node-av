#!/usr/bin/env node

import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const packagesDir = join(rootDir, 'packages');

// Platform configurations
const platforms = [
  { name: 'darwin-arm64', os: 'darwin', cpu: 'arm64' },
  { name: 'darwin-x64', os: 'darwin', cpu: 'x64' },
  { name: 'linux-arm64', os: 'linux', cpu: 'arm64' },
  { name: 'linux-x64', os: 'linux', cpu: 'x64' },
  // MinGW builds are discontinued
  // { name: 'win32-arm64-mingw', os: 'win32', cpu: 'arm64' },
  // { name: 'win32-x64-mingw', os: 'win32', cpu: 'x64' },
  { name: 'win32-arm64-msvc', os: 'win32', cpu: 'arm64' },
  { name: 'win32-x64-msvc', os: 'win32', cpu: 'x64' },
];

// Read template
const template = JSON.parse(readFileSync(join(packagesDir, 'platform-template.json'), 'utf8'));

// Usage: create-platform-packages.js [version] [--ffmpeg-binaries <dir>]
// The CI passes the release version and the folder holding the downloaded
// ffmpeg-v* artifacts; without a version the main package's is used.
const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'ffmpeg-binaries': { type: 'string' } },
});

const mainPackage = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const version = positionals[0] ?? mainPackage.version;

platforms.forEach((platform) => {
  const packageDir = join(packagesDir, platform.name);

  // Create directory
  mkdirSync(packageDir, { recursive: true });

  // Create package.json
  const packageJson = { ...template };
  packageJson.name = `@seydx/node-av-${platform.name}`;
  packageJson.version = version;
  packageJson.description = `node-av (${platform.name} binary)`;
  packageJson.os = [platform.os];
  packageJson.cpu = [platform.cpu];

  writeFileSync(join(packageDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');

  // Create README
  const readme = `# @seydx/node-av-${platform.name}

Platform-specific binary for [node-av](https://github.com/seydx/node-av).

**This package is automatically installed as an optional dependency. You should not install it directly.**

## Platform

- OS: ${platform.os}
- Architecture: ${platform.cpu}

## License

MIT
`;

  writeFileSync(join(packageDir, 'README.md'), readme);

  console.log(`Created package for ${platform.name}`);
});

// FFmpeg CLI packages: one per platform with the binary, plus the meta package
// @seydx/node-av-ffmpeg that users install. It pulls in the matching platform
// package via optionalDependencies (exact pin), and node-av's ffmpegPath()
// resolves the binary through it. The CI copies the binaries in afterwards.
// `artifact` is the suffix of the ffmpeg-v<version>-<suffix>.zip build artifact.
const ffmpegPlatforms = [
  { name: 'darwin-arm64', os: 'darwin', cpu: 'arm64', artifact: 'macos-arm64-jellyfin' },
  { name: 'darwin-x64', os: 'darwin', cpu: 'x64', artifact: 'macos-x64-jellyfin' },
  { name: 'linux-arm64', os: 'linux', cpu: 'arm64', artifact: 'linux-arm64-jellyfin' },
  { name: 'linux-x64', os: 'linux', cpu: 'x64', artifact: 'linux-x64-jellyfin' },
  { name: 'win32-arm64', os: 'win32', cpu: 'arm64', artifact: 'win-arm64' },
  { name: 'win32-x64', os: 'win32', cpu: 'x64', artifact: 'win-x64' },
];

const ffmpegBinariesDir = args['ffmpeg-binaries'] ? resolve(args['ffmpeg-binaries']) : null;

/**
 * Find the FFmpeg binary for a platform in the downloaded build artifacts.
 *
 * Each artifact is a folder named after its zip (ffmpeg-v8.1.3-linux-x64-jellyfin.zip/ffmpeg).
 *
 * @param {{ artifact: string }} platform - Platform entry from ffmpegPlatforms
 * @param {string} binary - Binary file name (ffmpeg or ffmpeg.exe)
 * @returns {string} Path to the binary
 * @throws {Error} If the artifact or its binary is missing
 */
const findFfmpegBinary = (platform, binary) => {
  const folder = readdirSync(ffmpegBinariesDir).find((name) => /^ffmpeg-v.+\.zip$/.test(name) && name.endsWith(`-${platform.artifact}.zip`));
  const path = folder ? join(ffmpegBinariesDir, folder, binary) : null;
  if (!path || !existsSync(path)) {
    throw new Error(`FFmpeg binary for ${platform.artifact} not found in ${ffmpegBinariesDir}`);
  }
  return path;
};

const ffmpegCommon = {
  author: template.author,
  license: 'GPL-3.0-or-later',
  bugs: template.bugs,
  homepage: template.homepage,
  repository: template.repository,
  engines: template.engines,
  keywords: ['node-av', 'ffmpeg', 'ffmpeg-static', 'binary', 'cli'],
};

ffmpegPlatforms.forEach((platform) => {
  const packageDir = join(packagesDir, `ffmpeg-${platform.name}`);
  const binary = platform.os === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

  mkdirSync(packageDir, { recursive: true });

  const packageJson = {
    name: `@seydx/node-av-ffmpeg-${platform.name}`,
    version,
    description: `FFmpeg CLI for node-av (${platform.name})`,
    ...ffmpegCommon,
    files: [binary],
    os: [platform.os],
    cpu: [platform.cpu],
  };

  writeFileSync(join(packageDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');

  const readme = `# @seydx/node-av-ffmpeg-${platform.name}

FFmpeg CLI binary for [node-av](https://github.com/seydx/node-av) on ${platform.os} ${platform.cpu}.

**This package is installed by \`@seydx/node-av-ffmpeg\`. You should not install it directly.**

## License

FFmpeg is built with GPL components, so this binary is licensed under the GPL v3 or later.
`;

  writeFileSync(join(packageDir, 'README.md'), readme);

  if (ffmpegBinariesDir) {
    // Artifact downloads lose the executable bit
    const target = join(packageDir, binary);
    copyFileSync(findFfmpegBinary(platform, binary), target);
    chmodSync(target, 0o755);
  }

  console.log(`Created FFmpeg package for ${platform.name}${ffmpegBinariesDir ? ' (with binary)' : ''}`);
});

const ffmpegMetaDir = join(packagesDir, 'ffmpeg');
mkdirSync(ffmpegMetaDir, { recursive: true });

const ffmpegMeta = {
  name: '@seydx/node-av-ffmpeg',
  version,
  description: 'FFmpeg CLI binaries for node-av',
  ...ffmpegCommon,
  files: [],
  optionalDependencies: Object.fromEntries(ffmpegPlatforms.map((platform) => [`@seydx/node-av-ffmpeg-${platform.name}`, version])),
};

writeFileSync(join(ffmpegMetaDir, 'package.json'), JSON.stringify(ffmpegMeta, null, 2) + '\n');

writeFileSync(
  join(ffmpegMetaDir, 'README.md'),
  `# @seydx/node-av-ffmpeg

The FFmpeg CLI for [node-av](https://github.com/seydx/node-av), built from the same FFmpeg as its native bindings. npm installs only the binary for the current platform.

\`\`\`bash
npm install node-av @seydx/node-av-ffmpeg
\`\`\`

\`\`\`typescript
import { ffmpegPath, isFfmpegAvailable } from 'node-av/ffmpeg';

if (isFfmpegAvailable()) {
  console.log(ffmpegPath());
}
\`\`\`

## License

FFmpeg is built with GPL components, so the binaries are licensed under the GPL v3 or later.
`,
);

console.log('Created FFmpeg meta package');

console.log('\nAll platform packages created successfully!');
