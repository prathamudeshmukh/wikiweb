import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithServices } from '../__testing__/renderWithServices';
import { fakeWikiApi, idOf } from '../content/__testing__/fakeWikiApi';
import { memoryJourneySession } from '../journeys/__testing__/memoryJourneySession';
import type { JourneySession } from '../journeys/journeySession';
import { LogbookScreen } from './LogbookScreen';

const nodePage = (title: string) => ({ pageId: idOf(title), title, tileId: null, territory: 'life' as const, thumbnailUrl: null });

async function renderLogbook(journeys: JourneySession = memoryJourneySession()) {
  const onOpenExpedition = jest.fn();
  const onBack = jest.fn();
  await renderWithServices(<LogbookScreen onBack={onBack} onOpenExpedition={onOpenExpedition} />, fakeWikiApi({}).api, journeys);
  return { onOpenExpedition, onBack };
}

describe('LogbookScreen', () => {
  it('invites a first expedition when there are none', async () => {
    await renderLogbook();

    expect(await screen.findByText(/No expeditions yet/)).toBeOnTheScreen();
    expect(screen.getByText('0 / 20')).toBeOnTheScreen();
  });

  it('lists expeditions with their tangent count and opens one', async () => {
    const journeys = memoryJourneySession();
    const octopus = journeys.hop({ fromNodeId: null, page: nodePage('Octopus'), via: 'swipe' });
    journeys.hop({ fromNodeId: octopus.id, page: nodePage('Squid'), via: 'swipe' });
    const { onOpenExpedition } = await renderLogbook(journeys);

    await fireEvent.press(await screen.findByText('From Octopus'));

    expect(screen.getByText(/2 TANGENTS/)).toBeOnTheScreen();
    expect(onOpenExpedition).toHaveBeenCalledWith(octopus.journeyId);
  });

  it('shows the stamps collected so far', async () => {
    const journeys = memoryJourneySession();
    journeys.markRead(nodePage('Euler'), { tileId: 'maths', territory: 'cosmos' });
    await renderLogbook(journeys);

    expect(await screen.findByText('1 / 20')).toBeOnTheScreen();
    expect(screen.getByLabelText('Maths stamp')).toBeOnTheScreen();
    expect(screen.getByLabelText('Space stamp, not collected yet')).toBeOnTheScreen();
  });

  it('offers a retry when the logbook can’t be read', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const journeys = memoryJourneySession();
    const logbook = journeys.logbook;
    journeys.logbook = jest.fn().mockRejectedValueOnce(new Error('disk')).mockImplementation(logbook);
    await renderLogbook(journeys);

    await fireEvent.press(await screen.findByRole('button', { name: 'Couldn’t load. Tap to retry.' }));

    expect(await screen.findByText(/No expeditions yet/)).toBeOnTheScreen();
  });

  it('goes back', async () => {
    const { onBack } = await renderLogbook();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalled();
  });
});
