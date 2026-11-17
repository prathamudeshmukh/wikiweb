/** @jest-environment jsdom */
import { NIGHT_ATLAS, PAPER } from '../theme/tokens';
import { APPLY_FILL_CONTRAST_FUNCTION, PICK_INK_FUNCTION } from './fillContrast';

const INKS = { dark: PAPER.ink, light: NIGHT_ATLAS.ink };

type PickInk = (fill: string, inks: typeof INKS) => string | null;
type ApplyFillContrast = (root: ParentNode, inks: typeof INKS) => void;

const pickInk = new Function(`return ${PICK_INK_FUNCTION}`)() as PickInk;
const applyFillContrast = new Function(`return ${APPLY_FILL_CONTRAST_FUNCTION}`)() as ApplyFillContrast;

// jsdom reports colours set through the style API as rgb().
const DARK_INK_RGB = 'rgb(31, 27, 22)';
const LIGHT_INK_RGB = 'rgb(237, 228, 211)';

describe('PICK_INK_FUNCTION', () => {
  it('picks dark ink on a light fill, like a Periodic table pastel', () => {
    expect(pickInk('rgb(255, 192, 192)', INKS)).toBe(PAPER.ink);
  });

  it('picks light ink on a dark fill, like a navbox header', () => {
    expect(pickInk('rgb(32, 32, 96)', INKS)).toBe(NIGHT_ATLAS.ink);
  });

  it('leaves colours it cannot read, and mostly see-through fills, unchanged', () => {
    expect(pickInk('color(display-p3 1 1 1)', INKS)).toBeNull();
    expect(pickInk('rgba(255, 255, 255, 0.2)', INKS)).toBeNull();
  });
});

describe('APPLY_FILL_CONTRAST_FUNCTION', () => {
  function page(cells: string): HTMLElement {
    document.body.innerHTML = `<div id="pcs"><table><tr>${cells}</tr></table></div>`;
    applyFillContrast(document.getElementById('pcs') as HTMLElement, INKS);
    return document.body;
  }

  it('gives a light-filled cell and its links dark ink', () => {
    const body = page('<td style="background:#ffc0c0">H <a href="./Hydrogen">Hydrogen</a></td>');

    expect((body.querySelector('td') as HTMLElement).style.color).toBe(DARK_INK_RGB);
    expect((body.querySelector('a') as HTMLElement).style.color).toBe(DARK_INK_RGB);
  });

  it('gives a dark-filled cell light ink', () => {
    const body = page('<td style="background-color:#202060">Group 1</td>');

    expect((body.querySelector('td') as HTMLElement).style.color).toBe(LIGHT_INK_RGB);
  });

  it('keeps an editor’s own text colour and gives the cell’s links that colour', () => {
    const body = page('<td style="background:#ffc0c0; color:#800000">Hg <a href="./Mercury">Mercury</a></td>');

    expect((body.querySelector('td') as HTMLElement).style.color).toBe('rgb(128, 0, 0)');
    expect((body.querySelector('a') as HTMLElement).style.color).toBe('rgb(128, 0, 0)');
  });
});
