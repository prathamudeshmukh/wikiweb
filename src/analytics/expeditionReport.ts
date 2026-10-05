import type { CardTopic } from '../content/topics';
import { type Expedition, isColumnNode, type JourneyNode } from '../journeys/journeyTypes';
import type { Analytics } from './analytics';
import type { ExpeditionEnd, ExpeditionSummary } from './events';

const MS_PER_SECOND = 1000;

/** Analytics' side of the Journey: stamps as they're earned, and a summary when an expedition ends. */
export interface ExpeditionReporter {
  stampEarned(topic: CardTopic, expeditionId: string | null): void;
  /** May be called more than once per expedition (backgrounded, then carried on); the latest wins. */
  ended(expedition: Expedition, endedBy: ExpeditionEnd): void;
}

interface ExpeditionReporterDeps {
  analytics: Analytics;
  now: () => number;
}

/** How many columns deep the deepest node sits; in-place reads open no column so add no depth. */
function maxDepth(nodes: readonly JourneyNode[]): number {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depthOf = (node: JourneyNode | undefined): number =>
    node ? depthOf(byId.get(node.parentNodeId ?? '')) + (isColumnNode(node) ? 1 : 0) : 0;
  return Math.max(0, ...nodes.map(depthOf));
}

function summaryOf(expedition: Expedition, endedBy: ExpeditionEnd, at: number, stampsEarned: number): ExpeditionSummary {
  const { journey, nodes, readIds } = expedition;
  return {
    expedition_id: journey.id,
    ended_by: endedBy,
    node_count: nodes.length,
    max_depth: maxDepth(nodes),
    reads: readIds.size,
    duration_s: Math.round((at - journey.createdAt) / MS_PER_SECOND),
    territories: new Set(nodes.map((node) => node.territory).filter((territory) => territory !== null)).size,
    stamps_earned: stampsEarned,
  };
}

export function createExpeditionReporter({ analytics, now }: ExpeditionReporterDeps): ExpeditionReporter {
  let stampCounts: ReadonlyMap<string, number> = new Map();

  return {
    stampEarned({ tileId, territory }, expeditionId) {
      if (!tileId) return;
      analytics.track({ name: 'stamp_earned', properties: { topic: tileId, territory } });
      if (expeditionId) stampCounts = new Map([...stampCounts, [expeditionId, (stampCounts.get(expeditionId) ?? 0) + 1]]);
    },

    ended(expedition, endedBy) {
      const stamps = stampCounts.get(expedition.journey.id) ?? 0;
      analytics.track({ name: 'expedition_ended', properties: summaryOf(expedition, endedBy, now(), stamps) });
    },
  };
}
