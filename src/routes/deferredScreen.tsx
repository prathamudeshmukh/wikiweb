import type { ComponentType } from 'react';
import { type ScreenName, type ScreenProps, SCREENS } from './screens';

/** Native bundles every screen up front (the bundle is on the device), so a deferred screen is the screen itself. */
export function deferredScreen<N extends ScreenName>(name: N): ComponentType<ScreenProps<N>> {
  return SCREENS[name] as ComponentType<ScreenProps<N>>;
}

export function preloadScreens(): void {}
