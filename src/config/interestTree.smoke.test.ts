// Live check that every interest-tree node still finds articles (SPEC.md §12). Not part of the normal suite:
//   WIKI_API_CONTACT=<url-or-email> npm run test:live
import { nodeQuery, resolvePick } from '../interests/interestPicks';
import { createWikiApi } from '../wiki-api/client';
import { createWikiHttp } from '../wiki-api/http';
import { buildUserAgent } from './constants';
import { INTEREST_TREES } from './interestTree';

const contact = process.env.WIKI_API_CONTACT;
const describeLive = contact ? describe : describe.skip;
const LIVE_TIMEOUT_MS = 180_000;
const PAUSE_MS = 100;

const allPaths = Object.entries(INTEREST_TREES).flatMap(([tileId, subfields]) =>
  subfields.flatMap((subfield) => [`${tileId}/${subfield.id}`, ...subfield.leaves.map((leaf) => `${tileId}/${subfield.id}/${leaf.id}`)]),
);

describeLive('live interest trees', () => {
  const api = createWikiApi(createWikiHttp({ fetchFn: fetch, userAgent: buildUserAgent(contact ?? '') }));

  it(
    'finds at least one article for every node',
    async () => {
      const empty: string[] = [];
      for (const path of allPaths) {
        const query = nodeQuery(resolvePick(path)!.pick)!;
        const page = await api.search(query, null, 'relevance');
        if (page.items.length === 0) empty.push(path);
        await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      }

      expect(empty).toEqual([]);
    },
    LIVE_TIMEOUT_MS,
  );
});
