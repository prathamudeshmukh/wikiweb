import { topicFromWeightedTags } from './topics';

const tag = (name: string, score: number) => `classification.prediction.articletopic/${name}|${score}`;

describe('topicFromWeightedTags', () => {
  it('maps a specific tag to its tile and territory', () => {
    // Arrange — Squid's real tags
    const tags = [tag('STEM.Biology', 939), tag('STEM.STEM*', 982)];

    // Act
    const topic = topicFromWeightedTags(tags);

    // Assert
    expect(topic).toEqual({ tileId: 'animals', territory: 'life' });
  });

  it('prefers a mapped tile over a higher-scoring unmapped bucket', () => {
    const tags = [tag('Culture.Media.Media*', 970), tag('Culture.Media.Music', 966), tag('Culture.Biography.Biography*', 562)];

    expect(topicFromWeightedTags(tags)).toEqual({ tileId: 'music', territory: 'culture' });
  });

  it('maps nested sub-buckets like Visual_arts* to their tile', () => {
    expect(topicFromWeightedTags([tag('Culture.Visual_arts.Visual_arts*', 665)])).toEqual({ tileId: 'art', territory: 'culture' });
  });

  it('normalises "&" in tag names to match search keywords', () => {
    expect(topicFromWeightedTags([tag('STEM.Medicine_&_Health', 800)])).toEqual({ tileId: 'medicine', territory: 'life' });
  });

  it('gives territory but no tile when only a broad bucket is present', () => {
    // Ink's real tags
    expect(topicFromWeightedTags([tag('STEM.STEM*', 724)])).toEqual({ tileId: null, territory: 'cosmos' });
  });

  it('ignores tags below the minimum score', () => {
    expect(topicFromWeightedTags([tag('STEM.Biology', 499)])).toEqual({ tileId: null, territory: null });
  });

  it('ignores weighted tags that are not article topics', () => {
    const tags = ['classification.prediction.drafttopic/STEM.Biology|990', 'recommendation.tone/exists|1'];

    expect(topicFromWeightedTags(tags)).toEqual({ tileId: null, territory: null });
  });

  it('returns an empty topic for malformed or missing tags', () => {
    expect(topicFromWeightedTags(['classification.prediction.articletopic/garbage', ''])).toEqual({ tileId: null, territory: null });
    expect(topicFromWeightedTags([])).toEqual({ tileId: null, territory: null });
  });
});
