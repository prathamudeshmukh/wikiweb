import type { ViewToken } from 'react-native';
import { makeArticle } from '../content/__testing__/fakeWikiApi';
import { type Card, toCard } from '../content/card';
import { cardTokens, columnItems, type ColumnItem, nudgeVisibility } from './columnItems';

const card = (title: string): Card =>
  toCard(makeArticle(title), { ref: { title }, source: 'home_interest', fallbackTopic: { tileId: 'space', territory: 'cosmos' } }, { visitedIds: new Set(), readIds: new Set() });
const cards = ['A', 'B', 'C', 'D'].map(card);

describe('columnItems', () => {
  it('is just the cards, with their places, when there is no nudge', () => {
    const items = columnItems(cards, null);

    expect(items.map((i) => (i.kind === 'card' ? i.position : -1))).toEqual([0, 1, 2, 3]);
  });

  it('puts the nudge at its index and keeps card positions counting cards only', () => {
    const items = columnItems(cards, 2);

    expect(items.map((i) => (i.kind === 'card' ? `${i.card.title}@${i.position}` : 'nudge'))).toEqual(['A@0', 'B@1', 'nudge', 'C@2', 'D@3']);
  });

  it('puts the nudge last when its index is past the loaded cards', () => {
    expect(columnItems(cards.slice(0, 1), 3).map((i) => i.kind)).toEqual(['card', 'nudge']);
  });

  it('leaves the nudge out until Home has a card to open on', () => {
    expect(columnItems([], 3)).toEqual([]);
  });
});

const token = (item: ColumnItem, isViewable: boolean, index: number): ViewToken<ColumnItem> => ({ item, key: String(index), index, isViewable });

describe('cardTokens / nudgeVisibility', () => {
  const items = columnItems(cards, 1);

  it('turns list tokens into card tokens at their card positions', () => {
    const out = cardTokens([token(items[0], true, 0), token(items[1], true, 1), token(items[2], true, 2)]);

    expect(out.map((t) => [t.item.title, t.index])).toEqual([
      ['A', 0],
      ['B', 1],
    ]);
  });

  it("reports the nudge's visibility when it changed", () => {
    expect(nudgeVisibility([token(items[1], true, 1)])).toBe(true);
    expect(nudgeVisibility([token(items[1], false, 1)])).toBe(false);
    expect(nudgeVisibility([token(items[0], true, 0)])).toBeNull();
  });
});
