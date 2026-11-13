/**
 * Test reporter that names how a test process died.
 *
 * The spec reporter shows a test file whose process crashed only as 'test failed'. This one adds
 * a line with the signal (SIGSEGV, SIGABRT, ...) or the exit code, and a GitHub Actions error
 * annotation when it runs there. It runs next to the spec reporter (see the test scripts).
 *
 * @module test/crash-reporter
 */

import { relative } from 'node:path';

import type { TestEvent } from 'node:test/reporters';

/** The fields the test runner sets on the error of a test process that ended abnormally. @internal */
interface ProcessFailure {
  signal?: NodeJS.Signals | null;
  exitCode?: number | null;
}

/**
 * Report test processes that were killed by a signal or exited on their own.
 *
 * @param source - Events of the test run
 *
 * @yields One line per test process that ended abnormally
 */
export default async function* crashReporter(source: AsyncIterable<TestEvent>): AsyncGenerator<string> {
  for await (const event of source) {
    if (event.type !== 'test:fail') {
      continue;
    }
    const { signal, exitCode } = (event.data.details.error ?? {}) as ProcessFailure;
    const cause = signal ? `was killed by ${signal}` : typeof exitCode === 'number' ? `exited with code ${exitCode}` : undefined;
    if (!cause) {
      continue;
    }
    const file = event.data.file ? relative(process.cwd(), event.data.file) : event.data.name;
    const message = `The test process of ${file} ${cause}`;
    yield process.env.GITHUB_ACTIONS ? `::error file=${file}::${message}\n` : `✖ ${message}\n`;
  }
}
