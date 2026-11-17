import { usePathname } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { FONT } from '../theme/fonts';
import { TYPE } from '../theme/layout';
import { useAppFrame } from '../theme/appFrame';
import { useTheme } from '../theme/useTheme';
import { keyLegendLeft } from './keyLegendPlacement';
import { usePointerKind } from './usePointerKind';

// SPEC.md §15.3's keys, in DESIGN.md §8's words.
const KEYS = [
  { key: '→', label: 'TAKE A TANGENT' },
  { key: '←', label: 'BACK' },
  { key: 'Enter', label: 'READ' },
] as const;

const EXPLORE_PATH = '/';
const KEYCAP = { minWidth: 22, height: 22, paddingH: 6, radius: 5, border: 1, borderBottom: 2 } as const;
const ROW_GAP = 10;
const KEY_LABEL_GAP = 12;

/** The legend's rows, drawn at `left` in the window (DESIGN.md §6.2). */
export function KeyLegendView({ left }: { left: number }) {
  const palette = useTheme();
  return (
    <View pointerEvents="none" style={[styles.legend, { left }]} testID="key-legend">
      {KEYS.map(({ key, label }) => (
        <View key={key} style={styles.row}>
          <View style={[styles.keycap, { backgroundColor: palette.card, borderColor: palette.line }]}>
            <Text style={[styles.keyText, { color: palette.ink }]}>{key}</Text>
          </View>
          <Text style={[styles.label, { color: palette.muted }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Beside the column on a wide window with a mouse or trackpad, while the explore screen is in front. */
export function KeyLegend() {
  const { width } = useWindowDimensions();
  const frame = useAppFrame();
  const pointer = usePointerKind();
  const pathname = usePathname();
  const left = keyLegendLeft(width, frame);
  if (pointer !== 'fine' || pathname !== EXPLORE_PATH || left === null) return null;
  return <KeyLegendView left={left} />;
}

const styles = StyleSheet.create({
  legend: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center', gap: ROW_GAP },
  row: { flexDirection: 'row', alignItems: 'center', gap: KEY_LABEL_GAP },
  keycap: {
    minWidth: KEYCAP.minWidth,
    height: KEYCAP.height,
    paddingHorizontal: KEYCAP.paddingH,
    borderRadius: KEYCAP.radius,
    borderWidth: KEYCAP.border,
    borderBottomWidth: KEYCAP.borderBottom,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontFamily: FONT.mono, ...TYPE.meta, letterSpacing: 0 },
  label: { fontFamily: FONT.mono, ...TYPE.meta },
});
