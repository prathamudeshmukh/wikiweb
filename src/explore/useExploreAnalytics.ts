import { useEffect, useMemo, useState } from 'react';
import type { ViewToken } from 'react-native';
import { cardProperties, columnProperties } from '../analytics/cardProperties';
import { createStopwatch, type Stopwatch } from '../analytics/stopwatch';
import { useAppForeground } from '../analytics/useAppForeground';
import type { Card } from '../content/card';
import type { FeedStatus } from '../feeds/useFeed';
import { useHints } from '../hints/HintsContext';
import { useAppServices } from '../services/AppServices';
import type { ColumnEntry } from './columnStack';
import type { NavigationListener } from './useStackNavigation';

/** Time spent looking at Home before the first hop (`first_hop.seconds_on_home`); runs while `onHome`. */
export function useHomeStopwatch(): Stopwatch {
  const [watch] = useState(() => createStopwatch(Date.now));
  return watch;
}

export function useRunWhile(watch: Stopwatch, running: boolean) {
  useEffect(() => {
    if (running) watch.start();
    else watch.stop();
  }, [watch, running]);
}

/**
 * What navigation means for the hints (SPEC.md §4.4) and analytics (§11): `hop` / `return`, the column
 * visit they end, and the one-off `first_hop` / `first_return`.
 */
export function useNavigationAnalytics(homeTime: Stopwatch): NavigationListener {
  const { analytics, columnVisits } = useAppServices();
  const { hopped, returned } = useHints();

  return useMemo(
    () => ({
      hopped({ card, from, route }) {
        const before = hopped();
        const position = route === 'swipe' ? columnVisits.positionOf(card.pageId) : null;
        columnVisits.leave('hop');
        analytics.track({ name: 'hop', properties: { route, ...cardProperties(card, position), ...columnProperties(from) } });
        if (before) {
          analytics.track({ name: 'first_hop', properties: { route, peels_seen: before.peelsSeen, seconds_on_home: homeTime.seconds() } });
        }
      },
      returned({ from, route, columnsPopped }) {
        const before = returned();
        columnVisits.leave(route);
        analytics.track({ name: 'return', properties: { route, columns_popped: columnsPopped, ...columnProperties(from) } });
        if (before) analytics.track({ name: 'first_return', properties: { route } });
      },
      resumed() {
        columnVisits.leave('resume');
      },
    }),
    [analytics, columnVisits, hopped, returned, homeTime],
  );
}

interface ColumnVisitSource {
  entry: ColumnEntry;
  isTop: boolean;
  status: FeedStatus;
  /** Cards already dwelt on; they count as seen once the visit starts. */
  dwelling: () => readonly ViewToken<Card>[];
}

/**
 * Runs the column's visit while it is on top and the app is in use. Called from the column itself, so its
 * feed status and the cards already in view are known the moment it comes on top.
 */
export function useColumnVisit({ entry, isTop, status, dwelling }: ColumnVisitSource) {
  const { columnVisits } = useAppServices();
  const foreground = useAppForeground();
  useEffect(() => {
    if (!isTop) return;
    if (!foreground) {
      columnVisits.leave('background');
      return;
    }
    columnVisits.enter(entry, status);
    // Seen cards are de-duplicated per visit, so replaying them on every status change is harmless.
    for (const { item, index } of dwelling()) if (index !== null) columnVisits.cardSeen(entry.id, item, index);
  }, [columnVisits, entry, isTop, status, foreground, dwelling]);
}
