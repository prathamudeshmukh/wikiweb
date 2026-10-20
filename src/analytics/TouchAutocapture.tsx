import { type PostHog, PostHogProvider } from 'posthog-react-native';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

// Touches only: screens are sent by route pattern (AnalyticsRoot), since automatic capture would include params.
// Every view showing an article title carries `ph-no-capture`, so taps on it send nothing (SPEC.md §11).
const AUTOCAPTURE = { captureTouches: true, captureScreens: false } as const;

export function TouchAutocapture({ client, children }: { client: PostHog; children: ReactNode }) {
  return (
    <PostHogProvider client={client} autocapture={AUTOCAPTURE} style={styles.root}>
      {children}
    </PostHogProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
