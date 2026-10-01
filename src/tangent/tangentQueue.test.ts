import { createHandoff } from './tangentQueue';

describe('hand-off', () => {
  it('hands a request to the next taker exactly once', () => {
    const handoff = createHandoff<string>();

    handoff.request('Leonardo da Vinci');

    expect(handoff.take()).toBe('Leonardo da Vinci');
    expect(handoff.take()).toBeNull();
  });

  it('keeps only the latest request', () => {
    const handoff = createHandoff<string>();

    handoff.request('Ink');
    handoff.request('Leonardo da Vinci');

    expect(handoff.take()).toBe('Leonardo da Vinci');
  });

  it('notifies listeners when something is requested, until they unsubscribe', () => {
    const handoff = createHandoff<string>();
    const listener = jest.fn();
    const unsubscribe = handoff.subscribe(listener);

    handoff.request('Ink');
    unsubscribe();
    handoff.request('Squid');

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
