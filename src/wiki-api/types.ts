export interface PageRef {
  pageId: number;
  title: string;
}

export interface RankedLink extends PageRef {
  /** CirrusSearch popularity_score; 0 when the index has no document for the page. */
  popularity: number;
  isDisambiguation: boolean;
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
  /** Raw CirrusSearch weighted_tags, e.g. `classification.prediction.articletopic/STEM.Biology|952`. */
  weightedTags: readonly string[];
  isDisambiguation: boolean;
}

/** A page of results plus an opaque cursor for the next page (null when exhausted). */
export interface Paged<T> {
  items: readonly T[];
  next: string | null;
}

export interface WikiApi {
  rankedLinks(title: string): Promise<RankedLink[]>;
  backlinks(title: string, cursor: string | null): Promise<Paged<PageRef>>;
  moreLike(title: string, cursor: string | null): Promise<Paged<PageRef>>;
  topicSearch(query: string, cursor: string | null): Promise<Paged<PageRef>>;
  random(): Promise<PageRef[]>;
  featured(date: Date): Promise<PageRef[]>;
  /** At most FEED.hydrateBatch ids; result keeps the requested order and drops missing pages. */
  hydrate(pageIds: readonly number[]): Promise<Article[]>;
}
