import type { AppFrame } from '../theme/appFrame';

/** The key legend beside the column on a wide window (DESIGN.md §6.2). */
export const KEY_LEGEND = {
  /** Space between the column's right edge and the legend. */
  gap: 32,
  /** Room the legend needs: the widest row, `Enter` and `TAKE A TANGENT`. */
  width: 184,
  /** Space kept between the legend and the window's right edge. */
  edge: 24,
} as const;

/** Where the legend starts, in window coordinates, or null when the margin right of the column can't hold it. */
export function keyLegendLeft(windowWidth: number, frame: AppFrame): number | null {
  const columnRight = frame.left + frame.width;
  const margin = windowWidth - columnRight;
  if (margin < KEY_LEGEND.gap + KEY_LEGEND.width + KEY_LEGEND.edge) return null;
  return columnRight + KEY_LEGEND.gap;
}
