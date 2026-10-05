import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT } from '../theme/fonts';
import { TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';

const FADE_MS = 200;
const BOTTOM_GAP = 24;

/** A short ink pill at the bottom of the screen (DESIGN.md §5.14); announced to screen readers. */
export function Toast({ message }: { message: string }) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeIn.duration(FADE_MS)}
      exiting={FadeOut.duration(FADE_MS)}
      pointerEvents="none"
      style={[styles.toast, { backgroundColor: palette.ink, bottom: insets.bottom + BOTTOM_GAP }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={[styles.text, { color: palette.card }]}>{message.toUpperCase()}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', alignSelf: 'center', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16, maxWidth: '90%' },
  text: { fontFamily: FONT.mono, ...TYPE.meta, textAlign: 'center' },
});
