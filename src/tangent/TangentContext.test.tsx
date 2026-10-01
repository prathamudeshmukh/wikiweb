import { renderHook } from '@testing-library/react-native';
import { makeArticle } from '../content/__testing__/fakeWikiApi';
import { cardFromArticle, TangentProvider, useTangentQueue } from './TangentContext';

describe('cardFromArticle', () => {
  it('turns a peeked article into a card whose topic resolves later', () => {
    const card = cardFromArticle(makeArticle('Leonardo da Vinci', { description: 'Italian polymath' }));

    expect(card).toMatchObject({ title: 'Leonardo da Vinci', description: 'Italian polymath', source: 'link', topicIsFallback: true });
    expect(card.topic).toEqual({ tileId: null, territory: null });
  });
});

describe('useTangentQueue', () => {
  it('shares one queue across the app', async () => {
    const { result, rerender } = await renderHook(() => useTangentQueue(), { wrapper: TangentProvider });
    const first = result.current;

    await rerender({});

    expect(result.current).toBe(first);
  });

  it('refuses to be used outside its provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useTangentQueue())).rejects.toThrow(/inside TangentProvider/);
  });
});
