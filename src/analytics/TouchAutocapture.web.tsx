import type { PostHog } from 'posthog-react-native';
import type { ReactNode } from 'react';

/** The web captures no touches (SPEC.md §15.7), and has no native client to capture them with. */
export function TouchAutocapture({ children }: { client: PostHog; children: ReactNode }) {
  return children;
}
