import { z } from 'zod';
import { reportError } from '../services/reportError';
import { normalisePicks, resolvePick } from './interestPicks';

/** The slice of expo-sqlite's kv-store (AsyncStorage-compatible) this store needs. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface InterestsStore {
  /** The user's picks as path ids (SPEC.md §3.9), or null if they have not finished onboarding. */
  load(): Promise<string[] | null>;
  save(picks: readonly string[]): Promise<void>;
}

const STORAGE_KEY = 'interests';
const storedSchema = z.array(z.string());

function parseStored(raw: string): string[] | null {
  try {
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** A saved pick named a tree node that no longer exists; reported by class name only, never the path. */
class InterestNodeMissingError extends Error {
  override name = 'InterestNodeMissing';
}

const isExactPick = (path: string) => resolvePick(path)?.fellBack === false;

export function createInterestsStore(kv: KeyValueStore): InterestsStore {
  return {
    async load() {
      const raw = await kv.getItem(STORAGE_KEY);
      const stored = raw === null ? null : parseStored(raw);
      // Tiles and tree nodes can be renamed or retired between versions: gone nodes fall back to an ancestor.
      const { picks, fellBack } = normalisePicks(stored ?? []);
      if (fellBack.length > 0) reportError('interests.load', new InterestNodeMissingError());
      return picks.length > 0 ? picks : null;
    },
    async save(picks) {
      const unknown = picks.find((path) => !isExactPick(path));
      if (unknown) throw new Error(`Unknown interest "${unknown}".`);
      await kv.setItem(STORAGE_KEY, JSON.stringify(picks));
    },
  };
}
