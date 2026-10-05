import { useIsFocused, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useFindActions } from '../finds/useFindActions';
import { FindsScreen } from '../logbook/FindsScreen';

export default function Finds() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const findActions = useFindActions();
  const back = useCallback(() => router.back(), [router]);
  return <FindsScreen onBack={back} findActions={findActions} isFocused={isFocused} />;
}
