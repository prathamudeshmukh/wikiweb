import featuredFeed from './__fixtures__/featured-feed-2026-10-01.json';
import hydrateTitles from './__fixtures__/hydrate-titles.json';
import morelikeOctopus from './__fixtures__/morelike-octopus.json';
import leadSection from './__fixtures__/section-octopus-0.json';
import linksToOctopus from './__fixtures__/links-to-octopus.json';
import sectionsOctopus from './__fixtures__/sections-octopus.json';
import signalsMixed from './__fixtures__/signals-mixed.json';
import topicsMixed from './__fixtures__/topics-mixed.json';
import topicSpace from './__fixtures__/topic-space-featured.json';
import summaryDisambiguation from './__fixtures__/summary-Mercury.json';
import summaryLeonardo from './__fixtures__/summary-Leonardo_da_Vinci.json';
import { createWikiApi } from './client';
import type { WikiHttp } from './http';

type Params = Record<string, string>;

/** Fake transport: answers each action-API call from a recorded fixture chosen by its params. */
function fakeHttp(route: (params: Params) => unknown, restBody: unknown = featuredFeed) {
  const queries: Params[] = [];
  const restPaths: string[] = [];
  const http: WikiHttp = {
    query: async (params) => {
      queries.push(params);
      return route(params);
    },
    rest: async (path) => {
      restPaths.push(path);
      return restBody;
    },
    restText: async (path) => {
      restPaths.push(path);
      return String(restBody);
    },
  };
  return { http, queries, restPaths };
}

const REQUESTED = ['Squid', 'Cephalopods', 'cuttlefish', 'Octopus (disambiguation)', 'No such page xyzzy', 'Ink'];

describe('createWikiApi', () => {
  describe('sections', () => {
    it('lists sections with numeric index and level', async () => {
      const { http, queries } = fakeHttp(() => sectionsOctopus);

      const sections = await createWikiApi(http).sections('Octopus');

      expect(sections[0]).toEqual({ index: 1, title: 'Etymology and pluralisation', level: 2 });
      expect(queries[0]).toMatchObject({ action: 'parse', page: 'Octopus', prop: 'sections' });
    });
  });

  it('drops sections with non-numeric indices (transcluded from templates)', async () => {
    const { http } = fakeHttp(() => ({ parse: { sections: [{ index: 'T-1', line: 'From a template', level: '2' }, { index: '3', line: 'Body', level: '2' }] } }));

    const sections = await createWikiApi(http).sections('Octopus');

    expect(sections).toEqual([{ index: 3, title: 'Body', level: 2 }]);
  });

  describe('sectionLinks', () => {
    it('returns the links of one section in reading order, with how often each is linked', async () => {
      const { http, queries } = fakeHttp(() => leadSection);

      const links = await createWikiApi(http).sectionLinks('Octopus', 0);

      expect(links.slice(0, 3)).toEqual([{ title: 'Mollusc', mentions: 1 }, { title: 'Order (biology)', mentions: 1 }, { title: 'Species', mentions: 1 }]);
      expect(queries[0]).toMatchObject({ action: 'parse', page: 'Octopus', section: '0', prop: 'text' });
    });
  });

  describe('hydrate', () => {
    it('keys articles by the requested title, resolving redirects and normalisation', async () => {
      const { http } = fakeHttp(() => hydrateTitles);

      const articles = await createWikiApi(http).hydrate(REQUESTED);

      expect(articles.get('Cephalopods')?.title).toBe('Cephalopod');
      expect(articles.get('cuttlefish')?.title).toBe('Cuttlefish');
      expect(articles.has('No such page xyzzy')).toBe(false);
    });

    it('normalises thumbnail, text and disambiguation flags', async () => {
      const { http } = fakeHttp(() => hydrateTitles);

      const articles = await createWikiApi(http).hydrate(REQUESTED);

      expect(articles.get('Squid')).toMatchObject({ pageId: 38011, extract: expect.stringContaining('squid'), isDisambiguation: false });
      expect(articles.get('Squid')?.thumbnail).toEqual({ url: expect.stringMatching(/^https:\/\//), width: expect.any(Number), height: expect.any(Number) });
      expect(articles.get('Octopus (disambiguation)')?.isDisambiguation).toBe(true);
    });

    it('requests card fields by title with redirects resolved and no cirrusdoc', async () => {
      const { http, queries } = fakeHttp(() => hydrateTitles);

      await createWikiApi(http).hydrate(REQUESTED);

      expect(queries[0]).toMatchObject({ titles: REQUESTED.join('|'), redirects: '1', pithumbsize: '500', exlimit: '20' });
      expect(queries[0].prop).not.toContain('cirrusdoc');
    });

    it('caps extracts by characters so a card has enough text to fill its height', async () => {
      const { http, queries } = fakeHttp(() => hydrateTitles);

      await createWikiApi(http).hydrate(REQUESTED);

      expect(queries[0]).toMatchObject({ exintro: '1', exchars: '600' });
      expect(queries[0]).not.toHaveProperty('exsentences');
    });

    it('ignores pages outside the article namespace', async () => {
      const talk = { pageid: 99, ns: 5, title: 'Wikipedia talk:Foo', extract: 'Talk' };
      const { http } = fakeHttp(() => ({ batchcomplete: true, query: { pages: [talk] } }));

      const articles = await createWikiApi(http).hydrate(['Wikipedia talk:Foo']);

      expect(articles.size).toBe(0);
    });

    it('skips the request entirely for an empty list', async () => {
      const { http, queries } = fakeHttp(() => hydrateTitles);

      expect((await createWikiApi(http).hydrate([])).size).toBe(0);
      expect(queries).toHaveLength(0);
    });

    it('rejects batches larger than the API can extract in one call', async () => {
      const { http } = fakeHttp(() => hydrateTitles);
      const tooMany = Array.from({ length: 21 }, (_, i) => `Page ${i}`);

      await expect(createWikiApi(http).hydrate(tooMany)).rejects.toThrow(/at most 20 pages/);
    });
  });

  describe('topicTags', () => {
    it('returns weighted tags per page id from trimmed cirrusdoc', async () => {
      const { http, queries } = fakeHttp(() => topicsMixed);

      const tags = await createWikiApi(http).topicTags([38011, 15292]);

      expect(tags.get(38011)).toEqual(expect.arrayContaining(['classification.prediction.articletopic/STEM.Biology|939']));
      expect(queries[0]).toMatchObject({ pageids: '38011|15292', prop: 'cirrusdoc', cdincludes: 'weighted_tags' });
    });

    it('skips the request entirely for an empty list', async () => {
      const { http, queries } = fakeHttp(() => topicsMixed);

      expect((await createWikiApi(http).topicTags([])).size).toBe(0);
      expect(queries).toHaveLength(0);
    });
  });

  describe('pageSignals', () => {
    it('keys incoming links and weighted tags by the requested title, resolving redirects', async () => {
      const { http } = fakeHttp(() => signalsMixed);

      const signals = await createWikiApi(http).pageSignals(['Squid', 'Cephalopods', 'cuttlefish', 'United Kingdom', 'No such page xyzzy']);

      expect(signals.get('United Kingdom')?.incomingLinks).toBe(365214);
      expect(signals.get('Cephalopods')?.weightedTags.length).toBeGreaterThan(0);
      expect(signals.has('No such page xyzzy')).toBe(false);
    });

    it('asks cirrusdoc for only the two fields it needs', async () => {
      const { http, queries } = fakeHttp(() => signalsMixed);

      await createWikiApi(http).pageSignals(['Squid']);

      expect(queries[0]).toMatchObject({ titles: 'Squid', redirects: '1', prop: 'cirrusdoc', cdincludes: 'incoming_links|weighted_tags' });
    });

    it('reports an unknown incoming-link count as null', async () => {
      const { http } = fakeHttp(() => ({ query: { pages: [{ pageid: 1, ns: 0, title: 'Bare', cirrusdoc: [{ source: {} }] }] } }));

      const signals = await createWikiApi(http).pageSignals(['Bare']);

      expect(signals.get('Bare')).toEqual({ incomingLinks: null, weightedTags: [] });
    });

    it('skips the request entirely for an empty list', async () => {
      const { http, queries } = fakeHttp(() => signalsMixed);

      expect((await createWikiApi(http).pageSignals([])).size).toBe(0);
      expect(queries).toHaveLength(0);
    });
  });

  describe('linkingTo', () => {
    it('returns the requested titles whose article links to the target', async () => {
      const { http, queries } = fakeHttp(() => linksToOctopus);

      const linking = await createWikiApi(http).linkingTo(['Squid', 'Cephalopods', 'Mollusca', 'United Kingdom', 'No such page xyzzy'], 'Octopus');

      expect([...linking].sort()).toEqual(['Cephalopods', 'Mollusca', 'Squid']);
      expect(queries[0]).toMatchObject({ prop: 'links', pltitles: 'Octopus', redirects: '1' });
    });

    it('skips the request entirely for an empty list', async () => {
      const { http, queries } = fakeHttp(() => linksToOctopus);

      expect((await createWikiApi(http).linkingTo([], 'Octopus')).size).toBe(0);
      expect(queries).toHaveLength(0);
    });

    it('rejects batches larger than one request can check', async () => {
      const { http } = fakeHttp(() => linksToOctopus);

      await expect(createWikiApi(http).linkingTo(Array.from({ length: 21 }, (_, i) => `Page ${i}`), 'Octopus')).rejects.toThrow(/at most 20 pages/);
    });
  });

  describe('paged lists', () => {
    it('orders morelike results by search rank, not page id', async () => {
      const { http, queries } = fakeHttp(() => morelikeOctopus);

      const page = await createWikiApi(http).moreLike('Octopus', null);

      const expected = [...morelikeOctopus.query.pages].sort((a, b) => a.index - b.index).map((p) => p.title);
      expect(page.items.map((r) => r.title)).toEqual(expected);
      expect(queries[0].gsrsearch).toBe('morelike:Octopus');
    });

    it('runs searches verbatim, by relevance, and pages by offset', async () => {
      const { http, queries } = fakeHttp(() => topicSpace);

      const page = await createWikiApi(http).search('articletopic:space incategory:Featured_articles', '10');

      expect(queries[0]).toMatchObject({ gsrsearch: 'articletopic:space incategory:Featured_articles', gsroffset: '10', gsrsort: 'relevance' });
      expect(page.next).toBe(String(topicSpace.continue.gsroffset));
    });

    it('can ask for a random slice of the results', async () => {
      const { http, queries } = fakeHttp(() => topicSpace);

      await createWikiApi(http).search('articletopic:space', null, 'random');

      expect(queries[0].gsrsort).toBe('random');
    });
  });

  describe('featured', () => {
    it('collects the featured article, most-read and on-this-day pages without duplicates', async () => {
      const { http, restPaths } = fakeHttp(() => ({}));

      const refs = await createWikiApi(http).featured(new Date(Date.UTC(2026, 9, 1)));

      expect(restPaths).toEqual(['/feed/featured/2026/10/01']);
      expect(refs[0].title).toBe(featuredFeed.tfa.titles.normalized);
      expect(new Set(refs.map((r) => r.pageId)).size).toBe(refs.length);
    });
  });

  describe('articleHtml', () => {
    it('fetches the mobile article HTML for a title', async () => {
      const { http, restPaths } = fakeHttp(() => ({}), '<html>Ink</html>');

      const html = await createWikiApi(http).articleHtml('Iron gall ink');

      expect(html).toBe('<html>Ink</html>');
      expect(restPaths).toEqual(['/page/mobile-html/Iron_gall_ink']);
    });

    it('encodes titles that contain URL characters', async () => {
      const { http, restPaths } = fakeHttp(() => ({}), '');

      await createWikiApi(http).articleHtml('AC/DC & Friends?');

      expect(restPaths).toEqual(['/page/mobile-html/AC%2FDC_%26_Friends%3F']);
    });
  });

  describe('summary', () => {
    it('returns a card-ready summary for a link preview', async () => {
      const { http, restPaths } = fakeHttp(() => ({}), summaryLeonardo);

      const summary = await createWikiApi(http).summary('Leonardo da Vinci');

      expect(summary).toMatchObject({ pageId: 18079, title: 'Leonardo da Vinci', description: summaryLeonardo.description, isDisambiguation: false });
      expect(summary.thumbnail?.url).toMatch(/^https:\/\//);
      expect(restPaths).toEqual(['/page/summary/Leonardo_da_Vinci']);
    });

    it('flags disambiguation pages', async () => {
      const { http } = fakeHttp(() => ({}), summaryDisambiguation);

      await expect(createWikiApi(http).summary('Mercury')).resolves.toMatchObject({ isDisambiguation: true, thumbnail: null });
    });
  });

  describe('response validation', () => {
    it('throws a WikiApiError when the response does not match the expected shape', async () => {
      const { http } = fakeHttp(() => ({ query: { pages: 'not-an-array' } }));

      await expect(createWikiApi(http).hydrate(['Squid'])).rejects.toMatchObject({ name: 'WikiApiError' });
    });

    it('throws a WikiApiError when a parse response is malformed', async () => {
      const { http } = fakeHttp(() => ({ parse: { text: 42 } }));

      await expect(createWikiApi(http).sectionLinks('Octopus', 0)).rejects.toMatchObject({ name: 'WikiApiError' });
    });

    it('treats a response without results as an empty page', async () => {
      const { http } = fakeHttp(() => ({ batchcomplete: true }));

      await expect(createWikiApi(http).moreLike('Nothing', null)).resolves.toEqual({ items: [], next: null });
    });
  });
});
