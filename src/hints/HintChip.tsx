import { StyleSheet, Text } from 'react-native';
import { FONT } from '../theme/fonts';
import { TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { hintCopy } from './hintCopy';
import type { HintKind } from './hintRules';
import { usePointerKind } from './usePointerKind';

const CHIP = { inset: 14, overhang: 11, paddingV: 3, paddingH: 10, pillRadius: 999 } as const;

/**
 * The pill across a card's bottom edge (DESIGN.md §6.2). It says how to swipe, which means nothing to a screen
 * reader, so it is hidden from one.
 */
export function HintChip({ kind }: { kind: HintKind }) {
  const palette = useTheme();
  const pointer = usePointerKind();
  return (
    <Text
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.chip, { backgroundColor: palette.ink, color: palette.card }]}
    >
      {hintCopy(kind, pointer)}
    </Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    right: CHIP.inset,
    bottom: -CHIP.overhang,
    paddingVertical: CHIP.paddingV,
    paddingHorizontal: CHIP.paddingH,
    borderRadius: CHIP.pillRadius,
    overflow: 'hidden',
    fontFamily: FONT.mono,
    ...TYPE.meta,
  },
});
