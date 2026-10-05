import { GearSix } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOPIC_TILES } from '../config/topicTiles';
import { type FindActions, FindSheet } from '../finds/FindSheet';
import { FindToast } from '../finds/FindToast';
import type { Find } from '../finds/findTypes';
import { useFindsState } from '../finds/useFinds';
import { recapOf } from '../journeys/expedition';
import type { Expedition } from '../journeys/journeyTypes';
import type { CompletedNode } from '../interests/completedNodes';
import type { TreeTarget } from '../interests/treeTarget';
import type { Logbook } from '../journeys/journeySession';
import { useAppServices } from '../services/AppServices';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { CompletedSection } from './CompletedSection';
import { FindsSection } from './FindsSection';
import { LoadStatus } from './LoadStatus';
import { logDate, tangentCount } from './logbookFormat';
import { RouteStrip } from './RouteStrip';
import { ScreenHeader } from './ScreenHeader';
import { Stamp } from './Stamp';
import { useLoaded } from './useLoaded';

interface LogbookScreenProps {
  onBack: () => void;
  onOpenExpedition: (journeyId: string) => void;
  onOpenSettings: () => void;
  /** A Completed row opens its tile's tree (SPEC.md §3.5). */
  onOpenTree: (target: TreeTarget) => void;
  onOpenFinds: () => void;
  findActions: FindActions;
  /** On top, so its toasts show (false while a screen is pushed over it). */
  isFocused?: boolean;
}

interface LogbookData {
  logbook: Logbook;
  completed: readonly CompletedNode[];
}

const STAMPS_PER_ROW = 5;
const STAMP_GAP = 8;
const MAX_STAMP = 72;
const GEAR_ICON_SIZE = 22;

function StampGrid({ collected }: { collected: ReadonlySet<string> }) {
  const palette = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.floor(Math.min(MAX_STAMP, (width - LAYOUT.gutter * 2 - STAMP_GAP * (STAMPS_PER_ROW - 1)) / STAMPS_PER_ROW));
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[styles.eyebrow, { color: palette.muted }]}>STAMPS</Text>
        <Text style={[styles.eyebrow, { color: palette.muted }]}>{`${collected.size} / ${TOPIC_TILES.length}`}</Text>
      </View>
      <View style={[styles.grid, { gap: STAMP_GAP }]}>
        {TOPIC_TILES.map((tile) => (
          <Stamp key={tile.id} tile={tile} collected={collected.has(tile.id)} size={size} />
        ))}
      </View>
    </View>
  );
}

function ExpeditionRow({ expedition, onOpen }: { expedition: Expedition; onOpen: (journeyId: string) => void }) {
  const palette = useTheme();
  const { journey } = expedition;
  const recap = recapOf(expedition);
  const meta = `${logDate(journey.createdAt)} · ${tangentCount(recap.tangents)}`;
  return (
    <Pressable
      ph-no-capture
      onPress={() => onOpen(journey.id)}
      accessibilityRole="button"
      accessibilityLabel={`${journey.title}. ${meta}`}
      style={({ pressed }) => [styles.row, { backgroundColor: palette.card, borderColor: palette.line }, pressed && styles.pressed]}
    >
      <Text style={[styles.rowTitle, { color: palette.ink }]} numberOfLines={2}>{journey.title}</Text>
      <Text style={[styles.eyebrow, { color: palette.muted }]}>{meta}</Text>
      <RouteStrip route={recap.route} />
    </Pressable>
  );
}

interface LogbookContentProps {
  data: LogbookData;
  onOpenExpedition: (journeyId: string) => void;
  onOpenTree: (target: TreeTarget) => void;
  onOpenFind: (find: Find) => void;
  onOpenFinds: () => void;
}

function LogbookContent({ data: { logbook, completed }, onOpenExpedition, onOpenTree, onOpenFind, onOpenFinds }: LogbookContentProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const { finds } = useFindsState();
  const collected = new Set(logbook.stamps.map((stamp) => stamp.tileId));
  // An expedition with no nodes never got past its first write; there's nothing to show or resume.
  const expeditions = logbook.expeditions.filter((expedition) => expedition.nodes.length > 0);
  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + LAYOUT.gutter }]}>
      <StampGrid collected={collected} />
      <FindsSection finds={finds} onOpenFind={onOpenFind} onSeeAll={onOpenFinds} />
      <CompletedSection completed={completed} onOpenTree={onOpenTree} />
      <View style={styles.section}>
        <Text style={[styles.eyebrow, { color: palette.muted }]}>EXPEDITIONS</Text>
        {expeditions.length === 0 ? (
          <Text style={[styles.empty, { color: palette.muted }]}>No expeditions yet. Swipe left on anything that catches your eye.</Text>
        ) : (
          expeditions.map((expedition) => <ExpeditionRow key={expedition.journey.id} expedition={expedition} onOpen={onOpenExpedition} />)
        )}
      </View>
    </ScrollView>
  );
}

/** Stamps collected, finds, interest-tree nodes completed and every expedition so far (DESIGN.md §6.5). */
export function LogbookScreen({ onBack, onOpenExpedition, onOpenSettings, onOpenTree, onOpenFinds, findActions, isFocused = true }: LogbookScreenProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const { journeys, completedNodes } = useAppServices();
  const load = useCallback(async (): Promise<LogbookData> => {
    const [logbook, completed] = await Promise.all([journeys.logbook(), completedNodes.list()]);
    return { logbook, completed };
  }, [journeys, completedNodes]);
  const { state, retry } = useLoaded('logbook.load', load);
  const [openFind, setOpenFind] = useState<Find | null>(null);

  return (
    <View style={[styles.root, { backgroundColor: palette.paper, paddingTop: insets.top }]}>
      <ScreenHeader
        title="LOGBOOK"
        onBack={onBack}
        trailing={
          <Pressable onPress={onOpenSettings} accessibilityRole="button" accessibilityLabel="Settings" hitSlop={8} style={styles.gear}>
            <GearSix size={GEAR_ICON_SIZE} color={palette.ink} />
          </Pressable>
        }
      />
      {state.status === 'ready' ? (
        <LogbookContent data={state.value} onOpenExpedition={onOpenExpedition} onOpenTree={onOpenTree} onOpenFind={setOpenFind} onOpenFinds={onOpenFinds} />
      ) : (
        <LoadStatus status={state.status} onRetry={retry} />
      )}
      {openFind && <FindSheet find={openFind} actions={findActions} onClose={() => setOpenFind(null)} />}
      <FindToast active={isFocused} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gear: { width: LAYOUT.minTouchTarget, height: LAYOUT.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: LAYOUT.gutter, gap: 28, paddingTop: 8 },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { fontFamily: FONT.mono, ...TYPE.meta },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { borderRadius: LAYOUT.seedRadius, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
  pressed: { opacity: 0.7 },
  rowTitle: { fontFamily: FONT.display, fontSize: 20, lineHeight: 26 },
  empty: { fontFamily: FONT.body, ...TYPE.body },
});
