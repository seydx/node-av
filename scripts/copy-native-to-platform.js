/**
 * Copies the built node-av.node to node_modules/@seydx/node-av-{platform}-{arch}/
 * so bundlers like Vite (Electron Forge) can resolve it correctly. A build for
 * another variant (NODE_AV_VARIANT) goes to its package, e.g. @seydx/node-av-lgpl-{platform}-{arch}.
 */

import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { currentVariant, VARIANTS } from './ffmpeg-variant.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const platform = process.platform;
const arch = process.arch;

// MinGW builds are discontinued, Windows ships MSVC only
const toolchains = platform === 'win32' ? ['msvc'] : [null];
const source = resolve(root, 'build', 'Release', 'node-av.node');

if (!existsSync(source)) {
  console.log('No build/Release/node-av.node found, skipping platform copy.');
  process.exit(0);
}

for (const toolchain of toolchains) {
  const prefix = `@seydx/${VARIANTS[currentVariant()].package}`;
  const packageName = toolchain ? `${prefix}-${platform}-${arch}-${toolchain}` : `${prefix}-${platform}-${arch}`;

  const dest = resolve(root, 'node_modules', packageName, 'node-av.node');
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(source, dest);
  console.log(`Copied node-av.node → ${packageName}/`);
}
