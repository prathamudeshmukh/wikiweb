import type { z } from 'zod';
import { FEED, WIKI } from '../config/constants';
import { type WikiHttp, WikiApiError } from './http';
import { featuredFeedSchema, type QueryPage, type QueryResponse, queryResponseSchema } from './schemas';
import type { Article, PageRef, Paged, RankedLink, WikiApi } from './types';

type Params = Readonly<Record<string, string>>;
type PageWithId = QueryPage & { pageid: number };

const RANK_PROPS: Params = { prop: 'cirrusdoc|pageprops', cdincludes: 'popularity_score', ppprop: 'disambiguation' };

// SPEC.md §6 — cdincludes keeps cirrusdoc at ~26 KB per 20 cards instead of ~2.1 MB.
const CARD_PROPS: Params = {
  prop: 'pageimages|description|extracts|pageprops|cirrusdoc',
  piprop: 'thumbnail',
  pithumbsize: String(WIKI.thumbnailWidth),
  exintro: '1',
  explaintext: '1',
  exsentences: String(WIKI.extractSentences),
  exlimit: String(FEED.hydrateBatch),
  ppprop: 'disambiguation',
  cdincludes: 'weighted_tags',
};

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new WikiApiError('Unexpected response from Wikipedia.');
  return result.data;
}

function pagesOf(response: QueryResponse): PageWithId[] {
  return (response.query?.pages ?? []).filter((page): page is PageWithId => page.pageid !== undefined && !page.missing);
}

const toRef = (page: PageWithId): PageRef => ({ pageId: page.pageid, title: page.title });
const isDisambiguation = (page: QueryPage) => page.pageprops?.disambiguation !== undefined;

function toArticle(page: PageWithId): Article {
  return {
    ...toRef(page),
    description: page.description ?? null,
    extract: page.extract ?? null,
    thumbnail: page.thumbnail ? { url: page.thumbnail.source, width: page.thumbnail.width, height: page.thumbnail.height } : null,
    weightedTags: page.cirrusdoc?.[0]?.source.weighted_tags ?? [],
    isDisambiguation: isDisambiguation(page),
  };
}

function continueParams(response: QueryResponse): Params | null {
  if (!response.continue) return null;
  return Object.fromEntries(Object.entries(response.continue).map(([key, value]) => [key, String(value)]));
}

function utcDatePath(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}`;
}

function uniqueByPageId(refs: readonly PageRef[]): PageRef[] {
  const seen = new Set<number>();
  return refs.filter((ref) => !seen.has(ref.pageId) && seen.add(ref.pageId));
}

export function createWikiApi(http: WikiHttp): WikiApi {
  const query = async (params: Params) => parse(queryResponseSchema, await http.query(params));

  async function paged(params: Params, cursorKey: string): Promise<Paged<PageRef>> {
    const response = await query(params);
    const items = pagesOf(response)
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map(toRef);
    return { items, next: continueParams(response)?.[cursorKey] ?? null };
  }

  const searchPage = (search: string, cursor: string | null) =>
    paged({ generator: 'search', gsrsearch: search, gsrnamespace: '0', gsrlimit: String(FEED.searchPageSize), gsroffset: cursor ?? '0' }, 'gsroffset');

  return {
    async rankedLinks(title) {
      const base: Params = { generator: 'links', titles: title, gplnamespace: '0', gpllimit: 'max', ...RANK_PROPS };
      const links: RankedLink[] = [];
      let params: Params | null = base;
      for (let page = 0; params && page < FEED.maxLinkRankPages; page += 1) {
        const response = await query(params);
        pagesOf(response).forEach((p) =>
          links.push({ ...toRef(p), popularity: p.cirrusdoc?.[0]?.source.popularity_score ?? 0, isDisambiguation: isDisambiguation(p) }),
        );
        const next = continueParams(response);
        params = next ? { ...base, ...next } : null;
      }
      return links;
    },

    backlinks(title, cursor) {
      const params: Params = { generator: 'backlinks', gbltitle: title, gblnamespace: '0', gblfilterredir: 'nonredirects', gbllimit: String(FEED.searchPageSize) };
      return paged(cursor ? { ...params, gblcontinue: cursor } : params, 'gblcontinue');
    },

    moreLike: (title, cursor) => searchPage(`morelike:${title}`, cursor),

    topicSearch: (search, cursor) => searchPage(search, cursor),

    async random() {
      const response = await query({ generator: 'random', grnnamespace: '0', grnlimit: String(FEED.searchPageSize) });
      return pagesOf(response).map(toRef);
    },

    async featured(date) {
      const feed = parse(featuredFeedSchema, await http.rest(`/feed/featured/${utcDatePath(date)}`));
      const pages = [feed.tfa, ...(feed.mostread?.articles ?? []), ...(feed.onthisday ?? []).flatMap((event) => event.pages)];
      const refs = pages.flatMap((page) => (page?.pageid ? [{ pageId: page.pageid, title: page.titles.normalized }] : []));
      return uniqueByPageId(refs);
    },

    async hydrate(pageIds) {
      if (pageIds.length > FEED.hydrateBatch) throw new RangeError(`hydrate accepts at most ${FEED.hydrateBatch} page ids.`);
      if (pageIds.length === 0) return [];
      const response = await query({ pageids: pageIds.join('|'), ...CARD_PROPS });
      const byId = new Map(pagesOf(response).map((page) => [page.pageid, page]));
      return pageIds.flatMap((id) => {
        const page = byId.get(id);
        return page ? [toArticle(page)] : [];
      });
    },
  };
}
