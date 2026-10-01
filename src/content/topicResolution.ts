import { FEED } from '../config/constants';
import type { WikiApi } from '../wiki-api/types';
import type { Card } from './card';
import { type CardTopic, topicFromWeightedTags } from './topics';

function chunks<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
}

/**
 * Swaps fallback topics for each article's own topic. Runs after a page is on screen (SPEC.md §5.4);
 * cirrusdoc is slow and internal, so callers should treat a failure as "keep the fallback".
 */
export async function resolveTopics(api: WikiApi, cards: readonly Card[]): Promise<Card[]> {
  const pendingIds = cards.filter((card) => card.topicIsFallback).map((card) => card.pageId);
  if (pendingIds.length === 0) return [...cards];

  const batches = await Promise.all(chunks(pendingIds, FEED.hydrateBatch).map((ids) => api.topicTags(ids)));
  const tagsById = new Map(batches.flatMap((batch) => [...batch]));

  return cards.map((card) => {
    const topic = topicFromWeightedTags(tagsById.get(card.pageId) ?? []);
    return card.topicIsFallback && topic.territory ? { ...card, topic, topicIsFallback: false } : card;
  });
}

/** One article's own topic, e.g. to stamp it when it's read (SPEC.md §3.6). */
export async function topicOfPage(api: WikiApi, pageId: number): Promise<CardTopic> {
  const tags = await api.topicTags([pageId]);
  return topicFromWeightedTags(tags.get(pageId) ?? []);
}
