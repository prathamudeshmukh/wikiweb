import type { Paged } from '../wiki-api/types';
import { alternateStreams, optionalStream, pagedStream, primeInTurn, type Stream } from './refStream';

function countingLoader(items: readonly string[]) {
  const cursors: (string | null)[] = [];
  const load = async (cursor: string | null): Promise<Paged<string>> => {
    cursors.push(cursor);
    return { items: [...items], next: null };
  };
  return { load, cursors };
}

function primedSpy(): Stream<string> & { primedWith: number[] } {
  const primedWith: number[] = [];
  return { primedWith, next: async () => null, prime: (count: number) => void primedWith.push(count) };
}

describe('pagedStream.prime', () => {
  it('starts loading the first page before anything is asked for', () => {
    const { load, cursors } = countingLoader(['A']);

    pagedStream(load).prime?.(1);

    expect(cursors).toEqual([null]);
  });

  it('hands the primed page to the next item instead of loading it again', async () => {
    const { load, cursors } = countingLoader(['A', 'B']);
    const stream = pagedStream(load);

    stream.prime?.(2);
    const items = [await stream.next(), await stream.next()];

    expect(items).toEqual(['A', 'B']);
    expect(cursors).toEqual([null]);
  });

  it('loads nothing while the buffer still holds items', async () => {
    const { load, cursors } = countingLoader(['A', 'B']);
    const stream = pagedStream(load);
    await stream.next();

    stream.prime?.(1);

    expect(cursors).toEqual([null]);
  });

  it('reports a failed primed load when the item is asked for, and loads again after', async () => {
    let calls = 0;
    const stream = pagedStream(async () => {
      calls += 1;
      if (calls === 1) throw new Error('offline');
      return { items: ['A'], next: null };
    });

    stream.prime?.(1);
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(stream.next()).rejects.toThrow('offline');
    await expect(stream.next()).resolves.toBe('A');
  });
});

describe('primeInTurn', () => {
  it('spreads the draws over the streams in turn order, starting at the current turn', () => {
    const streams = [primedSpy(), primedSpy(), primedSpy()];

    primeInTurn(streams, 1, 4);

    expect(streams.map((s) => s.primedWith)).toEqual([[1], [2], [1]]);
  });

  it('leaves out streams that the draws never reach', () => {
    const streams = [primedSpy(), primedSpy(), primedSpy()];

    primeInTurn(streams, 0, 1);

    expect(streams.map((s) => s.primedWith)).toEqual([[1], [], []]);
  });
});

describe('prime on composed streams', () => {
  it('alternateStreams primes each source it will take from', () => {
    const streams = [primedSpy(), primedSpy()];

    alternateStreams(streams).prime?.(3);

    expect(streams.map((s) => s.primedWith)).toEqual([[2], [1]]);
  });

  it('optionalStream stops priming a source once it has failed', async () => {
    const spy = primedSpy();
    const failing = { ...spy, next: () => Promise.reject(new Error('down')) };
    const stream = optionalStream(failing, () => undefined);
    await stream.next();

    stream.prime?.(1);

    expect(spy.primedWith).toEqual([]);
  });
});
