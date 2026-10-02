import { z } from 'zod';
import type { KeyValueStore } from '../interests/interestsStore';
import { FRESH_PROGRESS, type HintProgress } from './hintProgress';

export interface HintStore {
  load(): Promise<HintProgress>;
  save(progress: HintProgress): Promise<void>;
}

const KEYS = { swipe: 'swipeHintShown', back: 'backHintShown', peels: 'hintPeelsSeen' } as const;

const flagSchema = z.enum(['true', 'false']).transform((value) => value === 'true');
const countSchema = z.coerce.number().int().nonnegative();

// Unreadable values fall back to the fresh default: showing a hint again is harmless, crashing is not.
function parsed<T>(schema: z.ZodType<T>, raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  const result = schema.safeParse(raw);
  return result.success ? result.data : fallback;
}

export function createHintStore(kv: KeyValueStore): HintStore {
  return {
    async load() {
      const [swipe, back, peels] = await Promise.all([kv.getItem(KEYS.swipe), kv.getItem(KEYS.back), kv.getItem(KEYS.peels)]);
      return {
        swipeHintShown: parsed(flagSchema, swipe, FRESH_PROGRESS.swipeHintShown),
        backHintShown: parsed(flagSchema, back, FRESH_PROGRESS.backHintShown),
        peelsSeen: parsed(countSchema, peels, FRESH_PROGRESS.peelsSeen),
      };
    },
    async save(progress) {
      await Promise.all([
        kv.setItem(KEYS.swipe, String(progress.swipeHintShown)),
        kv.setItem(KEYS.back, String(progress.backHintShown)),
        kv.setItem(KEYS.peels, String(progress.peelsSeen)),
      ]);
    },
  };
}
