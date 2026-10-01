import hydrateTitles from '../wiki-api/__fixtures__/hydrate-titles.json';
import { createWikiApi } from '../wiki-api/client';
import type { WikiHttp } from '../wiki-api/http';
import { fakeWikiApi, idOf, makeArticle } from './__testing__/fakeWikiApi';
import { type ColumnContext, createColumnFeed } from './columnFeed';

const titles = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);

function context(overrides: Partial<ColumnContext> = {}): ColumnContext {
  return {
    seed: { pageId: idOf('Octopus'), title: 'Octopus' },
    pathIds: new Set([idOf('Octopus')]),
    visitedIds: new Set(),
    readIds: new Set(),
    seedTopic: { tileId: 'animals', territory: 'life' },
    ...overrides,
  };
}

describe('createColumnFeed', () => {
  it('returns a full page of links with one backlink after every four', async () => {
    const { api } = fakeWikiApi({ links: titles('Link', 30), backlinks: titles('Back', 10) });

    const page = (await createColumnFeed(api, context()).nextPage()).cards;

    expect(page).toHaveLength(20);
    expect(page.slice(0, 5).map((c) => c.source)).toEqual(['link', 'link', 'link', 'link', 'backlink']);
  });

  it('reads the article section by section, lead first, skipping reference sections and subsections', async () => {
    const { api, calls } = fakeWikiApi({
      sections: [
        { index: 1, title: 'History', level: 2 },
        { index: 2, title: 'Early history', level: 3 },
        { index: 3, title: 'References', level: 2 },
        { index: 4, title: 'Culture', level: 2 },
      ],
      sectionLinks: { 0: ['Lead link'], 1: ['History link', 'Early link'], 2: ['Early link'], 3: ['Cited book'], 4: ['Culture link'] },
    });

    const page = (await createColumnFeed(api, context()).nextPage()).cards;

    expect(page.map((c) => c.title)).toEqual(['Lead link', 'History link', 'Early link', 'Culture link']);
    expect(calls.sectionLinks).toEqual([0, 1, 4]);
  });

  it('only loads further sections when the page needs more cards', async () => {
    const { api, calls } = fakeWikiApi({ links: titles('Lead', 30), sections: [{ index: 1, title: 'Body', level: 2 }], sectionLinks: { 1: ['Body link'] } });

    await createColumnFeed(api, context()).nextPage();

    expect(calls.sectionLinks).toEqual([0]);
  });

  it('fetches the section list once per column', async () => {
    const { api, calls } = fakeWikiApi({ links: titles('Lead', 50) });
    const feed = createColumnFeed(api, context());

    await feed.nextPage();
    await feed.nextPage();

    expect(calls.sections).toBe(1);
  });

  it('switches to morelike once the article runs out of links', async () => {
    const { api } = fakeWikiApi({ links: titles('Link', 3), moreLike: titles('Like', 30) });

    const page = (await createColumnFeed(api, context()).nextPage()).cards;

    expect(page.map((c) => c.title).slice(0, 5)).toEqual(['Link 1', 'Link 2', 'Link 3', 'Like 1', 'Like 2']);
    expect(page.at(-1)?.source).toBe('morelike');
  });

  it('never repeats a card across sources or pages', async () => {
    const shared = ['Squid', 'Cuttlefish'];
    const { api } = fakeWikiApi({ links: [...shared, ...titles('Link', 18)], backlinks: shared, moreLike: [...shared, ...titles('Like', 30)] });
    const feed = createColumnFeed(api, context());

    const cards = [...((await feed.nextPage()).cards), ...((await feed.nextPage()).cards)];

    expect(new Set(cards.map((c) => c.pageId)).size).toBe(cards.length);
  });

  it('treats two titles that redirect to the same article as one card', async () => {
    const { api } = fakeWikiApi({ links: ['Cephalopods', 'Cephalopod', 'Squid'], redirects: { Cephalopods: 'Cephalopod' } });

    const page = (await createColumnFeed(api, context()).nextPage()).cards;

    expect(page.map((c) => c.title)).toEqual(['Cephalopod', 'Squid']);
  });

  it('hides articles on the current path, including the seed', async () => {
    const { api } = fakeWikiApi({ links: ['Octopus', 'Mollusca', 'Squid'], moreLike: ['Cephalopod'] });
    const feed = createColumnFeed(api, context({ pathIds: new Set([idOf('Octopus'), idOf('Mollusca')]) }));

    const page = (await feed.nextPage()).cards;

    expect(page.map((c) => c.title)).toEqual(['Squid', 'Cephalopod']);
  });

  it('drops unusable articles and keeps pulling to fill the page', async () => {
    const disambiguation = makeArticle('Mercury', { isDisambiguation: true });
    const { api } = fakeWikiApi({ articles: [disambiguation], links: ['Mercury', ...titles('Link', 25)] });

    const page = (await createColumnFeed(api, context()).nextPage()).cards;

    expect(page).toHaveLength(20);
    expect(page.map((c) => c.title)).not.toContain('Mercury');
  });

  it('marks visited and read cards', async () => {
    const { api } = fakeWikiApi({ links: ['Squid', 'Ink'] });
    const feed = createColumnFeed(api, context({ visitedIds: new Set([idOf('Squid')]), readIds: new Set([idOf('Ink')]) }));

    const [squid, ink] = (await feed.nextPage()).cards;

    expect(squid).toMatchObject({ visited: true, read: false });
    expect(ink).toMatchObject({ visited: false, read: true });
  });

  it('starts cards in the seed’s territory, without a topic label, until topics resolve', async () => {
    const { api } = fakeWikiApi({ links: ['Squid'] });

    const [squid] = (await createColumnFeed(api, context({ seedTopic: { tileId: 'music', territory: 'culture' } })).nextPage()).cards;

    expect(squid.topic).toEqual({ tileId: null, territory: 'culture' });
    expect(squid.topicIsFallback).toBe(true);
  });

  it('returns an empty page at a dead end', async () => {
    const { api } = fakeWikiApi({ links: ['Squid'] });
    const feed = createColumnFeed(api, context());

    await feed.nextPage();

    await expect(feed.nextPage()).resolves.toEqual({ cards: [], done: true });
  });

  it('recovers after a failed hydrate without skipping cards', async () => {
    const { api, state } = fakeWikiApi({ links: titles('Link', 30) });
    const feed = createColumnFeed(api, context());
    state.failNextHydrate = true;

    await expect(feed.nextPage()).rejects.toThrow('network down');
    const page = (await feed.nextPage()).cards;

    expect(page[0].title).toBe('Link 1');
  });

  it('serialises concurrent page requests so they return different cards', async () => {
    const { api } = fakeWikiApi({ links: titles('Link', 60) });
    const feed = createColumnFeed(api, context());

    const [first, second] = (await Promise.all([feed.nextPage(), feed.nextPage()])).map((page) => page.cards);

    expect(second[0].pageId).not.toBe(first[0].pageId);
  });

  it('recovers when the section list fails once', async () => {
    const { api, state } = fakeWikiApi({ links: ['Squid'], sections: [{ index: 1, title: 'Body', level: 2 }], sectionLinks: { 1: ['Ink'] } });
    const feed = createColumnFeed(api, context());
    state.failures.sections = 1;

    await expect(feed.nextPage()).rejects.toThrow('sections failed');
    const page = await feed.nextPage();

    expect(page.cards.map((c) => c.title)).toEqual(['Squid', 'Ink']);
  });

  it('ignores section indices that are not plain numbers', async () => {
    const { api, calls } = fakeWikiApi({
      sections: [{ index: Number.NaN, title: 'Transcluded', level: 2 }, { index: 2, title: 'Body', level: 2 }],
      sectionLinks: { 0: ['Lead'], 2: ['Body link'] },
    });

    await createColumnFeed(api, context()).nextPage();

    expect(calls.sectionLinks).toEqual([0, 2]);
  });

  it('keeps reading past several sections that have no links', async () => {
    const empty = [1, 2, 3, 4].map((index) => ({ index, title: `Table ${index}`, level: 2 }));
    const { api } = fakeWikiApi({ sections: [...empty, { index: 5, title: 'Prose', level: 2 }], sectionLinks: { 0: [], 5: ['Squid'] } });

    const page = await createColumnFeed(api, context()).nextPage();

    expect(page.cards.map((c) => c.title)).toEqual(['Squid']);
  });

  it('keeps showing links when backlinks fail', async () => {
    const { api, state } = fakeWikiApi({ links: titles('Link', 30), backlinks: titles('Back', 10) });
    state.failures.backlinks = Infinity;

    const page = await createColumnFeed(api, context()).nextPage();

    expect(page.cards.map((c) => c.title).slice(0, 6)).toEqual(['Link 1', 'Link 2', 'Link 3', 'Link 4', 'Link 5', 'Link 6']);
  });

  it('returns the cards it has when a later hydrate fails, and resumes from the failed batch', async () => {
    const unusable = titles('Disambig', 5).map((t) => makeArticle(t, { isDisambiguation: true }));
    const { api, state } = fakeWikiApi({ articles: unusable, links: [...titles('Disambig', 5), ...titles('Link', 60)] });
    const feed = createColumnFeed(api, context());
    state.failHydrateCall = 2;

    const first = await feed.nextPage();
    const second = await feed.nextPage();

    expect(first.cards.map((c) => c.title)).toEqual(titles('Link', 15));
    expect(second.cards[0].title).toBe('Link 16');
  });

  it('does not report a dead end when a page filters everything out but more is coming', async () => {
    const years = Array.from({ length: 120 }, (_, i) => String(1900 + i));
    const { api } = fakeWikiApi({ links: years, moreLike: ['Squid'] });
    const feed = createColumnFeed(api, context());

    const first = await feed.nextPage();
    const later = await feed.nextPage();

    expect(first).toEqual({ cards: [], done: false });
    expect(later.cards.map((c) => c.title)).toEqual(['Squid']);
  });

  it('hydrates in full batches and carries extra cards to the next page', async () => {
    const unusable = titles('Disambig', 2).map((t) => makeArticle(t, { isDisambiguation: true }));
    const { api, calls } = fakeWikiApi({ articles: unusable, links: [...titles('Disambig', 2), ...titles('Link', 60)] });
    const feed = createColumnFeed(api, context());

    await feed.nextPage();
    const second = await feed.nextPage();

    expect(calls.hydrate.map((batch) => batch.length)).toEqual([20, 20, 20]);
    expect(second.cards[0].title).toBe('Link 21');
  });

  it('builds cards from real API responses end to end', async () => {
    // Arrange — the lead links to every page in the recorded hydrate batch (incl. a redirect,
    // a lowercase title, a hatnote disambiguation link, a missing page, a list and a year).
    const lead =
      '<div role="note" class="hatnote"><a href="/wiki/Octopus_(disambiguation)" class="mw-disambig">x</a></div><p>' +
      ['Squid', 'Cephalopods', 'cuttlefish', 'No_such_page_xyzzy', 'List_of_cephalopods', '1998', 'Ink', 'Knot_theory', 'Leonardo_da_Vinci']
        .map((t) => `<a href="/wiki/${t}">${t}</a>`)
        .join(' ') +
      '</p>';
    const http: WikiHttp = {
      query: async (params) => {
        if (params.action === 'parse') return params.prop === 'sections' ? { parse: { sections: [] } } : { parse: { text: lead } };
        return params.titles ? hydrateTitles : { batchcomplete: true };
      },
      rest: async () => ({}),
      restText: async () => '',
    };

    // Act
    const page = (await createColumnFeed(createWikiApi(http), context()).nextPage()).cards;

    // Assert — reading order kept; disambiguation, missing, list and year pages gone; redirect resolved
    expect(page.map((c) => c.title)).toEqual(['Squid', 'Cephalopod', 'Cuttlefish', 'Ink', 'Knot theory', 'Leonardo da Vinci']);
  });
});
