import backlinksOctopus from './__fixtures__/backlinks-octopus.json';
import featuredFeed from './__fixtures__/featured-feed-2026-10-01.json';
import hydrateMixed from './__fixtures__/hydrate-mixed.json';
import morelikeOctopus from './__fixtures__/morelike-octopus.json';
import randomPages from './__fixtures__/random.json';
import rankPage1 from './__fixtures__/rank-octopus-page1.json';
import rankPage2 from './__fixtures__/rank-octopus-page2.json';
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

describe('createWikiApi', () => {
  describe('rankedLinks', () => {
    it('follows continuation and returns every link with popularity and disambiguation flags', async () => {
      const { http, queries } = fakeHttp((p) => (p.gplcontinue ? withoutContinue(rankPage2) : rankPage1));

      const links = await createWikiApi(http).rankedLinks('Octopus');

      expect(queries).toHaveLength(2);
      expect(links).toHaveLength(80);
      expect(queries[0]).toMatchObject({ generator: 'links', titles: 'Octopus', prop: 'cirrusdoc|pageprops', cdincludes: 'popularity_score' });
    });

    it('stops following continuation at the configured page limit', async () => {
      const { http, queries } = fakeHttp(() => rankPage1);

      await createWikiApi(http).rankedLinks('Octopus');

      expect(queries).toHaveLength(3);
    });

    it('defaults popularity to 0 when a page has no search document', async () => {
      const page = { pageid: 7, ns: 0, title: 'Obscure' };
      const { http } = fakeHttp(() => ({ batchcomplete: true, query: { pages: [page] } }));

      const [link] = await createWikiApi(http).rankedLinks('Octopus');

      expect(link).toEqual({ pageId: 7, title: 'Obscure', popularity: 0, isDisambiguation: false });
    });
  });

  describe('hydrate', () => {
    const ids = [38011, 19007, 15292, 153008];

    it('returns articles in the requested order, skipping pages it did not ask for', async () => {
      const { http } = fakeHttp(() => hydrateMixed);

      const articles = await createWikiApi(http).hydrate(ids);

      expect(articles.map((a) => a.title)).toEqual(['Squid', 'Mercury', 'Ink', 'Knot theory']);
    });

    it('normalises thumbnail, text, topic tags and disambiguation', async () => {
      const { http } = fakeHttp(() => hydrateMixed);

      const [squid, mercury] = await createWikiApi(http).hydrate(ids);

      expect(squid).toMatchObject({ pageId: 38011, description: expect.any(String), extract: expect.stringContaining('squid'), isDisambiguation: false });
      expect(squid.thumbnail).toEqual({ url: expect.stringMatching(/^https:\/\//), width: expect.any(Number), height: expect.any(Number) });
      expect(mercury.isDisambiguation).toBe(true);
    });

    it('requests card fields by page id with trimmed cirrusdoc', async () => {
      const { http, queries } = fakeHttp(() => hydrateMixed);

      await createWikiApi(http).hydrate(ids);

      expect(queries[0]).toMatchObject({ pageids: '38011|19007|15292|153008', cdincludes: 'weighted_tags', pithumbsize: '500', exlimit: '20' });
    });

    it('skips the request entirely for an empty list', async () => {
      const { http, queries } = fakeHttp(() => hydrateMixed);

      await expect(createWikiApi(http).hydrate([])).resolves.toEqual([]);
      expect(queries).toHaveLength(0);
    });

    it('rejects batches larger than the API can extract in one call', async () => {
      const { http } = fakeHttp(() => hydrateMixed);
      const tooMany = Array.from({ length: 21 }, (_, i) => i + 1);

      await expect(createWikiApi(http).hydrate(tooMany)).rejects.toThrow(/at most 20/);
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

    it('returns random pages as refs', async () => {
      const { http } = fakeHttp(() => randomPages);

      const refs = await createWikiApi(http).random();

      expect(refs).toHaveLength(10);
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

      await expect(createWikiApi(http).hydrate([1])).rejects.toMatchObject({ name: 'WikiApiError' });
    });

    it('treats a response without results as an empty page', async () => {
      const { http } = fakeHttp(() => ({ batchcomplete: true }));

      await expect(createWikiApi(http).moreLike('Nothing', null)).resolves.toEqual({ items: [], next: null });
    });
  });
});
