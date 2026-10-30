/** The card resting at the top of a list scrolled to `offset`, with cards `interval` apart. */
export function settledCardIndex(offset: number, interval: number): number {
  return interval > 0 ? Math.round(offset / interval) : 0;
}

export interface ScrollSettledOptions {
  /** The browser fires `scrollend` (Safari only from 26); otherwise settling is when `scroll` events stop. */
  supportsScrollEnd: boolean;
  debounceMs: number;
}

/**
 * Calls `onSettled` with the scroll offset each time `scroller` comes to rest — on web, after the CSS snap has run.
 * Returns a function that stops listening.
 */
export function listenForScrollSettled(
  scroller: EventTarget & { scrollTop: number },
  onSettled: (offset: number) => void,
  { supportsScrollEnd, debounceMs }: ScrollSettledOptions,
): () => void {
  const report = () => onSettled(scroller.scrollTop);
  if (supportsScrollEnd) {
    scroller.addEventListener('scrollend', report);
    return () => scroller.removeEventListener('scrollend', report);
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onScroll = () => {
    clearTimeout(timer);
    timer = setTimeout(report, debounceMs);
  };
  scroller.addEventListener('scroll', onScroll);
  return () => {
    clearTimeout(timer);
    scroller.removeEventListener('scroll', onScroll);
  };
}
