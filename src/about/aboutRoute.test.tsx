import { Redirect, Stack } from 'expo-router';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { memoryAnalytics } from '../analytics/__testing__/memoryAnalytics';
import { createAnalyticsConsent } from '../analytics/analyticsConsent';
import { AboutRoute } from '../routes/AboutRoute';

const mockConsent = createAnalyticsConsent(
  { getItem: async () => null, setItem: async () => undefined },
  memoryAnalytics(),
);

jest.mock('../services/AppServices', () => ({
  useAppServices: () => ({ analyticsConsent: mockConsent }),
}));

/** A new visitor: Home sends them to onboarding, as src/app/index.tsx does before any picks are saved. */
function Home() {
  return <Redirect href="/onboarding" />;
}

function Onboarding() {
  return <Text>Onboarding</Text>;
}

async function openApp(initialUrl: string) {
  const router = renderRouter(
    {
      _layout: { default: () => <Stack screenOptions={{ headerShown: false }} />, unstable_settings: { initialRouteName: 'index' } },
      index: Home,
      onboarding: Onboarding,
      about: AboutRoute,
    },
    { initialUrl },
  );
  await router;
  return { router };
}

describe('about route', () => {
  it('opens for a visitor who has not picked any interests, so it works as the public policy URL', async () => {
    const { router } = await openApp('/about');

    expect(router.getPathname()).toBe('/about');
  });

  it('leaves for the app when opened directly', async () => {
    const { router } = await openApp('/about');

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(router.getPathname()).toBe('/onboarding');
  });
});
