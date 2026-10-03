import type { Card } from '../content/card';
import { isHub } from '../content/ranking';
import type { ColumnEntry } from '../explore/columnStack';
import type { CardProperties, ColumnProperties } from './events';

/** The one place a card becomes event properties — and so the one place its title enters analytics. */
export function cardProperties(card: Card, position: number | null): CardProperties {
  const topic = card.topicIsFallback ? null : card.topic;
  const hubKnown = card.incomingLinks !== null || isHub(card);
  return {
    card_title: card.title,
    source: card.source,
    topic: topic?.tileId ?? null,
    territory: topic?.territory ?? null,
    position,
    hub: hubKnown ? isHub(card) : null,
  };
}

export function columnProperties(entry: ColumnEntry): ColumnProperties {
  return { seed_title: entry.seed?.title ?? null, depth: entry.path.length };
}
