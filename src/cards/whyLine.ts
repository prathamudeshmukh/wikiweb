import { TOPIC_TILES } from '../config/topicTiles';
import type { Card, CardSource } from '../content/card';
import { nodeLabel, resolvePick } from '../interests/interestPicks';

const TILE_LABELS: ReadonlyMap<string, string> = new Map(TOPIC_TILES.map((tile) => [tile.id, tile.label]));

/** The topic name shown on a card, or null when it only has a territory colour. */
export function topicLabel(card: Card): string | null {
  return card.topic.tileId ? (TILE_LABELS.get(card.topic.tileId) ?? null) : null;
}

// DESIGN.md §5.3
interface WhyLineContext {
  /** False while Home is built from the defaults a skipped onboarding saved (SPEC.md §3.1). */
  interestsChosen: boolean;
}

const CHOSEN: WhyLineContext = { interestsChosen: true };

const COPY: Readonly<Record<CardSource, (seedTitle: string, card: Card, context: WhyLineContext) => string>> = {
  link: (seed) => `↳ LINKED FROM ${seed}`,
  backlink: (seed) => `↰ LINKS TO ${seed}`,
  sideways: (seed, card) => {
    const label = topicLabel(card);
    return label ? `⤳ DETOUR INTO ${label} · LINKS TO ${seed}` : `⤳ DETOUR · LINKS TO ${seed}`;
  },
  morelike: (seed) => `≈ SIMILAR TO ${seed}`,
  home_interest: (_seed, card, { interestsChosen }) => {
    // A subfield/leaf pick names its node; colour and topic label still come from the article (SPEC.md §3.9).
    const node = card.interestNode ? resolvePick(card.interestNode)?.pick : null;
    const label = node ? nodeLabel(node) : topicLabel(card);
    if (!label) return '★ PICKED FOR YOU';
    // Never claim a liking the user didn't state.
    return interestsChosen ? `★ YOU LIKE ${label}` : `★ STARTING WITH ${label}`;
  },
  home_today: () => '☀ TODAY ON WIKIPEDIA',
  home_wildcard: () => '↯ WILDCARD',
};

/** Why a card is in its column. `seedTitle` is null on Home. */
export function whyLine(card: Card, seedTitle: string | null, context: WhyLineContext = CHOSEN): string {
  return COPY[card.source](seedTitle ?? '', card, context).toUpperCase();
}
