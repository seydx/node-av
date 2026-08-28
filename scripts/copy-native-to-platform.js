/**
 * Copies the built node-av.node to node_modules/@seydx/node-av-{platform}-{arch}/
 * so bundlers like Vite (Electron Forge) can resolve it correctly.
 */

import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const packageName = toolchain ? `@seydx/node-av-${platform}-${arch}-${toolchain}` : `@seydx/node-av-${platform}-${arch}`;

  const dest = resolve(root, 'node_modules', packageName, 'node-av.node');
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(source, dest);
  console.log(`Copied node-av.node → ${packageName}/`);
}
