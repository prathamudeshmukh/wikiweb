import backlinksOctopus from './__fixtures__/backlinks-octopus.json';
import featuredFeed from './__fixtures__/featured-feed-2026-10-01.json';
import hydrateTitles from './__fixtures__/hydrate-titles.json';
import morelikeOctopus from './__fixtures__/morelike-octopus.json';
import leadSection from './__fixtures__/section-octopus-0.json';
import sectionsOctopus from './__fixtures__/sections-octopus.json';
import topicsMixed from './__fixtures__/topics-mixed.json';
import topicSpace from './__fixtures__/topic-space-featured.json';
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
  };
  return { http, queries, restPaths };
}

const withoutContinue = <T extends object>(fixture: T) => ({ ...fixture, continue: undefined });

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
    it('returns the links of one section in reading order', async () => {
      const { http, queries } = fakeHttp(() => leadSection);

      const links = await createWikiApi(http).sectionLinks('Octopus', 0);

      expect(links.slice(0, 3)).toEqual(['Mollusc', 'Order (biology)', 'Species']);
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

  describe('paged lists', () => {
    it('returns backlinks with a cursor taken from gblcontinue', async () => {
      const { http } = fakeHttp(() => backlinksOctopus);

      const page = await createWikiApi(http).backlinks('Octopus', null);

      expect(page.items).toHaveLength(10);
      expect(page.next).toBe(backlinksOctopus.continue.gblcontinue);
    });

    it('passes the cursor back on the next backlinks call', async () => {
      const { http, queries } = fakeHttp(() => withoutContinue(backlinksOctopus));

      const page = await createWikiApi(http).backlinks('Octopus', '0|6446');

      expect(queries[0].gblcontinue).toBe('0|6446');
      expect(page.next).toBeNull();
    });

    it('orders morelike results by search rank, not page id', async () => {
      const { http, queries } = fakeHttp(() => morelikeOctopus);

      const page = await createWikiApi(http).moreLike('Octopus', null);

      const expected = [...morelikeOctopus.query.pages].sort((a, b) => a.index - b.index).map((p) => p.title);
      expect(page.items.map((r) => r.title)).toEqual(expected);
      expect(queries[0].gsrsearch).toBe('morelike:Octopus');
    });

    it('runs topic searches verbatim and pages by offset', async () => {
      const { http, queries } = fakeHttp(() => topicSpace);

      const page = await createWikiApi(http).topicSearch('articletopic:space incategory:Featured_articles', '10');

      expect(queries[0]).toMatchObject({ gsrsearch: 'articletopic:space incategory:Featured_articles', gsroffset: '10' });
      expect(page.next).toBe(String(topicSpace.continue.gsroffset));
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
