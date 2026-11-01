import { type ComponentType, lazy, Suspense } from 'react';
import { View, type ViewProps } from 'react-native';
import { reportError } from '../services/reportError';
import { useTheme } from '../theme/useTheme';
import type { ScreenName, ScreenProps, Screens } from './screens';

type ScreensModule = { SCREENS: Screens; GestureRoot: ComponentType<ViewProps> };

function Blank() {
  return <View style={{ flex: 1, backgroundColor: useTheme().paper }} />;
}

/**
 * Screens fetched on demand, all from one load: the first screen (onboarding, or Home's gate) draws without them
 * (SPEC.md §15.9). A failed load is forgotten, so the next screen asks again.
 */
export function deferredScreens(load: () => Promise<ScreensModule>) {
  let loading: Promise<ScreensModule> | null = null;
  const loadOnce = () =>
    (loading ??= load().catch((error: unknown) => {
      loading = null;
      throw error;
    }));

  return {
    screen<N extends ScreenName>(name: N): ComponentType<ScreenProps<N>> {
      const Screen = lazy(async () => {
        const { SCREENS, GestureRoot: Root } = await loadOnce();
        const Loaded = SCREENS[name] as ComponentType<ScreenProps<N>>;
        return {
          default: (props: ScreenProps<N>) => (
            <Root style={{ flex: 1 }}>
              <Loaded {...props} />
            </Root>
          ),
        };
      });
      return function DeferredScreen(props: ScreenProps<N>) {
        return (
          <Suspense fallback={<Blank />}>
            <Screen {...props} />
          </Suspense>
        );
      };
    },
    /** Starts fetching early — while the visitor reads onboarding — so the next screen is ready when they get there. */
    preload() {
      loadOnce().catch((error: unknown) => reportError('routes.preload', error));
    },
  };
}

const screens = deferredScreens(() => import('./screens'));

export const deferredScreen = screens.screen;
export const preloadScreens = screens.preload;
