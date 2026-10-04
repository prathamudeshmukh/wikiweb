import { INTEREST_TREES, type InterestLeaf, type InterestSubfield } from '../config/interestTree';
import { TOPIC_TILES, type TopicTile } from '../config/topicTiles';

/**
 * Interest picks as path ids — `philosophy`, `philosophy/logic`, `philosophy/logic/paradoxes` (SPEC.md §3.9).
 * The first segment is always a tile id, so a plain tile id is a valid pick.
 */

const SEPARATOR = '/';

export interface ResolvedPick {
  path: string;
  tile: TopicTile;
  subfield: InterestSubfield | null;
  leaf: InterestLeaf | null;
}

export interface Resolution {
  pick: ResolvedPick;
  /** The saved node no longer exists; `pick` is its nearest existing ancestor. */
  fellBack: boolean;
}

const TILES_BY_ID: ReadonlyMap<string, TopicTile> = new Map(TOPIC_TILES.map((tile) => [tile.id, tile]));

const segmentsOf = (path: string) => path.split(SEPARATOR);
const joinPath = (...segments: string[]) => segments.join(SEPARATOR);

export function hasTree(tileId: string): boolean {
  return (INTEREST_TREES[tileId]?.length ?? 0) > 0;
}

/** The node a path names, or its nearest existing ancestor; null when the tile itself is unknown. */
export function resolvePick(path: string): Resolution | null {
  const [tileId, subfieldId, leafId] = segmentsOf(path);
  const tile = TILES_BY_ID.get(tileId);
  if (!tile) return null;
  const subfield = subfieldId ? (INTEREST_TREES[tileId]?.find((s) => s.id === subfieldId) ?? null) : null;
  const leaf = subfield && leafId ? (subfield.leaves.find((l) => l.id === leafId) ?? null) : null;
  const pick: ResolvedPick = {
    path: leaf && subfield ? joinPath(tileId, subfield.id, leaf.id) : subfield ? joinPath(tileId, subfield.id) : tileId,
    tile,
    subfield,
    leaf,
  };
  return { pick, fellBack: pick.path !== path };
}

export function nodeLabel(pick: ResolvedPick): string {
  return pick.leaf?.label ?? pick.subfield?.label ?? pick.tile.label;
}

// Shallow category search only: `deepcat:` wanders far off topic (SPEC.md §5.5).
const categoryQuery = (categories: readonly string[]) => `incategory:${categories.map((c) => c.replace(/ /g, '_')).join('|')}`;

/** The search for a subfield or leaf; null for a broad tile, which uses its `articletopic` query instead. */
export function nodeQuery(pick: ResolvedPick): string | null {
  if (pick.leaf) return categoryQuery([pick.leaf.category]);
  if (pick.subfield) return categoryQuery([...(pick.subfield.extraCategories ?? []), ...pick.subfield.leaves.map((l) => l.category)]);
  return null;
}

export function parentPath(path: string): string | null {
  const segments = segmentsOf(path);
  return segments.length > 1 ? joinPath(...segments.slice(0, -1)) : null;
}

/** Where an exhausted pick's stream widens to: leaf → subfield → tile (SPEC.md §3.9). */
export const widenedPath = parentPath;

const isAncestor = (ancestor: string, path: string) => path.startsWith(ancestor + SEPARATOR);

export function picksBelow(picks: readonly string[], path: string): string[] {
  return picks.filter((pick) => isAncestor(path, pick));
}

/** Adds a pick; it replaces its own ancestors and descendants, since the most specific pick wins. */
export function addPick(picks: readonly string[], path: string): string[] {
  return [...picks.filter((pick) => pick !== path && !isAncestor(pick, path) && !isAncestor(path, pick)), path];
}

export function removePick(picks: readonly string[], path: string): string[] {
  return picks.filter((pick) => pick !== path);
}

export function togglePick(picks: readonly string[], path: string): string[] {
  return picks.includes(path) ? removePick(picks, path) : addPick(picks, path);
}

/** The tile a pick belongs to — a path's first segment. */
export const tileOf = (path: string): string => segmentsOf(path)[0];

/** Tiles picked themselves or with a pick below them — what the interests minimum counts. */
export function tilesTouched(picks: readonly string[]): number {
  return new Set(picks.map(tileOf)).size;
}

export interface NormalisedPicks {
  picks: string[];
  /** Saved paths whose node was gone and were replaced by an ancestor. */
  fellBack: string[];
}

/** Makes saved picks valid again after tree or tile edits: gone nodes fall back, unknown tiles drop out. */
export function normalisePicks(saved: readonly string[]): NormalisedPicks {
  const resolutions = saved.flatMap((path) => {
    const resolution = resolvePick(path);
    return resolution ? [{ saved: path, ...resolution }] : [];
  });
  const resolved = resolutions.map((r) => r.pick.path);
  // A fallback can land on an ancestor of another pick; the more specific one wins.
  const picks = resolved.filter((path, index) => resolved.indexOf(path) === index && !resolved.some((other) => isAncestor(path, other)));
  return { picks, fellBack: resolutions.filter((r) => r.fellBack).map((r) => r.saved) };
}
