import { z } from 'zod';
import type { Card } from '../content/card';
import type { CardTopic } from '../content/topics';
import { TOPIC_TILES } from '../config/topicTiles';
import type { PageRef } from '../wiki-api/types';

/** Route params for the reader: strings only, since they travel through the URL. */
export interface ReaderParams {
  [key: string]: string;
  title: string;
  pageId: string;
  /** The card's own topic, when it has resolved — saves a lookup when stamping the read. */
  tileId: string;
}

export interface ReaderTarget {
  page: PageRef;
  knownTopic: CardTopic | null;
}

export function readerParamsFor(card: Card): ReaderParams {
  return { title: card.title, pageId: String(card.pageId), tileId: card.topicIsFallback ? '' : (card.topic.tileId ?? '') };
}

const paramsSchema = z.object({
  title: z.string().min(1),
  pageId: z.coerce.number().int().positive(),
  tileId: z.string().optional(),
});

/** Validates the reader's route params (they may come from a stale deep link); null when unusable. */
export function parseReaderParams(params: Record<string, string | string[] | undefined>): ReaderTarget | null {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) return null;
  const { title, pageId, tileId } = parsed.data;
  const tile = TOPIC_TILES.find((t) => t.id === tileId);
  return { page: { title, pageId }, knownTopic: tile ? { tileId: tile.id, territory: tile.territory } : null };
}
