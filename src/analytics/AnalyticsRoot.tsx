import { useSegments } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { useAppForeground } from './useAppForeground';
import { useAppServices } from '../services/AppServices';
import { reportError } from '../services/reportError';
import { screenRoute } from './screenRoute';
import { TouchAutocapture } from './TouchAutocapture';

/** Screen views by route pattern; segments, unlike the pathname, keep `[id]` instead of the id. */
function useScreenViews() {
  const { analytics } = useAppServices();
  const route = screenRoute(useSegments());
  useEffect(() => analytics.screen(route), [analytics, route]);
}

/** Applies the saved opt-out, and reports an expedition under way whenever the app goes to the background. */
function useAnalyticsLifecycle() {
  const { analyticsConsent, journeys, expeditions } = useAppServices();
  const appForeground = useAppForeground();

  useEffect(() => {
    analyticsConsent.load().catch((error: unknown) => reportError('analytics.consent', error));
  }, [analyticsConsent]);

  useEffect(() => {
    if (appForeground) return;
    const { active } = journeys.getState();
    if (active) expeditions.ended(active, 'background');
  }, [appForeground, journeys, expeditions]);
}

/** Analytics around the whole app (SPEC.md §11): touch autocapture when sending, screen views, lifecycle. */
export function AnalyticsRoot({ children }: { children: ReactNode }) {
  const { analyticsClient } = useAppServices();
  useScreenViews();
  useAnalyticsLifecycle();
  if (!analyticsClient) return children;
  return <TouchAutocapture client={analyticsClient}>{children}</TouchAutocapture>;
}
