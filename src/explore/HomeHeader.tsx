import { BookOpen } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { TANGENT_GLYPH } from '../brand/tangentGlyph';
import { FONT } from '../theme/fonts';
import { LAYOUT } from '../theme/layout';
import { useTheme } from '../theme/useTheme';

const GLYPH_SIZE = 22;
const WORDMARK_SIZE = 24;
const LOGBOOK_ICON_SIZE = 24;

/** The wordmark glyph — the same shape the app icon is built around. */
function TangentGlyph({ color }: { color: string }) {
  const { viewBox, strokeWidth, circle, tangent, dot } = TANGENT_GLYPH;
  return (
    <Svg width={GLYPH_SIZE} height={GLYPH_SIZE} viewBox={`0 0 ${viewBox} ${viewBox}`} accessibilityElementsHidden>
      <Circle cx={circle.cx} cy={circle.cy} r={circle.r} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Path d={`M${tangent.x1} ${tangent.y1} L${tangent.x2} ${tangent.y2}`} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={dot.cx} cy={dot.cy} r={dot.r} fill={color} />
    </Svg>
  );
}

/** Wordmark left, Logbook right (DESIGN.md §6.2). */
export function HomeHeader({ onOpenLogbook }: { onOpenLogbook: () => void }) {
  const palette = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.brand} accessibilityRole="header">
        <TangentGlyph color={palette.ink} />
        <Text style={[styles.wordmark, { color: palette.ink }]}>tangent</Text>
      </View>
      <Pressable onPress={onOpenLogbook} accessibilityRole="button" accessibilityLabel="Logbook" hitSlop={8} style={styles.logbook}>
        <BookOpen size={LOGBOOK_ICON_SIZE} color={palette.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: LAYOUT.headerHeight, paddingLeft: LAYOUT.gutter, paddingRight: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logbook: { width: LAYOUT.minTouchTarget, height: LAYOUT.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: FONT.wordmark, fontSize: WORDMARK_SIZE, letterSpacing: -0.2 },
});
