import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { memoryHomeSnapshotStore, testServices } from '../__testing__/renderWithServices';
import { HOME_SNAPSHOT } from '../config/constants';
import { fakeWikiApi } from '../content/__testing__/fakeWikiApi';
import type { Card } from '../content/card';
import { NO_TOPIC } from '../content/topics';
import { AppServicesProvider } from '../services/AppServices';
import type { WikiApi } from '../wiki-api/types';
import type { HomeSnapshotStore } from './homeSnapshotStore';
import { useHomeFeed } from './useHomeFeed';

import { reportError } from '../services/reportError';

jest.mock('../services/reportError');

const FEATURED_SPACE = 'articletopic:space incategory:Featured_articles';
const FEATURED_HISTORY = 'articletopic:history incategory:Featured_articles';
const titles = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);

const SEARCHES = { [FEATURED_SPACE]: titles('Space', 60), [FEATURED_HISTORY]: titles('History', 60) };

interface HomeProps {
  isTop: boolean;
  interests?: readonly string[];
}

function renderHome(api: WikiApi = fakeWikiApi({ searches: SEARCHES }).api, homeSnapshots: HomeSnapshotStore = memoryHomeSnapshotStore()) {
  const services = { ...testServices(api), homeSnapshots };
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

async function openedHome(api?: WikiApi, homeSnapshots?: HomeSnapshotStore) {
  const rendered = await renderHome(api, homeSnapshots);
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

  describe('on a cold start', () => {
    const savedCard = (title: string): Card => ({
      pageId: 1000 + Number(title.split(' ')[1]),
      title,
      description: null,
      extract: null,
      thumbnail: null,
      topic: NO_TOPIC,
      topicIsFallback: true,
      incomingLinks: null,
      source: 'home_interest',
      visited: false,
      read: false,
    });
    const SAVED = [savedCard('Saved 1'), savedCard('Saved 2')];
    const savedHome = () => memoryHomeSnapshotStore({ interestsKey: 'space', cards: SAVED });

    function countingHydrate() {
      const { api } = fakeWikiApi({ searches: SEARCHES });
      const hydrate = jest.fn(api.hydrate);
      return { api: { ...api, hydrate }, hydrate };
    }

    it('reopens on the saved Home without asking Wikipedia', async () => {
      const { api, hydrate } = countingHydrate();

      const { result } = await openedHome(api, savedHome());

      expect(result.current.cards.map((c) => c.title)).toEqual(['Saved 1', 'Saved 2']);
      expect(hydrate).not.toHaveBeenCalled();
    });

    it('continues past the saved cards with fresh ones', async () => {
      const { result } = await openedHome(undefined, savedHome());

      await act(() => result.current.loadMore());

      await waitFor(() => expect(result.current.cards.length).toBeGreaterThan(SAVED.length));
      expect(result.current.cards[SAVED.length].title).toBe('Space 1');
    });

    it('saves the Home on screen for the next cold start', async () => {
      const homeSnapshots = memoryHomeSnapshotStore();
      const { result } = await openedHome(undefined, homeSnapshots);

      await waitFor(async () => expect((await homeSnapshots.load())?.cards).toEqual(result.current.cards), { timeout: HOME_SNAPSHOT.saveDelayMs * 3 });
    });
  });
});
