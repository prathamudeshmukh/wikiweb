import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { testServices } from '../__testing__/renderWithServices';
import { fakeWikiApi } from '../content/__testing__/fakeWikiApi';
import { AppServicesProvider } from '../services/AppServices';
import type { WikiApi } from '../wiki-api/types';
import { useHomeFeed } from './useHomeFeed';

import { reportError } from '../services/reportError';

jest.mock('../services/reportError');

const FEATURED_SPACE = 'articletopic:space incategory:Featured_articles';
const FEATURED_HISTORY = 'articletopic:history|military-and-warfare incategory:Featured_articles';
const titles = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);

const SEARCHES = { [FEATURED_SPACE]: titles('Space', 60), [FEATURED_HISTORY]: titles('History', 60) };

interface HomeProps {
  isTop: boolean;
  interests?: readonly string[];
}

function renderHome(api: WikiApi = fakeWikiApi({ searches: SEARCHES }).api) {
  const services = testServices(api);
  const wrapper = ({ children }: { children: ReactNode }) => <AppServicesProvider services={services}>{children}</AppServicesProvider>;
  return renderHook(({ isTop, interests = ['space'] }: HomeProps) => useHomeFeed(interests, isTop), { wrapper, initialProps: { isTop: true } as HomeProps });
}

/** Home's API, whose hydrate calls can be held back to make the fresh Home arrive late. */
function slowHydrate() {
  const { api } = fakeWikiApi({ searches: SEARCHES });
  let gate: Promise<void> | null = null;
  let open: () => void = () => undefined;
  const held: WikiApi = {
    ...api,
    hydrate: async (requested) => {
      if (gate) await gate;
      return api.hydrate(requested);
    },
  };
  return {
    api: held,
    hold: () => {
      gate = new Promise((resolve) => (open = resolve));
    },
    release: async () => {
      gate = null;
      open();
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}

const firstTitle = (cards: readonly { title: string }[]) => cards[0]?.title;

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

async function openedHome(api?: WikiApi) {
  const rendered = await renderHome(api);
  await waitFor(() => expect(rendered.result.current.status).toBe('idle'));
  return rendered;
}

describe('useHomeFeed', () => {
  it('opens on Home cards from the user’s interests', async () => {
    const { result } = await openedHome();

    expect(firstTitle(result.current.cards)).toBe('Space 1');
  });

  it('shows a fresh Home, without the cards already seen, after an expedition', async () => {
    const { result, rerender } = await openedHome();
    const seen = new Set(result.current.cards.map((c) => c.title));

    await rerender({ isTop: false });
    await rerender({ isTop: true });

    await waitFor(() => expect(result.current.generation).toBe(1));
    expect(result.current.cards.some((c) => seen.has(c.title))).toBe(false);
  });

  it('keeps Home as it is when the user already scrolled it before the fresh one arrived', async () => {
    const slow = slowHydrate();
    const { result, rerender } = await openedHome(slow.api);
    slow.hold();
    await rerender({ isTop: false });
    await rerender({ isTop: true });

    await act(() => result.current.touched());
    await act(() => slow.release());

    expect(result.current.generation).toBe(0);
    expect(firstTitle(result.current.cards)).toBe('Space 1');
  });

  it('does not refresh while Home stays on top', async () => {
    const { result } = await openedHome();

    await settle();

    expect(result.current.generation).toBe(0);
  });

  it('replaces Home with a fresh one when pulled', async () => {
    const { result } = await openedHome();
    const seen = new Set(result.current.cards.map((c) => c.title));

    await act(() => result.current.refresh());

    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.generation).toBe(1);
    expect(result.current.cards.some((c) => seen.has(c.title))).toBe(false);
  });

  it('keeps the old cards when a pulled Home fails to load', async () => {
    const { api, state } = fakeWikiApi({ searches: SEARCHES });
    const { result } = await openedHome(api);
    state.failNextHydrate = true;

    await act(() => result.current.refresh());

    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.generation).toBe(0);
    expect(firstTitle(result.current.cards)).toBe('Space 1');
  });

  it('swaps the fresh Home in while the user is still away, so they land on it', async () => {
    const { result, rerender } = await openedHome();

    await rerender({ isTop: false });

    await waitFor(() => expect(result.current.generation).toBe(1));
  });

  it('refreshes once per expedition when a pull finishes after the user left', async () => {
    const slow = slowHydrate();
    const { result, rerender } = await openedHome(slow.api);
    slow.hold();
    await act(() => result.current.refresh());
    await rerender({ isTop: false });
    await act(() => slow.release());

    await rerender({ isTop: true });
    await settle();

    expect(result.current.generation).toBe(1);
  });

  it('uses a held fresh Home on the next pull', async () => {
    const slow = slowHydrate();
    const { result, rerender } = await openedHome(slow.api);
    slow.hold();
    await rerender({ isTop: false });
    await rerender({ isTop: true });
    await act(() => result.current.touched());
    await act(() => slow.release());

    await act(() => result.current.refresh());

    await waitFor(() => expect(result.current.generation).toBe(1));
  });

  it('keeps the old Home and reports it when the fresh one fails to load', async () => {
    const { api, state } = fakeWikiApi({ searches: SEARCHES });
    const { result, rerender } = await openedHome(api);
    state.failNextHydrate = true;

    await rerender({ isTop: false });
    await settle();

    expect(result.current.generation).toBe(0);
    expect(reportError).toHaveBeenCalledWith('feed.home_refresh', expect.any(Error));
  });

  it('stays on new interests when a pull for the old ones finishes late', async () => {
    const slow = slowHydrate();
    const { result, rerender } = await openedHome(slow.api);
    slow.hold();
    await act(() => result.current.refresh());

    await rerender({ isTop: true, interests: ['history'] });
    await act(() => slow.release());

    await waitFor(() => expect(firstTitle(result.current.cards)).toBe('History 1'));
  });
});
