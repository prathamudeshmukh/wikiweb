import { canContinue, canSave, DEFAULT_INTERESTS, interestsSummary, MIN_INTERESTS, toggleInterest } from './interestSelection';

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

  it('only lets the user save picks that changed', () => {
    expect(canSave(['space', 'history', 'art'], ['art', 'space', 'history'])).toBe(false);
    expect(canSave(['space', 'history', 'art'], ['space', 'history', 'music'])).toBe(true);
  });

  it('counts tiles touched, not picks, towards the minimum', () => {
    expect(canContinue(['philosophy/logic', 'philosophy/ethics', 'space'])).toBe(false);
    expect(canContinue(['philosophy/logic', 'history/medieval', 'space'])).toBe(true);
  });

  it('clears a narrowed tile and everything below it when the tile is toggled off', () => {
    expect(toggleInterest(['space', 'philosophy/logic', 'philosophy/ethics'], 'philosophy')).toEqual(['space']);
  });

  it('never lets the user save fewer than three picks', () => {
    expect(canSave(['space', 'history', 'art'], ['space', 'history'])).toBe(false);
  });
});

describe('interestsSummary', () => {
  it('lists every pick by label when there are only a few', () => {
    expect(interestsSummary(['space', 'film', 'art'])).toBe('Space, Film & TV, Art');
  });

  it('names a narrowed tile once', () => {
    expect(interestsSummary(['philosophy/logic', 'philosophy/ethics', 'art'])).toBe('Philosophy, Art');
  });

  it('names the first three picks and counts the rest', () => {
    expect(interestsSummary(['space', 'history', 'music', 'food', 'sport'])).toBe('Space, History, Music +2');
  });
});
