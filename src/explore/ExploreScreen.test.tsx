import { fireEvent, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import type { ComponentProps } from 'react';
import { layOutColumns, renderWithServices } from '../__testing__/renderWithServices';
import { fakeWikiApi, idOf } from '../content/__testing__/fakeWikiApi';
import type { WikiApi } from '../wiki-api/types';
import { memoryJourneySession } from '../journeys/__testing__/memoryJourneySession';
import type { JourneySession } from '../journeys/journeySession';
import { ExploreScreen } from './ExploreScreen';

const FEATURED_SPACE = 'articletopic:space incategory:Featured_articles';
const titles = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);
const nodePage = (title: string) => ({ pageId: idOf(title), title, tileId: null, territory: null, thumbnailUrl: null });

type Props = ComponentProps<typeof ExploreScreen>;

function exploreProps(overrides: Partial<Props> = {}): Props {
  return {
    interests: ['space'],
    onOpenArticle: jest.fn(),
    onOpenLogbook: jest.fn(),
    isFocused: true,
    incomingTangent: null,
    onTangentStarted: jest.fn(),
    incomingResume: null,
    onResumed: jest.fn(),
    ...overrides,
  };
}

function renderExplore(api: WikiApi, overrides: Partial<Props> = {}, journeys: JourneySession = memoryJourneySession()) {
  return renderWithServices(<ExploreScreen {...exploreProps(overrides)} />, api, journeys);
}

describe('ExploreScreen', () => {
  it('opens on Home with cards from the user’s interests', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: titles('Space', 30) } });

    await renderExplore(api);
    await layOutColumns();

    expect(await screen.findByText('Space 1')).toBeOnTheScreen();
    expect(screen.getByText('tangent')).toBeOnTheScreen();
    expect(screen.getAllByText('★ YOU LIKE SPACE').length).toBeGreaterThan(0);
  });

  it('shows a retry card when Home fails to load, and recovers', async () => {
    const { api, state } = fakeWikiApi({ searches: { [FEATURED_SPACE]: titles('Space', 30) } });
    state.failNextHydrate = true;

    await renderExplore(api);
    await layOutColumns();
    await fireEvent.press(await screen.findByRole('button', { name: 'Couldn’t load. Tap to retry.' }));

    expect(await screen.findByText('Space 1')).toBeOnTheScreen();
  });

  it('opens the Logbook from Home', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: titles('Space', 30) } });
    const onOpenLogbook = jest.fn();

    await renderExplore(api, { onOpenLogbook });
    await fireEvent.press(screen.getByRole('button', { name: 'Logbook' }));

    expect(onOpenLogbook).toHaveBeenCalled();
  });

  it('reopens a resumed expedition’s columns and stands at its latest node', async () => {
    const { api } = fakeWikiApi({ links: ['Cuttlefish'] });
    const journeys = memoryJourneySession();
    const octopus = journeys.hop({ fromNodeId: null, page: nodePage('Octopus'), via: 'swipe' });
    const squid = journeys.hop({ fromNodeId: octopus.id, page: nodePage('Squid'), via: 'swipe' });
    const onResumed = jest.fn();

    await renderExplore(api, { incomingResume: [octopus, squid], onResumed }, journeys);

    expect(screen.getByText('SQUID')).toBeOnTheScreen();
    expect(onResumed).toHaveBeenCalled();
    expect(journeys.focusedNodeId()).toBe(squid.id);
  });

  it('ends the expedition when the user is back on Home', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: titles('Space', 30) } });
    const journeys = memoryJourneySession();
    journeys.hop({ fromNodeId: null, page: nodePage('Octopus'), via: 'swipe' });

    await renderExplore(api, {}, journeys);

    expect(journeys.getState().active).toBeNull();
  });

  it('opens a fresh Home, without the cards already seen, after an expedition', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: titles('Space', 60) }, links: ['Cuttlefish'] });
    const journeys = memoryJourneySession();
    const octopus = journeys.hop({ fromNodeId: null, page: nodePage('Octopus'), via: 'swipe' });
    const { rerender } = await renderExplore(api, {}, journeys);
    await layOutColumns();
    expect(await screen.findByText('Space 1')).toBeOnTheScreen();
    await rerender(<ExploreScreen {...exploreProps({ incomingResume: [octopus] })} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back to HOME' }));

    expect(await screen.findByText('Space 21')).toBeOnTheScreen();
    expect(screen.queryByText('Space 1')).toBeNull();
  });

  it('leaves Android back to the screen on top while it isn’t focused', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: titles('Space', 30) } });
    const listen = jest.spyOn(BackHandler, 'addEventListener');

    await renderExplore(api, { isFocused: false });

    expect(listen).not.toHaveBeenCalledWith('hardwareBackPress', expect.anything());
  });

  it('reports a breadcrumb return with the column it left, ending that column’s visit', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: titles('Space', 30) }, links: ['Cuttlefish'] });
    const journeys = memoryJourneySession();
    const octopus = journeys.hop({ fromNodeId: null, page: nodePage('Octopus'), via: 'swipe' });
    const squid = journeys.hop({ fromNodeId: octopus.id, page: nodePage('Squid'), via: 'swipe' });
    const { services, rerender } = await renderExplore(api, {}, journeys);
    await rerender(<ExploreScreen {...exploreProps({ incomingResume: [octopus, squid] })} />);

    // Each column draws its own breadcrumb; the top column's is the last.
    await fireEvent.press(screen.getAllByRole('button', { name: 'Back to HOME' }).at(-1)!);

    expect(services.analytics.named('return')).toEqual([{ route: 'crumb', columns_popped: 2, seed_title: 'Squid', depth: 2 }]);
    expect(services.analytics.named('column_left').map((left) => left.outcome)).toEqual(['resume', 'crumb']);
  });
});
