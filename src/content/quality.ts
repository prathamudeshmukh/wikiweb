import type { Article } from '../wiki-api/types';

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';

// SPEC.md §5.3
const LOW_VALUE_TITLE_PATTERNS: readonly RegExp[] = [
  /^(List|Lists|Index|Outline) of /,
  /^\d{1,4}( BC| AD)?$/,
  new RegExp(`^(${MONTHS}) \\d{1,2}$`),
];

export function isLowValueTitle(title: string): boolean {
  return LOW_VALUE_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

export function isUsableArticle(article: Article): boolean {
  const hasText = Boolean(article.description?.trim() || article.extract?.trim());
  return hasText && !article.isDisambiguation && !isLowValueTitle(article.title);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesBlocklist(title: string, blocklist: readonly string[]): boolean {
  return blocklist.some((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i').test(title));
}
