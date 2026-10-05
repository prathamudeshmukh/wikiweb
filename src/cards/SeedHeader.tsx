import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { CardTopic } from '../content/topics';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { territoryColor } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export interface SeedHeaderProps {
  title: string;
  topic: CardTopic;
  thumbnailUrl: string | null;
}

const THUMB = 40;

/** The compact "Exploring from …" strip at the top of every column (DESIGN.md §5.5). */
export function SeedHeader({ title, topic, thumbnailUrl }: SeedHeaderProps) {
  const palette = useTheme();
  const accent = territoryColor(palette, topic.territory);
  return (
    <View ph-no-capture style={[styles.seed, { backgroundColor: palette.card, borderColor: palette.line }]} accessibilityRole="header" accessibilityLabel={`Exploring from ${title}`}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: accent }]} />
      )}
      <View style={styles.text}>
        <Text style={[styles.eyebrow, { color: palette.muted }]}>EXPLORING FROM</Text>
        <Text style={[styles.title, { color: palette.ink }]} numberOfLines={1}>{title}</Text>
      </View>
      <Text style={[styles.dot, { color: accent }]}>●</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seed: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: LAYOUT.seedRadius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: 9 },
  text: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.8 },
  title: { fontFamily: FONT.display, fontSize: 18, lineHeight: 22 },
  dot: { fontFamily: FONT.mono, ...TYPE.meta },
});
