import type { Card } from '../content/card';
import type { Feed, FeedPage } from '../content/pagedFeed';
import type { Lane } from '../wiki-api/requestBudget';
import { createColumnPrefetcher, type PrefetchSettings } from './columnPrefetch';
import type { ColumnEntry } from './columnStack';

const SETTINGS: Omit<PrefetchSettings, 'feedFor'> = { maxConcurrent: 2, maxKept: 3 };

const entry = (id: string): ColumnEntry => ({
  id,
  seed: { pageId: id.length, title: id },
  seedTopic: { tileId: null, territory: null },
  seedThumbnailUrl: null,
  path: [],
  nodeId: null,
});

const page = (title: string): FeedPage => ({ cards: [{ title } as Card], done: false });

interface Controlled {
  feed: Feed & { calls: number };
  lane: Lane;
  resolve: (value: FeedPage) => void;
  reject: (error: Error) => void;
}

/** Feeds whose first page resolves only when the test says so; later pages return "Later". */
function setup() {
  const made = new Map<string, Controlled>();
  const prefetcher = createColumnPrefetcher({
    ...SETTINGS,
    feedFor: (column, lane) => {
      let resolve: Controlled['resolve'] = () => undefined;
      let reject: Controlled['reject'] = () => undefined;
      const first = new Promise<FeedPage>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      const feed = {
        calls: 0,
        nextPage: () => {
          feed.calls += 1;
          return feed.calls === 1 ? first : Promise.resolve(page('Later'));
        },
      };
      made.set(column.id, { feed, lane, resolve, reject });
      return feed;
    },
  });
  const controlled = (id: string) => {
    const found = made.get(id);
    if (!found) throw new Error(`no feed made for ${id}`);
    return found;
  };
  return { prefetcher, made, controlled };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createColumnPrefetcher', () => {
  it('starts loading a column’s first page on a prefetch lane', () => {
    const { prefetcher, controlled } = setup();

    prefetcher.prefetch(entry('Squid'));

    expect(controlled('Squid').feed.calls).toBe(1);
    expect(controlled('Squid').lane.state).toBe('prefetch');
  });

  it('hands over the prefetched page first, then carries on from the same feed', async () => {
    const { prefetcher, controlled } = setup();
    prefetcher.prefetch(entry('Squid'));
    controlled('Squid').resolve(page('Ink'));

    const feed = prefetcher.take('Squid');

    expect((await feed?.nextPage())?.cards[0].title).toBe('Ink');
    expect((await feed?.nextPage())?.cards[0].title).toBe('Later');
  });

  it('promotes the column’s requests to on-screen when it is taken', () => {
    const { prefetcher, controlled } = setup();
    prefetcher.prefetch(entry('Squid'));

    prefetcher.take('Squid');

    expect(controlled('Squid').lane.state).toBe('foreground');
  });

  it('returns the same feed when taken twice before release (React may render twice)', () => {
    const { prefetcher } = setup();
    prefetcher.prefetch(entry('Squid'));

    expect(prefetcher.take('Squid')).toBe(prefetcher.take('Squid'));
  });

  it('forgets a column once released, so a later hop into it starts fresh', () => {
    const { prefetcher } = setup();
    prefetcher.prefetch(entry('Squid'));
    prefetcher.take('Squid');

    prefetcher.release('Squid');

    expect(prefetcher.take('Squid')).toBeNull();
  });

  it('has nothing for a column it never prefetched', () => {
    const { prefetcher } = setup();

    expect(prefetcher.take('Squid')).toBeNull();
  });

  it('does not prefetch the same column twice', () => {
    const { prefetcher, made } = setup();

    prefetcher.prefetch(entry('Squid'));
    const first = made.get('Squid');
    prefetcher.prefetch(entry('Squid'));

    expect(made.get('Squid')).toBe(first);
  });

  it('runs at most a few prefetches at once', () => {
    const { prefetcher, made } = setup();

    ['A', 'B', 'C'].forEach((id) => prefetcher.prefetch(entry(id)));

    expect([...made.keys()]).toEqual(['A', 'B']);
  });

  it('cancels an unfinished prefetch, freeing its slot', () => {
    const { prefetcher, controlled, made } = setup();
    ['A', 'B'].forEach((id) => prefetcher.prefetch(entry(id)));

    prefetcher.cancel('A');
    prefetcher.prefetch(entry('C'));

    expect(controlled('A').lane.state).toBe('cancelled');
    expect(made.has('C')).toBe(true);
  });

  it('keeps a finished prefetch when it is cancelled, since it costs nothing more', async () => {
    const { prefetcher, controlled } = setup();
    prefetcher.prefetch(entry('Squid'));
    controlled('Squid').resolve(page('Ink'));
    await settle();

    prefetcher.cancel('Squid');

    expect(prefetcher.take('Squid')).not.toBeNull();
  });

  it('drops a prefetch that failed, so the column loads normally', async () => {
    const { prefetcher, controlled } = setup();
    prefetcher.prefetch(entry('Squid'));
    controlled('Squid').reject(new Error('offline'));
    await settle();

    expect(prefetcher.take('Squid')).toBeNull();
  });

  it('keeps only the most recent finished prefetches', async () => {
    const { prefetcher, controlled } = setup();
    for (const id of ['A', 'B', 'C', 'D']) {
      prefetcher.prefetch(entry(id));
      controlled(id).resolve(page(id));
      await settle();
    }

    expect(prefetcher.take('A')).toBeNull();
    expect(prefetcher.take('D')).not.toBeNull();
  });

  it('ignores Home, which has no seed to prefetch', () => {
    const { prefetcher, made } = setup();

    prefetcher.prefetch({ ...entry('home'), seed: null });

    expect(made.size).toBe(0);
  });
});
