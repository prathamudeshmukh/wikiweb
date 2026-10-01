import { createInterestsStore, type KeyValueStore } from './interestsStore';

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

describe('interestsStore', () => {
  it('returns null before onboarding', async () => {
    await expect(createInterestsStore(memoryKv()).load()).resolves.toBeNull();
  });

  it('saves and loads the picked tiles', async () => {
    const store = createInterestsStore(memoryKv());

    await store.save(['space', 'history', 'art']);

    await expect(store.load()).resolves.toEqual(['space', 'history', 'art']);
  });

  it('drops tiles that no longer exist', async () => {
    const kv = memoryKv({ interests: JSON.stringify(['space', 'astrology', 'art']) });

    await expect(createInterestsStore(kv).load()).resolves.toEqual(['space', 'art']);
  });

  it('treats corrupt data as not onboarded', async () => {
    const kv = memoryKv({ interests: '{not json' });

    await expect(createInterestsStore(kv).load()).resolves.toBeNull();
  });

  it('refuses to save an unknown tile', async () => {
    await expect(createInterestsStore(memoryKv()).save(['astrology'])).rejects.toThrow(/Unknown interest/);
  });
});
