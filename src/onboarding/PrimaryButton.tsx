import { ArrowRight } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { FONT } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

interface PrimaryButtonProps {
  label: string;
  enabled: boolean;
  onPress: () => void;
  /** Read to screen readers while the button is off, to say what turns it on. */
  disabledHint?: string;
}

const DISABLED_OPACITY = 0.4;

/** The full-width ink pill that commits a topic pick. */
export function PrimaryButton({ label, enabled, onPress, disabledHint }: PrimaryButtonProps) {
  const palette = useTheme();
  return (
    <Pressable
      disabled={!enabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      accessibilityHint={enabled ? undefined : disabledHint}
      style={[styles.button, { backgroundColor: palette.ink, opacity: enabled ? 1 : DISABLED_OPACITY }]}
    >
      <Text style={[styles.label, { color: palette.card }]}>{label}</Text>
      <ArrowRight size={18} color={palette.card} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontFamily: FONT.bodyStrong, fontSize: 17 },
});
