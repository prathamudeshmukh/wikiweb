import { type PointerKind, pointerKind } from './pointerKind';

/** The browser's primary pointer, shared by analytics (SPEC.md §15.7) and the desktop hints (§4.4). */
export function browserPointerKind(): PointerKind {
  return pointerKind(typeof window.matchMedia === 'function' ? (query) => window.matchMedia(query) : undefined);
}
