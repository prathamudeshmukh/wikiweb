import { type PostHog, type PostHogOptions, PostHogPersistedProperty } from 'posthog-react-native';
import { reportError } from '../services/reportError';
import type { Analytics } from './analytics';
import type { AnalyticsConnector } from './createAnalytics';

type PostHogEventProperties = NonNullable<Parameters<PostHog['capture']>[1]>;
type BeforeSend = Extract<NonNullable<PostHogOptions['before_send']>, (...args: never[]) => unknown>;
type CaptureEvent = Parameters<BeforeSend>[0];

export type PostHogFactory = (key: string, options: PostHogOptions) => PostHog;

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

/** `posthog-react-native` on iOS and Android. */
export function connectPostHogNative(clientFor: PostHogFactory): AnalyticsConnector {
  return ({ key, host }) => {
    const client = clientFor(key, { ...POSTHOG_OPTIONS, host });
    return { analytics: posthogAnalytics(client), client };
  };
}
