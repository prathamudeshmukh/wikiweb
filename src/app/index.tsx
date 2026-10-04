import { Redirect, useIsFocused, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { Card } from '../content/card';
import { ExploreScreen } from '../explore/ExploreScreen';
import { useInterests } from '../interests/InterestsContext';
import { treeHref } from '../interests/treeTarget';
import type { NicheActions } from '../nudges/useHomeNudge';
import { useAppServices } from '../services/AppServices';
import { readerParamsFor } from '../reader/readerParams';
import { useResumeQueue, useTangentQueue } from '../tangent/TangentContext';
import type { Handoff, ResumePoint, Tangent } from '../tangent/tangentQueue';
import { useTheme } from '../theme/useTheme';

/** The latest request left for this screen; cleared once the screen has acted on it. */
function useHandoff<T>(handoff: Handoff<T>): [T | null, () => void] {
  const [request, setRequest] = useState<T | null>(null);
  useEffect(
    () =>
      handoff.subscribe(() => {
        const value = handoff.take();
        if (value) setRequest(value);
      }),
    [handoff],
  );
  const clear = useCallback(() => setRequest(null), []);
  return [request, clear];
}

export default function Explore() {
  const { interests, saveInterests } = useInterests();
  const { analytics } = useAppServices();
  const palette = useTheme();
  const router = useRouter();
  const isFocused = useIsFocused();
  // The reader hands over a tangent once its sheet has closed; the Logbook hands over an expedition to continue.
  const [incomingTangent, tangentStarted] = useHandoff<Tangent>(useTangentQueue());
  const [incomingResume, resumed] = useHandoff<ResumePoint>(useResumeQueue());

  const openArticle = useCallback((card: Card) => router.push({ pathname: '/reader', params: readerParamsFor(card) }), [router]);
  const openLogbook = useCallback(() => router.push('/logbook'), [router]);
  const niche: NicheActions = useMemo(
    () => ({
      addPicks: (picks, from) => saveInterests(picks, from),
      openTree: (target, from) => {
        analytics.track({ name: 'interest_tree_opened', properties: { tile: target.tileId, from } });
        router.push(treeHref(target));
      },
    }),
    [saveInterests, analytics, router],
  );

  if (interests === undefined) return <View style={{ flex: 1, backgroundColor: palette.paper }} />;
  if (interests === null) return <Redirect href="/onboarding" />;
  return (
    <ExploreScreen
      interests={interests}
      onOpenArticle={openArticle}
      onOpenLogbook={openLogbook}
      isFocused={isFocused}
      incomingTangent={incomingTangent}
      onTangentStarted={tangentStarted}
      incomingResume={incomingResume}
      onResumed={resumed}
      niche={niche}
    />
  );
}
