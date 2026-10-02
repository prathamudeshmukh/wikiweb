import { useCallback, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { useHints } from './HintsContext';
import { hintFor, type HintKind, mayPeel } from './hintRules';
import { useAppActive } from './useAppActive';
import { usePeelSchedule } from './usePeelSchedule';

interface ColumnHintOptions {
  isHome: boolean;
  isTop: boolean;
  isScreenFocused: boolean;
  /** Changes when Home's list starts over, which puts the focus back on its first card. */
  listKey: string | undefined;
  cardCount: number;
}

export interface ColumnHint {
  kind: HintKind | null;
  /** The card carrying the hint: Home's focused card, a column's first. */
  cardIndex: number;
  peelToken: number;
  /** The list came to rest with this card in focus. */
  settled(index: number): void;
  /** A finger went down on the column: no peel until it lifts, then a full idle wait. */
  touchStarted(): void;
  touchEnded(): void;
}

/** A column's first-hop hint (SPEC.md §4.4). */
export function useColumnHint({ isHome, isTop, isScreenFocused, listKey, cardCount }: ColumnHintOptions): ColumnHint {
  const { progress, peeled } = useHints();
  const isAppActive = useAppActive();
  const reduceMotion = useReducedMotion();
  const [focus, setFocus] = useState({ listKey, index: 0 });
  const [isTouching, setTouching] = useState(false);
  const focusedIndex = focus.listKey === listKey ? focus.index : 0;

  const kind = hintFor(progress, isHome);
  const cardIndex = isHome ? focusedIndex : 0;
  const hasArticleInFocus = cardIndex < cardCount;
  const active = mayPeel(kind, { isHome, isTop, isScreenFocused, isAppActive, reduceMotion, hasArticleInFocus, isTouching });
  const { peelToken } = usePeelSchedule({ homeShown: isHome && isTop && isScreenFocused, active }, peeled);

  // A pull-to-refresh bounce can rest above the first card.
  const settled = useCallback((index: number) => setFocus({ listKey, index: Math.max(0, index) }), [listKey]);
  const touchStarted = useCallback(() => setTouching(true), []);
  const touchEnded = useCallback(() => setTouching(false), []);
  return { kind, cardIndex, peelToken, settled, touchStarted, touchEnded };
}
