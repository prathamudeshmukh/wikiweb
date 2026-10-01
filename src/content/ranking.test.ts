import type { RankedLink } from '../wiki-api/types';
import { rankLinks } from './ranking';

const link = (title: string, popularity: number, isDisambiguation = false): RankedLink => ({
  pageId: title.length * 1000 + popularity,
  title,
  popularity,
  isDisambiguation,
});

describe('rankLinks', () => {
  it('orders links by popularity, most popular first', () => {
    const ranked = rankLinks([link('Squid', 0.2), link('Cephalopod', 0.9), link('Ink', 0.5)]);

    expect(ranked.map((r) => r.title)).toEqual(['Cephalopod', 'Ink', 'Squid']);
  });

  it('drops disambiguation pages and low-value titles', () => {
    const ranked = rankLinks([link('Mercury', 0.9, true), link('1998', 0.8), link('List of cephalopods', 0.7), link('Squid', 0.1)]);

    expect(ranked.map((r) => r.title)).toEqual(['Squid']);
  });

  it('breaks popularity ties alphabetically so order is stable', () => {
    const ranked = rankLinks([link('Beta', 0.5), link('Alpha', 0.5)]);

    expect(ranked.map((r) => r.title)).toEqual(['Alpha', 'Beta']);
  });

  it('returns plain page refs without ranking metadata', () => {
    const [first] = rankLinks([link('Squid', 0.2)]);

    expect(Object.keys(first).sort()).toEqual(['pageId', 'title']);
  });
});
