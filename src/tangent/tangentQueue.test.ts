import type { Card } from '../content/card';
import { createTangentQueue } from './tangentQueue';

const card = (title: string): Card => ({
  pageId: title.length,
  title,
  description: null,
  extract: null,
  thumbnail: null,
  topic: { tileId: null, territory: null },
  topicIsFallback: true,
  source: 'link',
  visited: false,
  read: false,
});

describe('tangent queue', () => {
  it('hands a requested tangent to the next taker exactly once', () => {
    const queue = createTangentQueue();

    queue.request(card('Leonardo da Vinci'));

    expect(queue.take()?.title).toBe('Leonardo da Vinci');
    expect(queue.take()).toBeNull();
  });

  it('keeps only the latest request', () => {
    const queue = createTangentQueue();

    queue.request(card('Ink'));
    queue.request(card('Leonardo da Vinci'));

    expect(queue.take()?.title).toBe('Leonardo da Vinci');
  });

  it('notifies listeners when a tangent is requested, until they unsubscribe', () => {
    const queue = createTangentQueue();
    const listener = jest.fn();
    const unsubscribe = queue.subscribe(listener);

    queue.request(card('Ink'));
    unsubscribe();
    queue.request(card('Squid'));

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
