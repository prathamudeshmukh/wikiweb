import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { travelQuote } from '../cards/travelQuote';
import type { Card } from '../content/card';
import type { JourneySession } from '../journeys/journeySession';
import { nodePageOf, resumedColumnOf } from '../journeys/nodePages';
import type { ResumePoint, Tangent } from '../tangent/tangentQueue';
import type { PulseTarget } from './ColumnView';
import { goBack, initialStack, jumpTo, landHop, prepareHop, resumeStack, type StackState, topOf } from './columnStack';

type ColumnPulse = PulseTarget & { columnId: string };

/** Where the hop being prepared leaves from, so it joins the Journey in the right place. */
interface HopOrigin {
  via: 'swipe' | 'peek_explore';
  fromNodeId: string | null;
}

/** The column stack, with every landed hop recorded in the Journey and the top column reported to it. */
export function useStackNavigation(journeys: JourneySession) {
  const [stack, setStack] = useState<StackState>(initialStack);
  const [preparedCard, setPreparedCard] = useState<Card | null>(null);
  const [pulse, setPulse] = useState<ColumnPulse | null>(null);
  // Handlers read state through refs so their identity never changes and memoized columns don't re-render.
  const stackRef = useRef(stack);
  const preparedCardRef = useRef(preparedCard);
  useLayoutEffect(() => {
    stackRef.current = stack;
    preparedCardRef.current = preparedCard;
  }, [stack, preparedCard]);
  const origin = useRef<HopOrigin>({ via: 'swipe', fromNodeId: null });

  const prepareFrom = useCallback((card: Card, from: HopOrigin) => {
    origin.current = from;
    const next = prepareHop(stackRef.current, { ref: card, topic: card.topic, thumbnailUrl: card.thumbnail?.url ?? null, quote: travelQuote(card) });
    if (next === stackRef.current) return;
    setPreparedCard(card);
    setStack(next);
  }, []);

  const prepare = useCallback((card: Card) => prepareFrom(card, { via: 'swipe', fromNodeId: topOf(stackRef.current).nodeId }), [prepareFrom]);
  const prepareTangent = useCallback(({ card, fromNodeId }: Tangent) => prepareFrom(card, { via: 'peek_explore', fromNodeId }), [prepareFrom]);

  const land = useCallback(() => {
    const card = preparedCardRef.current;
    if (!stackRef.current.prepared || !card) return;
    const node = journeys.hop({ ...origin.current, page: nodePageOf(card) });
    setStack(landHop(stackRef.current, node.id));
    setPreparedCard(null);
  }, [journeys]);

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

  const resume = useCallback((point: ResumePoint) => {
    setPreparedCard(null);
    setStack(resumeStack(point.map(resumedColumnOf)));
  }, []);

  // Home ends the expedition; any other column is where the next read or hop joins it.
  const topNodeId = topOf(stack).nodeId;
  useEffect(() => journeys.focus(topNodeId), [journeys, topNodeId]);

  return { stack, preparedCard, pulse, prepare, prepareTangent, land, back, jump, resume };
}
