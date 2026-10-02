import { type CardTopic, NO_TOPIC } from '../content/topics';
import type { PageRef } from '../wiki-api/types';

export interface ColumnEntry {
  /** Derived from the path, so the same route always yields the same id (stable React keys). */
  id: string;
  /** Null for Home. */
  seed: PageRef | null;
  seedTopic: CardTopic;
  seedThumbnailUrl: string | null;
  /** Shown by the compass card while the column loads; null for Home and resumed columns (DESIGN.md §6.7). */
  seedQuote: string | null;
  /** Seeds from Home down to and including this column's seed. */
  path: readonly PageRef[];
  /** The Journey node this column belongs to; null for Home and until the hop into it lands. */
  nodeId: string | null;
}

/** A column with a seed — every column but Home. */
export type SeededEntry = ColumnEntry & { seed: PageRef };

export const isSeeded = (entry: ColumnEntry): entry is SeededEntry => entry.seed !== null;

export interface StackState {
  columns: readonly ColumnEntry[];
  /** Column mounted offscreen for the card being dragged; entered when the hop lands (M0 finding). */
  prepared: ColumnEntry | null;
}

export interface HopTarget {
  ref: PageRef;
  topic: CardTopic;
  thumbnailUrl?: string | null;
  quote?: string | null;
}

/** A column to reopen when resuming an expedition. */
export interface ResumedColumn extends HopTarget {
  nodeId: string;
}

const HOME: ColumnEntry = { id: 'home', seed: null, seedTopic: NO_TOPIC, seedThumbnailUrl: null, seedQuote: null, path: [], nodeId: null };

export const topOf = (state: StackState): ColumnEntry => state.columns[state.columns.length - 1];

/** The column a hop from `parent` into `target` would open (prefetch uses it to name a column before the hop). */
export function childEntry(parent: ColumnEntry, target: HopTarget): ColumnEntry {
  return entryBelow(parent, target, null);
}

function entryBelow(parent: ColumnEntry, target: HopTarget, nodeId: string | null): ColumnEntry {
  const path = [...parent.path, target.ref];
  return {
    id: path.map((ref) => ref.pageId).join('>'),
    seed: target.ref,
    seedTopic: target.topic,
    seedThumbnailUrl: target.thumbnailUrl ?? null,
    seedQuote: target.quote ?? null,
    path,
    nodeId,
  };
}

export function initialStack(): StackState {
  return { columns: [HOME], prepared: null };
}

export function prepareHop(state: StackState, target: HopTarget): StackState {
  const prepared = entryBelow(topOf(state), target, null);
  if (state.prepared?.id === prepared.id) return state;
  return { ...state, prepared };
}

/** Enters the prepared column, filed under the Journey node its hop created. */
export function landHop(state: StackState, nodeId: string | null = null): StackState {
  if (!state.prepared) return state;
  return { columns: [...state.columns, { ...state.prepared, nodeId }], prepared: null };
}

/** Home plus the columns of a resumed expedition, root first. */
export function resumeStack(columns: readonly ResumedColumn[]): StackState {
  const stack = columns.reduce<ColumnEntry[]>((entries, column) => [...entries, entryBelow(entries[entries.length - 1], column, column.nodeId)], [HOME]);
  return { columns: stack, prepared: null };
}

export function goBack(state: StackState): { state: StackState; cameFrom: PageRef | null } {
  if (state.columns.length <= 1) return { state, cameFrom: null };
  return { state: { columns: state.columns.slice(0, -1), prepared: null }, cameFrom: topOf(state).seed };
}

export function jumpTo(state: StackState, columnIndex: number): StackState {
  return { columns: state.columns.slice(0, columnIndex + 1), prepared: null };
}
