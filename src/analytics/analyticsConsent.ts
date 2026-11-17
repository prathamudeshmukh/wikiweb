import type { KeyValueStore } from '../interests/interestsStore';
import type { Analytics } from './analytics';

/** The usage-sharing choice (SPEC.md §9 `analyticsOptOut`), the source of truth applied to analytics. */
export interface AnalyticsConsent {
  /** Reads the saved choice (once) and applies it; resolves to the latest choice, true when opted out. */
  load(): Promise<boolean>;
  setOptedOut(optedOut: boolean): Promise<void>;
  /** The latest choice; null until it has loaded. */
  isOptedOut(): boolean | null;
  /** Called whenever the choice is loaded or changed, so every switch and notice shows the same state. */
  subscribe(listener: () => void): () => void;
}

const STORAGE_KEY = 'analyticsOptOut';

export function createAnalyticsConsent(kv: KeyValueStore, analytics: Analytics): AnalyticsConsent {
  let current: boolean | undefined;
  let loading: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const apply = (optedOut: boolean) => {
    current = optedOut;
    analytics.setOptedOut(optedOut);
    listeners.forEach((listener) => listener());
  };

  return {
    // Several screens may ask at startup; one read serves them all.
    async load() {
      loading ??= kv.getItem(STORAGE_KEY).then((saved) => {
        // A choice made while the read was in flight is newer than what was read. Otherwise anything but an
        // explicit opt-out keeps the default (§11: on, with an opt-out in Settings).
        apply(current ?? saved === 'true');
      }).catch((error: unknown) => {
        // Forgotten, so the next screen to ask reads again.
        loading = null;
        throw error;
      });
      await loading;
      return current === true;
    },
    async setOptedOut(optedOut) {
      apply(optedOut);
      await kv.setItem(STORAGE_KEY, String(optedOut));
    },
    isOptedOut: () => current ?? null,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
