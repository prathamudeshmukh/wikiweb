import { INTEREST_TREES } from '../config/interestTree';
import { hasTree } from './interestPicks';

/** Which tree to open, e.g. from a prompt card, a topic label or a Completed row (SPEC.md §3.9). */
export interface TreeTarget {
  tileId: string;
  subfieldId?: string;
}

/** Route params → a tree that exists, or null; params come from links, so never trust them. */
export function parseTreeTarget(tile: unknown, subfield: unknown): TreeTarget | null {
  if (typeof tile !== 'string' || !hasTree(tile)) return null;
  const known = typeof subfield === 'string' && (INTEREST_TREES[tile] ?? []).some((s) => s.id === subfield);
  return known ? { tileId: tile, subfieldId: subfield } : { tileId: tile };
}

/** A node opens its tile's tree at its subfield — the leaf's parent, or the subfield itself. */
export function treeTargetForNode(nodePath: string): TreeTarget {
  const [tileId, subfieldId] = nodePath.split('/');
  return subfieldId ? { tileId, subfieldId } : { tileId };
}

/** The interests route for a tree. */
export function treeHref(target: TreeTarget): { pathname: '/settings/interests'; params: Record<string, string> } {
  return { pathname: '/settings/interests', params: target.subfieldId ? { tile: target.tileId, subfield: target.subfieldId } : { tile: target.tileId } };
}
