import type { Card } from '../content/card';
import type { Feed, FeedPage } from '../content/pagedFeed';

/** A Home feed ready to go on screen; `firstPage` is null when it should load the normal way. */
export interface NextHome {
  feed: Feed;
  firstPage: FeedPage | null;
}

/**
 * Home refresh (SPEC.md §3.2): the next Home is built in the background while the user explores, so it can
 * replace the stale one the moment they are back. No Home repeats a card an earlier one showed this session.
 */
export interface HomeRefresher {
  /** The Home the app opens on. */
  openingFeed(): Feed;
  /** Starts building the next Home, unless one is already on its way or ready. */
  prebuild(): void;
  /** Builds the next Home if needed; true once its first page is in, false if it failed (reported and forgotten). */
  ready(): Promise<boolean>;
  /** The ready next Home, without cards shown or read since it was built; null while none is ready. */
  take(): NextHome | null;
  /** Cards that reached the screen; no later Home shows them again. */
  markShown(cards: readonly Card[]): void;
}

export interface RefresherSettings {
  buildFeed: (wasShown: (pageId: number) => boolean) => Feed;
  isRead: (pageId: number) => boolean;
  onError: (error: unknown) => void;
}

interface Upcoming {
  feed: Feed;
  firstPage: FeedPage | null;
  settled: Promise<boolean>;
}

export function createHomeRefresher({ buildFeed, isRead, onError }: RefresherSettings): HomeRefresher {
  const shownIds = new Set<number>();
  const wasShown = (pageId: number) => shownIds.has(pageId);
  let upcoming: Upcoming | null = null;

  function startNext(): Upcoming {
    if (upcoming) return upcoming;
    const feed = buildFeed(wasShown);
    const next: Upcoming = { feed, firstPage: null, settled: Promise.resolve(false) };
    next.settled = feed.nextPage().then(
      (page) => {
        next.firstPage = page;
        return true;
      },
      (error: unknown) => {
        onError(error);
        if (upcoming === next) upcoming = null;
        return false;
      },
    );
    upcoming = next;
    return next;
  }

  return {
    openingFeed: () => buildFeed(wasShown),

    prebuild() {
      startNext();
    },

    ready: () => startNext().settled,

    take() {
      if (!upcoming?.firstPage) return null;
      const { feed, firstPage } = upcoming;
      upcoming = null;
      // Built while the user explored, so its first page predates whatever they saw or read since.
      const cards = firstPage.cards.filter((card) => !wasShown(card.pageId) && !isRead(card.pageId));
      return { feed, firstPage: cards.length > 0 ? { ...firstPage, cards } : null };
    },

    markShown(cards) {
      cards.forEach((card) => shownIds.add(card.pageId));
    },
  };
}
