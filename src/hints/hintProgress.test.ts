import { afterFirstHop, afterFirstReturn, afterPeel, FRESH_PROGRESS, type HintProgress, knownExplorer } from './hintProgress';

const progress = (overrides: Partial<HintProgress> = {}): HintProgress => ({ ...FRESH_PROGRESS, ...overrides });

describe('hintProgress', () => {
  it('starts with both hints still to show', () => {
    expect(FRESH_PROGRESS).toEqual({ swipeHintShown: false, backHintShown: false, peelsSeen: 0 });
  });

  it('finishes the Home hint on the first hop and keeps the back hint', () => {
    expect(afterFirstHop(progress())).toEqual(progress({ swipeHintShown: true }));
  });

  it('finishes the back hint on the first return', () => {
    expect(afterFirstReturn(progress({ swipeHintShown: true }))).toEqual(progress({ swipeHintShown: true, backHintShown: true }));
  });

  it('returns the same object when a hint is already finished', () => {
    const done = progress({ swipeHintShown: true, backHintShown: true });

    expect(afterFirstHop(done)).toBe(done);
    expect(afterFirstReturn(done)).toBe(done);
  });

  it('counts peels while the Home hint is showing', () => {
    expect(afterPeel(afterPeel(progress()))).toEqual(progress({ peelsSeen: 2 }));
  });

  it('stops counting peels once the user has hopped', () => {
    const hopped = progress({ swipeHintShown: true, peelsSeen: 3 });

    expect(afterPeel(hopped)).toBe(hopped);
  });

  it('finishes both hints for someone who has explored before', () => {
    expect(knownExplorer(progress({ peelsSeen: 2 }))).toEqual(progress({ swipeHintShown: true, backHintShown: true, peelsSeen: 2 }));
  });
});
