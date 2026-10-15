import { reportError } from '../services/reportError';
import { createBrowserKeyValueStore } from './browserKeyValueStore';

jest.mock('../services/reportError', () => ({ reportError: jest.fn() }));

/** The slice of the Web Storage API the store uses, backed by a Map. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key: string) => data.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      data.set(key, value);
    }),
  };
}

function failing(): never {
  throw new DOMException('The operation is insecure.', 'SecurityError');
}

beforeEach(() => {
  jest.mocked(reportError).mockClear();
});

describe('createBrowserKeyValueStore', () => {
  it('reads what an earlier visit saved', async () => {
    const store = createBrowserKeyValueStore(() => fakeStorage({ interests: '["space"]' }));

    await expect(store.getItem('interests')).resolves.toBe('["space"]');
  });

  it('returns null for a key never saved', async () => {
    const store = createBrowserKeyValueStore(() => fakeStorage());

    await expect(store.getItem('interests')).resolves.toBeNull();
  });

  it('saves into browser storage for the next visit', async () => {
    const storage = fakeStorage();
    const store = createBrowserKeyValueStore(() => storage);

    await store.setItem('interests', '["art"]');

    expect(storage.getItem('interests')).toBe('["art"]');
  });

  it('keeps the session going when browser storage is blocked', async () => {
    const store = createBrowserKeyValueStore(failing);

    await store.setItem('interests', '["art"]');

    await expect(store.getItem('interests')).resolves.toBe('["art"]');
    expect(reportError).toHaveBeenCalledWith('storage.keyValue', expect.objectContaining({ name: 'SecurityError' }));
  });

  it('reads this session’s write even when saving it failed', async () => {
    const storage = { ...fakeStorage({ interests: '["space"]' }), setItem: jest.fn(failing) };
    const store = createBrowserKeyValueStore(() => storage);

    await store.setItem('interests', '["art"]');

    await expect(store.getItem('interests')).resolves.toBe('["art"]');
  });

  it('reports blocked storage once, not on every call', async () => {
    const store = createBrowserKeyValueStore(failing);

    await store.getItem('interests');
    await store.setItem('interests', '["art"]');

    expect(reportError).toHaveBeenCalledTimes(1);
  });
});
