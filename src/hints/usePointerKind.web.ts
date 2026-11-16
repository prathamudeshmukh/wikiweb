import { useState } from 'react';
import { browserPointerKind } from '../analytics/browserPointer.web';
import type { PointerKind } from '../analytics/pointerKind';

/** Read once, like the analytics property: a hybrid laptop keeps its primary pointer (SPEC.md §15.7). */
export function usePointerKind(): PointerKind {
  const [kind] = useState(browserPointerKind);
  return kind;
}
