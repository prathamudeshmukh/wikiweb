import type { Feed, FeedPage } from '../content/pagedFeed';
import { createLane, type Lane } from '../wiki-api/requestBudget';
import { type ColumnEntry, isSeeded, type SeededEntry } from './columnStack';

/**
 * Dwell prefetch (SPEC.md §7): a column's first page starts loading while the user is still reading the card,
 * on a low-priority lane, so the hop into it is instant. The column then takes over the same feed.
 */
export interface ColumnPrefetcher {
  /** Starts loading the column's first page; ignored if already prefetched or too many are in flight. */
  prefetch(entry: ColumnEntry): void;
  /** Stops an unfinished prefetch (the card scrolled away). A finished one is kept — it costs nothing more. */
  cancel(entryId: string): void;
  /** The prefetched column, promoted to on-screen; the same feed until released. Null when there is none. */
  take(entryId: string): Feed | null;
  /** The column unmounted; a later hop into it starts fresh. */
  release(entryId: string): void;
}

export interface PrefetchSettings {
  /** Builds a column's feed whose requests run on `lane`. */
  feedFor: (entry: SeededEntry, lane: Lane) => Feed;
  maxConcurrent: number;
  /** Finished, unclaimed prefetches kept for a later hop. */
  maxKept: number;
}

interface Prefetched {
  lane: Lane;
  feed: Feed;
  finished: boolean;
}

/** A feed whose first page is one already in flight. */
function primedFeed(feed: Feed, firstPage: Promise<FeedPage>): Feed {
  let first: Promise<FeedPage> | null = firstPage;
  return {
    nextPage() {
      const page = first ?? feed.nextPage();
      first = null;
      return page;
    },
  };
}

export function createColumnPrefetcher({ feedFor, maxConcurrent, maxKept }: PrefetchSettings): ColumnPrefetcher {
  const columns = new Map<string, Prefetched>();
  const inFlight = () => [...columns.values()].filter((column) => !column.finished).length;

  function evictBeyond(limit: number) {
    const finished = [...columns].filter(([, column]) => column.finished && column.lane.state === 'prefetch');
    finished.slice(0, Math.max(0, finished.length - limit)).forEach(([id]) => columns.delete(id));
  }

  return {
    prefetch(entry) {
      if (!isSeeded(entry) || columns.has(entry.id) || inFlight() >= maxConcurrent) return;
      const lane = createLane('prefetch');
      const source = feedFor(entry, lane);
      const firstPage = source.nextPage();
      const prefetched: Prefetched = { lane, feed: primedFeed(source, firstPage), finished: false };
      columns.set(entry.id, prefetched);
      firstPage.then(
        () => {
          prefetched.finished = true;
          evictBeyond(maxKept);
        },
        // Failed or cancelled: forget it, so the column loads (and reports errors) the normal way.
        () => {
          if (columns.get(entry.id) === prefetched) columns.delete(entry.id);
        },
      );
    },

    cancel(entryId) {
      const column = columns.get(entryId);
      if (!column || column.finished || column.lane.state !== 'prefetch') return;
      column.lane.cancel();
      columns.delete(entryId);
    },

    take(entryId) {
      const column = columns.get(entryId);
      if (!column) return null;
      column.lane.promote();
      return column.feed;
    },

    release(entryId) {
      columns.delete(entryId);
    },
  };
}
