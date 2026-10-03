import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// Unlike useAppActive, iOS "inactive" (Control Centre, a system alert) is still a session: only background ends one.
const isForeground = (status: AppStateStatus) => status !== 'background';

/** Whether the app is in use, for analytics: false only once it is in the background. */
export function useAppForeground(): boolean {
  const [foreground, setForeground] = useState(() => isForeground(AppState.currentState));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => setForeground(isForeground(status)));
    return () => subscription.remove();
  }, []);
  return foreground;
}
