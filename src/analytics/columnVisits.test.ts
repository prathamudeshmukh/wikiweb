import { makeCard, makeEntry } from './__testing__/analyticsFactories';
import { memoryAnalytics } from './__testing__/memoryAnalytics';
import { createColumnVisits } from './columnVisits';

const OCTOPUS = makeEntry('Octopus');

function setup() {
  let clock = 0;
  const analytics = memoryAnalytics();
  const visits = createColumnVisits({ analytics, now: () => clock });
  const advance = (ms: number) => {
    clock += ms;
  };
  return { analytics, visits, advance };
}

describe('column visits: card_seen', () => {
  it('reports a card the first time it is seen in a visit, with its column', () => {
    const { analytics, visits } = setup();
    visits.enter(OCTOPUS, 'idle');

    visits.cardSeen(OCTOPUS.id, makeCard('Squid'), 2);
    visits.cardSeen(OCTOPUS.id, makeCard('Squid'), 2);

    expect(analytics.named('card_seen')).toEqual([expect.objectContaining({ card_title: 'Squid', seed_title: 'Octopus', depth: 1, position: 2 })]);
  });

  it('names the subfield or leaf a Home card came from, and null otherwise (SPEC.md §11)', () => {
    const { analytics, visits } = setup();
    visits.enter(OCTOPUS, 'idle');

    visits.cardSeen(OCTOPUS.id, makeCard('Memento mori', { interestNode: 'philosophy/ethics/stoicism' }), 0);
    visits.cardSeen(OCTOPUS.id, makeCard('Squid'), 1);

    expect(analytics.named('card_seen').map((p) => p.interest_node)).toEqual(['philosophy/ethics/stoicism', null]);
  });

  it('ignores cards from a column that is not being visited', () => {
    const { analytics, visits } = setup();
    visits.enter(OCTOPUS, 'idle');

    visits.cardSeen(makeEntry().id, makeCard('Squid'), 0);

    expect(analytics.named('card_seen')).toEqual([]);
  });

  it('reports a card again on a later visit to the same column', () => {
    const { analytics, visits } = setup();
    visits.enter(OCTOPUS, 'idle');
    visits.cardSeen(OCTOPUS.id, makeCard('Squid'), 0);
    visits.leave('hop');

    visits.enter(OCTOPUS, 'idle');
    visits.cardSeen(OCTOPUS.id, makeCard('Squid'), 0);

    expect(analytics.named('card_seen')).toHaveLength(2);
  });
});

describe('column visits: column_left', () => {
  it('summarises how far the user got, what they read and how long they stayed', () => {
    const { analytics, visits, advance } = setup();
    visits.enter(OCTOPUS, 'idle');
    visits.cardSeen(OCTOPUS.id, makeCard('Squid'), 0);
    visits.cardSeen(OCTOPUS.id, makeCard('Cuttlefish'), 4);
    visits.cardOpened(makeCard('Cuttlefish'));
    advance(12_400);

    visits.leave('swipe');

    expect(analytics.named('column_left')).toEqual([
      { seed_title: 'Octopus', depth: 1, outcome: 'swipe', cards_seen: 2, deepest_position: 4, reads: 1, seconds: 12, feed_end: null },
    ]);
  });

  it('records a dead end the feed reached while on top', () => {
    const { analytics, visits } = setup();
    visits.enter(OCTOPUS, 'idle');

    visits.enter(OCTOPUS, 'done');
    visits.leave('swipe');

    expect(analytics.named('column_left')[0]).toMatchObject({ feed_end: 'dead_end', deepest_position: null });
  });

  it('records an error the feed had already hit before the column came on top', () => {
    const { analytics, visits } = setup();

    visits.enter(OCTOPUS, 'error');
    visits.leave('swipe');

    expect(analytics.named('column_left')[0].feed_end).toBe('error');
  });

  it('forgets an error the feed recovered from', () => {
    const { analytics, visits } = setup();
    visits.enter(OCTOPUS, 'error');

    visits.enter(OCTOPUS, 'idle');
    visits.leave('hop');

    expect(analytics.named('column_left')[0].feed_end).toBeNull();
  });

  it('does nothing when no column is being visited', () => {
    const { analytics, visits } = setup();

    visits.leave('swipe');

    expect(analytics.events()).toEqual([]);
  });

  it('closes a visit another column took over without a reason as replaced', () => {
    const { analytics, visits } = setup();
    visits.enter(makeEntry(), 'idle');

    visits.enter(OCTOPUS, 'idle');

    expect(analytics.named('column_left')).toEqual([expect.objectContaining({ seed_title: null, outcome: 'replaced' })]);
  });

  it('keeps the visit going when the same column is entered again', () => {
    const { analytics, visits } = setup();
    visits.enter(OCTOPUS, 'idle');

    visits.enter(OCTOPUS, 'idle');

    expect(analytics.events()).toEqual([]);
  });

  it('restarts a visit to the same column, closing the old one', () => {
    const { analytics, visits } = setup();
    visits.enter(makeEntry(), 'idle');
    visits.cardSeen('home', makeCard('Squid'), 0);

    visits.restart('refresh');
    visits.cardSeen('home', makeCard('Squid'), 0);

    expect(analytics.named('column_left')).toEqual([expect.objectContaining({ outcome: 'refresh', cards_seen: 1 })]);
    expect(analytics.named('card_seen')).toHaveLength(2);
  });
});

describe('column visits: reads and positions', () => {
  it('reports a read opened from a card with the card and its column', () => {
    const { analytics, visits } = setup();
    visits.enter(OCTOPUS, 'idle');
    visits.cardSeen(OCTOPUS.id, makeCard('Squid'), 3);

    visits.cardOpened(makeCard('Squid'));

    expect(analytics.named('read_open')).toEqual([expect.objectContaining({ entry: 'card', card_title: 'Squid', seed_title: 'Octopus', position: 3 })]);
  });

  it('knows where a seen card sat, and nothing about an unseen one', () => {
    const { visits } = setup();
    visits.enter(OCTOPUS, 'idle');
    visits.cardSeen(OCTOPUS.id, makeCard('Squid'), 3);

    expect(visits.positionOf(makeCard('Squid').pageId)).toBe(3);
    expect(visits.positionOf(makeCard('Ink').pageId)).toBeNull();
  });
});
