import { useEffect, useMemo } from 'react';
import { type FeedView, useFeed } from '../feeds/useFeed';
import { useAppServices } from '../services/AppServices';
import { columnFeedFor } from './columnFeedFor';
import type { SeededEntry } from './columnStack';

/** The feed behind an explored column — prefetched if it was dwelt on. Home has its own (useHomeFeed). */
export function useColumnFeed(entry: SeededEntry): FeedView {
  const { api, prefetcher } = useAppServices();

  const feed = useMemo(
    () => prefetcher.take(entry.id) ?? columnFeedFor(api, entry),
    // A column's feed is fixed for its lifetime; entry.id captures seed and path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, prefetcher, entry.id],
  );

  useEffect(() => () => prefetcher.release(entry.id), [prefetcher, entry.id]);

  return useFeed(feed);
}
