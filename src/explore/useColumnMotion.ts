import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { LAYOUT } from '../theme/layout';
import { GESTURE } from './hopController';

interface ColumnMotionOptions {
  isHome: boolean;
  isTop: boolean;
  screenWidth: number;
  /** Hop progress while this column is flying in; null once it is part of the stack. */
  entry: SharedValue<number> | null;
  onBack: () => void;
}

// The first card starts rising a little after the column starts sliding in.
const RISE_RANGE = [0.15, 1];

/**
 * A column's own movement: following the hop in, the right-swipe back gesture, and Home's rubber band.
 * The incoming spring is overshoot-clamped so the parent never shows at the right edge (M0 finding).
 */
export function useColumnMotion({ isHome, isTop, screenWidth, entry, onBack }: ColumnMotionOptions) {
  // A column mounted for a hop waits offscreen for the flight; one mounted already in the stack (Home, or the
  // columns of a resumed expedition) starts in place.
  const fliesIn = !isHome && entry !== null;
  const x = useSharedValue(fliesIn ? screenWidth : 0);
  const rise = useSharedValue(fliesIn ? LAYOUT.firstCardRiseOffset : 0);

  useAnimatedReaction(
    () => (entry ? entry.value : null),
    (progress) => {
      if (progress === null) return;
      x.value = (1 - progress) * screenWidth;
      rise.value = interpolate(progress, RISE_RANGE, [LAYOUT.firstCardRiseOffset, 0], Extrapolation.CLAMP);
    },
  );

  const backPan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isTop)
        .activeOffsetX([-GESTURE.unreachable, GESTURE.lockSlop])
        .failOffsetX([-GESTURE.lockSlop, GESTURE.unreachable])
        .failOffsetY([-GESTURE.lockSlop, GESTURE.lockSlop])
        .onUpdate((e) => {
          const dx = Math.max(0, e.translationX);
          x.value = isHome ? LAYOUT.homeRubberBandMax * (1 - Math.exp(-dx / LAYOUT.homeRubberBandFalloff)) : dx;
        })
        .onEnd((e) => {
          const commit = !isHome && (x.value >= screenWidth * GESTURE.commitRatio || e.velocityX >= GESTURE.commitVelocity);
          if (!commit) {
            x.value = withSpring(0, GESTURE.spring);
            return;
          }
          x.value = withTiming(screenWidth, { duration: LAYOUT.backCommitDurationMs }, (finished) => {
            if (finished) scheduleOnRN(onBack);
          });
        }),
    [isTop, isHome, screenWidth, onBack, x],
  );

  const columnStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const riseStyle = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }] }));

  return { backPan, columnStyle, riseStyle };
}
