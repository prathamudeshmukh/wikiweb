import { Redirect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useReaderTrail } from '../journeys/useReaderTrail';
import { parseReaderParams } from '../reader/readerParams';
import { ReaderScreen } from '../reader/ReaderScreen';
import { cardFromArticle, useTangentQueue } from '../tangent/TangentContext';
import type { Tangent } from '../tangent/tangentQueue';
import type { Article } from '../wiki-api/types';

// If the closing animation's end event never arrives, hand the tangent over anyway after this long.
const TANGENT_HANDOFF_FALLBACK_MS = 600;

export default function Reader() {
  const params = useLocalSearchParams<{ title: string; pageId: string; tileId?: string }>();
  const target = useMemo(() => parseReaderParams(params), [params]);
  const router = useRouter();
  const navigation = useNavigation();
  const tangents = useTangentQueue();
  const trail = useReaderTrail(target);
  const pending = useRef<Tangent | null>(null);

  // Hand the tangent to the explore screen only once this sheet has finished closing, so the hop's
  // flight plays over the columns instead of behind the dismissing sheet (SPEC.md §3.4).
  const handOff = useCallback(() => {
    if (!pending.current) return;
    tangents.request(pending.current);
    pending.current = null;
  }, [tangents]);

  // The native stack's transitionEnd event isn't in expo-router's generic navigation typings.
  useEffect(() => navigation.addListener('transitionEnd' as never, handOff), [navigation, handOff]);

  const close = useCallback(() => router.back(), [router]);
  const takeTangent = useCallback(
    (article: Article) => {
      pending.current = { card: cardFromArticle(article), fromNodeId: trail.tangentOrigin() };
      router.back();
      setTimeout(handOff, TANGENT_HANDOFF_FALLBACK_MS);
    },
    [router, handOff, trail],
  );

  // Reached without a usable article (e.g. a stale deep link): there's nothing to read.
  if (!target) return <Redirect href="/" />;
  return <ReaderScreen initialTitle={target.page.title} onTangent={takeTangent} onReadLink={trail.readInPlace} onClose={close} />;
}
