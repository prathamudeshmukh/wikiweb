import type { WikiApi } from '../wiki-api/types';
import { type CardTopic, topicFromWeightedTags } from './topics';

/** One article's own topic, e.g. to stamp it when it's read (SPEC.md §3.6). */
export async function topicOfPage(api: WikiApi, pageId: number): Promise<CardTopic> {
  const tags = await api.topicTags([pageId]);
  return topicFromWeightedTags(tags.get(pageId) ?? []);
}
