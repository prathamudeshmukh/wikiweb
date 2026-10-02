import { useCallback } from 'react';
import { Alert } from 'react-native';
import { reportError } from '../services/reportError';
import { useInterests } from './InterestsContext';

/** Saves picked tiles, then calls `onSaved`; a failed save tells the user and leaves them where they are. */
export function useSaveInterests(onSaved: () => void): (tileIds: readonly string[]) => Promise<void> {
  const { saveInterests } = useInterests();
  return useCallback(
    async (tileIds: readonly string[]) => {
      try {
        await saveInterests(tileIds);
      } catch (error) {
        reportError('interests.save', error);
        Alert.alert('Couldn’t save your picks', 'Please try again.');
        return;
      }
      onSaved();
    },
    [saveInterests, onSaved],
  );
}
