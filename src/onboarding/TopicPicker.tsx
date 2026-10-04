import { Check, TreeStructure } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TopicIcon } from '../cards/TopicIcon';
import { TOPIC_TILES, type TopicTile } from '../config/topicTiles';
import { hasTree, tilesTouched } from '../interests/interestPicks';
import { type NodeState, tileState } from '../interests/treeState';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import type { Palette } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { MIN_INTERESTS, toggleInterest } from './interestSelection';

interface TopicPickerProps {
  selected: readonly string[];
  onChange: (picks: string[]) => void;
  /** Settings only (SPEC.md §3.9): tiles with an interest tree open it instead of toggling. Onboarding stays flat. */
  onOpenTree?: (tileId: string) => void;
}

const COLUMNS = 4;
const TILE_HEIGHT = 84;
const TILE_GAP = 8;
const TILE_ICON = 26;
const SELECTED_TILT_DEG = 2;
const LABEL_MIN_SCALE = 0.75;
const TREE_MARK = 12;

interface TileProps {
  tile: TopicTile;
  index: number;
  state: NodeState;
  /** Opens the tile's tree rather than toggling it. */
  opensTree: boolean;
  palette: Palette;
  onPress: () => void;
}

function treeTileLabel(label: string, state: NodeState): string {
  if (state.kind === 'narrowed') return `${label}, narrowed to ${state.picks} ${state.picks === 1 ? 'pick' : 'picks'}`;
  return state.kind === 'broad' ? `${label}, all picked` : `${label}, not picked`;
}

function Corner({ state, opensTree, accent, palette }: { state: NodeState; opensTree: boolean; accent: string; palette: Palette }) {
  if (state.kind === 'narrowed') {
    return (
      <View style={[styles.check, { backgroundColor: palette.onTerritory }]}>
        <Text style={[styles.badgeCount, { color: accent }]}>{state.picks}</Text>
      </View>
    );
  }
  if (state.kind === 'broad') {
    return (
      <View style={[styles.check, { backgroundColor: palette.onTerritory }]}>
        <Check size={13} color={accent} weight="bold" />
      </View>
    );
  }
  return opensTree ? (
    <View style={styles.branch}>
      <TreeStructure size={TREE_MARK} color={accent} />
    </View>
  ) : null;
}

function Tile({ tile, index, state, opensTree, palette, onPress }: TileProps) {
  const accent = palette.territory[tile.territory];
  const tilt = `${index % 2 ? SELECTED_TILT_DEG : -SELECTED_TILT_DEG}deg`;
  const selected = state.kind !== 'unpicked';
  const a11y = opensTree
    ? { accessibilityRole: 'button' as const, accessibilityLabel: treeTileLabel(tile.label, state), accessibilityHint: 'Opens its interest tree' }
    : { accessibilityRole: 'checkbox' as const, accessibilityState: { checked: selected }, accessibilityLabel: tile.label };
  return (
    <Pressable
      onPress={onPress}
      {...a11y}
      style={[
        styles.tile,
        selected
          ? { backgroundColor: accent, borderColor: accent, transform: [{ rotate: tilt }] }
          : { backgroundColor: palette.card, borderColor: palette.line },
      ]}
    >
      <TopicIcon tileId={tile.id} size={TILE_ICON} color={selected ? palette.onTerritory : accent} />
      <View>
        {/* Single long words ("Philosophy") get one line so they shrink to fit instead of breaking mid-word. */}
        <Text
          style={[styles.tileLabel, { color: selected ? palette.onTerritory : palette.ink }]}
          numberOfLines={tile.label.includes(' ') ? 2 : 1}
          adjustsFontSizeToFit
          minimumFontScale={LABEL_MIN_SCALE}
          textBreakStrategy="simple"
        >
          {tile.label}
        </Text>
        {state.kind === 'narrowed' && <Text style={[styles.narrowed, { color: palette.onTerritory }]}>NARROWED</Text>}
      </View>
      <Corner state={state} opensTree={opensTree} accent={accent} palette={palette} />
    </Pressable>
  );
}

/** The topic tile grid with its pick counter, shared by onboarding and Settings. */
export function TopicPicker({ selected, onChange, onOpenTree }: TopicPickerProps) {
  const palette = useTheme();
  return (
    <>
      <Text style={[styles.count, { color: palette.muted }]}>
        PICK AT LEAST {MIN_INTERESTS} · <Text style={{ color: palette.ink }}>{tilesTouched(selected)} PICKED</Text>
      </Text>
      <View style={styles.grid}>
        {TOPIC_TILES.map((tile, index) => {
          const opensTree = onOpenTree !== undefined && hasTree(tile.id);
          const press = () => (opensTree ? onOpenTree(tile.id) : onChange(toggleInterest(selected, tile.id)));
          return <Tile key={tile.id} tile={tile} index={index} state={tileState(selected, tile.id)} opensTree={opensTree} palette={palette} onPress={press} />;
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  count: { fontFamily: FONT.mono, ...TYPE.meta, paddingTop: 6, paddingBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: {
    width: `${(100 - (COLUMNS - 1) * 2.5) / COLUMNS}%`,
    height: TILE_HEIGHT,
    padding: 10,
    borderRadius: LAYOUT.imageRadius,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  tileLabel: { fontFamily: FONT.display, fontSize: 14, lineHeight: 17 },
  check: { position: 'absolute', top: 8, right: 8, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeCount: { fontFamily: FONT.mono, fontSize: 11, lineHeight: 14 },
  branch: { position: 'absolute', top: 8, right: 8 },
  narrowed: { fontFamily: FONT.mono, fontSize: 8.5, lineHeight: 11, letterSpacing: 0.5 },
});
