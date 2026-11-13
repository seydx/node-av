#!/usr/bin/env node

import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';

import { VARIANTS } from './ffmpeg-variant.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const packagesDir = join(rootDir, 'packages');

// Platform configurations. Linux has a glibc and a musl (Alpine) build, the
// package managers pick the right one through the libc field.
const platforms = [
  { name: 'darwin-arm64', os: 'darwin', cpu: 'arm64' },
  { name: 'darwin-x64', os: 'darwin', cpu: 'x64' },
  { name: 'linux-arm64', os: 'linux', cpu: 'arm64', libc: 'glibc' },
  { name: 'linux-arm64-musl', os: 'linux', cpu: 'arm64', libc: 'musl' },
  { name: 'linux-x64', os: 'linux', cpu: 'x64', libc: 'glibc' },
  { name: 'linux-x64-musl', os: 'linux', cpu: 'x64', libc: 'musl' },
  // MinGW builds are discontinued
  // { name: 'win32-arm64-mingw', os: 'win32', cpu: 'arm64' },
  // { name: 'win32-x64-mingw', os: 'win32', cpu: 'x64' },
  { name: 'win32-arm64-msvc', os: 'win32', cpu: 'arm64' },
  { name: 'win32-x64-msvc', os: 'win32', cpu: 'x64' },
];

// FFmpeg CLI platforms. `artifact` is the suffix of the ffmpeg-v<version>-<suffix>.zip
// build artifact of the gpl variant, the other variants append -<variant>.
const ffmpegPlatforms = [
  { name: 'darwin-arm64', os: 'darwin', cpu: 'arm64', artifact: 'macos-arm64-jellyfin' },
  { name: 'darwin-x64', os: 'darwin', cpu: 'x64', artifact: 'macos-x64-jellyfin' },
  { name: 'linux-arm64', os: 'linux', cpu: 'arm64', libc: 'glibc', artifact: 'linux-arm64-jellyfin' },
  { name: 'linux-arm64-musl', os: 'linux', cpu: 'arm64', libc: 'musl', artifact: 'linux-arm64-musl-jellyfin' },
  { name: 'linux-x64', os: 'linux', cpu: 'x64', libc: 'glibc', artifact: 'linux-x64-jellyfin' },
  { name: 'linux-x64-musl', os: 'linux', cpu: 'x64', libc: 'musl', artifact: 'linux-x64-musl-jellyfin' },
  { name: 'win32-arm64', os: 'win32', cpu: 'arm64', artifact: 'win-arm64' },
  { name: 'win32-x64', os: 'win32', cpu: 'x64', artifact: 'win-x64' },
];

// Read template
const template = JSON.parse(readFileSync(join(packagesDir, 'platform-template.json'), 'utf8'));

// Usage: create-platform-packages.js [version] [--prebuilds <dir>] [--ffmpeg-binaries <dir>]
// The CI passes the release version, the folder with the combined prebuilds
// (<dir>/<package folder>/node-av.node) and the folder holding the downloaded
// ffmpeg-v* artifacts. Without a version the main package's is used.
const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    prebuilds: { type: 'string' },
    'ffmpeg-binaries': { type: 'string' },
  },
});

const mainPackage = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const version = positionals[0] ?? mainPackage.version;
const prebuildsDir = args.prebuilds ? resolve(args.prebuilds) : null;
const ffmpegBinariesDir = args['ffmpeg-binaries'] ? resolve(args['ffmpeg-binaries']) : null;

// Package folders (relative to the repository root) in publish order: binaries first,
// then the packages depending on them. The root folder is the gpl main package (node-av).
const publishOrder = { binaries: [], ffmpeg: [], main: [] };

/**
 * Get the folder below packages/ for a package.
 *
 * Scoped packages drop the @seydx/node-av- prefix (linux-x64, lgpl-linux-x64,
 * ffmpeg-lgpl-linux-x64), the variant main packages keep their name (node-av-lgpl).
 *
 * @param {string} name - Package name
 * @returns {string} Folder name
 */
const packageFolder = (name) => (name.startsWith('@seydx/node-av-') ? name.slice('@seydx/node-av-'.length) : name);

/**
 * Write a package folder with its package.json and README.
 *
 * @param {object} packageJson - Package manifest
 * @param {string} readme - README content
 * @returns {string} Path to the package folder
 */
const writePackage = (packageJson, readme) => {
  const packageDir = join(packagesDir, packageFolder(packageJson.name));
  mkdirSync(packageDir, { recursive: true });
  writeFileSync(join(packageDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
  writeFileSync(join(packageDir, 'README.md'), readme);
  return packageDir;
};

/**
 * Find the FFmpeg binary for a platform in the downloaded build artifacts.
 *
 * Each artifact is a folder named after its zip (ffmpeg-v8.1.3-linux-x64-jellyfin.zip/ffmpeg,
 * ffmpeg-v8.1.3-linux-x64-jellyfin-lgpl.zip/ffmpeg).
 *
 * @param {string} artifact - Artifact suffix including the variant
 * @param {string} binary - Binary file name (ffmpeg or ffmpeg.exe)
 * @returns {string} Path to the binary
 * @throws {Error} If the artifact or its binary is missing
 */
const findFfmpegBinary = (artifact, binary) => {
  const folder = readdirSync(ffmpegBinariesDir).find((name) => /^ffmpeg-v.+\.zip$/.test(name) && name.endsWith(`-${artifact}.zip`));
  const path = folder ? join(ffmpegBinariesDir, folder, binary) : null;
  if (!path || !existsSync(path)) {
    throw new Error(`FFmpeg binary for ${artifact} not found in ${ffmpegBinariesDir}`);
  }
  return path;
};

const licenseSection = (variant) => `## License

${variant.licenseText}.
`;

for (const [variantName, variant] of Object.entries(VARIANTS)) {
  const isGpl = variantName === 'gpl';

  // Native binding packages (@seydx/node-av-linux-x64, @seydx/node-av-lgpl-linux-x64, ...)
  for (const platform of platforms) {
    const name = `@seydx/${variant.package}-${platform.name}`;
    const packageJson = {
      ...template,
      name,
      version,
      description: `${variant.package} (${platform.name} binary)`,
      license: variant.license,
      os: [platform.os],
      cpu: [platform.cpu],
      ...(platform.libc && { libc: [platform.libc] }),
    };

    const readme = `# ${name}

Platform-specific binary for [${variant.package}](https://github.com/seydx/node-av)${isGpl ? '' : `, ${variant.title}`}.

**This package is automatically installed as an optional dependency. You should not install it directly.**

## Platform

- OS: ${platform.os}
- Architecture: ${platform.cpu}${platform.libc ? `\n- C library: ${platform.libc}` : ''}

${licenseSection(variant)}`;

    const packageDir = writePackage(packageJson, readme);
    publishOrder.binaries.push(`packages/${packageFolder(name)}`);

    if (prebuildsDir) {
      const source = join(prebuildsDir, packageFolder(name), 'node-av.node');
      if (!existsSync(source)) {
        throw new Error(`Prebuild for ${name} not found at ${source}`);
      }
      copyFileSync(source, join(packageDir, 'node-av.node'));
    }

    console.log(`Created ${name}${prebuildsDir ? ' (with binary)' : ''}`);
  }

  // FFmpeg CLI packages: one per platform with the binary, plus the meta package
  // (@seydx/node-av-ffmpeg, @seydx/node-av-ffmpeg-lgpl, ...) that users install. It
  // pulls in the matching platform package via optionalDependencies (exact pin), and
  // ffmpegPath() resolves the binary through it.
  const ffmpegCommon = {
    author: template.author,
    license: variant.license,
    bugs: template.bugs,
    homepage: template.homepage,
    repository: template.repository,
    engines: template.engines,
    keywords: ['node-av', 'ffmpeg', 'ffmpeg-static', 'binary', 'cli'],
  };

  for (const platform of ffmpegPlatforms) {
    const name = `${variant.ffmpegPackage}-${platform.name}`;
    const binary = platform.os === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const packageJson = {
      name,
      version,
      description: `FFmpeg CLI for ${variant.package} (${platform.name})`,
      ...ffmpegCommon,
      files: [binary],
      os: [platform.os],
      cpu: [platform.cpu],
      ...(platform.libc && { libc: [platform.libc] }),
    };

    const readme = `# ${name}

FFmpeg CLI binary for [${variant.package}](https://github.com/seydx/node-av) on ${platform.os} ${platform.cpu}${platform.libc ? ` (${platform.libc})` : ''}.

**This package is installed by \`${variant.ffmpegPackage}\`. You should not install it directly.**

${licenseSection(variant)}`;

    const packageDir = writePackage(packageJson, readme);
    publishOrder.binaries.push(`packages/${packageFolder(name)}`);

    if (ffmpegBinariesDir) {
      // Artifact downloads lose the executable bit
      const target = join(packageDir, binary);
      copyFileSync(findFfmpegBinary(`${platform.artifact}${isGpl ? '' : `-${variantName}`}`, binary), target);
      chmodSync(target, 0o755);
    }

    console.log(`Created ${name}${ffmpegBinariesDir ? ' (with binary)' : ''}`);
  }

  const ffmpegMeta = {
    name: variant.ffmpegPackage,
    version,
    description: `FFmpeg CLI binaries for ${variant.package}`,
    ...ffmpegCommon,
    files: [],
    optionalDependencies: Object.fromEntries(ffmpegPlatforms.map((platform) => [`${variant.ffmpegPackage}-${platform.name}`, version])),
  };

  writePackage(
    ffmpegMeta,
    `# ${variant.ffmpegPackage}

The FFmpeg CLI for [${variant.package}](https://github.com/seydx/node-av), built from the same FFmpeg as its native bindings.
npm installs only the binary for the current platform.

\`\`\`bash
npm install ${variant.package} ${variant.ffmpegPackage}
\`\`\`

\`\`\`typescript
import { ffmpegPath, isFfmpegAvailable } from '${variant.package}/ffmpeg';

if (isFfmpegAvailable()) {
  console.log(ffmpegPath());
}
\`\`\`

${licenseSection(variant)}`,
  );
  publishOrder.ffmpeg.push(`packages/${packageFolder(variant.ffmpegPackage)}`);
  console.log(`Created ${variant.ffmpegPackage}`);

  // The gpl main package is the repository root itself
  if (isGpl) {
    publishOrder.main.push('.');
    continue;
  }

  // Variant main packages: the root package with its own name, platform packages and
  // FFmpeg CLI package. The compiled variant constant picks them at runtime.
  const renameFfmpeg = (deps) =>
    deps && Object.fromEntries(Object.entries(deps).map(([dep, value]) => [dep === '@seydx/node-av-ffmpeg' ? variant.ffmpegPackage : dep, value]));
  const mainJson = {
    ...mainPackage,
    name: variant.package,
    version,
    description: `${mainPackage.description} (${variant.title.replace(/^the /, '').replace(/ of node-av$/, '')})`,
    optionalDependencies: Object.fromEntries(platforms.map((platform) => [`@seydx/${variant.package}-${platform.name}`, version])),
    peerDependencies: renameFfmpeg(mainPackage.peerDependencies),
    peerDependenciesMeta: renameFfmpeg(mainPackage.peerDependenciesMeta),
  };

  const rootReadme = readFileSync(join(rootDir, 'README.md'), 'utf8');
  const mainDir = writePackage(
    mainJson,
    `# ${variant.package}

This is ${variant.title}, with the same API. ${variant.licenseText}. See [Variants](#variants) below for what it contains.

Install it under the name node-av to keep the \`node-av/...\` imports:

\`\`\`bash
npm install node-av@npm:${variant.package}
\`\`\`

---

${rootReadme}`,
  );

  for (const entry of ['dist', 'install', 'LICENSE.md']) {
    const source = join(rootDir, entry);
    if (!existsSync(source)) {
      throw new Error(`${entry} not found, build the TypeScript sources first`);
    }
    cpSync(source, join(mainDir, entry), { recursive: true });
  }

  // Point the compiled variant constant at this variant
  const variantFile = join(mainDir, 'dist', 'utils', 'variant.js');
  const compiled = readFileSync(variantFile, 'utf8');
  const marker = "export const VARIANT = 'gpl';";
  if (compiled.split(marker).length !== 2) {
    throw new Error(`${variantFile} does not contain ${marker} exactly once`);
  }
  writeFileSync(variantFile, compiled.replace(marker, `export const VARIANT = '${variantName}';`));

  publishOrder.main.push(`packages/${packageFolder(variant.package)}`);
  console.log(`Created ${variant.package}`);
}

writeFileSync(join(packagesDir, 'publish-order.json'), JSON.stringify([...publishOrder.binaries, ...publishOrder.ffmpeg, ...publishOrder.main], null, 2) + '\n');

console.log('\nAll packages created successfully!');
