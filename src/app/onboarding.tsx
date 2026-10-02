import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useSaveInterests } from '../interests/useSaveInterests';
import { OnboardingScreen } from '../onboarding/OnboardingScreen';

export default function Onboarding() {
  const router = useRouter();
  const goHome = useCallback(() => router.replace('/'), [router]);
  const save = useSaveInterests(goHome);
  return <OnboardingScreen onDone={(ids) => void save(ids)} />;
}
