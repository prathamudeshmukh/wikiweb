import { useEffect, useMemo } from 'react';
import { HOME_TITLE_BLOCKLIST } from '../config/homeBlocklist';
import { createHomeFeed } from '../content/homeFeed';
import { type FeedView, useFeed } from '../feeds/useFeed';
import { useAppServices } from '../services/AppServices';
import { reportError } from '../services/reportError';
import { columnFeedFor } from './columnFeedFor';
import { type ColumnEntry, isSeeded } from './columnStack';

const NO_IDS: ReadonlySet<number> = new Set();

const onSourceError = (error: unknown) => reportError('feed.source', error);

/** The feed behind one column: Home for the root entry, the seed's column otherwise — prefetched if it was dwelt on. */
export function useColumnFeed(entry: ColumnEntry, interests: readonly string[]): FeedView {
  const { api, journeys, prefetcher } = useAppServices();
  const interestsKey = interests.join('|');

  const feed = useMemo(() => {
    if (isSeeded(entry)) return prefetcher.take(entry.id) ?? columnFeedFor(api, entry);
    return createHomeFeed(api, {
      interestTileIds: interestsKey.split('|'),
      today: new Date(),
      visitedIds: NO_IDS,
      // Read history loads asynchronously and grows while browsing, so ask the session each batch instead of rebuilding Home.
      isRead: (pageId) => journeys.getState().readIds.has(pageId),
      blocklist: HOME_TITLE_BLOCKLIST,
      onSourceError,
    });
    // A column's feed is fixed for its lifetime; entry.id captures seed and path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, journeys, prefetcher, entry.id, interestsKey]);

  useEffect(() => () => prefetcher.release(entry.id), [prefetcher, entry.id]);

  return useFeed(feed);
}
