import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { PRIVACY_SECTION } from '../about/aboutLinks';
import { AboutScreen } from '../about/AboutScreen';
import { useUsageSharing } from '../analytics/useUsageSharing';
import { appSignature } from '../config/appSignature';

/** Outside the interests gate: a store reviewer or a visitor from a link reads it without onboarding (SPEC.md §3.11). */
export function AboutRoute() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const usage = useUsageSharing();
  const signature = useMemo(() => appSignature(), []);
  // Opened directly (the public policy URL), there's nothing to go back to: go into the app instead.
  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);
  return <AboutScreen onBack={back} usage={usage} signature={signature} startAtPrivacy={section === PRIVACY_SECTION} />;
}
