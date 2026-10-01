import Storage from 'expo-sqlite/kv-store';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { buildUserAgent } from '../config/constants';
import { createInterestsStore, type InterestsStore } from '../interests/interestsStore';
import { createWikiApi } from '../wiki-api/client';
import { createWikiHttp } from '../wiki-api/http';
import type { WikiApi } from '../wiki-api/types';

export interface AppServices {
  api: WikiApi;
  interests: InterestsStore;
}

export type ServicesResult = { ok: true; services: AppServices } | { ok: false; problem: string };

/** Builds the app's services from configuration, failing fast with a readable reason. */
export function createAppServices(contact: string | undefined): ServicesResult {
  if (!contact?.trim()) {
    return { ok: false, problem: 'Set EXPO_PUBLIC_WIKI_API_CONTACT (a URL or email) — Wikipedia requires contact details from every app.' };
  }
  const http = createWikiHttp({ fetchFn: fetch, userAgent: buildUserAgent(contact) });
  return { ok: true, services: { api: createWikiApi(http), interests: createInterestsStore(Storage) } };
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
