import type { PointerKind } from '../analytics/pointerKind';
import type { HintKind } from './hintRules';

// DESIGN.md §8. A mouse can't swipe: it drags, or the keys do the same (SPEC.md §15.3).
const TOUCH_COPY: Record<HintKind, string> = {
  swipe: '← SWIPE LEFT TO TAKE A TANGENT',
  back: 'SWIPE RIGHT TO GO BACK →',
};

const MOUSE_COPY: Record<HintKind, string> = {
  swipe: 'DRAG OR PRESS → TO TAKE A TANGENT',
  back: 'DRAG OR PRESS ← TO GO BACK',
};

/** The hint chip's words. Only a fine pointer gets the mouse copy; an unknown one keeps the touch copy. */
export function hintCopy(kind: HintKind, pointer: PointerKind): string {
  return pointer === 'fine' ? MOUSE_COPY[kind] : TOUCH_COPY[kind];
}
