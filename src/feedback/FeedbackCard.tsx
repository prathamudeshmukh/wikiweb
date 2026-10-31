import * as Haptics from 'expo-haptics';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import type { FeedbackRating } from '../analytics/events';
import { FEEDBACK } from '../config/constants';
import { NUDGE_ICON_SIZE, nudgeBlockHeight, nudgeCardStyles } from '../nudges/nudgeCardStyles';
import { useSwipeAway } from '../nudges/useSwipeAway';
import { FONT } from '../theme/fonts';
import { ChatCircleDots } from '../theme/icons';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { FEEDBACK_COPY } from './feedbackCopy';
import type { FeedbackNudge } from './feedbackPrompt';

interface FeedbackCardProps {
  nudge: FeedbackNudge;
  width: number;
  height: number;
  enabled: boolean;
  onRate: (rating: FeedbackRating) => void;
  onEmail: () => void;
  /** Swiped away to the right. */
  onDismiss: () => void;
  /** The column's own right-swipe, which this card's swipe takes over. */
  columnPan: GestureType;
}

const RATINGS: readonly { rating: FeedbackRating; label: string }[] = [
  { rating: 'up', label: FEEDBACK_COPY.up },
  { rating: 'down', label: FEEDBACK_COPY.down },
];

function Thumbs({ enabled, onRate }: Pick<FeedbackCardProps, 'enabled' | 'onRate'>) {
  const palette = useTheme();
  const rate = (rating: FeedbackRating) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRate(rating);
  };
  return (
    <View style={styles.actions}>
      {RATINGS.map(({ rating, label }) => (
        <Pressable
          key={rating}
          onPress={() => rate(rating)}
          disabled={!enabled}
          accessibilityRole="button"
          style={({ pressed }) => [styles.thumb, { backgroundColor: palette.paper, borderColor: pressed ? palette.ink : palette.line }]}
        >
          <Text style={[styles.actionLabel, { color: palette.ink }]}>{label.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function EmailAction({ enabled, onEmail }: Pick<FeedbackCardProps, 'enabled' | 'onEmail'>) {
  const palette = useTheme();
  return (
    <View>
      <Pressable onPress={onEmail} disabled={!enabled} accessibilityRole="button" style={[styles.email, { backgroundColor: palette.ink }]}>
        <Text style={[styles.actionLabel, { color: palette.card }]}>{FEEDBACK_COPY.email.toUpperCase()}</Text>
      </Pressable>
      <Text selectable style={[styles.address, { color: palette.muted }]}>{FEEDBACK.email.toUpperCase()}</Text>
    </View>
  );
}

/** The one-time "Enjoying Tangent?" card (SPEC.md §3.10, DESIGN.md §5.14): the nudge anatomy with an ink block. */
function FeedbackCardImpl({ nudge, width, height, enabled, onRate, onEmail, onDismiss, columnPan }: FeedbackCardProps) {
  const palette = useTheme();
  const { pan, slideStyle } = useSwipeAway({ width, enabled, onDismiss, columnPan });
  const byEmail = nudge.channel === 'email';
  const body = byEmail ? FEEDBACK_COPY.emailBody : FEEDBACK_COPY.body;
  const { actions: labels } = FEEDBACK_COPY;
  const actions = byEmail
    ? [{ name: 'email', label: labels.email }, { name: 'skip', label: labels.skip }]
    : [{ name: 'up', label: labels.up }, { name: 'down', label: labels.down }, { name: 'skip', label: labels.skip }];

  return (
    <View testID="nudge-feedback" style={{ width, height, marginHorizontal: LAYOUT.gutter }}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: palette.card },
            palette.cardShadow ? styles.lift : { borderWidth: 1, borderColor: palette.line },
            slideStyle,
          ]}
          accessible
          accessibilityLabel={`${FEEDBACK_COPY.title} ${body}`}
          accessibilityActions={actions}
          onAccessibilityAction={({ nativeEvent }) => {
            const { actionName } = nativeEvent;
            if (actionName === 'skip') onDismiss();
            else if (actionName === 'email') onEmail();
            else if (actionName === 'up' || actionName === 'down') onRate(actionName);
          }}
        >
          <View style={styles.body}>
            <View style={[styles.block, { backgroundColor: palette.ink, height: nudgeBlockHeight(width, height) }]}>
              <Text style={[styles.eyebrow, { color: palette.card }]} numberOfLines={1}>
                {FEEDBACK_COPY.eyebrow.toUpperCase()}
              </Text>
              <Text style={[styles.title, { color: palette.card }]} numberOfLines={3}>
                {FEEDBACK_COPY.title}
              </Text>
              <View style={styles.icon}>
                <ChatCircleDots size={NUDGE_ICON_SIZE} color={palette.card} />
              </View>
            </View>
            <View style={styles.meta}>
              <Text style={[styles.metaText, { color: palette.ink }]}>● {FEEDBACK_COPY.label.toUpperCase()}</Text>
              <Text style={[styles.metaText, { color: palette.muted }]}>{FEEDBACK_COPY.expeditions(nudge.expeditions).toUpperCase()}</Text>
            </View>
            <Text style={[styles.copy, { color: palette.ink }]}>{body}</Text>
            {byEmail ? <EmailAction enabled={enabled} onEmail={onEmail} /> : <Thumbs enabled={enabled} onRate={onRate} />}
            <View style={styles.why}>
              <Text style={[styles.whyText, { color: palette.muted }]} numberOfLines={1}>
                {FEEDBACK_COPY.skip.toUpperCase()}
              </Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const FeedbackCard = memo(FeedbackCardImpl);

const ACTION_HEIGHT = 52;

const styles = {
  ...nudgeCardStyles,
  ...StyleSheet.create({
    actions: { flexDirection: 'row', gap: 10 },
    thumb: { flex: 1, minHeight: ACTION_HEIGHT, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    email: { minHeight: ACTION_HEIGHT, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    actionLabel: { fontFamily: FONT.mono, fontSize: 12, letterSpacing: 0.8 },
    address: { fontFamily: FONT.mono, ...TYPE.meta, textAlign: 'center', marginTop: 8 },
  }),
};
