/**
 * A circle with a line leaving it at a tangent — the wordmark glyph (DESIGN.md §9), drawn on a 24-unit grid.
 * Shared by the Home header and the app icon build, so the two can never drift apart.
 */
export const TANGENT_GLYPH = {
  viewBox: 24,
  strokeWidth: 2,
  circle: { cx: 10, cy: 13, r: 6.5 },
  tangent: { x1: 10, y1: 6.5, x2: 21, y2: 6.5 },
  dot: { cx: 21, cy: 6.5, r: 1.8 },
} as const;
