import { useMemo, useSyncExternalStore } from 'react';
import { useAppServices } from '../services/AppServices';
import type { JourneySessionState } from './journeySession';

export function useJourneyState(): JourneySessionState {
  const { journeys } = useAppServices();
  return useSyncExternalStore(journeys.subscribe, journeys.getState);
}

export interface JourneyMarks {
  /** Articles already in the expedition under way (DESIGN.md §5.4 "visited"). */
  visitedIds: ReadonlySet<number>;
  readIds: ReadonlySet<number>;
}

/** The ids behind the visited ◌ and read ✓ badges, kept current as the user hops and reads. */
export function useJourneyMarks(): JourneyMarks {
  const { active, readIds } = useJourneyState();
  const nodes = active?.nodes;
  const visitedIds = useMemo(() => new Set((nodes ?? []).map((node) => node.pageId)), [nodes]);
  return useMemo(() => ({ visitedIds, readIds }), [visitedIds, readIds]);
}
