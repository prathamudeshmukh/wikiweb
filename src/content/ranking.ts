import type { PageRef, RankedLink } from '../wiki-api/types';
import { isLowValueTitle } from './quality';

/**
 * Orders a seed article's outgoing links for its column.
 * Pure popularity favours generic hubs (SPEC.md §6 ranking note) — this is the one place to change that.
 */
export function rankLinks(links: readonly RankedLink[]): PageRef[] {
  return links
    .filter((link) => !link.isDisambiguation && !isLowValueTitle(link.title))
    .slice()
    .sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title))
    .map(({ pageId, title }) => ({ pageId, title }));
}
