import { FEED } from '../config/constants';
import type { WikiApi } from '../wiki-api/types';
import { type Annotations, type Candidate, type Card, toCard } from './card';
import { isUsableArticle } from './quality';

export interface FeedPage {
  cards: Card[];
  /** True only when every source is exhausted. An empty page with `done: false` just means "ask again". */
  done: boolean;
}

export interface Feed {
  nextPage(): Promise<FeedPage>;
}

export interface CandidateSource {
  next(): Promise<Candidate | null>;
  /** Feed-specific veto after hydration (e.g. Home blocklist). */
  accepts(card: Card): boolean;
}

export interface FeedOptions {
  /** Never shown — e.g. the column's own path. */
  excludeIds: ReadonlySet<number>;
  annotations: Annotations;
}

// Bounds the work (and requests) for one page when most candidates get filtered out.
const MAX_BATCHES_PER_PAGE = 5;

/** Mutable bookkeeping private to one feed instance. */
interface FeedState {
  readonly api: WikiApi;
  readonly source: CandidateSource;
  readonly options: FeedOptions;
  readonly seenIds: Set<number>;
  readonly seenTitles: Set<string>;
  /** Collected but not yet hydrated — survives a failed hydrate or source error, so nothing is skipped. */
  pending: readonly Candidate[];
  /** Hydrated cards beyond the last page, shown first next time. */
  ready: readonly Card[];
  sourceDone: boolean;
}

const alreadySeen = (state: FeedState, { ref }: Candidate) =>
  state.seenTitles.has(ref.title) || (ref.pageId !== undefined && state.seenIds.has(ref.pageId));

/** Tops `pending` up to a full hydrate batch. A source error propagates, but what was collected stays pending. */
async function fillPending(state: FeedState): Promise<void> {
  while (!state.sourceDone && state.pending.length < FEED.hydrateBatch) {
    const candidate = await state.source.next();
    if (!candidate) {
      state.sourceDone = true;
    } else if (!alreadySeen(state, candidate)) {
      state.seenTitles.add(candidate.ref.title);
      state.pending = [...state.pending, candidate];
    }
  }
}

/** De-duplicates by page id after hydrating, since two titles can redirect to one article. */
async function hydratePending(state: FeedState): Promise<Card[]> {
  const batch = state.pending;
  const articles = await state.api.hydrate(batch.map((c) => c.ref.title));
  state.pending = [];
  return batch.flatMap((candidate) => {
    const article = articles.get(candidate.ref.title);
    if (!article || state.seenIds.has(article.pageId)) return [];
    state.seenIds.add(article.pageId);
    if (!isUsableArticle(article)) return [];
    const card = toCard(article, candidate, state.options.annotations);
    return state.source.accepts(card) ? [card] : [];
  });
}

async function buildPage(state: FeedState): Promise<FeedPage> {
  let cards: readonly Card[] = state.ready;
  state.ready = [];
  for (let batch = 0; batch < MAX_BATCHES_PER_PAGE && cards.length < FEED.pageSize; batch += 1) {
    try {
      await fillPending(state);
      if (state.pending.length === 0) break;
      cards = [...cards, ...(await hydratePending(state))];
    } catch (error) {
      // Show what we have; the failed work is still pending and is retried on the next call.
      if (cards.length === 0) throw error;
      break;
    }
  }
  state.ready = cards.slice(FEED.pageSize);
  const done = state.sourceDone && state.pending.length === 0 && state.ready.length === 0;
  return { cards: cards.slice(0, FEED.pageSize), done };
}

/** Turns a stream of candidates into pages of usable, de-duplicated cards, hydrated in full batches. */
export function createPagedFeed(api: WikiApi, source: CandidateSource, options: FeedOptions): Feed {
  const state: FeedState = {
    api,
    source,
    options,
    seenIds: new Set(options.excludeIds),
    seenTitles: new Set(),
    pending: [],
    ready: [],
    sourceDone: false,
  };
  let queue: Promise<unknown> = Promise.resolve();

  return {
    nextPage() {
      // Serialised: two overlapping calls get two different pages, never the same candidates.
      const page = queue.then(() => buildPage(state));
      queue = page.catch(() => undefined);
      return page;
    },
  };
}
