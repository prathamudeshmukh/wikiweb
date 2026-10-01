import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LAYOUT } from '../theme/layout';
import { useTheme } from '../theme/useTheme';

interface SkeletonCardProps {
  width: number;
  height: number;
}

const PULSE_MS = 900;
const PULSE_MIN_OPACITY = 0.45;
// Placeholder text lines, as a fraction of the card's inner width.
const LINE_WIDTHS = ['70%', '40%', '100%', '92%', '96%', '60%'] as const;

/** Stands in for the first card while a column loads (DESIGN.md §6.7). */
export function SkeletonCard({ width, height }: SkeletonCardProps) {
  const palette = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!reduceMotion) opacity.value = withRepeat(withTiming(PULSE_MIN_OPACITY, { duration: PULSE_MS }), -1, true);
  }, [reduceMotion, opacity]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      style={[styles.card, { width, height, backgroundColor: palette.card, borderColor: palette.line }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading cards"
    >
      <Animated.View style={[styles.inner, pulseStyle]}>
        <View style={[styles.image, { backgroundColor: palette.line }]} />
        {LINE_WIDTHS.map((lineWidth, i) => (
          <View key={i} style={[styles.line, { width: lineWidth, backgroundColor: palette.line }]} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: LAYOUT.gutter, borderRadius: LAYOUT.cardRadius, borderWidth: StyleSheet.hairlineWidth, padding: LAYOUT.cardPadding },
  inner: { gap: 14 },
  image: { width: '100%', aspectRatio: LAYOUT.imageAspect, borderRadius: LAYOUT.imageRadius },
  line: { height: 12, borderRadius: 6 },
});
