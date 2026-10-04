import { TOPIC_TILES } from '../config/topicTiles';
import { addPick, picksBelow, tileOf, tilesTouched } from '../interests/interestPicks';

export const MIN_INTERESTS = 3;

/** Used when the user skips onboarding (SPEC.md §3.1). */
export const DEFAULT_INTERESTS: readonly string[] = ['science', 'history', 'art'];

const SUMMARY_NAMED_PICKS = 3;
const LABEL_BY_TILE_ID: ReadonlyMap<string, string> = new Map(TOPIC_TILES.map((tile) => [tile.id, tile.label]));

/** Toggles a whole tile: off clears it and any subfield/leaf picks below it (SPEC.md §3.9). */
export function toggleInterest(selected: readonly string[], tileId: string): string[] {
  const below = picksBelow(selected, tileId);
  const touched = selected.includes(tileId) || below.length > 0;
  return touched ? selected.filter((path) => path !== tileId && !below.includes(path)) : addPick(selected, tileId);
}

/** The minimum counts tiles touched, so any number of subfields within one tile count once. */
export function canContinue(selected: readonly string[]): boolean {
  return tilesTouched(selected) >= MIN_INTERESTS;
}

function samePicks(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/** Picks are worth saving once they differ from the saved ones (order aside) and still meet the minimum. */
export function canSave(saved: readonly string[], selected: readonly string[]): boolean {
  return canContinue(selected) && !samePicks(saved, selected);
}

/** "Space, History, Music +2" — one name per tile touched. */
export function interestsSummary(picks: readonly string[]): string {
  const tileIds = [...new Set(picks.map(tileOf))];
  const named = tileIds.slice(0, SUMMARY_NAMED_PICKS).map((id) => LABEL_BY_TILE_ID.get(id) ?? id);
  const rest = tileIds.length - named.length;
  return rest > 0 ? `${named.join(', ')} +${rest}` : named.join(', ');
}
