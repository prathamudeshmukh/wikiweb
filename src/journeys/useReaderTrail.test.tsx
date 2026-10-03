import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { fakeWikiApi, makeArticle } from '../content/__testing__/fakeWikiApi';
import { testServices } from '../__testing__/renderWithServices';
import { AppServicesProvider } from '../services/AppServices';
import { memoryJourneySession } from './__testing__/memoryJourneySession';
import type { JourneySession } from './journeySession';
import { useReaderTrail } from './useReaderTrail';

const MATHS = { tileId: 'maths', territory: 'cosmos' } as const;
const page = (title: string) => ({ pageId: makeArticle(title).pageId, title, tileId: null, territory: null, thumbnailUrl: null });

function setUp() {
  const journeys = memoryJourneySession();
  const octopus = journeys.hop({ fromNodeId: null, page: page('Octopus'), via: 'swipe' });
  journeys.focus(octopus.id);
  const services = testServices(fakeWikiApi({}).api, journeys);
  const wrapper = ({ children }: { children: ReactNode }) => <AppServicesProvider services={services}>{children}</AppServicesProvider>;
  return { journeys, octopus, wrapper, analytics: services.analytics };
}

const renderTrail = (journeys: JourneySession, wrapper: ({ children }: { children: ReactNode }) => ReactNode, title = 'Euler') =>
  renderHook(() => useReaderTrail({ page: { title, pageId: makeArticle(title).pageId }, knownTopic: MATHS }), { wrapper });

describe('useReaderTrail', () => {
  it('marks the opened article read and stamps its topic', async () => {
    const { journeys, wrapper } = setUp();

    await renderTrail(journeys, wrapper);

    expect(journeys.getState().readIds.has(makeArticle('Euler').pageId)).toBe(true);
    expect(journeys.getState().stampTileIds.has('maths')).toBe(true);
  });

  it('adds articles read from a peek card under the column the reader opened over', async () => {
    const { journeys, octopus, wrapper } = setUp();
    const { result } = await renderTrail(journeys, wrapper);

    await act(async () => result.current.readInPlace(makeArticle('Ink')));

    const added = journeys.getState().active?.nodes.at(-1);
    expect(added).toMatchObject({ title: 'Ink', via: 'peek_read', parentNodeId: octopus.id });
  });

  it('reports an article read from a peek card by its title only', async () => {
    const { journeys, wrapper, analytics } = setUp();
    const { result } = await renderTrail(journeys, wrapper);

    await act(async () => result.current.readInPlace(makeArticle('Ink')));

    expect(analytics.named('read_open')).toEqual([{ entry: 'peek_read', card_title: 'Ink' }]);
  });

  it('sends a tangent from wherever the reader has got to', async () => {
    const { journeys, octopus, wrapper } = setUp();
    const { result } = await renderTrail(journeys, wrapper);

    expect(result.current.tangentOrigin()).toBe(octopus.id);
    await act(async () => result.current.readInPlace(makeArticle('Ink')));

    expect(result.current.tangentOrigin()).toBe(journeys.getState().active?.nodes.at(-1)?.id);
  });

  it('records nothing for a reader without an article', async () => {
    const { journeys, wrapper } = setUp();

    await renderHook(() => useReaderTrail(null), { wrapper });

    expect(journeys.getState().readIds.size).toBe(0);
  });
});
