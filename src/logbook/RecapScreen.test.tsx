import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithServices } from '../__testing__/renderWithServices';
import { fakeWikiApi, idOf } from '../content/__testing__/fakeWikiApi';
import type { Territory } from '../config/topicTiles';
import { memoryJourneySession } from '../journeys/__testing__/memoryJourneySession';
import { RecapScreen } from './RecapScreen';

const nodePage = (title: string, territory: Territory) => ({ pageId: idOf(title), title, tileId: null, territory, thumbnailUrl: null });

/** Octopus → Squid → (read Iron gall ink) → Magna Carta. */
function recordExpedition() {
  const journeys = memoryJourneySession();
  const octopus = journeys.hop({ fromNodeId: null, page: nodePage('Octopus', 'life'), via: 'swipe' });
  const squid = journeys.hop({ fromNodeId: octopus.id, page: nodePage('Squid', 'life'), via: 'swipe' });
  const ink = journeys.peekRead(squid.id, nodePage('Iron gall ink', 'cosmos'));
  journeys.markRead(nodePage('Iron gall ink', 'cosmos'), null);
  const magna = journeys.hop({ fromNodeId: ink?.id ?? null, page: nodePage('Magna Carta', 'past'), via: 'peek_explore' });
  return { journeys, octopus, squid, magna };
}

async function renderRecap(journeyId: string, journeys = memoryJourneySession()) {
  const onContinue = jest.fn();
  const { services } = await renderWithServices(<RecapScreen journeyId={journeyId} onBack={jest.fn()} onContinue={onContinue} />, fakeWikiApi({}).api, journeys);
  return { onContinue, finds: services.finds };
}

describe('RecapScreen', () => {
  it('tells the story of the expedition', async () => {
    const { journeys, octopus } = recordExpedition();
    await renderRecap(octopus.journeyId, journeys);

    expect(await screen.findByText('From Octopus\nto Magna Carta')).toBeOnTheScreen();
    expect(screen.getByLabelText('3 tangents · 1 read')).toBeOnTheScreen();
    expect(screen.getByText('Iron gall ink → Magna Carta')).toBeOnTheScreen();
  });

  it('counts the finds made on the expedition', async () => {
    const { journeys, octopus } = recordExpedition();
    const { finds } = await renderRecap(octopus.journeyId, journeys);
    await screen.findByText('From Octopus\nto Magna Carta');

    await act(() => finds.toggle(nodePage('Squid', 'life'), 'card'));
    await act(() => finds.toggle(nodePage('Magna Carta', 'past'), 'reader'));

    expect(screen.getByLabelText('3 tangents · 1 read · 2 finds')).toBeOnTheScreen();
  });

  it('continues the expedition from its latest node', async () => {
    const { journeys, octopus, magna } = recordExpedition();
    const { onContinue } = await renderRecap(octopus.journeyId, journeys);

    await fireEvent.press(await screen.findByRole('button', { name: 'Continue expedition' }));

    expect(onContinue).toHaveBeenCalledWith(octopus.journeyId, magna.id);
  });

  it('reopens any node on the route', async () => {
    const { journeys, octopus, squid } = recordExpedition();
    const { onContinue } = await renderRecap(octopus.journeyId, journeys);

    await fireEvent.press(await screen.findByRole('button', { name: 'Tangent: Squid' }));

    expect(onContinue).toHaveBeenCalledWith(octopus.journeyId, squid.id);
  });

  it('shows the retry state for an expedition that no longer exists', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await renderRecap('missing');

    expect(await screen.findByRole('button', { name: 'Couldn’t load. Tap to retry.' })).toBeOnTheScreen();
  });
});
