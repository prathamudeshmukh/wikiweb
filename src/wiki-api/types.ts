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

/** A page of results plus an opaque cursor for the next page (null when exhausted). */
export interface Paged<T> {
  items: readonly T[];
  next: string | null;
}

export interface WikiApi {
  sections(title: string): Promise<ArticleSection[]>;
  /** Titles linked from one section, in reading order. */
  sectionLinks(title: string, sectionIndex: number): Promise<string[]>;
  backlinks(title: string, cursor: string | null): Promise<Paged<PageRef>>;
  moreLike(title: string, cursor: string | null): Promise<Paged<PageRef>>;
  topicSearch(query: string, cursor: string | null): Promise<Paged<PageRef>>;
  featured(date: Date): Promise<PageRef[]>;
  /** At most FEED.hydrateBatch titles. Keyed by the title as requested (redirects and normalisation resolved); missing pages are absent. */
  hydrate(titles: readonly string[]): Promise<ReadonlyMap<string, Article>>;
  /** Raw CirrusSearch weighted_tags per page id. Slow (~1.5 s / 20) — never on the critical path. */
  topicTags(pageIds: readonly number[]): Promise<ReadonlyMap<number, readonly string[]>>;
}
