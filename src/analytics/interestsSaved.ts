import { tilesTouched } from '../interests/interestPicks';
import type { InterestsSaved, InterestsSavedFrom } from './events';

const SUBFIELD_DEPTH = 2;
const LEAF_DEPTH = 3;
const depthOf = (path: string) => path.split('/').length;

/** `interests_saved` (SPEC.md §11): path ids only, never titles. */
export function interestsSavedProperties({ before, after, from }: { before: readonly string[]; after: readonly string[]; from: InterestsSavedFrom }): InterestsSaved {
  return {
    from,
    tiles: tilesTouched(after),
    subfields: after.filter((path) => depthOf(path) === SUBFIELD_DEPTH).length,
    leaves: after.filter((path) => depthOf(path) === LEAF_DEPTH).length,
    added: after.filter((path) => !before.includes(path)),
  };
}
