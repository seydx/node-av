import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AVERROR_EAGAIN, AVERROR_EINVAL, AVERROR_EOF, AVERROR_INVALIDDATA } from '../src/constants/index.js';
import { FFmpegError } from '../src/lib/index.js';

describe('FFmpegError', () => {
  describe('Constructor', () => {
    it('should create error with error code', () => {
      const error = new FFmpegError(-1);
      assert.ok(error instanceof FFmpegError, 'Should be FFmpegError instance');
      assert.ok(error instanceof Error, 'Should be Error instance');
      assert.equal(error.name, 'FFmpegError', 'Should have correct name');
    });

    it('should create error with negative error code', () => {
      const error = new FFmpegError(-22); // EINVAL
      assert.ok(error instanceof FFmpegError);
      assert.equal(error.code, -22, 'Should store error code');
    });

    it('should create error without code', () => {
      const error = new FFmpegError();
      assert.ok(error instanceof FFmpegError);
      assert.equal(error.message, 'FFmpeg Error', 'Should have default message');
    });

    it('should create error with zero code', () => {
      const error = new FFmpegError(0);
      assert.ok(error instanceof FFmpegError);
      assert.equal(error.code, 0);
    });

    it('should have proper error message for known codes', () => {
      // Common FFmpeg error codes
      const error1 = new FFmpegError(-11); // EAGAIN
      assert.ok(error1.message.length > 0, 'Should have message for EAGAIN');

      const error2 = new FFmpegError(-22); // EINVAL
      assert.ok(error2.message.length > 0, 'Should have message for EINVAL');
    });

    it('should maintain stack trace', () => {
      const error = new FFmpegError(-1);
      assert.ok(error.stack, 'Should have stack trace');
      assert.ok(error.stack.includes('FFmpegError'), 'Stack should contain FFmpegError');
    });
  });

  describe('Properties', () => {
    it('should get error code', () => {
      const error = new FFmpegError(-42);
      assert.equal(error.code, -42, 'Should return error code');
    });

    it('should get error message', () => {
      const error = new FFmpegError(-22); // EINVAL
      assert.equal(typeof error.message, 'string', 'Message should be string');
      assert.ok(error.message.length > 0, 'Message should not be empty');
    });

    it('should have correct name property', () => {
      const error = new FFmpegError(-1);
      assert.equal(error.name, 'FFmpegError');
    });
  });

  describe('Static Methods', () => {
    describe('strerror', () => {
      it('should get error string for error code', () => {
        const message = FFmpegError.strerror(-22); // EINVAL
        assert.equal(typeof message, 'string', 'Should return string');
        assert.ok(message.length > 0, 'Should have non-empty message');
      });

      it('should handle common error codes', () => {
        const errors = [
          -1, // EPERM
          -2, // ENOENT
          -5, // EIO
          -11, // EAGAIN
          -12, // ENOMEM
          -22, // EINVAL
        ];

        for (const code of errors) {
          const message = FFmpegError.strerror(code);
          assert.ok(message, `Should have message for error ${code}`);
          assert.ok(message.length > 0, `Message should not be empty for ${code}`);
        }
      });

      it('should handle positive error codes', () => {
        const message = FFmpegError.strerror(22); // Positive EINVAL
        assert.ok(message, 'Should handle positive codes');
      });

      it('should handle zero', () => {
        const message = FFmpegError.strerror(0);
        assert.ok(typeof message === 'string', 'Should return string for zero');
      });

      it('should handle unknown error codes', () => {
        const message = FFmpegError.strerror(-99999);
        assert.ok(message, 'Should have message for unknown code');
        // Usually returns something like "Unknown error" or the error number
      });
    });

    describe('isFFmpegError', () => {
      it('should identify negative codes as errors', () => {
        assert.ok(FFmpegError.isFFmpegError(-1), '-1 should be error');
        assert.ok(FFmpegError.isFFmpegError(-22), '-22 should be error');
        assert.ok(FFmpegError.isFFmpegError(-100), '-100 should be error');
      });

      it('should not identify positive codes as errors', () => {
        assert.ok(!FFmpegError.isFFmpegError(0), '0 should not be error');
        assert.ok(!FFmpegError.isFFmpegError(1), '1 should not be error');
        assert.ok(!FFmpegError.isFFmpegError(100), '100 should not be error');
      });

      it('should handle zero correctly', () => {
        assert.ok(!FFmpegError.isFFmpegError(0), 'Zero should not be error');
      });

      it('should handle large negative numbers', () => {
        assert.ok(FFmpegError.isFFmpegError(-2147483648), 'INT32_MIN should be error');
      });

      it('should handle large positive numbers', () => {
        assert.ok(!FFmpegError.isFFmpegError(2147483647), 'INT32_MAX should not be error');
      });
    });

    describe('fromCode', () => {
      it('should create error for negative code', () => {
        const error = FFmpegError.fromCode(-22);
        assert.ok(error instanceof FFmpegError, 'Should create FFmpegError');
        assert.equal(error?.code, -22, 'Should have correct code');
      });

      it('should return null for positive code', () => {
        const error = FFmpegError.fromCode(0);
        assert.equal(error, null, 'Should return null for 0');

        const error2 = FFmpegError.fromCode(100);
        assert.equal(error2, null, 'Should return null for positive');
      });

      it('should handle edge cases', () => {
        const error1 = FFmpegError.fromCode(-1);
        assert.ok(error1 instanceof FFmpegError);

        const error2 = FFmpegError.fromCode(0);
        assert.equal(error2, null);

        const error3 = FFmpegError.fromCode(1);
        assert.equal(error3, null);
      });
    });

    describe('throwIfError', () => {
      it('should throw for negative code', () => {
        assert.throws(
          () => {
            FFmpegError.throwIfError(-22);
          },
          {
            name: 'FFmpegError',
          },
          'Should throw FFmpegError',
        );
      });

      it('should not throw for zero', () => {
        assert.doesNotThrow(() => {
          FFmpegError.throwIfError(0);
        }, 'Should not throw for 0');
      });

      it('should not throw for positive code', () => {
        assert.doesNotThrow(() => {
          FFmpegError.throwIfError(100);
        }, 'Should not throw for positive');
      });

      it('should include operation name in error message', () => {
        assert.throws(
          () => {
            FFmpegError.throwIfError(-22, 'testOperation');
          },
          (err: any) => {
            assert.ok(err.message.includes('testOperation'), 'Should include operation name');
            return true;
          },
        );
      });

      it('should work without operation name', () => {
        assert.throws(
          () => {
            FFmpegError.throwIfError(-22);
          },
          (err: any) => {
            assert.ok(err instanceof FFmpegError);
            assert.equal(err.code, -22);
            return true;
          },
        );
      });

      it('should preserve error code when throwing', () => {
        try {
          FFmpegError.throwIfError(-42, 'myOperation');
          assert.fail('Should have thrown');
        } catch (err: any) {
          assert.equal(err.code, -42, 'Should preserve error code');
        }
      });
    });

    describe('is', () => {
      it('should match equal error codes', () => {
        assert.ok(FFmpegError.is(-22, -22), 'Should match equal codes');
        assert.ok(FFmpegError.is(0, 0), 'Should match zero');
        assert.ok(FFmpegError.is(100, 100), 'Should match positive');
      });

      it('should not match different error codes', () => {
        assert.ok(!FFmpegError.is(-22, -11), 'Should not match different negatives');
        assert.ok(!FFmpegError.is(0, -1), 'Should not match zero and negative');
        assert.ok(!FFmpegError.is(100, 200), 'Should not match different positives');
      });

      it('should handle edge cases', () => {
        assert.ok(FFmpegError.is(-1, -1));
        assert.ok(!FFmpegError.is(-1, 1));
        assert.ok(!FFmpegError.is(1, -1));
      });
    });
  });

  describe('Error Inheritance', () => {
    it('should be instanceof Error', () => {
      const error = new FFmpegError(-1);
      assert.ok(error instanceof Error);
    });

    it('should be instanceof FFmpegError', () => {
      const error = new FFmpegError(-1);
      assert.ok(error instanceof FFmpegError);
    });

    it('should work with try-catch', () => {
      try {
        throw new FFmpegError(-22);
      } catch (err) {
        assert.ok(err instanceof FFmpegError);
        assert.ok(err instanceof Error);
      }
    });

    it('should work with Promise rejection', async () => {
      try {
        await Promise.reject(new FFmpegError(-22));
        assert.fail('Should have rejected');
      } catch (err) {
        assert.ok(err instanceof FFmpegError);
      }
    });
  });

  describe('Common FFmpeg Error Codes', () => {
    it('should handle AVERROR_EOF', () => {
      // EOF is typically a special FFmpeg error code
      const error = new FFmpegError(-541478725); // Common AVERROR_EOF value
      assert.ok(error instanceof FFmpegError);
      assert.ok(error.message, 'Should have message for EOF');
    });

    it('should handle AVERROR_EAGAIN', () => {
      // EAGAIN is typically -11
      const error = new FFmpegError(-11);
      assert.ok(error instanceof FFmpegError);
      assert.ok(error.message, 'Should have message for EAGAIN');
    });

    it('should handle AVERROR(EINVAL)', () => {
      // EINVAL is typically -22
      const error = new FFmpegError(-22);
      assert.ok(error instanceof FFmpegError);
      assert.ok(error.message, 'Should have message for EINVAL');
    });

    it('should handle AVERROR(ENOMEM)', () => {
      // ENOMEM is typically -12
      const error = new FFmpegError(-12);
      assert.ok(error instanceof FFmpegError);
      assert.ok(error.message, 'Should have message for ENOMEM');
    });
  });

  describe('Typed Code Helpers', () => {
    it('should expose isEOF for AVERROR_EOF', () => {
      const error = new FFmpegError(AVERROR_EOF);
      assert.strictEqual(error.isEOF, true);
      assert.strictEqual(error.isEAGAIN, false);
      assert.strictEqual(error.isInvalidData, false);
    });

    it('should expose isEAGAIN for AVERROR_EAGAIN', () => {
      const error = new FFmpegError(AVERROR_EAGAIN);
      assert.strictEqual(error.isEAGAIN, true);
      assert.strictEqual(error.isEOF, false);
    });

    it('should expose isInvalidData for AVERROR_INVALIDDATA', () => {
      const error = new FFmpegError(AVERROR_INVALIDDATA);
      assert.strictEqual(error.isInvalidData, true);
    });

    it('should expose isEINVAL for AVERROR_EINVAL', () => {
      const error = new FFmpegError(AVERROR_EINVAL);
      assert.strictEqual(error.isEINVAL, true);
    });

    it('should match arbitrary codes via instance is()', () => {
      const error = new FFmpegError(AVERROR_EOF);
      assert.strictEqual(error.is(AVERROR_EOF), true);
      assert.strictEqual(error.is(AVERROR_EAGAIN), false);
    });
  });

  describe('Usage Patterns', () => {
    it('should work in error checking pattern', () => {
      function mockFFmpegFunction(): number {
        return -22; // Return error
      }

      const ret = mockFFmpegFunction();
      if (ret < 0) {
        const error = new FFmpegError(ret);
        assert.ok(error.message);
        assert.equal(error.code, -22);
      }
    });

    it('should work with fromCode pattern', () => {
      function mockFFmpegFunction(): number {
        return -22; // Return error
      }

      const ret = mockFFmpegFunction();
      const error = FFmpegError.fromCode(ret);
      if (error) {
        assert.ok(error instanceof FFmpegError);
        assert.equal(error.code, -22);
      }
    });

    it('should work with throwIfError pattern', () => {
      function mockFFmpegFunction(): number {
        return -22; // Return error
      }

      const ret = mockFFmpegFunction();
      assert.throws(
        () => {
          FFmpegError.throwIfError(ret, 'mockFunction');
        },
        {
          name: 'FFmpegError',
        },
      );
    });

    it('should work with is pattern', () => {
      function mockFFmpegFunction(): number {
        return -11; // EAGAIN
      }

      const ret = mockFFmpegFunction();
      const AVERROR_EAGAIN = -11;

      if (FFmpegError.is(ret, AVERROR_EAGAIN)) {
        assert.ok(true, 'Correctly identified EAGAIN');
      } else {
        assert.fail('Should have identified EAGAIN');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large negative numbers', () => {
      const error = new FFmpegError(-2147483648); // INT32_MIN
      assert.ok(error instanceof FFmpegError);
      assert.equal(error.code, -2147483648);
    });

    it('should handle very large positive numbers in strerror', () => {
      const message = FFmpegError.strerror(2147483647); // INT32_MAX
      assert.ok(message);
    });

    it('should handle undefined in constructor', () => {
      const error = new FFmpegError(undefined);
      assert.ok(error instanceof FFmpegError);
      assert.equal(error.message, 'FFmpeg Error');
    });

    it('should handle multiple error creations', () => {
      const errors = [];
      for (let i = 0; i < 100; i++) {
        errors.push(new FFmpegError(-i));
      }

      assert.equal(errors.length, 100);
      assert.ok(errors.every((e) => e instanceof FFmpegError));
    });

    it('should have unique stack traces', () => {
      const error1 = new FFmpegError(-1);
      const error2 = new FFmpegError(-1);

      assert.notEqual(error1.stack, error2.stack, 'Stack traces should be unique');
    });
  });

  describe('Internal Methods', () => {
    it('should have getNative method', () => {
      const error = new FFmpegError(-22);
      const native = error.getNative();
      assert.ok(native, 'Should return native object');
    });
  });

  describe('Memory Management', () => {
    it('should handle rapid error creation', () => {
      for (let i = 0; i < 1000; i++) {
        const error = new FFmpegError(-i);
        assert.ok(error.code === -i);
      }
    });

    it('should handle rapid static method calls', () => {
      for (let i = 0; i < 1000; i++) {
        const message = FFmpegError.strerror(-i);
        assert.ok(message);
      }
    });
  });
});
