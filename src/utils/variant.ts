/**
 * FFmpeg build variant of this package.
 *
 * `gpl` is published as node-av, `lgpl` as node-av-lgpl and `light` as node-av-light.
 * The release workflow sets it in the compiled file of each variant package, which
 * picks the native binding and the FFmpeg CLI package of that variant.
 *
 * @internal
 */
export const VARIANT: 'gpl' | 'lgpl' | 'light' = 'gpl';

/**
 * Name prefix of the variant's platform packages with the native binding.
 *
 * @returns Package name prefix, e.g. `@seydx/node-av` or `@seydx/node-av-lgpl`
 *
 * @internal
 */
export function nativePackagePrefix(): string {
  return VARIANT === 'gpl' ? '@seydx/node-av' : `@seydx/node-av-${VARIANT}`;
}

/**
 * Name of the variant's FFmpeg CLI package.
 *
 * @returns Package name, e.g. `@seydx/node-av-ffmpeg` or `@seydx/node-av-ffmpeg-lgpl`
 *
 * @internal
 */
export function ffmpegPackageName(): string {
  return VARIANT === 'gpl' ? '@seydx/node-av-ffmpeg' : `@seydx/node-av-ffmpeg-${VARIANT}`;
}
