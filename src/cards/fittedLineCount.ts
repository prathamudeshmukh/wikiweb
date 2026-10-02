import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

const MIN_LINES = 1;

/** Whole lines of `lineHeight` that fit in `height` — a partial last line would be clipped mid-glyph, so it's dropped. */
export function fittedLineCount(height: number, lineHeight: number): number {
  const lines = Math.floor(height / lineHeight);
  return Number.isFinite(lines) ? Math.max(MIN_LINES, lines) : MIN_LINES;
}

/** Line count for text filling a flex box: `fallbackLines` until the box is measured, then as many as fit. */
export function useFittedLineCount(lineHeight: number, fallbackLines: number) {
  const [lines, setLines] = useState(fallbackLines);
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => setLines(fittedLineCount(event.nativeEvent.layout.height, lineHeight)),
    [lineHeight],
  );
  return { lines, onLayout };
}
