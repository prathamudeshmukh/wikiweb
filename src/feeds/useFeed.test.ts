import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Card } from '../content/card';
import type { Feed, FeedPage } from '../content/pagedFeed';
import { useFeed } from './useFeed';

const card = (title: string): Card => ({
  pageId: title.length * 7919 + title.charCodeAt(0),
  title,
  description: null,
  extract: `${title} text`,
  thumbnail: null,
  topic: { tileId: null, territory: 'cosmos' },
  topicIsFallback: true,
  incomingLinks: null,
  source: 'link',
  visited: false,
  read: false,
});

/** A feed that serves the given pages in order; an Error entry rejects that call. */
function scriptedFeed(pages: (FeedPage | Error)[]): Feed & { calls: number } {
  const feed = {
    calls: 0,
    async nextPage() {
      const next = pages[feed.calls];
      feed.calls += 1;
      if (!next) return { cards: [], done: true };
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return feed;
}

describe('useFeed', () => {
  it('loads the first page on mount', async () => {
    const feed = scriptedFeed([{ cards: [card('Squid')], done: false }]);

    const { result } = await renderHook(() => useFeed(feed));

    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(result.current.cards.map((c) => c.title)).toEqual(['Squid']);
  });

  it('appends the next page when asked for more', async () => {
    const feed = scriptedFeed([{ cards: [card('Squid')], done: false }, { cards: [card('Ink')], done: false }]);
    const { result } = await renderHook(() => useFeed(feed));
    await waitFor(() => expect(result.current.status).toBe('idle'));

    await act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.cards.map((c) => c.title)).toEqual(['Squid', 'Ink']));
  });

  it('reports done when the feed has nothing more', async () => {
    const feed = scriptedFeed([{ cards: [card('Squid')], done: true }]);

    const { result } = await renderHook(() => useFeed(feed));

    await waitFor(() => expect(result.current.status).toBe('done'));
  });

  it('keeps asking when a page comes back empty but the feed is not done', async () => {
    const feed = scriptedFeed([{ cards: [], done: false }, { cards: [card('Squid')], done: false }]);

    const { result } = await renderHook(() => useFeed(feed));

    await waitFor(() => expect(result.current.cards.map((c) => c.title)).toEqual(['Squid']));
  });

  it('shows an error and recovers on retry', async () => {
    const feed = scriptedFeed([new Error('offline'), { cards: [card('Squid')], done: false }]);
    const { result } = await renderHook(() => useFeed(feed));
    await waitFor(() => expect(result.current.status).toBe('error'));

    await act(() => result.current.retry());

    await waitFor(() => expect(result.current.cards.map((c) => c.title)).toEqual(['Squid']));
    expect(result.current.error).toBeNull();
  });

  it('does not request another page while one is loading', async () => {
    let releaseSecond: (page: FeedPage) => void = () => undefined;
    const second = new Promise<FeedPage>((resolve) => {
      releaseSecond = resolve;
    });
    const feed = { calls: 0, nextPage: async () => (++feed.calls === 1 ? { cards: [card('Squid')], done: false } : second) };
    const { result } = await renderHook(() => useFeed(feed));
    await waitFor(() => expect(result.current.status).toBe('idle'));

    await act(() => {
      result.current.loadMore();
      result.current.loadMore();
      result.current.loadMore();
    });
    await act(() => releaseSecond({ cards: [card('Ink')], done: false }));

    expect(feed.calls).toBe(2);
  });
});
