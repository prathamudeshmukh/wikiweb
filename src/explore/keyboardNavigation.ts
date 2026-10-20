import type { ViewToken } from 'react-native';
import type { Card } from '../content/card';

export type KeyCommand = 'back' | 'hop' | 'read';

/** The parts of a `keydown` the map reads. */
export interface KeyPress {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
}

// SPEC.md §15.3.
const COMMANDS: Readonly<Record<string, KeyCommand>> = { ArrowLeft: 'back', ArrowRight: 'hop', Enter: 'read' };

/**
 * What a key press asks of the explore screen. Modified keys stay the browser's (Alt+← is its Back, which reaches the
 * app through history anyway), and a held key doesn't fire hop after hop.
 */
export function keyCommand(press: KeyPress): KeyCommand | null {
  if (press.altKey || press.ctrlKey || press.metaKey || press.shiftKey || press.repeat) return null;
  return COMMANDS[press.key] ?? null;
}

/** The card the keys act on: the topmost one dwelt on, else the column's first. */
export function keyboardTarget(dwelling: readonly ViewToken<Card>[], cards: readonly Card[]): Card | null {
  const topmost = dwelling.reduce<ViewToken<Card> | null>((best, next) => ((next.index ?? Infinity) < (best?.index ?? Infinity) ? next : best), null);
  return topmost?.item ?? cards[0] ?? null;
}
