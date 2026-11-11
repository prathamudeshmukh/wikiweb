import type { Page } from 'playwright';
import { type Point, STROKE_FRAME_MS, strokePoints } from './gesturePath.ts';

/** Where a thumb rests on a card: right of centre, clear of the 24 pt edge guard (SPEC.md §15). */
const SWIPE_Y = 460;
const SWIPE_SPAN = { start: 300, end: 70 } as const;
const SWIPE_MS = 340;
const TAP_HOLD_MS = 90;
const WHEEL_STEP_PX = 14;

/** Drives the page the way a thumb would: eased strokes, a short press for taps. */
export class Thumb {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Left swipe on the top card: one hop deeper. */
  swipeLeft(): Promise<void> {
    return this.stroke({ x: SWIPE_SPAN.start, y: SWIPE_Y }, { x: SWIPE_SPAN.end, y: SWIPE_Y });
  }

  /** Right swipe: back one column. */
  swipeRight(): Promise<void> {
    return this.stroke({ x: SWIPE_SPAN.end, y: SWIPE_Y }, { x: SWIPE_SPAN.start, y: SWIPE_Y });
  }

  async tap(at: Point): Promise<void> {
    await this.page.mouse.move(at.x, at.y);
    await this.page.mouse.down();
    await this.page.waitForTimeout(TAP_HOLD_MS);
    await this.page.mouse.up();
  }

  /** Scrolls whatever is under `at` by `distance` px, in small steps so it glides instead of jumping. */
  async scroll(at: Point, distance: number, durationMs: number): Promise<void> {
    await this.page.mouse.move(at.x, at.y);
    const steps = Math.max(1, Math.round(Math.abs(distance) / WHEEL_STEP_PX));
    const delay = durationMs / steps;
    for (let i = 0; i < steps; i += 1) {
      await this.page.mouse.wheel(0, Math.sign(distance) * WHEEL_STEP_PX);
      await this.page.waitForTimeout(delay);
    }
  }

  private async stroke(from: Point, to: Point): Promise<void> {
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    for (const point of strokePoints({ from, to, durationMs: SWIPE_MS })) {
      await this.page.mouse.move(point.x, point.y);
      await this.page.waitForTimeout(STROKE_FRAME_MS);
    }
    await this.page.mouse.up();
  }
}
