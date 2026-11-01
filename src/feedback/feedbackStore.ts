import { z } from 'zod';
import type { KeyValueStore } from '../interests/interestsStore';
import type { FeedbackProgress } from './feedbackRules';

export interface FeedbackStore {
  load(): Promise<FeedbackProgress>;
  save(progress: FeedbackProgress): Promise<void>;
}

const KEYS = { impressions: 'feedbackImpressions', done: 'feedbackDone' } as const;
const impressionsSchema = z.number().int().nonnegative();
const doneSchema = z.boolean();

// Unreadable values fall back to fresh: asking once more is harmless, crashing is not.
function parsed<T>(schema: z.ZodType<T>, raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function createFeedbackStore(kv: KeyValueStore): FeedbackStore {
  return {
    async load() {
      const [impressions, done] = await Promise.all([kv.getItem(KEYS.impressions), kv.getItem(KEYS.done)]);
      return { impressions: parsed(impressionsSchema, impressions, 0), done: parsed(doneSchema, done, false) };
    },
    async save({ impressions, done }) {
      await Promise.all([kv.setItem(KEYS.impressions, JSON.stringify(impressions)), kv.setItem(KEYS.done, JSON.stringify(done))]);
    },
  };
}
