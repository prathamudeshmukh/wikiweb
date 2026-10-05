import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { type MemoryAnalytics, memoryAnalytics } from '../analytics/__testing__/memoryAnalytics';
import { createAnalyticsConsent } from '../analytics/analyticsConsent';
import { createColumnVisits } from '../analytics/columnVisits';
import { createExpeditionReporter } from '../analytics/expeditionReport';
import { findEvents } from '../analytics/findEvents';
import { memoryFindsStore } from '../finds/__testing__/memoryFindsStore';
import type { CompletedNode, CompletedNodes } from '../interests/completedNodes';
import type { InterestsStore } from '../interests/interestsStore';
import { PREFETCH } from '../config/constants';
import { columnFeedFor } from '../explore/columnFeedFor';
import { memoryHintStore } from '../hints/__testing__/memoryHintStore';
import { HintsProvider } from '../hints/HintsContext';
import { createColumnPrefetcher } from '../explore/columnPrefetch';
import { memoryJourneySession } from '../journeys/__testing__/memoryJourneySession';
import { createNudges } from '../nudges/nudges';
import { createNudgeStore } from '../nudges/nudgeStore';
import type { JourneySession } from '../journeys/journeySession';
import { type AppServices, AppServicesProvider } from '../services/AppServices';
import type { WikiApi } from '../wiki-api/types';

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

export function memoryInterestsStore(initial: string[] | null = null): InterestsStore {
  let saved = initial;
  return {
    load: async () => saved,
    save: async (ids) => {
      saved = [...ids];
    },
  };
}

export function memoryCompletedNodes(initial: readonly CompletedNode[] = []): CompletedNodes {
  let nodes = [...initial];
  return {
    record: async (node) => {
      if (nodes.some((n) => n.nodePath === node.nodePath)) return false;
      nodes = [...nodes, node];
      return true;
    },
    list: async () => [...nodes].sort((a, b) => b.completedAt - a.completedAt),
  };
}

function memoryKv() {
  let values: Record<string, string> = {};
  return {
    getItem: async (key: string) => values[key] ?? null,
    setItem: async (key: string, value: string) => {
      values = { ...values, [key]: value };
    },
  };
}

export type TestServices = AppServices & { analytics: MemoryAnalytics };

/** The app's services over a fake Wikipedia API and in-memory stores; `analytics` records every event. */
export function testServices(api: WikiApi, journeys: JourneySession = memoryJourneySession()): TestServices {
  const prefetcher = createColumnPrefetcher({ ...PREFETCH, feedFor: (entry) => columnFeedFor(api, entry) });
  const analytics = memoryAnalytics();
  const completedNodes = memoryCompletedNodes();
  return {
    api,
    interests: memoryInterestsStore(),
    completedNodes,
    nudges: createNudges({ store: createNudgeStore(memoryKv()), completedNodes, analytics, now: Date.now }),
    hints: memoryHintStore(),
    journeys,
    finds: memoryFindsStore(journeys, findEvents(analytics)),
    prefetcher,
    analytics,
    analyticsClient: null,
    analyticsConsent: createAnalyticsConsent(memoryKv(), analytics),
    columnVisits: createColumnVisits({ analytics, now: Date.now }),
    expeditions: createExpeditionReporter({ analytics, now: Date.now }),
  };
}

/** Renders UI inside the same providers the app uses, with a fake Wikipedia API and in-memory journeys. */
export async function renderWithServices(ui: ReactElement, api: WikiApi, journeys: JourneySession = memoryJourneySession(), overrides: Partial<Omit<AppServices, 'analytics'>> = {}) {
  const services: TestServices = { ...testServices(api, journeys), ...overrides };
  // A wrapper, so `rerender` keeps the same providers and services.
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <AppServicesProvider services={services}>
        <HintsProvider store={services.hints} journeys={services.journeys}>
          {children}
        </HintsProvider>
      </AppServicesProvider>
    </SafeAreaProvider>
  );
  return { ...(await render(ui, { wrapper })), services };
}

const PHONE_LIST_HEIGHT = 700;

/** Jest has no layout engine; give every column's list a phone-sized height so its cards render. */
export async function layOutColumns() {
  for (const area of screen.getAllByTestId('column-list-area')) {
    await fireEvent(area, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: PHONE_LIST_HEIGHT } } });
  }
}
