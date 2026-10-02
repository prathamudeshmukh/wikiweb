import { createColumnFeed } from '../content/columnFeed';
import type { Feed } from '../content/pagedFeed';
import { reportError } from '../services/reportError';
import type { WikiApi } from '../wiki-api/types';
import type { SeededEntry } from './columnStack';

// Visited / read badges are applied at render time (ColumnView), so feeds don't need them up front.
const NO_IDS: ReadonlySet<number> = new Set();

const onSourceError = (error: unknown) => reportError('feed.source', error);

/** The feed for a seeded column — built the same way whether it's prefetched or opened directly. */
export function columnFeedFor(api: WikiApi, entry: SeededEntry): Feed {
  return createColumnFeed(api, {
    seed: entry.seed,
    pathIds: new Set(entry.path.map((ref) => ref.pageId)),
    visitedIds: NO_IDS,
    readIds: NO_IDS,
    seedTopic: entry.seedTopic,
    onSourceError,
  });
}
