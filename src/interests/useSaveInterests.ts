import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { reportError } from '../services/reportError';
import { useInterests } from './InterestsContext';

/** Saves picked tiles, then calls `onSaved`; a failed save tells the user and leaves them where they are. */
export function useSaveInterests(onSaved: () => void): (tileIds: readonly string[]) => Promise<void> {
  const { saveInterests } = useInterests();
  // A ref, not state: a double tap lands before any re-render could disable the button.
  const saving = useRef(false);
  return useCallback(
    async (tileIds: readonly string[]) => {
      if (saving.current) return;
      saving.current = true;
      try {
        await saveInterests(tileIds);
      } catch (error) {
        reportError('interests.save', error);
        Alert.alert('Couldn’t save your picks', 'Please try again.');
        return;
      } finally {
        saving.current = false;
      }
      onSaved();
    },
    [saveInterests, onSaved],
  );
}
