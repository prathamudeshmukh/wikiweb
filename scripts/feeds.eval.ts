// Prints what columns and Home actually show, with each card's incoming-link count, so ranking thresholds are
// picked from real distributions. Network; asserts nothing.   npm run eval:feeds  (reads .env.local)
import { buildUserAgent } from '../src/config/constants';
import { HOME_TITLE_BLOCKLIST } from '../src/config/homeBlocklist';
import type { Card } from '../src/content/card';
import { createColumnFeed } from '../src/content/columnFeed';
import { createHomeFeed } from '../src/content/homeFeed';
import { topicOfPage } from '../src/content/topicResolution';
import { topicLabel } from '../src/cards/whyLine';
import { createWikiApi } from '../src/wiki-api/client';
import { createWikiHttp } from '../src/wiki-api/http';

const CARDS_SHOWN = 10;
const TOP_SLOTS = 5;
const CANDIDATE_THRESHOLDS = [2_000, 5_000, 10_000, 20_000, 50_000];
const PERCENTILES = [0.1, 0.25, 0.5, 0.75, 0.9, 0.95];
const EVAL_TIMEOUT_MS = 15 * 60_000;

const SEEDS = [
  'Octopus', 'Brexit', 'Leonardo da Vinci', 'Mercury (planet)', 'Jazz', 'Sourdough', 'Byzantine Empire',
  'Black hole', 'Tetris', 'Stoicism', 'Bicycle', 'Penicillin', 'Mount Everest', 'Moby-Dick', 'Formula One',
];
const HOME_INTERESTS: readonly (readonly string[])[] = [['animals', 'space', 'history'], ['places', 'food', 'music'], ['tech', 'books', 'philosophy']];

function contactFromEnv(): string {
  const contact = process.env.WIKI_API_CONTACT;
  if (!contact) throw new Error('No Wikipedia API contact — run via `npm run eval:feeds`, which loads .env.local.');
  return contact;
}

const api = createWikiApi(createWikiHttp({ fetchFn: fetch, userAgent: buildUserAgent(contactFromEnv()) }));

type Row = Card;

function table(heading: string, rows: readonly Row[]): string {
  const lines = rows.map((card, i) => {
    const topic = topicLabel(card) ?? card.topic.territory ?? '-';
    return `${String(i + 1).padStart(3)}  ${String(card.incomingLinks ?? '?').padStart(8)}  ${card.source.padEnd(13)} ${topic.padEnd(11)} ${card.title}`;
  });
  return [`\n=== ${heading}`, '  #     links  source        topic       title', ...lines].join('\n');
}

function percentile(sorted: readonly number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function summary(label: string, groups: readonly (readonly Row[])[]): string {
  const counts = groups.flat().flatMap((row) => (row.incomingLinks === null ? [] : [row.incomingLinks])).sort((a, b) => a - b);
  const distribution = PERCENTILES.map((p) => `p${p * 100}=${percentile(counts, p)}`).join('  ');
  const topSlots = groups.flatMap((rows) => rows.slice(0, TOP_SLOTS));
  const hubRates = CANDIDATE_THRESHOLDS.map((threshold) => {
    const hubs = topSlots.filter((row) => (row.incomingLinks ?? 0) >= threshold).length;
    return `≥${threshold}: ${hubs}/${topSlots.length}`;
  }).join('  ');
  return `\n### ${label}\nincoming links (${counts.length} cards): ${distribution}\nhubs in top ${TOP_SLOTS}: ${hubRates}`;
}

async function columnRows(title: string): Promise<Row[]> {
  const article = (await api.hydrate([title])).get(title);
  if (!article) throw new Error(`Seed "${title}" not found.`);
  const feed = createColumnFeed(api, {
    seed: article,
    pathIds: new Set([article.pageId]),
    visitedIds: new Set(),
    readIds: new Set(),
    seedTopic: await topicOfPage(api, article.pageId),
  });
  const { cards } = await feed.nextPage();
  return cards.slice(0, CARDS_SHOWN);
}

async function homeRows(interestTileIds: readonly string[]): Promise<Row[]> {
  const feed = createHomeFeed(api, { interestTileIds, today: new Date(), visitedIds: new Set(), isRead: () => false, blocklist: HOME_TITLE_BLOCKLIST });
  const { cards } = await feed.nextPage();
  return cards.slice(0, CARDS_SHOWN);
}

it(
  'evaluates columns and Home',
  async () => {
    const report: string[] = [];
    const columns: Row[][] = [];
    for (const seed of SEEDS) {
      const rows = await columnRows(seed);
      columns.push(rows);
      report.push(table(`Column: ${seed}`, rows));
    }
    const homes: Row[][] = [];
    for (const interests of HOME_INTERESTS) {
      const rows = await homeRows(interests);
      homes.push(rows);
      report.push(table(`Home: ${interests.join(' + ')}`, rows));
    }
    report.push(summary('Columns', columns), summary('Home', homes));
    console.log(report.join('\n'));
  },
  EVAL_TIMEOUT_MS,
);
