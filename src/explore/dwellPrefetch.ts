import { useEffect, useMemo, useRef } from 'react';
import type { ViewabilityConfigCallbackPairs, ViewToken } from 'react-native';
import { PREFETCH } from '../config/constants';
import type { Card } from '../content/card';
import { useAppServices } from '../services/AppServices';
import type { ColumnPrefetcher } from './columnPrefetch';
import { childEntry, type ColumnEntry } from './columnStack';

interface DwellTarget {
  prefetcher: ColumnPrefetcher;
  /** The column the cards are in; their columns open below it. */
  parent: ColumnEntry;
}

/** A card dwelt on starts its column loading; one scrolled away from stops (SPEC.md §7). */
export function applyDwell({ prefetcher, parent }: DwellTarget, changed: readonly ViewToken<Card>[]) {
  for (const { item, isViewable } of changed) {
    const column = childEntry(parent, { ref: item, topic: item.topic, thumbnailUrl: item.thumbnail?.url ?? null });
    if (isViewable) prefetcher.prefetch(column);
    else prefetcher.cancel(column.id);
  }
}

// FlatList only reports an item as viewable once it has stayed this visible for this long — which is a dwell.
const DWELL_CONFIG = { itemVisiblePercentThreshold: PREFETCH.visiblePercent, minimumViewTime: PREFETCH.dwellMs };

/** Viewability callbacks for a column's FlatList. Only the column on top prefetches. */
export function useDwellPrefetch(parent: ColumnEntry, isTop: boolean): ViewabilityConfigCallbackPairs {
  const { prefetcher } = useAppServices();
  // FlatList rejects changing callbacks after mount, so the stable callback reads the latest values from a ref.
  const target = useRef<DwellTarget | null>(null);
  useEffect(() => {
    target.current = isTop ? { prefetcher, parent } : null;
  }, [prefetcher, parent, isTop]);

  return useMemo(
    () => [
      {
        viewabilityConfig: DWELL_CONFIG,
        // The list's data is cards; React Native types its tokens loosely.
        onViewableItemsChanged: ({ changed }: { changed: ViewToken[] }) => {
          if (target.current) applyDwell(target.current, changed as ViewToken<Card>[]);
        },
      },
    ],
    [],
  );
}
