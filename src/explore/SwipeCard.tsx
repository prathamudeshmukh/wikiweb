import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  measure,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { CardView, type TopicButton } from '../cards/CardView';
import { topicLabel } from '../cards/whyLine';
import { HINT } from '../config/constants';
import type { Card } from '../content/card';
import { HintChip } from '../hints/HintChip';
import { hasTree } from '../interests/interestPicks';
import type { HintKind } from '../hints/hintRules';
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
  /** Tap: open the article in the reader. */
  onOpen: (card: Card) => void;
  pulseToken?: number;
  /** The first-hop hint this card carries, if any. */
  hint: HintKind | null;
  /** The column's peel count while this card carries the hint; each new value peels it. */
  peelToken: number | null;
  /** Opens a tile's interest tree from the card's topic label (SPEC.md §3.9). */
  onOpenTopic?: (tileId: string) => void;
}

const RELEASE_HINT_FADE_MS = 120;
const PULSE_SCALE = 1.03;
const PULSE_UP_MS = 120;

function SwipeCardImpl({ card, seedTitle, width, height, enabled, candidate, hop, onOpen, pulseToken, hint, peelToken, onOpenTopic }: SwipeCardProps) {
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

  usePeel(tx, hint === 'swipe' ? peelToken : null);

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
          cancelAnimation(tx);
          scheduleOnRN(hop.prepare, card);
        })
        .onUpdate((e) => {
          tx.set(Math.min(0, e.translationX));
        })
        // wrapperRef is an animated ref that measure() reads on the UI thread when the gesture ends, never during render.
        // eslint-disable-next-line react-hooks/refs
        .onEnd((e) => {
          const ratio = -tx.get() / width;
          const commit = ratio >= GESTURE.commitRatio || e.velocityX <= -GESTURE.commitVelocity;
          const frame = commit ? measure(wrapperRef) : null;
          if (!frame) {
            tx.set(withSpring(0, GESTURE.spring));
            return;
          }
          // Everything below runs in this UI frame — no React work before motion starts.
          hop.from.set({ x: frame.pageX + tx.get(), y: frame.pageY, width: frame.width, height: frame.height });
          hop.tiltDeg.set((tx.get() / width) * -GESTURE.maxTiltDeg);
          hop.progress.set(0);
          hop.progress.set(
            withSpring(1, { ...GESTURE.spring, overshootClamping: true }, (finished) => {
              if (finished) scheduleOnRN(hop.landed);
            }),
          );
          scheduleOnRN(hop.committed);
        }),
    [enabled, card, width, hop, tx, wrapperRef],
  );

  // A tap reads the article; any movement past the lock slop hands the touch to the swipe or the scroll instead.
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(enabled)
        .maxDistance(GESTURE.lockSlop)
        .onEnd((_event, success) => {
          if (success) scheduleOnRN(onOpen, card);
        }),
    [enabled, onOpen, card],
  );
  const gesture = useMemo(() => Gesture.Race(pan, tap), [pan, tap]);
  const topic = useTopicButton(card, enabled, tap, onOpenTopic);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: candidate && hop.progress.value > 0 ? 0 : 1,
    transform: [{ translateX: tx.value }, { rotate: `${(tx.value / width) * -GESTURE.maxTiltDeg}deg` }, { scale: pulse.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: candidate && hop.progress.value > 0 ? 0 : interpolate(-tx.value, [0, commitDistance], [0, 1], Extrapolation.CLAMP),
  }));
  const releaseStyle = useAnimatedStyle(() => ({ opacity: releaseHint.value }));

  return (
    <Animated.View ref={wrapperRef} testID={`card-${card.pageId}`} style={{ width, height, marginHorizontal: LAYOUT.gutter }}>
      <Animated.View pointerEvents="none" style={[styles.behind, labelStyle]} importantForAccessibility="no-hide-descendants">
        <Text style={[styles.label, { color: territoryColor(palette, card.topic.territory) }]}>TAKE A TANGENT →</Text>
        <Animated.Text style={[styles.release, { color: palette.ink }, releaseStyle]}>RELEASE TO GO DEEPER</Animated.Text>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.card, cardStyle]}
          accessibilityRole="button"
          accessibilityHint="Opens the article"
          accessible
          accessibilityActions={topic.actions}
          onAccessibilityAction={topic.onAction}
        >
          <CardView card={card} seedTitle={seedTitle} topicButton={topic.button} />
          {hint && <HintChip kind={hint} />}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export const SwipeCard = memo(SwipeCardImpl);

const TOPIC_ACTION = 'topicTree';

/** The topic label as a button, plus the same as a screen-reader action, on cards whose tile has a tree. */
function useTopicButton(card: Card, enabled: boolean, cardTap: TopicButton['blocks'], onOpenTopic?: (tileId: string) => void) {
  const { tileId } = card.topic;
  const label = topicLabel(card);
  return useMemo(() => {
    if (!onOpenTopic || !tileId || !label || !hasTree(tileId)) return { button: undefined, actions: undefined, onAction: undefined };
    const open = () => onOpenTopic(tileId);
    return {
      button: { onPress: open, blocks: cardTap, enabled },
      actions: [{ name: TOPIC_ACTION, label: `${label} interests` }],
      onAction: ({ nativeEvent }: { nativeEvent: { actionName: string } }) => {
        if (nativeEvent.actionName === TOPIC_ACTION) open();
      },
    };
  }, [onOpenTopic, tileId, label, cardTap, enabled]);
}

/**
 * The hint peel (DESIGN.md §7): out far enough to show the label behind, a hold, then the swipe's spring back,
 * clamped so it never swings past rest and reads as a shake. Only a token that changes while the card carries the
 * hint peels, so a card that comes into focus mid-schedule waits for the next one.
 */
function usePeel(tx: SharedValue<number>, peelToken: number | null) {
  const lastToken = useRef(peelToken);
  useEffect(() => {
    const fresh = lastToken.current !== null && peelToken !== null && peelToken !== lastToken.current;
    lastToken.current = peelToken;
    if (!fresh) return;
    tx.set(
      withSequence(
        withTiming(-HINT.peelDistance, { duration: HINT.peelOutMs, easing: Easing.out(Easing.cubic) }),
        withDelay(HINT.peelHoldMs, withSpring(0, { ...GESTURE.spring, overshootClamping: true })),
      ),
    );
  }, [tx, peelToken]);
}

const styles = StyleSheet.create({
  behind: { ...StyleSheet.absoluteFill, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8, gap: 6 },
  label: { fontFamily: FONT.mono, ...TYPE.crumb },
  release: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1 },
  card: { flex: 1, transformOrigin: 'center bottom' },
});
