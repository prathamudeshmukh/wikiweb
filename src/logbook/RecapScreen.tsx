import { ArrowRight } from 'phosphor-react-native';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { depthOf, recapOf, resumeNodeId } from '../journeys/expedition';
import type { Expedition, JourneyNode, NodeVia } from '../journeys/journeyTypes';
import { useAppServices } from '../services/AppServices';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { territoryColor } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { LoadStatus } from './LoadStatus';
import { logDate, recapCounts, territoriesCrossed } from './logbookFormat';
import { RouteStrip } from './RouteStrip';
import { ScreenHeader } from './ScreenHeader';
import { useLoaded } from './useLoaded';

interface RecapScreenProps {
  journeyId: string;
  onBack: () => void;
  /** Reopen the expedition with the columns down to this node. */
  onContinue: (journeyId: string, nodeId: string) => void;
}

const INDENT = 14;
const MAX_INDENT_LEVELS = 5;

const VIA_MARK: Readonly<Record<NodeVia, string>> = { swipe: '→', peek_explore: '↗', peek_read: '✓' };
const VIA_LABEL: Readonly<Record<NodeVia, string>> = { swipe: 'Tangent', peek_explore: 'Tangent from the reader', peek_read: 'Read' };

function RecapCard({ expedition, onContinue }: { expedition: Expedition; onContinue: () => void }) {
  const palette = useTheme();
  const recap = recapOf(expedition);
  const sameEnd = recap.startTitle === recap.endTitle;
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Text style={[styles.eyebrow, { color: palette.muted }]}>{`EXPEDITION LOG · ${logDate(expedition.journey.createdAt)}`}</Text>
      <Text style={[styles.headline, { color: palette.ink }]} accessibilityRole="header">
        {sameEnd ? `From ${recap.startTitle}` : `From ${recap.startTitle}\nto ${recap.endTitle}`}
      </Text>
      <View style={styles.route}>
        <RouteStrip route={recap.route} />
        <Text style={[styles.eyebrow, { color: palette.muted }]}>{territoriesCrossed(recap.route).map((t) => t.toUpperCase()).join('  ·  ')}</Text>
      </View>
      <Text style={[styles.body, { color: palette.ink }]}>{recapCounts(recap)}</Text>
      {recap.furthestLeap && (
        <View>
          <Text style={[styles.body, { color: palette.muted }]}>Furthest leap:</Text>
          <Text style={[styles.body, { color: palette.ink }]}>{`${recap.furthestLeap.from} → ${recap.furthestLeap.to}`}</Text>
        </View>
      )}
      <Pressable onPress={onContinue} accessibilityRole="button" accessibilityLabel="Continue expedition" style={({ pressed }) => [styles.primary, { backgroundColor: palette.ink }, pressed && styles.pressed]}>
        <Text style={[styles.primaryLabel, { color: palette.card }]}>Continue expedition</Text>
        <ArrowRight size={18} color={palette.card} />
      </Pressable>
    </View>
  );
}

function NodeRow({ node, depth, onOpen }: { node: JourneyNode; depth: number; onOpen: () => void }) {
  const palette = useTheme();
  const indent = Math.min(depth - 1, MAX_INDENT_LEVELS) * INDENT;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${VIA_LABEL[node.via]}: ${node.title}`}
      style={({ pressed }) => [styles.node, { paddingLeft: indent, borderColor: palette.line }, pressed && styles.pressed]}
    >
      <Text style={[styles.nodeMark, { color: territoryColor(palette, node.territory) }]}>{VIA_MARK[node.via]}</Text>
      <Text style={[styles.nodeTitle, { color: palette.ink }]} numberOfLines={1}>{node.title}</Text>
    </Pressable>
  );
}

function RecapContent({ expedition, onContinue }: { expedition: Expedition; onContinue: RecapScreenProps['onContinue'] }) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const depths = depthOf(expedition.nodes);
  const { id } = expedition.journey;
  const resumeAt = resumeNodeId(expedition);
  return (
    <ScrollView ph-no-capture contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + LAYOUT.gutter }]}>
      <RecapCard expedition={expedition} onContinue={() => resumeAt && onContinue(id, resumeAt)} />
      <View>
        <Text style={[styles.eyebrow, styles.listHead, { color: palette.muted }]}>ROUTE · TAP TO REOPEN</Text>
        {expedition.nodes.map((node) => (
          <NodeRow key={node.id} node={node} depth={depths.get(node.id) ?? 1} onOpen={() => onContinue(id, node.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

/** One expedition's recap card and route (SPEC.md §3.5, DESIGN.md §5.10). */
export function RecapScreen({ journeyId, onBack, onContinue }: RecapScreenProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const { journeys } = useAppServices();
  const load = useCallback(async () => {
    const expedition = await journeys.expedition(journeyId);
    if (!expedition) throw new Error(`No expedition ${journeyId}.`);
    return expedition;
  }, [journeys, journeyId]);
  const { state, retry } = useLoaded('logbook.recap', load);

  return (
    <View style={[styles.root, { backgroundColor: palette.paper, paddingTop: insets.top }]}>
      <ScreenHeader title="EXPEDITION LOG" onBack={onBack} />
      {state.status === 'ready' ? <RecapContent expedition={state.value} onContinue={onContinue} /> : <LoadStatus status={state.status} onRetry={retry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: LAYOUT.gutter, paddingTop: 8, gap: 24 },
  card: { borderRadius: LAYOUT.cardRadius, borderWidth: StyleSheet.hairlineWidth, padding: LAYOUT.cardPadding, gap: 16 },
  eyebrow: { fontFamily: FONT.mono, ...TYPE.meta },
  headline: { fontFamily: FONT.displayItalic, fontSize: 26, lineHeight: 32 },
  route: { gap: 6 },
  body: { fontFamily: FONT.body, ...TYPE.body },
  primary: { height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryLabel: { fontFamily: FONT.bodyStrong, fontSize: 16 },
  pressed: { opacity: 0.7 },
  listHead: { marginBottom: 4 },
  node: { minHeight: LAYOUT.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  nodeMark: { fontFamily: FONT.mono, fontSize: 14, width: 16, textAlign: 'center' },
  nodeTitle: { flex: 1, fontFamily: FONT.body, fontSize: 16, lineHeight: 22 },
});
