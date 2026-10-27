import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** The part of what VirtualizedList hands its CellRendererComponent that a snap cell reads. */
export interface SnapCellProps {
  children: ReactNode;
  style: StyleProp<ViewStyle> | undefined;
}

/** How a column's list snaps to its cards beyond `snapToInterval`, which react-native-web ignores (SPEC.md §15.3). */
export interface FeedSnap {
  /** On the list's scroller. */
  list: ViewStyle | undefined;
  /** On the list's footer, given the padding below it: the very bottom is the last resting place. */
  footer: (bottomPadding: number) => ViewStyle | undefined;
  /** Wraps each card's cell (card and the gap after it), so its top is a resting place. */
  Cell: ((props: SnapCellProps) => ReactNode) | undefined;
}

/** Native: `snapToInterval` does it all. */
export const FEED_SNAP: FeedSnap = { list: undefined, footer: () => undefined, Cell: undefined };
