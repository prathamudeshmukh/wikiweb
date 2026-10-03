import { idOf } from '../../content/__testing__/fakeWikiApi';
import type { Card } from '../../content/card';
import type { ColumnEntry } from '../../explore/columnStack';
import type { PageRef } from '../../wiki-api/types';

export function makeCard(title: string, overrides: Partial<Card> = {}): Card {
  return {
    pageId: idOf(title),
    title,
    description: null,
    extract: null,
    thumbnail: null,
    topic: { tileId: 'animals', territory: 'life' },
    topicIsFallback: false,
    incomingLinks: 1200,
    source: 'link',
    visited: false,
    read: false,
    ...overrides,
  };
}

const pageOf = (title: string): PageRef => ({ pageId: idOf(title), title });

/** A column entry seeded by the last of `path` (Home when empty). */
export function makeEntry(...path: string[]): ColumnEntry {
  const refs = path.map(pageOf);
  return {
    id: refs.length ? refs.map((ref) => ref.pageId).join('>') : 'home',
    seed: refs[refs.length - 1] ?? null,
    seedTopic: { tileId: null, territory: null },
    seedThumbnailUrl: null,
    seedQuote: null,
    path: refs,
    nodeId: null,
  };
}
