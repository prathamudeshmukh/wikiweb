import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { makeFind } from '../finds/__testing__/findFactories';
import { cardFromFind } from '../finds/findFormat';
import { TangentProvider, useTangentQueue } from './TangentContext';
import { useTangentOnClose } from './useTangentOnClose';

const mockListeners = new Map<string, () => void>();
jest.mock('expo-router', () => ({
  useNavigation: () => ({
    addListener: (event: string, listener: () => void) => {
      mockListeners.set(event, listener);
      return () => mockListeners.delete(event);
    },
  }),
}));

const tangent = { card: cardFromFind(makeFind('Octopus')), fromNodeId: null };

function renderTangentOnClose() {
  const wrapper = ({ children }: { children: ReactNode }) => <TangentProvider>{children}</TangentProvider>;
  return renderHook(() => ({ take: useTangentOnClose(), queue: useTangentQueue() }), { wrapper });
}

describe('useTangentOnClose', () => {
  afterEach(() => jest.useRealTimers());

  it('closes the screen, then hands the tangent over once it has finished closing', async () => {
    const { result } = await renderTangentOnClose();
    const close = jest.fn();

    await act(() => result.current.take(tangent, close));
    expect(close).toHaveBeenCalled();
    expect(result.current.queue.take()).toBeNull();
    await act(() => mockListeners.get('transitionEnd')?.());

    expect(result.current.queue.take()).toBe(tangent);
  });

  it('hands the tangent over anyway if the closing never reports its end', async () => {
    jest.useFakeTimers();
    const { result } = await renderTangentOnClose();

    await act(() => result.current.take(tangent, jest.fn()));
    await act(() => jest.runAllTimers());

    expect(result.current.queue.take()).toBe(tangent);
  });

  it('hands each tangent over once', async () => {
    jest.useFakeTimers();
    const { result } = await renderTangentOnClose();
    const requested = jest.fn();
    result.current.queue.subscribe(requested);

    await act(() => result.current.take(tangent, jest.fn()));
    await act(() => mockListeners.get('transitionEnd')?.());
    await act(() => jest.runAllTimers());

    expect(requested).toHaveBeenCalledTimes(1);
  });
});
