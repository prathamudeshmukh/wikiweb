import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import type { RefreshControlProps } from 'react-native';
import { getAnimatedStyle, makeMutable } from 'react-native-reanimated';
import { HINT } from '../config/constants';
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
  seedQuote: 'It has three hearts.',
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

function columnView(column: ColumnEntry, entryProgress: ReturnType<typeof makeMutable<number>> | null = null, isScreenFocused = true) {
  return (
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
      isScreenFocused={isScreenFocused}
      niche={{ addPicks: jest.fn(async () => undefined), openTree: jest.fn() }}
    />
  );
}

function renderColumn(entryProgress: ReturnType<typeof makeMutable<number>> | null = null, journeys: JourneySession = memoryJourneySession(), column = entry) {
  const { api } = fakeWikiApi({ links: ['Squid', 'Cuttlefish', 'Ink'], searches: { [FEATURED_SPACE]: Array.from({ length: 60 }, (_, i) => `Space ${i + 1}`) } });
  return renderWithServices(columnView(column, entryProgress), api, journeys);
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

  it('sets a course with the compass card while the first cards load', async () => {
    const { api } = fakeWikiApi({ links: ['Squid'] });
    const held = Promise.withResolvers<void>();
    const hydrate = api.hydrate.bind(api);
    await renderWithServices(columnView(entry), { ...api, hydrate: (titles) => held.promise.then(() => hydrate(titles)) });
    await layOutColumns();
    expect(screen.getByLabelText('Setting a course')).toBeOnTheScreen();

    await act(async () => held.resolve());

    expect(await screen.findByText('Squid')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Setting a course')).toBeNull();
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

describe('ColumnView — first-hop hints', () => {
  const HIDDEN = { includeHiddenElements: true };
  const SWIPE_CHIP = '← SWIPE LEFT TO TAKE A TANGENT';
  const BACK_CHIP = 'SWIPE RIGHT TO GO BACK →';
  const cardNamed = (title: string) => screen.getByTestId(`card-${idOf(title)}`);
  const settleOn = (index: number) => {
    const list = screen.getByTestId('column-list');
    const [interval] = list.props.snapToOffsets ?? [list.props.snapToInterval];
    return fireEvent(list, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 0, y: interval * index } } });
  };

  it('marks the first Home card with the swipe hint for a new user', async () => {
    await renderColumn(null, memoryJourneySession(), HOME);
    await layOutColumns();
    await screen.findByText('Space 1');

    await waitFor(() => expect(within(cardNamed('Space 1')).getByText(SWIPE_CHIP, HIDDEN)).toBeTruthy());
    expect(screen.getAllByText(SWIPE_CHIP, HIDDEN)).toHaveLength(1);
  });

  it('moves the swipe hint to whichever Home card is in focus', async () => {
    await renderColumn(null, memoryJourneySession(), HOME);
    await layOutColumns();
    await screen.findByText('Space 1');
    await waitFor(() => expect(screen.getByText(SWIPE_CHIP, HIDDEN)).toBeTruthy());

    await settleOn(1);

    expect(within(cardNamed('Space 2')).getByText(SWIPE_CHIP, HIDDEN)).toBeTruthy();
    expect(screen.getAllByText(SWIPE_CHIP, HIDDEN)).toHaveLength(1);
  });

  it('keeps the hint away from screen readers', async () => {
    await renderColumn(null, memoryJourneySession(), HOME);
    await layOutColumns();
    await screen.findByText('Space 1');

    await waitFor(() => expect(screen.getByText(SWIPE_CHIP, HIDDEN)).toBeTruthy());
    expect(screen.queryByText(SWIPE_CHIP)).toBeNull();
  });

  it('marks the first card of a column with the back hint', async () => {
    await renderColumn();
    await layOutColumns();
    await screen.findByText('Squid');

    await waitFor(() => expect(within(cardNamed('Squid')).getByText(BACK_CHIP, HIDDEN)).toBeTruthy());
    expect(screen.getAllByText(BACK_CHIP, HIDDEN)).toHaveLength(1);
  });

  it('shows no hints to someone who has explored before', async () => {
    const journeys = memoryJourneySession();
    journeys.hop({ fromNodeId: null, page: nodePage('Octopus'), via: 'swipe' });

    await renderColumn(null, journeys, HOME);
    await layOutColumns();
    await screen.findByText('Space 1');
    await act(() => journeys.whenSaved());

    expect(screen.queryByText(SWIPE_CHIP, HIDDEN)).toBeNull();
  });

  describe('peel', () => {
    const SPRING_SETTLED_MS = 3000;
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const offsetOf = (title: string) => {
      const style = getAnimatedStyle(within(cardNamed(title)).getByRole('button')) as { transform?: { translateX?: number }[] };
      return style.transform?.[0]?.translateX ?? 0;
    };

    it('peels the focused Home card shortly after Home appears, then settles back', async () => {
      await renderColumn(null, memoryJourneySession(), HOME);
      await layOutColumns();
      await screen.findByText('Space 1');
      await waitFor(() => expect(screen.getByText(SWIPE_CHIP, HIDDEN)).toBeTruthy());

      await act(() => jest.advanceTimersByTime(HINT.firstPeelDelayMs));
      await act(() => jest.advanceTimersByTime(HINT.peelOutMs));
      expect(offsetOf('Space 1')).toBeLessThan(-HINT.peelDistance / 2);

      // Well under the next idle peel, so only the spring back is still running.
      await act(() => jest.advanceTimersByTime(HINT.peelHoldMs));
      await act(() => jest.advanceTimersByTime(SPRING_SETTLED_MS));
      expect(Math.abs(offsetOf('Space 1'))).toBeLessThan(1);
    });

    async function openHome(isScreenFocused = true) {
      const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: Array.from({ length: 60 }, (_, i) => `Space ${i + 1}`) } });
      await renderWithServices(columnView(HOME, null, isScreenFocused), api);
      await layOutColumns();
      await screen.findByText('Space 1');
      await waitFor(() => expect(screen.getByText(SWIPE_CHIP, HIDDEN)).toBeTruthy());
    }
    const peelOnce = async (delayMs: number) => {
      await act(() => jest.advanceTimersByTime(delayMs));
      await act(() => jest.advanceTimersByTime(HINT.peelOutMs));
    };

    it('leaves a card that comes into focus still until the next peel', async () => {
      await openHome();
      await peelOnce(HINT.firstPeelDelayMs);

      await settleOn(1);
      await act(() => jest.advanceTimersByTime(HINT.peelOutMs));

      expect(offsetOf('Space 2')).toBe(0);
    });

    it('stays still while the reader or Logbook is over Home', async () => {
      await openHome(false);

      await peelOnce(HINT.firstPeelDelayMs);

      expect(offsetOf('Space 1')).toBe(0);
    });

    it('stays still while a finger is on Home', async () => {
      await openHome();

      await fireEvent(screen.getByTestId('column-list-area'), 'touchStart');
      await peelOnce(HINT.firstPeelDelayMs + HINT.idleMs);

      expect(offsetOf('Space 1')).toBe(0);
    });
  });
});
