import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { useInterests } from './InterestsContext';

/**
 * Renders its children only once interests have loaded. Screens reached by deep link
 * would otherwise mount with no picks and keep that empty start.
 */
export function RequireInterests({ children }: { children: (interests: readonly string[]) => ReactNode }) {
  const { interests } = useInterests();
  if (interests === undefined) return null;
  if (interests === null) return <Redirect href="/onboarding" />;
  return children(interests);
}
