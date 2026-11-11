import type { Page } from 'playwright';
import { Thumb } from './gestures.ts';

/** The beat ids the Remotion captions key on (src/captions.ts). */
export const BEATS = ['hook', 'links', 'read', 'keep', 'stamps'] as const;
export type BeatId = (typeof BEATS)[number];

export interface Director {
  page: Page;
  thumb: Thumb;
  /** Starts a beat: its caption appears from here. */
  beat(id: BeatId): void;
  /** Saves a still for reviewing the take's path. */
  still(name: string): Promise<void>;
}

/** Pauses, in ms, sized for a viewer reading one caption per beat. */
const PAUSE = { settle: 700, afterHop: 1300, read: 900, glance: 1000, linger: 1600, logbook: 3200 } as const;
const READER_SCROLL = { distancePx: 520, durationMs: 1800 } as const;
const CARD_TAP = { x: 195, y: 330 } as const;
const SCREEN_MIDDLE = { x: 195, y: 520 } as const;
const READER_TEXT_TIMEOUT_MS = 15_000;
const COLUMN_LOADING = /setting a course/i;
const COLUMN_TIMEOUT_MS = 30_000;

/** Off camera: skip onboarding the way a visitor would, with Just start (SPEC.md §3.1). */
export async function setUp(page: Page): Promise<void> {
  await page.getByRole('button', { name: /just start/i }).click();
  await page.locator('[data-testid^="card-"]').first().waitFor();
  await page.waitForTimeout(PAUSE.linger);
}

/** The ~25 s on camera; the end card is added in Remotion. */
export async function perform(director: Director): Promise<void> {
  const { page, thumb } = director;
  director.beat('hook');
  await page.waitForTimeout(PAUSE.settle);
  await hop(director, 'hop-1');

  director.beat('links');
  await hop(director, 'hop-2');
  await hop(director, 'hop-3');

  director.beat('read');
  await thumb.tap(CARD_TAP);
  await page.frameLocator('iframe').locator('p').first().waitFor({ timeout: READER_TEXT_TIMEOUT_MS });
  await page.waitForTimeout(PAUSE.read);
  await thumb.scroll(SCREEN_MIDDLE, READER_SCROLL.distancePx, READER_SCROLL.durationMs);
  await director.still('reader');

  director.beat('keep');
  await page.getByRole('button', { name: 'Keep as a find' }).click();
  await page.waitForTimeout(PAUSE.glance);
  await page.getByRole('button', { name: 'Close article' }).click();
  await page.waitForTimeout(PAUSE.settle);
  await thumb.swipeRight();
  await page.waitForTimeout(PAUSE.settle);

  director.beat('stamps');
  await goHome(director);
  await page.getByRole('button', { name: 'Logbook' }).click();
  // Stamps, the new find and the expedition all fit on one phone screen: hold, don't scroll.
  await page.waitForTimeout(PAUSE.logbook);
  await director.still('logbook');
}

async function hop(director: Director, name: string): Promise<void> {
  await director.thumb.swipeLeft();
  // A live column can take seconds ("Setting a course…"); a replayed one is instant.
  await director.page.getByText(COLUMN_LOADING).waitFor({ state: 'hidden', timeout: COLUMN_TIMEOUT_MS });
  await director.page.waitForTimeout(PAUSE.afterHop);
  await director.still(name);
}

/** The Home crumb jumps straight back; if the route is already home there is nothing to do. */
async function goHome({ page }: Director): Promise<void> {
  // Each stacked column draws its own breadcrumb; only the top one is visible.
  const homeCrumb = page.getByRole('button', { name: /back to home/i }).filter({ visible: true }).last();
  if ((await homeCrumb.count()) > 0) {
    await homeCrumb.click();
    await page.waitForTimeout(PAUSE.settle);
  }
}
