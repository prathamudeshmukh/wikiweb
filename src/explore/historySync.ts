/** The slice of `window.history` the sync uses. */
export interface HistoryPort {
  readonly state: unknown;
  pushState(state: unknown, unused: string): void;
  go(delta: number): void;
}

/** What a browser Back or Forward asks of the column stack. */
export interface HistoryActions {
  /** Back one column, as a right swipe would. */
  back(): void;
  jumpTo(columnIndex: number): void;
}

export interface HistorySync {
  /** The column stack's depth changed (a hop, a back, a jump or a resumed expedition). */
  depthChanged(depth: number): void;
  /** The browser moved to another history entry (`popstate`). */
  popped(state: unknown): void;
}

// Each hop's entry keeps the current URL and the router's own state; only this field is added. Expo Router finds its
// entries by `state.id` and treats a changed path as a deep link, so the depth can't live in the URL.
const DEPTH_FIELD = 'tangentDepth';

type EntryState = Record<string, unknown>;

function isEntryState(state: unknown): state is EntryState {
  return typeof state === 'object' && state !== null;
}

function depthOf(state: EntryState): number {
  const depth = state[DEPTH_FIELD];
  return typeof depth === 'number' ? depth : 0;
}

function withDepth(state: unknown, depth: number): EntryState {
  return { ...(isEntryState(state) ? state : {}), [DEPTH_FIELD]: depth };
}

/**
 * Keeps one browser history entry per column, so the browser's Back works like a right swipe (SPEC.md §15.3).
 * The app's own backs and jumps rewind history to match, and the popstate that follows is recognised as theirs.
 */
export function createHistorySync(history: HistoryPort, actions: HistoryActions): HistorySync {
  let appDepth = 0;
  // The depth of the entry the browser is on (or is on its way to, after our own `go`).
  let entryDepth = isEntryState(history.state) ? depthOf(history.state) : 0;
  let arrivingAt: number | null = null;

  function rewindTo(depth: number): void {
    arrivingAt = depth;
    history.go(depth - entryDepth);
    entryDepth = depth;
  }

  // A reload lands on the entry of the column it left, but the app starts on Home.
  if (entryDepth > 0) rewindTo(0);

  return {
    depthChanged(depth) {
      appDepth = depth;
      if (depth < entryDepth) rewindTo(depth);
      for (let next = entryDepth + 1; next <= depth; next += 1) history.pushState(withDepth(history.state, next), '');
      entryDepth = Math.max(entryDepth, depth);
    },
    popped(state) {
      if (!isEntryState(state)) return;
      entryDepth = depthOf(state);
      if (entryDepth === arrivingAt) {
        arrivingAt = null;
        return;
      }
      if (entryDepth === appDepth - 1) actions.back();
      else if (entryDepth < appDepth) actions.jumpTo(entryDepth);
      // Forward onto a column already left: its entry is stale, so return to where the app is.
      else if (entryDepth > appDepth) rewindTo(appDepth);
    },
  };
}

/** The slice of `window.history` the router rewrites entries through. */
export interface ReplaceableHistory {
  readonly state: unknown;
  replaceState(state: unknown, unused: string, url?: string | URL | null): void;
}

const ROUTER_ENTRY_ID = 'id';

function sameRouterEntry(current: EntryState, next: unknown): boolean {
  return isEntryState(next) && next[ROUTER_ENTRY_ID] === current[ROUTER_ENTRY_ID];
}

/**
 * Expo Router rewrites the current entry's state to its own `{ id }` whenever its navigation state changes, which would
 * strip a hop entry's depth. While installed, a rewrite of the same router entry keeps the depth. Returns the undo.
 */
export function keepDepthThroughReplaces(history: ReplaceableHistory): () => void {
  const replaceState = history.replaceState;
  history.replaceState = (state, unused, url) => {
    const current = history.state;
    const keep = isEntryState(current) && DEPTH_FIELD in current && sameRouterEntry(current, state);
    replaceState.call(history, keep ? withDepth(state, depthOf(current)) : state, unused, url);
  };
  return () => {
    history.replaceState = replaceState;
  };
}
