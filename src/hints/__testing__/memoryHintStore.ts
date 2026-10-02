import { FRESH_PROGRESS, type HintProgress } from '../hintProgress';
import type { HintStore } from '../hintStore';

/** A hint store in memory; `saved` is what was last written. */
export function memoryHintStore(initial: HintProgress = FRESH_PROGRESS): HintStore & { saved(): HintProgress } {
  let saved = initial;
  return {
    load: async () => saved,
    save: async (progress) => {
      saved = progress;
    },
    saved: () => saved,
  };
}
