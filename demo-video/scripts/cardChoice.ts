export interface Candidate {
  title: string;
  /** The card's topic label (e.g. "ANIMALS"), or null for an untagged article. */
  topic: string | null;
  hasPhoto: boolean;
}

/** An article already taken on this take's route. */
export type Step = Pick<Candidate, 'title' | 'topic'>;

/** Words this short ("the", "of", "subg") say nothing about whether two articles are about the same thing. */
const MIN_WORD_LENGTH = 5;
/** The meta row under a card's title: `● ANIMALS · EXTINCT CLADE OF …` (DESIGN.md §5.2). */
const TOPIC_LABEL = /●\s*([^·\n]+?)\s*(?:·|\n|$)/;

/** The topic label in a card's visible text. */
export function topicOf(cardText: string): string | null {
  return TOPIC_LABEL.exec(cardText)?.[1] ?? null;
}

function significantWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length >= MIN_WORD_LENGTH),
  );
}

/** A title sharing no significant word with the route so far is a jump somewhere new, not a sibling. */
export function isFresh(title: string, route: readonly Step[]): boolean {
  const seen = new Set(route.flatMap((step) => [...significantWords(step.title)]));
  return ![...significantWords(title)].some((word) => seen.has(word));
}

/**
 * Which card to take, top-down, by preference: a photo, a fresh title and a new topic; then a photo
 * and a fresh title; then any photo; then the top card. A column ranks its closest links first, so
 * always taking the top card drills into one family — crossing topics shows where a swipe can lead.
 */
export function chooseCard(candidates: readonly Candidate[], route: readonly Step[]): number {
  const lastTopic = route.at(-1)?.topic ?? null;
  const preferences: ((card: Candidate) => boolean)[] = [
    (card) => card.hasPhoto && isFresh(card.title, route) && card.topic !== lastTopic,
    (card) => card.hasPhoto && isFresh(card.title, route),
    (card) => card.hasPhoto,
  ];
  for (const prefers of preferences) {
    const index = candidates.findIndex(prefers);
    if (index >= 0) return index;
  }
  return 0;
}
