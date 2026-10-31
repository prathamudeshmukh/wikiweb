import { FEEDBACK } from '../config/constants';
import { feedbackDue, noteOf } from './feedbackRules';

const FRESH = { impressions: 0, done: false };

describe('feedbackDue', () => {
  it('is due once enough expeditions are on record', () => {
    expect(feedbackDue(FRESH, FEEDBACK.minExpeditions)).toBe(true);
  });

  it('is not due before then', () => {
    expect(feedbackDue(FRESH, FEEDBACK.minExpeditions - 1)).toBe(false);
  });

  it('is never due again once answered or swiped away', () => {
    expect(feedbackDue({ impressions: 1, done: true }, FEEDBACK.minExpeditions)).toBe(false);
  });

  it('gives up after the last impression', () => {
    expect(feedbackDue({ impressions: FEEDBACK.maxImpressions, done: false }, FEEDBACK.minExpeditions)).toBe(false);
  });
});

describe('noteOf', () => {
  it('trims what was typed', () => {
    expect(noteOf('  Cards repeat  ')).toBe('Cards repeat');
  });

  it('caps a long note', () => {
    expect(noteOf('a'.repeat(FEEDBACK.noteMaxLength + 20))).toHaveLength(FEEDBACK.noteMaxLength);
  });

  it('has nothing to send for a blank note', () => {
    expect(noteOf('   ')).toBeNull();
  });
});
