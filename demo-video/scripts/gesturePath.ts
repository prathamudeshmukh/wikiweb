export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  from: Point;
  to: Point;
  durationMs: number;
}

/** A finger rarely moves in a straight line; this much downward drift over a stroke reads as a thumb. */
const THUMB_ARC_PX = 14;
const FRAME_MS = 16;

/** Ease-in-out cubic: a finger starts slow, flicks, and settles. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** The pointer positions for one stroke, one per display frame, ending exactly on `to`. */
export function strokePoints({ from, to, durationMs }: Stroke): Point[] {
  const steps = Math.max(1, Math.round(durationMs / FRAME_MS));
  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps;
    const eased = easeInOutCubic(t);
    return {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased + Math.sin(Math.PI * t) * THUMB_ARC_PX,
    };
  });
}

export const STROKE_FRAME_MS = FRAME_MS;
