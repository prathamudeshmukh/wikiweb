import { Redirect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ReaderScreen } from '../reader/ReaderScreen';
import { cardFromArticle, useTangentQueue } from '../tangent/TangentContext';
import type { Card } from '../content/card';
import type { Article } from '../wiki-api/types';

// If the closing animation's end event never arrives, hand the tangent over anyway after this long.
const TANGENT_HANDOFF_FALLBACK_MS = 600;

export default function Reader() {
  const { title } = useLocalSearchParams<{ title: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const tangents = useTangentQueue();
  const pending = useRef<Card | null>(null);

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
      pending.current = cardFromArticle(article);
      router.back();
      setTimeout(handOff, TANGENT_HANDOFF_FALLBACK_MS);
    },
    [router, handOff],
  );

  // Reached without an article (e.g. a stale deep link): there's nothing to read.
  if (!title) return <Redirect href="/" />;
  return <ReaderScreen initialTitle={title} onTangent={takeTangent} onClose={close} />;
}
