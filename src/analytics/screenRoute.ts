/** A screen's route pattern from its segments — `/expedition/[id]`, never the id itself (SPEC.md §11). */
export function screenRoute(segments: readonly string[]): string {
  return `/${segments.join('/')}`;
}

// Reading the privacy policy sends nothing (SPEC.md §3.11), and its views say nothing about feed quality.
const UNTRACKED_SCREENS: ReadonlySet<string> = new Set(['/about']);

export function isTrackedScreen(route: string): boolean {
  return !UNTRACKED_SCREENS.has(route);
}
