import Storage from 'expo-sqlite/kv-store';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { buildUserAgent } from '../config/constants';
import { topicOfPage } from '../content/topicResolution';
import { createInterestsStore, type InterestsStore } from '../interests/interestsStore';
import { createJourneyRepository } from '../journeys/journeyRepository';
import { createJourneySession, type JourneySession } from '../journeys/journeySession';
import { newId } from '../journeys/newId';
import { openJourneyDatabase } from '../journeys/openJourneyDatabase';
import { createWikiApi } from '../wiki-api/client';
import { createWikiHttp } from '../wiki-api/http';
import type { WikiApi } from '../wiki-api/types';
import { reportError } from './reportError';

export interface AppServices {
  api: WikiApi;
  interests: InterestsStore;
  journeys: JourneySession;
}

export type ServicesResult = { ok: true; services: AppServices } | { ok: false; problem: string };

/** Builds the app's services from configuration, failing fast with a readable reason. */
export function createAppServices(contact: string | undefined): ServicesResult {
  if (!contact?.trim()) {
    return { ok: false, problem: 'Set EXPO_PUBLIC_WIKI_API_CONTACT (a URL or email) — Wikipedia requires contact details from every app.' };
  }
  const http = createWikiHttp({ fetchFn: fetch, userAgent: buildUserAgent(contact) });
  const api = createWikiApi(http);
  const journeys = createJourneySession({
    repo: createJourneyRepository(openJourneyDatabase),
    now: Date.now,
    newId,
    resolveTopic: (pageId) => topicOfPage(api, pageId),
    onError: reportError,
  });
  return { ok: true, services: { api, interests: createInterestsStore(Storage), journeys } };
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
