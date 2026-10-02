import type { ViewToken } from 'react-native';
import { makeArticle } from '../content/__testing__/fakeWikiApi';
import { type Card, toCard } from '../content/card';
import type { ColumnPrefetcher } from './columnPrefetch';
import { childEntry, initialStack, topOf } from './columnStack';
import { applyDwell } from './dwellPrefetch';

const HOME = topOf(initialStack());

const card = (title: string): Card =>
  toCard(makeArticle(title), { ref: { title }, source: 'link', fallbackTopic: { tileId: 'animals', territory: 'life' } }, { visitedIds: new Set(), readIds: new Set() });

const token = (item: Card, isViewable: boolean): ViewToken<Card> => ({ item, key: String(item.pageId), index: 0, isViewable });

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

    applyDwell({ prefetcher, parent: HOME }, [token(squid, true)]);

    expect(prefetched).toEqual([columnOf(squid)]);
  });

  it('cancels the prefetch of a card scrolled away from', () => {
    const { prefetcher, cancelled, prefetched } = fakePrefetcher();
    const squid = card('Squid');

    applyDwell({ prefetcher, parent: HOME }, [token(squid, false)]);

    expect(cancelled).toEqual([columnOf(squid)]);
    expect(prefetched).toEqual([]);
  });
});
