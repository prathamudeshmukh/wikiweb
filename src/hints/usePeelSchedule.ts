import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HINT } from '../config/constants';

interface PeelConditions {
  /** Home is on screen: the top column, nothing over it. Each time it comes back counts as Home appearing. */
  homeShown: boolean;
  /** Every condition for a peel holds (SPEC.md §4.4). */
  active: boolean;
}

/**
 * When the Home card peels (SPEC.md §4.4): shortly after Home appears, then after every idle stretch. Resuming
 * while Home stayed on screen (the app foregrounded, a finger lifted) waits a full idle stretch. `touched` restarts
 * the idle wait. Each peel bumps `peelToken`, which the focused card animates on.
 */
export function usePeelSchedule({ homeShown, active }: PeelConditions, onPeel: () => void) {
  const [peelToken, setPeelToken] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const homeJustAppeared = useRef(true);
  const onPeelRef = useRef(onPeel);
  useLayoutEffect(() => {
    onPeelRef.current = onPeel;
  }, [onPeel]);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const schedule = useCallback(
    (delayMs: number) => {
      clear();
      timer.current = setTimeout(function peel() {
        setPeelToken((token) => token + 1);
        onPeelRef.current();
        timer.current = setTimeout(peel, HINT.idleMs);
      }, delayMs);
    },
    [clear],
  );

  // Declared before the schedule effect so a Home that appears and activates in one render gets the short delay.
  useEffect(() => {
    if (!homeShown) homeJustAppeared.current = true;
  }, [homeShown]);

  useEffect(() => {
    if (!active) return clear;
    schedule(homeJustAppeared.current ? HINT.firstPeelDelayMs : HINT.idleMs);
    homeJustAppeared.current = false;
    return clear;
  }, [active, schedule, clear]);

  const touched = useCallback(() => {
    if (active) schedule(HINT.idleMs);
  }, [active, schedule]);

  return { peelToken, touched };
}
