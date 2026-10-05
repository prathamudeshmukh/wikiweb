import * as Haptics from 'expo-haptics';
import { useCallback, useSyncExternalStore } from 'react';
import { useAppServices } from '../services/AppServices';
import type { FindsState } from './findsStore';
import type { FindFrom, FindPage } from './findTypes';

export function useFindsState(): FindsState {
  const { finds } = useAppServices();
  return useSyncExternalStore(finds.subscribe, finds.getState);
}

/** Kept articles only — unlike the whole state, unchanged when a toast comes and goes, so cards don't re-render. */
export function useFoundIds(): ReadonlySet<number> {
  const { finds } = useAppServices();
  return useSyncExternalStore(finds.subscribe, () => finds.getState().ids);
}

export function useIsFound(pageId: number): boolean {
  return useFoundIds().has(pageId);
}

/** Keeps or removes an article; keeping gets a light tap (DESIGN.md §7), removing none. */
export function useFindToggle(): (page: FindPage, from: FindFrom) => void {
  const { finds } = useAppServices();
  return useCallback(
    (page, from) => {
      if (!finds.getState().ids.has(page.pageId)) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      finds.toggle(page, from);
    },
    [finds],
  );
}

export const findActionLabel = (found: boolean) => (found ? 'Remove find' : 'Keep as a find');
