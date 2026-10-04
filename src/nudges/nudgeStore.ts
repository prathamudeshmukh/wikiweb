import { z } from 'zod';
import type { KeyValueStore } from '../interests/interestsStore';
import type { ReadsByTile } from './nudgeRules';

/** What the prompt card rules remember between launches (SPEC.md §9 key-value storage). */
export interface NudgeProgress {
  /** Tiles whose prompt card was shown — never prompted again. */
  promptsSeen: readonly string[];
  /** Reads per tree tile, towards its prompt. */
  readsByTile: ReadsByTile;
}

export interface NudgeStore {
  load(): Promise<NudgeProgress>;
  save(progress: NudgeProgress): Promise<void>;
}

const KEYS = { seen: 'nichePromptsSeen', reads: 'nicheReads' } as const;
const seenSchema = z.array(z.string());
const readsSchema = z.record(z.string(), z.number().int().nonnegative());

// Unreadable values fall back to fresh: an extra prompt is harmless, crashing is not.
function parsed<T>(schema: z.ZodType<T>, raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function createNudgeStore(kv: KeyValueStore): NudgeStore {
  return {
    async load() {
      const [seen, reads] = await Promise.all([kv.getItem(KEYS.seen), kv.getItem(KEYS.reads)]);
      return { promptsSeen: parsed(seenSchema, seen, []), readsByTile: parsed(readsSchema, reads, {}) };
    },
    async save({ promptsSeen, readsByTile }) {
      await Promise.all([kv.setItem(KEYS.seen, JSON.stringify(promptsSeen)), kv.setItem(KEYS.reads, JSON.stringify(readsByTile))]);
    },
  };
}
