import type { ElementHandle, JSHandle, Page } from 'playwright';
import { type ChoiceRules, chooseCard, type Step, topicOf } from './cardChoice.ts';
import type { Point } from './gesturePath.ts';

/** A point on the top column, used to find which column the viewer is looking at. */
const PROBE: Point = { x: 195, y: 460 };
/** How far down the column to look: further means a long scroll on camera. */
const LOOK_AHEAD = 6;
const SCROLL_SETTLE_MS = 900;
/** Where on a card to touch, as a share of its height: the image for a tap, mid-card for a swipe. */
const TOUCH_AT = { image: 0.25, middle: 0.5 } as const;

export interface PickedCard extends Step {
  /** Where to swipe it from. */
  middle: Point;
  /** Where to tap to read it. */
  image: Point;
}

/**
 * Picks a card in the column on top (see chooseCard) and scrolls it to the middle of the screen,
 * on camera, when it isn't the visible one. `route` is the articles already taken this take.
 */
export async function pickCard(page: Page, route: readonly Step[], rules: ChoiceRules = {}): Promise<PickedCard> {
  const cards = await visibleColumnCards(page);
  const seen = await cards.evaluate((els) =>
    els.map((el) => ({
      // The card's label starts with its title (CardView).
      title: el.querySelector('[aria-label]')?.getAttribute('aria-label')?.split('. ')[0] ?? '',
      text: el.innerText,
      // Typographic cards (a coloured title block, DESIGN.md §5.2) make a flat frame on video.
      hasPhoto: !el.querySelector('[data-testid="card-block-title-area"]'),
    })),
  );
  if (seen.length === 0) throw new Error('No card on screen to pick from.');
  const candidates = seen.map(({ title, text, hasPhoto }) => ({ title, topic: topicOf(text), hasPhoto }));
  const index = chooseCard(candidates, route, rules);
  const card = (await cards.evaluateHandle((els, i) => els[i], index)).asElement() as ElementHandle<HTMLElement>;
  await card.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await page.waitForTimeout(SCROLL_SETTLE_MS);
  return touchPoints(card, candidates[index]);
}

/** The cards of the column on top, from the one under the thumb down. */
function visibleColumnCards(page: Page): Promise<JSHandle<HTMLElement[]>> {
  return page.evaluateHandle(
    ({ probe, lookAhead }) => {
      const isCard = (el: Element) => /^card-\d+$/.test(el.getAttribute('data-testid') ?? '');
      // Parts of a card are tagged `card-…` too (card-extract-area), so walk up to the `card-<pageId>` wrapper.
      let top: Element | null = document.elementFromPoint(probe.x, probe.y);
      while (top && !isCard(top)) top = top.parentElement;
      if (!top) return [];
      let column: Element | null = top.parentElement;
      while (column && column.scrollHeight <= column.clientHeight) column = column.parentElement;
      const cards = [...(column ?? document).querySelectorAll<HTMLElement>('[data-testid^="card-"]')].filter(isCard);
      return cards.slice(Math.max(0, cards.indexOf(top as HTMLElement))).slice(0, lookAhead);
    },
    { probe: PROBE, lookAhead: LOOK_AHEAD },
  );
}

async function touchPoints(card: ElementHandle<HTMLElement>, { title, topic }: Step): Promise<PickedCard> {
  const box = await card.boundingBox();
  if (!box) throw new Error(`The picked card "${title}" is not on screen.`);
  const at = (share: number) => ({ x: box.x + box.width / 2, y: box.y + box.height * share });
  return { title, topic, middle: at(TOUCH_AT.middle), image: at(TOUCH_AT.image) };
}
