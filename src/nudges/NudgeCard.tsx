import * as Haptics from 'expo-haptics';
import { Check } from 'phosphor-react-native';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { TopicIcon } from '../cards/TopicIcon';
import { TOPIC_TILES } from '../config/topicTiles';
import { GESTURE } from '../explore/hopController';
import { tileOf } from '../interests/interestPicks';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { CompletionSeal } from './CompletionSeal';
import { type NudgeCopy, nudgeCopy } from './nudgeCopy';
import type { Chip, Nudge } from './nudgeRules';

interface NudgeCardProps {
  nudge: Nudge;
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
const ICON_SIZE = 40;
const BLOCK_ASPECT = 10 / 16;
const MAX_BLOCK_SHARE = 0.34;
const DISMISS_MS = 220;
// IBM Plex Mono draws ✓ like a √, so checks are the Phosphor icon instead.
const CHECK_SIZE = 11;

function NudgeCardImpl({ nudge, chips, pickedChips, width, height, enabled, onChip, onOpenTree, onDismiss, columnPan }: NudgeCardProps) {
  const palette = useTheme();
  const tx = useSharedValue(0);
  const tileId = nudge.kind === 'prompt' ? nudge.tileId : tileOf(nudge.node.path);
  const tile = TOPIC_TILES.find((t) => t.id === tileId);
  const accent = tile ? palette.territory[tile.territory] : palette.ink;
  const copy: NudgeCopy = nudgeCopy(nudge);
  const cardWidth = width;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetX([-GESTURE.unreachable, GESTURE.lockSlop])
        .failOffsetX([-GESTURE.lockSlop, GESTURE.unreachable])
        .failOffsetY([-GESTURE.lockSlop, GESTURE.lockSlop])
        .blocksExternalGesture(columnPan)
        .onUpdate((e) => {
          tx.set(Math.max(0, e.translationX));
        })
        .onEnd((e) => {
          const commit = tx.get() >= cardWidth * GESTURE.commitRatio || e.velocityX >= GESTURE.commitVelocity;
          if (!commit) {
            tx.set(withSpring(0, GESTURE.spring));
            return;
          }
          tx.set(
            withTiming(cardWidth + LAYOUT.gutter * 2, { duration: DISMISS_MS }, (finished) => {
              if (finished) scheduleOnRN(onDismiss);
            }),
          );
        }),
    [enabled, cardWidth, columnPan, onDismiss, tx],
  );
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const tapChip = (chip: Chip) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChip(chip);
  };
  const blockHeight = Math.min(width * BLOCK_ASPECT, height * MAX_BLOCK_SHARE);
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
                <TopicIcon tileId={tileId} size={ICON_SIZE} color={palette.onTerritory} />
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

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: LAYOUT.cardRadius, overflow: 'hidden' },
  lift: { shadowColor: '#1F1B16', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
  body: { flex: 1, padding: LAYOUT.cardPadding },
  block: { borderRadius: LAYOUT.imageRadius, padding: 16, justifyContent: 'space-between' },
  eyebrow: { fontFamily: FONT.mono, ...TYPE.meta, marginRight: 80 },
  title: { fontFamily: FONT.display, fontSize: 30, lineHeight: 34, marginRight: ICON_SIZE },
  icon: { position: 'absolute', right: 14, bottom: 12 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  metaText: { fontFamily: FONT.mono, ...TYPE.meta },
  copy: { fontFamily: FONT.body, fontSize: 16, lineHeight: 25, marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 34, borderRadius: 17, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  chipLabel: { fontFamily: FONT.mono, fontSize: 11, letterSpacing: 0.6 },
  why: { marginTop: 'auto', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  whyLead: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  whyText: { fontFamily: FONT.monoLight, ...TYPE.meta, flexShrink: 1 },
});
