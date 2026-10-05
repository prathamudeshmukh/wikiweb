import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithServices } from '../__testing__/renderWithServices';
import { fakeWikiApi, idOf } from '../content/__testing__/fakeWikiApi';
import { memoryJourneySession } from '../journeys/__testing__/memoryJourneySession';
import { FindsScreen } from './FindsScreen';

const page = (title: string) => ({ pageId: idOf(title), title, tileId: 'animals', territory: 'life' as const, thumbnailUrl: null });

async function renderFinds() {
  const journeys = memoryJourneySession();
  const findActions = { tangent: jest.fn(), read: jest.fn() };
  const { services } = await renderWithServices(<FindsScreen onBack={jest.fn()} findActions={findActions} />, fakeWikiApi({}).api, journeys);
  return { finds: services.finds, journeys, findActions };
}

describe('FindsScreen', () => {
  it('says how to find things when there are none', async () => {
    await renderFinds();

    expect(screen.getByText(/Nothing found yet/)).toBeOnTheScreen();
  });

  it('captions each find with where it was made', async () => {
    const { finds, journeys } = await renderFinds();
    await act(() => finds.toggle(page('Gamelan'), 'card'));
    journeys.hop({ fromNodeId: null, page: page('Octopus'), via: 'swipe' });

    await act(() => finds.toggle(page('Squid'), 'card'));

    expect(screen.getByLabelText('Squid. FOUND ON · FROM OCTOPUS…')).toBeOnTheScreen();
    expect(screen.getByLabelText('Gamelan. FOUND ON HOME')).toBeOnTheScreen();
  });

  it('removes a find from its row, and undo brings it back', async () => {
    const { finds } = await renderFinds();
    await act(() => finds.toggle(page('Gamelan'), 'card'));

    await fireEvent.press(screen.getByRole('button', { name: 'Remove find' }));
    expect(screen.queryByLabelText(/Gamelan/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByLabelText('Gamelan. FOUND ON HOME')).toBeOnTheScreen();
  });

  it('reads a find from its sheet', async () => {
    const { finds, findActions } = await renderFinds();
    await act(() => finds.toggle(page('Gamelan'), 'card'));
    await fireEvent.press(screen.getByLabelText('Gamelan. FOUND ON HOME'));

    await fireEvent.press(screen.getByRole('button', { name: 'Read' }));

    expect(findActions.read).toHaveBeenCalledWith(expect.objectContaining({ title: 'Gamelan' }));
  });
});
