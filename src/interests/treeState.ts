import { TOPIC_TILES } from '../config/topicTiles';
import { parentPath, picksBelow } from './interestPicks';

/** How a tile, subfield or leaf shows in Settings, given the draft picks (DESIGN.md §5.13). */

export type NodeState = { kind: 'broad' | 'picked' | 'unpicked' } | { kind: 'narrowed' | 'partial'; picks: number };

export function tileState(picks: readonly string[], tileId: string): NodeState {
  if (picks.includes(tileId)) return { kind: 'broad' };
  const below = picksBelow(picks, tileId).length;
  return below > 0 ? { kind: 'narrowed', picks: below } : { kind: 'unpicked' };
}

export function subfieldState(picks: readonly string[], path: string): NodeState {
  if (picks.includes(path)) return { kind: 'picked' };
  const below = picksBelow(picks, path).length;
  return below > 0 ? { kind: 'partial', picks: below } : { kind: 'unpicked' };
}

/** `included`: not picked itself, but its whole subfield is. */
export function leafState(picks: readonly string[], path: string): 'picked' | 'included' | 'unpicked' {
  if (picks.includes(path)) return 'picked';
  const parent = parentPath(path);
  return parent && picks.includes(parent) ? 'included' : 'unpicked';
}

const LABEL_BY_TILE_ID: ReadonlyMap<string, string> = new Map(TOPIC_TILES.map((tile) => [tile.id, tile.label]));

/** The tree header's status line. */
export function treeStatus(picks: readonly string[], tileId: string): string {
  const state = tileState(picks, tileId);
  if (state.kind === 'broad') return `ALL OF ${(LABEL_BY_TILE_ID.get(tileId) ?? tileId).toUpperCase()}`;
  if (state.kind === 'narrowed') return `NARROWED TO ${state.picks} ${state.picks === 1 ? 'CORNER' : 'CORNERS'}`;
  return 'NOT PICKED';
}
