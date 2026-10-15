import Storage from 'expo-sqlite/kv-store';
import type { KeyValueStore } from '../interests/interestsStore';

/** The app's key-value storage; on native, expo-sqlite's kv-store. */
export const keyValueStorage: KeyValueStore = Storage;
