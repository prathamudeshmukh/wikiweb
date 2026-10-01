import { screen } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import { layOutColumns, renderWithServices } from '../__testing__/renderWithServices';
import { fakeWikiApi, idOf } from '../content/__testing__/fakeWikiApi';
import type { ColumnEntry } from './columnStack';
import { ColumnView } from './ColumnView';
import type { HopController } from './hopController';

const octopus = { pageId: idOf('Octopus'), title: 'Octopus' };
const entry: ColumnEntry = {
  id: String(octopus.pageId),
  seed: octopus,
  seedTopic: { tileId: 'animals', territory: 'life' },
  seedThumbnailUrl: null,
  path: [octopus],
};

const hop: HopController = {
  progress: makeMutable(0),
  from: makeMutable({ x: 0, y: 0, width: 0, height: 0 }),
  tiltDeg: makeMutable(0),
  prepare: jest.fn(),
  committed: jest.fn(),
  landed: jest.fn(),
};

function renderColumn(entryProgress: ReturnType<typeof makeMutable<number>> | null = null) {
  const { api } = fakeWikiApi({ links: ['Squid', 'Cuttlefish', 'Ink'] });
  return renderWithServices(
    <ColumnView entry={entry} interests={['space']} isTop entryProgress={entryProgress} candidateCardId={null} pulse={null} hop={hop} onOpen={jest.fn()} onBack={jest.fn()} onJump={jest.fn()} />,
    api,
  );
}

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
});
