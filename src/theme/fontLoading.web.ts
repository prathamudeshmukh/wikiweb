import { FontDisplay, type FontSource } from 'expo-font';
import Fraunces_600SemiBold_Italic from '../../assets/fonts/Fraunces_600SemiBold_Italic.woff2';
import Fraunces_600SemiBold from '../../assets/fonts/Fraunces_600SemiBold.woff2';
import Fraunces_700Bold from '../../assets/fonts/Fraunces_700Bold.woff2';
import IBMPlexMono_400Regular from '../../assets/fonts/IBMPlexMono_400Regular.woff2';
import IBMPlexMono_500Medium from '../../assets/fonts/IBMPlexMono_500Medium.woff2';
import Literata_400Regular from '../../assets/fonts/Literata_400Regular.woff2';
import Literata_600SemiBold from '../../assets/fonts/Literata_600SemiBold.woff2';
import type { FONT_SOURCES } from './fonts';

// The same faces as `fonts.ts`, as WOFF2: about half the bytes of the TTFs (`scripts/build-web-fonts.py`).
const WOFF2_FACES: Record<keyof typeof FONT_SOURCES, number> = {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold,
  Literata_400Regular,
  Literata_600SemiBold,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
};

// SPEC.md §15.9 — the faces would hold the first screen ~2 s on slow 4G. Draw with fallbacks and swap them in
// instead; card text is fitted by line height, not glyph metrics, so a swap never breaks a trim.
export const LOADED_FONTS: Record<string, FontSource> = Object.fromEntries(
  Object.entries(WOFF2_FACES).map(([name, module]) => [name, { uri: module, display: FontDisplay.SWAP }]),
);

export const WAITS_FOR_FONTS = false;
