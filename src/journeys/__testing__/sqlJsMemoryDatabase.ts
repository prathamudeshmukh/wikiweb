import initSqlJs from 'sql.js';
import type { SqlDatabase } from '../journeyDatabase';
import { sqlJsDatabase } from '../sqlJsDatabase';

/** The web's driver (sql.js, Node build) on an empty in-memory database. */
export async function sqlJsMemoryDatabase(): Promise<SqlDatabase> {
  const sql = await initSqlJs();
  return sqlJsDatabase(new sql.Database(), () => undefined);
}
