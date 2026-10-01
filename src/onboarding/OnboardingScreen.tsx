import { ArrowRight, Check } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopicIcon } from '../cards/TopicIcon';
import { TOPIC_TILES, type TopicTile } from '../config/topicTiles';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import type { Palette } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { canContinue, DEFAULT_INTERESTS, MIN_INTERESTS, toggleInterest } from './interestSelection';

interface OnboardingScreenProps {
  onDone: (tileIds: readonly string[]) => void;
}

const COLUMNS = 4;
const TILE_HEIGHT = 84;
const TILE_GAP = 8;
const TILE_ICON = 26;
const SELECTED_TILT_DEG = 2;
const DISABLED_OPACITY = 0.4;
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

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<readonly string[]>([]);
  const ready = canContinue(selected);

  return (
    <View style={[styles.root, { backgroundColor: palette.paper, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: palette.ink }]} accessibilityRole="header">Where shall we start?</Text>
        <Text style={[styles.intro, { color: palette.muted }]}>Pick the corners of Wikipedia you like. Your first feed starts there, then you can wander anywhere.</Text>
        <Text style={[styles.count, { color: palette.muted }]}>
          PICK AT LEAST {MIN_INTERESTS} · <Text style={{ color: palette.ink }}>{selected.length} PICKED</Text>
        </Text>
        <View style={styles.grid}>
          {TOPIC_TILES.map((tile, index) => (
            <Tile key={tile.id} tile={tile} index={index} selected={selected.includes(tile.id)} palette={palette} onPress={() => setSelected((s) => toggleInterest(s, tile.id))} />
          ))}
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable
          disabled={!ready}
          onPress={() => onDone(selected)}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          style={[styles.primary, { backgroundColor: palette.ink, opacity: ready ? 1 : DISABLED_OPACITY }]}
        >
          <Text style={[styles.primaryLabel, { color: palette.card }]}>Set off</Text>
          <ArrowRight size={18} color={palette.card} />
        </Pressable>
        <Pressable onPress={() => onDone(DEFAULT_INTERESTS)} accessibilityRole="button" hitSlop={8} style={styles.skip}>
          <Text style={[styles.skipLabel, { color: palette.muted }]}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: LAYOUT.gutter, paddingTop: 24, paddingBottom: 16, gap: 8 },
  heading: { fontFamily: FONT.display, fontSize: 34, lineHeight: 40 },
  intro: { fontFamily: FONT.body, fontSize: 16, lineHeight: 24 },
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
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: LAYOUT.gutter, paddingVertical: 12 },
  primary: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryLabel: { fontFamily: FONT.bodyStrong, fontSize: 17 },
  skip: { height: 52, paddingHorizontal: 18, justifyContent: 'center' },
  skipLabel: { fontFamily: FONT.body, fontSize: 16 },
});
