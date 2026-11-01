import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { memoryInterestsStore } from '../__testing__/renderWithServices';
import * as errors from '../services/reportError';
import { InterestsProvider, useInterests, useInterestsChosen } from './InterestsContext';
import type { InterestsStore } from './interestsStore';

const wrapperFor = (store: InterestsStore) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <InterestsProvider store={store}>{children}</InterestsProvider>;
  };

describe('InterestsProvider', () => {
  it('loads saved interests', async () => {
    const { result } = await renderHook(() => useInterests(), { wrapper: wrapperFor(memoryInterestsStore(['space'])) });

    await waitFor(() => expect(result.current.interests).toEqual(['space']));
  });

  it('reports null before onboarding', async () => {
    const { result } = await renderHook(() => useInterests(), { wrapper: wrapperFor(memoryInterestsStore()) });

    await waitFor(() => expect(result.current.interests).toBeNull());
  });

  it('saves new interests and makes them current', async () => {
    const { result } = await renderHook(() => useInterests(), { wrapper: wrapperFor(memoryInterestsStore()) });
    await waitFor(() => expect(result.current.interests).toBeNull());

    await act(() => result.current.saveInterests(['space', 'history', 'art'], 'onboarding'));

    expect(result.current.interests).toEqual(['space', 'history', 'art']);
  });

  it('sends the user back through onboarding when storage cannot be read', async () => {
    const report = jest.spyOn(errors, 'reportError').mockImplementation(() => undefined);
    const broken: InterestsStore = { load: () => Promise.reject(new Error('disk')), save: async () => undefined, isChosen: async () => true };

    const { result } = await renderHook(() => useInterests(), { wrapper: wrapperFor(broken) });

    await waitFor(() => expect(result.current.interests).toBeNull());
    expect(report).toHaveBeenCalledWith('interests.load', expect.any(Error));
  });

  it('refuses to be used outside its provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useInterests())).rejects.toThrow(/inside InterestsProvider/);
  });

  it('knows the user skipped choosing until they save picks of their own', async () => {
    const store = memoryInterestsStore();
    const { result } = await renderHook(() => ({ ...useInterests(), chosen: useInterestsChosen() }), { wrapper: wrapperFor(store) });
    await waitFor(() => expect(result.current.interests).toBeNull());

    await act(() => result.current.saveInterests(['science', 'history', 'art'], 'skip'));
    const afterSkip = result.current.chosen;
    await act(() => result.current.saveInterests(['science', 'history', 'space'], 'settings'));

    expect(afterSkip).toBe(false);
    expect(result.current.chosen).toBe(true);
  });

  it('counts interests as chosen outside the provider', async () => {
    const { result } = await renderHook(() => useInterestsChosen());

    expect(result.current).toBe(true);
  });
});
