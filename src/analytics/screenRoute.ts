/** A screen's route pattern from its segments — `/expedition/[id]`, never the id itself (SPEC.md §11). */
export function screenRoute(segments: readonly string[]): string {
  return `/${segments.join('/')}`;
}
