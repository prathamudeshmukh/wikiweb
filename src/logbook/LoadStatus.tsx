import { Warning } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { FONT } from '../theme/fonts';
import { TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';

/** Loading spinner, or the standard retry state (DESIGN.md §6.7). */
export function LoadStatus({ status, onRetry }: { status: 'loading' | 'error'; onRetry: () => void }) {
  const palette = useTheme();
  if (status === 'loading') return <ActivityIndicator style={styles.status} color={palette.muted} accessibilityLabel="Loading" />;
  return (
    <Pressable style={styles.status} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Couldn’t load. Tap to retry.">
      <Warning size={32} color={palette.muted} />
      <Text style={[styles.caption, { color: palette.muted }]}>COULDN’T LOAD — TAP TO RETRY</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  status: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  caption: { fontFamily: FONT.mono, ...TYPE.meta },
});
