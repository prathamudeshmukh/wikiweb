import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { columnPathTo } from '../../journeys/expedition';
import { RecapScreen } from '../../logbook/RecapScreen';
import { useAppServices } from '../../services/AppServices';
import { reportError } from '../../services/reportError';
import { useResumeQueue } from '../../tangent/TangentContext';

export default function ExpeditionRecap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { journeys } = useAppServices();
  const resumes = useResumeQueue();

  const back = useCallback(() => router.back(), [router]);
  // Make the expedition active again, then hand its columns to the explore screen underneath and return to it.
  const continueAt = useCallback(
    (journeyId: string, nodeId: string) => {
      journeys
        .resume(journeyId)
        .then((expedition) => {
          const path = expedition ? columnPathTo(expedition.nodes, nodeId) : [];
          if (path.length > 0) resumes.request(path);
          router.dismissTo('/');
        })
        .catch((error: unknown) => reportError('logbook.resume', error));
    },
    [journeys, resumes, router],
  );

  if (!id) return <Redirect href="/logbook" />;
  return <RecapScreen journeyId={id} onBack={back} onContinue={continueAt} />;
}
