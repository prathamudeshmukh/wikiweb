import { TOPIC_TILES, type Territory } from '../config/topicTiles';

const KNOWN_TILE_IDS: ReadonlySet<string> = new Set(TOPIC_TILES.map((tile) => tile.id));
const KNOWN_TERRITORIES: ReadonlySet<string> = new Set(TOPIC_TILES.map((tile) => tile.territory));

export const isKnownTileId = (tileId: string): boolean => KNOWN_TILE_IDS.has(tileId);

// Topics stored by an older build may no longer exist; they fall back to "untagged" rather than breaking what's drawn.
export const storedTileId = (tileId: string | null): string | null => (tileId !== null && isKnownTileId(tileId) ? tileId : null);

export const storedTerritory = (territory: string | null): Territory | null =>
  territory !== null && KNOWN_TERRITORIES.has(territory) ? (territory as Territory) : null;
