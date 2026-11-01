import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { InterestsSavedFrom } from '../analytics/events';
import { reportError } from '../services/reportError';
import type { InterestsStore } from './interestsStore';

/** `undefined` while loading, `null` before onboarding, otherwise the picks as path ids (SPEC.md §3.9). */
export type InterestsState = readonly string[] | null | undefined;

interface InterestsValue {
  interests: InterestsState;
  saveInterests(picks: readonly string[], from: InterestsSavedFrom): Promise<void>;
}

export interface InterestsSaved {
  before: readonly string[];
  after: readonly string[];
  from: InterestsSavedFrom;
}

/** Hears every successful save (analytics' `interests_saved`, SPEC.md §11). */
export type InterestsSavedListener = (saved: InterestsSaved) => void;

const InterestsContext = createContext<InterestsValue | null>(null);
// True outside a provider and until loaded: only a skipped onboarding makes the picks not the user's own.
const InterestsChosenContext = createContext(true);

export function InterestsProvider({ store, onSaved, children }: { store: InterestsStore; onSaved?: InterestsSavedListener; children: ReactNode }) {
  const [interests, setInterests] = useState<InterestsState>(undefined);
  const [chosen, setChosen] = useState(true);
  // The picks a save replaces, read without making saveInterests change on every save.
  const latest = useRef<InterestsState>(undefined);
  useEffect(() => {
    latest.current = interests;
  }, [interests]);

  useEffect(() => {
    store.isChosen().then(setChosen, (error: unknown) => reportError('interests.load', error));
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
    async (picks: readonly string[], from: InterestsSavedFrom) => {
      const before = latest.current ?? [];
      const nowChosen = from !== 'skip';
      await store.save(picks, { chosen: nowChosen });
      latest.current = [...picks];
      setInterests([...picks]);
      setChosen(nowChosen);
      onSaved?.({ before, after: picks, from });
    },
    [store, onSaved],
  );

  const value = useMemo(() => ({ interests, saveInterests }), [interests, saveInterests]);
  return (
    <InterestsContext.Provider value={value}>
      <InterestsChosenContext.Provider value={chosen}>{children}</InterestsChosenContext.Provider>
    </InterestsContext.Provider>
  );
}

/** Whether the saved picks are the user's own rather than the defaults a skipped onboarding saved (SPEC.md §3.1). */
export function useInterestsChosen(): boolean {
  return useContext(InterestsChosenContext);
}

export function useInterests(): InterestsValue {
  const value = useContext(InterestsContext);
  if (!value) throw new Error('useInterests must be used inside InterestsProvider.');
  return value;
}
