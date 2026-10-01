// Records real Wikipedia API responses as test fixtures. Re-run when the API shape is in doubt:
//   WIKI_API_CONTACT=<url-or-email> node scripts/record-fixtures.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const OUT = new URL('../src/wiki-api/__fixtures__/', import.meta.url);
const ACTION_API = 'https://en.wikipedia.org/w/api.php';
const REST_API = 'https://en.wikipedia.org/api/rest_v1';
const CONTACT = process.env.WIKI_API_CONTACT;
if (!CONTACT) throw new Error('Set WIKI_API_CONTACT (URL or email) — Wikimedia requires contact details in the user agent.');
const HEADERS = { 'Api-User-Agent': `Tangent/0.1 fixture recorder (${CONTACT})` };

const CARD_PROPS = {
  prop: 'pageimages|description|extracts|pageprops',
  piprop: 'thumbnail',
  pithumbsize: '500',
  exintro: '1',
  explaintext: '1',
  exsentences: '2',
  exlimit: '20',
  ppprop: 'disambiguation',
};

async function action(params) {
  const url = new URL(ACTION_API);
  const all = { format: 'json', formatversion: '2', origin: '*', action: 'query', ...params };
  Object.entries(all).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

async function parse(params) {
  const url = new URL(ACTION_API);
  const all = { format: 'json', formatversion: '2', origin: '*', action: 'parse', ...params };
  Object.entries(all).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

async function rest(path) {
  const res = await fetch(`${REST_API}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} for ${path}`);
  return res.json();
}

async function save(name, data) {
  await writeFile(new URL(`${name}.json`, OUT), `${JSON.stringify(data, null, 1)}\n`);
  console.log('saved', name);
}

await mkdir(OUT, { recursive: true });

await save('sections-octopus', await parse({ page: 'Octopus', prop: 'sections' }));
const sectionText = { page: 'Octopus', prop: 'text', disableeditsection: '1', disablelimitreport: '1' };
await save('section-octopus-0', await parse({ ...sectionText, section: '0' }));
await save('section-octopus-1', await parse({ ...sectionText, section: '1' }));
await save(
  'hydrate-titles',
  await action({
    // Includes a redirect (Cephalopods), a normalisation (lowercase), a disambiguation page, a missing page, a list and a year.
    titles: 'Squid|Cephalopods|cuttlefish|Octopus (disambiguation)|No such page xyzzy|List of cephalopods|1998|Ink|Knot theory|Leonardo da Vinci',
    redirects: '1',
    ...CARD_PROPS,
  }),
);
await save('topics-mixed', await action({ pageids: '38011|20976520|15292|153008|18079|27973567', prop: 'cirrusdoc', cdincludes: 'weighted_tags' }));
await save(
  'backlinks-octopus',
  await action({ generator: 'backlinks', gbltitle: 'Octopus', gblnamespace: '0', gblfilterredir: 'nonredirects', gbllimit: '10', prop: 'pageprops', ppprop: 'disambiguation' }),
);
await save('morelike-octopus', await action({ generator: 'search', gsrsearch: 'morelike:Octopus', gsrlimit: '10', gsroffset: '0', gsrnamespace: '0' }));
await save(
  'topic-space-featured',
  await action({ generator: 'search', gsrsearch: 'articletopic:space incategory:Featured_articles', gsrlimit: '10', gsroffset: '0', gsrnamespace: '0' }),
);

const feed = await rest('/feed/featured/2026/10/01');
await save('featured-feed-2026-10-01', {
  tfa: feed.tfa,
  mostread: feed.mostread && { ...feed.mostread, articles: feed.mostread.articles.slice(0, 5) },
  onthisday: (feed.onthisday ?? []).slice(0, 3),
});
