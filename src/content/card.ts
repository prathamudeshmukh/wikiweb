import type { Article, PageRef, Thumbnail, TitleRef } from '../wiki-api/types';
import type { CardTopic } from './topics';

export type CardSource = 'link' | 'backlink' | 'morelike' | 'home_interest' | 'home_today' | 'home_wildcard';

export interface Card extends PageRef {
  description: string | null;
  extract: string | null;
  thumbnail: Thumbnail | null;
  topic: CardTopic;
  /** True until resolveTopics has replaced the feed's fallback with the article's own topic. */
  topicIsFallback: boolean;
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
  /** Shown until topics resolve (SPEC.md §5.4). */
  fallbackTopic: CardTopic;
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
    source: candidate.source,
    visited: annotations.visitedIds.has(article.pageId),
    read: annotations.readIds.has(article.pageId),
  };
}
