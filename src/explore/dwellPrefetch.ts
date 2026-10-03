import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ViewabilityConfigCallbackPairs, ViewToken } from 'react-native';
import type { ColumnVisits } from '../analytics/columnVisits';
import { PREFETCH } from '../config/constants';
import type { Card } from '../content/card';
import { useAppServices } from '../services/AppServices';
import type { ColumnPrefetcher } from './columnPrefetch';
import { childEntry, type ColumnEntry } from './columnStack';

interface DwellTarget {
  prefetcher: ColumnPrefetcher;
  /** The column the cards are in; their columns open below it. */
  parent: ColumnEntry;
  /** A dwell is also analytics' "seen" (SPEC.md §11 `card_seen`). */
  visits: Pick<ColumnVisits, 'cardSeen'>;
}

/** A card dwelt on starts its column loading and counts as seen; one scrolled away from stops loading (SPEC.md §7). */
export function applyDwell({ prefetcher, parent, visits }: DwellTarget, changed: readonly ViewToken<Card>[]) {
  for (const { item, isViewable, index } of changed) {
    const column = childEntry(parent, { ref: item, topic: item.topic, thumbnailUrl: item.thumbnail?.url ?? null });
    if (!isViewable) {
      prefetcher.cancel(column.id);
      continue;
    }
    prefetcher.prefetch(column);
    if (index !== null) visits.cardSeen(parent.id, item, index);
  }
}

// FlatList only reports an item as viewable once it has stayed this visible for this long — which is a dwell.
const DWELL_CONFIG = { itemVisiblePercentThreshold: PREFETCH.visiblePercent, minimumViewTime: PREFETCH.dwellMs };

export interface DwellTracking {
  viewabilityPairs: ViewabilityConfigCallbackPairs;
  /** Cards dwelt on and still on screen, whether or not the column was on top when they settled. */
  dwelling(): readonly ViewToken<Card>[];
}

/** Viewability callbacks for a column's FlatList. Only the column on top prefetches and reports cards seen. */
export function useDwellPrefetch(parent: ColumnEntry, isTop: boolean): DwellTracking {
  const { prefetcher, columnVisits } = useAppServices();
  // FlatList rejects changing callbacks after mount, so the stable callback reads the latest values from a ref.
  const target = useRef<DwellTarget | null>(null);
  // FlatList reports only changes, so a column that comes on top must be told what is already in view.
  const inView = useRef<readonly ViewToken<Card>[]>([]);
  useEffect(() => {
    target.current = isTop ? { prefetcher, parent, visits: columnVisits } : null;
  }, [prefetcher, parent, isTop, columnVisits]);

  const viewabilityPairs = useMemo(
    () => [
      {
        viewabilityConfig: DWELL_CONFIG,
        // The list's data is cards; React Native types its tokens loosely.
        onViewableItemsChanged: ({ viewableItems, changed }: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
          inView.current = viewableItems as ViewToken<Card>[];
          if (target.current) applyDwell(target.current, changed as ViewToken<Card>[]);
        },
      },
    ],
    [],
  );
  const dwelling = useCallback(() => inView.current, []);
  return useMemo(() => ({ viewabilityPairs, dwelling }), [viewabilityPairs, dwelling]);
}
