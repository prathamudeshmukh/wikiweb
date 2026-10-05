import type { Territory } from '../config/topicTiles';
import type { PageRef } from '../wiki-api/types';

/** What a find remembers of its card, so the Logbook draws it without the network. */
export interface FindDetails {
  tileId: string | null;
  territory: Territory | null;
  thumbnailUrl: string | null;
}

/** The expedition a find was made on. */
export interface FindExpedition {
  id: string;
  title: string;
}

/** An article the user kept with ✦ (SPEC.md §3.7). */
export interface Find extends PageRef, FindDetails {
  foundAt: number;
  /** Null when found on Home, outside any expedition. */
  expedition: FindExpedition | null;
}

/**
 * The article to keep. Details left undefined aren't known yet (the reader only knows the title) and are looked up
 * after the find is saved; null means known to be absent.
 */
export type FindPage = PageRef & Partial<FindDetails>;

/** Where ✦ was tapped. */
export type FindFrom = 'card' | 'reader' | 'peek' | 'list';
