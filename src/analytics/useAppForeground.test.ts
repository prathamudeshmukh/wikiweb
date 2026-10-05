import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useAppForeground } from './useAppForeground';

function captureAppState() {
  let emit: (status: AppStateStatus) => void = () => undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    emit = listener;
    return { remove: jest.fn() };
  });
  return (status: AppStateStatus) => emit(status);
}

describe('useAppForeground', () => {
  afterEach(() => jest.restoreAllMocks());

  it('stays in the foreground while iOS is only inactive', async () => {
    const emit = captureAppState();
    const { result } = await renderHook(() => useAppForeground());

    await act(() => emit('inactive'));

    expect(result.current).toBe(true);
  });

  it('leaves the foreground in the background', async () => {
    const emit = captureAppState();
    const { result } = await renderHook(() => useAppForeground());

    await act(() => emit('background'));

    expect(result.current).toBe(false);
  });
});
