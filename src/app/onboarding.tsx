import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { PRIVACY_SECTION } from '../about/aboutLinks';
import { useUsageSharing } from '../analytics/useUsageSharing';
import { useSaveInterests } from '../interests/useSaveInterests';
import { DEFAULT_INTERESTS } from '../onboarding/interestSelection';
import { OnboardingScreen } from '../onboarding/OnboardingScreen';
import { useAppServices } from '../services/AppServices';

export default function Onboarding() {
  const router = useRouter();
  const { analytics } = useAppServices();
  useEffect(() => analytics.track({ name: 'onboarding_viewed', properties: {} }), [analytics]);
  // Pops to the Home that a direct load of /onboarding leaves beneath it, rather than stacking a second one.
  const goHome = useCallback(() => router.dismissTo('/'), [router]);
  const save = useSaveInterests(goHome, 'onboarding');
  // Recorded as `skip`, the value analytics has used since before Just start replaced Skip.
  const saveDefaults = useSaveInterests(goHome, 'skip');
  const usage = useUsageSharing();
  // Pushed, so Back returns to the tiles with the picks still in place.
  const openPrivacy = useCallback(() => router.push({ pathname: '/about', params: { section: PRIVACY_SECTION } }), [router]);
  return (
    <OnboardingScreen
      onDone={(ids) => void save(ids)}
      onJustStart={() => void saveDefaults(DEFAULT_INTERESTS)}
      onOpenPrivacy={openPrivacy}
      usage={usage}
    />
  );
}
