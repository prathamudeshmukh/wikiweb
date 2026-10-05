import { idOf } from '../content/__testing__/fakeWikiApi';
import { NO_TOPIC } from '../content/topics';
import { T0 } from './__testing__/journeyFactories';
import { memoryDatabase } from './__testing__/memoryDatabase';
import { migrate } from './journeyDatabase';
import { createJourneyRepository, type JourneyRepository } from './journeyRepository';
import { createJourneySession, type JourneySessionDeps } from './journeySession';
import type { NodePage } from './journeyTypes';

const page = (title: string, overrides: Partial<NodePage> = {}): NodePage => ({
  pageId: idOf(title),
  title,
  tileId: null,
  territory: null,
  thumbnailUrl: null,
  ...overrides,
});
const MATHS = { tileId: 'maths', territory: 'cosmos' } as const;

async function setUp(overrides: Partial<JourneySessionDeps> = {}) {
  const db = memoryDatabase();
  await migrate(db);
  const repo = createJourneyRepository(async () => db);
  let clock = T0;
  let ids = 0;
  const onError = jest.fn();
  const resolveTopic = jest.fn(async () => NO_TOPIC);
  const session = createJourneySession({
    repo,
    now: () => (clock += 1000),
    newId: () => `id${(ids += 1)}`,
    resolveTopic,
    onError,
    ...overrides,
  });
  return { session, repo, onError, resolveTopic };
}

/** Octopus → Squid, the usual two swipes from Home. */
async function twoHops() {
  const context = await setUp();
  const octopus = context.session.hop({ fromNodeId: null, page: page('Octopus'), via: 'swipe' });
  const squid = context.session.hop({ fromNodeId: octopus.id, page: page('Squid'), via: 'swipe' });
  return { ...context, octopus, squid };
}

describe('journey session — hops', () => {
  it('sets off on an expedition with the first hop from Home', async () => {
    const { session } = await setUp();

    const node = session.hop({ fromNodeId: null, page: page('Octopus'), via: 'swipe' });

    expect(session.getState().active?.journey.title).toBe('From Octopus');
    expect(node).toMatchObject({ parentNodeId: null, via: 'swipe', title: 'Octopus' });
  });

  it('grows the expedition’s tree with each hop and saves it', async () => {
    const { session, repo, octopus, squid } = await twoHops();

    await session.whenSaved();

    expect(squid.parentNodeId).toBe(octopus.id);
    expect((await repo.expedition(octopus.journeyId))?.nodes.map((n) => n.title)).toEqual(['Octopus', 'Squid']);
  });

  it('ends the expedition on returning Home, so the next hop starts another', async () => {
    const { session, octopus } = await twoHops();

    session.focus(null);
    const next = session.hop({ fromNodeId: null, page: page('Ink'), via: 'swipe' });

    expect(next.journeyId).not.toBe(octopus.journeyId);
  });

  it('starts afresh rather than attach a hop to a node it doesn’t know', async () => {
    const { session, octopus } = await twoHops();

    const stray = session.hop({ fromNodeId: 'unknown', page: page('Ink'), via: 'peek_explore' });

    expect(stray).toMatchObject({ parentNodeId: null });
    expect(stray.journeyId).not.toBe(octopus.journeyId);
  });

  it('remembers which column is on top', async () => {
    const { session, squid } = await twoHops();

    session.focus(squid.id);

    expect(session.focusedNodeId()).toBe(squid.id);
  });
});

describe('journey session — reading', () => {
  it('adds an in-place read to the expedition, under the node it was read from', async () => {
    const { session, squid } = await twoHops();

    const read = session.peekRead(squid.id, page('Iron gall ink'));

    expect(read).toMatchObject({ parentNodeId: squid.id, via: 'peek_read' });
  });

  it('records no in-place read without an expedition', async () => {
    const { session } = await setUp();

    expect(session.peekRead(null, page('Iron gall ink'))).toBeNull();
  });

  it('marks an article read in the history and on the expedition', async () => {
    const { session, repo, octopus } = await twoHops();

    session.markRead(page('Squid'), MATHS);
    await session.whenSaved();

    expect(session.getState().readIds.has(idOf('Squid'))).toBe(true);
    expect((await repo.expedition(octopus.journeyId))?.readIds.has(idOf('Squid'))).toBe(true);
  });

  it('stamps a topic the first time an article of it is read', async () => {
    const { session, repo } = await setUp();

    session.markRead(page('Euler'), MATHS);
    session.markRead(page('Gauss'), MATHS);
    await session.whenSaved();

    expect((await repo.stamps()).map((s) => s.pageId)).toEqual([idOf('Euler')]);
  });

  it('looks up the topic when the reader doesn’t know it', async () => {
    const resolveTopic = jest.fn(async () => MATHS);
    const { session } = await setUp({ resolveTopic });

    session.markRead(page('Euler'), null);
    await resolveTopic.mock.results[0].value;

    expect(session.getState().stampTileIds.has('maths')).toBe(true);
  });

  it('reports a failed topic lookup and stamps nothing', async () => {
    const onError = jest.fn();
    const resolveTopic = jest.fn(async () => Promise.reject(new Error('cirrusdoc down')));
    const { session } = await setUp({ resolveTopic, onError });

    session.markRead(page('Euler'), null);
    await new Promise(process.nextTick);

    expect(onError).toHaveBeenCalledWith('journeys.stampTopic', expect.any(Error));
    expect(session.getState().stampTileIds.size).toBe(0);
  });
});

describe('journey session — storage', () => {
  it('loads read history and stamps, keeping anything recorded meanwhile', async () => {
    const { session, repo } = await setUp();
    await repo.recordRead({ pageId: 1, at: T0, journeyId: null });
    await repo.awardStamp({ tileId: 'space', pageId: 1, earnedAt: T0 });
    session.markRead(page('Euler'), MATHS);

    await session.load();

    expect([...session.getState().readIds].sort()).toEqual([1, idOf('Euler')].sort());
    expect([...session.getState().stampTileIds].sort()).toEqual(['maths', 'space']);
  });

  it('reports whether the user has ever hopped, counting hops not yet saved', async () => {
    const { session } = await setUp();
    await expect(session.hasExplored()).resolves.toBe(false);

    session.hop({ fromNodeId: null, page: page('Octopus'), via: 'swipe' });

    await expect(session.hasExplored()).resolves.toBe(true);
  });

  it('resumes a saved expedition as the active one', async () => {
    const { session, octopus } = await twoHops();
    session.focus(null);

    const resumed = await session.resume(octopus.journeyId);

    expect(resumed?.nodes).toHaveLength(2);
    expect(session.getState().active?.journey.id).toBe(octopus.journeyId);
  });

  it('opens the logbook only after pending writes are saved', async () => {
    const { session } = await twoHops();

    const { expeditions } = await session.logbook();

    expect(expeditions[0].nodes).toHaveLength(2);
  });

  it('reports a failed write without blocking later ones', async () => {
    const db = memoryDatabase();
    await migrate(db);
    const repo = createJourneyRepository(async () => db);
    const failing: JourneyRepository = { ...repo, createJourney: async () => Promise.reject(new Error('disk full')) };
    const { session, onError } = await setUp({ repo: failing });

    session.hop({ fromNodeId: null, page: page('Octopus'), via: 'swipe' });
    session.markRead(page('Octopus'), NO_TOPIC);
    await session.whenSaved();

    expect(onError).toHaveBeenCalledWith('journeys.create', expect.any(Error));
    expect(await repo.readPageIds()).toEqual([idOf('Octopus')]);
  });

  it('notifies subscribers of every change until they unsubscribe', async () => {
    const { session } = await setUp();
    const listener = jest.fn();
    const unsubscribe = session.subscribe(listener);

    session.hop({ fromNodeId: null, page: page('Octopus'), via: 'swipe' });
    unsubscribe();
    session.focus(null);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('journey session — events', () => {
  const eventsSpy = () => ({ stampEarned: jest.fn(), expeditionEnded: jest.fn(), articleRead: jest.fn() });

  it('tells its listener an expedition ended when the user returns Home', async () => {
    const events = eventsSpy();
    const { session } = await setUp({ events });
    session.hop({ fromNodeId: null, page: page('Octopus'), via: 'swipe' });
    const expedition = session.getState().active;

    session.focus(null);
    session.focus(null);

    expect(events.expeditionEnded).toHaveBeenCalledTimes(1);
    expect(events.expeditionEnded).toHaveBeenCalledWith(expedition);
  });

  it('tells its listener about each new stamp and the expedition it was earned on', async () => {
    const events = eventsSpy();
    const { session } = await setUp({ events });
    const octopus = session.hop({ fromNodeId: null, page: page('Octopus'), via: 'swipe' });

    session.markRead(page('Euler'), MATHS);
    session.markRead(page('Gauss'), MATHS);

    expect(events.stampEarned).toHaveBeenCalledTimes(1);
    expect(events.stampEarned).toHaveBeenCalledWith(MATHS, octopus.journeyId);
  });

  it('tells its listener the topic of every article read (SPEC.md §3.9 prompt reads)', async () => {
    const events = eventsSpy();
    const { session } = await setUp({ events });

    session.markRead(page('Euler'), MATHS);
    session.markRead(page('Gauss'), MATHS);

    expect(events.articleRead).toHaveBeenCalledTimes(2);
    expect(events.articleRead).toHaveBeenCalledWith(MATHS);
  });

  it('tells its listener the topic of a read once it has been looked up', async () => {
    const events = eventsSpy();
    const { session } = await setUp({ events, resolveTopic: async () => MATHS });

    session.markRead(page('Euler'), null);
    await session.whenSaved();

    expect(events.articleRead).toHaveBeenCalledWith(MATHS);
  });

  it('reports a stamp earned on Home without an expedition', async () => {
    const events = eventsSpy();
    const { session } = await setUp({ events });

    session.markRead(page('Euler'), MATHS);

    expect(events.stampEarned).toHaveBeenCalledWith(MATHS, null);
  });
});
