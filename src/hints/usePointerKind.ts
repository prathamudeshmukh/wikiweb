import type { PointerKind } from '../analytics/pointerKind';

/** The primary pointer the hints are written for. A phone app is always touched. */
export function usePointerKind(): PointerKind {
  return 'coarse';
}
