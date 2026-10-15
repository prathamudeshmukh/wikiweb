import type { KeyValueStore } from '../interests/interestsStore';
import { createBrowserKeyValueStore } from './browserKeyValueStore';

/** The app's key-value storage; on web, `localStorage` (SPEC.md §15.5). */
export const keyValueStorage: KeyValueStore = createBrowserKeyValueStore(() => window.localStorage);
