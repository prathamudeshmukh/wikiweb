import type { Card } from '../content/card';
import { NO_TOPIC } from '../content/topics';
import { migrate } from '../journeys/journeyDatabase';
import { memoryDatabase } from '../journeys/__testing__/memoryDatabase';
import type { HomeSnapshot } from './homeSnapshot';
import { createHomeSnapshotStore } from './homeSnapshotStore';

const card = (pageId: number): Card => ({
  pageId,
  title: `Page ${pageId}`,
  description: 'A page',
  extract: null,
  thumbnail: { url: 'https://example.org/a.jpg', width: 500, height: 300 },
  topic: NO_TOPIC,
  topicIsFallback: true,
  incomingLinks: 12,
  source: 'home_interest',
  interestNode: 'philosophy/logic',
  featuredOn: '2026-10-05',
  visited: false,
  read: false,
});

const snapshot = (...pageIds: number[]): HomeSnapshot => ({ interestsKey: 'space', cards: pageIds.map(card) });

async function setup() {
  const db = memoryDatabase();
  await migrate(db);
  return { db, store: createHomeSnapshotStore(async () => db) };
}

describe('createHomeSnapshotStore', () => {
  it('has no snapshot before the first save', async () => {
    const { store } = await setup();

    expect(await store.load()).toBeNull();
  });

  it('loads the last saved snapshot', async () => {
    const { store } = await setup();
    await store.save(snapshot(1, 2));
    await store.save(snapshot(3));

    expect(await store.load()).toEqual(snapshot(3));
  });

  it('leaves out articles read since, even before the session has loaded read history', async () => {
    const { db, store } = await setup();
    await store.save(snapshot(1, 2));
    await db.runAsync('INSERT INTO read_history (page_id, first_read_at, last_read_at) VALUES (?, ?, ?)', [1, 0, 0]);

    expect(await store.load()).toEqual(snapshot(2));
  });

  it('ignores a snapshot whose cards no longer parse', async () => {
    const { db, store } = await setup();
    await store.save(snapshot(1));
    await db.runAsync('UPDATE home_snapshot SET cards = ?', ['[{"pageId":"not a number"}]']);

    expect(await store.load()).toBeNull();
  });
});
