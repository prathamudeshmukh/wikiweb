import type { Database } from 'sql.js';
import type { SqlDatabase, SqlValue } from './journeyDatabase';

/** sql.js behind the interface the journey repository uses; `onWrite` hears every statement that may change data. */
export function sqlJsDatabase(db: Database, onWrite: () => void): SqlDatabase {
  return {
    async execAsync(source) {
      db.exec(source);
      onWrite();
    },
    async runAsync(source, params: SqlValue[]) {
      db.run(source, params);
      onWrite();
      return { changes: db.getRowsModified() };
    },
    async getAllAsync<T>(source: string, params: SqlValue[]) {
      const statement = db.prepare(source, params);
      try {
        const rows: T[] = [];
        while (statement.step()) rows.push(statement.getAsObject() as T);
        return rows;
      } finally {
        statement.free();
      }
    },
  };
}
