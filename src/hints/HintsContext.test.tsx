import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as errors from '../services/reportError';
import { memoryHintStore } from './__testing__/memoryHintStore';
import { FRESH_PROGRESS } from './hintProgress';
import type { HintStore } from './hintStore';
import { HintsProvider, useHints } from './HintsContext';

const DONE = { swipeHintShown: true, backHintShown: true, peelsSeen: 0 };

function renderHints(store: HintStore, explored = false) {
  const journeys = { hasExplored: jest.fn(async () => explored) };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <HintsProvider store={store} journeys={journeys}>
      {children}
    </HintsProvider>
  );
  return { journeys, rendered: renderHook(() => useHints(), { wrapper }) };
}

describe('HintsProvider', () => {
  it('shows both hints to a new user', async () => {
    const { rendered } = renderHints(memoryHintStore());
    const { result } = await rendered;

    await waitFor(() => expect(result.current.progress).toEqual(FRESH_PROGRESS));
  });

  it('finishes both hints, and saves that, for someone with a saved Journey', async () => {
    const store = memoryHintStore();
    const { rendered } = renderHints(store, true);
    const { result } = await rendered;

    await waitFor(() => expect(result.current.progress).toEqual(DONE));
    expect(store.saved()).toEqual(DONE);
  });

  it('keeps the back hint for a new user who hopped but has not come back yet', async () => {
    const hoppedOnly = { swipeHintShown: true, backHintShown: false, peelsSeen: 2 };
    const { result } = await renderHints(memoryHintStore(hoppedOnly), true).rendered;

    await waitFor(() => expect(result.current.progress).toEqual(hoppedOnly));
  });

  it('skips the Journey lookup once both hints are done', async () => {
    const { rendered, journeys } = renderHints(memoryHintStore(DONE));
    const { result } = await rendered;

    await waitFor(() => expect(result.current.progress).toEqual(DONE));
    expect(journeys.hasExplored).not.toHaveBeenCalled();
  });

  it('counts peels, then finishes the Home hint on the first hop and the back hint on the first return', async () => {
    const store = memoryHintStore();
    const { result } = await renderHints(store).rendered;
    await waitFor(() => expect(result.current.progress).toEqual(FRESH_PROGRESS));

    await act(() => {
      result.current.peeled();
      result.current.hopped();
      result.current.returned();
    });

    expect(store.saved()).toEqual({ swipeHintShown: true, backHintShown: true, peelsSeen: 1 });
  });

  it('hands back the progress from before a first hop or return, and nothing after', async () => {
    const { result } = await renderHints(memoryHintStore()).rendered;
    await waitFor(() => expect(result.current.progress).toEqual(FRESH_PROGRESS));
    const firsts: unknown[] = [];

    await act(() => {
      result.current.peeled();
      firsts.push(result.current.hopped(), result.current.hopped(), result.current.returned(), result.current.returned());
    });

    expect(firsts).toEqual([{ ...FRESH_PROGRESS, peelsSeen: 1 }, null, { swipeHintShown: true, backHintShown: false, peelsSeen: 1 }, null]);
  });

  it('shows no hints when its storage cannot be read', async () => {
    const report = jest.spyOn(errors, 'reportError').mockImplementation(() => undefined);
    const broken: HintStore = { load: () => Promise.reject(new Error('disk')), save: async () => undefined };
    const { result } = await renderHints(broken).rendered;

    await waitFor(() => expect(result.current.progress).toEqual(DONE));
    expect(report).toHaveBeenCalledWith('hints.load', expect.any(Error));
  });

  it('refuses to be used outside its provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useHints())).rejects.toThrow(/inside HintsProvider/);
  });
});
