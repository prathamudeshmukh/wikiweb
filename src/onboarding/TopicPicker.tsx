import { Check } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TopicIcon } from '../cards/TopicIcon';
import { TOPIC_TILES, type TopicTile } from '../config/topicTiles';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import type { Palette } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { MIN_INTERESTS, toggleInterest } from './interestSelection';

interface TopicPickerProps {
  selected: readonly string[];
  onChange: (tileIds: string[]) => void;
}

const COLUMNS = 4;
const TILE_HEIGHT = 84;
const TILE_GAP = 8;
const TILE_ICON = 26;
const SELECTED_TILT_DEG = 2;
const LABEL_MIN_SCALE = 0.75;

interface TileProps {
  tile: TopicTile;
  index: number;
  selected: boolean;
  palette: Palette;
  onPress: () => void;
}

function Tile({ tile, index, selected, palette, onPress }: TileProps) {
  const accent = palette.territory[tile.territory];
  const tilt = `${index % 2 ? SELECTED_TILT_DEG : -SELECTED_TILT_DEG}deg`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={tile.label}
      style={[
        styles.tile,
        selected
          ? { backgroundColor: accent, borderColor: accent, transform: [{ rotate: tilt }] }
          : { backgroundColor: palette.card, borderColor: palette.line },
      ]}
    >
      <TopicIcon tileId={tile.id} size={TILE_ICON} color={selected ? palette.onTerritory : accent} />
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
      {selected && (
        <View style={[styles.check, { backgroundColor: palette.onTerritory }]}>
          <Check size={13} color={accent} weight="bold" />
        </View>
      )}
    </Pressable>
  );
}

/** The topic tile grid with its pick counter, shared by onboarding and Settings. */
export function TopicPicker({ selected, onChange }: TopicPickerProps) {
  const palette = useTheme();
  return (
    <>
      <Text style={[styles.count, { color: palette.muted }]}>
        PICK AT LEAST {MIN_INTERESTS} · <Text style={{ color: palette.ink }}>{selected.length} PICKED</Text>
      </Text>
      <View style={styles.grid}>
        {TOPIC_TILES.map((tile, index) => (
          <Tile key={tile.id} tile={tile} index={index} selected={selected.includes(tile.id)} palette={palette} onPress={() => onChange(toggleInterest(selected, tile.id))} />
        ))}
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
  check: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
