import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import type { Card } from '../content/card';
import { useAppServices } from '../services/AppServices';
import type { ResumePoint, Tangent } from '../tangent/tangentQueue';
import { LAYOUT } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { ColumnView } from './ColumnView';
import { GESTURE, type HopController, type Rect } from './hopController';
import { HopOverlay } from './HopOverlay';
import { useStackNavigation } from './useStackNavigation';

const EMPTY_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

// Height of the reader's peek card; a tangent taken from it flies up from there.
const PEEK_CARD_HEIGHT = 180;

/** Where a tangent from the reader's peek card starts its flight. */
function peekCardRect(screenWidth: number, screenHeight: number): Rect {
  return { x: LAYOUT.gutter, y: screenHeight - PEEK_CARD_HEIGHT, width: screenWidth - LAYOUT.gutter * 2, height: PEEK_CARD_HEIGHT };
}

/** Where the flying card lands: the incoming column's seed-header slot. */
function seedHeaderRect(insetTop: number, screenWidth: number): Rect {
  return {
    x: LAYOUT.gutter,
    y: insetTop + LAYOUT.breadcrumbHeight + LAYOUT.seedHeaderGap,
    width: screenWidth - LAYOUT.gutter * 2,
    height: LAYOUT.seedHeaderHeight,
  };
}

interface IncomingTangent {
  tangent: Tangent | null;
  onStarted: () => void;
  prepare: (tangent: Tangent) => void;
  hop: HopController;
  startRect: Rect;
}

/** Runs the same flight as a swipe, started from the reader's peek card instead of a released drag. */
function useIncomingTangent({ tangent, onStarted, prepare, hop, startRect }: IncomingTangent) {
  const { x, y, width, height } = startRect;
  useEffect(() => {
    if (!tangent) return;
    onStarted();
    prepare(tangent);
    hop.from.value = { x, y, width, height };
    hop.tiltDeg.value = 0;
    hop.progress.value = 0;
    hop.progress.value = withSpring(1, { ...GESTURE.spring, overshootClamping: true }, (finished) => {
      if (finished) scheduleOnRN(hop.landed);
    });
    hop.committed();
  }, [tangent, onStarted, prepare, hop, x, y, width, height]);
}

/** Reopens a saved expedition's columns ("Continue expedition"). */
function useIncomingResume(point: ResumePoint | null, onResumed: () => void, resume: (point: ResumePoint) => void) {
  useEffect(() => {
    if (!point) return;
    onResumed();
    resume(point);
  }, [point, onResumed, resume]);
}

interface ExploreScreenProps {
  interests: readonly string[];
  onOpenArticle: (card: Card) => void;
  onOpenLogbook: () => void;
  /** False while another screen (the reader, the Logbook) is on top — Android back is then theirs. */
  isFocused: boolean;
  /** A tangent taken from the reader's peek card, to hop into as soon as this screen is back. */
  incomingTangent: Tangent | null;
  onTangentStarted: () => void;
  /** An expedition to reopen, from the Logbook. */
  incomingResume: ResumePoint | null;
  onResumed: () => void;
}

export function ExploreScreen(props: ExploreScreenProps) {
  const { interests, onOpenArticle, onOpenLogbook, isFocused, incomingTangent, onTangentStarted, incomingResume, onResumed } = props;
  const palette = useTheme();
  const { journeys } = useAppServices();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { stack, preparedCard, pulse, prepare, prepareTangent, land, back, jump, resume } = useStackNavigation(journeys);
  const progress = useSharedValue(0);
  const from = useSharedValue<Rect>(EMPTY_RECT);
  const tiltDeg = useSharedValue(0);

  const committed = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);
  const hop: HopController = useMemo(() => ({ progress, from, tiltDeg, prepare, committed, landed: land }), [progress, from, tiltDeg, prepare, committed, land]);

  useIncomingTangent({ tangent: incomingTangent, onStarted: onTangentStarted, prepare: prepareTangent, hop, startRect: peekCardRect(screenWidth, screenHeight) });
  useIncomingResume(incomingResume, onResumed, resume);

  // Once the landed column is in the stack (and no longer follows progress), rearm for the next hop.
  useEffect(() => {
    if (!stack.prepared) progress.value = 0;
  }, [stack.prepared, progress]);

  useEffect(() => {
    if (!isFocused) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back, isFocused]);

  const depth = stack.columns.length - 1;
  // The prepared column renders as the next item of the same keyed list, so landing never remounts it.
  const columns = stack.prepared ? [...stack.columns, stack.prepared] : stack.columns;
  const onBack = useCallback(() => void back(), [back]);

  return (
    <View style={[styles.root, { backgroundColor: palette.paper }]}>
      {columns.map((entry, i) => {
        const isPrepared = i > depth;
        const isVisible = isPrepared || i >= depth - 1;
        return (
          <View key={entry.id} pointerEvents={i === depth ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, !isVisible && styles.parked]}>
            <ColumnView
              entry={entry}
              interests={interests}
              isTop={i === depth}
              entryProgress={isPrepared ? progress : null}
              candidateCardId={i === depth && preparedCard ? preparedCard.pageId : null}
              pulse={pulse?.columnId === entry.id ? pulse : null}
              hop={hop}
              onOpen={onOpenArticle}
              onBack={onBack}
              onJump={jump}
              onOpenLogbook={onOpenLogbook}
            />
          </View>
        );
      })}
      {preparedCard && stack.prepared && (
        <HopOverlay key={stack.prepared.id} card={preparedCard} seedTitle={stack.columns[depth].seed?.title ?? null} hop={hop} to={seedHeaderRect(insets.top, screenWidth)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Columns below the parent stay mounted (so their scroll position survives) but are not drawn.
  parked: { opacity: 0 },
});
