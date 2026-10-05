import { Check } from 'phosphor-react-native';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TopicIcon } from '../../cards/TopicIcon';
import { INTEREST_TREES } from '../../config/interestTree';
import { TOPIC_TILES } from '../../config/topicTiles';
import { ScreenHeader } from '../../logbook/ScreenHeader';
import { FONT } from '../../theme/fonts';
import { LAYOUT, TYPE } from '../../theme/layout';
import { useTheme } from '../../theme/useTheme';
import { togglePick } from '../interestPicks';
import { tileState, treeStatus } from '../treeState';
import { DottedLine } from './DottedLine';
import { SubfieldCard } from './SubfieldCard';

interface InterestTreeScreenProps {
  tileId: string;
  picks: readonly string[];
  onChange: (picks: string[]) => void;
  onBack: () => void;
  /** A subfield to scroll to on opening, e.g. the parent of a completed node. */
  focusSubfieldId?: string;
}

const HERO_ICON = 46;
const BOX_SIZE = 24;

/** One tile's tree: the broad pick, then its subfields on a route spine (DESIGN.md §5.13). Edits the draft only. */
export function InterestTreeScreen({ tileId, picks, onChange, onBack, focusSubfieldId }: InterestTreeScreenProps) {
  const palette = useTheme();
  const tile = TOPIC_TILES.find((t) => t.id === tileId);
  const [scroller, setScroller] = useState<ScrollView | null>(null);
  if (!tile) return null;
  const accent = palette.territory[tile.territory];
  const broad = tileState(picks, tileId).kind === 'broad';
  const toggle = (path: string) => onChange(togglePick(picks, path));
  const scrollToFocus = (subfieldId: string) => (event: LayoutChangeEvent) => {
    if (subfieldId === focusSubfieldId) scroller?.scrollTo({ y: event.nativeEvent.layout.y, animated: false });
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.paper }]}>
      <ScreenHeader title={`INTERESTS › ${tile.label.toUpperCase()}`} onBack={onBack} />
      <ScrollView ref={setScroller} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: accent }]}>
          <Text style={[styles.status, { color: palette.onTerritory }]}>{treeStatus(picks, tileId)}</Text>
          <Text style={[styles.heroTitle, { color: palette.onTerritory }]} accessibilityRole="header">
            {tile.label}
          </Text>
          <View style={styles.heroIcon}>
            <TopicIcon tileId={tileId} size={HERO_ICON} color={palette.onTerritory} />
          </View>
          <Pressable
            onPress={() => toggle(tileId)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: broad }}
            accessibilityLabel={`All of ${tile.label}`}
            style={[styles.allPill, { borderColor: palette.onTerritory }, broad && { backgroundColor: palette.onTerritory }]}
          >
            <View style={[styles.allBox, { borderColor: broad ? accent : palette.onTerritory }, broad && { backgroundColor: accent }]}>
              {broad && <Check size={12} weight="bold" color={palette.onTerritory} />}
            </View>
            <Text style={[styles.allLabel, { color: broad ? accent : palette.onTerritory }]}>ALL OF {tile.label.toUpperCase()}</Text>
          </Pressable>
        </View>
        <Text style={[styles.spineLabel, { color: palette.muted }]}>OR CHART YOUR OWN CORNERS</Text>
        <View>
          <DottedLine direction="vertical" color={palette.muted} style={styles.spine} />
          {(INTEREST_TREES[tileId] ?? []).map((subfield, index) => (
            <View key={subfield.id} onLayout={scrollToFocus(subfield.id)}>
              <SubfieldCard tileId={tileId} subfield={subfield} index={index} picks={picks} accent={accent} palette={palette} onToggle={toggle} />
            </View>
          ))}
        </View>
        <Text style={[styles.foot, { color: palette.muted }]}>THE MOST SPECIFIC PICK WINS. A TOPIC NARROWS ITS CORNER TO JUST THAT TOPIC.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: LAYOUT.gutter, paddingTop: 4, paddingBottom: 32 },
  hero: { borderRadius: LAYOUT.cardRadius, padding: 16, marginBottom: 18, overflow: 'hidden' },
  status: { fontFamily: FONT.mono, fontSize: 10, lineHeight: 14, letterSpacing: 0.9 },
  heroTitle: { fontFamily: FONT.display, ...TYPE.typographicTitle, marginTop: 6, marginBottom: 14, marginRight: HERO_ICON + 8 },
  heroIcon: { position: 'absolute', right: 14, top: 12 },
  allPill: { alignSelf: 'flex-start', minHeight: 38, borderRadius: 19, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 14 },
  allBox: { width: BOX_SIZE, height: BOX_SIZE, borderRadius: BOX_SIZE / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  allLabel: { fontFamily: FONT.mono, ...TYPE.meta },
  spineLabel: { fontFamily: FONT.mono, ...TYPE.meta, marginBottom: 10 },
  spine: { position: 'absolute', left: 8, top: -16, bottom: 24 },
  foot: { fontFamily: FONT.monoLight, fontSize: 9.5, lineHeight: 15, marginTop: 4, marginLeft: 26 },
});
