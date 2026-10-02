import { act, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import type { RefreshControlProps } from 'react-native';
import { makeMutable } from 'react-native-reanimated';
import { layOutColumns, renderWithServices } from '../__testing__/renderWithServices';
import { fakeWikiApi, idOf } from '../content/__testing__/fakeWikiApi';
import { memoryJourneySession } from '../journeys/__testing__/memoryJourneySession';
import type { JourneySession } from '../journeys/journeySession';
import { type ColumnEntry, initialStack } from './columnStack';
import { ColumnView } from './ColumnView';
import type { HopController } from './hopController';

const octopus = { pageId: idOf('Octopus'), title: 'Octopus' };
const entry: ColumnEntry = {
  id: String(octopus.pageId),
  seed: octopus,
  seedTopic: { tileId: 'animals', territory: 'life' },
  seedThumbnailUrl: null,
  path: [octopus],
  nodeId: null,
};

const hop: HopController = {
  progress: makeMutable(0),
  from: makeMutable({ x: 0, y: 0, width: 0, height: 0 }),
  tiltDeg: makeMutable(0),
  prepare: jest.fn(),
  committed: jest.fn(),
  landed: jest.fn(),
};

const FEATURED_SPACE = 'articletopic:space incategory:Featured_articles';
const HOME = initialStack().columns[0];

function renderColumn(entryProgress: ReturnType<typeof makeMutable<number>> | null = null, journeys: JourneySession = memoryJourneySession(), column = entry) {
  const { api } = fakeWikiApi({ links: ['Squid', 'Cuttlefish', 'Ink'], searches: { [FEATURED_SPACE]: Array.from({ length: 60 }, (_, i) => `Space ${i + 1}`) } });
  return renderWithServices(
    <ColumnView
      entry={column}
      interests={['space']}
      isTop
      entryProgress={entryProgress}
      candidateCardId={null}
      pulse={null}
      hop={hop}
      onOpen={jest.fn()}
      onBack={jest.fn()}
      onJump={jest.fn()}
      onOpenLogbook={jest.fn()}
    />,
    api,
    journeys,
  );
}

// Jest's ScrollView never mounts its refresh control, so reach it through the list it was handed to.
const refreshControl = () => screen.getByTestId('column-list').props.refreshControl as ReactElement<RefreshControlProps> | undefined;
const pullToRefresh = () => refreshControl()?.props.onRefresh?.();

const nodePage = (title: string) => ({ pageId: idOf(title), title, tileId: null, territory: null, thumbnailUrl: null });

describe('ColumnView', () => {
  it('shows the route, the seed it explores from, and its linked cards', async () => {
    await renderColumn();
    await layOutColumns();

    expect(await screen.findByText('Squid')).toBeOnTheScreen();
    expect(screen.getByText('OCTOPUS')).toBeOnTheScreen();
    expect(screen.getByLabelText('Exploring from Octopus')).toBeOnTheScreen();
    expect(screen.getAllByText('↳ LINKED FROM OCTOPUS').length).toBeGreaterThan(0);
  });

  it('leaves the seed header to the hop overlay while flying in', async () => {
    await renderColumn(makeMutable(0.5));
    await layOutColumns();

    expect(await screen.findByText('Squid')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Exploring from Octopus')).toBeNull();
  });

  it('tells the user when the column has nothing more', async () => {
    await renderColumn();
    await layOutColumns();

    expect(await screen.findByText('DEAD END — SWIPE RIGHT TO GO BACK')).toBeOnTheScreen();
  });

  it('badges cards already visited on this expedition, or read', async () => {
    const journeys = memoryJourneySession();
    journeys.hop({ fromNodeId: null, page: nodePage('Squid'), via: 'swipe' });
    journeys.markRead(nodePage('Cuttlefish'), null);

    await renderColumn(null, journeys);
    await layOutColumns();

    expect(await screen.findByLabelText('visited on this expedition')).toBeOnTheScreen();
    expect(screen.getByLabelText('read')).toBeOnTheScreen();
  });

  it('shows no badges on a fresh column', async () => {
    await renderColumn();
    await layOutColumns();
    await screen.findByText('Squid');

    expect(screen.queryByText('◌')).toBeNull();
    expect(screen.queryByText('✓')).toBeNull();
  });

  it('lets Home be pulled down for a fresh set of cards', async () => {
    await renderColumn(null, memoryJourneySession(), HOME);
    await layOutColumns();
    expect(await screen.findByText('Space 1')).toBeOnTheScreen();

    await act(() => pullToRefresh());

    expect(await screen.findByText('Space 21')).toBeOnTheScreen();
    expect(screen.queryByText('Space 1')).toBeNull();
  });

  it('has no pull-to-refresh on an explored column', async () => {
    await renderColumn();
    await layOutColumns();
    await screen.findByText('Squid');

    expect(refreshControl()).toBeUndefined();
  });
});
