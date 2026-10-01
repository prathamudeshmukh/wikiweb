// Opt-in check against the real Wikipedia API (network). Not part of the normal suite:
//   WIKI_API_CONTACT=<url-or-email> npm run test:live
import { buildUserAgent } from '../config/constants';
import { HOME_TITLE_BLOCKLIST } from '../config/homeBlocklist';
import { createWikiApi } from '../wiki-api/client';
import { createWikiHttp } from '../wiki-api/http';
import { createColumnFeed } from './columnFeed';
import { createHomeFeed } from './homeFeed';
import { resolveTopics } from './topicResolution';

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
      const pageMs = Date.now() - started;
      const resolved = await resolveTopics(api, page);
      const topicsMs = Date.now() - started - pageMs;
      console.log(`Octopus column — first page ${pageMs} ms, topics +${topicsMs} ms:\n${summary(resolved)}`);

      expect(page.length).toBe(20);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    'builds a Home page for Animals + Space + History',
    async () => {
      const feed = createHomeFeed(api, {
        interestTileIds: ['animals', 'space', 'history'],
        today: new Date(),
        visitedIds: new Set(),
        readIds: new Set(),
        blocklist: HOME_TITLE_BLOCKLIST,
      });

      const started = Date.now();
      const { cards: page } = await feed.nextPage();
      console.log(`Home — first page ${Date.now() - started} ms:\n${summary(page)}`);

      expect(page.length).toBeGreaterThanOrEqual(18);
    },
    LIVE_TIMEOUT_MS,
  );
});
