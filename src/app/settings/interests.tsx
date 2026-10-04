import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RequireInterests } from '../../interests/RequireInterests';
import { parseTreeTarget } from '../../interests/treeTarget';
import { useSaveInterests } from '../../interests/useSaveInterests';
import { EditInterestsScreen } from '../../onboarding/EditInterestsScreen';

export default function EditInterests() {
  const router = useRouter();
  const { tile, subfield } = useLocalSearchParams();
  const initialTree = parseTreeTarget(tile, subfield) ?? undefined;
  const back = useCallback(() => router.back(), [router]);
  // Straight back to Home, so the rebuilt feed is the first thing the user sees.
  const goHome = useCallback(() => router.dismissTo('/'), [router]);
  const save = useSaveInterests(goHome, 'settings');
  return <RequireInterests>{(interests) => <EditInterestsScreen saved={interests} onSave={(picks) => void save(picks)} onBack={back} initialTree={initialTree} />}</RequireInterests>;
}
