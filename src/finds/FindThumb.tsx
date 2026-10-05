import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { TopicIcon } from '../cards/TopicIcon';
import { territoryColor } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import type { Find } from './findTypes';

const ICON_RATIO = 0.4;

/** A find's picture: its thumbnail, else a territory swatch with the topic icon (DESIGN.md §6.5). */
export function FindThumb({ find, width, height, radius }: { find: Find; width: number; height: number; radius: number }) {
  const palette = useTheme();
  const frame = { width, height, borderRadius: radius, borderColor: palette.line };
  if (find.thumbnailUrl) return <Image source={{ uri: find.thumbnailUrl }} style={[styles.frame, frame]} contentFit="cover" />;
  return (
    <View style={[styles.frame, styles.swatch, frame, { backgroundColor: territoryColor(palette, find.territory) }]}>
      <TopicIcon tileId={find.tileId} size={Math.round(Math.min(width, height) * ICON_RATIO)} color={palette.onTerritory} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  swatch: { alignItems: 'center', justifyContent: 'center' },
});
