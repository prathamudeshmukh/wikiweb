import { useCallback, useLayoutEffect, useRef } from 'react';
import { WEB_SCROLL } from '../config/constants';
import { listenForScrollSettled } from './scrollSettle';

/** What the list ref receives on web: react-native-web's FlatList, whose scroller is a DOM element. */
interface ScrollableList {
  getScrollableNode(): unknown;
}

/**
 * A ref for a column's list that reports where it came to rest. react-native-web never fires the list's drag and
 * momentum end callbacks, so web listens to the scroller itself.
 */
export function useScrollSettled(onSettled: (offset: number) => void): (list: ScrollableList | null) => (() => void) | undefined {
  const latest = useRef(onSettled);
  useLayoutEffect(() => {
    latest.current = onSettled;
  }, [onSettled]);

  return useCallback((list: ScrollableList | null) => {
    const scroller = list?.getScrollableNode();
    if (!(scroller instanceof HTMLElement)) return undefined;
    return listenForScrollSettled(scroller, (offset) => latest.current(offset), {
      supportsScrollEnd: 'onscrollend' in window,
      debounceMs: WEB_SCROLL.settleDebounceMs,
    });
  }, []);
}
