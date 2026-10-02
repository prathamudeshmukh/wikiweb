import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent } from 'react-native';
import { fittedLineCount, useFittedLineCount } from './fittedLineCount';

const LINE_HEIGHT = 27;

const layoutEvent = (height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width: 300, height } } }) as LayoutChangeEvent;

describe('fittedLineCount', () => {
  it('counts only the lines that fit whole', () => {
    expect(fittedLineCount(27 * 9 + 20, LINE_HEIGHT)).toBe(9);
  });

  it('keeps at least one line when the space is smaller than a line', () => {
    expect(fittedLineCount(10, LINE_HEIGHT)).toBe(1);
  });

  it('keeps at least one line for a zero or invalid height', () => {
    expect(fittedLineCount(0, LINE_HEIGHT)).toBe(1);
    expect(fittedLineCount(Number.NaN, LINE_HEIGHT)).toBe(1);
  });
});

describe('useFittedLineCount', () => {
  it('uses the fallback until the space has been measured', async () => {
    const { result } = await renderHook(() => useFittedLineCount(LINE_HEIGHT, 4));

    expect(result.current.lines).toBe(4);
  });

  it('fits the line count to the measured height', async () => {
    const { result } = await renderHook(() => useFittedLineCount(LINE_HEIGHT, 4));

    await act(() => result.current.onLayout(layoutEvent(LINE_HEIGHT * 11)));

    expect(result.current.lines).toBe(11);
  });
});
