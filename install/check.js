#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { log } from './ffmpeg.js';

const require = createRequire(import.meta.url);

// node-av, node-av-lgpl and node-av-light each install their own platform packages
// (@seydx/node-av-linux-x64, @seydx/node-av-lgpl-linux-x64, ...)
const { name } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const packagePrefix = `@seydx/${name}`;

const tryLoadPrebuilt = () => {
  // Try to load from platform-specific package (optionalDependencies)
  const { platform, arch, musl } = installTarget();

  if (platform === 'win32') {
    // MinGW builds are discontinued, Windows ships MSVC only
    // const useMingW = type() !== 'Windows_NT';
    // if (useMingW) {
    //   try {
    //     const packageName = `@seydx/node-av-${platform}-${arch}-mingw`;
    //     const packageJsonPath = require.resolve(`${packageName}/package.json`);
    //     if (existsSync(packageJsonPath)) {
    //       log(`Using prebuilt binary from ${packageName}`);
    //       return true;
    //     }
    //   } catch {
    //     // Package not installed
    //   }
    // }

    try {
      const packageName = `${packagePrefix}-${platform}-${arch}-msvc`;
      // Check if the package is installed (don't check for .node file yet - it may be extracted by postinstall)
      const packageJsonPath = require.resolve(`${packageName}/package.json`);
      if (existsSync(packageJsonPath)) {
        log(`Using prebuilt binary from ${packageName}`);
        return true;
      }
    } catch {
      // Package not installed
    }
  } else {
    // musl (Alpine) has its own build, a glibc one doesn't load there
    const packageName = `${packagePrefix}-${platform}-${arch}${musl ? '-musl' : ''}`;

    try {
      // Check if the package is installed (don't check for .node file yet - it may be extracted by postinstall)
      const packageJsonPath = require.resolve(`${packageName}/package.json`);
      if (existsSync(packageJsonPath)) {
        log(`Using prebuilt binary from ${packageName}`);
        return true;
      }
    } catch {
      // Package not installed
    }
  }

  // Try local binary folder (for development)
  const localBinary = join(process.cwd(), 'binary', 'node-av.node');
  if (existsSync(localBinary)) {
    log('Using local binary from binary/node-av.node');
    return true;
  }

  return false;
};

// A cross build (npm --os/--cpu/--libc) installs the target's package, not the build host's
const installTarget = () => {
  const platform = process.env.npm_config_os || process.platform;
  const arch = process.env.npm_config_cpu || process.arch;
  const libc = process.env.npm_config_libc || (isMuslLibc() ? 'musl' : 'glibc');
  return { platform, arch, musl: platform === 'linux' && libc === 'musl' };
};

const isMuslLibc = () => {
  if (process.platform !== 'linux') {
    return false;
  }

  try {
    const report = process.report?.getReport?.();
    return !report?.header?.glibcVersionRuntime;
  } catch {
    return false;
  }
};

const noPrebuiltError = () => {
  const { platform, arch, musl } = installTarget();
  log('');
  log(`No prebuilt binary available for ${platform}-${arch}${musl ? ' (musl)' : ''}.`);
  log('The published npm package does not contain the native sources,');
  log('so it cannot be built from source inside node_modules.');
  log('To build from source, clone the repository and follow the build instructions:');
  log('  https://github.com/seydx/node-av');
  process.exit(1);
};

(async () => {
  try {
    const shouldBuildFromSource = process.env.npm_config_build_from_source === 'true';

    if (shouldBuildFromSource) {
      log('--build-from-source was specified, but the published npm package cannot be built from source.');
      noPrebuiltError();
    }

    // Try to use prebuilt binary
    if (tryLoadPrebuilt()) {
      return;
    }

    noPrebuiltError();
  } catch (err) {
    console.error(`node-av: Installation error: ${err.message}`);
    process.exit(1);
  }
})();
