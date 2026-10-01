import { canContinue, DEFAULT_INTERESTS, MIN_INTERESTS, toggleInterest } from './interestSelection';

describe('interest selection', () => {
  it('adds an interest that is not selected', () => {
    expect(toggleInterest(['space'], 'history')).toEqual(['space', 'history']);
  });

  it('removes an interest that is already selected', () => {
    expect(toggleInterest(['space', 'history'], 'space')).toEqual(['history']);
  });

  it('never changes the array it was given', () => {
    const selected = Object.freeze(['space']);

    toggleInterest(selected, 'history');

    expect(selected).toEqual(['space']);
  });

  it('only lets the user continue with at least three picks', () => {
    expect(canContinue(['space', 'history'])).toBe(false);
    expect(canContinue(['space', 'history', 'art'])).toBe(true);
  });

  it('ships defaults that satisfy the minimum', () => {
    expect(DEFAULT_INTERESTS.length).toBeGreaterThanOrEqual(MIN_INTERESTS);
  });
});
