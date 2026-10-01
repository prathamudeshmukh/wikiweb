import { CULTURE_MUSIC, fakeWikiApi, idOf, STEM_BIOLOGY } from './__testing__/fakeWikiApi';
import type { Card } from './card';
import { resolveTopics } from './topicResolution';

const card = (title: string, overrides: Partial<Card> = {}): Card => ({
  pageId: idOf(title),
  title,
  description: null,
  extract: `${title} text`,
  thumbnail: null,
  topic: { tileId: null, territory: 'cosmos' },
  topicIsFallback: true,
  source: 'link',
  visited: false,
  read: false,
  ...overrides,
});

describe('resolveTopics', () => {
  it('replaces fallback topics with the article’s own topic', async () => {
    const { api } = fakeWikiApi({ tags: { Squid: [STEM_BIOLOGY] } });

    const [squid] = await resolveTopics(api, [card('Squid')]);

    expect(squid.topic).toEqual({ tileId: 'animals', territory: 'life' });
    expect(squid.topicIsFallback).toBe(false);
  });

  it('keeps the fallback when an article has no usable topic', async () => {
    const { api } = fakeWikiApi({ tags: {} });
    const original = card('Obscure');

    const [obscure] = await resolveTopics(api, [original]);

    expect(obscure).toEqual(original);
  });

  it('asks only about cards still on a fallback, in batches of at most 20', async () => {
    const { api, calls } = fakeWikiApi({ tags: {} });
    const pending = Array.from({ length: 25 }, (_, i) => card(`Card ${i}`));

    await resolveTopics(api, [card('Done', { topicIsFallback: false }), ...pending]);

    expect(calls.topicTags.map((batch) => batch.length)).toEqual([20, 5]);
    expect(calls.topicTags.flat()).not.toContain(idOf('Done'));
  });

  it('does not call the API when nothing needs resolving', async () => {
    const { api, calls } = fakeWikiApi({});

    await resolveTopics(api, [card('Done', { topicIsFallback: false })]);

    expect(calls.topicTags).toHaveLength(0);
  });

  it('returns new card objects in the original order', async () => {
    const { api } = fakeWikiApi({ tags: { Song: [CULTURE_MUSIC] } });
    const input = [card('Rock'), card('Song')];

    const output = await resolveTopics(api, input);

    expect(output.map((c) => c.title)).toEqual(['Rock', 'Song']);
    expect(output[1]).not.toBe(input[1]);
    expect(input[1].topicIsFallback).toBe(true);
  });

  it('passes API failures to the caller', async () => {
    const { api } = fakeWikiApi({});
    api.topicTags = async () => {
      throw new Error('cirrusdoc unavailable');
    };

    await expect(resolveTopics(api, [card('Squid')])).rejects.toThrow('cirrusdoc unavailable');
  });
});
