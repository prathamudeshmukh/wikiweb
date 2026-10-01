import { makeArticle } from '../content/__testing__/fakeWikiApi';
import { cardFromArticle } from '../tangent/TangentContext';
import { parseReaderParams, readerParamsFor } from './readerParams';

const octopus = cardFromArticle(makeArticle('Octopus'));
const resolved = { ...octopus, topic: { tileId: 'animals', territory: 'life' as const }, topicIsFallback: false };

describe('reader params', () => {
  it('round-trips a card with a resolved topic', () => {
    expect(parseReaderParams(readerParamsFor(resolved))).toEqual({
      page: { title: 'Octopus', pageId: octopus.pageId },
      knownTopic: { tileId: 'animals', territory: 'life' },
    });
  });

  it('does not pass on a fallback topic as the article’s own', () => {
    const fallback = { ...octopus, topic: { tileId: 'animals', territory: 'life' as const } };

    expect(parseReaderParams(readerParamsFor(fallback))?.knownTopic).toBeNull();
  });

  it('rejects params without a usable page id', () => {
    expect(parseReaderParams({ title: 'Octopus', pageId: 'abc' })).toBeNull();
  });

  it('ignores an unknown topic', () => {
    expect(parseReaderParams({ title: 'Octopus', pageId: '7', tileId: 'retired' })?.knownTopic).toBeNull();
  });
});
