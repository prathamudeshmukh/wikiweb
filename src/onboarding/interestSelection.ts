import { TOPIC_TILES } from '../config/topicTiles';

export const MIN_INTERESTS = 3;

/** Used when the user skips onboarding (SPEC.md §3.1). */
export const DEFAULT_INTERESTS: readonly string[] = ['science', 'history', 'art'];

const SUMMARY_NAMED_PICKS = 3;
const LABEL_BY_TILE_ID: ReadonlyMap<string, string> = new Map(TOPIC_TILES.map((tile) => [tile.id, tile.label]));

export function toggleInterest(selected: readonly string[], tileId: string): string[] {
  return selected.includes(tileId) ? selected.filter((id) => id !== tileId) : [...selected, tileId];
}

export function canContinue(selected: readonly string[]): boolean {
  return selected.length >= MIN_INTERESTS;
}

function samePicks(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/** Picks are worth saving once they differ from the saved ones (order aside) and still meet the minimum. */
export function canSave(saved: readonly string[], selected: readonly string[]): boolean {
  return canContinue(selected) && !samePicks(saved, selected);
}

/** "Space, History, Music +2" */
export function interestsSummary(tileIds: readonly string[]): string {
  const named = tileIds.slice(0, SUMMARY_NAMED_PICKS).map((id) => LABEL_BY_TILE_ID.get(id) ?? id);
  const rest = tileIds.length - named.length;
  return rest > 0 ? `${named.join(', ')} +${rest}` : named.join(', ');
}
