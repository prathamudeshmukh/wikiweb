import { CaretLeft } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  /** An optional action on the right, e.g. the Logbook's Settings gear. */
  trailing?: ReactNode;
}

/** Back button and a mono caps title, for screens pushed over the columns. */
export function ScreenHeader({ title, onBack, trailing }: ScreenHeaderProps) {
  const palette = useTheme();
  return (
    <View style={styles.bar}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={styles.back}>
        <CaretLeft size={22} color={palette.ink} />
      </Pressable>
      <Text style={[styles.title, { color: palette.ink }]} accessibilityRole="header">{title}</Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: LAYOUT.headerHeight, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  back: { width: LAYOUT.minTouchTarget, height: LAYOUT.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: FONT.mono, ...TYPE.crumb },
});
