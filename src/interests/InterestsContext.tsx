import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { reportError } from '../services/reportError';
import type { InterestsStore } from './interestsStore';

/** `undefined` while loading, `null` before onboarding, otherwise the picks as path ids (SPEC.md §3.9). */
export type InterestsState = readonly string[] | null | undefined;

interface InterestsValue {
  interests: InterestsState;
  saveInterests(picks: readonly string[]): Promise<void>;
}

const InterestsContext = createContext<InterestsValue | null>(null);

export function InterestsProvider({ store, children }: { store: InterestsStore; children: ReactNode }) {
  const [interests, setInterests] = useState<InterestsState>(undefined);

  useEffect(() => {
    store
      .load()
      .then(setInterests)
      .catch((error: unknown) => {
        // Unreadable storage shouldn't lock the user out — send them through onboarding again.
        reportError('interests.load', error);
        setInterests(null);
      });
  }, [store]);

  const saveInterests = useCallback(
    async (picks: readonly string[]) => {
      await store.save(picks);
      setInterests([...picks]);
    },
    [store],
  );

  const value = useMemo(() => ({ interests, saveInterests }), [interests, saveInterests]);
  return <InterestsContext.Provider value={value}>{children}</InterestsContext.Provider>;
}

export function useInterests(): InterestsValue {
  const value = useContext(InterestsContext);
  if (!value) throw new Error('useInterests must be used inside InterestsProvider.');
  return value;
}
