import { reportError } from '../services/reportError';
import { createInterestsStore, type KeyValueStore } from './interestsStore';

jest.mock('../services/reportError', () => ({ reportError: jest.fn() }));

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

  it('saves and loads subfield and leaf picks as path ids', async () => {
    const store = createInterestsStore(memoryKv());

    await store.save(['space', 'philosophy/logic', 'history/medieval/vikings']);

    await expect(store.load()).resolves.toEqual(['space', 'philosophy/logic', 'history/medieval/vikings']);
  });

  it('refuses to save a node that is not in the tree', async () => {
    await expect(createInterestsStore(memoryKv()).save(['philosophy/astrology'])).rejects.toThrow(/Unknown interest/);
  });

  it('resolves a gone node to its nearest ancestor and reports it without the path', async () => {
    const kv = memoryKv({ interests: JSON.stringify(['space', 'philosophy/ethics/hedonism']) });

    await expect(createInterestsStore(kv).load()).resolves.toEqual(['space', 'philosophy/ethics']);
    expect(reportError).toHaveBeenCalledWith('interests.load', expect.objectContaining({ name: 'InterestNodeMissing' }));
  });
});
