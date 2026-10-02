import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useAppActive } from './useAppActive';

function captureAppState() {
  let emit: (status: AppStateStatus) => void = () => undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    emit = listener;
    return { remove };
  });
  return { emit: (status: AppStateStatus) => emit(status), remove };
}

describe('useAppActive', () => {
  afterEach(() => jest.restoreAllMocks());

  it('follows the app between foreground and background', async () => {
    const appState = captureAppState();
    const { result } = await renderHook(() => useAppActive());
    expect(result.current).toBe(true);

    await act(() => appState.emit('background'));
    expect(result.current).toBe(false);

    await act(() => appState.emit('active'));
    expect(result.current).toBe(true);
  });

  it('stops listening when unmounted', async () => {
    const appState = captureAppState();
    const { unmount } = await renderHook(() => useAppActive());

    await unmount();

    expect(appState.remove).toHaveBeenCalled();
  });
});
