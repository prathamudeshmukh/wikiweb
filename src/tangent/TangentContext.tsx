import { createContext, type ReactNode, useContext, useState } from 'react';
import type { Card } from '../content/card';
import { NO_TOPIC } from '../content/topics';
import type { Article } from '../wiki-api/types';
import { createHandoff, type ResumeQueue, type TangentQueue } from './tangentQueue';

/** Requests other screens leave for the explore screen. */
interface ExploreRequests {
  tangents: TangentQueue;
  resumes: ResumeQueue;
}

const TangentContext = createContext<ExploreRequests | null>(null);

const createRequests = (): ExploreRequests => ({ tangents: createHandoff(), resumes: createHandoff() });

export function TangentProvider({ children }: { children: ReactNode }) {
  const [requests] = useState(createRequests);
  return <TangentContext.Provider value={requests}>{children}</TangentContext.Provider>;
}

function useExploreRequests(hook: string): ExploreRequests {
  const requests = useContext(TangentContext);
  if (!requests) throw new Error(`${hook} must be used inside TangentProvider.`);
  return requests;
}

export const useTangentQueue = (): TangentQueue => useExploreRequests('useTangentQueue').tangents;
export const useResumeQueue = (): ResumeQueue => useExploreRequests('useResumeQueue').resumes;

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
    incomingLinks: null,
    source: 'link',
    visited: false,
    read: false,
  };
}
