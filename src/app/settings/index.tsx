import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useInterests } from '../../interests/InterestsContext';
import { SettingsScreen } from '../../logbook/SettingsScreen';

export default function Settings() {
  const { interests } = useInterests();
  const router = useRouter();
  const back = useCallback(() => router.back(), [router]);
  const openInterests = useCallback(() => router.push('/settings/interests'), [router]);
  // Settings sits behind Home, which only renders once interests exist; `?? []` only covers the type.
  return <SettingsScreen interests={interests ?? []} onBack={back} onOpenInterests={openInterests} />;
}
