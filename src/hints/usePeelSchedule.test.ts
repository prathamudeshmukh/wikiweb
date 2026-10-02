import { act, renderHook } from '@testing-library/react-native';
import { HINT } from '../config/constants';
import { usePeelSchedule } from './usePeelSchedule';

interface Props {
  on: boolean;
  shown?: boolean;
}

const renderSchedule = (active: boolean) => {
  const onPeel = jest.fn();
  const rendered = renderHook(({ on, shown = on }: Props) => usePeelSchedule({ homeShown: shown, active: on }, onPeel), {
    initialProps: { on: active } as Props,
  });
  return { onPeel, rendered };
};
const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));

describe('usePeelSchedule', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('peels shortly after Home appears', async () => {
    const { onPeel, rendered } = renderSchedule(true);
    const { result } = await rendered;

    await wait(HINT.firstPeelDelayMs);

    expect(result.current.peelToken).toBe(1);
    expect(onPeel).toHaveBeenCalledTimes(1);
  });

  it('peels again after every idle stretch', async () => {
    const { onPeel, rendered } = renderSchedule(true);
    await rendered;

    await wait(HINT.firstPeelDelayMs + HINT.idleMs * 2);

    expect(onPeel).toHaveBeenCalledTimes(3);
  });

  it('restarts the idle wait whenever the user touches Home', async () => {
    const { onPeel, rendered } = renderSchedule(true);
    const { result } = await rendered;
    await wait(HINT.firstPeelDelayMs + HINT.idleMs - 1);

    await act(() => result.current.touched());
    await wait(HINT.idleMs - 1);

    expect(onPeel).toHaveBeenCalledTimes(1);
  });

  it('never peels while inactive', async () => {
    const { onPeel, rendered } = renderSchedule(false);
    const { result } = await rendered;

    await act(() => result.current.touched());
    await wait(HINT.firstPeelDelayMs + HINT.idleMs);

    expect(onPeel).not.toHaveBeenCalled();
  });

  it('stops when it goes inactive and starts over when Home appears again', async () => {
    const { onPeel, rendered } = renderSchedule(true);
    const { rerender } = await rendered;
    await rerender({ on: false });
    await wait(HINT.idleMs);

    await rerender({ on: true });
    await wait(HINT.firstPeelDelayMs);

    expect(onPeel).toHaveBeenCalledTimes(1);
  });

  it('waits a full idle stretch when it resumes while Home stayed on screen', async () => {
    const { onPeel, rendered } = renderSchedule(true);
    const { rerender } = await rendered;
    await rerender({ on: false, shown: true });

    await rerender({ on: true, shown: true });
    await wait(HINT.idleMs - 1);

    expect(onPeel).not.toHaveBeenCalled();
  });
});
