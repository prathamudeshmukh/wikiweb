import type { Card, CardSource } from '../content/card';
import { topicLabel, whyLine } from './whyLine';

const card = (source: CardSource, tileId: string | null = null): Card => ({
  pageId: 1,
  title: 'Squid',
  description: null,
  extract: 'Squid text',
  thumbnail: null,
  topic: { tileId, territory: tileId ? 'life' : null },
  topicIsFallback: false,
  source,
  visited: false,
  read: false,
});

describe('whyLine', () => {
  it.each([
    ['link', '↳ LINKED FROM OCTOPUS'],
    ['backlink', '↰ LINKS TO OCTOPUS'],
    ['morelike', '≈ SIMILAR TO OCTOPUS'],
    ['home_today', '☀ TODAY ON WIKIPEDIA'],
    ['home_wildcard', '✦ WILDCARD'],
  ] as const)('explains a %s card', (source, expected) => {
    expect(whyLine(card(source), 'Octopus')).toBe(expected);
  });

  it('names the interest a Home card came from', () => {
    expect(whyLine(card('home_interest', 'animals'), null)).toBe('★ YOU LIKE ANIMALS');
  });

  it('falls back to a generic line when an interest card has no topic', () => {
    expect(whyLine(card('home_interest'), null)).toBe('★ PICKED FOR YOU');
  });
});

describe('topicLabel', () => {
  it('returns the tile label for a card with a topic', () => {
    expect(topicLabel(card('link', 'film'))).toBe('Film & TV');
  });

  it('returns null when the card only has a territory', () => {
    expect(topicLabel(card('link'))).toBeNull();
  });
});
