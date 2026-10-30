import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { LAYOUT } from '../theme/layout';
import type { FeedSnap, SnapCellProps } from './feedSnap';

// react-native-web passes CSS scroll-snap properties through, but React Native's ViewStyle doesn't type them.
const list = { scrollSnapType: 'y mandatory', scrollPaddingTop: LAYOUT.listTopPadding } as ViewStyle;
// `normal` stop, as native: a hard flick can carry past several cards.
const cell = { scrollSnapAlign: 'start', scrollSnapStop: 'normal' } as ViewStyle;
// The very bottom, so the footer (and its Retry) is never left out of reach — native's snapToEnd. The margin stretches
// the footer's snap area over the padding below it. Not the content container's end: an area taller than the list
// makes every position inside it a valid resting place, which turns snapping off.
const footer = (bottomPadding: number) => ({ scrollSnapAlign: 'end', scrollMarginBottom: bottomPadding }) as ViewStyle;

const styles = StyleSheet.create({ cell });

/**
 * A card's cell, as VirtualizedList renders it by default, plus its resting place. The rest of its props (onLayout,
 * onFocusCapture, and cellKey/index/item, which react-native-web's View drops) go on as they are.
 */
function SnapCell({ style, ...cellProps }: SnapCellProps) {
  return <View {...(cellProps as ViewProps)} style={[style, styles.cell]} />;
}

/** Web: CSS scroll snapping, resting each card where native's snapToInterval does (SPEC.md §15.3). */
export const FEED_SNAP: FeedSnap = { list, footer, Cell: SnapCell };
