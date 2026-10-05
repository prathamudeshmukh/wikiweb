import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { testServices } from '../__testing__/renderWithServices';
import { fakeWikiApi } from '../content/__testing__/fakeWikiApi';
import { NICHE } from '../config/constants';
import { AppServicesProvider } from '../services/AppServices';
import { type NicheActions, useHomeNudge } from './useHomeNudge';

const PHILOSOPHY = { tileId: 'philosophy', territory: 'mind' as const };

async function setup({ reads = 3, cardCount = 10 } = {}) {
  const services = testServices(fakeWikiApi({}).api);
  for (let i = 0; i < reads; i += 1) await services.nudges.articleRead(PHILOSOPHY);
  const niche: NicheActions = { addPicks: jest.fn(async () => undefined), openTree: jest.fn() };
  const wrapper = ({ children }: { children: ReactNode }) => <AppServicesProvider services={services}>{children}</AppServicesProvider>;
  const hook = await renderHook((props: { generation: number; cardCount: number }) => useHomeNudge({ interests: ['philosophy', 'space', 'art'], niche, ...props }), {
    wrapper,
    initialProps: { generation: 0, cardCount },
  });
  return { ...hook, services, niche };
}

describe('useHomeNudge', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('places a due prompt a few cards into a fresh Home', async () => {
    const { result } = await setup();

    expect(result.current.nudge).toEqual({ kind: 'prompt', tileId: 'philosophy', reads: 3 });
    expect(result.current.index).toBe(NICHE.minIndex);
  });

  it('has nothing to place when no nudge is due', async () => {
    const { result } = await setup({ reads: 0 });

    expect(result.current.nudge).toBeNull();
  });

  it('reports the prompt shown once it dwells', async () => {
    const { result, services } = await setup();

    await act(() => result.current.onVisible(true));

    expect(services.analytics.named('niche_prompt_shown')).toEqual([{ tile: 'philosophy' }]);
  });

  it('takes the card out when it is swiped away', async () => {
    const { result, services } = await setup();
    await act(() => result.current.onVisible(true));

    await act(() => result.current.onDismiss());

    expect(result.current.index).toBeNull();
    expect(services.analytics.named('niche_prompt_dismissed')).toEqual([{ tile: 'philosophy', how: 'swipe' }]);
  });

  it('counts scrolling past as dismissed but leaves the card in place, so the list never jumps', async () => {
    const { result, services } = await setup();
    await act(() => result.current.onVisible(true));

    await act(() => result.current.onVisible(false));

    expect(result.current.index).toBe(NICHE.minIndex);
    expect(services.analytics.named('niche_prompt_dismissed')).toEqual([{ tile: 'philosophy', how: 'scrolled_past' }]);
  });

  it('adds every chip tapped, once taps settle', async () => {
    const { result, niche } = await setup();
    const [ethics, logic] = result.current.chips;

    await act(() => result.current.onChip(ethics));
    await act(() => result.current.onChip(logic));
    expect(niche.addPicks).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(NICHE.chipSettleMs));

    expect(niche.addPicks).toHaveBeenCalledTimes(1);
    expect(niche.addPicks).toHaveBeenCalledWith(['space', 'art', 'philosophy/ethics', 'philosophy/logic'], 'prompt');
  });

  it('names what was added in a toast', async () => {
    const { result } = await setup();

    await act(() => result.current.onChip(result.current.chips[0]));
    await act(() => jest.advanceTimersByTime(NICHE.chipSettleMs));

    expect(result.current.toast).toBe('Added Ethics · Home is rebuilding');
  });

  it('adds nothing when a chip is tapped twice before settling', async () => {
    const { result, niche } = await setup();
    const [ethics] = result.current.chips;

    await act(() => result.current.onChip(ethics));
    await act(() => result.current.onChip(ethics));
    await act(() => jest.advanceTimersByTime(NICHE.chipSettleMs));

    expect(niche.addPicks).not.toHaveBeenCalled();
  });

  it('opens the tile tree from the card', async () => {
    const { result, niche } = await setup();

    await act(() => result.current.onOpenTree());

    expect(niche.openTree).toHaveBeenCalledWith({ tileId: 'philosophy' }, 'prompt');
  });

  it('places an exhaustion found mid-scroll after the cards already loaded', async () => {
    const { result, services } = await setup({ reads: 0, cardCount: 12 });

    await act(() => services.nudges.nodeExhausted({ path: 'philosophy/ethics/stoicism', articleCount: 37 }));

    expect(result.current.nudge?.kind).toBe('exhausted');
    expect(result.current.index).toBe(12);
  });
});
