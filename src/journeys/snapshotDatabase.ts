import type { Database, SqlJsStatic } from 'sql.js';
import { reportError } from '../services/reportError';
import type { SqlDatabase } from './journeyDatabase';
import { sqlJsDatabase } from './sqlJsDatabase';

/** A burst of journey writes (a hop writes several rows) costs one save (SPEC.md §15.5). */
export const SNAPSHOT_SAVE_DELAY_MS = 500;
const ERROR_SCOPE = 'storage.journeys';

/** Where the whole database file is kept between visits. */
export interface SnapshotStore {
  read(): Promise<Uint8Array | null>;
  write(bytes: Uint8Array): Promise<void>;
}

export interface SnapshotDatabase {
  database: SqlDatabase;
  /** Saves now if a save is waiting; for when the page is going away. */
  flush(): void;
}

interface SnapshotDatabaseSources {
  sql: SqlJsStatic;
  openStore: () => Promise<SnapshotStore>;
}

/**
 * Loads the store's snapshot, or null when there is nowhere safe to save. A snapshot that can't be read must not be
 * overwritten, so that also runs without saving. Either way the session goes on in memory.
 */
async function loadSnapshot(openStore: () => Promise<SnapshotStore>) {
  try {
    const store = await openStore();
    return { store, bytes: await store.read() };
  } catch (error) {
    reportError(ERROR_SCOPE, error);
    return { store: null, bytes: null };
  }
}

function debouncedSaver(db: Database, store: SnapshotStore) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    timer = undefined;
    store.write(db.export()).catch((error: unknown) => reportError(ERROR_SCOPE, error));
  };
  return {
    schedule() {
      clearTimeout(timer);
      timer = setTimeout(save, SNAPSHOT_SAVE_DELAY_MS);
    },
    flush() {
      if (timer === undefined) return;
      clearTimeout(timer);
      save();
    },
  };
}

/** An in-memory sql.js database persisted as a snapshot after writes (the web's journey store, SPEC.md §15.5). */
export async function openSnapshotDatabase({ sql, openStore }: SnapshotDatabaseSources): Promise<SnapshotDatabase> {
  const { store, bytes } = await loadSnapshot(openStore);
  const db = new sql.Database(bytes ?? undefined);
  if (store === null) return { database: sqlJsDatabase(db, () => undefined), flush: () => undefined };
  const saver = debouncedSaver(db, store);
  return { database: sqlJsDatabase(db, saver.schedule), flush: saver.flush };
}
