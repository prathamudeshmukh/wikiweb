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
  summarySchema,
} from './schemas';
import type { Article, PageRef, PageSignals, Paged, SearchSort, WikiApi } from './types';

type Params = Readonly<Record<string, string>>;
type PageWithId = QueryPage & { pageid: number };

// SPEC.md §6 — card fields only; topics and ranking signals come from a parallel cirrusdoc call (SIGNAL_PROPS).
const CARD_PROPS: Params = {
  prop: 'pageimages|description|extracts|pageprops',
  piprop: 'thumbnail',
  pithumbsize: String(WIKI.thumbnailWidth),
  exintro: '1',
  explaintext: '1',
  exchars: String(WIKI.extractChars),
  exlimit: String(FEED.hydrateBatch),
  ppprop: 'disambiguation',
};

const SIGNAL_PROPS: Params = { prop: 'cirrusdoc', cdincludes: 'incoming_links|weighted_tags' };

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

const toSignals = (page: PageWithId): PageSignals => {
  const source = page.cirrusdoc?.[0]?.source;
  return { incomingLinks: source?.incoming_links ?? null, weightedTags: source?.weighted_tags ?? [] };
};

const toRef = (page: PageWithId): PageRef => ({ pageId: page.pageid, title: page.title });

function toArticle(page: PageWithId): Article {
  return {
    ...toRef(page),
    description: page.description ?? null,
    extract: page.extract ?? null,
    thumbnail: toThumbnail(page.thumbnail),
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

/** REST paths take titles with underscores, URL-encoded (`AC/DC` → `AC%2FDC`). */
const restTitle = (title: string) => encodeURIComponent(title.replace(/ /g, '_'));

const toThumbnail = (thumb: { source: string; width: number; height: number } | undefined) =>
  thumb ? { url: thumb.source, width: thumb.width, height: thumb.height } : null;

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

  const searchPage = (search: string, cursor: string | null, sort: SearchSort = 'relevance') =>
    paged(
      { generator: 'search', gsrsearch: search, gsrnamespace: '0', gsrlimit: String(FEED.listPageSize), gsroffset: cursor ?? '0', gsrsort: sort },
      'gsroffset',
    );

  /** One query per batch of titles, its pages keyed back to the titles as requested (redirects resolved). */
  async function byRequestedTitle<T>(titles: readonly string[], params: Params, map: (page: PageWithId) => T): Promise<Map<string, T>> {
    assertBatchSize(titles.length);
    if (titles.length === 0) return new Map();
    const response = await query({ titles: titles.join('|'), redirects: '1', ...params });
    const resolve = titleResolver(response);
    const byTitle = new Map(articlePagesOf(response).map((page) => [page.title, page]));
    return new Map(
      titles.flatMap((requested) => {
        const page = byTitle.get(resolve(requested));
        return page ? [[requested, map(page)] as const] : [];
      }),
    );
  }

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

    moreLike: (title, cursor) => searchPage(`morelike:${title}`, cursor),

    search: searchPage,

    async featured(date) {
      const feed = parse(featuredFeedSchema, await http.rest(`/feed/featured/${utcDatePath(date)}`));
      const pages = [feed.tfa, ...(feed.mostread?.articles ?? []), ...(feed.onthisday ?? []).flatMap((event) => event.pages)];
      const refs = pages.flatMap((page) => (page?.pageid ? [{ pageId: page.pageid, title: page.titles.normalized }] : []));
      return uniqueByPageId(refs);
    },

    articleHtml: (title) => http.restText(`/page/mobile-html/${restTitle(title)}`),

    async summary(title) {
      const page = parse(summarySchema, await http.rest(`/page/summary/${restTitle(title)}`));
      return {
        pageId: page.pageid,
        title: page.titles.normalized,
        description: page.description ?? null,
        extract: page.extract ?? null,
        thumbnail: toThumbnail(page.thumbnail),
        isDisambiguation: page.type === 'disambiguation',
      };
    },

    hydrate: (titles) => byRequestedTitle(titles, CARD_PROPS, toArticle),

    pageSignals: (titles) => byRequestedTitle(titles, SIGNAL_PROPS, toSignals),

    async linkingTo(titles, target) {
      // With `pltitles`, each page lists only its links to the target, so a 20-title batch fits in one response.
      const links = await byRequestedTitle(titles, { prop: 'links', pltitles: target, pllimit: 'max' }, (page) => (page.links ?? []).length > 0);
      return new Set([...links].flatMap(([title, linksBack]) => (linksBack ? [title] : [])));
    },

    async topicTags(pageIds) {
      assertBatchSize(pageIds.length);
      if (pageIds.length === 0) return new Map();
      const response = await query({ pageids: pageIds.join('|'), prop: 'cirrusdoc', cdincludes: 'weighted_tags' });
      return new Map(pagesOf(response).map((page) => [page.pageid, page.cirrusdoc?.[0]?.source.weighted_tags ?? []]));
    },
  };
}
