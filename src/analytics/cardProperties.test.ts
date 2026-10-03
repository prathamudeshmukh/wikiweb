import { makeCard, makeEntry } from './__testing__/analyticsFactories';
import { cardProperties, columnProperties } from './cardProperties';

describe('cardProperties', () => {
  it('describes the card by title, source, topic and place', () => {
    const card = makeCard('Octopus', { source: 'sideways' });

    expect(cardProperties(card, 3)).toEqual({ card_title: 'Octopus', source: 'sideways', topic: 'animals', territory: 'life', position: 3, hub: false });
  });

  it('flags hubs by incoming links and leaves the flag unknown without them', () => {
    expect(cardProperties(makeCard('United Kingdom', { incomingLinks: 365_000 }), 0).hub).toBe(true);
    expect(cardProperties(makeCard('Squid', { incomingLinks: null }), 0).hub).toBeNull();
  });

  it('reports no topic when the card only has its feed fallback', () => {
    const card = makeCard('Ink', { topicIsFallback: true });

    expect(cardProperties(card, null)).toMatchObject({ topic: null, territory: null, position: null });
  });
});

describe('columnProperties', () => {
  it('describes Home as depth 0 without a seed', () => {
    expect(columnProperties(makeEntry())).toEqual({ seed_title: null, depth: 0 });
  });

  it('describes a column by its seed and how deep it is', () => {
    expect(columnProperties(makeEntry('Octopus', 'Squid'))).toEqual({ seed_title: 'Squid', depth: 2 });
  });
});
