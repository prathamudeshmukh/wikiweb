import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HOME_TITLE_BLOCKLIST } from '../config/homeBlocklist';
import { createHomeFeed } from '../content/homeFeed';
import type { Feed, FeedPage } from '../content/pagedFeed';
import { type FeedView, useFeed } from '../feeds/useFeed';
import { useAppServices } from '../services/AppServices';
import { reportError } from '../services/reportError';
import { createHomeRefresher, type HomeRefresher } from './homeRefresh';

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

interface ShownHome {
  refresher: HomeRefresher;
  generation: number;
  feed: Feed;
  firstPage: FeedPage | null;
}

function useRefresher(interests: readonly string[]): HomeRefresher {
  const { api, journeys, nudges } = useAppServices();
  const interestsKey = interests.join('|');
  // Read history loads asynchronously and grows while browsing, so ask the session each time instead of rebuilding Home.
  return useMemo(() => {
    const isRead = (pageId: number) => journeys.getState().readIds.has(pageId);
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

/** Home's feed, refreshed when the user comes back from an expedition (SPEC.md §3.2) or pulls it down. */
export function useHomeFeed(interests: readonly string[], isTop: boolean): HomeFeedView {
  const refresher = useRefresher(interests);
  const [stored, setShown] = useState<ShownHome>(() => ({ refresher, generation: 0, feed: refresher.openingFeed(), firstPage: null }));
  // New interests mean a new refresher, and Home starts over from it.
  const shown = stored.refresher === refresher ? stored : { refresher, generation: stored.generation + 1, feed: refresher.openingFeed(), firstPage: null };
  if (shown !== stored) setShown(shown);
  const view = useFeed(shown.feed, shown.firstPage);

  useEffect(() => refresher.markShown(view.cards), [refresher, view.cards]);

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
