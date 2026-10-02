import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card } from '../content/card';
import type { Feed } from '../content/pagedFeed';

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
  cards: readonly Card[];
  status: FeedStatus;
  error: Error | null;
}

const INITIAL: FeedState = { cards: [], status: 'loading', error: null };

/** Drives one Feed for a list: paging and error/retry. Cards arrive with their topics already resolved. */
export function useFeed(feed: Feed): FeedView {
  const [state, setState] = useState<FeedState>(INITIAL);
  const busy = useRef(false);
  const mounted = useRef(true);
  const statusRef = useRef<FeedStatus>(INITIAL.status);
  statusRef.current = state.status;
  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      let page = await feed.nextPage();
      for (let empty = 1; page.cards.length === 0 && !page.done && empty < MAX_EMPTY_PAGES_PER_LOAD; empty += 1) {
        page = await feed.nextPage();
      }
      if (!mounted.current) return;
      const { cards, done } = page;
      setState((s) => ({ cards: [...s.cards, ...cards], status: done ? 'done' : 'idle', error: null }));
    } catch (error) {
      if (mounted.current) setState((s) => ({ ...s, status: 'error', error: error instanceof Error ? error : new Error(String(error)) }));
    } finally {
      busy.current = false;
    }
  }, [feed]);

  useEffect(() => {
    mounted.current = true;
    void load();
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

  return { ...state, loadMore, retry };
}
