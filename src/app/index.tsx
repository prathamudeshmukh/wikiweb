import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import type { Card } from '../content/card';
import { ExploreScreen } from '../explore/ExploreScreen';
import { useInterests } from '../interests/InterestsContext';
import { useTangentQueue } from '../tangent/TangentContext';
import { useTheme } from '../theme/useTheme';

export default function Explore() {
  const { interests } = useInterests();
  const palette = useTheme();
  const router = useRouter();
  const tangents = useTangentQueue();
  const [incomingTangent, setIncomingTangent] = useState<Card | null>(null);

  // The reader hands over a tangent once its sheet has closed; hop into it right away.
  useEffect(
    () =>
      tangents.subscribe(() => {
        const card = tangents.take();
        if (card) setIncomingTangent(card);
      }),
    [tangents],
  );

  const openArticle = useCallback((card: Card) => router.push({ pathname: '/reader', params: { title: card.title } }), [router]);
  const tangentStarted = useCallback(() => setIncomingTangent(null), []);

  if (interests === undefined) return <View style={{ flex: 1, backgroundColor: palette.paper }} />;
  if (interests === null) return <Redirect href="/onboarding" />;
  return <ExploreScreen interests={interests} onOpenArticle={openArticle} incomingTangent={incomingTangent} onTangentStarted={tangentStarted} />;
}
