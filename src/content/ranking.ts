import { HUB_TITLES } from '../config/hubTitles';
import { RANKING } from '../config/constants';
import type { Card } from './card';

/** A hydrated card plus the relatedness signals its feed gathered for it. */
export interface Ranked {
  card: Card;
  /** The card's article links back to the column seed. */
  linksBack: boolean;
  /** How often the seed's section links it. */
  mentions: number;
}

/** How a feed wants its batches ordered. */
export interface RankingPolicy {
  /** Cards ranking may reorder; the rest keep the slot their source gave them. */
  isRankable: (card: Card) => boolean;
  /** Penalise every tenfold of incoming links above "specific enough". Off on Home, where well-known picks are welcome. */
  gradeSpecificity: boolean;
}

export function isHub(card: Card): boolean {
  return HUB_TITLES.has(card.title) || (card.incomingLinks ?? 0) >= RANKING.hubIncomingLinks;
}

// SPEC.md §5.6 — specific beats generic, related beats incidental, earlier beats later.
function decadesTooBroad(card: Card): number {
  return Math.max(0, Math.log10((card.incomingLinks ?? RANKING.unknownIncomingLinks) / RANKING.specificIncomingLinks));
}

function score({ card, linksBack, mentions }: Ranked, position: number, policy: RankingPolicy): number {
  const breadth = policy.gradeSpecificity ? decadesTooBroad(card) : 0;
  const extraMentions = Math.min(mentions - 1, RANKING.maxExtraMentions);
  return (
    RANKING.positionWeight * position -
    RANKING.specificityWeight * breadth +
    (linksBack ? RANKING.linksBackBonus : 0) +
    RANKING.mentionWeight * extraMentions
  );
}

const hubOrder = (a: Card, b: Card) => (a.incomingLinks ?? RANKING.hubIncomingLinks) - (b.incomingLinks ?? RANKING.hubIncomingLinks);

/**
 * Orders one batch. Cards the feed placed in a slot (e.g. sideways every few cards) keep their position;
 * the rankable rest fill the remaining positions best-first, with hubs last — including a hub that arrived in a slot.
 */
export function arrangeBatch(batch: readonly Ranked[], policy: RankingPolicy): Card[] {
  const slotted = (card: Card) => !policy.isRankable(card) && !isHub(card);
  // Position runs from 1 for the first card in the batch down towards 0 for the last.
  const scored = batch.map((item, index) => ({ card: item.card, score: score(item, 1 - index / batch.length, policy) }));
  const pool = scored.filter(({ card }) => !slotted(card));
  const specific = pool.filter(({ card }) => !isHub(card)).sort((a, b) => b.score - a.score).map(({ card }) => card);
  const hubs = pool.filter(({ card }) => isHub(card)).map(({ card }) => card).sort(hubOrder);
  const ranked = [...specific, ...hubs][Symbol.iterator]();
  return batch.map(({ card }) => (slotted(card) ? card : (ranked.next().value as Card)));
}
