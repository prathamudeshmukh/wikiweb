import { z } from 'zod';
import { TOPIC_TILES } from '../config/topicTiles';

/** The slice of expo-sqlite's kv-store (AsyncStorage-compatible) this store needs. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface InterestsStore {
  /** The user's picked tile ids, or null if they have not finished onboarding. */
  load(): Promise<string[] | null>;
  save(tileIds: readonly string[]): Promise<void>;
}

const STORAGE_KEY = 'interests';
const KNOWN_TILE_IDS: ReadonlySet<string> = new Set(TOPIC_TILES.map((tile) => tile.id));
const storedSchema = z.array(z.string());

function parseStored(raw: string): string[] | null {
  try {
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createInterestsStore(kv: KeyValueStore): InterestsStore {
  return {
    async load() {
      const raw = await kv.getItem(STORAGE_KEY);
      const stored = raw === null ? null : parseStored(raw);
      // Tiles can be renamed or retired between versions; keep only those that still exist.
      const known = stored?.filter((id) => KNOWN_TILE_IDS.has(id)) ?? [];
      return known.length > 0 ? known : null;
    },
    async save(tileIds) {
      const unknown = tileIds.find((id) => !KNOWN_TILE_IDS.has(id));
      if (unknown) throw new Error(`Unknown interest "${unknown}".`);
      await kv.setItem(STORAGE_KEY, JSON.stringify(tileIds));
    },
  };
}
