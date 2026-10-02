import type { Article, PageRef, Thumbnail, TitleRef } from '../wiki-api/types';
import type { CardTopic } from './topics';

export type CardSource = 'link' | 'backlink' | 'sideways' | 'morelike' | 'home_interest' | 'home_today' | 'home_wildcard';

export interface Card extends PageRef {
  description: string | null;
  extract: string | null;
  thumbnail: Thumbnail | null;
  topic: CardTopic;
  /** True when the article's own topic is unknown (signals failed or untagged) and `topic` is the feed's fallback. */
  topicIsFallback: boolean;
  /** How many articles link here; null when unknown. Drives hub demotion (SPEC.md §5.6). */
  incomingLinks: number | null;
  /** Why this card is in its column — drives the why-line (DESIGN.md §5.3). */
  source: CardSource;
  /** Seen on another branch of the current expedition. */
  visited: boolean;
  read: boolean;
}

/** A page a feed wants to show, before it has been hydrated into a Card. */
export interface Candidate {
  /** Section links only carry a title; other sources also know the page id. */
  ref: TitleRef & { pageId?: number };
  source: CardSource;
  /** Used when the article's own topic is unknown (SPEC.md §5.4). */
  fallbackTopic: CardTopic;
  /** How often the seed's section links it (section links only). */
  mentions?: number;
}

export interface Annotations {
  visitedIds: ReadonlySet<number>;
  readIds: ReadonlySet<number>;
}

export function toCard(article: Article, candidate: Candidate, annotations: Annotations): Card {
  return {
    pageId: article.pageId,
    title: article.title,
    description: article.description,
    extract: article.extract,
    thumbnail: article.thumbnail,
    topic: candidate.fallbackTopic,
    topicIsFallback: true,
    incomingLinks: null,
    source: candidate.source,
    visited: annotations.visitedIds.has(article.pageId),
    read: annotations.readIds.has(article.pageId),
  };
}
