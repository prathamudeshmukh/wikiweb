import type { ComponentProps } from 'react';
import { EditInterestsRoute } from './EditInterestsRoute';
import { ExpeditionRoute } from './ExpeditionRoute';
import { FindsRoute } from './FindsRoute';
import { HomeRoute } from './HomeRoute';
import { LogbookRoute } from './LogbookRoute';
import { ReaderRoute } from './ReaderRoute';
import { SettingsRoute } from './SettingsRoute';

// Every screen but onboarding, behind one module so the web build fetches them as a single chunk (SPEC.md §15.9).
export const SCREENS = { EditInterestsRoute, ExpeditionRoute, FindsRoute, HomeRoute, LogbookRoute, ReaderRoute, SettingsRoute };

// Web only: the app root there is a plain view, so screens bring gesture-handler's root with their chunk.
export { GestureHandlerRootView as GestureRoot } from 'react-native-gesture-handler';

export type Screens = typeof SCREENS;
export type ScreenName = keyof Screens;
/** What a screen takes, as an object type so it can be spread onto the screen. */
export type ScreenProps<N extends ScreenName> = ComponentProps<Screens[N]> & object;
