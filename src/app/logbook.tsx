import { useIsFocused, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useFindActions } from '../finds/useFindActions';
import { type TreeTarget, treeHref } from '../interests/treeTarget';
import { LogbookScreen } from '../logbook/LogbookScreen';
import { useAppServices } from '../services/AppServices';

export default function Logbook() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const findActions = useFindActions();
  const back = useCallback(() => router.back(), [router]);
  const openExpedition = useCallback((id: string) => router.push({ pathname: '/expedition/[id]', params: { id } }), [router]);
  const openSettings = useCallback(() => router.push('/settings'), [router]);
  const openFinds = useCallback(() => router.push('/finds'), [router]);
  const { analytics } = useAppServices();
  const openTree = useCallback(
    (target: TreeTarget) => {
      analytics.track({ name: 'interest_tree_opened', properties: { tile: target.tileId, from: 'completed' } });
      router.push(treeHref(target));
    },
    [analytics, router],
  );
  return (
    <LogbookScreen
      onBack={back}
      onOpenExpedition={openExpedition}
      onOpenSettings={openSettings}
      onOpenTree={openTree}
      onOpenFinds={openFinds}
      findActions={findActions}
      isFocused={isFocused}
    />
  );
}
