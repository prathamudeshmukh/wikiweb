import type { KeyValueStore } from '../interests/interestsStore';
import type { Analytics } from './analytics';

/** The Settings switch's saved choice (SPEC.md §9 `analyticsOptOut`), the source of truth applied to analytics. */
export interface AnalyticsConsent {
  /** Reads the saved choice and applies it; true when the user has opted out. */
  load(): Promise<boolean>;
  setOptedOut(optedOut: boolean): Promise<void>;
  /** The latest choice; null until it has loaded. */
  isOptedOut(): boolean | null;
}

const STORAGE_KEY = 'analyticsOptOut';

export function createAnalyticsConsent(kv: KeyValueStore, analytics: Analytics): AnalyticsConsent {
  let current: boolean | undefined;
  const apply = (optedOut: boolean) => {
    current = optedOut;
    analytics.setOptedOut(optedOut);
  };

  return {
    async load() {
      // Anything but an explicit opt-out keeps the default (§11: on, with an opt-out in Settings).
      const optedOut = (await kv.getItem(STORAGE_KEY)) === 'true';
      apply(optedOut);
      return optedOut;
    },
    async setOptedOut(optedOut) {
      apply(optedOut);
      await kv.setItem(STORAGE_KEY, String(optedOut));
    },
    isOptedOut: () => current ?? null,
  };
}
