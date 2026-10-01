import { useMemo } from 'react';
import { HOME_TITLE_BLOCKLIST } from '../config/homeBlocklist';
import { createColumnFeed } from '../content/columnFeed';
import { createHomeFeed } from '../content/homeFeed';
import { type FeedView, useFeed } from '../feeds/useFeed';
import { useAppServices } from '../services/AppServices';
import { reportError } from '../services/reportError';
import type { ColumnEntry } from './columnStack';

// Expedition history (visited / read) arrives with Journeys in M4.
const NO_IDS: ReadonlySet<number> = new Set();

const onSourceError = (error: unknown) => reportError('feed.source', error);
const onBackgroundError = (error: unknown) => reportError('feed.topics', error);

/** The feed behind one column: Home for the root entry, the seed's column otherwise. */
export function useColumnFeed(entry: ColumnEntry, interests: readonly string[]): FeedView {
  const { api } = useAppServices();
  const interestsKey = interests.join('|');

  const feed = useMemo(() => {
    if (!entry.seed) {
      return createHomeFeed(api, {
        interestTileIds: interestsKey.split('|'),
        today: new Date(),
        visitedIds: NO_IDS,
        readIds: NO_IDS,
        blocklist: HOME_TITLE_BLOCKLIST,
        onSourceError,
      });
    }
    return createColumnFeed(api, {
      seed: entry.seed,
      pathIds: new Set(entry.path.map((ref) => ref.pageId)),
      visitedIds: NO_IDS,
      readIds: NO_IDS,
      seedTopic: entry.seedTopic,
      onSourceError,
    });
    // A column's feed is fixed for its lifetime; entry.id captures seed and path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, entry.id, interestsKey]);

  return useFeed(feed, { api, onBackgroundError });
}
