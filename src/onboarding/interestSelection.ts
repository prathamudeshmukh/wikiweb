export const MIN_INTERESTS = 3;

/** Used when the user skips onboarding (SPEC.md §3.1). */
export const DEFAULT_INTERESTS: readonly string[] = ['science', 'history', 'art'];

export function toggleInterest(selected: readonly string[], tileId: string): string[] {
  return selected.includes(tileId) ? selected.filter((id) => id !== tileId) : [...selected, tileId];
}

export function canContinue(selected: readonly string[]): boolean {
  return selected.length >= MIN_INTERESTS;
}
