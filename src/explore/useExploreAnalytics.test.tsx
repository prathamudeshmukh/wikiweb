import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { makeCard, makeEntry } from '../analytics/__testing__/analyticsFactories';
import { createStopwatch } from '../analytics/stopwatch';
import { fakeWikiApi } from '../content/__testing__/fakeWikiApi';
import { testServices } from '../__testing__/renderWithServices';
import { HintsProvider, useHints } from '../hints/HintsContext';
import { AppServicesProvider } from '../services/AppServices';
import type { FeedStatus } from '../feeds/useFeed';
import { useColumnVisit, useNavigationAnalytics } from './useExploreAnalytics';

const HOME = makeEntry();
const OCTOPUS = makeEntry('Octopus');

async function renderListener() {
  let clock = 0;
  const homeTime = createStopwatch(() => clock);
  const services = testServices(fakeWikiApi({}).api);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppServicesProvider services={services}>
      <HintsProvider store={services.hints} journeys={services.journeys}>
        {children}
      </HintsProvider>
    </AppServicesProvider>
  );
  const { result } = await renderHook(() => ({ listener: useNavigationAnalytics(homeTime), hints: useHints() }), { wrapper });
  await waitFor(() => expect(result.current.hints.progress).toBeDefined());
  const spendOnHome = (ms: number) => {
    homeTime.start();
    clock += ms;
    homeTime.stop();
  };
  return { result, analytics: services.analytics, visits: services.columnVisits, spendOnHome };
}

describe('useNavigationAnalytics', () => {
  it('reports a swipe hop with where the card sat, ending the column’s visit', async () => {
    const { result, analytics, visits } = await renderListener();
    visits.enter(HOME, 'idle');
    visits.cardSeen(HOME.id, makeCard('Squid'), 2);

    await act(() => result.current.listener.hopped({ card: makeCard('Squid'), from: HOME, route: 'swipe' }));

    expect(analytics.named('hop')).toEqual([expect.objectContaining({ route: 'swipe', card_title: 'Squid', seed_title: null, position: 2 })]);
    expect(analytics.named('column_left')).toEqual([expect.objectContaining({ outcome: 'hop' })]);
  });

  it('reports the first hop once, with the peels seen and time spent on Home', async () => {
    const { result, analytics, spendOnHome } = await renderListener();
    spendOnHome(41_000);

    await act(() => {
      result.current.hints.peeled();
      result.current.hints.peeled();
      result.current.listener.hopped({ card: makeCard('Squid'), from: HOME, route: 'tangent' });
      result.current.listener.hopped({ card: makeCard('Ink'), from: OCTOPUS, route: 'swipe' });
    });

    expect(analytics.named('first_hop')).toEqual([{ route: 'tangent', peels_seen: 2, seconds_on_home: 41 }]);
  });

  it('gives a tangent no position, since its card was never in the column', async () => {
    const { result, analytics, visits } = await renderListener();
    visits.enter(OCTOPUS, 'idle');
    visits.cardSeen(OCTOPUS.id, makeCard('Squid'), 2);

    await act(() => result.current.listener.hopped({ card: makeCard('Squid'), from: OCTOPUS, route: 'tangent' }));

    expect(analytics.named('hop')[0].position).toBeNull();
  });

  it('reports returns, and the first one once', async () => {
    const { result, analytics } = await renderListener();

    await act(() => {
      result.current.listener.returned({ from: OCTOPUS, route: 'swipe', columnsPopped: 1 });
      result.current.listener.returned({ from: OCTOPUS, route: 'system_back', columnsPopped: 1 });
    });

    expect(analytics.named('return').map((ret) => ret.route)).toEqual(['swipe', 'system_back']);
    expect(analytics.named('first_return')).toEqual([{ route: 'swipe' }]);
  });

  it('ends the current visit when an expedition is resumed', async () => {
    const { result, analytics, visits } = await renderListener();
    visits.enter(HOME, 'idle');

    await act(() => result.current.listener.resumed());

    expect(analytics.named('column_left')).toEqual([expect.objectContaining({ outcome: 'resume', seed_title: null })]);
  });
});

describe('useColumnVisit', () => {
  const squidInView = [{ item: makeCard('Squid'), key: 'squid', index: 0, isViewable: true }];

  async function renderVisit(initial: { isTop: boolean; status: FeedStatus }) {
    const services = testServices(fakeWikiApi({}).api);
    const wrapper = ({ children }: { children: ReactNode }) => <AppServicesProvider services={services}>{children}</AppServicesProvider>;
    const dwelling = () => squidInView;
    const rendered = await renderHook((props: { isTop: boolean; status: FeedStatus }) => useColumnVisit({ entry: OCTOPUS, dwelling, ...props }), {
      wrapper,
      initialProps: initial,
    });
    return { ...rendered, analytics: services.analytics, visits: services.columnVisits };
  }

  it('counts cards dwelt on before the column came on top as seen once it does', async () => {
    const { rerender, analytics } = await renderVisit({ isTop: false, status: 'idle' });

    await rerender({ isTop: true, status: 'idle' });

    expect(analytics.named('card_seen')).toEqual([expect.objectContaining({ card_title: 'Squid', seed_title: 'Octopus', position: 0 })]);
  });

  it('remembers a feed that ended before the column came on top', async () => {
    const { rerender, visits, analytics } = await renderVisit({ isTop: false, status: 'done' });
    await rerender({ isTop: true, status: 'done' });

    visits.leave('swipe');

    expect(analytics.named('column_left')[0].feed_end).toBe('dead_end');
  });

  it('starts no visit for a column that is not on top', async () => {
    const { analytics } = await renderVisit({ isTop: false, status: 'idle' });

    expect(analytics.events()).toEqual([]);
  });
});
