let musl: boolean | undefined;

/**
 * Check whether this Node.js runs on musl libc (Alpine Linux and other musl distributions).
 *
 * Only a glibc build of Node.js carries a glibc runtime version in its diagnostic report.
 * Network details are left out of the report, resolving open sockets can take seconds.
 *
 * @returns True on Linux with a musl build of Node.js
 *
 * @internal
 */
export function isMusl(): boolean {
  if (musl !== undefined) {
    return musl;
  }

  musl = false;
  if (process.platform !== 'linux') {
    return musl;
  }

  const report = process.report as NodeJS.ProcessReport & { excludeNetwork?: boolean };
  const excludeNetwork = report.excludeNetwork;
  try {
    report.excludeNetwork = true;
    const { header } = report.getReport() as { header?: { glibcVersionRuntime?: string } };
    musl = !header?.glibcVersionRuntime;
  } catch {
    // No report available, assume glibc
  } finally {
    report.excludeNetwork = excludeNetwork;
  }

  return musl;
}
