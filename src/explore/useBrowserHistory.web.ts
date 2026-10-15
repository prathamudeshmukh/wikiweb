import { useEffect, useLayoutEffect, useRef } from 'react';
import { createHistorySync, type HistorySync, keepDepthThroughReplaces } from './historySync';
import type { BrowserHistoryOptions } from './useBrowserHistory';

// Entries of other screens (the reader, the Logbook) belong to the router.
const EXPLORE_PATH = '/';

// Once for the app's lifetime: the router can keep more than one explore screen mounted.
let keepingDepth = false;

/** Browser history per column: Back works like a right swipe (SPEC.md §15.3). */
export function useBrowserHistory({ depth, back, jumpTo, isFocused }: BrowserHistoryOptions): void {
  const latest = useRef({ back, jumpTo, isFocused });
  useLayoutEffect(() => {
    latest.current = { back, jumpTo, isFocused };
  }, [back, jumpTo, isFocused]);
  const sync = useRef<HistorySync | null>(null);

  useEffect(() => {
    if (!keepingDepth) {
      keepDepthThroughReplaces(window.history);
      keepingDepth = true;
    }
    const started = createHistorySync(window.history, {
      back: () => latest.current.back(),
      jumpTo: (columnIndex) => latest.current.jumpTo(columnIndex),
    });
    sync.current = started;
    const onPopState = (event: PopStateEvent) => {
      // Only the explore screen in front owns these entries: the router can keep another one mounted beneath, and
      // while the reader or Logbook is on top, Back is the router's.
      if (window.location.pathname !== EXPLORE_PATH || !latest.current.isFocused) return;
      // A move between two of explore's own entries; the router would take it for a move to its own entry and reset
      // its state. The capture phase runs before the router's listener, so it never sees it.
      event.stopImmediatePropagation();
      started.popped(event.state);
    };
    window.addEventListener('popstate', onPopState, { capture: true });
    return () => {
      window.removeEventListener('popstate', onPopState, { capture: true });
      sync.current = null;
    };
  }, []);

  useEffect(() => {
    sync.current?.depthChanged(depth);
  }, [depth]);
}
