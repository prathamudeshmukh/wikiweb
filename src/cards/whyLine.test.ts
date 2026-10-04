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
  incomingLinks: null,
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

  it('names the territory a sideways card detours into', () => {
    expect(whyLine(card('sideways', 'art'), 'Octopus')).toBe('⤳ DETOUR INTO ART · LINKS TO OCTOPUS');
  });

  it('still marks a sideways card as a detour when its topic has no label', () => {
    expect(whyLine(card('sideways'), 'Octopus')).toBe('⤳ DETOUR · LINKS TO OCTOPUS');
  });

  it('names the interest a Home card came from', () => {
    expect(whyLine(card('home_interest', 'animals'), null)).toBe('★ YOU LIKE ANIMALS');
  });

  it('names the subfield or leaf pick a Home card came from (SPEC.md §3.9)', () => {
    const fromStoicism = { ...card('home_interest', 'philosophy'), interestNode: 'philosophy/ethics/stoicism' };

    expect(whyLine(fromStoicism, null)).toBe('★ YOU LIKE STOICISM');
  });

  it('keeps the card topic label from the article, not the node', () => {
    const fromStoicism = { ...card('home_interest', 'books'), interestNode: 'philosophy/ethics/stoicism' };

    expect(topicLabel(fromStoicism)).toBe('Books');
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
