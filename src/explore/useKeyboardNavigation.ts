import type { Card } from '../content/card';
import type { Rect } from './hopController';

export interface KeyboardNavigationOptions {
  /** Nothing is on top of the explore screen and no hop is in flight. */
  enabled: boolean;
  /** The card the keys act on, from the column on top. */
  target: () => Card | null;
  back: () => void;
  /** Runs a hop from the card, flying from where it sits on screen. */
  hopFrom: (card: Card, from: Rect) => void;
  read: (card: Card) => void;
}

/** ←/→/Enter on the explore screen (SPEC.md §15.3); native has no keyboard to speak of. */
export function useKeyboardNavigation(_options: KeyboardNavigationOptions): void {}
