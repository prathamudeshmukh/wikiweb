import { Check } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { InterestSubfield } from '../../config/interestTree';
import { FONT } from '../../theme/fonts';
import { LAYOUT } from '../../theme/layout';
import type { Palette } from '../../theme/tokens';
import { DottedLine } from './DottedLine';
import { leafState, type NodeState, subfieldState } from '../treeState';

interface SubfieldCardProps {
  tileId: string;
  subfield: InterestSubfield;
  /** Alternates the tilt of picked cards, like picked tiles. */
  index: number;
  picks: readonly string[];
  accent: string;
  palette: Palette;
  onToggle: (path: string) => void;
}

// DESIGN.md §5.13
const PICKED_TILT_DEG = 0.8;
const CHECK_SIZE = 28;
const PIN_SIZE = 14;
const CHIP_HEIGHT = 32;
const CHIP_HIT_SLOP = (LAYOUT.minTouchTarget - CHIP_HEIGHT) / 2;
// IBM Plex Mono draws ✓ like a √, so picked marks are the Phosphor check instead.
const CHIP_CHECK = 11;

function pinFill(state: NodeState, accent: string, palette: Palette): object {
  if (state.kind === 'picked') return { backgroundColor: accent };
  if (state.kind === 'partial') return { backgroundColor: palette.paper, borderLeftColor: accent, borderLeftWidth: PIN_SIZE / 2 };
  return { backgroundColor: palette.paper };
}

function subfieldA11yLabel(subfield: InterestSubfield, state: NodeState): string {
  return state.kind === 'partial' ? `${subfield.label}, ${state.picks} ${state.picks === 1 ? 'topic' : 'topics'} picked` : subfield.label;
}

/** One subfield on the tree's route spine: header checkbox, sample articles and its leaves as chips. */
export function SubfieldCard({ tileId, subfield, index, picks, accent, palette, onToggle }: SubfieldCardProps) {
  const path = `${tileId}/${subfield.id}`;
  const state = subfieldState(picks, path);
  const picked = state.kind === 'picked';
  const tilt = picked ? `${index % 2 ? PICKED_TILT_DEG : -PICKED_TILT_DEG}deg` : '0deg';
  return (
    <View style={styles.node}>
      <View style={[styles.pin, { borderColor: accent }, pinFill(state, accent, palette)]} />
      <DottedLine direction="horizontal" color={palette.muted} style={styles.stub} />
      <View
        style={[
          styles.card,
          { backgroundColor: palette.card, transform: [{ rotate: tilt }] },
          palette.cardShadow ? styles.lift : { borderWidth: 1, borderColor: palette.line },
          picked && { borderWidth: 1.5, borderColor: accent },
        ]}
      >
        <Pressable
          onPress={() => onToggle(path)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: picked ? true : state.kind === 'partial' ? 'mixed' : false }}
          accessibilityLabel={subfieldA11yLabel(subfield, state)}
          style={styles.head}
        >
          <View style={styles.headText}>
            <Text style={[styles.title, { color: palette.ink }]}>{subfield.label}</Text>
            <Text style={[styles.examples, { color: palette.muted }]}>{subfield.examples.join(' · ')}…</Text>
          </View>
          <View style={[styles.check, picked ? { backgroundColor: accent, borderColor: accent } : { borderColor: state.kind === 'partial' ? accent : palette.line }]}>
            {picked && <Check size={14} weight="bold" color={palette.onTerritory} />}
            {state.kind === 'partial' && <Text style={[styles.checkCount, { color: accent }]}>{state.picks}</Text>}
          </View>
        </Pressable>
        <View style={styles.chips}>
          {subfield.leaves.map((leaf) => {
            const leafPath = `${path}/${leaf.id}`;
            const chip = leafState(picks, leafPath);
            const on = chip === 'picked';
            const color = on ? palette.onTerritory : chip === 'included' ? accent : palette.ink;
            return (
              <Pressable
                key={leaf.id}
                onPress={() => onToggle(leafPath)}
                hitSlop={CHIP_HIT_SLOP}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${leaf.label}, about ${leaf.poolSize} articles`}
                style={[
                  styles.chip,
                  on
                    ? { backgroundColor: accent, borderColor: accent }
                    : chip === 'included'
                      ? { backgroundColor: palette.paper, borderColor: accent, borderStyle: 'dashed' }
                      : { backgroundColor: palette.paper, borderColor: palette.line },
                ]}
              >
                {on && <Check testID="chip-check" size={CHIP_CHECK} weight="bold" color={color} />}
                <Text style={[styles.chipLabel, { color }]}>{leaf.label.toUpperCase()}</Text>
                <Text style={[styles.chipCount, { color: on ? palette.onTerritory : palette.muted }]}>{leaf.poolSize}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  node: { marginBottom: 12, paddingLeft: 26 },
  pin: { position: 'absolute', left: 2, top: 18, width: PIN_SIZE, height: PIN_SIZE, borderRadius: PIN_SIZE / 2, borderWidth: 2, overflow: 'hidden', zIndex: 1 },
  stub: { position: 'absolute', left: 16, top: 24, width: 10 },
  card: { borderRadius: 16, paddingHorizontal: 12, paddingBottom: 12 },
  lift: { shadowColor: '#1F1B16', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 12, paddingBottom: 8 },
  headText: { flex: 1, minWidth: 0 },
  title: { fontFamily: FONT.display, fontSize: 19, lineHeight: 23 },
  examples: { fontFamily: FONT.body, fontStyle: 'italic', fontSize: 13, lineHeight: 18, marginTop: 2 },
  check: { width: CHECK_SIZE, height: CHECK_SIZE, borderRadius: CHECK_SIZE / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkCount: { fontFamily: FONT.mono, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: CHIP_HEIGHT, borderRadius: CHIP_HEIGHT / 2, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipLabel: { fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: 0.5 },
  chipCount: { fontFamily: FONT.monoLight, fontSize: 9.5 },
});
