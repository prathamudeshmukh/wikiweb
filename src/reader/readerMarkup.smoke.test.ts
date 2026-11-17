// Opt-in check against the real Wikipedia API (network). Not part of the normal suite:
//   WIKI_API_CONTACT=<url-or-email> npm run test:live
// Night atlas reading (#39) relies on two things about Wikipedia's markup. If either changes, revisit readerDocument.
import { buildUserAgent } from '../config/constants';
import { createWikiApi } from '../wiki-api/client';
import { createWikiHttp } from '../wiki-api/http';

const contact = process.env.WIKI_API_CONTACT;
const describeLive = contact ? describe : describe.skip;
const LIVE_TIMEOUT_MS = 30_000;

describeLive('live reader markup', () => {
  const api = createWikiApi(createWikiHttp({ fetchFn: fetch, userAgent: buildUserAgent(contact ?? '') }));

  it(
    'serves math as MathML, which takes the reader’s ink, rather than images that would need inverting',
    async () => {
      const html = await api.articleHtml("Euler's identity");

      expect(html).toMatch(/<math[^>]*class="mwe-math-element/);
      expect(html).not.toContain('mwe-math-fallback-image');
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    'still tags line art for inverting with skin-invert-image',
    async () => {
      const html = await api.articleHtml('Matrix (mathematics)');

      expect(html).toContain('skin-invert-image');
    },
    LIVE_TIMEOUT_MS,
  );
});
