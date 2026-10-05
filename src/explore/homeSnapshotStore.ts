import { z } from 'zod';
import type { Card } from '../content/card';
import { openOnce, type SqlDatabase } from '../journeys/journeyDatabase';
import { storedTerritory, storedTileId } from '../journeys/storedTopic';
import type { HomeSnapshot } from './homeSnapshot';

export interface HomeSnapshotStore {
  /** The last saved Home without articles read since; null when none was saved or it no longer parses. */
  load(): Promise<HomeSnapshot | null>;
  /** Replaces the saved Home. */
  save(snapshot: HomeSnapshot): Promise<void>;
}

interface Row {
  interests_key: string;
  cards: string;
}

// Saved by an earlier build, so checked like any other outside data: a card shape that has since changed is dropped.
const storedCardsSchema = z.array(
  z.object({
    pageId: z.number().int(),
    title: z.string(),
    description: z.string().nullable(),
    extract: z.string().nullable(),
    thumbnail: z.object({ url: z.string(), width: z.number(), height: z.number() }).nullable(),
    topic: z.object({ tileId: z.string().nullable(), territory: z.string().nullable() }),
    topicIsFallback: z.boolean(),
    incomingLinks: z.number().nullable(),
    source: z.enum(['home_interest', 'home_today', 'home_wildcard']),
    interestNode: z.string().optional(),
    featuredOn: z.string().optional(),
    visited: z.boolean(),
    read: z.boolean(),
  }),
);

type StoredCard = z.infer<typeof storedCardsSchema>[number];

const toCard = ({ topic, ...card }: StoredCard): Card => ({
  ...card,
  topic: { tileId: storedTileId(topic.tileId), territory: storedTerritory(topic.territory) },
});

function parseCards(json: string): Card[] | null {
  try {
    const parsed = storedCardsSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data.map(toCard) : null;
  } catch {
    // Not JSON at all: treated like a card shape that no longer parses.
    return null;
  }
}

// Asked of the table, not the session: the session's read history may still be loading on a cold start.
async function readAmong(db: SqlDatabase, cards: readonly Card[]): Promise<ReadonlySet<number>> {
  if (cards.length === 0) return new Set();
  const placeholders = cards.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{ page_id: number }>(`SELECT page_id FROM read_history WHERE page_id IN (${placeholders})`, cards.map((card) => card.pageId));
  return new Set(rows.map((row) => row.page_id));
}

/** Home's cold-start snapshot, sharing the journey database. */
export function createHomeSnapshotStore(openDatabase: () => Promise<SqlDatabase>): HomeSnapshotStore {
  const open = openOnce(openDatabase);
  return {
    async load() {
      const db = await open();
      const [row] = await db.getAllAsync<Row>('SELECT interests_key, cards FROM home_snapshot WHERE id = 1', []);
      if (!row) return null;
      const cards = parseCards(row.cards);
      if (!cards) return null;
      const read = await readAmong(db, cards);
      return { interestsKey: row.interests_key, cards: cards.filter((card) => !read.has(card.pageId)) };
    },

    async save({ interestsKey, cards }) {
      const db = await open();
      await db.runAsync('INSERT OR REPLACE INTO home_snapshot (id, interests_key, cards) VALUES (1, ?, ?)', [interestsKey, JSON.stringify(cards)]);
    },
  };
}
