import { type CardTopic, NO_TOPIC } from '../content/topics';
import type { PageRef } from '../wiki-api/types';

export interface ColumnEntry {
  /** Derived from the path, so the same route always yields the same id (stable React keys). */
  id: string;
  /** Null for Home. */
  seed: PageRef | null;
  seedTopic: CardTopic;
  seedThumbnailUrl: string | null;
  /** Seeds from Home down to and including this column's seed. */
  path: readonly PageRef[];
}

export interface StackState {
  columns: readonly ColumnEntry[];
  /** Column mounted offscreen for the card being dragged; entered when the hop lands (M0 finding). */
  prepared: ColumnEntry | null;
}

export interface HopTarget {
  ref: PageRef;
  topic: CardTopic;
  thumbnailUrl?: string | null;
}

const HOME: ColumnEntry = { id: 'home', seed: null, seedTopic: NO_TOPIC, seedThumbnailUrl: null, path: [] };

const topOf = (state: StackState) => state.columns[state.columns.length - 1];

export function initialStack(): StackState {
  return { columns: [HOME], prepared: null };
}

export function prepareHop(state: StackState, target: HopTarget): StackState {
  const parent = topOf(state);
  const path = [...parent.path, target.ref];
  const id = path.map((ref) => ref.pageId).join('>');
  if (state.prepared?.id === id) return state;
  return { ...state, prepared: { id, seed: target.ref, seedTopic: target.topic, seedThumbnailUrl: target.thumbnailUrl ?? null, path } };
}

export function landHop(state: StackState): StackState {
  if (!state.prepared) return state;
  return { columns: [...state.columns, state.prepared], prepared: null };
}

export function goBack(state: StackState): { state: StackState; cameFrom: PageRef | null } {
  if (state.columns.length <= 1) return { state, cameFrom: null };
  return { state: { columns: state.columns.slice(0, -1), prepared: null }, cameFrom: topOf(state).seed };
}

export function jumpTo(state: StackState, columnIndex: number): StackState {
  return { columns: state.columns.slice(0, columnIndex + 1), prepared: null };
}
