import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { LAYOUT } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { FindStar } from './FindStar';

/** What a card needs to draw its ✦ — and, on cards that take gestures, to toggle it. */
export interface CardFind {
  found: boolean;
  button?: {
    onPress: () => void;
    /** The card's own tap, which a tap on ✦ must not also trigger. */
    blocks: GestureType;
    enabled: boolean;
  };
}

// A touch larger than the ◌ ✓ badges (DESIGN.md §5.11).
export const CARD_STAR_SIZE = 16;
const SLOP = (LAYOUT.minTouchTarget - CARD_STAR_SIZE) / 2;

/** ✦ at the end of a card's meta row, padded out to a 44 pt target without growing the row. */
export function CardFindButton({ find, color }: { find: CardFind; color: string }) {
  const palette = useTheme();
  const { button } = find;
  const tap = useMemo(() => {
    if (!button) return null;
    // Only the callback goes into the worklet, not the whole button (its card gesture included).
    const { onPress } = button;
    return Gesture.Tap()
      .enabled(button.enabled)
      .withTestId('card-find')
      .hitSlop({ horizontal: SLOP, vertical: SLOP })
      .blocksExternalGesture(button.blocks)
      .onEnd((_event, success) => {
        if (success) scheduleOnRN(onPress);
      });
  }, [button]);

  const star = (
    <View style={styles.star} importantForAccessibility="no-hide-descendants">
      <FindStar found={find.found} size={CARD_STAR_SIZE} color={color} outlineColor={palette.muted} />
    </View>
  );
  return tap ? <GestureDetector gesture={tap}>{star}</GestureDetector> : star;
}

const styles = StyleSheet.create({
  star: { width: CARD_STAR_SIZE, height: CARD_STAR_SIZE },
});
