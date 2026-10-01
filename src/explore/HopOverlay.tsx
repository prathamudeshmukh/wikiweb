import { StyleSheet } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { CardView } from '../cards/CardView';
import { SeedHeader } from '../cards/SeedHeader';
import type { Card } from '../content/card';
import { LAYOUT } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import type { HopController, Rect } from './hopController';

interface HopOverlayProps {
  card: Card;
  seedTitle: string | null;
  hop: HopController;
  to: Rect;
}

// Card face fades out over the first part of the flight, seed header fades in over the last part.
const CARD_FADE = [0, 0.6];
const SEED_FADE = [0.4, 0.9];

/**
 * Mounted (invisible) while a drag is in progress; becomes visible the frame progress leaves 0.
 * The frame stays opaque the whole way; only its contents crossfade, so nothing ghosts through it.
 */
export function HopOverlay({ card, seedTitle, hop, to }: HopOverlayProps) {
  const palette = useTheme();
  const frameStyle = useAnimatedStyle(() => {
    const p = hop.progress.value;
    const from = hop.from.value;
    const lerp = (a: number, b: number) => interpolate(p, [0, 1], [a, b]);
    return {
      opacity: p > 0 ? 1 : 0,
      left: lerp(from.x, to.x),
      top: lerp(from.y, to.y),
      width: lerp(from.width, to.width),
      height: Math.max(to.height, lerp(from.height, to.height)),
      borderRadius: lerp(LAYOUT.cardRadius, LAYOUT.seedRadius),
      transform: [{ rotate: `${lerp(hop.tiltDeg.value, 0)}deg` }],
    };
  });
  const cardFaceStyle = useAnimatedStyle(() => ({ opacity: interpolate(hop.progress.value, CARD_FADE, [1, 0], Extrapolation.CLAMP) }));
  const seedFaceStyle = useAnimatedStyle(() => ({ opacity: interpolate(hop.progress.value, SEED_FADE, [0, 1], Extrapolation.CLAMP) }));

  return (
    <Animated.View pointerEvents="none" style={[styles.frame, { backgroundColor: palette.card, borderColor: palette.line }, frameStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, cardFaceStyle]}>
        <CardView card={card} seedTitle={seedTitle} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, seedFaceStyle]}>
        <SeedHeader title={card.title} topic={card.topic} thumbnailUrl={card.thumbnail?.url ?? null} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', overflow: 'hidden', zIndex: 1000, borderWidth: StyleSheet.hairlineWidth },
});
