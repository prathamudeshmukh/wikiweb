import type { Territory } from '../config/topicTiles';
import type { PageRef } from '../wiki-api/types';

/** How a node joined its Journey (SPEC.md §9). `peek_read` nodes are read in place; the others open a column. */
export type NodeVia = 'swipe' | 'peek_explore' | 'peek_read';

export interface Journey {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastNodeId: string | null;
}

/** What a node remembers about its article — enough to rebuild its column and draw its route dot. */
export interface NodePage extends PageRef {
  tileId: string | null;
  territory: Territory | null;
  thumbnailUrl: string | null;
}

export interface JourneyNode extends NodePage {
  id: string;
  journeyId: string;
  parentNodeId: string | null;
  via: NodeVia;
  createdAt: number;
}

/** A Journey with everything recorded in it: its node tree and the articles read along the way. */
export interface Expedition {
  journey: Journey;
  /** In the order they were added. */
  nodes: readonly JourneyNode[];
  readIds: ReadonlySet<number>;
}

export interface Stamp {
  tileId: string;
  pageId: number;
  earnedAt: number;
}

export const isColumnNode = (node: JourneyNode) => node.via !== 'peek_read';
