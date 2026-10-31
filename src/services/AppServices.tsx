import type { PostHog } from 'posthog-react-native';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { Platform } from 'react-native';
import type { Analytics } from '../analytics/analytics';
import { type AnalyticsConsent, createAnalyticsConsent } from '../analytics/analyticsConsent';
import { type ColumnVisits, createColumnVisits } from '../analytics/columnVisits';
import { connectPostHog } from '../analytics/connectPostHog';
import { type AnalyticsConnector, createAnalytics } from '../analytics/createAnalytics';
import { errorReason } from '../analytics/errorReason';
import { createExpeditionReporter, type ExpeditionReporter } from '../analytics/expeditionReport';
import { findEvents } from '../analytics/findEvents';
import { createFeedbackPrompt, type FeedbackPrompt } from '../feedback/feedbackPrompt';
import { createFeedbackStore } from '../feedback/feedbackStore';
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
import { createWikiHttp, type WikiRuntime } from '../wiki-api/http';
import { createRequestBudget, type Lane } from '../wiki-api/requestBudget';
import type { WikiApi } from '../wiki-api/types';
import { keyValueStorage } from '../storage/keyValueStorage';
import { reportError, setErrorSink } from './reportError';

const WIKI_RUNTIME: WikiRuntime = Platform.OS === 'web' ? 'browser' : 'native';

export interface AppServices {
  api: WikiApi;
  interests: InterestsStore;
  /** Home saved for the next cold start (SPEC.md §3.2). */
  homeSnapshots: HomeSnapshotStore;
  /** Interest-tree nodes read in full (SPEC.md §3.9). */
  completedNodes: CompletedNodes;
  /** Which prompt, exhaustion or feedback card Home shows (SPEC.md §3.9, §3.10). */
  nudges: Nudges;
  /** The one-time feedback card's answers (SPEC.md §3.10). */
  feedback: FeedbackPrompt;
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

/** Builds the app's services from configuration, failing fast with a readable reason. */
export function createAppServices(config: AppConfig, connect: AnalyticsConnector = connectPostHog): ServicesResult {
  const contact = config.wikiContact;
  if (!contact?.trim()) {
    return { ok: false, problem: 'Set EXPO_PUBLIC_WIKI_API_CONTACT (a URL or email) — Wikipedia requires contact details from every app.' };
  }
  const budget = createRequestBudget({ ...REQUEST_BUDGET, now: Date.now, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) });
  const apiOn = (lane?: Lane) => createWikiApi(createWikiHttp({ fetchFn: fetch, userAgent: buildUserAgent(contact), budget, lane, runtime: WIKI_RUNTIME }));
  const api = apiOn();
  const prefetcher = createColumnPrefetcher({ ...PREFETCH, feedFor: (entry, lane) => columnFeedFor(apiOn(lane), entry) });
  const { analytics, client } = createAnalytics({ key: config.posthogKey, host: config.posthogHost, isDev: config.isDev }, connect);
  setErrorSink((scope, error) => analytics.track({ name: 'app_error', properties: { scope, reason: errorReason(error) } }));
  const expeditions = createExpeditionReporter({ analytics, now: Date.now });
  // One connection for every table in the on-device database.
  const openDatabase = openOnce(openJourneyDatabase);
  const completedNodes = createCompletedNodes(openDatabase);
  const journeyRepo = createJourneyRepository(openDatabase);
  const analyticsConsent = createAnalyticsConsent(keyValueStorage, analytics);
  const feedback = createFeedbackPrompt({
    store: createFeedbackStore(keyValueStorage),
    analytics,
    expeditionCount: journeyRepo.expeditionCount,
    isOptedOut: analyticsConsent.isOptedOut,
  });
  const nudges = createNudges({ store: createNudgeStore(keyValueStorage), completedNodes, feedback, analytics, now: Date.now });
  const journeys = createJourneySession({
    repo: journeyRepo,
    now: Date.now,
    newId,
    resolveTopic: (pageId) => topicOfPage(api, pageId),
    onError: reportError,
    events: {
      stampEarned: expeditions.stampEarned,
      expeditionStarted: feedback.expeditionStarted,
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
      interests: createInterestsStore(keyValueStorage),
      homeSnapshots: createHomeSnapshotStore(openDatabase),
      completedNodes,
      nudges,
      feedback,
      hints: createHintStore(keyValueStorage),
      journeys,
      finds,
      prefetcher,
      analytics,
      analyticsClient: client,
      analyticsConsent,
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
