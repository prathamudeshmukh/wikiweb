import type { Card } from '../content/card';

// Roughly what fits in the compass card's quote at its type size, about five lines on a phone.
const MAX_QUOTE_LENGTH = 140;
const SENTENCE_END = /[.!?]["”’)]?\s+/g;
// "U.S." or "J." end in a full stop without ending the sentence.
const INITIALS = /^(?:[A-Za-z]\.)+$/;
const TRAILING_PUNCTUATION = /[\s,;:—–-]+$/;
const ELLIPSIS = '…';

function sentencesOf(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  for (const match of text.matchAll(SENTENCE_END)) {
    const end = match.index + match[0].trimEnd().length;
    const lastWord = text.slice(start, end).split(/\s+/).pop() ?? '';
    if (INITIALS.test(lastWord)) continue;
    sentences.push(text.slice(start, end));
    start = match.index + match[0].length;
  }
  const rest = text.slice(start).trim();
  return rest ? [...sentences, rest] : sentences;
}

function trimToFit(sentence: string): string {
  const cut = sentence.slice(0, MAX_QUOTE_LENGTH);
  const atWord = cut.slice(0, cut.lastIndexOf(' ')).replace(TRAILING_PUNCTUATION, '');
  return `${atWord}${ELLIPSIS}`;
}

const fits = (sentence: string | undefined): sentence is string => sentence !== undefined && sentence.length <= MAX_QUOTE_LENGTH;

/**
 * The line the compass card shows while a column loads, picked once from the seed card (DESIGN.md §6.7):
 * its second sentence (the first is usually the definition), else the first, else the description.
 */
export function travelQuote({ extract, description }: Pick<Card, 'extract' | 'description'>): string | null {
  const [first, second] = sentencesOf(extract?.trim() ?? '');
  if (fits(second)) return second;
  if (fits(first)) return first;
  if (first) return trimToFit(first);
  return description?.trim() || null;
}
