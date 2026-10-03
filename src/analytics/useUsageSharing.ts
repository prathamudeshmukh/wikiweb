import { useCallback, useEffect, useState } from 'react';
import { useAppServices } from '../services/AppServices';
import { reportError } from '../services/reportError';

/** The Settings "Share usage data" switch. `sharing` is undefined until the saved choice has loaded. */
export interface UsageSharing {
  sharing: boolean | undefined;
  setSharing(sharing: boolean): void;
}

export function useUsageSharing(): UsageSharing {
  const { analyticsConsent } = useAppServices();
  const [sharing, setShown] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    analyticsConsent.load().then(
      (optedOut) => mounted && setShown(!optedOut),
      (error: unknown) => reportError('analytics.consent', error),
    );
    return () => {
      mounted = false;
    };
  }, [analyticsConsent]);

  const setSharing = useCallback(
    (next: boolean) => {
      setShown(next);
      analyticsConsent.setOptedOut(!next).catch((error: unknown) => reportError('analytics.consent', error));
    },
    [analyticsConsent],
  );

  return { sharing, setSharing };
}
