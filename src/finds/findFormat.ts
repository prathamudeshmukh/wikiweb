import type { Card } from '../content/card';
import { logDate } from '../logbook/logbookFormat';
import type { Find } from './findTypes';

// Thumbnails are snapshotted as a URL alone; the image view sizes them itself.
const UNKNOWN_SIZE = 0;

/** DESIGN.md §8: `FOUND ON · FROM {FIRST}…` or `FOUND ON HOME`. */
export function findCaption({ expedition }: Find): string {
  return (expedition ? `Found on · ${expedition.title}…` : 'Found on Home').toUpperCase();
}

/** The caption with the day it was found, for a find's sheet. */
export function findSheetCaption(find: Find): string {
  return `${findCaption(find)} · ${logDate(find.foundAt)}`;
}

/** A find as a card, so a tangent from it flies into a new column like a swiped card. */
export function cardFromFind(find: Find): Card {
  return {
    pageId: find.pageId,
    title: find.title,
    description: null,
    extract: null,
    thumbnail: find.thumbnailUrl ? { url: find.thumbnailUrl, width: UNKNOWN_SIZE, height: UNKNOWN_SIZE } : null,
    topic: { tileId: find.tileId, territory: find.territory },
    topicIsFallback: find.tileId === null,
    incomingLinks: null,
    source: 'link',
    visited: false,
    read: false,
  };
}
