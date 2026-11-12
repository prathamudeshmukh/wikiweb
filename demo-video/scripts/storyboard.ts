import type { Page } from 'playwright';
import type { Step } from './cardChoice.ts';
import { pickCard } from './cardPicker.ts';
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
/** Broad, photogenic topics across four territories; Just start's defaults lean on Science (SPEC.md §3.1). */
const INTERESTS = ['Animals', 'Space', 'Music', 'Food'] as const;
const SCREEN_MIDDLE = { x: 195, y: 520 } as const;
const READER_TEXT_TIMEOUT_MS = 15_000;
const COLUMN_LOADING = /setting a course/i;
const COLUMN_TIMEOUT_MS = 30_000;

/** Off camera: pick interests in onboarding so Home opens on varied, photogenic cards. */
export async function setUp(page: Page): Promise<void> {
  for (const interest of INTERESTS) await page.getByRole('checkbox', { name: interest, exact: true }).click();
  await page.getByRole('button', { name: /set off/i }).click();
  await page.locator('[data-testid^="card-"]').first().waitFor();
  await page.waitForTimeout(PAUSE.linger);
}

/** The ~25 s on camera; the end card is added in Remotion. */
export async function perform(director: Director): Promise<void> {
  const { page, thumb } = director;
  director.beat('hook');
  await page.waitForTimeout(PAUSE.settle);
  const firstHop = await hop(director, { name: 'hop-1', path: [] });

  director.beat('links');
  const secondHop = await hop(director, { name: 'hop-2', path: firstHop });
  const route = await hop(director, { name: 'hop-3', path: secondHop });

  director.beat('read');
  await thumb.tap((await pickCard(page, route, { needsTopic: true })).image);
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
  await expectStampEarned(page);
}

/** The last beat is about the stamp; a take without one is not worth rendering. */
async function expectStampEarned(page: Page): Promise<void> {
  // Stamp labels are "{Topic} stamp", or "{Topic} stamp, not collected yet" (Stamp.tsx).
  const earned = await page.locator('[aria-label$=" stamp"]').count();
  if (earned === 0) throw new Error('The read earned no stamp, so the Logbook beat shows none. Run `npm run record` again.');
}

/** Hops from a fresh card and returns the route so far, so the next hop can avoid its siblings. */
async function hop(director: Director, { name, path }: { name: string; path: readonly Step[] }): Promise<readonly Step[]> {
  const card = await pickCard(director.page, path);
  await director.thumb.swipeLeft(card.middle.y);
  // A live column can take seconds ("Setting a course…"); a replayed one is instant.
  await director.page.getByText(COLUMN_LOADING).waitFor({ state: 'hidden', timeout: COLUMN_TIMEOUT_MS });
  await director.page.waitForTimeout(PAUSE.afterHop);
  await director.still(name);
  return [...path, { title: card.title, topic: card.topic }];
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
