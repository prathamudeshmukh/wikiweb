import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RequireInterests } from '../../interests/RequireInterests';
import { useSaveInterests } from '../../interests/useSaveInterests';
import { EditInterestsScreen } from '../../onboarding/EditInterestsScreen';

export default function EditInterests() {
  const router = useRouter();
  const back = useCallback(() => router.back(), [router]);
  // Straight back to Home, so the rebuilt feed is the first thing the user sees.
  const goHome = useCallback(() => router.dismissTo('/'), [router]);
  const save = useSaveInterests(goHome);
  return <RequireInterests>{(interests) => <EditInterestsScreen saved={interests} onSave={(ids) => void save(ids)} onBack={back} />}</RequireInterests>;
}
