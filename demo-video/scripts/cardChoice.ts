export interface Candidate {
  title: string;
  hasPhoto: boolean;
}

/** Words this short ("the", "of", "subg") say nothing about whether two articles are about the same thing. */
const MIN_WORD_LENGTH = 5;

function significantWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length >= MIN_WORD_LENGTH),
  );
}

/** A title sharing no significant word with the path so far is a jump somewhere new, not a sibling. */
export function isFresh(title: string, path: readonly string[]): boolean {
  const seen = new Set(path.flatMap((step) => [...significantWords(step)]));
  return ![...significantWords(title)].some((word) => seen.has(word));
}

/**
 * Which card to take, top-down: a fresh one with a photo, else any with a photo, else the top one.
 * A column ranks its closest links first, so always taking the top card drills into one family.
 */
export function chooseCard(candidates: readonly Candidate[], path: readonly string[]): number {
  const fresh = candidates.findIndex((card) => card.hasPhoto && isFresh(card.title, path));
  if (fresh >= 0) return fresh;
  return Math.max(0, candidates.findIndex((card) => card.hasPhoto));
}
