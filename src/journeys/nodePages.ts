import type { Card } from '../content/card';
import type { ResumedColumn } from '../explore/columnStack';
import type { JourneyNode, NodePage } from './journeyTypes';

/** What a Journey node keeps of a card it hops into. */
export function nodePageOf(card: Card): NodePage {
  return {
    pageId: card.pageId,
    title: card.title,
    tileId: card.topic.tileId,
    territory: card.topic.territory,
    thumbnailUrl: card.thumbnail?.url ?? null,
  };
}

/** A saved node as a column to reopen. */
export function resumedColumnOf(node: JourneyNode): ResumedColumn {
  return {
    ref: { pageId: node.pageId, title: node.title },
    topic: { tileId: node.tileId, territory: node.territory },
    thumbnailUrl: node.thumbnailUrl,
    nodeId: node.id,
  };
}
