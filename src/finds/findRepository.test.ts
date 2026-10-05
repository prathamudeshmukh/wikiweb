import { makeJourney, T0 } from '../journeys/__testing__/journeyFactories';
import { memoryDatabase } from '../journeys/__testing__/memoryDatabase';
import { migrate } from '../journeys/journeyDatabase';
import { createJourneyRepository } from '../journeys/journeyRepository';
import { makeFind } from './__testing__/findFactories';
import { createFindRepository } from './findRepository';

async function openRepositories() {
  const db = memoryDatabase();
  await migrate(db);
  const open = async () => db;
  return { finds: createFindRepository(open), journeys: createJourneyRepository(open) };
}

describe('find repository', () => {
  it('lists finds newest first', async () => {
    const { finds } = await openRepositories();
    await finds.add(makeFind('Octopus', { foundAt: T0 }));
    await finds.add(makeFind('Squid', { foundAt: T0 + 1000 }));

    const saved = await finds.all();

    expect(saved.map((find) => find.title)).toEqual(['Squid', 'Octopus']);
  });

  it('keeps the first find of an article', async () => {
    const { finds } = await openRepositories();
    await finds.add(makeFind('Octopus', { foundAt: T0 }));

    await finds.add(makeFind('Octopus', { foundAt: T0 + 1000 }));

    expect((await finds.all()).map((find) => find.foundAt)).toEqual([T0]);
  });

  it('names the expedition a find was made on', async () => {
    const { finds, journeys } = await openRepositories();
    await journeys.createJourney(makeJourney('j1', { title: 'From Octopus' }));

    await finds.add(makeFind('Squid', { foundAt: T0 + 1000, expedition: { id: 'j1', title: 'From Octopus' } }));
    await finds.add(makeFind('Gamelan', { foundAt: T0 }));

    const saved = await finds.all();
    expect(saved.map((find) => find.expedition)).toEqual([{ id: 'j1', title: 'From Octopus' }, null]);
  });

  it('forgets a removed find', async () => {
    const { finds } = await openRepositories();
    await finds.add(makeFind('Octopus'));

    await finds.remove(makeFind('Octopus').pageId);

    expect(await finds.all()).toEqual([]);
  });

  it('fills in details learned after the find was saved', async () => {
    const { finds } = await openRepositories();
    await finds.add(makeFind('Euler', { tileId: null, territory: null, thumbnailUrl: null }));

    await finds.complete(makeFind('Euler').pageId, { tileId: 'maths', territory: 'cosmos', thumbnailUrl: 'https://img/euler.jpg' });

    expect(await finds.all()).toEqual([expect.objectContaining({ tileId: 'maths', territory: 'cosmos', thumbnailUrl: 'https://img/euler.jpg' })]);
  });

  it('drops topics an older build stored that no longer exist', async () => {
    const { finds } = await openRepositories();

    await finds.add(makeFind('Octopus', { tileId: 'gone' as never, territory: 'nowhere' as never }));

    expect(await finds.all()).toEqual([expect.objectContaining({ tileId: null, territory: null })]);
  });
});
