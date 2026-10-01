import { Fraunces_600SemiBold, Fraunces_600SemiBold_Italic, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { Literata_400Regular, Literata_600SemiBold } from '@expo-google-fonts/literata';

// SDK 57 can't select faces from variable fonts on iOS/Android (variable support lands in SDK 58),
// so each weight DESIGN.md §3 uses is loaded as its own static file. Fraunces' SOFT/WONK axes wait for SDK 58.
export const FONT_SOURCES = {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold,
  Literata_400Regular,
  Literata_600SemiBold,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
};

export const FONT = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  wordmark: 'Fraunces_700Bold',
  body: 'Literata_400Regular',
  bodyStrong: 'Literata_600SemiBold',
  mono: 'IBMPlexMono_500Medium',
  monoLight: 'IBMPlexMono_400Regular',
} as const;
