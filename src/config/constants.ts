export const WIKI = {
  actionApiUrl: 'https://en.wikipedia.org/w/api.php',
  restApiUrl: 'https://en.wikipedia.org/api/rest_v1',
  clientName: 'Tangent/0.1',
  /** Standard thumbnail step — non-standard widths are rejected by the thumbnail server. */
  thumbnailWidth: 500,
  /** Enough intro text to fill a card's free height on a tall phone; the card trims the rest with an ellipsis. */
  extractChars: 600,
} as const;

export const HTTP_RETRY = {
  attempts: 3,
  baseDelayMs: 300,
  /** Upper bound on a server-requested Retry-After wait, so one throttled call can't stall a feed for minutes. */
  maxRetryAfterMs: 10_000,
  /** React Native's fetch has no default timeout; a stalled request would block a feed's queue forever. */
  timeoutMs: 15_000,
  /** Action API error codes (sent inside HTTP 200 bodies) that are worth retrying. */
  retryableApiCodes: ['ratelimited', 'maxlag', 'readonly', 'internal_api_error_DBQueryError'],
} as const;

/**
 * One token bucket for all Wikipedia requests (SPEC.md §6: ~10 back-to-back requests, then 429).
 * A column's first page costs ~7 requests, so the burst covers one on-screen column; prefetch keeps out of the reserve.
 */
export const REQUEST_BUDGET = {
  capacity: 8,
  refillIntervalMs: 250,
  prefetchReserve: 4,
} as const;

/** Dwell prefetch (SPEC.md §7). */
export const PREFETCH = {
  /** A card counts as dwelt on once this much of it is visible… */
  visiblePercent: 75,
  /** …for this long. */
  dwellMs: 600,
  maxConcurrent: 3,
  /** Finished prefetches kept for a later hop. */
  maxKept: 6,
} as const;

export const FEED = {
  pageSize: 20,
  /** Max articles per hydrate call — TextExtracts returns at most 20 intro extracts per request. */
  hydrateBatch: 20,
  /** One sideways card after every N primary (link / morelike) cards. */
  sidewaysEveryN: 4,
  /** Page size for search lists. */
  listPageSize: 20,
} as const;

/** Card ranking within a hydrated batch (SPEC.md §5.6). Tuned with `npm run eval:feeds`. */
export const RANKING = {
  /** At or above this many incoming links an article is a hub and sinks below every specific card (eval p90 ≈ 35k). */
  hubIncomingLinks: 20_000,
  /** Articles at or below this are specific enough; each tenfold beyond it costs `specificityWeight`. */
  specificIncomingLinks: 1_000,
  /** Assumed for cards whose count is unknown — the eval median. */
  unknownIncomingLinks: 2_000,
  specificityWeight: 1.5,
  /** First card in the batch gets the full weight, the last almost none. */
  positionWeight: 1,
  linksBackBonus: 1.5,
  /** Per extra time the seed links the card, capped. */
  mentionWeight: 0.5,
  maxExtraMentions: 3,
} as const;

/** Sections whose links are citations or housekeeping, not part of the article's web (SPEC.md §5.1). */
export const SKIPPED_SECTION_TITLES: ReadonlySet<string> = new Set([
  'Notes', 'References', 'External links', 'Further reading', 'Bibliography', 'Sources', 'Citations', 'Footnotes',
  'Works cited', 'Notes and references', 'References and notes',
]);

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
