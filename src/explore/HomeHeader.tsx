import { BookOpen } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { FONT } from '../theme/fonts';
import { LAYOUT } from '../theme/layout';
import { useTheme } from '../theme/useTheme';

const GLYPH_SIZE = 22;
const WORDMARK_SIZE = 24;
const LOGBOOK_ICON_SIZE = 24;

/** A circle with a line leaving it at a tangent — the wordmark glyph (DESIGN.md §9 app icon). */
function TangentGlyph({ color }: { color: string }) {
  return (
    <Svg width={GLYPH_SIZE} height={GLYPH_SIZE} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Circle cx={10} cy={13} r={6.5} fill="none" stroke={color} strokeWidth={2} />
      <Path d="M10 6.5 L21 6.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={21} cy={6.5} r={1.8} fill={color} />
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
