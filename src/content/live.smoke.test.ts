// Opt-in check against the real Wikipedia API (network). Not part of the normal suite:
//   WIKI_API_CONTACT=<url-or-email> npm run test:live
import { buildUserAgent, PREFETCH, REQUEST_BUDGET } from '../config/constants';
import { HOME_TITLE_BLOCKLIST } from '../config/homeBlocklist';
import { columnFeedFor } from '../explore/columnFeedFor';
import { createColumnPrefetcher } from '../explore/columnPrefetch';
import { childEntry, initialStack, topOf } from '../explore/columnStack';
import { createWikiApi } from '../wiki-api/client';
import { createWikiHttp } from '../wiki-api/http';
import { createRequestBudget, type Lane } from '../wiki-api/requestBudget';
import { createColumnFeed } from './columnFeed';
import { createHomeFeed } from './homeFeed';

const contact = process.env.WIKI_API_CONTACT;
const describeLive = contact ? describe : describe.skip;
const LIVE_TIMEOUT_MS = 60_000;

describeLive('live Wikipedia', () => {
  // Logs any non-OK response so throttling or API changes are visible in the output.
  const loggingFetch: typeof fetch = async (input, init) => {
    const response = await fetch(input, init);
    if (!response.ok) console.log(`HTTP ${response.status} retry-after=${response.headers.get('retry-after')} ${String(input).slice(0, 160)}`);
    return response;
  };
  const api = createWikiApi(createWikiHttp({ fetchFn: loggingFetch, userAgent: buildUserAgent(contact ?? '') }));
  const summary = (cards: { title: string; source: string; topic: { tileId: string | null; territory: string | null }; thumbnail: unknown }[]) =>
    cards.map((c) => `${c.source.padEnd(13)} ${(c.topic.tileId ?? `(${c.topic.territory ?? '-'})`).padEnd(10)} ${c.thumbnail ? 'img' : '   '} ${c.title}`).join('\n');

  it(
    'builds a full Octopus column',
    async () => {
      const seed = { pageId: 22780, title: 'Octopus' };
      const feed = createColumnFeed(api, {
        seed,
        pathIds: new Set([seed.pageId]),
        visitedIds: new Set(),
        readIds: new Set(),
        seedTopic: { tileId: 'animals', territory: 'life' },
      });

      const started = Date.now();
      const { cards: page } = await feed.nextPage();
      console.log(`Octopus column — first page with topics and ranking ${Date.now() - started} ms:\n${summary(page)}`);

      expect(page.length).toBe(20);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    'builds a Home page for Animals + Space + History',
    async () => {
      const feed = createHomeFeed(api, {
        interestPicks: ['animals', 'space', 'history'],
        today: new Date(),
        visitedIds: new Set(),
        isRead: () => false,
        wasShown: () => false,
        blocklist: HOME_TITLE_BLOCKLIST,
      });

      const started = Date.now();
      const { cards: page } = await feed.nextPage();
      console.log(`Home — first page ${Date.now() - started} ms:\n${summary(page)}`);

      expect(page.length).toBeGreaterThanOrEqual(18);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    'has a dwelt-on column ready by the time the user hops',
    async () => {
      const READING_MS = 3_000;
      const budget = createRequestBudget({ ...REQUEST_BUDGET, now: Date.now, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) });
      const apiOn = (lane: Lane) => createWikiApi(createWikiHttp({ fetchFn: loggingFetch, userAgent: buildUserAgent(contact ?? ''), budget, lane }));
      const prefetcher = createColumnPrefetcher({ ...PREFETCH, feedFor: (entry, lane) => columnFeedFor(apiOn(lane), entry) });
      const column = childEntry(topOf(initialStack()), { ref: { pageId: 22780, title: 'Octopus' }, topic: { tileId: 'animals', territory: 'life' } });

      prefetcher.prefetch(column);
      await new Promise((resolve) => setTimeout(resolve, READING_MS));
      const started = Date.now();
      const page = await prefetcher.take(column.id)?.nextPage();
      console.log(`Hop after ${READING_MS} ms of reading — first page in ${Date.now() - started} ms`);

      expect(page?.cards.length).toBeGreaterThan(0);
    },
    LIVE_TIMEOUT_MS,
  );
});
