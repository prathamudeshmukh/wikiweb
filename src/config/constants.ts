export const WIKI = {
  actionApiUrl: 'https://en.wikipedia.org/w/api.php',
  restApiUrl: 'https://en.wikipedia.org/api/rest_v1',
  clientName: 'Tangent/0.1',
  /** Standard thumbnail step — non-standard widths are rejected by the thumbnail server. */
  thumbnailWidth: 500,
  extractSentences: 2,
} as const;

export const HTTP_RETRY = {
  attempts: 3,
  baseDelayMs: 300,
} as const;

export const FEED = {
  pageSize: 20,
  /** Max articles per hydrate call — TextExtracts returns at most 20 intro extracts per request. */
  hydrateBatch: 20,
  /** One backlink after every N primary (link / morelike) cards. */
  backlinkEveryN: 4,
  /** Ranking follows `gplcontinue` at most this many times (500 links each). */
  maxLinkRankPages: 3,
  searchPageSize: 20,
} as const;

export const TOPICS = {
  tagPrefix: 'classification.prediction.articletopic/',
  minScore: 500,
} as const;

/**
 * Wikimedia asks every client to identify itself with contact details; requests without them risk being blocked.
 * The contact (URL or email) is configuration, not code — it comes from EXPO_PUBLIC_WIKI_API_CONTACT.
 */
export function buildUserAgent(contact: string): string {
  const trimmed = contact.trim();
  if (!trimmed) throw new Error('A contact (URL or email) is required for the Wikipedia API user agent.');
  return `${WIKI.clientName} (${trimmed})`;
}
