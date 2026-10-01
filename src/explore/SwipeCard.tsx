import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { CardView } from '../cards/CardView';
import type { Card } from '../content/card';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { territoryColor } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { GESTURE, type HopController } from './hopController';

interface SwipeCardProps {
  card: Card;
  seedTitle: string | null;
  width: number;
  height: number;
  /** Only the top column's cards take gestures. */
  enabled: boolean;
  /** This card's column is the one prepared offscreen; when the hop runs, the overlay replaces it. */
  candidate: boolean;
  hop: HopController;
  pulseToken?: number;
}

const RELEASE_HINT_FADE_MS = 120;
const PULSE_SCALE = 1.03;
const PULSE_UP_MS = 120;

function SwipeCardImpl({ card, seedTitle, width, height, enabled, candidate, hop, pulseToken }: SwipeCardProps) {
  const palette = useTheme();
  const tx = useSharedValue(0);
  const pulse = useSharedValue(1);
  const releaseHint = useSharedValue(0);
  const wrapperRef = useAnimatedRef<Animated.View>();
  const commitDistance = width * GESTURE.commitRatio;

  useEffect(() => {
    if (pulseToken) pulse.value = withSequence(withTiming(PULSE_SCALE, { duration: PULSE_UP_MS }), withSpring(1, GESTURE.spring));
  }, [pulseToken, pulse]);

  // After a hop the card is parked at its release position under the new column; put it back.
  useEffect(() => {
    if (!candidate) tx.value = 0;
  }, [candidate, tx]);

  useAnimatedReaction(
    () => -tx.value >= commitDistance,
    (past, wasPast) => {
      if (past !== wasPast) releaseHint.value = withTiming(past ? 1 : 0, { duration: RELEASE_HINT_FADE_MS });
    },
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetX([-GESTURE.lockSlop, GESTURE.unreachable])
        .failOffsetX([-GESTURE.unreachable, GESTURE.lockSlop])
        .failOffsetY([-GESTURE.lockSlop, GESTURE.lockSlop])
        .onStart(() => {
          scheduleOnRN(hop.prepare, card);
        })
        .onUpdate((e) => {
          tx.value = Math.min(0, e.translationX);
        })
        .onEnd((e) => {
          const ratio = -tx.value / width;
          const commit = ratio >= GESTURE.commitRatio || e.velocityX <= -GESTURE.commitVelocity;
          const frame = commit ? measure(wrapperRef) : null;
          if (!frame) {
            tx.value = withSpring(0, GESTURE.spring);
            return;
          }
          // Everything below runs in this UI frame — no React work before motion starts.
          hop.from.value = { x: frame.pageX + tx.value, y: frame.pageY, width: frame.width, height: frame.height };
          hop.tiltDeg.value = (tx.value / width) * -GESTURE.maxTiltDeg;
          hop.progress.value = 0;
          hop.progress.value = withSpring(1, { ...GESTURE.spring, overshootClamping: true }, (finished) => {
            if (finished) scheduleOnRN(hop.landed);
          });
          scheduleOnRN(hop.committed);
        }),
    [enabled, card, width, hop, tx, wrapperRef],
  );

  const cardStyle = useAnimatedStyle(() => ({
    opacity: candidate && hop.progress.value > 0 ? 0 : 1,
    transform: [{ translateX: tx.value }, { rotate: `${(tx.value / width) * -GESTURE.maxTiltDeg}deg` }, { scale: pulse.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: candidate && hop.progress.value > 0 ? 0 : interpolate(-tx.value, [0, commitDistance], [0, 1], Extrapolation.CLAMP),
  }));
  const releaseStyle = useAnimatedStyle(() => ({ opacity: releaseHint.value }));

  return (
    <Animated.View ref={wrapperRef} style={{ width, height, marginHorizontal: LAYOUT.gutter }}>
      <Animated.View pointerEvents="none" style={[styles.behind, labelStyle]} importantForAccessibility="no-hide-descendants">
        <Text style={[styles.label, { color: territoryColor(palette, card.topic.territory) }]}>TAKE A TANGENT →</Text>
        <Animated.Text style={[styles.release, { color: palette.ink }, releaseStyle]}>RELEASE TO GO DEEPER</Animated.Text>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, cardStyle]}>
          <CardView card={card} seedTitle={seedTitle} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export const SwipeCard = memo(SwipeCardImpl);

const styles = StyleSheet.create({
  behind: { ...StyleSheet.absoluteFill, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8, gap: 6 },
  label: { fontFamily: FONT.mono, ...TYPE.crumb },
  release: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1 },
  card: { flex: 1, transformOrigin: 'center bottom' },
});
