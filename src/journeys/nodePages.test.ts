import { makeArticle } from '../content/__testing__/fakeWikiApi';
import { cardFromArticle } from '../tangent/TangentContext';
import { makeNode } from './__testing__/journeyFactories';
import { nodePageOf, resumedColumnOf } from './nodePages';

describe('nodePageOf', () => {
  it('keeps the card’s topic and thumbnail for the route and seed header', () => {
    const card = { ...cardFromArticle(makeArticle('Octopus', { thumbnail: { url: 'https://img/o.jpg', width: 500, height: 300 } })), topic: { tileId: 'animals', territory: 'life' as const } };

    expect(nodePageOf(card)).toEqual({ pageId: card.pageId, title: 'Octopus', tileId: 'animals', territory: 'life', thumbnailUrl: 'https://img/o.jpg' });
  });
});

describe('resumedColumnOf', () => {
  it('reopens a node as the column it opened', () => {
    const node = makeNode('n1', 'Octopus', { tileId: 'animals', territory: 'life', thumbnailUrl: 'https://img/o.jpg' });

    expect(resumedColumnOf(node)).toEqual({
      ref: { pageId: node.pageId, title: 'Octopus' },
      topic: { tileId: 'animals', territory: 'life' },
      thumbnailUrl: 'https://img/o.jpg',
      nodeId: 'n1',
    });
  });
});
