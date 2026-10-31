import type { FontSource } from 'expo-font';
import { FONT_SOURCES } from './fonts';

/** The faces the app loads, as `useFonts` takes them. */
export const LOADED_FONTS: Record<string, FontSource> = FONT_SOURCES;

/** Native holds the first frame until the fonts are in, so text never reflows. */
export const WAITS_FOR_FONTS = true;
