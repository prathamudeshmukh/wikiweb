import type { Territory } from '../config/topicTiles';
import { type Expedition, isColumnNode, type JourneyNode } from './journeyTypes';

export interface Leap {
  from: string;
  to: string;
}

/** Everything the recap card shows (DESIGN.md §5.10), derived from the expedition — never stored. */
export interface Recap {
  startTitle: string;
  endTitle: string;
  /** Territory of each tangent in the order taken; null where the article had no topic. */
  route: readonly (Territory | null)[];
  tangents: number;
  reads: number;
  furthestLeap: Leap | null;
}

function byId(nodes: readonly JourneyNode[]): ReadonlyMap<string, JourneyNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

/** The node and its ancestors, root first. */
function lineage(nodes: ReadonlyMap<string, JourneyNode>, nodeId: string): JourneyNode[] {
  const chain: JourneyNode[] = [];
  const seen = new Set<string>();
  for (let node = nodes.get(nodeId); node && !seen.has(node.id); node = node.parentNodeId ? nodes.get(node.parentNodeId) : undefined) {
    seen.add(node.id);
    chain.unshift(node);
  }
  return chain;
}

/**
 * The columns to reopen to stand at `nodeId` (SPEC.md §3.5): its column ancestors, root first.
 * Articles read in place are skipped — a read node reopens the column it was read from.
 */
export function columnPathTo(nodes: readonly JourneyNode[], nodeId: string): JourneyNode[] {
  return lineage(byId(nodes), nodeId).filter(isColumnNode);
}

/** Where "Continue expedition" resumes: the most recent node. */
export function resumeNodeId(expedition: Expedition): string | null {
  const { lastNodeId } = expedition.journey;
  if (lastNodeId && expedition.nodes.some((node) => node.id === lastNodeId)) return lastNodeId;
  return expedition.nodes.at(-1)?.id ?? null;
}

/** How many hops below the start of the expedition each node sits; the first hop is depth 1. */
export function depthOf(nodes: readonly JourneyNode[]): ReadonlyMap<string, number> {
  const index = byId(nodes);
  return new Map(nodes.map((node) => [node.id, lineage(index, node.id).length]));
}

/**
 * The deepest hop that crossed into another territory (DESIGN.md §5.10); ties go to the latest.
 * Hops without a territory on either side can't be compared and never count.
 */
export function furthestLeap(nodes: readonly JourneyNode[]): Leap | null {
  const index = byId(nodes);
  const depths = depthOf(nodes);
  let best: { leap: Leap; depth: number } | null = null;
  for (const node of nodes) {
    const parent = node.parentNodeId ? index.get(node.parentNodeId) : undefined;
    const crossed = isColumnNode(node) && parent?.territory && node.territory && parent.territory !== node.territory;
    const depth = depths.get(node.id) ?? 0;
    if (parent && crossed && (!best || depth >= best.depth)) best = { leap: { from: parent.title, to: node.title }, depth };
  }
  return best?.leap ?? null;
}

export function tangentsOf(nodes: readonly JourneyNode[]): JourneyNode[] {
  return nodes.filter(isColumnNode);
}

export function recapOf(expedition: Expedition): Recap {
  const { nodes } = expedition;
  const lastId = resumeNodeId(expedition);
  const tangents = tangentsOf(nodes);
  return {
    startTitle: nodes[0]?.title ?? '',
    endTitle: nodes.find((node) => node.id === lastId)?.title ?? '',
    route: tangents.map((node) => node.territory),
    tangents: tangents.length,
    reads: expedition.readIds.size,
    furthestLeap: furthestLeap(nodes),
  };
}

export function journeyTitle(firstTitle: string): string {
  return `From ${firstTitle}`;
}
