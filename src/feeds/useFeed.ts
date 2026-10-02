import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card } from '../content/card';
import type { Feed, FeedPage } from '../content/pagedFeed';

export type FeedStatus = 'loading' | 'idle' | 'error' | 'done';

export interface FeedView {
  cards: readonly Card[];
  status: FeedStatus;
  error: Error | null;
  /** Fetches the next page if the feed is idle; safe to call repeatedly (e.g. on every scroll-end). */
  loadMore(): void;
  /** Re-attempts the failed page. */
  retry(): void;
}

// A feed may legitimately return a few filtered-out pages in a row before real cards.
const MAX_EMPTY_PAGES_PER_LOAD = 3;

interface FeedState {
  /** The feed these cards came from; a different feed starts over. */
  feed: Feed;
  cards: readonly Card[];
  status: FeedStatus;
  error: Error | null;
}

function startOf(feed: Feed, loaded: FeedPage | null): FeedState {
  if (!loaded) return { feed, cards: [], status: 'loading', error: null };
  return { feed, cards: loaded.cards, status: loaded.done ? 'done' : 'idle', error: null };
}

/**
 * Drives one Feed for a list: paging and error/retry. Cards arrive with their topics already resolved.
 * Given a different feed, it starts over from that feed — from `loaded`, its first page, when that was fetched ahead.
 */
export function useFeed(feed: Feed, loaded: FeedPage | null = null): FeedView {
  const [stored, setState] = useState<FeedState>(() => startOf(feed, loaded));
  const state = stored.feed === feed ? stored : startOf(feed, loaded);
  if (state !== stored) setState(state);
  const loadingFeed = useRef<Feed | null>(null);
  const mounted = useRef(true);
  const statusRef = useRef<FeedStatus>(state.status);
  statusRef.current = state.status;
  const load = useCallback(async () => {
    if (loadingFeed.current === feed) return;
    loadingFeed.current = feed;
    // A page for a feed this list has moved on from is dropped.
    const update = (next: (s: FeedState) => FeedState) => setState((s) => (s.feed === feed ? next(s) : s));
    update((s) => ({ ...s, status: 'loading', error: null }));
    try {
      let page = await feed.nextPage();
      for (let empty = 1; page.cards.length === 0 && !page.done && empty < MAX_EMPTY_PAGES_PER_LOAD; empty += 1) {
        page = await feed.nextPage();
      }
      if (!mounted.current) return;
      const { cards, done } = page;
      update((s) => ({ ...s, cards: [...s.cards, ...cards], status: done ? 'done' : 'idle', error: null }));
    } catch (error) {
      if (mounted.current) update((s) => ({ ...s, status: 'error', error: error instanceof Error ? error : new Error(String(error)) }));
    } finally {
      if (loadingFeed.current === feed) loadingFeed.current = null;
    }
  }, [feed]);

  useEffect(() => {
    mounted.current = true;
    if (statusRef.current === 'loading') void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const loadMore = useCallback(() => {
    if (statusRef.current === 'idle') void load();
  }, [load]);

  const retry = useCallback(() => {
    if (statusRef.current === 'error') void load();
  }, [load]);

  const { cards, status, error } = state;
  return { cards, status, error, loadMore, retry };
}
