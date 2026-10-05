import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HOME_SNAPSHOT } from '../config/constants';
import { HOME_TITLE_BLOCKLIST } from '../config/homeBlocklist';
import type { Card } from '../content/card';
import { createHomeFeed } from '../content/homeFeed';
import type { Feed, FeedPage } from '../content/pagedFeed';
import { createRestoringFeed } from '../content/restoringFeed';
import { type FeedView, useFeed } from '../feeds/useFeed';
import type { JourneySession } from '../journeys/journeySession';
import { useAppServices } from '../services/AppServices';
import { reportError } from '../services/reportError';
import { createHomeRefresher, type HomeRefresher } from './homeRefresh';
import { restorableCards, snapshotOf } from './homeSnapshot';
import type { HomeSnapshotStore } from './homeSnapshotStore';

export interface HomeFeedView extends FeedView {
  /** Goes up each time a fresh Home replaces the old one; the list starts again from the top. */
  generation: number;
  /** A pull-to-refresh is waiting for the fresh Home. */
  refreshing: boolean;
  refresh(): void;
  /** The user scrolled or opened a card; a fresh Home arriving after that waits rather than yank the list away. */
  touched(): void;
}

const NO_IDS: ReadonlySet<number> = new Set();

const onSourceError = (error: unknown) => reportError('feed.source', error);
const onRefreshError = (error: unknown) => reportError('feed.home_refresh', error);
const onRestoreError = (error: unknown) => reportError('feed.home_restore', error);
const onSaveError = (error: unknown) => reportError('feed.home_save', error);

// Read history loads asynchronously and grows while browsing, so ask the session each time.
const readCheck = (journeys: JourneySession) => (pageId: number) => journeys.getState().readIds.has(pageId);

interface ShownHome {
  refresher: HomeRefresher;
  generation: number;
  feed: Feed;
  firstPage: FeedPage | null;
}

function useRefresher(interests: readonly string[]): HomeRefresher {
  const { api, journeys, nudges } = useAppServices();
  const interestsKey = interests.join('|');
  return useMemo(() => {
    const isRead = readCheck(journeys);
    return createHomeRefresher({
      buildFeed: (wasShown) =>
        createHomeFeed(api, {
          interestPicks: interestsKey.split('|'),
          today: new Date(),
          visitedIds: NO_IDS,
          isRead,
          wasShown,
          blocklist: HOME_TITLE_BLOCKLIST,
          onSourceError,
          // SPEC.md §3.9 — a node read in full gets its exhaustion card and a Logbook record.
          onNodeExhausted: (node) => void nudges.nodeExhausted(node).catch((error: unknown) => reportError('nudges.exhausted', error)),
        }),
      isRead,
      onError: onRefreshError,
    });
  }, [api, journeys, nudges, interestsKey]);
}

interface ColdStart {
  refresher: HomeRefresher;
  store: HomeSnapshotStore;
  interestsKey: string;
  isRead: (pageId: number) => boolean;
}

/** The Home saved last time, with no network, then the opening Home's cards past it (SPEC.md §3.2). */
function coldStartFeed({ refresher, store, interestsKey, isRead }: ColdStart): Feed {
  return createRestoringFeed({
    restore: async () => {
      const snapshot = await store.load();
      return snapshot ? restorableCards(snapshot, { interestsKey, now: new Date(), isRead }) : [];
    },
    fresh: refresher.openingFeed(),
    onRestored: (cards) => refresher.markShown(cards),
    onError: onRestoreError,
  });
}

/** Saves the Home on screen for the next cold start, once its cards have settled. */
function useSavedHome(cards: readonly Card[], interestsKey: string) {
  const { homeSnapshots } = useAppServices();
  useEffect(() => {
    if (cards.length === 0) return undefined;
    const timer = setTimeout(() => {
      homeSnapshots.save(snapshotOf({ interestsKey, cards })).catch(onSaveError);
    }, HOME_SNAPSHOT.saveDelayMs);
    return () => clearTimeout(timer);
  }, [homeSnapshots, cards, interestsKey]);
}

/**
 * Home's feed. A cold start reopens on the Home saved last time; it is refreshed when the user comes back from an
 * expedition (SPEC.md §3.2) or pulls it down.
 */
export function useHomeFeed(interests: readonly string[], isTop: boolean): HomeFeedView {
  const { journeys, homeSnapshots } = useAppServices();
  const interestsKey = interests.join('|');
  const refresher = useRefresher(interests);
  const [stored, setShown] = useState<ShownHome>(() => ({
    refresher,
    generation: 0,
    feed: coldStartFeed({ refresher, store: homeSnapshots, interestsKey, isRead: readCheck(journeys) }),
    firstPage: null,
  }));
  // New interests mean a new refresher, and Home starts over from it.
  const shown = stored.refresher === refresher ? stored : { refresher, generation: stored.generation + 1, feed: refresher.openingFeed(), firstPage: null };
  if (shown !== stored) setShown(shown);
  const view = useFeed(shown.feed, shown.firstPage);

  useEffect(() => refresher.markShown(view.cards), [refresher, view.cards]);
  useSavedHome(view.cards, interestsKey);

  /** Puts the ready next Home on screen; false when there was none to take. */
  const swapIn = useCallback((): boolean => {
    const next = refresher.take();
    if (!next) return false;
    // A swap left over from earlier interests must not replace the Home built for the new ones.
    setShown((current) => (current.refresher === refresher ? { ...current, ...next, generation: current.generation + 1 } : current));
    return true;
  }, [refresher]);

  const { refreshing, refresh, touched } = useRefreshes(refresher, isTop, swapIn);
  return { ...view, generation: shown.generation, refreshing, refresh, touched };
}

/**
 * When Home is replaced: as soon as the next one is ready while the user is away, so they land on it; else on
 * landing, unless they touched Home first (it then waits for the next pull or return); and when pulled.
 */
function useRefreshes(refresher: HomeRefresher, isTop: boolean, swapIn: () => boolean) {
  const [refreshing, setRefreshing] = useState(false);
  const isTopRef = useRef(isTop);
  const touchedRef = useRef(false);
  // Home was already replaced during this time away, so the return needs no refresh of its own.
  const freshRef = useRef(false);
  // Counts arrivals and departures, so a fresh Home that turns up late only swaps in where it was meant to.
  const visitRef = useRef(0);

  useEffect(() => {
    const changed = isTopRef.current !== isTop;
    isTopRef.current = isTop;
    if (!changed) return;
    visitRef.current += 1;
    const visit = visitRef.current;
    const stillHere = () => visitRef.current === visit;
    if (!isTop) {
      freshRef.current = false;
      void refresher.ready().then((ok) => {
        if (ok && stillHere() && swapIn()) freshRef.current = true;
      });
      return;
    }
    if (freshRef.current) return;
    touchedRef.current = false;
    void refresher.ready().then((ok) => {
      if (ok && stillHere() && !touchedRef.current) swapIn();
    });
  }, [refresher, isTop, swapIn]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void refresher.ready().then((ok) => {
      if (ok && swapIn() && !isTopRef.current) freshRef.current = true;
      setRefreshing(false);
    });
  }, [refresher, swapIn]);

  const touched = useCallback(() => {
    touchedRef.current = true;
  }, []);

  return { refreshing, refresh, touched };
}
