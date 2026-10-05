import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useReaderTrail } from '../journeys/useReaderTrail';
import { parseReaderParams } from '../reader/readerParams';
import { ReaderScreen } from '../reader/ReaderScreen';
import { cardFromArticle } from '../tangent/TangentContext';
import { useTangentOnClose } from '../tangent/useTangentOnClose';
import type { Article } from '../wiki-api/types';

export default function Reader() {
  const params = useLocalSearchParams<{ title: string; pageId: string; tileId?: string }>();
  const target = useMemo(() => parseReaderParams(params), [params]);
  const router = useRouter();
  const trail = useReaderTrail(target);
  const tangentOnClose = useTangentOnClose();

  const close = useCallback(() => router.back(), [router]);
  const takeTangent = useCallback(
    (article: Article) => tangentOnClose({ card: cardFromArticle(article), fromNodeId: trail.tangentOrigin() }, close),
    [tangentOnClose, trail, close],
  );

  // Reached without a usable article (e.g. a stale deep link): there's nothing to read.
  if (!target) return <Redirect href="/" />;
  return <ReaderScreen initialPage={{ ...target.page, ...target.knownTopic }} onTangent={takeTangent} onReadLink={trail.readInPlace} onClose={close} />;
}
