import { newId } from './newId';

describe('newId', () => {
  it('never repeats within a launch', () => {
    const ids = new Set(Array.from({ length: 1000 }, newId));

    expect(ids.size).toBe(1000);
  });
});
