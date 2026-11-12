/** The device's primary pointer: splits phones from desktops on web, where `platform` is always `web` (SPEC.md §15.7). */
export type PointerKind = 'coarse' | 'fine' | 'none' | 'unknown';

export type MediaQueryMatcher = (query: string) => { matches: boolean };

const ANSWERED_KINDS = ['coarse', 'fine', 'none'] as const;

export function pointerKind(matchMedia: MediaQueryMatcher | undefined): PointerKind {
  if (!matchMedia) return 'unknown';
  try {
    return ANSWERED_KINDS.find((kind) => matchMedia(`(pointer: ${kind})`).matches) ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
