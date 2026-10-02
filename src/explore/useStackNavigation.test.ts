import { act, renderHook } from '@testing-library/react-native';
import { makeArticle } from '../content/__testing__/fakeWikiApi';
import { memoryJourneySession } from '../journeys/__testing__/memoryJourneySession';
import { cardFromArticle } from '../tangent/TangentContext';
import { useStackNavigation } from './useStackNavigation';

const octopus = cardFromArticle(makeArticle('Octopus'));
const squid = cardFromArticle(makeArticle('Squid'));

async function renderNavigation() {
  const milestones = { hopped: jest.fn(), returned: jest.fn() };
  const { result } = await renderHook(() => useStackNavigation(memoryJourneySession(), milestones));
  const hopTo = async (card: typeof octopus) => {
    await act(() => result.current.prepare(card));
    await act(() => result.current.land());
  };
  return { result, milestones, hopTo };
}

describe('useStackNavigation — hint milestones', () => {
  it('reports each landed hop', async () => {
    const { milestones, hopTo } = await renderNavigation();

    await hopTo(octopus);

    expect(milestones.hopped).toHaveBeenCalledTimes(1);
  });

  it('reports going back from a column', async () => {
    const { result, milestones, hopTo } = await renderNavigation();
    await hopTo(octopus);

    await act(() => void result.current.back());

    expect(milestones.returned).toHaveBeenCalledTimes(1);
  });

  it('reports a breadcrumb jump down the route', async () => {
    const { result, milestones, hopTo } = await renderNavigation();
    await hopTo(octopus);
    await hopTo(squid);

    await act(() => result.current.jump(0));

    expect(milestones.returned).toHaveBeenCalledTimes(1);
  });

  it('reports nothing for back or a jump that stays on Home', async () => {
    const { result, milestones } = await renderNavigation();

    await act(() => {
      result.current.back();
      result.current.jump(0);
    });

    expect(milestones.returned).not.toHaveBeenCalled();
  });
});
