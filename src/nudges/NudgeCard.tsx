import * as Haptics from 'expo-haptics';
import { Check } from '../theme/icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { TopicIcon } from '../cards/TopicIcon';
import { TOPIC_TILES } from '../config/topicTiles';
import { tileOf } from '../interests/interestPicks';
import { FONT } from '../theme/fonts';
import { LAYOUT } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { CompletionSeal } from './CompletionSeal';
import { NUDGE_ICON_SIZE, nudgeBlockHeight, nudgeCardStyles } from './nudgeCardStyles';
import { type NudgeCopy, nudgeCopy } from './nudgeCopy';
import type { Chip, NicheNudge } from './nudgeRules';
import { useSwipeAway } from './useSwipeAway';

interface NudgeCardProps {
  nudge: NicheNudge;
  chips: readonly Chip[];
  /** Chips tapped so far, shown as picked until Home rebuilds. */
  pickedChips: ReadonlySet<string>;
  width: number;
  height: number;
  enabled: boolean;
  onChip: (chip: Chip) => void;
  onOpenTree: () => void;
  /** Swiped away to the right. */
  onDismiss: () => void;
  /** The column's own right-swipe, which this card's swipe takes over. */
  columnPan: GestureType;
}

// DESIGN.md §5.14
// IBM Plex Mono draws ✓ like a √, so checks are the Phosphor icon instead.
const CHECK_SIZE = 11;

function NudgeCardImpl({ nudge, chips, pickedChips, width, height, enabled, onChip, onOpenTree, onDismiss, columnPan }: NudgeCardProps) {
  const palette = useTheme();
  const tileId = nudge.kind === 'prompt' ? nudge.tileId : tileOf(nudge.node.path);
  const tile = TOPIC_TILES.find((t) => t.id === tileId);
  const accent = tile ? palette.territory[tile.territory] : palette.ink;
  const copy: NudgeCopy = nudgeCopy(nudge);
  const { pan, slideStyle } = useSwipeAway({ width, enabled, onDismiss, columnPan });

  const tapChip = (chip: Chip) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChip(chip);
  };
  const blockHeight = nudgeBlockHeight(width, height);
  const chipActions = chips.map((chip) => ({ name: chip.path, label: `Add ${chip.label}` }));

  return (
    <View testID={`nudge-${nudge.kind}`} style={{ width, height, marginHorizontal: LAYOUT.gutter }}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: palette.card },
            palette.cardShadow ? styles.lift : { borderWidth: 1, borderColor: palette.line },
            slideStyle,
          ]}
          accessible
          accessibilityLabel={`${copy.title}. ${copy.body}`}
          accessibilityActions={[...chipActions, { name: 'tree', label: 'See the whole tree' }, { name: 'skip', label: 'Skip' }]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'tree') onOpenTree();
            else if (nativeEvent.actionName === 'skip') onDismiss();
            else {
              const chip = chips.find((c) => c.path === nativeEvent.actionName);
              if (chip) tapChip(chip);
            }
          }}
        >
          <Pressable onPress={onOpenTree} style={styles.body} disabled={!enabled}>
            <View style={[styles.block, { backgroundColor: accent, height: blockHeight }]}>
              <Text style={[styles.eyebrow, { color: palette.onTerritory }]} numberOfLines={1}>
                {copy.eyebrow.toUpperCase()}
              </Text>
              <Text style={[styles.title, { color: palette.onTerritory }]} numberOfLines={3}>
                {copy.title}
              </Text>
              <View style={styles.icon}>
                <TopicIcon tileId={tileId} size={NUDGE_ICON_SIZE} color={palette.onTerritory} />
              </View>
              {nudge.kind === 'exhausted' && <CompletionSeal count={nudge.node.articleCount} color={palette.onTerritory} />}
            </View>
            <View style={styles.meta}>
              <Text style={[styles.metaText, { color: accent }]}>● {(tile?.label ?? tileId).toUpperCase()}</Text>
              <Text style={[styles.metaText, { color: palette.muted }]}>{copy.metaRight.toUpperCase()}</Text>
            </View>
            <Text style={[styles.copy, { color: palette.ink }]}>{copy.body}</Text>
            <View style={styles.chips}>
              {chips.map((chip) => {
                const picked = pickedChips.has(chip.path);
                return (
                  <Pressable
                    key={chip.path}
                    onPress={() => tapChip(chip)}
                    disabled={!enabled}
                    style={[styles.chip, picked ? { backgroundColor: palette.ink, borderColor: palette.ink } : { backgroundColor: palette.paper, borderColor: palette.line }]}
                  >
                    <View style={[styles.dot, { backgroundColor: picked ? palette.card : accent }]} />
                    {picked && <Check testID="chip-check" size={CHECK_SIZE} weight="bold" color={palette.card} />}
                    <Text style={[styles.chipLabel, { color: picked ? palette.card : palette.ink }]}>
                      {picked ? '' : '+ '}
                      {chip.label.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.why}>
              <View style={styles.whyLead}>
                {nudge.kind === 'exhausted' && <Check testID="why-check" size={CHECK_SIZE} weight="bold" color={palette.muted} />}
                <Text style={[styles.whyText, { color: palette.muted }]} numberOfLines={1}>
                  {copy.whyLine.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.whyText, { color: nudge.kind === 'prompt' ? palette.ink : palette.muted }]}>{copy.whyAction.toUpperCase()}</Text>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const NudgeCard = memo(NudgeCardImpl);

const styles = {
  ...nudgeCardStyles,
  ...StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { minHeight: 34, borderRadius: 17, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 7, height: 7, borderRadius: 3.5 },
    chipLabel: { fontFamily: FONT.mono, fontSize: 11, letterSpacing: 0.6 },
  }),
};
