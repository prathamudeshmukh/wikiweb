import type { AnalyticsEvent } from './events';

/** Where events go. Adapters: PostHog (release), console (development), no-op (no key). */
export interface Analytics {
  track(event: AnalyticsEvent): void;
  /** A screen by its route pattern only (`/expedition/[id]`), never its params. */
  screen(route: string): void;
  setOptedOut(optedOut: boolean): void;
}
