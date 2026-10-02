import { FRESH_PROGRESS } from './hintProgress';
import { type ColumnHintState, hintFor, mayPeel } from './hintRules';

const HOPPED = { ...FRESH_PROGRESS, swipeHintShown: true };
const DONE = { ...HOPPED, backHintShown: true };

const homeOnTop = (overrides: Partial<ColumnHintState> = {}): ColumnHintState => ({
  isHome: true,
  isTop: true,
  isScreenFocused: true,
  isAppActive: true,
  reduceMotion: false,
  hasArticleInFocus: true,
  isTouching: false,
  ...overrides,
});

describe('hintFor', () => {
  it('shows nothing until progress has loaded', () => {
    expect(hintFor(undefined, true)).toBeNull();
  });

  it('shows the swipe hint on Home until the first hop', () => {
    expect(hintFor(FRESH_PROGRESS, true)).toBe('swipe');
    expect(hintFor(HOPPED, true)).toBeNull();
  });

  it('shows the back hint in a column until the first return', () => {
    expect(hintFor(HOPPED, false)).toBe('back');
    expect(hintFor(DONE, false)).toBeNull();
  });
});

describe('mayPeel', () => {
  it('peels the focused article on Home while the user can see it', () => {
    expect(mayPeel('swipe', homeOnTop())).toBe(true);
  });

  it('never peels for the back hint', () => {
    expect(mayPeel('back', homeOnTop({ isHome: false }))).toBe(false);
  });

  it.each<[string, Partial<ColumnHintState>]>([
    ['under a column', { isTop: false }],
    ['under the reader or Logbook', { isScreenFocused: false }],
    ['while the app is in the background', { isAppActive: false }],
    ['with Reduce Motion on', { reduceMotion: true }],
    ['on a compass, error or offline card', { hasArticleInFocus: false }],
    ['while a finger is on the column', { isTouching: true }],
  ])('stays still %s', (_, overrides) => {
    expect(mayPeel('swipe', homeOnTop(overrides))).toBe(false);
  });
});
