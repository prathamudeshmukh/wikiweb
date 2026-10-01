import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import type { Card } from '../content/card';
import { LAYOUT } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { ColumnView, type PulseTarget } from './ColumnView';
import { goBack, initialStack, jumpTo, landHop, prepareHop, type StackState } from './columnStack';
import { GESTURE, type HopController, type Rect } from './hopController';
import { HopOverlay } from './HopOverlay';

type ColumnPulse = PulseTarget & { columnId: string };

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

function useStackNavigation() {
  const [stack, setStack] = useState<StackState>(initialStack);
  const [preparedCard, setPreparedCard] = useState<Card | null>(null);
  const [pulse, setPulse] = useState<ColumnPulse | null>(null);
  // Handlers read state through a ref so their identity never changes and memoized columns don't re-render.
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const prepare = useCallback((card: Card) => {
    const next = prepareHop(stackRef.current, { ref: card, topic: card.topic, thumbnailUrl: card.thumbnail?.url ?? null });
    if (next === stackRef.current) return;
    setPreparedCard(card);
    setStack(next);
  }, []);

  const land = useCallback(() => {
    setStack(landHop(stackRef.current));
    setPreparedCard(null);
  }, []);

  const back = useCallback(() => {
    const { state, cameFrom } = goBack(stackRef.current);
    if (!cameFrom) return false;
    const parent = state.columns[state.columns.length - 1];
    setPulse({ columnId: parent.id, cardId: cameFrom.pageId, token: Date.now() });
    setPreparedCard(null);
    setStack(state);
    return true;
  }, []);

  const jump = useCallback((columnIndex: number) => {
    setPreparedCard(null);
    setStack(jumpTo(stackRef.current, columnIndex));
  }, []);

  return { stack, preparedCard, pulse, prepare, land, back, jump };
}

interface IncomingTangent {
  card: Card | null;
  onStarted: () => void;
  hop: HopController;
  startRect: Rect;
}

/** Runs the same flight as a swipe, started from the reader's peek card instead of a released drag. */
function useIncomingTangent({ card, onStarted, hop, startRect }: IncomingTangent) {
  const { x, y, width, height } = startRect;
  useEffect(() => {
    if (!card) return;
    onStarted();
    hop.prepare(card);
    hop.from.value = { x, y, width, height };
    hop.tiltDeg.value = 0;
    hop.progress.value = 0;
    hop.progress.value = withSpring(1, { ...GESTURE.spring, overshootClamping: true }, (finished) => {
      if (finished) scheduleOnRN(hop.landed);
    });
    hop.committed();
  }, [card, onStarted, hop, x, y, width, height]);
}

interface ExploreScreenProps {
  interests: readonly string[];
  onOpenArticle: (card: Card) => void;
  /** A tangent taken from the reader's peek card, to hop into as soon as this screen is back. */
  incomingTangent: Card | null;
  onTangentStarted: () => void;
}

export function ExploreScreen({ interests, onOpenArticle, incomingTangent, onTangentStarted }: ExploreScreenProps) {
  const palette = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { stack, preparedCard, pulse, prepare, land, back, jump } = useStackNavigation();
  const progress = useSharedValue(0);
  const from = useSharedValue<Rect>(EMPTY_RECT);
  const tiltDeg = useSharedValue(0);

  const committed = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);
  const hop: HopController = useMemo(() => ({ progress, from, tiltDeg, prepare, committed, landed: land }), [progress, from, tiltDeg, prepare, committed, land]);

  useIncomingTangent({ card: incomingTangent, onStarted: onTangentStarted, hop, startRect: peekCardRect(screenWidth, screenHeight) });

  // Once the landed column is in the stack (and no longer follows progress), rearm for the next hop.
  useEffect(() => {
    if (!stack.prepared) progress.value = 0;
  }, [stack.prepared, progress]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]);

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
