import { Redirect, Stack } from 'expo-router';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { useEffect, useSyncExternalStore } from 'react';
import { Text } from 'react-native';
import Onboarding from '../app/onboarding';

// A minimal saved-interests store: Home redirects to onboarding until picks exist, as src/app/index.tsx does.
let savedPicks: readonly string[] | null = null;
const listeners = new Set<() => void>();
const mockInterestsStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => savedPicks,
  save: (picks: readonly string[]) => {
    savedPicks = picks;
    listeners.forEach((listener) => listener());
  },
};

jest.mock('../interests/useSaveInterests', () => ({
  useSaveInterests: (onSaved: () => void) => async (picks: readonly string[]) => {
    mockInterestsStore.save(picks);
    onSaved();
  },
}));

jest.mock('./OnboardingScreen', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    OnboardingScreen: ({ onDone }: { onDone: (ids: readonly string[]) => void }) => (
      <Pressable onPress={() => onDone(['science', 'history', 'culture'])}>
        <Text>Continue</Text>
      </Pressable>
    ),
  };
});

let homeMounts = 0;

function HomeMountCounter() {
  useEffect(() => {
    homeMounts += 1;
    return () => {
      homeMounts -= 1;
    };
  }, []);
  return <Text>Home</Text>;
}

function Home() {
  const picks = useSyncExternalStore(mockInterestsStore.subscribe, mockInterestsStore.get);
  if (picks === null) return <Redirect href="/onboarding" />;
  return <HomeMountCounter />;
}

/**
 * Opens the app at `initialUrl` with no saved picks. Testing Library v14 renders asynchronously;
 * expo-router's helper doesn't await it.
 */
async function renderApp(initialUrl: string) {
  const router = renderRouter(
    {
      _layout: { default: () => <Stack screenOptions={{ headerShown: false }} />, unstable_settings: { initialRouteName: 'index' } },
      index: Home,
      onboarding: Onboarding,
    },
    { initialUrl },
  );
  await router;
  // Wrapped: returning the result itself would unwrap it, since it is also the render promise.
  return { router };
}

function stackRouteNames({ router }: Awaited<ReturnType<typeof renderApp>>) {
  return router.getRouterState()?.routes[0].state?.routes.map((route) => route.name);
}

beforeEach(() => {
  savedPicks = null;
  homeMounts = 0;
});

// Opening /onboarding directly (a reload mid-onboarding on web) builds the stack as [index, onboarding],
// because of the layout's initialRouteName; the Home underneath renders once the picks are saved.
describe.each(['/', '/onboarding'])('onboarding route, opened at %s', (initialUrl) => {
  it('lands on a single Home after the picks are saved', async () => {
    await renderApp(initialUrl);

    await fireEvent.press(screen.getByText('Continue'));

    expect(homeMounts).toBe(1);
  });

  it('leaves only Home in the stack', async () => {
    const app = await renderApp(initialUrl);

    await fireEvent.press(screen.getByText('Continue'));

    expect(stackRouteNames(app)).toEqual(['index']);
  });

  it('shows onboarding until the picks are saved', async () => {
    const { router } = await renderApp(initialUrl);

    expect(router.getPathname()).toBe('/onboarding');
  });
});
