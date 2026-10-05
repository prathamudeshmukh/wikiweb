import { CaretRight } from 'phosphor-react-native';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { UsageSharing } from '../analytics/useUsageSharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { interestsSummary } from '../onboarding/interestSelection';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { ScreenHeader } from './ScreenHeader';

interface SettingsScreenProps {
  interests: readonly string[];
  onBack: () => void;
  onOpenInterests: () => void;
  usage: UsageSharing;
}

// SPEC.md §11: titles are sent on feed-quality events, so the switch says so.
const USAGE_NOTE = 'Helps tune which articles Tangent shows. Includes the titles of articles you explore, never who you are.';

function UsageSharingRow({ usage }: { usage: UsageSharing }) {
  const palette = useTheme();
  const loading = usage.sharing === undefined;
  return (
    <View style={[styles.row, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: palette.ink }]}>Share usage data</Text>
        <Text style={[styles.rowValue, { color: palette.muted }]}>{USAGE_NOTE}</Text>
      </View>
      <Switch
        value={usage.sharing ?? false}
        disabled={loading}
        // Switch doesn't announce disabled on its own.
        accessibilityState={{ disabled: loading }}
        onValueChange={usage.setSharing}
        accessibilityLabel="Share usage data"
        trackColor={{ true: palette.ink, false: palette.line }}
      />
    </View>
  );
}

/** Settings, reached from the Logbook gear (DESIGN.md §6.6). */
export function SettingsScreen({ interests, onBack, onOpenInterests, usage }: SettingsScreenProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const summary = interestsSummary(interests);
  return (
    <View style={[styles.root, { backgroundColor: palette.paper, paddingTop: insets.top }]}>
      <ScreenHeader title="SETTINGS" onBack={onBack} />
      <View style={styles.content}>
        <Pressable
          onPress={onOpenInterests}
          accessibilityRole="button"
          accessibilityLabel={`Interests. ${summary}`}
          style={({ pressed }) => [styles.row, { backgroundColor: palette.card, borderColor: palette.line }, pressed && styles.pressed]}
        >
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: palette.ink }]}>Interests</Text>
            <Text style={[styles.rowValue, { color: palette.muted }]} numberOfLines={2}>{summary}</Text>
          </View>
          <CaretRight size={18} color={palette.muted} />
        </Pressable>
        <UsageSharingRow usage={usage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: LAYOUT.gutter, paddingTop: 8, gap: 12 },
  row: { borderRadius: LAYOUT.seedRadius, borderWidth: StyleSheet.hairlineWidth, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.7 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontFamily: FONT.display, fontSize: 20, lineHeight: 26 },
  rowValue: { fontFamily: FONT.body, ...TYPE.body },
});
