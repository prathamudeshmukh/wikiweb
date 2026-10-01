import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { InterestsStore } from '../interests/interestsStore';
import { AppServicesProvider } from '../services/AppServices';
import type { WikiApi } from '../wiki-api/types';

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

export function memoryInterestsStore(initial: string[] | null = null): InterestsStore {
  let saved = initial;
  return {
    load: async () => saved,
    save: async (ids) => {
      saved = [...ids];
    },
  };
}

/** Renders UI inside the same providers the app uses, with a fake Wikipedia API. */
export function renderWithServices(ui: ReactElement, api: WikiApi) {
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <AppServicesProvider services={{ api, interests: memoryInterestsStore() }}>{ui}</AppServicesProvider>
    </SafeAreaProvider>,
  );
}

const PHONE_LIST_HEIGHT = 700;

/** Jest has no layout engine; give every column's list a phone-sized height so its cards render. */
export async function layOutColumns() {
  for (const area of screen.getAllByTestId('column-list-area')) {
    await fireEvent(area, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: PHONE_LIST_HEIGHT } } });
  }
}
