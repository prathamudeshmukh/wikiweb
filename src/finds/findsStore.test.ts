import { idOf } from '../content/__testing__/fakeWikiApi';
import { makeJourney, T0 } from '../journeys/__testing__/journeyFactories';
import { memoryDatabase } from '../journeys/__testing__/memoryDatabase';
import { migrate } from '../journeys/journeyDatabase';
import { createJourneyRepository } from '../journeys/journeyRepository';
import { createFindRepository } from './findRepository';
import { createFindsStore, type FindEvents, type FindsStoreDeps } from './findsStore';
import type { FindExpedition, FindPage } from './findTypes';

const octopus: FindPage = { pageId: idOf('Octopus'), title: 'Octopus', tileId: 'animals', territory: 'life', thumbnailUrl: 'https://img/octopus.jpg' };

function setUp(overrides: Partial<FindsStoreDeps> = {}) {
  const db = memoryDatabase();
  const open = async () => {
    await migrate(db);
    return db;
  };
  const repo = createFindRepository(open);
  const journeys = createJourneyRepository(open);
  let clock = T0;
  let expedition: FindExpedition | null = null;
  const events: FindEvents = { kept: jest.fn(), removed: jest.fn(), restored: jest.fn() };
  const store = createFindsStore({
    repo,
    now: () => (clock += 1000),
    expedition: () => expedition,
    journeysSaved: async () => undefined,
    describe: async () => ({ topic: { tileId: 'maths', territory: 'cosmos' }, thumbnailUrl: 'https://img/euler.jpg' }),
    onError: (scope, error) => {
      throw new Error(`${scope}: ${String(error)}`);
    },
    events,
    ...overrides,
  });
  return { store, repo, journeys, events, setExpedition: (next: FindExpedition | null) => (expedition = next) };
}

describe('finds store', () => {
  it('keeps an article at once and saves it', async () => {
    const { store, repo } = setUp();

    store.toggle(octopus, 'card');

    expect(store.getState().ids.has(octopus.pageId)).toBe(true);
    await store.whenSaved();
    expect(await repo.all()).toEqual([expect.objectContaining({ title: 'Octopus', thumbnailUrl: 'https://img/octopus.jpg', expedition: null })]);
  });

  it('confirms a kept find with a notice', () => {
    const { store, events } = setUp();

    store.toggle(octopus, 'card');

    expect(store.getState().notice).toMatchObject({ kind: 'kept', find: { title: 'Octopus' } });
    expect(events.kept).toHaveBeenCalledWith(expect.objectContaining({ title: 'Octopus' }), 'card');
  });

  it('remembers the expedition a find was made on', async () => {
    const { store, repo, journeys, setExpedition } = setUp();
    await journeys.createJourney(makeJourney('j1', { title: 'From Squid' }));
    setExpedition({ id: 'j1', title: 'From Squid' });

    store.toggle(octopus, 'card');

    expect(store.getState().finds[0].expedition).toEqual({ id: 'j1', title: 'From Squid' });
    await store.whenSaved();
    expect((await repo.all())[0].expedition).toEqual({ id: 'j1', title: 'From Squid' });
  });

  it('waits for the expedition to be saved before saving a find made on it', async () => {
    let journeySaved = () => undefined as void;
    const saved = new Promise<void>((resolve) => (journeySaved = resolve));
    const { store, repo, journeys, setExpedition } = setUp({ journeysSaved: () => saved });
    setExpedition({ id: 'j1', title: 'From Squid' });

    store.toggle(octopus, 'card');
    await journeys.createJourney(makeJourney('j1', { title: 'From Squid' }));
    journeySaved();
    await store.whenSaved();

    expect(await repo.all()).toHaveLength(1);
  });

  it('removes a kept find when toggled again, offering undo', async () => {
    const { store, repo, events } = setUp();
    store.toggle(octopus, 'card');

    store.toggle(octopus, 'reader');

    expect(store.getState().notice).toMatchObject({ kind: 'removed', find: { title: 'Octopus' } });
    expect(events.removed).toHaveBeenCalledWith(expect.objectContaining({ title: 'Octopus' }), 'reader');
    await store.whenSaved();
    expect(await repo.all()).toEqual([]);
  });

  it('restores the original find on undo', async () => {
    const { store, repo } = setUp();
    store.toggle(octopus, 'card');
    const kept = store.getState().finds[0];
    store.toggle(octopus, 'card');

    store.undo();

    expect(store.getState().finds).toEqual([kept]);
    expect(store.getState().notice).toBeNull();
    await store.whenSaved();
    expect(await repo.all()).toEqual([kept]);
  });

  it('does nothing on undo once a newer notice has replaced the removal', () => {
    const { store } = setUp();
    store.toggle(octopus, 'card');
    store.toggle(octopus, 'card');
    store.toggle(octopus, 'card');
    const refound = store.getState().finds;

    store.undo();

    expect(store.getState().finds).toBe(refound);
  });

  it('lists finds newest first', () => {
    const { store } = setUp();

    store.toggle(octopus, 'card');
    store.toggle({ ...octopus, pageId: idOf('Squid'), title: 'Squid' }, 'card');

    expect(store.getState().finds.map((find) => find.title)).toEqual(['Squid', 'Octopus']);
  });

  it('looks up details the reader didn’t know and fills them in', async () => {
    const { store, repo } = setUp();

    store.toggle({ pageId: idOf('Euler'), title: 'Euler' }, 'reader');
    await store.whenSaved();

    const details = { tileId: 'maths', territory: 'cosmos', thumbnailUrl: 'https://img/euler.jpg' };
    expect(store.getState().finds[0]).toMatchObject(details);
    expect(await repo.all()).toEqual([expect.objectContaining(details)]);
  });

  it('keeps details it was given over the ones it looks up', async () => {
    const { store } = setUp();

    store.toggle({ pageId: idOf('Euler'), title: 'Euler', tileId: null, territory: null }, 'reader');
    await store.whenSaved();

    expect(store.getState().finds[0]).toMatchObject({ tileId: null, territory: null, thumbnailUrl: 'https://img/euler.jpg' });
  });

  it('keeps the find when its details can’t be looked up', async () => {
    const onError = jest.fn();
    const { store } = setUp({ describe: () => Promise.reject(new Error('offline')), onError });

    store.toggle({ pageId: idOf('Euler'), title: 'Euler' }, 'reader');
    await store.whenSaved();

    expect(store.getState().finds[0]).toMatchObject({ title: 'Euler', tileId: null, thumbnailUrl: null });
    expect(onError).toHaveBeenCalledWith('finds.describe', expect.any(Error));
  });

  it('loads saved finds, keeping any made while loading', async () => {
    const { store, repo } = setUp();
    await repo.add({ ...octopus, tileId: 'animals', territory: 'life', thumbnailUrl: null, foundAt: T0, expedition: null });
    const loading = store.load();

    store.toggle({ ...octopus, pageId: idOf('Squid'), title: 'Squid' }, 'card');
    await loading;

    expect(store.getState().finds.map((find) => find.title)).toEqual(['Squid', 'Octopus']);
  });

  it('dismisses only the notice it was asked to', () => {
    const { store } = setUp();
    store.toggle(octopus, 'card');
    const first = store.getState().notice;
    store.toggle(octopus, 'card');

    store.dismiss(first?.id ?? -1);

    expect(store.getState().notice?.kind).toBe('removed');
  });

  it('removes a find at once even while its details are still being looked up', async () => {
    const { store, repo } = setUp({ describe: () => new Promise(() => undefined) });
    store.toggle({ pageId: idOf('Euler'), title: 'Euler' }, 'reader');

    store.toggle({ pageId: idOf('Euler'), title: 'Euler' }, 'reader');
    // The lookup never answers, so whenSaved would wait forever; let the write queue run instead.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(await repo.all()).toEqual([]);
  });

  it('looks details up again for a find restored after its lookup was dropped', async () => {
    let answer = () => undefined as void;
    const looked = new Promise<void>((resolve) => (answer = resolve));
    const { store } = setUp({
      describe: async () => {
        await looked;
        return { topic: { tileId: 'maths', territory: 'cosmos' }, thumbnailUrl: null };
      },
    });
    const euler = { pageId: idOf('Euler'), title: 'Euler' };
    store.toggle(euler, 'reader');
    store.toggle(euler, 'reader');
    answer();
    await store.whenSaved();

    store.undo();
    await store.whenSaved();

    expect(store.getState().finds[0]).toMatchObject({ tileId: 'maths', territory: 'cosmos' });
  });

  it('reports a find made without a topic once its topic is known', async () => {
    const { store, events } = setUp();

    store.toggle({ pageId: idOf('Euler'), title: 'Euler' }, 'reader');
    expect(events.kept).not.toHaveBeenCalled();
    await store.whenSaved();

    expect(events.kept).toHaveBeenCalledWith(expect.objectContaining({ tileId: 'maths', territory: 'cosmos' }), 'reader');
  });
});
