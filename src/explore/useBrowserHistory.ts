import type { HistoryActions } from './historySync';

export interface BrowserHistoryOptions extends HistoryActions {
  depth: number;
  /** No other screen (the reader, the Logbook) is on top; while one is, Back belongs to the router. */
  isFocused: boolean;
}

/** Browser history per column (SPEC.md §15.3); native has the hardware back button instead. */
export function useBrowserHistory(_options: BrowserHistoryOptions): void {}
