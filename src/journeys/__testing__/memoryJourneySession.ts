import { NO_TOPIC } from '../../content/topics';
import { migrate } from '../journeyDatabase';
import { createJourneyRepository } from '../journeyRepository';
import { createJourneySession, type JourneySession } from '../journeySession';
import { memoryDatabase } from './memoryDatabase';

/** A journey session over a fresh in-memory database, for screen tests. */
export function memoryJourneySession(): JourneySession {
  let ids = 0;
  return createJourneySession({
    repo: createJourneyRepository(async () => {
      const db = memoryDatabase();
      await migrate(db);
      return db;
    }),
    now: Date.now,
    newId: () => `node${(ids += 1)}`,
    resolveTopic: async () => NO_TOPIC,
    onError: (scope, error) => {
      throw new Error(`${scope}: ${String(error)}`);
    },
  });
}
