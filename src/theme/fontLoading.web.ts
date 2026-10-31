import { FontDisplay, type FontSource } from 'expo-font';
import { FONT_SOURCES } from './fonts';

// SPEC.md §15.9 — the faces are ~470 KB, ~2 s on slow 4G before the first screen. Draw with fallbacks and swap
// them in instead; card text is fitted by line height, not glyph metrics, so a swap never breaks a trim.
export const LOADED_FONTS: Record<string, FontSource> = Object.fromEntries(
  Object.entries(FONT_SOURCES).map(([name, module]) => [name, { uri: module, display: FontDisplay.SWAP }]),
);

export const WAITS_FOR_FONTS = false;
