import { openDatabaseAsync } from 'expo-sqlite';
import { migrate, type SqlDatabase } from './journeyDatabase';

const DATABASE_NAME = 'journeys.db';

/** Opens (and migrates) the on-device journey database. */
export async function openJourneyDatabase(): Promise<SqlDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await migrate(db);
  return db;
}
