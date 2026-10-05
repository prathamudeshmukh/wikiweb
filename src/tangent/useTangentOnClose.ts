import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { useTangentQueue } from './TangentContext';
import type { Tangent } from './tangentQueue';

// If the closing animation's end event never arrives, hand the tangent over anyway after this long.
const TANGENT_HANDOFF_FALLBACK_MS = 600;

/**
 * Takes a tangent from a screen over the columns: closes the screen, then hands the tangent to the explore screen
 * once it has finished closing, so the hop's flight plays over the columns instead of behind it (SPEC.md §3.4).
 */
export function useTangentOnClose(): (tangent: Tangent, close: () => void) => void {
  const navigation = useNavigation();
  const tangents = useTangentQueue();
  const pending = useRef<Tangent | null>(null);

  const handOff = useCallback(() => {
    if (!pending.current) return;
    tangents.request(pending.current);
    pending.current = null;
  }, [tangents]);

  // The native stack's transitionEnd event isn't in expo-router's generic navigation typings.
  useEffect(() => navigation.addListener('transitionEnd' as never, handOff), [navigation, handOff]);

  return useCallback(
    (tangent, close) => {
      pending.current = tangent;
      close();
      setTimeout(handOff, TANGENT_HANDOFF_FALLBACK_MS);
    },
    [handOff],
  );
}
