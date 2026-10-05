import { makeJourney, makeNode, T0 } from './__testing__/journeyFactories';
import { memoryDatabase } from './__testing__/memoryDatabase';
import { migrate, type SqlDatabase } from './journeyDatabase';
import { createJourneyRepository } from './journeyRepository';

async function openRepository() {
  const db = memoryDatabase();
  await migrate(db);
  return { db, repo: createJourneyRepository(async () => db) };
}

describe('migrate', () => {
  it('creates the schema once and is safe to run again', async () => {
    const db = memoryDatabase();

    await migrate(db);
    await migrate(db);

    const [{ user_version: version }] = await db.getAllAsync<{ user_version: number }>('PRAGMA user_version', []);
    expect(version).toBe(2);
  });
});

describe('journey repository', () => {
  it('saves a journey with its nodes in order and remembers the latest node', async () => {
    const { repo } = await openRepository();
    await repo.createJourney(makeJourney('j1'));

    await repo.addNode(makeNode('n1', 'Octopus'));
    await repo.addNode(makeNode('n2', 'Squid', { parentNodeId: 'n1', createdAt: T0 + 1000 }));

    const saved = await repo.expedition('j1');
    expect(saved?.nodes.map((node) => node.title)).toEqual(['Octopus', 'Squid']);
    expect(saved?.journey).toMatchObject({ lastNodeId: 'n2', updatedAt: T0 + 1000 });
  });

  it('knows whether any node has ever been saved', async () => {
    const { repo } = await openRepository();
    await expect(repo.hasNodes()).resolves.toBe(false);
    await repo.createJourney(makeJourney('j1'));

    await repo.addNode(makeNode('n1', 'Octopus'));

    await expect(repo.hasNodes()).resolves.toBe(true);
  });

  it('lists expeditions with the most recently active first', async () => {
    const { repo } = await openRepository();
    await repo.createJourney(makeJourney('old'));
    await repo.createJourney(makeJourney('new'));
    await repo.addNode(makeNode('n1', 'Octopus', { journeyId: 'old', createdAt: T0 + 5000 }));

    const expeditions = await repo.expeditions();

    expect(expeditions.map((e) => e.journey.id)).toEqual(['old', 'new']);
    expect(expeditions[1].nodes).toEqual([]);
  });

  it('keeps reads in the history and against the expedition they happened on', async () => {
    const { repo } = await openRepository();
    await repo.createJourney(makeJourney('j1'));

    await repo.recordRead({ pageId: 7, at: T0, journeyId: 'j1' });
    await repo.recordRead({ pageId: 7, at: T0 + 1, journeyId: 'j1' });
    await repo.recordRead({ pageId: 8, at: T0, journeyId: null });

    expect((await repo.readPageIds()).sort()).toEqual([7, 8]);
    expect([...((await repo.expedition('j1'))?.readIds ?? [])]).toEqual([7]);
  });

  it('awards each topic’s stamp only once', async () => {
    const { repo } = await openRepository();

    const first = await repo.awardStamp({ tileId: 'maths', pageId: 1, earnedAt: T0 });
    const again = await repo.awardStamp({ tileId: 'maths', pageId: 2, earnedAt: T0 + 1 });

    expect([first, again]).toEqual([true, false]);
    expect(await repo.stamps()).toEqual([{ tileId: 'maths', pageId: 1, earnedAt: T0 }]);
  });

  it('returns null for an expedition that does not exist', async () => {
    const { repo } = await openRepository();

    expect(await repo.expedition('missing')).toBeNull();
  });

  it('treats topics it no longer knows as untagged', async () => {
    const { db, repo } = await openRepository();
    await repo.createJourney(makeJourney('j1'));
    await repo.addNode(makeNode('n1', 'Octopus', { tileId: 'animals', territory: 'life' }));
    await db.runAsync("UPDATE journey_nodes SET tile_id = 'retired', territory = 'atlantis'", []);
    await db.runAsync("INSERT INTO stamps VALUES ('retired', 1, 1)", []);

    const [node] = (await repo.expedition('j1'))?.nodes ?? [];

    expect(node).toMatchObject({ tileId: null, territory: null });
    expect(await repo.stamps()).toEqual([]);
  });

  it('refuses a node for a journey that was never saved', async () => {
    const { repo } = await openRepository();

    await expect(repo.addNode(makeNode('n1', 'Octopus', { journeyId: 'ghost' }))).rejects.toThrow(/FOREIGN KEY/);
  });

  it('waits for the database to open before any call', async () => {
    let resolveOpen: (db: SqlDatabase) => void = () => undefined;
    const repo = createJourneyRepository(() => new Promise((resolve) => (resolveOpen = resolve)));
    const pending = repo.readPageIds();
    const db = memoryDatabase();
    await migrate(db);

    resolveOpen(db);

    expect(await pending).toEqual([]);
  });
});

describe('journey repository — opening', () => {
  it('opens the database once, on first use', async () => {
    const db = memoryDatabase();
    await migrate(db);
    const open = jest.fn(async () => db);
    const repo = createJourneyRepository(open);

    await Promise.all([repo.readPageIds(), repo.stamps()]);

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('tries to open again after a failed attempt', async () => {
    const db = memoryDatabase();
    await migrate(db);
    const open = jest.fn().mockRejectedValueOnce(new Error('locked')).mockResolvedValue(db);
    const repo = createJourneyRepository(open);

    await expect(repo.readPageIds()).rejects.toThrow('locked');

    expect(await repo.readPageIds()).toEqual([]);
  });
});
