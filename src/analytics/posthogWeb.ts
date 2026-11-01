import type { CaptureResult, PostHog, PostHogConfig, Properties } from 'posthog-js';
import { reportError } from '../services/reportError';
import type { Analytics } from './analytics';
import type { AnalyticsConnector } from './createAnalytics';

export type PostHogJsClient = Pick<PostHog, 'capture' | 'register' | 'opt_out_capturing' | 'opt_in_capturing'>;
/** Loads and starts `posthog-js`; async so its ~330 KB stay out of the first screen's bundle (SPEC.md §15.9). */
export type PostHogJsFactory = (key: string, config: Partial<PostHogConfig>) => Promise<PostHogJsClient>;

// posthog-js stamps the page's address on every event (current, first and session-entry), and a reader URL names an article.
const PAGE_ADDRESS = /(url|pathname)$/;
const isPageAddress = (key: string) => key === 'title' || PAGE_ADDRESS.test(key);

function withoutAddressKeys(properties: Properties | undefined): Properties | undefined {
  if (!properties) return properties;
  return Object.fromEntries(Object.entries(properties).filter(([key]) => !isPageAddress(key)));
}

/** Titles go only on the feed-quality events (SPEC.md §11), so no event carries the page it was sent from. */
export function withoutPageAddress(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  return {
    ...event,
    properties: withoutAddressKeys(event.properties) ?? {},
    ...(event.$set && { $set: withoutAddressKeys(event.$set) }),
    ...(event.$set_once && { $set_once: withoutAddressKeys(event.$set_once) }),
  };
}

// SPEC.md §11 and §15.7: anonymous and minimal, as on native. Screens are sent by hand, as route patterns.
const POSTHOG_JS_CONFIG: Omit<Partial<PostHogConfig>, 'api_host'> = {
  before_send: withoutPageAddress,
  person_profiles: 'never',
  persistence: 'localStorage',
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  rageclick: false,
  capture_dead_clicks: false,
  capture_heatmaps: false,
  capture_exceptions: false,
  capture_performance: false,
  disable_session_recording: true,
  disable_surveys: true,
  disable_product_tours: true,
  disable_conversations: true,
  disable_web_experiments: true,
  disable_external_dependency_loading: true,
  advanced_disable_flags: true,
  // posthog-js can't drop a batch already queued; sent one by one, nothing is left waiting when the user opts out.
  request_batching: false,
};

const SUPER_PROPERTIES = { platform: 'web', $geoip_disable: true } as const;

function posthogJsAnalytics(client: PostHogJsClient): Analytics {
  return {
    track: ({ name, properties }) => void client.capture(name, properties),
    // The `$screen` event native PostHog sends, so screens chart together across platforms.
    screen: (route) => void client.capture('$screen', { $screen_name: route }),
    setOptedOut: (optedOut) => (optedOut ? client.opt_out_capturing() : client.opt_in_capturing()),
  };
}

const DROPPING_ANALYTICS: Analytics = { track: () => undefined, screen: () => undefined, setOptedOut: () => undefined };

/** Calls made while PostHog loads wait on it, in the order they were made; if it never loads they are dropped. */
function whenLoaded(loading: Promise<Analytics>): Analytics {
  const ready = loading.catch((error: unknown) => {
    reportError('analytics.load', error);
    return DROPPING_ANALYTICS;
  });
  return {
    track: (event) => void ready.then((analytics) => analytics.track(event)),
    screen: (route) => void ready.then((analytics) => analytics.screen(route)),
    setOptedOut: (optedOut) => void ready.then((analytics) => analytics.setOptedOut(optedOut)),
  };
}

/** `posthog-js` in the browser (SPEC.md §15.7). No touch autocapture, so no client for the provider. */
export function connectPostHogWeb(clientFor: PostHogJsFactory): AnalyticsConnector {
  return ({ key, host }) => {
    const loading = clientFor(key, { ...POSTHOG_JS_CONFIG, api_host: host }).then((client) => {
      client.register(SUPER_PROPERTIES);
      return posthogJsAnalytics(client);
    });
    return { analytics: whenLoaded(loading), client: null };
  };
}
