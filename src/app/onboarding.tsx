import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useInterests } from '../interests/InterestsContext';
import { OnboardingScreen } from '../onboarding/OnboardingScreen';
import { reportError } from '../services/reportError';

export default function Onboarding() {
  const { saveInterests } = useInterests();
  const router = useRouter();

  const finish = useCallback(
    async (tileIds: readonly string[]) => {
      try {
        await saveInterests(tileIds);
        router.replace('/');
      } catch (error) {
        reportError('interests.save', error);
        Alert.alert('Couldn’t save your picks', 'Please try again.');
      }
    },
    [saveInterests, router],
  );

  return <OnboardingScreen onDone={(ids) => void finish(ids)} />;
}
