import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { HopRoute, ReturnRoute } from '../analytics/events';
import { travelQuote } from '../cards/travelQuote';
import type { Card } from '../content/card';
import type { JourneySession } from '../journeys/journeySession';
import { nodePageOf, resumedColumnOf } from '../journeys/nodePages';
import type { ResumePoint, Tangent } from '../tangent/tangentQueue';
import type { PulseTarget } from './ColumnView';
import { type ColumnEntry, goBack, initialStack, jumpTo, landHop, prepareHop, resumeStack, type StackState, topOf } from './columnStack';

type ColumnPulse = PulseTarget & { columnId: string };

/** Where the hop being prepared leaves from, so it joins the Journey in the right place. */
interface HopOrigin {
  via: 'swipe' | 'peek_explore';
  fromNodeId: string | null;
}

const HOP_ROUTE: Record<HopOrigin['via'], HopRoute> = { swipe: 'swipe', peek_explore: 'tangent' };

export interface LandedHop {
  card: Card;
  /** The column the hop left. */
  from: ColumnEntry;
  route: HopRoute;
}

export interface Return {
  /** The column that was on top. */
  from: ColumnEntry;
  route: ReturnRoute;
  columnsPopped: number;
}

/** Navigation moments the hints (SPEC.md §4.4) and analytics (§11) follow. */
export interface NavigationListener {
  hopped(hop: LandedHop): void;
  /** Left a column for one below it: back swipe, system back or a breadcrumb jump. */
  returned(ret: Return): void;
  /** A saved expedition replaced the stack. */
  resumed(): void;
}

/** The column stack, with every landed hop recorded in the Journey and the top column reported to it. */
export function useStackNavigation(journeys: JourneySession, listener: NavigationListener) {
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
  const listenerRef = useRef(listener);
  useLayoutEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

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
    const from = topOf(stackRef.current);
    const node = journeys.hop({ ...origin.current, page: nodePageOf(card) });
    setStack(landHop(stackRef.current, node.id));
    setPreparedCard(null);
    listenerRef.current.hopped({ card, from, route: HOP_ROUTE[origin.current.via] });
  }, [journeys]);

  const back = useCallback((route: Exclude<ReturnRoute, 'crumb'>) => {
    const from = topOf(stackRef.current);
    const { state, cameFrom } = goBack(stackRef.current);
    if (!cameFrom) return false;
    const parent = state.columns[state.columns.length - 1];
    setPulse({ columnId: parent.id, cardId: cameFrom.pageId, token: Date.now() });
    setPreparedCard(null);
    setStack(state);
    listenerRef.current.returned({ from, route, columnsPopped: 1 });
    return true;
  }, []);

  const jump = useCallback((columnIndex: number) => {
    const before = stackRef.current;
    const next = jumpTo(before, columnIndex);
    const columnsPopped = before.columns.length - next.columns.length;
    if (columnsPopped > 0) listenerRef.current.returned({ from: topOf(before), route: 'crumb', columnsPopped });
    setPreparedCard(null);
    setStack(next);
  }, []);

  const resume = useCallback((point: ResumePoint) => {
    setPreparedCard(null);
    setStack(resumeStack(point.map(resumedColumnOf)));
    listenerRef.current.resumed();
  }, []);

  // Home ends the expedition; any other column is where the next read or hop joins it.
  const topNodeId = topOf(stack).nodeId;
  useEffect(() => journeys.focus(topNodeId), [journeys, topNodeId]);

  return { stack, preparedCard, pulse, prepare, prepareTangent, land, back, jump, resume };
}
