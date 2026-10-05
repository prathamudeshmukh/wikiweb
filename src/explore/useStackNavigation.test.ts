import { act, renderHook } from '@testing-library/react-native';
import { makeArticle } from '../content/__testing__/fakeWikiApi';
import { memoryJourneySession } from '../journeys/__testing__/memoryJourneySession';
import { cardFromArticle } from '../tangent/TangentContext';
import { useStackNavigation } from './useStackNavigation';

const octopus = cardFromArticle(makeArticle('Octopus'));
const squid = cardFromArticle(makeArticle('Squid'));

async function renderNavigation() {
  const listener = { hopped: jest.fn(), returned: jest.fn(), resumed: jest.fn() };
  const { result } = await renderHook(() => useStackNavigation(memoryJourneySession(), listener));
  const hopTo = async (card: typeof octopus) => {
    await act(() => result.current.prepare(card));
    await act(() => result.current.land());
  };
  return { result, listener, hopTo };
}

describe('useStackNavigation — listener', () => {
  it('reports each landed hop with its card, the column it left and how', async () => {
    const { listener, hopTo } = await renderNavigation();

    await hopTo(octopus);

    expect(listener.hopped).toHaveBeenCalledWith({ card: octopus, from: expect.objectContaining({ id: 'home' }), route: 'swipe' });
  });

  it('reports a hop from the reader as a tangent', async () => {
    const { result, listener } = await renderNavigation();

    await act(() => result.current.prepareTangent({ card: octopus, fromNodeId: null }));
    await act(() => result.current.land());

    expect(listener.hopped).toHaveBeenCalledWith(expect.objectContaining({ route: 'tangent' }));
  });

  it('reports going back from a column, by the route taken', async () => {
    const { result, listener, hopTo } = await renderNavigation();
    await hopTo(octopus);

    await act(() => void result.current.back('system_back'));

    expect(listener.returned).toHaveBeenCalledWith({ from: expect.objectContaining({ seed: expect.objectContaining({ title: 'Octopus' }) }), route: 'system_back', columnsPopped: 1 });
  });

  it('reports a breadcrumb jump with how many columns it popped', async () => {
    const { result, listener, hopTo } = await renderNavigation();
    await hopTo(octopus);
    await hopTo(squid);

    await act(() => result.current.jump(0));

    expect(listener.returned).toHaveBeenCalledWith(expect.objectContaining({ route: 'crumb', columnsPopped: 2 }));
  });

  it('reports nothing for back or a jump that stays on Home', async () => {
    const { result, listener } = await renderNavigation();

    await act(() => {
      result.current.back('swipe');
      result.current.jump(0);
    });

    expect(listener.returned).not.toHaveBeenCalled();
  });

  it('reports reopening an expedition', async () => {
    const { result, listener } = await renderNavigation();

    await act(() => result.current.resume([]));

    expect(listener.resumed).toHaveBeenCalledTimes(1);
  });
});
