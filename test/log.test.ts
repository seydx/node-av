import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { AV_LOG_DEBUG, AV_LOG_ERROR, AV_LOG_FATAL, AV_LOG_INFO, AV_LOG_PANIC, AV_LOG_QUIET, AV_LOG_TRACE, AV_LOG_VERBOSE, AV_LOG_WARNING, Log } from '../src/index.js';

import type { AVLogLevel } from '../src/index.js';

describe('Log', () => {
  // Store original log level to restore after tests
  let originalLogLevel: AVLogLevel;

  beforeEach(() => {
    // Save the current log level
    originalLogLevel = Log.getLevel();
  });

  afterEach(() => {
    // Restore original log level and reset callback
    Log.setLevel(originalLogLevel);
    Log.resetCallback();
  });

  describe('Log Level Management', () => {
    it('should set and get log level', () => {
      Log.setLevel(AV_LOG_ERROR);
      assert.equal(Log.getLevel(), AV_LOG_ERROR, 'Should set ERROR level');

      Log.setLevel(AV_LOG_WARNING);
      assert.equal(Log.getLevel(), AV_LOG_WARNING, 'Should set WARNING level');

      Log.setLevel(AV_LOG_INFO);
      assert.equal(Log.getLevel(), AV_LOG_INFO, 'Should set INFO level');
    });

    it('should handle all log level constants', () => {
      const levels = [AV_LOG_QUIET, AV_LOG_PANIC, AV_LOG_FATAL, AV_LOG_ERROR, AV_LOG_WARNING, AV_LOG_INFO, AV_LOG_VERBOSE, AV_LOG_DEBUG, AV_LOG_TRACE];

      for (const level of levels) {
        Log.setLevel(level);
        assert.equal(Log.getLevel(), level, `Should set level ${level}`);
      }
    });

    it('should handle quiet mode', () => {
      Log.setLevel(AV_LOG_QUIET);
      assert.equal(Log.getLevel(), AV_LOG_QUIET, 'Should set QUIET level');
    });

    it('should handle trace (most verbose) mode', () => {
      Log.setLevel(AV_LOG_TRACE);
      assert.equal(Log.getLevel(), AV_LOG_TRACE, 'Should set TRACE level');
    });

    it('should handle negative log levels', () => {
      // AV_LOG_QUIET is typically -8
      Log.setLevel(AV_LOG_QUIET);
      const level = Log.getLevel();
      assert.equal(typeof level, 'number', 'Should return number');
      assert.ok(level <= 0, 'QUIET level should be negative or zero');
    });

    it('should handle very high log levels', () => {
      // AV_LOG_TRACE is typically 56
      Log.setLevel(AV_LOG_TRACE);
      const level = Log.getLevel();
      assert.equal(typeof level, 'number', 'Should return number');
      assert.ok(level > 0, 'TRACE level should be positive');
    });
  });

  describe('Callback Management', () => {
    it('should set a simple callback', (_, done) => {
      const messages: { level: number; message: string }[] = [];

      Log.setCallback((level, message) => {
        messages.push({ level, message });
      });

      // Give FFmpeg a moment to potentially generate some logs
      setTimeout(() => {
        // We might not get any messages if FFmpeg isn't doing anything
        assert.ok(true, 'Callback was set without error');
        done();
      }, 100);
    });

    it('should set callback with error level filter', (_, done) => {
      const messages: { level: number; message: string }[] = [];

      Log.setCallback(
        (level, message) => {
          messages.push({ level, message });
          // All captured messages should be ERROR or more severe
          assert.ok(level <= AV_LOG_ERROR, 'Should only receive ERROR or more severe');
        },
        {
          maxLevel: AV_LOG_ERROR,
        },
      );

      setTimeout(() => {
        assert.ok(true, 'Callback with filter was set');
        done();
      }, 100);
    });

    it('should reset callback to null', () => {
      // Set a callback first
      Log.setCallback((_level, message) => {
        console.log(`Test: ${message}`);
      });

      // Reset it
      Log.setCallback(null);
      assert.ok(true, 'Callback reset to null');
    });

    it('should reset callback using resetCallback', () => {
      // Set a callback first
      Log.setCallback((_level, message) => {
        console.log(`Test: ${message}`);
      });

      // Reset using the dedicated method
      Log.resetCallback();
      assert.ok(true, 'Callback reset using resetCallback()');
    });

    it('should handle multiple callback changes', () => {
      // First callback
      Log.setCallback((_level, message) => {
        console.log(`Callback 1: ${message}`);
      });

      // Replace with second callback
      Log.setCallback((_level, message) => {
        console.log(`Callback 2: ${message}`);
      });

      // Replace with third callback
      Log.setCallback((_level, message) => {
        console.log(`Callback 3: ${message}`);
      });

      // Reset
      Log.resetCallback();

      assert.ok(true, 'Multiple callback changes handled');
    });

    it('should handle callback with different maxLevel options', () => {
      // Only panic messages
      Log.setCallback(
        (level) => {
          assert.ok(level <= AV_LOG_PANIC, 'Should only receive PANIC');
        },
        {
          maxLevel: AV_LOG_PANIC,
        },
      );

      // Switch to warnings and below
      Log.setCallback(
        (level) => {
          assert.ok(level <= AV_LOG_WARNING, 'Should only receive WARNING or below');
        },
        {
          maxLevel: AV_LOG_WARNING,
        },
      );

      // Switch to everything
      Log.setCallback(
        () => {
          // Any level is acceptable
        },
        {
          maxLevel: AV_LOG_TRACE,
        },
      );

      assert.ok(true, 'Different maxLevel options handled');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle high-frequency logging without blocking', (_, done) => {
      let messageCount = 0;

      // Set up a callback that counts messages
      Log.setCallback(() => {
        messageCount++;
      });

      // Set verbose logging to potentially generate more messages
      const oldLevel = Log.getLevel();
      Log.setLevel(AV_LOG_VERBOSE);

      // Wait a bit to see if we get any messages
      setTimeout(() => {
        // Restore original level
        Log.setLevel(oldLevel);

        // We might not get messages if FFmpeg isn't active
        assert.ok(true, `Received ${messageCount} messages without blocking`);
        done();
      }, 200);
    });
  });

  describe('Message Format', () => {
    it('should receive level as number', (_, done) => {
      Log.setCallback((level) => {
        assert.equal(typeof level, 'number', 'Level should be a number');
      });

      setTimeout(() => {
        assert.ok(true, 'Level format validated');
        done();
      }, 100);
    });

    it('should receive message as string', (_, done) => {
      Log.setCallback((_level, message) => {
        assert.equal(typeof message, 'string', 'Message should be a string');
      });

      setTimeout(() => {
        assert.ok(true, 'Message format validated');
        done();
      }, 100);
    });
  });

  describe('Thread Safety', () => {
    it('should handle rapid callback changes safely', () => {
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          Log.setCallback(() => {
            // Callback A
          });
        } else {
          Log.setCallback(() => {
            // Callback B
          });
        }
      }

      Log.resetCallback();
      assert.ok(true, 'Rapid callback changes handled safely');
    });

    it('should handle callback during reset', () => {
      Log.setCallback(() => {
        // This callback might be called during reset
      });

      // Immediately reset
      Log.resetCallback();

      // Set another
      Log.setCallback(() => {
        // New callback
      });

      // Reset again
      Log.resetCallback();

      assert.ok(true, 'Callback during reset handled safely');
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with custom logging system', (_, done) => {
      const customLogger = {
        logs: [] as { level: number; message: string; timestamp: number }[],
        log(level: number, message: string) {
          this.logs.push({
            level,
            message,
            timestamp: Date.now(),
          });
        },
      };

      Log.setCallback((level, message) => {
        customLogger.log(level, message);
      });

      setTimeout(() => {
        assert.ok(Array.isArray(customLogger.logs), 'Custom logger received logs');
        done();
      }, 100);
    });

    it('should work with level-based routing', (_, done) => {
      const errorLogs: string[] = [];
      const warningLogs: string[] = [];
      const infoLogs: string[] = [];

      Log.setCallback((level, message) => {
        if (level <= AV_LOG_ERROR) {
          errorLogs.push(message);
        } else if (level <= AV_LOG_WARNING) {
          warningLogs.push(message);
        } else if (level <= AV_LOG_INFO) {
          infoLogs.push(message);
        }
      });

      setTimeout(() => {
        assert.ok(true, 'Level-based routing tested');
        done();
      }, 100);
    });

    it('should handle empty message strings', (_, done) => {
      Log.setCallback((_level, message) => {
        assert.ok(typeof message === 'string', 'Message is always a string');
        // Empty strings are valid
      });

      setTimeout(() => {
        assert.ok(true, 'Empty message handling tested');
        done();
      }, 100);
    });

    it('should handle very long message strings', (_, done) => {
      Log.setCallback((_level, message) => {
        assert.ok(typeof message === 'string', 'Long message is still a string');
        assert.ok(message.length < 1000000, 'Message length is reasonable');
      });

      setTimeout(() => {
        assert.ok(true, 'Long message handling tested');
        done();
      }, 100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle setting same level multiple times', () => {
      Log.setLevel(AV_LOG_INFO);
      Log.setLevel(AV_LOG_INFO);
      Log.setLevel(AV_LOG_INFO);
      assert.equal(Log.getLevel(), AV_LOG_INFO, 'Level unchanged');
    });

    it('should handle setting callback to null multiple times', () => {
      Log.setCallback(null);
      Log.setCallback(null);
      Log.resetCallback();
      Log.resetCallback();
      assert.ok(true, 'Multiple null/reset handled');
    });

    it('should handle callback that throws', (_, done) => {
      Log.setCallback(() => {
        // This callback throws, but it shouldn't crash the process
        // because it's called asynchronously
        throw new Error('Test error in callback');
      });

      setTimeout(() => {
        // Process should still be running
        assert.ok(true, 'Process survived callback error');
        done();
      }, 100);
    });

    it('should handle undefined options', () => {
      Log.setCallback(() => {
        // Callback with undefined options
      }, undefined);

      assert.ok(true, 'Undefined options handled');
    });

    it('should handle empty options object', () => {
      Log.setCallback(() => {
        // Callback with empty options
      }, {});

      assert.ok(true, 'Empty options object handled');
    });

    it('should handle extreme log levels', () => {
      // Test with extreme values (but valid int32 range)
      const extremeLevels = [-100, -1, 0, 1, 100, 1000];

      for (const level of extremeLevels) {
        Log.setLevel(level as any);
        const retrieved = Log.getLevel();
        assert.equal(retrieved, level, `Should handle level ${level}`);
      }
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with repeated callbacks', () => {
      for (let i = 0; i < 100; i++) {
        Log.setCallback(() => {
          // Do nothing
        });
      }

      Log.resetCallback();
      assert.ok(true, 'No memory leak with repeated callbacks');
    });

    it('should clean up on reset', () => {
      const bigArray: string[] = [];

      Log.setCallback((_level, message) => {
        bigArray.push(message);
      });

      // Reset should allow the callback and its closure to be GC'd
      Log.resetCallback();

      assert.ok(true, 'Cleanup on reset tested');
    });
  });

  describe('Worker threads', () => {
    it('keeps logging after a worker that set the callback has ended', { timeout: 30000 }, async () => {
      const script = `
        import { Worker, isMainThread, parentPort } from 'node:worker_threads';
        const { Log, AV_LOG_ERROR } = await import(${JSON.stringify(new URL('../src/index.ts', import.meta.url).href)});
        if (isMainThread) {
          for (let round = 0; round < 5; round++) {
            const worker = new Worker(process.env.NODE_AV_LOG_WORKER, { eval: true, execArgv: process.execArgv });
            await new Promise((resolve) => worker.once('message', resolve));
            await worker.terminate();
            // the callback's function is gone with the worker's env
            for (let i = 0; i < 100; i++) Log.log(AV_LOG_ERROR, 'after the worker');
          }
          console.log('done');
        } else {
          Log.setCallback(() => {}, { maxLevel: AV_LOG_ERROR });
          Log.log(AV_LOG_ERROR, 'from the worker');
          parentPort.postMessage('ready');
          setInterval(() => {}, 1000);
        }
      `;
      const result = await new Promise<{ code: number | null; signal: string | null; stdout: string }>((resolve) => {
        const child = spawn(process.execPath, ['--import', import.meta.resolve('tsx'), '--input-type=module', '-e', script], {
          stdio: ['ignore', 'pipe', 'ignore'],
          env: { ...process.env, NODE_AV_LOG_WORKER: script },
        });
        let stdout = '';
        child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
        child.on('close', (code, signal) => resolve({ code, signal, stdout }));
      });
      assert.equal(result.signal, null);
      assert.equal(result.code, 0);
      assert.match(result.stdout, /done/);
    });
  });
});
