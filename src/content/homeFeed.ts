import { TOPIC_TILES, type TopicTile } from '../config/topicTiles';
import type { PageRef, WikiApi } from '../wiki-api/types';
import type { Candidate, Card, CardSource } from './card';
import { type CandidateSource, createPagedFeed, type Feed } from './pagedFeed';
import { createBlocklistMatcher } from './quality';
import type { RankingPolicy } from './ranking';
import { alternateStreams, onceStream, optionalStream, pagedStream, type Stream } from './refStream';
import { type CardTopic, NO_TOPIC } from './topics';

export interface HomeContext {
  interestTileIds: readonly string[];
  today: Date;
  visitedIds: ReadonlySet<number>;
  /** Already-read articles are left out of Home. Asked per batch, so reads made while browsing count too. */
  isRead: (pageId: number) => boolean;
  /** Whole-word title blocklist applied to every Home card (SPEC.md §3.2). */
  blocklist: readonly string[];
  /** Told when an optional source (today's feed, wildcards) fails and its slots go to interests, or ranking signals fail. */
  onSourceError?: (error: unknown) => void;
}

type Slot = 'interest' | 'today' | 'wildcard';

// SPEC.md §3.2 — 7 interest / 2 today / 1 wildcard per 10, spread out so sources never clump.
const HOME_SLOTS: readonly Slot[] = ['interest', 'interest', 'wildcard', 'interest', 'today', 'interest', 'interest', 'today', 'interest', 'interest'];
const SLOT_SOURCE: Readonly<Record<Slot, CardSource>> = { interest: 'home_interest', today: 'home_today', wildcard: 'home_wildcard' };

function resolveTiles(ids: readonly string[]): TopicTile[] {
  if (ids.length === 0) throw new Error('Home needs at least one interest.');
  return ids.map((id) => {
    const tile = TOPIC_TILES.find((t) => t.id === id);
    if (!tile) throw new Error(`Unknown interest "${id}".`);
    return tile;
  });
}

// Only reviewed articles: raw topic search surfaces explicit pages first (SPEC.md §6 content note).
const FEATURED = 'Featured_articles';
const GOOD = 'Good_articles';

// Random order, so every session opens on a different slice of the pool rather than the same famous few (SPEC.md §3.2).
const curated = (api: WikiApi, tile: TopicTile, category: string): Stream<PageRef> =>
  pagedStream((cursor) => api.search(`articletopic:${tile.searchTopics.join('|')} incategory:${category}`, cursor, 'random'));

// Good articles outnumber Featured ~7:1, so drawing from both pools at once makes Home almost all obscure; alternate instead.
const interestStream = (api: WikiApi, tile: TopicTile): Stream<PageRef> => alternateStreams([curated(api, tile, FEATURED), curated(api, tile, GOOD)]);

interface TaggedRef {
  ref: PageRef;
  fallbackTopic: CardTopic;
}

/** Round-robin across tiles, skipping tiles that have run dry. */
function tileRotation(tiles: readonly TopicTile[], streamFor: (tile: TopicTile) => Stream<PageRef>) {
  const streams = tiles.map((tile) => ({ tile, stream: streamFor(tile) }));
  let turn = 0;
  return async function next(): Promise<TaggedRef | null> {
    for (let tried = 0; tried < streams.length; tried += 1) {
      const { tile, stream } = streams[(turn + tried) % streams.length];
      const ref = await stream.next();
      if (ref) {
        turn = (turn + tried + 1) % streams.length;
        return { ref, fallbackTopic: { tileId: tile.id, territory: tile.territory } };
      }
    }
    return null;
  };
}

function homeCandidates(api: WikiApi, context: HomeContext): CandidateSource {
  const tiles = resolveTiles(context.interestTileIds);
  const nextInterest = tileRotation(tiles, (tile) => interestStream(api, tile));
  // Wildcards are Featured articles from tiles the user did not pick — outside their interests by construction.
  const otherTiles = TOPIC_TILES.filter((tile) => !tiles.includes(tile));
  const reportError = context.onSourceError ?? (() => undefined);
  const nextWildcard = tileRotation(otherTiles, (tile) => optionalStream(curated(api, tile, FEATURED), reportError));
  const today = optionalStream(onceStream(() => api.featured(context.today)), reportError);
  const matchesBlocklist = createBlocklistMatcher(context.blocklist);
  let slotIndex = 0;

  async function nextToday(): Promise<TaggedRef | null> {
    const ref = await today.next();
    return ref ? { ref, fallbackTopic: NO_TOPIC } : null;
  }

  const forSlot: Readonly<Record<Slot, () => Promise<TaggedRef | null>>> = { interest: nextInterest, today: nextToday, wildcard: nextWildcard };

  return {
    async next(): Promise<Candidate | null> {
      const slot = HOME_SLOTS[slotIndex % HOME_SLOTS.length];
      slotIndex += 1;
      const tagged = await forSlot[slot]();
      if (tagged) return { ...tagged, source: SLOT_SOURCE[slot] };
      // An empty today/wildcard source gives its slot to interests rather than shrinking the page.
      const fallback = slot === 'interest' ? null : await nextInterest();
      return fallback ? { ...fallback, source: 'home_interest' } : null;
    },
    accepts: (card: Card) => !matchesBlocklist(card.title) && !context.isRead(card.pageId),
  };
}

// Home only sinks hubs: famous-but-specific Featured picks are part of the mix (SPEC.md §3.2).
const HOME_RANKING: RankingPolicy = { isRankable: (card: Card) => card.source === 'home_interest', gradeSpecificity: false };

export function createHomeFeed(api: WikiApi, context: HomeContext): Feed {
  return createPagedFeed(api, homeCandidates(api, context), {
    excludeIds: new Set(),
    annotations: { visitedIds: context.visitedIds, readIds: new Set() },
    ranking: HOME_RANKING,
    onSignalsError: context.onSourceError,
  });
}
