import { HOME_SNAPSHOT } from '../config/constants';
import type { Card } from '../content/card';
import { utcDay } from '../content/utcDay';

/** The Home on screen, saved so the next cold start opens on it without the network (SPEC.md §3.2). */
export interface HomeSnapshot {
  /** The interest picks it was built for, joined with `|`. */
  interestsKey: string;
  cards: readonly Card[];
}

export interface RestoreContext {
  interestsKey: string;
  now: Date;
  isRead: (pageId: number) => boolean;
}

export function snapshotOf({ interestsKey, cards }: { interestsKey: string; cards: readonly Card[] }): HomeSnapshot {
  return { interestsKey, cards: cards.slice(0, HOME_SNAPSHOT.maxCards) };
}

/** The saved cards still fit for Home: same interests, not read since, and no Today on Wikipedia from another day. */
export function restorableCards(snapshot: HomeSnapshot, { interestsKey, now, isRead }: RestoreContext): Card[] {
  if (snapshot.interestsKey !== interestsKey) return [];
  // Dated per card, not per snapshot: a Home kept open past midnight is saved again with yesterday's Today cards.
  const isStale = (card: Card) => card.source === 'home_today' && card.featuredOn !== utcDay(now);
  return snapshot.cards.filter((card) => !isRead(card.pageId) && !isStale(card));
}
