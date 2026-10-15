import type { SnapshotStore } from './snapshotDatabase';

// SPEC.md §15.5. Changing any of these strands every web visitor's saved journeys.
const DATABASE_NAME = 'tangent';
const OBJECT_STORE = 'databases';
const SNAPSHOT_KEY = 'journeys.db';

function settled<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function committed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/** The journey database's snapshot in IndexedDB (web only). */
export async function openIndexedDbSnapshotStore(): Promise<SnapshotStore> {
  const opening = indexedDB.open(DATABASE_NAME, 1);
  opening.onupgradeneeded = () => opening.result.createObjectStore(OBJECT_STORE);
  const idb = await settled(opening);
  return {
    async read() {
      const stored = await settled(idb.transaction(OBJECT_STORE, 'readonly').objectStore(OBJECT_STORE).get(SNAPSHOT_KEY));
      return stored instanceof Uint8Array ? stored : null;
    },
    write(bytes) {
      const transaction = idb.transaction(OBJECT_STORE, 'readwrite');
      transaction.objectStore(OBJECT_STORE).put(bytes, SNAPSHOT_KEY);
      return committed(transaction);
    },
  };
}
