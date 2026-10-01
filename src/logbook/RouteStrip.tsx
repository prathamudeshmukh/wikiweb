import { StyleSheet, View } from 'react-native';
import type { Territory } from '../config/topicTiles';
import { territoryColor } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface RouteStripProps {
  route: readonly (Territory | null)[];
}

const DOT = 8;
// Long expeditions keep their start and end; the middle folds into a gap.
const MAX_DOTS = 14;
const KEPT_AT_START = 4;

type Stop = { kind: 'dot'; territory: Territory | null } | { kind: 'gap' };

function stopsOf(route: readonly (Territory | null)[]): Stop[] {
  const dots = route.map((territory): Stop => ({ kind: 'dot', territory }));
  if (dots.length <= MAX_DOTS) return dots;
  return [...dots.slice(0, KEPT_AT_START), { kind: 'gap' }, ...dots.slice(-(MAX_DOTS - KEPT_AT_START - 1))];
}

/** One dot per tangent in its territory's colour, joined by a hairline route (DESIGN.md §5.10). */
export function RouteStrip({ route }: RouteStripProps) {
  const palette = useTheme();
  return (
    <View style={styles.strip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.line, { backgroundColor: palette.line }]} />
      {stopsOf(route).map((stop, i) =>
        stop.kind === 'gap' ? (
          <View key={`gap-${i}`} style={[styles.gap, { backgroundColor: palette.paper, borderColor: palette.muted }]} />
        ) : (
          <View key={`dot-${i}`} testID="route-dot" style={[styles.dot, { backgroundColor: territoryColor(palette, stop.territory) }]} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: DOT * 2, maxWidth: '100%' },
  line: { position: 'absolute', left: DOT / 2, right: DOT / 2, height: StyleSheet.hairlineWidth * 2 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  gap: { width: DOT * 2, height: DOT / 2, borderTopWidth: 1, borderStyle: 'dotted' },
});
