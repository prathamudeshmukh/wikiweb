import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RequireInterests } from '../../interests/RequireInterests';
import { SettingsScreen } from '../../logbook/SettingsScreen';

export default function Settings() {
  const router = useRouter();
  const back = useCallback(() => router.back(), [router]);
  const openInterests = useCallback(() => router.push('/settings/interests'), [router]);
  return <RequireInterests>{(interests) => <SettingsScreen interests={interests} onBack={back} onOpenInterests={openInterests} />}</RequireInterests>;
}
