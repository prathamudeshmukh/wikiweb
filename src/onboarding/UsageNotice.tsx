import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { UsageSharing } from '../analytics/useUsageSharing';
import { FONT } from '../theme/fonts';
import { LAYOUT } from '../theme/layout';
import { useTheme } from '../theme/useTheme';

// SPEC.md §3.1: analytics is on by default, so a new visitor is told before they start, with a one-tap way out.
const NOTICE = {
  sharing: 'Anonymous usage stats, including article titles, help tune feeds.',
  notSharing: 'Usage stats are off.',
} as const;

// Lifts the small links to a comfortable touch target vertically; sideways they stay apart.
const LINK_SLOP = { top: 12, bottom: 12, left: 4, right: 4 } as const;

interface NoticeLinkProps {
  label: string;
  onPress: () => void;
  /** A switch reads as a button with a full name; Privacy goes somewhere, so it stays a link. */
  action?: { accessibilityLabel: string };
}

function NoticeLink({ label, onPress, action }: NoticeLinkProps) {
  const palette = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={action ? 'button' : 'link'}
      accessibilityLabel={action?.accessibilityLabel ?? label}
      hitSlop={LINK_SLOP}
    >
      <Text style={[styles.text, styles.link, { color: palette.ink, textDecorationColor: palette.line }]}>{label}</Text>
    </Pressable>
  );
}

interface UsageNoticeProps {
  usage: UsageSharing;
  onOpenPrivacy: () => void;
}

/** The line under onboarding's button: what is sent, a link to the policy, and an in-place switch. */
export function UsageNotice({ usage, onOpenPrivacy }: UsageNoticeProps) {
  const palette = useTheme();
  const { sharing } = usage;
  // Held until the saved choice loads (a moment), so an opted-out visitor never reads the sharing line.
  if (sharing === undefined) return <View style={styles.root} />;
  const toggle = sharing ? 'Turn off' : 'Turn on';
  return (
    <View style={styles.root}>
      <Text style={[styles.text, { color: palette.muted }]} accessibilityLiveRegion="polite">
        {sharing ? NOTICE.sharing : NOTICE.notSharing}
      </Text>
      <View style={styles.links}>
        <NoticeLink label="Privacy" onPress={onOpenPrivacy} />
        <Text style={[styles.text, { color: palette.muted }]}>·</Text>
        <NoticeLink label={toggle} action={{ accessibilityLabel: `${toggle} usage stats` }} onPress={() => usage.setSharing(!sharing)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: LAYOUT.gutter, paddingBottom: 12, alignItems: 'center', gap: 2 },
  text: { fontFamily: FONT.body, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  links: { flexDirection: 'row', gap: 8 },
  link: { textDecorationLine: 'underline' },
});
