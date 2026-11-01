import { View, type ViewProps } from 'react-native';

/**
 * A plain view on web: gesture-handler (and the reanimated it pulls in) stays out of the first screen's bundle
 * (SPEC.md §15.9). Screens that swipe bring their own gesture root with them (`deferredScreen.web.tsx`).
 */
export function AppRoot(props: ViewProps) {
  return <View {...props} />;
}
