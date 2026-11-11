import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

export const APP_URL = 'https://gotangent.app/';

/** iPhone 14/15 logical size; @2× gives 780×1688 frames. */
export const PHONE = { width: 390, height: 844, scale: 2 } as const;

/** Everything Tangent fetches from Wikimedia — recorded into the HAR and replayed from it. */
export const WIKIMEDIA_URL = /^https:\/\/([a-z.]+\.)?(wikipedia|wikimedia)\.org\//;

/** Demo runs must not reach analytics (SPEC.md §3.1 funnels). */
export const ANALYTICS_URL = /posthog/;

/** Seeds the app's Math.random so record and replay issue the same requests. */
export const RANDOM_SEED = 20261111;

export const PATHS = {
  har: path.join(ROOT, 'capture', 'wikimedia.har'),
  session: path.join(ROOT, 'capture', 'session.json'),
  frames: path.join(ROOT, 'capture', 'frames'),
  stills: path.join(ROOT, 'capture', 'stills'),
  video: path.join(ROOT, 'public', 'capture', 'screen.mp4'),
  timeline: path.join(ROOT, 'public', 'capture', 'timeline.json'),
} as const;

export const SCREENCAST = { format: 'jpeg', quality: 92, fps: 60 } as const;
