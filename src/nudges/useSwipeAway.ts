import { useMemo } from 'react';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { GESTURE } from '../explore/hopController';
import { LAYOUT } from '../theme/layout';

interface SwipeAwayOptions {
  width: number;
  enabled: boolean;
  /** Called once the card has slid off to the right. */
  onDismiss: () => void;
  /** The column's own right-swipe, which this card's swipe takes over. */
  columnPan: GestureType;
}

const DISMISS_MS = 220;

/** A nudge card's swipe right (DESIGN.md §5.14): it slides off instead of the Home rubber band. */
export function useSwipeAway({ width, enabled, onDismiss, columnPan }: SwipeAwayOptions) {
  const tx = useSharedValue(0);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetX([-GESTURE.unreachable, GESTURE.lockSlop])
        .failOffsetX([-GESTURE.lockSlop, GESTURE.unreachable])
        .failOffsetY([-GESTURE.lockSlop, GESTURE.lockSlop])
        .blocksExternalGesture(columnPan)
        .onUpdate((e) => {
          tx.set(Math.max(0, e.translationX));
        })
        .onEnd((e) => {
          const commit = tx.get() >= width * GESTURE.commitRatio || e.velocityX >= GESTURE.commitVelocity;
          if (!commit) {
            tx.set(withSpring(0, GESTURE.spring));
            return;
          }
          tx.set(
            withTiming(width + LAYOUT.gutter * 2, { duration: DISMISS_MS }, (finished) => {
              if (finished) scheduleOnRN(onDismiss);
            }),
          );
        }),
    [enabled, width, columnPan, onDismiss, tx],
  );
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return { pan, slideStyle };
}
