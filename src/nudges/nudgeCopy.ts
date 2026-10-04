import { nodeLabel, parentPath, resolvePick } from '../interests/interestPicks';
import type { Nudge } from './nudgeRules';

/** The words on a nudge card (DESIGN.md §5.14, §8). Upper-casing is the card's job. */
export interface NudgeCopy {
  eyebrow: string;
  title: string;
  metaRight: string;
  body: string;
  whyLine: string;
  whyAction: string;
}

const labelOf = (path: string) => {
  const pick = resolvePick(path)?.pick;
  return pick ? nodeLabel(pick) : path;
};

function exhaustedCopy(path: string, articleCount: number): NudgeCopy {
  const parent = parentPath(path) ?? path;
  const parentPick = resolvePick(parent)?.pick;
  const tileLabel = parentPick?.tile.label ?? parent;
  // A leaf widens to its subfield; a subfield widens to all of its tile.
  const isSubfieldParent = Boolean(parentPick?.subfield);
  const trail = isSubfieldParent ? `${tileLabel} › ${labelOf(parent)}` : tileLabel;
  const widensTo = isSubfieldParent ? labelOf(parent) : `all of ${tileLabel}`;
  return {
    eyebrow: trail,
    title: `You've read all of ${labelOf(path)}`,
    metaRight: `${articleCount} articles`,
    body: `Every one of them. Home widens to ${widensTo} from here. Or try a neighbour:`,
    whyLine: `✓ Completed · ${trail}`,
    whyAction: '→ Skip',
  };
}

export function nudgeCopy(nudge: Nudge): NudgeCopy {
  if (nudge.kind === 'exhausted') return exhaustedCopy(nudge.node.path, nudge.node.articleCount);
  const tile = labelOf(nudge.tileId);
  return {
    eyebrow: `You keep reading ${tile}`,
    title: `Narrow ${tile}?`,
    metaRight: `${nudge.reads} read`,
    body: 'Pick a corner and Home will lean into it. You can change this any time in Settings.',
    whyLine: '→ Swipe right to skip',
    whyAction: 'See the whole tree →',
  };
}
