import { TOPICS } from '../config/constants';
import { BROAD_BUCKET_TERRITORY, TOPIC_TILES, type Territory, type TopicTile } from '../config/topicTiles';

export interface CardTopic {
  tileId: string | null;
  territory: Territory | null;
}

export const NO_TOPIC: CardTopic = { tileId: null, territory: null };

interface ParsedTag {
  segments: string[];
  score: number;
}

// `classification.prediction.articletopic/STEM.Biology|952` → { segments: ['STEM', 'Biology'], score: 952 }
function parseTag(raw: string): ParsedTag | null {
  if (!raw.startsWith(TOPICS.tagPrefix)) return null;
  const [path, scoreText] = raw.slice(TOPICS.tagPrefix.length).split('|');
  const score = Number(scoreText);
  if (!path || !Number.isFinite(score)) return null;
  return { segments: path.split('.'), score };
}

// Tag names and search keywords differ only in formatting: `Medicine_&_Health` ↔ `medicine-and-health`.
function toSearchKeyword(segment: string): string {
  return segment.replace(/\*$/, '').replace(/&/g, 'and').replace(/_/g, '-').toLowerCase();
}

const TILE_BY_KEYWORD: ReadonlyMap<string, TopicTile> = new Map(
  TOPIC_TILES.flatMap((tile) => tile.searchTopics.map((keyword) => [keyword, tile] as const)),
);

function tileFor(tag: ParsedTag): TopicTile | undefined {
  return TILE_BY_KEYWORD.get(toSearchKeyword(tag.segments[tag.segments.length - 1]));
}

/** Picks the best topic for a card from CirrusSearch weighted_tags (rules: SPEC.md §6 topic note). */
export function topicFromWeightedTags(weightedTags: readonly string[]): CardTopic {
  const candidates = weightedTags
    .map(parseTag)
    .filter((tag): tag is ParsedTag => tag !== null && tag.score >= TOPICS.minScore)
    .sort((a, b) => b.score - a.score);

  const mapped = candidates.map((tag) => tileFor(tag)).find((tile): tile is TopicTile => tile !== undefined);
  if (mapped) return { tileId: mapped.id, territory: mapped.territory };

  const broad = candidates.map((tag) => BROAD_BUCKET_TERRITORY[tag.segments[0]]).find((territory) => territory !== undefined);
  return broad ? { tileId: null, territory: broad } : NO_TOPIC;
}
