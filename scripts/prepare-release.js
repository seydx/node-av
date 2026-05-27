#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Get version type from command line
const versionType = process.argv[2] || 'patch';

const validTypes = ['patch', 'minor', 'major', 'beta-patch', 'beta-minor', 'beta-major'];
if (!validTypes.includes(versionType)) {
  console.error('Usage: node prepare-release.js [patch|minor|major|beta-patch|beta-minor|beta-major]');
  console.error('');
  console.error('  patch       - Bump patch version (1.0.0 -> 1.0.1), or promote beta to stable');
  console.error('  minor       - Bump minor version (1.0.0 -> 1.1.0), or promote beta to stable');
  console.error('  major       - Bump major version (1.0.0 -> 2.0.0), or promote beta to stable');
  console.error('  beta-patch  - Create/bump beta (1.0.0 -> 1.0.1-beta.1, or beta.1 -> beta.2)');
  console.error('  beta-minor  - Create/bump beta (1.0.0 -> 1.1.0-beta.1, or beta.1 -> beta.2)');
  console.error('  beta-major  - Create/bump beta (1.0.0 -> 2.0.0-beta.1, or beta.1 -> beta.2)');
  process.exit(1);
}

console.log(`Preparing ${versionType} release...`);

// Read current package.json
const packagePath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const currentVersion = packageJson.version;

// Parse current version (handles both regular and prerelease versions)
const versionMatch = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$/);
if (!versionMatch) {
  console.error(`Invalid current version format: ${currentVersion}`);
  process.exit(1);
}

const [, majorStr, minorStr, patchStr, currentPreType, currentPreNum] = versionMatch;
const major = Number(majorStr);
const minor = Number(minorStr);
const patch = Number(patchStr);

let newVersion;

// Check if we're currently on a prerelease version
const isPrerelease = currentPreType !== undefined;

switch (versionType) {
  case 'major':
    // If on prerelease, promote to stable; otherwise bump major
    if (isPrerelease) {
      newVersion = `${major}.${minor}.${patch}`;
    } else {
      newVersion = `${major + 1}.0.0`;
    }
    break;
  case 'minor':
    // If on prerelease, promote to stable; otherwise bump minor
    if (isPrerelease) {
      newVersion = `${major}.${minor}.${patch}`;
    } else {
      newVersion = `${major}.${minor + 1}.0`;
    }
    break;
  case 'patch':
    // If on prerelease, promote to stable; otherwise bump patch
    if (isPrerelease) {
      newVersion = `${major}.${minor}.${patch}`;
    } else {
      newVersion = `${major}.${minor}.${patch + 1}`;
    }
    break;
  case 'beta-patch':
    // If already on beta, increment beta number; otherwise create new beta
    if (isPrerelease && currentPreType === 'beta') {
      newVersion = `${major}.${minor}.${patch}-beta.${Number(currentPreNum) + 1}`;
    } else {
      newVersion = `${major}.${minor}.${patch + 1}-beta.1`;
    }
    break;
  case 'beta-minor':
    // If already on beta, increment beta number; otherwise create new beta
    if (isPrerelease && currentPreType === 'beta') {
      newVersion = `${major}.${minor}.${patch}-beta.${Number(currentPreNum) + 1}`;
    } else {
      newVersion = `${major}.${minor + 1}.0-beta.1`;
    }
    break;
  case 'beta-major':
    // If already on beta, increment beta number; otherwise create new beta
    if (isPrerelease && currentPreType === 'beta') {
      newVersion = `${major}.${minor}.${patch}-beta.${Number(currentPreNum) + 1}`;
    } else {
      newVersion = `${major + 1}.0.0-beta.1`;
    }
    break;
}

console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

// Update main package version
packageJson.version = newVersion;

// Update the platform binary packages (@seydx/node-av-*) to match the main
// package version. Ignore third-party optional deps.
const optionalDeps = packageJson.optionalDependencies;
for (const dep in optionalDeps) {
  if (dep.startsWith('@seydx/node-av-')) {
    optionalDeps[dep] = `^${newVersion}`;
  }
}

console.log('Updated platform package versions to ^' + newVersion);

// Write updated package.json
writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('Updated package.json');

// Update CHANGELOG.md - move Unreleased to new version
const changelogPath = join(rootDir, 'CHANGELOG.md');
if (existsSync(changelogPath)) {
  let changelog = readFileSync(changelogPath, 'utf8');

  // Check if there's content in Unreleased section
  const unreleasedMatch = changelog.match(/## \[Unreleased\]([\s\S]*?)(?=## \[|$)/);
  if (unreleasedMatch && unreleasedMatch[1].trim()) {
    const today = new Date().toISOString().split('T')[0];

    // Replace [Unreleased] with the new version and date
    const versionHeader = `## [${newVersion}] - ${today}`;

    // Keep the Unreleased section but empty it, and add the new version section
    changelog = changelog.replace(/## \[Unreleased\]([\s\S]*?)(?=## \[|$)/, `## [Unreleased]\n\n${versionHeader}$1`);

    writeFileSync(changelogPath, changelog);
    console.log(`\n📝 Updated CHANGELOG.md with version ${newVersion}`);
  }
}

// Stage the changes
execSync('git add package.json', { cwd: rootDir });
execSync('git add src/ffmpeg/version.ts', { cwd: rootDir });

// Regenerate package-lock.json
execSync('npm i --package-lock-only --ignore-scripts', { cwd: rootDir });
execSync('git add package-lock.json', { cwd: rootDir });

// Also stage CHANGELOG.md if it was updated
if (existsSync(changelogPath)) {
  execSync('git add CHANGELOG.md', { cwd: rootDir });
}

// Create commit
execSync(`git commit -m "chore: bump version to ${newVersion}"`, { cwd: rootDir });
console.log(`Created commit for version ${newVersion}`);

// Create tag
execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { cwd: rootDir });
console.log(`Created tag v${newVersion}`);

console.log('\nRelease preparation complete!');
console.log(`\nPush to origin: git push && git push origin v${newVersion}`);
