import type { Article, ArticleLink, ArticleSection, PageRef, PageSignals, Paged, SearchSort, WikiApi } from '../../wiki-api/types';

export const STEM_BIOLOGY = 'classification.prediction.articletopic/STEM.Biology|950';
export const CULTURE_MUSIC = 'classification.prediction.articletopic/Culture.Media.Music|950';

export function idOf(title: string): number {
  return [...title].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 1_000_000_007, 17);
}

/** An article with sensible defaults; ids are derived from the title so tests read naturally. */
export function makeArticle(title: string, overrides: Partial<Article> = {}): Article {
  return {
    pageId: idOf(title),
    title,
    description: `About ${title}`,
    extract: `${title} is a thing.`,
    thumbnail: null,
    isDisambiguation: false,
    ...overrides,
  };
}

const ref = (title: string): PageRef => ({ pageId: idOf(title), title });

function pageOf(titles: readonly string[], cursor: string | null, size: number): Paged<PageRef> {
  const start = Number(cursor ?? 0);
  const next = start + size < titles.length ? String(start + size) : null;
  return { items: titles.slice(start, start + size).map(ref), next };
}

export interface FakeWikiData {
  /** Overrides for specific titles; anything else hydrates to a default article. */
  articles?: readonly Article[];
  /** Shorthand for the lead section's links. */
  links?: readonly string[];
  sections?: readonly ArticleSection[];
  sectionLinks?: Readonly<Record<number, readonly string[]>>;
  /** Title → how often the seed links it (default 1). */
  mentions?: Readonly<Record<string, number>>;
  /** Requested title → redirect target title. */
  redirects?: Readonly<Record<string, string>>;
  moreLike?: readonly string[];
  /** Search query → result titles. */
  searches?: Readonly<Record<string, readonly string[]>>;
  featured?: readonly string[];
  /** Title → raw weighted tags. */
  tags?: Readonly<Record<string, readonly string[]>>;
  /** Title → incoming-link count (default: unknown). */
  incomingLinks?: Readonly<Record<string, number>>;
  /** Titles whose article links back to whatever target is asked about. */
  linksBack?: readonly string[];
  pageSize?: number;
}

type FailingCall = 'sections' | 'featured' | 'search' | 'pageSignals' | 'linkingTo';

/**
 * In-memory WikiApi with fault injection:
 * - `state.failNextHydrate` rejects the next hydrate once; `state.failHydrateCall = n` rejects the n-th hydrate call.
 * - `state.failures[call] = n` rejects the next n calls of that method; `Infinity` keeps failing.
 */
export function fakeWikiApi(data: FakeWikiData) {
  const size = data.pageSize ?? 10;
  const overrides = new Map((data.articles ?? []).map((a) => [a.title, a]));
  const tagsById = new Map(Object.entries(data.tags ?? {}).map(([title, tags]) => [idOf(title), tags]));
  const calls = {
    hydrate: [] as string[][],
    searches: [] as { query: string; sort: SearchSort }[],
    sections: 0,
    sectionLinks: [] as number[],
    topicTags: [] as number[][],
    pageSignals: [] as string[][],
    linkingTo: [] as { titles: string[]; target: string }[],
  };
  const state = { failNextHydrate: false, failHydrateCall: 0, failures: {} as Partial<Record<FailingCall, number>> };
  const maybeFail = (call: FailingCall) => {
    const remaining = state.failures[call] ?? 0;
    if (remaining <= 0) return;
    state.failures[call] = remaining - 1;
    throw new Error(`${call} failed`);
  };

  const api: WikiApi = {
    async sections() {
      calls.sections += 1;
      maybeFail('sections');
      return [...(data.sections ?? [])];
    },
    async sectionLinks(_title, index) {
      calls.sectionLinks.push(index);
      const links = index === 0 ? (data.sectionLinks?.[0] ?? data.links ?? []) : (data.sectionLinks?.[index] ?? []);
      return links.map((title): ArticleLink => ({ title, mentions: data.mentions?.[title] ?? 1 }));
    },
    moreLike: async (_title, cursor) => pageOf(data.moreLike ?? [], cursor, size),
    async search(query, cursor, sort = 'relevance') {
      calls.searches.push({ query, sort });
      maybeFail('search');
      return pageOf(data.searches?.[query] ?? [], cursor, size);
    },
    async featured() {
      maybeFail('featured');
      return (data.featured ?? []).map(ref);
    },
    async hydrate(titles) {
      calls.hydrate.push([...titles]);
      if (state.failNextHydrate || state.failHydrateCall === calls.hydrate.length) {
        state.failNextHydrate = false;
        throw new Error('network down');
      }
      return new Map(
        titles.map((requested) => {
          const resolved = data.redirects?.[requested] ?? requested;
          return [requested, overrides.get(resolved) ?? makeArticle(resolved)] as const;
        }),
      );
    },
    articleHtml: async (title) => `<html><head></head><body><p>${title} article</p></body></html>`,
    summary: async (title) => overrides.get(title) ?? makeArticle(title),
    async pageSignals(titles) {
      calls.pageSignals.push([...titles]);
      maybeFail('pageSignals');
      return new Map(
        titles.map((requested) => {
          const resolved = data.redirects?.[requested] ?? requested;
          const signals: PageSignals = { incomingLinks: data.incomingLinks?.[resolved] ?? null, weightedTags: data.tags?.[resolved] ?? [] };
          return [requested, signals] as const;
        }),
      );
    },
    async linkingTo(titles, target) {
      calls.linkingTo.push({ titles: [...titles], target });
      maybeFail('linkingTo');
      return new Set(titles.filter((title) => data.linksBack?.includes(title)));
    },
    async topicTags(pageIds) {
      calls.topicTags.push([...pageIds]);
      return new Map(pageIds.flatMap((id) => (tagsById.has(id) ? [[id, tagsById.get(id) ?? []] as const] : [])));
    },
  };
  return { api, calls, state };
}
