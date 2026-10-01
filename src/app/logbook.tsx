import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { LogbookScreen } from '../logbook/LogbookScreen';

export default function Logbook() {
  const router = useRouter();
  const back = useCallback(() => router.back(), [router]);
  const openExpedition = useCallback((id: string) => router.push({ pathname: '/expedition/[id]', params: { id } }), [router]);
  return <LogbookScreen onBack={back} onOpenExpedition={openExpedition} />;
}
