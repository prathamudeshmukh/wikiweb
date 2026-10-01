import { createContext, type ReactNode, useContext, useState } from 'react';
import type { Card } from '../content/card';
import { NO_TOPIC } from '../content/topics';
import type { Article } from '../wiki-api/types';
import { createTangentQueue, type TangentQueue } from './tangentQueue';

const TangentContext = createContext<TangentQueue | null>(null);

export function TangentProvider({ children }: { children: ReactNode }) {
  const [queue] = useState(createTangentQueue);
  return <TangentContext.Provider value={queue}>{children}</TangentContext.Provider>;
}

export function useTangentQueue(): TangentQueue {
  const queue = useContext(TangentContext);
  if (!queue) throw new Error('useTangentQueue must be used inside TangentProvider.');
  return queue;
}

/** A peeked article as a card, so it can fly into the new column like a swiped one. Its topic resolves later. */
export function cardFromArticle(article: Article): Card {
  return {
    pageId: article.pageId,
    title: article.title,
    description: article.description,
    extract: article.extract,
    thumbnail: article.thumbnail,
    topic: NO_TOPIC,
    topicIsFallback: true,
    source: 'link',
    visited: false,
    read: false,
  };
}
