import { useCallback, useEffect, useRef } from 'react';
import { useAppServices } from '../services/AppServices';
import { cardFromArticle } from '../tangent/TangentContext';
import type { ReaderTarget } from '../reader/readerParams';
import type { Article } from '../wiki-api/types';
import { nodePageOf } from './nodePages';

/**
 * The reader's part in the Journey (SPEC.md §3.4): everything opened is marked read, articles read from
 * a peek card join the expedition, and a tangent leaves from wherever the reader has got to.
 */
export function useReaderTrail(target: ReaderTarget | null) {
  const { journeys, analytics } = useAppServices();
  // The column the reader was opened over; moves along as peeked articles are read in place.
  const at = useRef(journeys.focusedNodeId());

  const pageId = target?.page.pageId;
  useEffect(() => {
    if (target) journeys.markRead(target.page, target.knownTopic);
    // Mark once per opened article, not on every re-render's fresh params object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys, pageId]);

  const readInPlace = useCallback(
    (article: Article) => {
      const node = journeys.peekRead(at.current, nodePageOf(cardFromArticle(article)));
      if (node) at.current = node.id;
      journeys.markRead(article, null);
      analytics.track({ name: 'read_open', properties: { entry: 'peek_read', card_title: article.title } });
    },
    [journeys, analytics],
  );

  const tangentOrigin = useCallback(() => at.current, []);

  return { readInPlace, tangentOrigin };
}
