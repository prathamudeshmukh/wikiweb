import { Check } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TopicIcon } from '../cards/TopicIcon';
import { TOPIC_TILES } from '../config/topicTiles';
import type { CompletedNode } from '../interests/completedNodes';
import { nodeLabel, resolvePick, tileOf } from '../interests/interestPicks';
import { type TreeTarget, treeTargetForNode } from '../interests/treeTarget';
import { FONT } from '../theme/fonts';
import { TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { completedCaption } from './logbookFormat';

interface CompletedSectionProps {
  completed: readonly CompletedNode[];
  onOpenTree: (target: TreeTarget) => void;
}

// DESIGN.md §6.5
const SWATCH = 40;
const SWATCH_ICON = 20;

function CompletedRow({ node, onOpenTree }: { node: CompletedNode; onOpenTree: (target: TreeTarget) => void }) {
  const palette = useTheme();
  const pick = resolvePick(node.nodePath)?.pick;
  const tileId = tileOf(node.nodePath);
  const territory = TOPIC_TILES.find((tile) => tile.id === tileId)?.territory;
  const label = pick ? nodeLabel(pick) : node.nodePath;
  const caption = completedCaption(node);
  return (
    <Pressable
      onPress={() => onOpenTree(treeTargetForNode(node.nodePath))}
      accessibilityRole="button"
      accessibilityLabel={`${label}, read in full. ${caption}`}
      style={({ pressed }) => [styles.row, { borderColor: palette.line }, pressed && styles.pressed]}
    >
      <View style={[styles.swatch, { backgroundColor: territory ? palette.territory[territory] : palette.ink }]}>
        <TopicIcon tileId={tileId} size={SWATCH_ICON} color={palette.onTerritory} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.caption, { color: palette.muted }]}>{caption}</Text>
      </View>
      <Check size={18} color={palette.muted} />
    </Pressable>
  );
}

/** Interest-tree nodes read in full, newest first; hidden while empty (SPEC.md §3.5, §3.9). */
export function CompletedSection({ completed, onOpenTree }: CompletedSectionProps) {
  const palette = useTheme();
  if (completed.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: palette.muted }]}>COMPLETED · {completed.length}</Text>
      <View>
        {completed.map((node) => (
          <CompletedRow key={node.nodePath} node={node} onOpenTree={onOpenTree} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 4 },
  eyebrow: { fontFamily: FONT.mono, ...TYPE.meta, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.7 },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: FONT.display, fontSize: 18, lineHeight: 22 },
  caption: { fontFamily: FONT.mono, fontSize: 10, lineHeight: 14, letterSpacing: 0.6, marginTop: 3 },
});
