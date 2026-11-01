import { FEEDBACK } from '../config/constants';

/** What the feedback card remembers between launches (SPEC.md §9 key-value storage). */
export interface FeedbackProgress {
  /** Times the card dwelt on screen. */
  impressions: number;
  /** Answered, or swiped away: never shown again. */
  done: boolean;
}

/** How the card asks: thumbs sent as events, or — with usage sharing off — an email the user writes. */
export type FeedbackChannel = 'analytics' | 'email';

export function feedbackDue({ impressions, done }: FeedbackProgress, expeditions: number): boolean {
  return !done && impressions < FEEDBACK.maxImpressions && expeditions >= FEEDBACK.minExpeditions;
}

/** The note as sent: trimmed and capped; null when there is nothing to send. */
export function noteOf(typed: string): string | null {
  const note = typed.trim().slice(0, FEEDBACK.noteMaxLength);
  return note.length > 0 ? note : null;
}
