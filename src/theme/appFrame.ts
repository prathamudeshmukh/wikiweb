import { Platform, useWindowDimensions } from 'react-native';

/** The area the app draws in, and how far it sits from the window's left edge. */
export interface AppFrame {
  width: number;
  height: number;
  left: number;
}

/** Web: on a wide screen the app is a centred phone-width column (SPEC.md §15.1). Native fills the screen. */
export const APP_MAX_WIDTH = Platform.OS === 'web' ? 480 : Infinity;

export function appFrame(window: { width: number; height: number }, maxWidth: number): AppFrame {
  const width = Math.min(window.width, maxWidth);
  return { width, height: window.height, left: Math.floor((window.width - width) / 2) };
}

/** The app's frame, for anything sized or positioned against the screen. Page coordinates subtract `left`. */
export function useAppFrame(): AppFrame {
  const { width, height } = useWindowDimensions();
  return appFrame({ width, height }, APP_MAX_WIDTH);
}
