import { HOME_SNAPSHOT } from '../config/constants';
import type { Card, CardSource } from '../content/card';
import { NO_TOPIC } from '../content/topics';
import { type HomeSnapshot, restorableCards, snapshotOf } from './homeSnapshot';

const card = (pageId: number, source: CardSource = 'home_interest'): Card => ({
  pageId,
  title: `Page ${pageId}`,
  description: null,
  extract: null,
  thumbnail: null,
  topic: NO_TOPIC,
  topicIsFallback: true,
  incomingLinks: null,
  source,
  visited: false,
  read: false,
});

const featuredOn = (pageId: number, day: string): Card => ({ ...card(pageId, 'home_today'), featuredOn: day });

const OCT_5 = new Date('2026-10-05T09:00:00Z');
const NOTHING_READ = (_pageId: number) => false;

const saved = (cards: Card[]): HomeSnapshot => snapshotOf({ interestsKey: 'space', cards });
const restoreOn5th = (snapshot: HomeSnapshot, isRead = NOTHING_READ) => restorableCards(snapshot, { interestsKey: 'space', now: OCT_5, isRead });

describe('snapshotOf', () => {
  it('keeps at most the configured number of cards', () => {
    const many = Array.from({ length: HOME_SNAPSHOT.maxCards + 5 }, (_, i) => card(i + 1));

    expect(saved(many).cards).toHaveLength(HOME_SNAPSHOT.maxCards);
  });
});

describe('restorableCards', () => {
  it('restores the saved cards in order for the same interests', () => {
    expect(restoreOn5th(saved([card(1), card(2)])).map((c) => c.pageId)).toEqual([1, 2]);
  });

  it('restores nothing when the interests have changed since it was saved', () => {
    const snapshot = saved([card(1)]);

    expect(restorableCards(snapshot, { interestsKey: 'history', now: OCT_5, isRead: NOTHING_READ })).toEqual([]);
  });

  it('leaves out articles read since', () => {
    const cards = restoreOn5th(saved([card(1), card(2)]), (pageId) => pageId === 1);

    expect(cards.map((c) => c.pageId)).toEqual([2]);
  });

  it('leaves out Today on Wikipedia cards featured on another day, however recently they were saved', () => {
    const snapshot = saved([card(1), featuredOn(2, '2026-10-04'), card(3, 'home_wildcard')]);

    expect(restoreOn5th(snapshot).map((c) => c.pageId)).toEqual([1, 3]);
  });

  it('keeps Today on Wikipedia cards on the day they were featured', () => {
    expect(restoreOn5th(saved([featuredOn(2, '2026-10-05')]))).toHaveLength(1);
  });

  it('leaves out Today on Wikipedia cards whose day is unknown', () => {
    expect(restoreOn5th(saved([card(2, 'home_today')]))).toEqual([]);
  });
});
