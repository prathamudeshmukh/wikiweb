import { fakeWikiApi, idOf } from './__testing__/fakeWikiApi';
import { createHomeFeed, type HomeContext } from './homeFeed';

const titles = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);

const featuredQuery = (topics: string) => `articletopic:${topics} incategory:Featured_articles`;
const FEATURED_SPACE = featuredQuery('space');
const GOOD_SPACE = 'articletopic:space incategory:Good_articles';
const FEATURED_HISTORY = featuredQuery('history|military-and-warfare');
// First tile in TOPIC_TILES order that the user did not pick (when they picked Space).
const WILDCARD_ANIMALS = 'articletopic:biology incategory:Featured_articles';

function context(overrides: Partial<HomeContext> = {}): HomeContext {
  return {
    interestTileIds: ['space'],
    today: new Date(Date.UTC(2026, 9, 1)),
    visitedIds: new Set(),
    isRead: () => false,
    blocklist: ['sex'],
    ...overrides,
  };
}

function plentiful() {
  return fakeWikiApi({
    searches: { [FEATURED_SPACE]: titles('Space', 40), [FEATURED_HISTORY]: titles('History', 40), [WILDCARD_ANIMALS]: titles('Wild', 10) },
    featured: titles('Today', 10),
  });
}

describe('createHomeFeed', () => {
  it('mixes 70% interests, 20% today and 10% wildcard', async () => {
    const { api } = plentiful();

    const page = (await createHomeFeed(api, context()).nextPage()).cards;

    const count = (source: string) => page.filter((c) => c.source === source).length;
    expect([count('home_interest'), count('home_today'), count('home_wildcard')]).toEqual([14, 4, 2]);
  });

  it('interleaves sources instead of clumping them', async () => {
    const { api } = plentiful();

    const page = (await createHomeFeed(api, context()).nextPage()).cards;

    expect(page.slice(0, 5).map((c) => c.source)).toEqual(['home_interest', 'home_interest', 'home_wildcard', 'home_interest', 'home_today']);
  });

  it('rotates between interest tiles', async () => {
    const { api } = plentiful();

    const page = (await createHomeFeed(api, context({ interestTileIds: ['space', 'history'] })).nextPage()).cards;

    const interests = page.filter((c) => c.source === 'home_interest').map((c) => c.title.split(' ')[0]);
    expect(interests.slice(0, 4)).toEqual(['Space', 'History', 'Space', 'History']);
  });

  it('labels interest cards with the tile they came from when their own topic is unknown', async () => {
    const { api } = plentiful();

    const [first] = (await createHomeFeed(api, context()).nextPage()).cards;

    expect(first.topic).toEqual({ tileId: 'space', territory: 'cosmos' });
    expect(first.topicIsFallback).toBe(true);
  });

  it('sinks only hub articles, keeping well-known picks and the today and wildcard slots in place', async () => {
    const { api } = fakeWikiApi({
      searches: { [FEATURED_SPACE]: ['Sun', 'Moon', 'Kepler-452b'], [WILDCARD_ANIMALS]: ['Wild 1'] },
      incomingLinks: { Sun: 10_000, Moon: 25_000, 'Kepler-452b': 400 },
    });

    const page = (await createHomeFeed(api, context()).nextPage()).cards;

    expect(page.map((c) => c.title)).toEqual(['Sun', 'Kepler-452b', 'Wild 1', 'Moon']);
  });

  it('takes wildcards from Featured articles of a tile the user did not pick', async () => {
    const { api } = plentiful();

    const page = (await createHomeFeed(api, context()).nextPage()).cards;

    const wildcard = page.find((c) => c.source === 'home_wildcard');
    expect(wildcard?.title).toBe('Wild 1');
    expect(wildcard?.topic).toEqual({ tileId: 'animals', territory: 'life' });
  });

  it('draws a fresh random slice of Featured and Good articles each time', async () => {
    const { api, calls } = plentiful();

    await createHomeFeed(api, context()).nextPage();

    expect(calls.searches).toEqual(
      expect.arrayContaining([{ query: FEATURED_SPACE, sort: 'random' }, { query: GOOD_SPACE, sort: 'random' }, { query: WILDCARD_ANIMALS, sort: 'random' }]),
    );
  });

  it('alternates famous Featured and lesser-known Good articles within an interest', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: titles('Featured', 10), [GOOD_SPACE]: titles('Good', 10) } });

    const page = (await createHomeFeed(api, context()).nextPage()).cards;

    expect(page.slice(0, 4).map((c) => c.title)).toEqual(['Featured 1', 'Good 1', 'Featured 2', 'Good 2']);
  });

  it('keeps drawing from Good articles when Featured runs out', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: ['Moon'], [GOOD_SPACE]: titles('Good', 10) } });

    const page = (await createHomeFeed(api, context()).nextPage()).cards;

    expect(page.slice(0, 4).map((c) => c.title)).toEqual(['Moon', 'Good 1', 'Good 2', 'Good 3']);
  });

  it('fills today and wildcard slots with interests when those sources are empty', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: titles('Space', 40) } });

    const page = (await createHomeFeed(api, context()).nextPage()).cards;

    expect(page).toHaveLength(20);
    expect(page.every((c) => c.source === 'home_interest')).toBe(true);
  });

  it('still builds Home from interests when today’s feed and wildcards fail', async () => {
    const { api, state } = plentiful();
    state.failures.featured = Infinity;
    const failingWildcards = { ...api, search: (q: string, c: string | null) => (q === WILDCARD_ANIMALS ? Promise.reject(new Error('down')) : api.search(q, c)) };

    const page = await createHomeFeed(failingWildcards, context()).nextPage();

    expect(page.cards).toHaveLength(20);
    expect(page.cards.some((c) => c.source === 'home_today' || c.title.startsWith('Wild'))).toBe(false);
  });

  it('reports failing optional sources instead of hiding them', async () => {
    const { api, state } = plentiful();
    state.failures.featured = Infinity;
    const errors: unknown[] = [];

    await createHomeFeed(api, context({ onSourceError: (error) => errors.push(error) })).nextPage();

    expect(errors).toEqual([expect.objectContaining({ message: 'featured failed' })]);
  });

  it('skips blocklisted titles', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: ['Sex in space', 'Moon'] } });

    const page = (await createHomeFeed(api, context()).nextPage()).cards;

    expect(page.map((c) => c.title)).toEqual(['Moon']);
  });

  it('never repeats a card across pages', async () => {
    const { api } = plentiful();
    const feed = createHomeFeed(api, context());

    const cards = [...((await feed.nextPage()).cards), ...((await feed.nextPage()).cards)];

    expect(new Set(cards.map((c) => c.pageId)).size).toBe(cards.length);
  });

  it('leaves out articles the reader has already read', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: ['Moon', 'Mars'] } });

    const page = (await createHomeFeed(api, context({ isRead: (pageId) => pageId === idOf('Moon') })).nextPage()).cards;

    expect(page.map((c) => c.title)).toEqual(['Mars']);
  });

  it('still shows, and marks, articles visited but not read', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: ['Moon'] } });

    const [moon] = (await createHomeFeed(api, context({ visitedIds: new Set([idOf('Moon')]) })).nextPage()).cards;

    expect(moon.visited).toBe(true);
  });

  it('rejects an empty or unknown interest list', () => {
    const { api } = plentiful();

    expect(() => createHomeFeed(api, context({ interestTileIds: [] }))).toThrow(/at least one interest/);
    expect(() => createHomeFeed(api, context({ interestTileIds: ['astrology'] }))).toThrow(/Unknown interest "astrology"/);
  });
});
