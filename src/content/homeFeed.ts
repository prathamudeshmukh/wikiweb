import { TOPIC_TILES, type TopicTile } from '../config/topicTiles';
import { nodeQuery, type ResolvedPick, resolvePick, tileOf } from '../interests/interestPicks';
import type { PageRef, WikiApi } from '../wiki-api/types';
import type { Candidate, Card, CardSource } from './card';
import { type ExhaustedNode, nodeStream } from './nodeStream';
import { type CandidateSource, createPagedFeed, type Feed } from './pagedFeed';
import { createBlocklistMatcher, isLowValueTitle } from './quality';
import type { RankingPolicy } from './ranking';
import { alternateStreams, onceStream, optionalStream, pagedStream, type Stream } from './refStream';
import { type CardTopic, NO_TOPIC } from './topics';

export interface HomeContext {
  /** Picks as path ids: broad tiles, subfields and leaves (SPEC.md §3.9). */
  interestPicks: readonly string[];
  today: Date;
  visitedIds: ReadonlySet<number>;
  /** Already-read articles are left out of Home. Asked per batch, so reads made while browsing count too. */
  isRead: (pageId: number) => boolean;
  /** Cards an earlier Home this session already showed are left out, so a refreshed Home never repeats them. */
  wasShown: (pageId: number) => boolean;
  /** Whole-word title blocklist applied to every Home card (SPEC.md §3.2). */
  blocklist: readonly string[];
  /** Told when an optional source (today's feed, wildcards) fails and its slots go to interests, or ranking signals fail. */
  onSourceError?: (error: unknown) => void;
  /** Told when every article of a subfield/leaf pick has been read (SPEC.md §3.9). */
  onNodeExhausted?: (node: ExhaustedNode) => void;
  /** Shuffles niche pages; injectable for tests. */
  random?: () => number;
}

type Slot = 'interest' | 'today' | 'wildcard';

// SPEC.md §3.2 — 7 interest / 2 today / 1 wildcard per 10, spread out so sources never clump.
const HOME_SLOTS: readonly Slot[] = ['interest', 'interest', 'wildcard', 'interest', 'today', 'interest', 'interest', 'today', 'interest', 'interest'];
const SLOT_SOURCE: Readonly<Record<Slot, CardSource>> = { interest: 'home_interest', today: 'home_today', wildcard: 'home_wildcard' };

function resolvePicks(paths: readonly string[]): ResolvedPick[] {
  if (paths.length === 0) throw new Error('Home needs at least one interest.');
  return paths.map((path) => {
    const pick = resolvePick(path)?.pick;
    if (!pick) throw new Error(`Unknown interest "${path}".`);
    return pick;
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
  interestNode?: string;
}

/** One stream in a rotation: its tile gives untagged cards a topic; `node` is set for subfield/leaf picks. */
interface RotationEntry {
  tile: TopicTile;
  stream: Stream<{ ref: PageRef; node: string | null }>;
}

function broadEntry(tile: TopicTile, stream: Stream<PageRef>): RotationEntry {
  return {
    tile,
    stream: {
      async next() {
        const ref = await stream.next();
        return ref ? { ref, node: null } : null;
      },
    },
  };
}

/** Round-robin across streams, skipping those that have run dry. */
function rotation(entries: readonly RotationEntry[]) {
  let turn = 0;
  return async function next(): Promise<TaggedRef | null> {
    for (let tried = 0; tried < entries.length; tried += 1) {
      const { tile, stream } = entries[(turn + tried) % entries.length];
      const item = await stream.next();
      if (item) {
        turn = (turn + tried + 1) % entries.length;
        const tagged = { ref: item.ref, fallbackTopic: { tileId: tile.id, territory: tile.territory } };
        return item.node ? { ...tagged, interestNode: item.node } : tagged;
      }
    }
    return null;
  };
}

/** Broad tiles draw on `articletopic`; subfield/leaf picks on their own categories, widening once read in full. */
function interestEntry(api: WikiApi, pick: ResolvedPick, context: HomeContext, isEligible: (title: string) => boolean): RotationEntry {
  if (!nodeQuery(pick)) return broadEntry(pick.tile, interestStream(api, pick.tile));
  const stream = nodeStream({
    api,
    path: pick.path,
    isRead: context.isRead,
    isEligible,
    random: context.random ?? Math.random,
    broadStream: () => interestStream(api, pick.tile),
    onExhausted: context.onNodeExhausted ?? (() => undefined),
  });
  return { tile: pick.tile, stream };
}

function homeCandidates(api: WikiApi, context: HomeContext): CandidateSource {
  const picks = resolvePicks(context.interestPicks);
  const matchesBlocklist = createBlocklistMatcher(context.blocklist);
  const isEligible = (title: string) => !matchesBlocklist(title) && !isLowValueTitle(title);
  // SPEC.md §3.9 — the rotation is over effective picks, so five Philosophy leaves fill most interest slots.
  const nextInterest = rotation(picks.map((pick) => interestEntry(api, pick, context, isEligible)));
  // Wildcards are Featured articles from tiles the user did not touch — outside their interests by construction.
  const touched = new Set(context.interestPicks.map(tileOf));
  const otherTiles = TOPIC_TILES.filter((tile) => !touched.has(tile.id));
  const reportError = context.onSourceError ?? (() => undefined);
  const nextWildcard = rotation(otherTiles.map((tile) => broadEntry(tile, optionalStream(curated(api, tile, FEATURED), reportError))));
  const today = optionalStream(onceStream(() => api.featured(context.today)), reportError);
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
    accepts: (card: Card) => !matchesBlocklist(card.title) && !context.isRead(card.pageId) && !context.wasShown(card.pageId),
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
