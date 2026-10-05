import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';

const FADE_MS = 200;
const BOTTOM_GAP = 24;

export interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastProps {
  message: string;
  /** Drawn before the message, e.g. ✦ — glyphs the mono font lacks are drawn as icons. */
  icon?: ReactNode;
  /** One action at the right, e.g. Undo; without one the toast takes no touches. */
  action?: ToastAction;
}

/** A short ink pill at the bottom of the screen (DESIGN.md §5.14); announced to screen readers. */
export function Toast({ message, icon, action }: ToastProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeIn.duration(FADE_MS)}
      exiting={FadeOut.duration(FADE_MS)}
      pointerEvents={action ? 'box-none' : 'none'}
      style={[styles.toast, { backgroundColor: palette.ink, bottom: insets.bottom + BOTTOM_GAP }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      {icon}
      <Text style={[styles.text, { color: palette.card }]}>{message.toUpperCase()}</Text>
      {action && (
        <Pressable onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={LAYOUT.toastActionSlop} style={styles.action}>
          <Text style={[styles.text, styles.actionText, { color: palette.card }]}>{action.label.toUpperCase()}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16, maxWidth: '90%',
  },
  text: { fontFamily: FONT.mono, ...TYPE.meta, textAlign: 'center' },
  action: { marginLeft: 4 },
  actionText: { textDecorationLine: 'underline' },
});
