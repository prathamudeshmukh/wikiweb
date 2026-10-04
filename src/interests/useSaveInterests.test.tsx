import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import { memoryInterestsStore } from '../__testing__/renderWithServices';
import * as errors from '../services/reportError';
import { type InterestsSavedListener, InterestsProvider, useInterests } from './InterestsContext';
import type { InterestsStore } from './interestsStore';
import { useSaveInterests } from './useSaveInterests';

const PICKS = ['space', 'history', 'art'];

const wrapperFor = (store: InterestsStore, onPicksSaved?: InterestsSavedListener) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <InterestsProvider store={store} onSaved={onPicksSaved}>
        {children}
      </InterestsProvider>
    );
  };

async function renderSave(store: InterestsStore, onPicksSaved?: InterestsSavedListener) {
  const onSaved = jest.fn();
  const { result } = await renderHook(() => ({ save: useSaveInterests(onSaved, 'settings'), interests: useInterests().interests }), {
    wrapper: wrapperFor(store, onPicksSaved),
  });
  await waitFor(() => expect(result.current.interests).not.toBeUndefined());
  return { result, onSaved };
}

describe('useSaveInterests', () => {
  it('saves the picks, then moves on', async () => {
    const { result, onSaved } = await renderSave(memoryInterestsStore(['music', 'food', 'sport']));

    await act(() => result.current.save(PICKS));

    expect(result.current.interests).toEqual(PICKS);
    expect(onSaved).toHaveBeenCalled();
  });

  it('tells the user and stays put when saving fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const report = jest.spyOn(errors, 'reportError').mockImplementation(() => undefined);
    const broken: InterestsStore = { load: async () => ['music'], save: () => Promise.reject(new Error('disk')) };
    const { result, onSaved } = await renderSave(broken);

    await act(() => result.current.save(PICKS));

    expect(onSaved).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Couldn’t save your picks', 'Please try again.');
    expect(report).toHaveBeenCalledWith('interests.save', expect.any(Error));
  });

  it('ignores a second tap while the first save is still running', async () => {
    const store = memoryInterestsStore(['music', 'food', 'sport']);
    const save = jest.spyOn(store, 'save');
    const { result, onSaved } = await renderSave(store);

    await act(() => Promise.all([result.current.save(PICKS), result.current.save(PICKS)]));

    expect(save).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('tells the provider what changed and where it was saved from (SPEC.md §11 interests_saved)', async () => {
    const listener = jest.fn();
    const { result } = await renderSave(memoryInterestsStore(['music', 'food', 'sport']), listener);

    await act(() => result.current.save(PICKS));

    expect(listener).toHaveBeenCalledWith({ before: ['music', 'food', 'sport'], after: PICKS, from: 'settings' });
  });
});
