import { Pressable, StyleSheet } from 'react-native';
import { LAYOUT } from '../theme/layout';
import { territoryColor } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { FindStar } from './FindStar';
import type { FindFrom, FindPage } from './findTypes';
import { findActionLabel, useFindsState, useFindToggle } from './useFinds';

interface FindButtonProps {
  page: FindPage;
  from: FindFrom;
  size: number;
}

/** ✦ as a standalone button — the reader header, a Find's peek card and the Finds list (DESIGN.md §5.11). */
export function FindButton({ page, from, size }: FindButtonProps) {
  const palette = useTheme();
  const find = useFindsState().finds.find((f) => f.pageId === page.pageId);
  const found = find !== undefined;
  // Solid in the territory colour — the saved find's, which may have been looked up after keeping.
  const color = territoryColor(palette, find?.territory ?? page.territory ?? null);
  const toggle = useFindToggle();
  return (
    <Pressable
      onPress={() => toggle(page, from)}
      accessibilityRole="button"
      accessibilityLabel={findActionLabel(found)}
      accessibilityState={{ selected: found }}
      style={styles.hit}
    >
      <FindStar found={found} size={size} color={color} outlineColor={palette.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { width: LAYOUT.minTouchTarget, height: LAYOUT.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
});
