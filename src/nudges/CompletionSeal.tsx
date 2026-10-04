import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FONT } from '../theme/fonts';

interface CompletionSealProps {
  count: number;
  color: string;
}

// DESIGN.md §5.14 — the stamp template's double ring (§5.7), drawn in the block's text colour.
const SIZE = 74;
const OUTER_STROKE = 2;
const INNER_STROKE = 1;
const RING_GAP = 4;
const TILT = '-8deg';

/** `37/37 READ` in a double ring, top-right of the exhaustion card's block. */
export function CompletionSeal({ count, color }: CompletionSealProps) {
  const outer = SIZE / 2 - OUTER_STROKE / 2;
  return (
    <View style={styles.seal} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={outer} stroke={color} strokeWidth={OUTER_STROKE} fill="none" />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={outer - RING_GAP} stroke={color} strokeWidth={INNER_STROKE} fill="none" />
      </Svg>
      <Text style={[styles.count, { color }]} adjustsFontSizeToFit numberOfLines={1}>
        {count}/{count}
      </Text>
      <Text style={[styles.read, { color }]}>READ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seal: { position: 'absolute', top: 12, right: 12, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: TILT }] },
  count: { fontFamily: FONT.display, fontSize: 18, lineHeight: 20, maxWidth: SIZE - 16 },
  read: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 0.6 },
});
