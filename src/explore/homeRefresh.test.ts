import type { Card } from '../content/card';
import type { Feed, FeedPage } from '../content/pagedFeed';
import { createHomeRefresher } from './homeRefresh';

const card = (pageId: number) => ({ pageId, title: `Page ${pageId}` }) as Card;
const page = (...pageIds: number[]): FeedPage => ({ cards: pageIds.map(card), done: false });

interface Built {
  feed: Feed;
  wasShown: (pageId: number) => boolean;
}

/** A refresher whose every built feed serves `firstPage` (or fails with it). */
function setup(firstPage: FeedPage | Error = page(1, 2), readIds: ReadonlySet<number> = new Set()) {
  const built: Built[] = [];
  const errors: unknown[] = [];
  const refresher = createHomeRefresher({
    buildFeed: (wasShown) => {
      const feed: Feed = { nextPage: () => (firstPage instanceof Error ? Promise.reject(firstPage) : Promise.resolve(firstPage)) };
      built.push({ feed, wasShown });
      return feed;
    },
    isRead: (pageId) => readIds.has(pageId),
    onError: (error) => errors.push(error),
  });
  return { refresher, built, errors };
}

describe('createHomeRefresher', () => {
  it('opens on a Home feed of its own', () => {
    const { refresher, built } = setup();

    const opening = refresher.openingFeed();

    expect(built.map((b) => b.feed)).toEqual([opening]);
  });

  it('builds the next Home only once while it is on its way', () => {
    const { refresher, built } = setup();

    refresher.prebuild();
    refresher.prebuild();

    expect(built).toHaveLength(1);
  });

  it('has nothing to take before the next Home’s first page is in', () => {
    const { refresher } = setup();

    refresher.prebuild();

    expect(refresher.take()).toBeNull();
  });

  it('hands over the next Home with its first page once ready', async () => {
    const { refresher, built } = setup(page(1, 2));
    refresher.prebuild();

    const ready = await refresher.ready();
    const next = refresher.take();

    expect(ready).toBe(true);
    expect(next?.feed).toBe(built[0].feed);
    expect(next?.firstPage?.cards.map((c) => c.pageId)).toEqual([1, 2]);
  });

  it('builds a fresh one after the ready Home is taken', async () => {
    const { refresher, built } = setup();
    await refresher.ready();
    refresher.take();

    refresher.prebuild();

    expect(built).toHaveLength(2);
  });

  it('keeps a ready Home that was not taken for the next time', async () => {
    const { refresher, built } = setup();
    await refresher.ready();

    refresher.prebuild();
    await refresher.ready();

    expect(built).toHaveLength(1);
    expect(refresher.take()?.feed).toBe(built[0].feed);
  });

  it('builds feeds that know which cards were already shown', () => {
    const { refresher, built } = setup();
    refresher.markShown([card(7)]);

    refresher.prebuild();

    expect(built[0].wasShown(7)).toBe(true);
    expect(built[0].wasShown(8)).toBe(false);
  });

  it('drops cards shown after the next Home was built from its first page', async () => {
    const { refresher } = setup(page(1, 2));
    await refresher.ready();

    refresher.markShown([card(1)]);

    expect(refresher.take()?.firstPage?.cards.map((c) => c.pageId)).toEqual([2]);
  });

  it('drops cards read since the next Home was built from its first page', async () => {
    const readIds = new Set<number>();
    const { refresher } = setup(page(1, 2), readIds);
    await refresher.ready();

    readIds.add(2);

    expect(refresher.take()?.firstPage?.cards.map((c) => c.pageId)).toEqual([1]);
  });

  it('leaves the next Home to load normally when every card of its first page was already shown', async () => {
    const { refresher } = setup(page(1));
    await refresher.ready();

    refresher.markShown([card(1)]);

    expect(refresher.take()?.firstPage).toBeNull();
  });

  it('reports a next Home that failed and builds again next time', async () => {
    const offline = new Error('offline');
    const { refresher, built, errors } = setup(offline);

    const ready = await refresher.ready();
    refresher.prebuild();

    expect(ready).toBe(false);
    expect(errors).toEqual([offline]);
    expect(built).toHaveLength(2);
  });
});
