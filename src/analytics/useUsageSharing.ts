import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useAppServices } from '../services/AppServices';
import { reportError } from '../services/reportError';

/** The usage-sharing choice, as Settings, About and onboarding show it. `sharing` is undefined until it has loaded. */
export interface UsageSharing {
  sharing: boolean | undefined;
  setSharing(sharing: boolean): void;
}

export function useUsageSharing(): UsageSharing {
  const { analyticsConsent } = useAppServices();
  const optedOut = useSyncExternalStore(analyticsConsent.subscribe, analyticsConsent.isOptedOut);

  useEffect(() => {
    if (analyticsConsent.isOptedOut() !== null) return;
    analyticsConsent.load().catch((error: unknown) => reportError('analytics.consent', error));
  }, [analyticsConsent]);

  const setSharing = useCallback(
    (next: boolean) => {
      analyticsConsent.setOptedOut(!next).catch((error: unknown) => reportError('analytics.consent', error));
    },
    [analyticsConsent],
  );

  return { sharing: optedOut === null ? undefined : !optedOut, setSharing };
}
