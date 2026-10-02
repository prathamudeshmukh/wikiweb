import type { KeyValueStore } from '../interests/interestsStore';
import { FRESH_PROGRESS } from './hintProgress';
import { createHintStore } from './hintStore';

function memoryKv(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: async (key) => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
  };
}

describe('hintStore', () => {
  it('loads fresh progress on first launch', async () => {
    await expect(createHintStore(memoryKv()).load()).resolves.toEqual(FRESH_PROGRESS);
  });

  it('saves and loads progress under the SPEC.md §9 keys', async () => {
    const kv = memoryKv();
    const progress = { swipeHintShown: true, backHintShown: false, peelsSeen: 4 };

    await createHintStore(kv).save(progress);

    expect(kv.data).toEqual({ swipeHintShown: 'true', backHintShown: 'false', hintPeelsSeen: '4' });
    await expect(createHintStore(kv).load()).resolves.toEqual(progress);
  });

  it('treats unreadable values as not yet shown', async () => {
    const kv = memoryKv({ swipeHintShown: 'yes', backHintShown: '{', hintPeelsSeen: '-2' });

    await expect(createHintStore(kv).load()).resolves.toEqual(FRESH_PROGRESS);
  });
});
