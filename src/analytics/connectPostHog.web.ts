import { connectPostHogWeb } from './posthogWeb';

// Imported on demand, so the browser fetches posthog-js as its own chunk after the first screen (SPEC.md §15.9).
export const connectPostHog = connectPostHogWeb(async (key, config) => {
  const { posthog } = await import('posthog-js');
  return posthog.init(key, config);
});
