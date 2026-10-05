import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';

interface TopicLabelButtonProps {
  label: string;
  color: string;
  onPress: () => void;
  /** The card's own tap, which a tap on the label must not also trigger. */
  blocks: GestureType;
  enabled: boolean;
}

// DESIGN.md §5.15 — a hairline pill fills behind the label while pressed; no resting cue.
const PRESS_IN_MS = 120;
const PRESS_OUT_MS = 200;
const LABEL_HEIGHT = TYPE.meta.lineHeight;
const VERTICAL_SLOP = (LAYOUT.minTouchTarget - LABEL_HEIGHT) / 2;

/** `● PHILOSOPHY` on a card whose tile has a tree: tapping it opens that tile's tree (SPEC.md §3.9). */
export function TopicLabelButton({ label, color, onPress, blocks, enabled }: TopicLabelButtonProps) {
  const palette = useTheme();
  const pressed = useSharedValue(0);
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(enabled)
        .withTestId('topic-label')
        .hitSlop({ vertical: VERTICAL_SLOP })
        .blocksExternalGesture(blocks)
        .onBegin(() => {
          pressed.set(withTiming(1, { duration: PRESS_IN_MS }));
        })
        .onFinalize(() => {
          pressed.set(withTiming(0, { duration: PRESS_OUT_MS }));
        })
        .onEnd((_event, success) => {
          if (success) scheduleOnRN(onPress);
        }),
    [enabled, blocks, onPress, pressed],
  );
  const pillStyle = useAnimatedStyle(() => ({ opacity: pressed.value }));
  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={styles.hit}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.pill, { backgroundColor: palette.line }, pillStyle]} />
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          ● {label.toUpperCase()}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: { paddingHorizontal: 8, paddingVertical: 4, marginHorizontal: -8, marginVertical: -4, flexShrink: 0 },
  pill: { borderRadius: 999 },
  label: { fontFamily: FONT.mono, ...TYPE.meta },
});
