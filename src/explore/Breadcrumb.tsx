import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import type { PageRef } from '../wiki-api/types';

interface BreadcrumbProps {
  path: readonly PageRef[];
  onJump: (columnIndex: number) => void;
  /** Hop progress while this column is flying in; null once it has landed (route fully drawn). */
  entry: SharedValue<number> | null;
}

interface Crumb {
  label: string;
  columnIndex: number | null;
}

// The newest route segment draws during the back part of the hop (DESIGN.md §7).
const ROUTE_DRAW_RANGE = [0.4, 1];
// iOS can't draw a one-sided dotted border, so the route is drawn as real dots.
const ROUTE_DOTS = [0, 1, 2];

function toCrumbs(path: readonly PageRef[]): Crumb[] {
  const all: Crumb[] = [{ label: 'HOME', columnIndex: 0 }, ...path.map((ref, i) => ({ label: ref.title.toUpperCase(), columnIndex: i + 1 }))];
  if (all.length <= LAYOUT.maxVisibleCrumbs) return all;
  return [all[0], { label: '…', columnIndex: null }, ...all.slice(-2)];
}

export function Breadcrumb({ path, onJump, entry }: BreadcrumbProps) {
  const palette = useTheme();
  const crumbs = toCrumbs(path);
  const drawnStyle = useAnimatedStyle(() => {
    const drawn = entry ? interpolate(entry.value, ROUTE_DRAW_RANGE, [0, 1], Extrapolation.CLAMP) : 1;
    return { width: drawn * LAYOUT.routeSegmentWidth };
  });
  const lastCrumbStyle = useAnimatedStyle(() => ({
    opacity: entry ? interpolate(entry.value, ROUTE_DRAW_RANGE, [0, 1], Extrapolation.CLAMP) : 1,
  }));

  return (
    <View ph-no-capture style={styles.row} accessibilityRole="toolbar" accessibilityLabel="Route">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        const target = crumb.columnIndex;
        return (
          <View key={`${crumb.label}-${i}`} style={[styles.item, isLast && styles.lastItem]}>
            {i > 0 && (
              <Animated.View style={[styles.segment, isLast && drawnStyle]}>
                {ROUTE_DOTS.map((d) => (
                  <View key={d} style={[styles.dot, { backgroundColor: palette.muted }]} />
                ))}
              </Animated.View>
            )}
            <Animated.View style={[styles.crumbWrap, isLast && lastCrumbStyle]}>
              <Pressable
                disabled={target === null || isLast}
                onPress={() => target !== null && onJump(target)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={isLast ? `Current: ${crumb.label}` : `Back to ${crumb.label}`}
              >
                <Text numberOfLines={1} style={[styles.crumb, { color: isLast ? palette.ink : palette.muted }]}>{crumb.label}</Text>
              </Pressable>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: LAYOUT.breadcrumbHeight, paddingHorizontal: LAYOUT.gutter, flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  lastItem: { flexShrink: 1, minWidth: 0 },
  crumbWrap: { flexShrink: 1, minWidth: 0 },
  segment: { width: LAYOUT.routeSegmentWidth, marginHorizontal: 6, flexDirection: 'row', gap: 4, overflow: 'hidden' },
  dot: { width: 2, height: 2, borderRadius: 1 },
  crumb: { fontFamily: FONT.mono, ...TYPE.crumb },
});
