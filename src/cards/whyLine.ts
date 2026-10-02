import { TOPIC_TILES } from '../config/topicTiles';
import type { Card, CardSource } from '../content/card';

const TILE_LABELS: ReadonlyMap<string, string> = new Map(TOPIC_TILES.map((tile) => [tile.id, tile.label]));

/** The topic name shown on a card, or null when it only has a territory colour. */
export function topicLabel(card: Card): string | null {
  return card.topic.tileId ? (TILE_LABELS.get(card.topic.tileId) ?? null) : null;
}

// DESIGN.md §5.3
const COPY: Readonly<Record<CardSource, (seedTitle: string, card: Card) => string>> = {
  link: (seed) => `↳ LINKED FROM ${seed}`,
  backlink: (seed) => `↰ LINKS TO ${seed}`,
  sideways: (seed, card) => {
    const label = topicLabel(card);
    return label ? `⤳ DETOUR INTO ${label} · LINKS TO ${seed}` : `⤳ DETOUR · LINKS TO ${seed}`;
  },
  morelike: (seed) => `≈ SIMILAR TO ${seed}`,
  home_interest: (_seed, card) => {
    const label = topicLabel(card);
    return label ? `★ YOU LIKE ${label}` : '★ PICKED FOR YOU';
  },
  home_today: () => '☀ TODAY ON WIKIPEDIA',
  home_wildcard: () => '✦ WILDCARD',
};

/** Why a card is in its column. `seedTitle` is null on Home. */
export function whyLine(card: Card, seedTitle: string | null): string {
  return COPY[card.source](seedTitle ?? '', card).toUpperCase();
}
