import type { KeyValueStore } from '../interests/interestsStore';
import { reportError } from '../services/reportError';

const ERROR_SCOPE = 'storage.keyValue';

/** The slice of the Web Storage API (`localStorage`) the store uses. */
type WebStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Browser key-value storage behind the native kv-store's interface. Storage can be blocked (private mode, site data
 * off) or full, so every write is also kept in memory: the session carries on and sees its own writes (SPEC.md §15.5).
 * `storage` is a getter because merely reading `window.localStorage` throws when it is blocked.
 */
export function createBrowserKeyValueStore(storage: () => WebStorage): KeyValueStore {
  const sessionWrites = new Map<string, string>();
  let reported = false;

  function reportOnce(error: unknown): void {
    if (reported) return;
    reported = true;
    reportError(ERROR_SCOPE, error);
  }

  return {
    async getItem(key) {
      const written = sessionWrites.get(key);
      if (written !== undefined) return written;
      try {
        return storage().getItem(key);
      } catch (error) {
        reportOnce(error);
        return null;
      }
    },
    async setItem(key, value) {
      sessionWrites.set(key, value);
      try {
        storage().setItem(key, value);
      } catch (error) {
        reportOnce(error);
      }
    },
  };
}
