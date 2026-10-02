export interface TitleRef {
  title: string;
}

export interface PageRef extends TitleRef {
  pageId: number;
}

export interface ArticleSection {
  /** MediaWiki section index; the lead is 0 and is not listed by the API. */
  index: number;
  title: string;
  level: number;
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export interface Article extends PageRef {
  description: string | null;
  extract: string | null;
  thumbnail: Thumbnail | null;
  isDisambiguation: boolean;
}

export interface ArticleLink extends TitleRef {
  /** How often the prose links it — a central topic gets linked again and again. */
  mentions: number;
}

/** Ranking inputs from CirrusSearch's index document. */
export interface PageSignals {
  /** How many articles link here — huge for hubs like "United Kingdom". Null when the index doesn't say. */
  incomingLinks: number | null;
  /** Raw `articletopic` weighted tags. */
  weightedTags: readonly string[];
}

export type SearchSort = 'relevance' | 'random';

/** A page of results plus an opaque cursor for the next page (null when exhausted). */
export interface Paged<T> {
  items: readonly T[];
  next: string | null;
}

export interface WikiApi {
  sections(title: string): Promise<ArticleSection[]>;
  /** Articles linked from one section, in reading order. */
  sectionLinks(title: string, sectionIndex: number): Promise<ArticleLink[]>;
  moreLike(title: string, cursor: string | null): Promise<Paged<PageRef>>;
  /** CirrusSearch, verbatim (`articletopic:`, `linksto:`, `incategory:` …). */
  search(query: string, cursor: string | null, sort?: SearchSort): Promise<Paged<PageRef>>;
  featured(date: Date): Promise<PageRef[]>;
  /** At most FEED.hydrateBatch titles. Keyed by the title as requested (redirects and normalisation resolved); missing pages are absent. */
  hydrate(titles: readonly string[]): Promise<ReadonlyMap<string, Article>>;
  /** Wikipedia's mobile-ready article HTML (REST `page/mobile-html`). */
  articleHtml(title: string): Promise<string>;
  /** A single article's preview, for link peek cards (REST `page/summary`). */
  summary(title: string): Promise<Article>;
  /** Raw CirrusSearch weighted_tags per page id. Slow (~1.5 s / 20). */
  topicTags(pageIds: readonly number[]): Promise<ReadonlyMap<number, readonly string[]>>;
  /** At most FEED.hydrateBatch titles, keyed like `hydrate`. Slow (~1.5 s / 20) and internal — callers must survive its failure. */
  pageSignals(titles: readonly string[]): Promise<ReadonlyMap<string, PageSignals>>;
  /** Which of (at most FEED.hydrateBatch) requested titles link to `target`. */
  linkingTo(titles: readonly string[], target: string): Promise<ReadonlySet<string>>;
}
