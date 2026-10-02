import type { HintProgress } from './hintProgress';

export type HintKind = 'swipe' | 'back';

/** What a column knows about its surroundings when deciding whether its hint may move (SPEC.md §4.4). */
export interface ColumnHintState {
  isHome: boolean;
  isTop: boolean;
  /** Nothing (the reader, the Logbook) is over the explore screen. */
  isScreenFocused: boolean;
  isAppActive: boolean;
  reduceMotion: boolean;
  /** The focused list item is an article card, not the compass, error or offline card. */
  hasArticleInFocus: boolean;
  /** A finger is on the column. */
  isTouching: boolean;
}

/** The hint a column shows: Home teaches the first hop, any other column the first return. */
export function hintFor(progress: HintProgress | undefined, isHome: boolean): HintKind | null {
  if (!progress) return null;
  if (isHome) return progress.swipeHintShown ? null : 'swipe';
  return progress.backHintShown ? null : 'back';
}

/** Only Home's hint peels, and only while the user can actually see and act on it. */
export function mayPeel(hint: HintKind | null, state: ColumnHintState): boolean {
  const { isHome, isTop, isScreenFocused, isAppActive, reduceMotion, hasArticleInFocus, isTouching } = state;
  const canSee = isHome && isTop && isScreenFocused && isAppActive;
  return hint === 'swipe' && canSee && !reduceMotion && hasArticleInFocus && !isTouching;
}
