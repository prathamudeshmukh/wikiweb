import { StyleSheet, Text } from 'react-native';
import { FONT } from '../theme/fonts';
import { TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import type { HintKind } from './hintRules';

// DESIGN.md §8.
const HINT_COPY: Record<HintKind, string> = {
  swipe: '← SWIPE LEFT TO TAKE A TANGENT',
  back: 'SWIPE RIGHT TO GO BACK →',
};

const CHIP = { inset: 14, overhang: 11, paddingV: 3, paddingH: 10, pillRadius: 999 } as const;

/**
 * The pill across a card's bottom edge (DESIGN.md §6.2). It says how to swipe, which means nothing to a screen
 * reader, so it is hidden from one.
 */
export function HintChip({ kind }: { kind: HintKind }) {
  const palette = useTheme();
  return (
    <Text
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.chip, { backgroundColor: palette.ink, color: palette.card }]}
    >
      {HINT_COPY[kind]}
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
