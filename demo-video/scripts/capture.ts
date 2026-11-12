import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type BrowserContext, chromium, type Page } from 'playwright';
import { ANALYTICS_URL, APP_URL, PATHS, PHONE, RANDOM_SEED, WIKIMEDIA_URL } from './config.ts';
import { encode } from './encode.ts';
import { Thumb } from './gestures.ts';
import { pinClockAndRandom, showTouches } from './pageScripts.ts';
import { Screencast } from './screencast.ts';
import { type Director, perform, setUp } from './storyboard.ts';
import { toTimeline } from './timeline.ts';

/**
 * `--record`: run live and store every Wikimedia response in the HAR.
 * Default: replay the HAR, so each take shows exactly the recorded path.
 */
const recording = process.argv.includes('--record');
const headed = process.argv.includes('--headed');

interface Session {
  recordedAt: number;
}

/** Recording starts a new clock; it is saved only once the HAR it belongs to has been written. */
async function loadSession(): Promise<Session> {
  if (recording) return { recordedAt: Date.now() };
  if (!existsSync(PATHS.har) || !existsSync(PATHS.session)) {
    throw new Error('No recorded path yet. Run `npm run record` first.');
  }
  const parsed: unknown = JSON.parse(await readFile(PATHS.session, 'utf8'));
  const recordedAt = (parsed as Partial<Session>)?.recordedAt;
  if (typeof recordedAt !== 'number') throw new Error(`${PATHS.session} has no recordedAt; run \`npm run record\` again.`);
  return { recordedAt };
}

async function saveSession(session: Session): Promise<void> {
  await mkdir(path.dirname(PATHS.session), { recursive: true });
  await writeFile(PATHS.session, JSON.stringify(session, null, 2));
}

/** On replay, collects Wikimedia requests the HAR couldn't answer: those went live, so the take may differ. */
async function collectHarMisses(context: BrowserContext): Promise<() => readonly string[]> {
  const misses: string[] = [];
  // Registered before the HAR route, so it only sees what the HAR falls back on.
  await context.route(WIKIMEDIA_URL, (route) => {
    misses.push(route.request().url());
    return route.fallback();
  });
  return () => [...misses];
}

async function prepare(context: BrowserContext, session: Session): Promise<() => readonly string[]> {
  await context.route(ANALYTICS_URL, (route) => route.abort());
  const harMisses = recording ? () => [] : await collectHarMisses(context);
  await context.routeFromHAR(PATHS.har, {
    url: WIKIMEDIA_URL,
    update: recording,
    updateContent: 'embed',
    updateMode: 'minimal',
    notFound: 'fallback',
  });
  await context.addInitScript(pinClockAndRandom, { recordedAt: session.recordedAt, seed: RANDOM_SEED });
  await context.addInitScript(showTouches);
  return harMisses;
}

async function film(page: Page): Promise<Screencast> {
  await rm(PATHS.stills, { recursive: true, force: true });
  await mkdir(PATHS.stills, { recursive: true });
  const cast = await Screencast.start(page, PATHS.frames);
  const director: Director = {
    page,
    thumb: new Thumb(page),
    beat: (id) => cast.mark(id),
    still: (name) => page.screenshot({ path: path.join(PATHS.stills, `${name}.png`) }).then(() => undefined),
  };
  await perform(director);
  return cast;
}

async function main(): Promise<void> {
  const session = await loadSession();
  const browser = await chromium.launch({ headless: !headed });
  try {
    const context = await browser.newContext({
      viewport: { width: PHONE.width, height: PHONE.height },
      deviceScaleFactor: PHONE.scale,
      hasTouch: true,
      colorScheme: 'light',
      locale: 'en-GB',
      // Home and the Logbook show local dates; pin them so takes don't depend on where they run.
      timezoneId: 'Europe/London',
    });
    const harMisses = await prepare(context, session);
    const page = await context.newPage();
    await page.goto(APP_URL);
    await setUp(page);
    const take = await (await film(page)).stop();
    // Closing the context is what writes the HAR in record mode.
    await context.close();
    if (recording) await saveSession(session);
    await encode(take, PATHS.frames, PATHS.video);
    const timeline = toTimeline(take);
    await writeFile(PATHS.timeline, JSON.stringify(timeline, null, 2));
    process.stdout.write(`${recording ? 'Recorded' : 'Replayed'} ${(timeline.durationMs / 1000).toFixed(1)} s → ${PATHS.video}\nStills: ${PATHS.stills}\n`);
    const misses = harMisses();
    if (misses.length > 0) {
      process.stderr.write(`Warning: ${misses.length} Wikimedia requests weren't in the HAR and went live; the take may differ:\n  ${misses.join('\n  ')}\n`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Capture failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
