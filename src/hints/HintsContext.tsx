import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { JourneySession } from '../journeys/journeySession';
import { reportError } from '../services/reportError';
import { afterFirstHop, afterFirstReturn, afterPeel, FRESH_PROGRESS, type HintProgress, knownExplorer } from './hintProgress';
import type { HintStore } from './hintStore';

interface HintsValue {
  /** Undefined while loading; no hint shows until it is known. Its peel count may lag: peels don't re-render. */
  progress: HintProgress | undefined;
  /** Records a hop; returns the progress it replaced when it was the user's first, else null. */
  hopped(): HintProgress | null;
  /** Records a return; returns the progress it replaced when it was the user's first, else null. */
  returned(): HintProgress | null;
  peeled(): void;
}

interface HintsProviderProps {
  store: HintStore;
  journeys: Pick<JourneySession, 'hasExplored'>;
  children: ReactNode;
}

const HintsContext = createContext<HintsValue | null>(null);

const sameHints = (a: HintProgress, b: HintProgress) => a.swipeHintShown === b.swipeHintShown && a.backHintShown === b.backHintShown;

async function loadProgress(store: HintStore, journeys: HintsProviderProps['journeys']): Promise<HintProgress> {
  const stored = await store.load();
  // Hints save the swipe flag on the first hop, so journeys without it predate the hints.
  if (stored.swipeHintShown || !(await journeys.hasExplored())) return stored;
  const known = knownExplorer(stored);
  await store.save(known);
  return known;
}

/** The first-hop hints' progress (SPEC.md §4.4), saved as it changes. */
export function HintsProvider({ store, journeys, children }: HintsProviderProps) {
  const [progress, setProgress] = useState<HintProgress | undefined>(undefined);
  const current = useRef<HintProgress | undefined>(undefined);

  const show = useCallback((next: HintProgress) => {
    current.current = next;
    setProgress(next);
  }, []);

  useEffect(() => {
    loadProgress(store, journeys)
      .then(show)
      .catch((error: unknown) => {
        // Unreadable storage: stay quiet rather than nag someone who may well know the app.
        reportError('hints.load', error);
        show(knownExplorer(FRESH_PROGRESS));
      });
  }, [store, journeys, show]);

  const advance = useCallback(
    (step: (progress: HintProgress) => HintProgress) => {
      const before = current.current;
      if (!before) return null;
      const next = step(before);
      if (next === before) return null;
      current.current = next;
      // A peel only bumps the saved count; re-rendering every column for it would be waste.
      if (!sameHints(before, next)) setProgress(next);
      store.save(next).catch((error: unknown) => reportError('hints.save', error));
      return before;
    },
    [store],
  );

  const hopped = useCallback(() => advance(afterFirstHop), [advance]);
  const returned = useCallback(() => advance(afterFirstReturn), [advance]);
  const peeled = useCallback(() => void advance(afterPeel), [advance]);
  const value = useMemo(() => ({ progress, hopped, returned, peeled }), [progress, hopped, returned, peeled]);
  return <HintsContext.Provider value={value}>{children}</HintsContext.Provider>;
}

export function useHints(): HintsValue {
  const value = useContext(HintsContext);
  if (!value) throw new Error('useHints must be used inside HintsProvider.');
  return value;
}
