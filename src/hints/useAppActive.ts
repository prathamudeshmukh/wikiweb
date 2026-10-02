import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// iOS reports "inactive" while the app switcher is open; nothing should animate behind it.
const isActive = (status: AppStateStatus) => status !== 'background' && status !== 'inactive';

/** Whether the app is in the foreground. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(() => isActive(AppState.currentState));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => setActive(isActive(status)));
    return () => subscription.remove();
  }, []);
  return active;
}
