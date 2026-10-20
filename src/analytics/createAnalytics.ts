import type { PostHog } from 'posthog-react-native';
import { ANALYTICS } from '../config/constants';
import type { Analytics } from './analytics';

export interface AnalyticsConfig {
  key: string | undefined;
  host: string | undefined;
  isDev: boolean;
}

export interface AnalyticsSetup {
  analytics: Analytics;
  /** The native PostHog client, for touch autocapture; null when events aren't sent, and on the web. */
  client: PostHog | null;
}

/** Opens the platform's PostHog client for a project (`posthogNative.ts`, `posthogWeb.ts`). */
export type AnalyticsConnector = (project: { key: string; host: string }) => AnalyticsSetup;

const NOOP_ANALYTICS: Analytics = { track: () => undefined, screen: () => undefined, setOptedOut: () => undefined };

function consoleAnalytics(): Analytics {
  let optedOut = false;
  const log = (label: string, detail?: object) => {
    if (!optedOut) console.info(`[analytics] ${label}`, ...(detail ? [detail] : []));
  };
  return {
    track: ({ name, properties }) => log(name, properties),
    screen: (route) => log(`screen ${route}`),
    setOptedOut: (value) => {
      optedOut = value;
    },
  };
}

/** Picks where events go: PostHog in release builds with a key, the console in development, nowhere otherwise. */
export function createAnalytics({ key, host, isDev }: AnalyticsConfig, connect: AnalyticsConnector): AnalyticsSetup {
  if (isDev) return { analytics: consoleAnalytics(), client: null };
  const projectKey = key?.trim();
  if (!projectKey) return { analytics: NOOP_ANALYTICS, client: null };
  return connect({ key: projectKey, host: host?.trim() || ANALYTICS.defaultHost });
}
