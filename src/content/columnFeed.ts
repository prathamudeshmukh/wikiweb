import { FEED, SKIPPED_SECTION_TITLES } from '../config/constants';
import { TOPIC_TILES } from '../config/topicTiles';
import type { ArticleLink, ArticleSection, PageRef, WikiApi } from '../wiki-api/types';
import type { Candidate, Card, CardSource } from './card';
import { type CandidateSource, createPagedFeed, type Feed } from './pagedFeed';
import type { RankingPolicy } from './ranking';
import { optionalStream, pagedStream, type Stream } from './refStream';
import type { CardTopic } from './topics';

export interface ColumnContext {
  seed: PageRef;
  /** Seeds from Home to this column (seed included) — never shown in it. */
  pathIds: ReadonlySet<number>;
  /** Pages elsewhere in the current expedition. */
  visitedIds: ReadonlySet<number>;
  readIds: ReadonlySet<number>;
  seedTopic: CardTopic;
  /** Told when an optional source (sideways) or ranking signals fail; the column carries on without them. */
  onSourceError?: (error: unknown) => void;
}

const LEAD_SECTION = 0;
// Sections made only of tables come back empty; the section list bounds the cursor, so there's no need to cap empty pages.
const NO_EMPTY_PAGE_CAP = Number.POSITIVE_INFINITY;

/** Lead, then each top-level section in order. Top-level sections include their subsections when fetched. */
function readableSections(sections: readonly ArticleSection[]): number[] {
  const fetchable = sections.filter((s) => Number.isInteger(s.index));
  const topLevel = Math.min(...fetchable.map((s) => s.level));
  const body = fetchable.filter((s) => s.level === topLevel && !SKIPPED_SECTION_TITLES.has(s.title)).map((s) => s.index);
  return [LEAD_SECTION, ...body];
}

/** The seed article's links in reading order, fetched one section at a time as the column needs them. */
function articleLinkStream(api: WikiApi, title: string): Stream<ArticleLink> {
  let sectionOrder: Promise<number[]> | null = null;
  // Cached once loaded; a failed load is forgotten so the next page can try again.
  const order = () =>
    (sectionOrder ??= api
      .sections(title)
      .then(readableSections)
      .catch((error: unknown) => {
        sectionOrder = null;
        throw error;
      }));

  return pagedStream(async (cursor) => {
    const position = Number(cursor ?? 0);
    // The lead is always section 0, so its links and the section list load in parallel.
    const [sections, links] = await Promise.all([
      order(),
      position === 0 ? api.sectionLinks(title, LEAD_SECTION) : order().then((s) => api.sectionLinks(title, s[position])),
    ]);
    const next = position + 1 < sections.length ? String(position + 1) : null;
    return { items: links, next };
  }, NO_EMPTY_PAGE_CAP);
}

/** "Mercury (planet)" → "Mercury": the words an article about it would actually use. */
function searchTerm(title: string): string {
  return title.replace(/\s*\([^)]*\)$/, '').replace(/"/g, '');
}

/**
 * Articles that link to the seed and talk about it, from outside the seed's territory (SPEC.md §5.1).
 * Ranked by search relevance — the raw backlinks list comes in page-id order, which is mostly mega-articles.
 */
function sidewaysQuery({ seed, seedTopic }: ColumnContext): string {
  const ownTerritory = TOPIC_TILES.filter((tile) => tile.territory === seedTopic.territory).flatMap((tile) => tile.searchTopics);
  const exclusions = ownTerritory.map((topic) => ` -articletopic:${topic}`).join('');
  return `linksto:"${seed.title.replace(/"/g, '')}" "${searchTerm(seed.title)}"${exclusions}`;
}

/**
 * SPEC.md §5.1: the article's own links in reading order, a sideways card after every few for surprise,
 * then `morelike` once the article runs out so the column never ends early.
 */
function columnCandidates(api: WikiApi, context: ColumnContext): CandidateSource {
  const { seed } = context;
  const fallbackTopic: CardTopic = { tileId: null, territory: context.seedTopic.territory };
  const links = articleLinkStream(api, seed.title);
  const moreLike = pagedStream((cursor) => api.moreLike(seed.title, cursor));
  const sideways = optionalStream(
    pagedStream((cursor) => api.search(sidewaysQuery(context), cursor)),
    context.onSourceError ?? (() => undefined),
  );
  // Without a seed territory nothing is excluded, so these are plain (relevance-ranked) backlinks.
  const sidewaysSource: CardSource = context.seedTopic.territory ? 'sideways' : 'backlink';
  let primaryCount = 0;
  let sidewaysDue = false;

  const candidate = (ref: Candidate['ref'], source: CardSource, mentions?: number): Candidate => ({ ref, source, fallbackTopic, mentions });

  async function primary(): Promise<Candidate | null> {
    const link = await links.next();
    if (link) return candidate({ title: link.title }, 'link', link.mentions);
    const similar = await moreLike.next();
    return similar ? candidate(similar, 'morelike') : null;
  }

  async function detour(): Promise<Candidate | null> {
    const ref = await sideways.next();
    return ref ? candidate(ref, sidewaysSource) : null;
  }

  return {
    async next() {
      if (sidewaysDue) {
        sidewaysDue = false;
        const surprise = await detour();
        if (surprise) return surprise;
      }
      const next = await primary();
      if (!next) return detour();
      // Counts candidates, not shown cards, so after heavy de-duplication detours come a little more often
      // than every N cards — an accepted approximation (keeps this source independent of the pager).
      primaryCount += 1;
      sidewaysDue = primaryCount % FEED.sidewaysEveryN === 0;
      return next;
    },
    accepts: () => true,
  };
}

const COLUMN_RANKING: RankingPolicy = { isRankable: (card: Card) => card.source === 'link' || card.source === 'morelike', gradeSpecificity: true };

export function createColumnFeed(api: WikiApi, context: ColumnContext): Feed {
  return createPagedFeed(api, columnCandidates(api, context), {
    excludeIds: new Set([...context.pathIds, context.seed.pageId]),
    annotations: { visitedIds: context.visitedIds, readIds: context.readIds },
    ranking: COLUMN_RANKING,
    relatedTo: context.seed.title,
    onSignalsError: context.onSourceError,
  });
}
