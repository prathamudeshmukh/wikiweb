import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { readerParamsFor } from '../reader/readerParams';
import { useTangentOnClose } from '../tangent/useTangentOnClose';
import { cardFromFind } from './findFormat';
import type { FindActions } from './FindSheet';

/**
 * Opening a find from the Logbook (SPEC.md §3.7). A tangent always starts a new expedition: the Logbook is only
 * reachable from Home, so none is under way.
 */
export function useFindActions(): FindActions {
  const router = useRouter();
  const tangentOnClose = useTangentOnClose();
  return useMemo(
    () => ({
      tangent: (find) => tangentOnClose({ card: cardFromFind(find), fromNodeId: null }, () => router.dismissTo('/')),
      read: (find) => router.push({ pathname: '/reader', params: readerParamsFor(cardFromFind(find)) }),
    }),
    [router, tangentOnClose],
  );
}
