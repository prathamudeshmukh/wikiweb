import { makeArticle } from './__testing__/fakeWikiApi';
import { type Card, type CardSource, toCard } from './card';
import { arrangeBatch, isHub, type Ranked, type RankingPolicy } from './ranking';

const NO_ANNOTATIONS = { visitedIds: new Set<number>(), readIds: new Set<number>() };
const NICHE = 300;
const HUB = 365_000;

interface Options {
  source?: CardSource;
  incomingLinks?: number | null;
  linksBack?: boolean;
  mentions?: number;
}

function ranked(title: string, { source = 'link', incomingLinks = NICHE, linksBack = false, mentions = 1 }: Options = {}): Ranked {
  const card = toCard(makeArticle(title), { ref: { title }, source, fallbackTopic: { tileId: null, territory: null } }, NO_ANNOTATIONS);
  return { card: { ...card, incomingLinks }, linksBack, mentions };
}

const COLUMN: RankingPolicy = { isRankable: (card: Card) => card.source === 'link', gradeSpecificity: true };
const titles = (cards: readonly Card[]) => cards.map((card) => card.title);

describe('isHub', () => {
  it('flags articles with a huge number of incoming links', () => {
    expect(isHub({ ...ranked('United Kingdom', { incomingLinks: HUB }).card })).toBe(true);
    expect(isHub({ ...ranked('Cephalopod ink').card })).toBe(false);
  });

  it('flags listed generic concepts even when the link count is unknown', () => {
    expect(isHub(ranked('Country', { incomingLinks: null }).card)).toBe(true);
  });
});

describe('arrangeBatch', () => {
  it('keeps reading order when nothing distinguishes the cards', () => {
    const batch = [ranked('A'), ranked('B'), ranked('C')];

    expect(titles(arrangeBatch(batch, COLUMN))).toEqual(['A', 'B', 'C']);
  });

  it('sinks hubs below every specific card, least-linked hub first', () => {
    const batch = [ranked('United Kingdom', { incomingLinks: HUB }), ranked('Species', { incomingLinks: 74_000 }), ranked('Portmanteau')];

    expect(titles(arrangeBatch(batch, COLUMN))).toEqual(['Portmanteau', 'Species', 'United Kingdom']);
  });

  it('lifts a card that links back to the seed above an earlier, unrelated one', () => {
    const batch = [ranked('Unrelated'), ranked('Related', { linksBack: true })];

    expect(titles(arrangeBatch(batch, COLUMN))).toEqual(['Related', 'Unrelated']);
  });

  it('lifts a card the article keeps linking', () => {
    const batch = [ranked('Passing mention'), ranked('Ragtime', { mentions: 8 })];

    expect(titles(arrangeBatch(batch, COLUMN))).toEqual(['Ragtime', 'Passing mention']);
  });

  it('prefers the more specific of two otherwise equal cards', () => {
    const batch = [ranked('Broad', { incomingLinks: 9_000 }), ranked('Narrow', { incomingLinks: 150 })];

    expect(titles(arrangeBatch(batch, COLUMN))).toEqual(['Narrow', 'Broad']);
  });

  it('leaves slot cards (e.g. sideways) where the feed put them', () => {
    const batch = [ranked('A'), ranked('B'), ranked('Detour', { source: 'sideways' }), ranked('Hub', { incomingLinks: HUB }), ranked('C')];

    expect(titles(arrangeBatch(batch, COLUMN))).toEqual(['A', 'B', 'Detour', 'C', 'Hub']);
  });

  it('demotes a hub that arrived in a slot, giving the slot to the next ranked card', () => {
    const batch = [ranked('A'), ranked('Albania', { source: 'sideways', incomingLinks: 39_000 }), ranked('B')];

    expect(titles(arrangeBatch(batch, COLUMN))).toEqual(['A', 'B', 'Albania']);
  });

  it('treats an unknown link count as neither niche nor hub', () => {
    const batch = [ranked('Broad', { incomingLinks: 15_000 }), ranked('Unknown', { incomingLinks: null }), ranked('Narrow', { incomingLinks: 100 })];

    expect(titles(arrangeBatch(batch, COLUMN))).toEqual(['Narrow', 'Unknown', 'Broad']);
  });

  it('can sink only hubs, leaving well-known but specific cards where they were', () => {
    const batch = [ranked('Sun', { incomingLinks: 10_000 }), ranked('Pleione (star)', { incomingLinks: 161 }), ranked('Moon', { incomingLinks: 25_000 })];

    expect(titles(arrangeBatch(batch, { ...COLUMN, gradeSpecificity: false }))).toEqual(['Sun', 'Pleione (star)', 'Moon']);
  });

  it('returns nothing for an empty batch', () => {
    expect(arrangeBatch([], COLUMN)).toEqual([]);
  });
});
