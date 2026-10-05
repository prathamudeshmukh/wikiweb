import { NO_TOPIC } from '../../content/topics';
import { migrate } from '../../journeys/journeyDatabase';
import { memoryDatabase } from '../../journeys/__testing__/memoryDatabase';
import type { JourneySession } from '../../journeys/journeySession';
import { createFindRepository } from '../findRepository';
import { createFindsStore, type FindEvents, type FindsStore } from '../findsStore';

/** A finds store over a fresh in-memory database (without journeys, so finds aren't tied to expeditions). */
export function memoryFindsStore(journeys?: JourneySession, events?: FindEvents): FindsStore {
  return createFindsStore({
    repo: createFindRepository(async () => {
      const db = memoryDatabase();
      await migrate(db);
      // Screen tests keep journeys in their own database, so the finds table can't point at them.
      await db.execAsync('PRAGMA foreign_keys = OFF;');
      return db;
    }),
    now: Date.now,
    expedition: () => {
      const active = journeys?.getState().active?.journey;
      return active ? { id: active.id, title: active.title } : null;
    },
    journeysSaved: async () => undefined,
    describe: async () => ({ topic: NO_TOPIC, thumbnailUrl: null }),
    onError: (scope, error) => {
      throw new Error(`${scope}: ${String(error)}`);
    },
    events,
  });
}
