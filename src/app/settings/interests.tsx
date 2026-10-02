import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useInterests } from '../../interests/InterestsContext';
import { useSaveInterests } from '../../interests/useSaveInterests';
import { EditInterestsScreen } from '../../onboarding/EditInterestsScreen';

export default function EditInterests() {
  const { interests } = useInterests();
  const router = useRouter();
  const back = useCallback(() => router.back(), [router]);
  // Straight back to Home, so the rebuilt feed is the first thing the user sees.
  const goHome = useCallback(() => router.dismissTo('/'), [router]);
  const save = useSaveInterests(goHome);
  return <EditInterestsScreen saved={interests ?? []} onSave={(ids) => void save(ids)} onBack={back} />;
}
