import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase } from '../journeyDatabase';

/** A real in-memory SQLite (Node's built-in driver) behind the same interface the app gets from expo-sqlite. */
export function memoryDatabase(): SqlDatabase {
  const db = new DatabaseSync(':memory:');
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params) {
      const { changes } = db.prepare(source).run(...params);
      return { changes: Number(changes) };
    },
    async getAllAsync<T>(source: string, params: (string | number | null)[]) {
      return db.prepare(source).all(...params) as T[];
    },
  };
}
