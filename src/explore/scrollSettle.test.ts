import { listenForScrollSettled, settledCardIndex } from './scrollSettle';

const INTERVAL = 600;
const DEBOUNCE_MS = 150;

function fakeScroller(scrollTop = 0) {
  const target = new EventTarget() as EventTarget & { scrollTop: number };
  target.scrollTop = scrollTop;
  return target;
}

describe('settledCardIndex', () => {
  it('names the card resting at the top of the list', () => {
    expect(settledCardIndex(INTERVAL * 3, INTERVAL)).toBe(3);
  });

  it('rounds an offset short of a snap point to the nearest card', () => {
    expect(settledCardIndex(INTERVAL * 2 - 40, INTERVAL)).toBe(2);
  });

  it('names no card while the list has no height yet', () => {
    expect(settledCardIndex(120, 0)).toBe(0);
  });
});

describe('listenForScrollSettled', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reports the offset once the browser says scrolling ended', () => {
    const scroller = fakeScroller(1200);
    const onSettled = jest.fn();
    listenForScrollSettled(scroller, onSettled, { supportsScrollEnd: true, debounceMs: DEBOUNCE_MS });

    scroller.dispatchEvent(new Event('scrollend'));

    expect(onSettled).toHaveBeenCalledWith(1200);
  });

  it('without scrollend, reports once scroll events stop', () => {
    const scroller = fakeScroller();
    const onSettled = jest.fn();
    listenForScrollSettled(scroller, onSettled, { supportsScrollEnd: false, debounceMs: DEBOUNCE_MS });

    scroller.dispatchEvent(new Event('scroll'));
    jest.advanceTimersByTime(DEBOUNCE_MS - 1);
    scroller.scrollTop = 600;
    scroller.dispatchEvent(new Event('scroll'));
    jest.advanceTimersByTime(DEBOUNCE_MS);

    expect(onSettled.mock.calls).toEqual([[600]]);
  });

  it('stops reporting once removed', () => {
    const scroller = fakeScroller();
    const onSettled = jest.fn();
    const stop = listenForScrollSettled(scroller, onSettled, { supportsScrollEnd: false, debounceMs: DEBOUNCE_MS });

    scroller.dispatchEvent(new Event('scroll'));
    stop();
    scroller.dispatchEvent(new Event('scroll'));
    jest.runAllTimers();

    expect(onSettled).not.toHaveBeenCalled();
  });
});
