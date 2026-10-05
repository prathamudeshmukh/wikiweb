import type { Card } from './card';
import type { Feed, FeedPage } from './pagedFeed';
import { createRestoringFeed } from './restoringFeed';

const card = (pageId: number) => ({ pageId, title: `Page ${pageId}` }) as Card;
const FRESH_PAGE: FeedPage = { cards: [card(9)], done: false };

function setup(restore: () => Promise<readonly Card[]>) {
  const freshNextPage = jest.fn(async () => FRESH_PAGE);
  const fresh: Feed = { nextPage: freshNextPage };
  const onRestored = jest.fn();
  const onError = jest.fn();
  const feed = createRestoringFeed({ restore, fresh, onRestored, onError });
  return { feed, freshNextPage, onRestored, onError };
}

describe('createRestoringFeed', () => {
  it('opens on the restored cards without touching the fresh feed', async () => {
    const { feed, freshNextPage } = setup(async () => [card(1), card(2)]);

    const page = await feed.nextPage();

    expect(page).toEqual({ cards: [card(1), card(2)], done: false });
    expect(freshNextPage).not.toHaveBeenCalled();
  });

  it('continues with the fresh feed once the restored cards are shown', async () => {
    const { feed } = setup(async () => [card(1)]);
    await feed.nextPage();

    expect(await feed.nextPage()).toBe(FRESH_PAGE);
  });

  it('marks the restored cards as shown so the fresh feed never repeats them', async () => {
    const { feed, onRestored } = setup(async () => [card(1)]);

    await feed.nextPage();

    expect(onRestored).toHaveBeenCalledWith([card(1)]);
  });

  it('opens on the fresh feed when there is nothing to restore', async () => {
    const { feed, onRestored } = setup(async () => []);

    expect(await feed.nextPage()).toBe(FRESH_PAGE);
    expect(onRestored).not.toHaveBeenCalled();
  });

  it('opens on the fresh feed and reports it when restoring fails', async () => {
    const failure = new Error('disk');
    const { feed, onError } = setup(() => Promise.reject(failure));

    expect(await feed.nextPage()).toBe(FRESH_PAGE);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('serves a page asked for during the restore only after the restored one', async () => {
    const { feed, onRestored } = setup(async () => [card(1)]);

    const [first, second] = await Promise.all([feed.nextPage(), feed.nextPage()]);

    expect([first.cards[0], second]).toEqual([card(1), FRESH_PAGE]);
    expect(onRestored).toHaveBeenCalledTimes(1);
  });
});
