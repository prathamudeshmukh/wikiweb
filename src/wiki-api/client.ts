import type { z } from 'zod';
import { FEED, WIKI } from '../config/constants';
import { type WikiHttp, WikiApiError } from './http';
import { extractArticleLinks } from './linkExtraction';
import {
  featuredFeedSchema,
  type QueryPage,
  type QueryResponse,
  queryResponseSchema,
  sectionsResponseSchema,
  sectionTextResponseSchema,
} from './schemas';
import type { Article, PageRef, Paged, WikiApi } from './types';

type Params = Readonly<Record<string, string>>;
type PageWithId = QueryPage & { pageid: number };

// SPEC.md §6 — card fields only; topics come from a separate background call (cirrusdoc is slow).
const CARD_PROPS: Params = {
  prop: 'pageimages|description|extracts|pageprops',
  piprop: 'thumbnail',
  pithumbsize: String(WIKI.thumbnailWidth),
  exintro: '1',
  explaintext: '1',
  exsentences: String(WIKI.extractSentences),
  exlimit: String(FEED.hydrateBatch),
  ppprop: 'disambiguation',
};

const SECTION_TEXT_PROPS: Params = { action: 'parse', prop: 'text', disableeditsection: '1', disablelimitreport: '1' };

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new WikiApiError('Unexpected response from Wikipedia.', { retryable: false });
  return result.data;
}

const ARTICLE_NAMESPACE = 0;

function pagesOf(response: QueryResponse): PageWithId[] {
  return (response.query?.pages ?? []).filter((page): page is PageWithId => page.pageid !== undefined && !page.missing);
}

// Prose can link to talk or project pages; only articles become cards.
const articlePagesOf = (response: QueryResponse) => pagesOf(response).filter((page) => (page.ns ?? ARTICLE_NAMESPACE) === ARTICLE_NAMESPACE);

const toRef = (page: PageWithId): PageRef => ({ pageId: page.pageid, title: page.title });

function toArticle(page: PageWithId): Article {
  return {
    ...toRef(page),
    description: page.description ?? null,
    extract: page.extract ?? null,
    thumbnail: page.thumbnail ? { url: page.thumbnail.source, width: page.thumbnail.width, height: page.thumbnail.height } : null,
    isDisambiguation: page.pageprops?.disambiguation !== undefined,
  };
}

/** Follows the API's normalisation and redirect mappings from a requested title to the page title it resolved to. */
function titleResolver(response: QueryResponse): (requested: string) => string {
  const normalized = new Map((response.query?.normalized ?? []).map((m) => [m.from, m.to]));
  const redirects = new Map((response.query?.redirects ?? []).map((m) => [m.from, m.to]));
  return (requested) => {
    const canonical = normalized.get(requested) ?? requested;
    return redirects.get(canonical) ?? canonical;
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

function assertBatchSize(count: number) {
  if (count > FEED.hydrateBatch) throw new RangeError(`Requests accept at most ${FEED.hydrateBatch} pages.`);
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
    paged({ generator: 'search', gsrsearch: search, gsrnamespace: '0', gsrlimit: String(FEED.listPageSize), gsroffset: cursor ?? '0' }, 'gsroffset');

  return {
    async sections(title) {
      const response = parse(sectionsResponseSchema, await http.query({ action: 'parse', page: title, prop: 'sections' }));
      // Sections transcluded from templates have indices like "T-1" and can't be fetched by number.
      return response.parse.sections
        .filter((s) => /^\d+$/.test(s.index))
        .map((s) => ({ index: Number(s.index), title: s.line, level: Number(s.level) }));
    },

    async sectionLinks(title, sectionIndex) {
      const response = parse(sectionTextResponseSchema, await http.query({ ...SECTION_TEXT_PROPS, page: title, section: String(sectionIndex) }));
      return extractArticleLinks(response.parse.text);
    },

    backlinks(title, cursor) {
      const params: Params = { generator: 'backlinks', gbltitle: title, gblnamespace: '0', gblfilterredir: 'nonredirects', gbllimit: String(FEED.listPageSize) };
      return paged(cursor ? { ...params, gblcontinue: cursor } : params, 'gblcontinue');
    },

    moreLike: (title, cursor) => searchPage(`morelike:${title}`, cursor),

    topicSearch: (search, cursor) => searchPage(search, cursor),

    async featured(date) {
      const feed = parse(featuredFeedSchema, await http.rest(`/feed/featured/${utcDatePath(date)}`));
      const pages = [feed.tfa, ...(feed.mostread?.articles ?? []), ...(feed.onthisday ?? []).flatMap((event) => event.pages)];
      const refs = pages.flatMap((page) => (page?.pageid ? [{ pageId: page.pageid, title: page.titles.normalized }] : []));
      return uniqueByPageId(refs);
    },

    async hydrate(titles) {
      assertBatchSize(titles.length);
      if (titles.length === 0) return new Map();
      const response = await query({ titles: titles.join('|'), redirects: '1', ...CARD_PROPS });
      const resolve = titleResolver(response);
      const byTitle = new Map(articlePagesOf(response).map((page) => [page.title, page]));
      return new Map(
        titles.flatMap((requested) => {
          const page = byTitle.get(resolve(requested));
          return page ? [[requested, toArticle(page)] as const] : [];
        }),
      );
    },

    async topicTags(pageIds) {
      assertBatchSize(pageIds.length);
      if (pageIds.length === 0) return new Map();
      const response = await query({ pageids: pageIds.join('|'), prop: 'cirrusdoc', cdincludes: 'weighted_tags' });
      return new Map(pagesOf(response).map((page) => [page.pageid, page.cirrusdoc?.[0]?.source.weighted_tags ?? []]));
    },
  };
}
