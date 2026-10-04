import { NICHE } from '../config/constants';
import { INTEREST_TREES } from '../config/interestTree';
import type { ExhaustedNode } from '../content/nodeStream';
import { hasTree, parentPath, resolvePick } from '../interests/interestPicks';

/** A non-article card on Home that leads into the interest tree (SPEC.md §3.9, DESIGN.md §5.14). */
export type Nudge = { kind: 'prompt'; tileId: string; reads: number } | { kind: 'exhausted'; node: ExhaustedNode };

export interface Chip {
  path: string;
  label: string;
}

export type ReadsByTile = Readonly<Record<string, number>>;

interface PromptInputs {
  picks: readonly string[];
  readsByTile: ReadsByTile;
  promptsSeen: readonly string[];
}

/** The first broadly picked tree tile with enough reads and no prompt yet; the once-per-session limit is the caller's. */
export function promptTileFor({ picks, readsByTile, promptsSeen }: PromptInputs): string | null {
  return picks.find((pick) => hasTree(pick) && !promptsSeen.includes(pick) && (readsByTile[pick] ?? 0) >= NICHE.nudgeReads) ?? null;
}

/** Counts a read towards its tile's prompt. Only tiles with a tree are counted. */
export function countRead(readsByTile: ReadsByTile, tileId: string | null): ReadsByTile {
  if (!tileId || !hasTree(tileId)) return readsByTile;
  return { ...readsByTile, [tileId]: (readsByTile[tileId] ?? 0) + 1 };
}

const subfieldChips = (tileId: string): Chip[] => (INTEREST_TREES[tileId] ?? []).map((s) => ({ path: `${tileId}/${s.id}`, label: s.label }));

/** Nodes sharing a parent with `path`, as chips. */
function siblingChips(path: string): Chip[] {
  const parent = parentPath(path);
  const resolved = parent ? resolvePick(parent)?.pick : null;
  if (!parent || !resolved) return [];
  if (!resolved.subfield) return subfieldChips(resolved.tile.id);
  return resolved.subfield.leaves.map((leaf) => ({ path: `${parent}/${leaf.id}`, label: leaf.label }));
}

/** The chips a nudge offers: a tile's subfields, or an exhausted node's siblings not already picked. */
export function chipChoices(nudge: Nudge, picks: readonly string[]): Chip[] {
  if (nudge.kind === 'prompt') return subfieldChips(nudge.tileId);
  return siblingChips(nudge.node.path).filter((chip) => chip.path !== nudge.node.path && !picks.includes(chip.path));
}
