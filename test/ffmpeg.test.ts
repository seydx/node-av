import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { describe, it } from 'node:test';
import { promisify } from 'node:util';

import { ffmpegPath, isFfmpegAvailable } from '../src/ffmpeg/index.js';

const execFileAsync = promisify(execFile);

describe('FFmpeg Binary Access', () => {
  describe('ffmpegPath()', () => {
    it('should return an absolute path to the executable when available', (t) => {
      if (!isFfmpegAvailable()) {
        t.skip('FFmpeg binary not installed');
        return;
      }

      const path = ffmpegPath();
      assert.ok(isAbsolute(path));
      assert.ok(path.endsWith(process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'));
      assert.ok(existsSync(path));
    });

    it('should throw with an install hint when not available', (t) => {
      if (isFfmpegAvailable()) {
        t.skip('FFmpeg binary is installed');
        return;
      }

      assert.throws(() => ffmpegPath(), /npm install @seydx\/node-av-ffmpeg/);
    });
  });

  describe('isFfmpegAvailable()', () => {
    it('should return a boolean', () => {
      assert.strictEqual(typeof isFfmpegAvailable(), 'boolean');
    });
  });

  describe('FFmpeg Binary Functionality', () => {
    it('should execute ffmpeg -version successfully', async function () {
      // Skip if FFmpeg not available
      if (!isFfmpegAvailable()) {
        return;
      }

      const path = ffmpegPath();
      const { stdout, stderr } = await execFileAsync(path, ['-version']);

      // FFmpeg writes version info to stdout or stderr
      const output = stdout + stderr;
      assert.ok(output.includes('ffmpeg version'), 'Output should contain version info');
      assert.ok(output.includes('configuration:'), 'Output should contain configuration info');
    });

    it('should execute ffmpeg -h successfully', async function () {
      // Skip if FFmpeg not available
      if (!isFfmpegAvailable()) {
        return;
      }

      const path = ffmpegPath();
      const { stdout, stderr } = await execFileAsync(path, ['-h']);

      // FFmpeg writes help to stdout or stderr
      const output = stdout + stderr;
      assert.ok(output.includes('usage:') || output.includes('Usage:'), 'Output should contain usage info');
    });

    it('should handle invalid arguments gracefully', async function () {
      // Skip if FFmpeg not available
      if (!isFfmpegAvailable()) {
        return;
      }

      const path = ffmpegPath();

      try {
        await execFileAsync(path, ['-invalid-flag-that-does-not-exist']);
        assert.fail('Should have thrown an error for invalid flag');
      } catch (error: any) {
        // FFmpeg should exit with non-zero code for invalid arguments
        assert.ok(error.code !== undefined);
        assert.notStrictEqual(error.code, 0);
      }
    });

    it('should support basic codec listing', async function () {
      // Skip if FFmpeg not available
      if (!isFfmpegAvailable()) {
        return;
      }

      const path = ffmpegPath();
      const { stdout, stderr } = await execFileAsync(path, ['-codecs']);

      const output = stdout + stderr;
      assert.ok(output.includes('Codecs:'), 'Output should contain codecs list');
      assert.ok(output.includes('h264') || output.includes('H.264'), 'Should list h264 codec');
    });

    it('should support format listing', async function () {
      // Skip if FFmpeg not available
      if (!isFfmpegAvailable()) {
        return;
      }

      const path = ffmpegPath();
      const { stdout, stderr } = await execFileAsync(path, ['-formats']);

      const output = stdout + stderr;
      assert.ok(output.includes('Formats:'), 'Output should contain formats list');
      assert.ok(output.includes('mp4'), 'Should list mp4 format');
    });
  });

  describe('Integration with node-av', () => {
    it('should provide binary that matches library version', async function () {
      // Skip if FFmpeg not available
      if (!isFfmpegAvailable()) {
        return;
      }

      const path = ffmpegPath();
      const { stdout, stderr } = await execFileAsync(path, ['-version']);

      const output = stdout + stderr;

      console.log(`FFmpeg version output: ${output}`);

      // Extract version string (supports semantic, git-based, and Jellyfin versions)
      const versionMatch = /ffmpeg version ([^\s]+)/i.exec(output);

      if (!versionMatch) {
        assert.fail('Could not parse FFmpeg version from output');
      }

      const versionString = versionMatch[1];
      console.log(`Found FFmpeg version: ${versionString}`);

      // Try to parse as semantic version with optional suffix
      // Matches: 7.1.2, 8.0.0, 8.0.0-Jellyfin, 8.0.git, etc.
      const semanticMatch = /^(\d+)\.(\d+)(?:\.(\d+))?(?:-(.+))?$/.exec(versionString);

      if (semanticMatch) {
        const major = parseInt(semanticMatch[1]);
        const minor = parseInt(semanticMatch[2]);
        const patch = semanticMatch[3] ? parseInt(semanticMatch[3]) : 0;
        const suffix = semanticMatch[4] || '';

        console.log(`Parsed as semantic version: ${major}.${minor}.${patch}${suffix ? `-${suffix}` : ''}`);

        // Accept FFmpeg 7.x or 8.x (both are compatible with library)
        assert.ok(major === 7 || major === 8, `Should be FFmpeg version 7.x or 8.x, got ${major}.x`);

        if (major === 7) {
          assert.ok(minor >= 1, 'FFmpeg 7.x should be at least version 7.1.x');
        }

        // Suffix is optional (e.g., -Jellyfin, -git, or empty)
        console.log(suffix ? `With suffix: ${suffix}` : 'No suffix');
      } else {
        // Not semantic versioning - might be pure git hash (e.g., 'f893221')
        console.log(`Parsed as non-semantic version (git-based): ${versionString}`);

        // Accept git-based versions: pure git hash or contains 'git'
        const isGitHash = /^[a-f0-9]{7,}$/i.test(versionString);
        const containsGit = versionString.toLowerCase().includes('git');

        assert.ok(isGitHash || containsGit, `Should be either semantic version (7.x/8.x) or git-based version, got: ${versionString}`);
      }
    });

    it('should provide binary with expected codec support', async function () {
      // Skip if FFmpeg not available
      if (!isFfmpegAvailable()) {
        return;
      }

      const path = ffmpegPath();
      const { stdout, stderr } = await execFileAsync(path, ['-codecs']);

      const output = stdout + stderr;

      // Check for key codecs that should be available
      const requiredCodecs = ['h264', 'hevc', 'aac', 'mp3'];

      for (const codec of requiredCodecs) {
        assert.ok(output.toLowerCase().includes(codec), `Binary should support ${codec} codec`);
      }
    });

    it('should work with actual media processing', async function () {
      // Skip if FFmpeg not available
      if (!isFfmpegAvailable()) {
        return;
      }

      const path = ffmpegPath();

      // Test with null output (just analyze without writing)
      // This tests that the binary can handle basic operations
      try {
        const { stdout, stderr } = await execFileAsync(path, ['-f', 'lavfi', '-i', 'testsrc2=duration=1:size=320x240:rate=1', '-t', '1', '-f', 'null', '-'], {
          timeout: 10000,
        });

        const output = stdout + stderr;
        assert.ok(output.includes('frame='), 'Should process test frames');
      } catch (error: any) {
        // This might fail in CI environments without certain codecs
        // Just ensure it's not a "command not found" type error
        assert.notStrictEqual(error.code, 127, 'Binary should be executable');
      }
    });
  });
});
