import { nodeQuery, resolvePick, widenedPath } from '../interests/interestPicks';
import type { PageRef, WikiApi } from '../wiki-api/types';
import { shuffledPagedStream, type Stream } from './refStream';

/** An article from an interest node, and the node's path — null once the pick has widened to its broad tile. */
export interface NodeRef {
  ref: PageRef;
  node: string | null;
}

export interface ExhaustedNode {
  path: string;
  /** Articles in the node's pool when it ran dry. */
  articleCount: number;
}

export interface NodeStreamOptions {
  api: WikiApi;
  /** A subfield or leaf path (SPEC.md §3.9). */
  path: string;
  isRead: (pageId: number) => boolean;
  /** Passes Home's title filters. Articles that fail can never be read, so they don't count towards the pool. */
  isEligible: (title: string) => boolean;
  random: () => number;
  /** The tile's own stream, for once the pick has widened all the way up. */
  broadStream: () => Stream<PageRef>;
  onExhausted: (node: ExhaustedNode) => void;
}

interface Level {
  path: string;
  stream: Stream<PageRef>;
  /** Every eligible article the node's search has listed so far. */
  pool: Set<number>;
}

/**
 * Best-known first, varied per session: relevance order, shuffled within each page (SPEC.md §5.5).
 * Niche pools have no reviewed articles, and random order surfaces their obscure tail first.
 */
function levelFor(api: WikiApi, path: string, random: () => number): Level | null {
  const pick = resolvePick(path)?.pick;
  const query = pick ? nodeQuery(pick) : null;
  if (!query) return null;
  return { path, stream: shuffledPagedStream((cursor) => api.search(query, cursor, 'relevance'), random), pool: new Set() };
}

/**
 * Articles from one subfield/leaf pick, skipping those already read. When every article in the node's pool has
 * been read, the node is reported exhausted and the stream widens to its parent: leaf → subfield → tile.
 * Exhaustion is asked again each time the stream runs dry, so reads made while browsing count.
 */
export function nodeStream(options: NodeStreamOptions): Stream<NodeRef> {
  const { api, isRead, isEligible, random, broadStream, onExhausted } = options;
  let level = levelFor(api, options.path, random);
  let broad: Stream<PageRef> | null = level ? null : broadStream();

  const isExhausted = ({ pool }: Level) => pool.size > 0 && [...pool].every(isRead);

  function widen(current: Level): void {
    onExhausted({ path: current.path, articleCount: current.pool.size });
    const parent = widenedPath(current.path);
    level = parent ? levelFor(api, parent, random) : null;
    if (!level) broad = broadStream();
  }

  return {
    async next() {
      for (;;) {
        if (broad) {
          const ref = await broad.next();
          return ref ? { ref, node: null } : null;
        }
        const current = level;
        if (!current) return null;
        const ref = await current.stream.next();
        if (!ref) {
          if (!isExhausted(current)) return null;
          widen(current);
          continue;
        }
        if (!isEligible(ref.title)) continue;
        current.pool.add(ref.pageId);
        if (!isRead(ref.pageId)) return { ref, node: current.path };
      }
    },
  };
}
