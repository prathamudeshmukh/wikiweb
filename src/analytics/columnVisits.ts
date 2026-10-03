import type { Card } from '../content/card';
import type { ColumnEntry } from '../explore/columnStack';
import type { FeedStatus } from '../feeds/useFeed';
import type { Analytics } from './analytics';
import { cardProperties, columnProperties } from './cardProperties';
import type { ColumnOutcome, ColumnSummary } from './events';

const MS_PER_SECOND = 1000;

/** The stretch of time one column spends on top, from becoming top to stopping. */
interface Visit {
  entry: ColumnEntry;
  startedAt: number;
  /** Seen cards' page ids → their position. */
  seen: ReadonlyMap<number, number>;
  reads: number;
  feedEnd: ColumnSummary['feed_end'];
}

/**
 * Feed quality per column (SPEC.md §11): `card_seen` once per card per visit, `read_open` for cards
 * opened, and a `column_left` summary when the visit ends. Only the column on top is visited.
 */
export interface ColumnVisits {
  /**
   * A column is on top, with its feed in this state. Re-entering the current column keeps its visit going
   * and updates how its feed ended; the status comes with the entry so a feed that ended offscreen counts.
   */
  enter(entry: ColumnEntry, status: FeedStatus): void;
  leave(outcome: ColumnOutcome): void;
  /** Ends the current visit and starts a fresh one on the same column (Home pull-to-refresh). */
  restart(outcome: ColumnOutcome): void;
  cardSeen(columnId: string, card: Card, position: number): void;
  cardOpened(card: Card): void;
  /** Where a card sat in the current visit, if it was seen. */
  positionOf(pageId: number): number | null;
}

interface ColumnVisitsDeps {
  analytics: Analytics;
  now: () => number;
}

const FEED_END: Partial<Record<FeedStatus, ColumnSummary['feed_end']>> = { done: 'dead_end', error: 'error' };

function summaryOf(visit: Visit, outcome: ColumnOutcome, at: number): ColumnSummary {
  const positions = [...visit.seen.values()];
  return {
    ...columnProperties(visit.entry),
    outcome,
    cards_seen: positions.length,
    deepest_position: positions.length ? Math.max(...positions) : null,
    reads: visit.reads,
    seconds: Math.round((at - visit.startedAt) / MS_PER_SECOND),
    feed_end: visit.feedEnd,
  };
}

export function createColumnVisits({ analytics, now }: ColumnVisitsDeps): ColumnVisits {
  let visit: Visit | null = null;

  const begin = (entry: ColumnEntry, feedEnd: Visit['feedEnd']) => {
    visit = { entry, startedAt: now(), seen: new Map(), reads: 0, feedEnd };
  };

  const leave = (outcome: ColumnOutcome) => {
    if (!visit) return;
    analytics.track({ name: 'column_left', properties: summaryOf(visit, outcome, now()) });
    visit = null;
  };

  const positionOf = (pageId: number) => visit?.seen.get(pageId) ?? null;

  return {
    enter(entry, status) {
      const feedEnd = FEED_END[status] ?? null;
      if (visit?.entry.id === entry.id) {
        visit = { ...visit, feedEnd };
        return;
      }
      leave('replaced');
      begin(entry, feedEnd);
    },

    leave,

    restart(outcome) {
      if (!visit) return;
      const { entry, feedEnd } = visit;
      leave(outcome);
      begin(entry, feedEnd);
    },

    cardSeen(columnId, card, position) {
      if (visit?.entry.id !== columnId || visit.seen.has(card.pageId)) return;
      visit = { ...visit, seen: new Map([...visit.seen, [card.pageId, position]]) };
      analytics.track({ name: 'card_seen', properties: { ...cardProperties(card, position), ...columnProperties(visit.entry) } });
    },

    cardOpened(card) {
      if (!visit) return;
      visit = { ...visit, reads: visit.reads + 1 };
      analytics.track({
        name: 'read_open',
        properties: { entry: 'card', ...cardProperties(card, positionOf(card.pageId)), ...columnProperties(visit.entry) },
      });
    },

    positionOf,
  };
}
