import initSqlJs from 'sql.js';
import { openIndexedDbSnapshotStore } from './indexedDbSnapshotStore';
import { migrate, type SqlDatabase } from './journeyDatabase';
import { openSnapshotDatabase } from './snapshotDatabase';

/** Copied into `public/` from the installed sql.js on `npm install`, so the two never drift. */
export const SQL_WASM_URL = '/sql-wasm.wasm';

/** Opens (and migrates) the journey database: sql.js in memory, saved to IndexedDB (SPEC.md §15.5). */
export async function openJourneyDatabase(): Promise<SqlDatabase> {
  const sql = await initSqlJs({ locateFile: () => SQL_WASM_URL });
  const { database, flush } = await openSnapshotDatabase({ sql, openStore: openIndexedDbSnapshotStore });
  // Phones often kill a backgrounded tab without a pagehide, so going hidden saves too.
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  await migrate(database);
  return database;
}
