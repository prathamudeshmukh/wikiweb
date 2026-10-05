import type { ViewToken } from 'react-native';
import { makeArticle } from '../content/__testing__/fakeWikiApi';
import { type Card, toCard } from '../content/card';
import type { ColumnPrefetcher } from './columnPrefetch';
import { childEntry, initialStack, topOf } from './columnStack';
import { applyDwell } from './dwellPrefetch';

const HOME = topOf(initialStack());

const card = (title: string): Card =>
  toCard(makeArticle(title), { ref: { title }, source: 'link', fallbackTopic: { tileId: 'animals', territory: 'life' } }, { visitedIds: new Set(), readIds: new Set() });

const token = (item: Card, isViewable: boolean, index = 0): ViewToken<Card> => ({ item, key: String(item.pageId), index, isViewable });
const visits = () => ({ cardSeen: jest.fn() });

function fakePrefetcher() {
  const prefetched: string[] = [];
  const cancelled: string[] = [];
  const prefetcher: ColumnPrefetcher = {
    prefetch: (entry) => {
      prefetched.push(entry.id);
    },
    cancel: (id) => {
      cancelled.push(id);
    },
    take: () => null,
    release: () => undefined,
  };
  return { prefetcher, prefetched, cancelled };
}

const columnOf = (item: Card) => childEntry(HOME, { ref: item, topic: item.topic }).id;

describe('applyDwell', () => {
  it('prefetches the column of a card the user has dwelt on', () => {
    const { prefetcher, prefetched } = fakePrefetcher();
    const squid = card('Squid');

    applyDwell({ prefetcher, parent: HOME, visits: visits() }, [token(squid, true)]);

    expect(prefetched).toEqual([columnOf(squid)]);
  });

  it('cancels the prefetch of a card scrolled away from', () => {
    const { prefetcher, cancelled, prefetched } = fakePrefetcher();
    const squid = card('Squid');

    applyDwell({ prefetcher, parent: HOME, visits: visits() }, [token(squid, false)]);

    expect(cancelled).toEqual([columnOf(squid)]);
    expect(prefetched).toEqual([]);
  });

  it('reports a dwelt-on card as seen, at its place in the column', () => {
    const { prefetcher } = fakePrefetcher();
    const seen = visits();
    const squid = card('Squid');

    applyDwell({ prefetcher, parent: HOME, visits: seen }, [token(squid, true, 4), token(card('Ink'), false, 5)]);

    expect(seen.cardSeen).toHaveBeenCalledTimes(1);
    expect(seen.cardSeen).toHaveBeenCalledWith(HOME.id, squid, 4);
  });
});
