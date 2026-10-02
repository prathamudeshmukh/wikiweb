import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { memoryInterestsStore } from '../__testing__/renderWithServices';
import { InterestsProvider } from './InterestsContext';
import type { InterestsStore } from './interestsStore';
import { RequireInterests } from './RequireInterests';

jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return { Redirect: ({ href }: { href: string }) => <MockText>{`redirect ${href}`}</MockText> };
});

async function renderGate(store: InterestsStore) {
  await render(
    <InterestsProvider store={store}>
      <RequireInterests>{(interests) => <Text>{interests.join(',')}</Text>}</RequireInterests>
    </InterestsProvider>,
  );
}

describe('RequireInterests', () => {
  it('renders nothing until interests have loaded', async () => {
    const pending: InterestsStore = { load: () => new Promise(() => undefined), save: async () => undefined };

    await renderGate(pending);

    expect(screen.toJSON()).toBeNull();
  });

  it('hands loaded interests to its children', async () => {
    await renderGate(memoryInterestsStore(['space', 'art']));

    expect(await screen.findByText('space,art')).toBeOnTheScreen();
  });

  it('sends a user without interests to onboarding', async () => {
    await renderGate(memoryInterestsStore());

    await waitFor(() => expect(screen.getByText('redirect /onboarding')).toBeOnTheScreen());
  });
});
