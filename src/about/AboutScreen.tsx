import { useRef } from 'react';
import { type LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UsageSharingSwitch } from '../analytics/UsageSharingSwitch';
import type { UsageSharing } from '../analytics/useUsageSharing';
import { PITCH } from '../brand/pitch';
import type { AppSignature } from '../config/appSignature';
import { ScreenHeader } from '../logbook/ScreenHeader';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { ABOUT_COPY } from './aboutCopy';

interface AboutScreenProps {
  onBack: () => void;
  usage: UsageSharing;
  signature: AppSignature;
  /** Opened from onboarding's Privacy link: start at the privacy section. */
  startAtPrivacy?: boolean;
}

function SectionLabel({ children }: { children: string }) {
  const palette = useTheme();
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: palette.muted }]} accessibilityRole="header">{children}</Text>
      <View style={[styles.rule, { backgroundColor: palette.line }]} />
    </View>
  );
}

function Paragraph({ children, muted = false }: { children: string; muted?: boolean }) {
  const palette = useTheme();
  return <Text style={[muted ? styles.fine : styles.body, { color: muted ? palette.muted : palette.ink }]}>{children}</Text>;
}

function PrivacySection({ usage, platform }: { usage: UsageSharing; platform: string }) {
  const palette = useTheme();
  return (
    <>
      <Text style={[styles.sectionHeading, { color: palette.ink }]} accessibilityRole="header">{ABOUT_COPY.privacyHeading}</Text>
      <Paragraph>{ABOUT_COPY.sent}</Paragraph>
      <Paragraph>{ABOUT_COPY.notSent}</Paragraph>
      <Paragraph>{platform === 'web' ? ABOUT_COPY.storage.web : ABOUT_COPY.storage.native}</Paragraph>
      <Paragraph>{ABOUT_COPY.kept}</Paragraph>
      <Paragraph>{ABOUT_COPY.deleting}</Paragraph>
      <View style={[styles.switchCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
        <View style={styles.switchText}>
          <Text style={[styles.switchTitle, { color: palette.ink }]}>Share usage data</Text>
          <Text style={[styles.fine, { color: palette.muted }]}>{ABOUT_COPY.switchNote}</Text>
        </View>
        <UsageSharingSwitch usage={usage} />
      </View>
      <Text selectable style={[styles.fine, { color: palette.muted }]}>{ABOUT_COPY.contact}</Text>
    </>
  );
}

function Credits() {
  const palette = useTheme();
  return (
    <View style={styles.credits}>
      {ABOUT_COPY.credits.map(({ label, text }) => (
        <View key={label} style={styles.credit}>
          <Text style={[styles.creditLabel, { color: palette.muted }]}>{label}</Text>
          <Text style={[styles.creditText, { color: palette.ink }]}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

/** About & privacy (SPEC.md §3.11): what Tangent is, what it sends, and whose work it is built on. */
export function AboutScreen({ onBack, usage, signature, startAtPrivacy = false }: AboutScreenProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  // Once only: later layouts (a resized window, a rotation) must not pull the reader back.
  const pendingJump = useRef(startAtPrivacy);
  const scrollToPrivacy = (event: LayoutChangeEvent) => {
    if (!pendingJump.current) return;
    pendingJump.current = false;
    scroll.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: false });
  };
  return (
    // ph-no-capture: touch autocapture sends nothing from the policy page either (§3.11).
    <View ph-no-capture testID="about-screen" style={[styles.root, { backgroundColor: palette.paper, paddingTop: insets.top }]}>
      <ScreenHeader title="ABOUT" onBack={onBack} />
      <ScrollView ref={scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        <Text style={[styles.pitch, { color: palette.ink }]} accessibilityRole="header">{PITCH}</Text>
        <Paragraph>{ABOUT_COPY.intro}</Paragraph>
        <Paragraph muted>{ABOUT_COPY.notAffiliated}</Paragraph>
        <View onLayout={scrollToPrivacy} style={styles.section}>
          <SectionLabel>PRIVACY</SectionLabel>
          <PrivacySection usage={usage} platform={signature.platform} />
        </View>
        <View style={styles.section}>
          <SectionLabel>CREDITS</SectionLabel>
          <Credits />
        </View>
        <Text style={[styles.footer, { color: palette.muted }]}>{`TANGENT ${signature.version} · ${signature.platform}`.toUpperCase()}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: LAYOUT.gutter, paddingTop: 8, gap: 12 },
  pitch: { fontFamily: FONT.display, fontSize: 30, lineHeight: 37 },
  body: { fontFamily: FONT.body, fontSize: 16, lineHeight: 25 },
  fine: { fontFamily: FONT.body, fontSize: 14, lineHeight: 21 },
  section: { gap: 12, paddingTop: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: FONT.mono, ...TYPE.meta },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  sectionHeading: { fontFamily: FONT.display, fontSize: 22, lineHeight: 28 },
  switchCard: { borderRadius: LAYOUT.seedRadius, borderWidth: StyleSheet.hairlineWidth, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchText: { flex: 1, gap: 4 },
  switchTitle: { fontFamily: FONT.display, fontSize: 18, lineHeight: 23 },
  credits: { gap: 10 },
  credit: { flexDirection: 'row', gap: 12 },
  creditLabel: { fontFamily: FONT.mono, ...TYPE.meta, width: 76, paddingTop: 3 },
  creditText: { flex: 1, fontFamily: FONT.body, fontSize: 14, lineHeight: 21 },
  footer: { fontFamily: FONT.mono, ...TYPE.meta, textAlign: 'center', paddingTop: 20 },
});
