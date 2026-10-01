import { useColorScheme } from 'react-native';
import { NIGHT_ATLAS, PAPER, type Palette } from './tokens';

/** Follows the system appearance (DESIGN.md §2.4). An in-app override arrives with Settings. */
export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? NIGHT_ATLAS : PAPER;
}
