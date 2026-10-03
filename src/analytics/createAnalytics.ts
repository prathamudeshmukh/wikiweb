import { type PostHog, type PostHogOptions, PostHogPersistedProperty } from 'posthog-react-native';
import { ANALYTICS } from '../config/constants';
import { reportError } from '../services/reportError';
import type { Analytics } from './analytics';

export interface AnalyticsConfig {
  key: string | undefined;
  host: string | undefined;
  isDev: boolean;
}

type PostHogEventProperties = NonNullable<Parameters<PostHog['capture']>[1]>;
type BeforeSend = Extract<NonNullable<PostHogOptions['before_send']>, (...args: never[]) => unknown>;
type CaptureEvent = Parameters<BeforeSend>[0];

export type PostHogFactory = (key: string, options: PostHogOptions) => PostHog;

export interface AnalyticsSetup {
  analytics: Analytics;
  /** The PostHog client, for touch autocapture; null when events aren't sent. */
  client: PostHog | null;
}

/**
 * `Application Opened` carries the launch URL, and a deep link into the reader names an article in it;
 * titles go only on the feed-quality events (SPEC.md §11).
 */
export function withoutLaunchUrl(event: CaptureEvent): CaptureEvent {
  if (event?.event !== 'Application Opened' || !event.properties || !('url' in event.properties)) return event;
  const { url: _url, ...properties } = event.properties;
  return { ...event, properties };
}

// SPEC.md §11: anonymous and minimal. Touches and screens are captured through PostHogProvider and our own screen calls.
const POSTHOG_OPTIONS: Omit<PostHogOptions, 'host'> = {
  before_send: withoutLaunchUrl,
  personProfiles: 'never',
  disableGeoip: true,
  captureAppLifecycleEvents: true,
  enableSessionReplay: false,
  disableSurveys: true,
  preloadFeatureFlags: false,
  errorTracking: { autocapture: false },
};

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

function posthogAnalytics(client: PostHog): Analytics {
  return {
    // Every event's properties are flat JSON values; the event types guarantee it.
    track: ({ name, properties }) => client.capture(name, properties as unknown as PostHogEventProperties),
    screen: (route) => {
      client.screen(route).catch((error: unknown) => reportError('analytics.screen', error));
    },
    setOptedOut: (optedOut) => {
      // Opting out only stops new events; drop the unsent ones too, since they may carry titles.
      if (optedOut) client.setPersistedProperty(PostHogPersistedProperty.Queue, null);
      (optedOut ? client.optOut() : client.optIn()).catch((error: unknown) => reportError('analytics.consent', error));
    },
  };
}

/** Picks where events go: PostHog in release builds with a key, the console in development, nowhere otherwise. */
export function createAnalytics({ key, host, isDev }: AnalyticsConfig, clientFor: PostHogFactory): AnalyticsSetup {
  if (isDev) return { analytics: consoleAnalytics(), client: null };
  const projectKey = key?.trim();
  if (!projectKey) return { analytics: NOOP_ANALYTICS, client: null };
  const client = clientFor(projectKey, { ...POSTHOG_OPTIONS, host: host?.trim() || ANALYTICS.defaultHost });
  return { analytics: posthogAnalytics(client), client };
}
