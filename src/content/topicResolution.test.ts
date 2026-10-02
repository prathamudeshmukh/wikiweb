import { CULTURE_MUSIC, fakeWikiApi, idOf } from './__testing__/fakeWikiApi';
import { topicOfPage } from './topicResolution';

describe('topicOfPage', () => {
  it('finds one article’s own topic', async () => {
    const { api } = fakeWikiApi({ tags: { Song: [CULTURE_MUSIC] } });

    expect(await topicOfPage(api, idOf('Song'))).toEqual({ tileId: 'music', territory: 'culture' });
  });

  it('has no topic for an untagged article', async () => {
    const { api } = fakeWikiApi({});

    expect(await topicOfPage(api, idOf('Rock'))).toEqual({ tileId: null, territory: null });
  });
});
