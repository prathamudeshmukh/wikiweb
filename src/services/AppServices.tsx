import Storage from 'expo-sqlite/kv-store';
import { PostHog } from 'posthog-react-native';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import type { Analytics } from '../analytics/analytics';
import { type AnalyticsConsent, createAnalyticsConsent } from '../analytics/analyticsConsent';
import { type ColumnVisits, createColumnVisits } from '../analytics/columnVisits';
import { createAnalytics, type PostHogFactory } from '../analytics/createAnalytics';
import { errorReason } from '../analytics/errorReason';
import { createExpeditionReporter, type ExpeditionReporter } from '../analytics/expeditionReport';
import { findEvents } from '../analytics/findEvents';
import { buildUserAgent, PREFETCH, REQUEST_BUDGET } from '../config/constants';
import { topicOfPage } from '../content/topicResolution';
import { columnFeedFor } from '../explore/columnFeedFor';
import { type ColumnPrefetcher, createColumnPrefetcher } from '../explore/columnPrefetch';
import { createHomeSnapshotStore, type HomeSnapshotStore } from '../explore/homeSnapshotStore';
import { createFindRepository } from '../finds/findRepository';
import { createFindsStore, type FindsStore } from '../finds/findsStore';
import { createHintStore, type HintStore } from '../hints/hintStore';
import { type CompletedNodes, createCompletedNodes } from '../interests/completedNodes';
import { createInterestsStore, type InterestsStore } from '../interests/interestsStore';
import { openOnce } from '../journeys/journeyDatabase';
import { createJourneyRepository } from '../journeys/journeyRepository';
import { createJourneySession, type JourneySession } from '../journeys/journeySession';
import { createNudges, type Nudges } from '../nudges/nudges';
import { createNudgeStore } from '../nudges/nudgeStore';
import { newId } from '../journeys/newId';
import { openJourneyDatabase } from '../journeys/openJourneyDatabase';
import { createWikiApi } from '../wiki-api/client';
import { createWikiHttp } from '../wiki-api/http';
import { createRequestBudget, type Lane } from '../wiki-api/requestBudget';
import type { WikiApi } from '../wiki-api/types';
import { reportError, setErrorSink } from './reportError';

export interface AppServices {
  api: WikiApi;
  interests: InterestsStore;
  /** Home saved for the next cold start (SPEC.md §3.2). */
  homeSnapshots: HomeSnapshotStore;
  /** Interest-tree nodes read in full (SPEC.md §3.9). */
  completedNodes: CompletedNodes;
  /** Which prompt or exhaustion card Home shows (SPEC.md §3.9). */
  nudges: Nudges;
  hints: HintStore;
  journeys: JourneySession;
  /** Articles kept with ✦ (SPEC.md §3.7). */
  finds: FindsStore;
  prefetcher: ColumnPrefetcher;
  analytics: Analytics;
  /** The PostHog client, for touch autocapture; null when events aren't sent. */
  analyticsClient: PostHog | null;
  analyticsConsent: AnalyticsConsent;
  columnVisits: ColumnVisits;
  expeditions: ExpeditionReporter;
}

export type ServicesResult = { ok: true; services: AppServices } | { ok: false; problem: string };

/** Read from the environment (`EXPO_PUBLIC_*`); only the Wikipedia contact is required. */
export interface AppConfig {
  wikiContact: string | undefined;
  posthogKey: string | undefined;
  posthogHost: string | undefined;
  isDev: boolean;
}

const newPostHog: PostHogFactory = (key, options) => new PostHog(key, options);

/** Builds the app's services from configuration, failing fast with a readable reason. */
export function createAppServices(config: AppConfig, clientFor: PostHogFactory = newPostHog): ServicesResult {
  const contact = config.wikiContact;
  if (!contact?.trim()) {
    return { ok: false, problem: 'Set EXPO_PUBLIC_WIKI_API_CONTACT (a URL or email) — Wikipedia requires contact details from every app.' };
  }
  const budget = createRequestBudget({ ...REQUEST_BUDGET, now: Date.now, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) });
  const apiOn = (lane?: Lane) => createWikiApi(createWikiHttp({ fetchFn: fetch, userAgent: buildUserAgent(contact), budget, lane }));
  const api = apiOn();
  const prefetcher = createColumnPrefetcher({ ...PREFETCH, feedFor: (entry, lane) => columnFeedFor(apiOn(lane), entry) });
  const { analytics, client } = createAnalytics({ key: config.posthogKey, host: config.posthogHost, isDev: config.isDev }, clientFor);
  setErrorSink((scope, error) => analytics.track({ name: 'app_error', properties: { scope, reason: errorReason(error) } }));
  const expeditions = createExpeditionReporter({ analytics, now: Date.now });
  // One connection for every table in the on-device database.
  const openDatabase = openOnce(openJourneyDatabase);
  const completedNodes = createCompletedNodes(openDatabase);
  const nudges = createNudges({ store: createNudgeStore(Storage), completedNodes, analytics, now: Date.now });
  const journeys = createJourneySession({
    repo: createJourneyRepository(openDatabase),
    now: Date.now,
    newId,
    resolveTopic: (pageId) => topicOfPage(api, pageId),
    onError: reportError,
    events: {
      stampEarned: expeditions.stampEarned,
      expeditionEnded: (expedition) => expeditions.ended(expedition, 'home'),
      articleRead: (topic) => void nudges.articleRead(topic),
    },
  });
  const finds = createFindsStore({
    repo: createFindRepository(openDatabase),
    now: Date.now,
    expedition: () => {
      const active = journeys.getState().active?.journey;
      return active ? { id: active.id, title: active.title } : null;
    },
    journeysSaved: journeys.whenSaved,
    describe: async (page) => {
      const [topic, article] = await Promise.all([topicOfPage(api, page.pageId), api.summary(page.title)]);
      return { topic, thumbnailUrl: article.thumbnail?.url ?? null };
    },
    onError: reportError,
    events: findEvents(analytics),
  });
  return {
    ok: true,
    services: {
      api,
      interests: createInterestsStore(Storage),
      homeSnapshots: createHomeSnapshotStore(openDatabase),
      completedNodes,
      nudges,
      hints: createHintStore(Storage),
      journeys,
      finds,
      prefetcher,
      analytics,
      analyticsClient: client,
      analyticsConsent: createAnalyticsConsent(Storage, analytics),
      columnVisits: createColumnVisits({ analytics, now: Date.now }),
      expeditions,
    },
  };
}

const ServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({ services, children }: { services: AppServices; children: ReactNode }) {
  const value = useMemo(() => services, [services]);
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useAppServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useAppServices must be used inside AppServicesProvider.');
  return services;
}
