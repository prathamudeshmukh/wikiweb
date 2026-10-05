import { memoryDatabase } from '../journeys/__testing__/memoryDatabase';
import { migrate } from '../journeys/journeyDatabase';
import { createCompletedNodes } from './completedNodes';

async function openCompleted() {
  const db = memoryDatabase();
  await migrate(db);
  return createCompletedNodes(async () => db);
}

const stoicism = { nodePath: 'philosophy/ethics/stoicism', completedAt: 1000, articleCount: 37 };

describe('completed nodes', () => {
  it('starts empty', async () => {
    const completed = await openCompleted();

    await expect(completed.list()).resolves.toEqual([]);
  });

  it('records a node the first time and says so', async () => {
    const completed = await openCompleted();

    await expect(completed.record(stoicism)).resolves.toBe(true);
    await expect(completed.list()).resolves.toEqual([stoicism]);
  });

  it('keeps the first record when a node is found exhausted again', async () => {
    const completed = await openCompleted();
    await completed.record(stoicism);

    await expect(completed.record({ ...stoicism, completedAt: 2000, articleCount: 40 })).resolves.toBe(false);
    await expect(completed.list()).resolves.toEqual([stoicism]);
  });

  it('lists the newest first', async () => {
    const completed = await openCompleted();
    await completed.record(stoicism);
    await completed.record({ nodePath: 'maths/logic/paradoxes', completedAt: 3000, articleCount: 35 });

    const paths = (await completed.list()).map((c) => c.nodePath);

    expect(paths).toEqual(['maths/logic/paradoxes', 'philosophy/ethics/stoicism']);
  });

  it('leaves out nodes that are no longer in the tree', async () => {
    const completed = await openCompleted();
    await completed.record({ nodePath: 'philosophy/ethics/hedonism', completedAt: 1000, articleCount: 9 });

    await expect(completed.list()).resolves.toEqual([]);
  });
});
