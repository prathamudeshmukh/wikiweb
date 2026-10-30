import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useSaveInterests } from '../interests/useSaveInterests';
import { OnboardingScreen } from '../onboarding/OnboardingScreen';

export default function Onboarding() {
  const router = useRouter();
  // Pops to the Home that a direct load of /onboarding leaves beneath it, rather than stacking a second one.
  const goHome = useCallback(() => router.dismissTo('/'), [router]);
  const save = useSaveInterests(goHome, 'onboarding');
  return <OnboardingScreen onDone={(ids) => void save(ids)} />;
}
