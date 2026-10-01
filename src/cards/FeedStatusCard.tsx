import { CloudSlash, Compass } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeedStatus } from '../feeds/useFeed';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';

interface FeedStatusCardProps {
  status: FeedStatus;
  isHome: boolean;
  onRetry(): void;
}

const ICON_SIZE = 32;

// DESIGN.md §6.7 — short mono captions, one icon, no mascot.
export function FeedStatusCard({ status, isHome, onRetry }: FeedStatusCardProps) {
  const palette = useTheme();
  const caption = [styles.caption, { color: palette.muted }];

  if (status === 'loading') {
    return (
      <View style={styles.wrap} accessibilityLabel="Loading more cards">
        <ActivityIndicator color={palette.muted} />
      </View>
    );
  }
  if (status === 'error') {
    return (
      <Pressable style={styles.wrap} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Couldn’t load. Tap to retry.">
        <CloudSlash size={ICON_SIZE} color={palette.muted} />
        <Text style={caption}>COULDN’T LOAD — TAP TO RETRY</Text>
      </Pressable>
    );
  }
  if (status === 'done') {
    return (
      <View style={styles.wrap}>
        <Compass size={ICON_SIZE} color={palette.muted} />
        <Text style={caption}>{isHome ? 'THAT’S EVERYTHING FOR NOW' : 'DEAD END — SWIPE RIGHT TO GO BACK'}</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  wrap: { minHeight: LAYOUT.minTouchTarget * 3, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: LAYOUT.gutter },
  caption: { fontFamily: FONT.mono, ...TYPE.meta, textAlign: 'center' },
});
