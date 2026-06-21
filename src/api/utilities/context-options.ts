type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

type WritableKeys<T> = {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P, never>;
}[keyof T];

export type ContextOptions<T> = Partial<{
  [K in WritableKeys<T> as K extends string ? (T[K] extends (...args: never[]) => unknown ? never : K) : never]: T[K];
}>;

/**
 * Apply a {@link ContextOptions} bag onto a native context wrapper.
 *
 * Assigns each provided (defined) field via the wrapper's setter. No-ops when
 * `options` is undefined.
 *
 * @param target - The native context wrapper to mutate
 *
 * @param options - The field/value bag to apply
 *
 * @internal
 */
export function applyContextOptions<T extends object>(target: T, options: ContextOptions<T> | undefined): void {
  if (!options) {
    return;
  }

  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      (target as Record<string, unknown>)[key] = value;
    }
  }
}
