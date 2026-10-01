import type { Paged } from '../wiki-api/types';

/** Pulls items one at a time from a lazily loaded source. Returns null once exhausted. */
export interface Stream<T> {
  next(): Promise<T | null>;
}

// Guards against a remote list that keeps returning empty pages with a cursor.
const DEFAULT_MAX_EMPTY_PAGES = 3;

/**
 * @param maxEmptyPages consecutive empty pages tolerated before giving up. Sources whose cursor is
 *   bounded (e.g. an article's section list) pass Infinity, since empty pages are normal there.
 */
export function pagedStream<T>(load: (cursor: string | null) => Promise<Paged<T>>, maxEmptyPages = DEFAULT_MAX_EMPTY_PAGES): Stream<T> {
  let buffer: readonly T[] = [];
  let cursor: string | null = null;
  let exhausted = false;

  return {
    async next() {
      for (let empty = 0; buffer.length === 0 && !exhausted && empty < maxEmptyPages; empty += 1) {
        const page = await load(cursor);
        buffer = page.items;
        cursor = page.next;
        exhausted = page.next === null;
      }
      const [head, ...rest] = buffer;
      buffer = rest;
      return head ?? null;
    },
  };
}

/** A source loaded in one call (e.g. today's featured pages). */
export function onceStream<T>(load: () => Promise<readonly T[]>): Stream<T> {
  return pagedStream(async () => ({ items: await load(), next: null }));
}

/**
 * A stream that turns failures into "nothing here" for the rest of the feed, reporting them via `onError`.
 * For garnish sources (backlinks, today, wildcards) whose failure must not end the feed.
 */
export function optionalStream<T>(stream: Stream<T>, onError: (error: unknown) => void): Stream<T> {
  let failed = false;
  return {
    async next() {
      if (failed) return null;
      try {
        return await stream.next();
      } catch (error) {
        failed = true;
        onError(error);
        return null;
      }
    },
  };
}

/** Drains `first`, then `second`. */
export function concatStreams<T>(first: Stream<T>, second: Stream<T>): Stream<T> {
  return {
    async next() {
      return (await first.next()) ?? second.next();
    },
  };
}
