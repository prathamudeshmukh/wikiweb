import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Card } from '../content/card';
import type { Rect } from './hopController';
import { type KeyCommand, keyCommand } from './keyboardNavigation';
import type { KeyboardNavigationOptions } from './useKeyboardNavigation';

/** Where the card sits on screen. A parked column below can hold the same card, so only the one in front counts. */
function cardRect(card: Card): Rect | null {
  for (const element of document.querySelectorAll(`[data-testid="card-${card.pageId}"]`)) {
    const { x, y, width, height } = element.getBoundingClientRect();
    const inFront = element.contains(document.elementFromPoint(x + width / 2, y + Math.min(height / 2, window.innerHeight / 2)));
    if (inFront) return { x, y, width, height };
  }
  return null;
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

/** ←/→/Enter on the explore screen (SPEC.md §15.3). */
export function useKeyboardNavigation(options: KeyboardNavigationOptions): void {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const run: Record<KeyCommand, () => boolean> = {
      back: () => {
        latest.current.back();
        return true;
      },
      hop: () => {
        const card = latest.current.target();
        const from = card && cardRect(card);
        if (!card || !from) return false;
        latest.current.hopFrom(card, from);
        return true;
      },
      read: () => {
        const card = latest.current.target();
        if (card) latest.current.read(card);
        return card !== null;
      },
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const command = keyCommand(event);
      if (!command || !latest.current.enabled || isTyping(event.target)) return;
      if (run[command]()) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
