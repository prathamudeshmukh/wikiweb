import type { Analytics } from '../analytics/analytics';
import type { FeedbackRating } from '../analytics/events';
import { reportError } from '../services/reportError';
import { type FeedbackChannel, feedbackDue, type FeedbackProgress, noteOf } from './feedbackRules';
import type { FeedbackStore } from './feedbackStore';

export interface FeedbackNudge {
  kind: 'feedback';
  expeditions: number;
  channel: FeedbackChannel;
}

/**
 * The one-time "Enjoying Tangent?" card (SPEC.md §3.10): due once enough expeditions are on record, until it is
 * answered, swiped away, or has dwelt on screen too often. Home's single nudge slot decides when it gets a turn.
 */
export interface FeedbackPrompt {
  load(): Promise<void>;
  /** A new expedition set off; counted at once so the next Home already knows. */
  expeditionStarted(): void;
  /** Nothing until saved progress and the usage-sharing choice are known, so nothing is overwritten or asked wrongly. */
  due(): FeedbackNudge | null;
  shown(): void;
  dismissed(how: 'swipe' | 'scrolled_past'): void;
  /**
   * A thumb was tapped: sent at once, and the card is spent. False when nothing was sent — already answered, or usage
   * sharing was turned off since the card appeared (it comes back later asking by email).
   */
  rated(rating: FeedbackRating): boolean;
  noted(rating: FeedbackRating, typed: string): void;
  /** The email path was taken (usage sharing off); nothing is sent from the app. */
  emailed(): void;
  whenSaved(): Promise<void>;
}

interface FeedbackPromptDeps {
  store: FeedbackStore;
  analytics: Analytics;
  expeditionCount: () => Promise<number>;
  /** Null until the saved choice has loaded. */
  isOptedOut: () => boolean | null;
}

export function createFeedbackPrompt({ store, analytics, expeditionCount, isOptedOut }: FeedbackPromptDeps): FeedbackPrompt {
  let progress: FeedbackProgress = { impressions: 0, done: false };
  let loaded = false;
  let expeditions = 0;
  let saving: Promise<void> = Promise.resolve();

  const persist = (next: FeedbackProgress) => {
    progress = next;
    saving = saving.then(() => store.save(next)).catch((error: unknown) => reportError('feedback.save', error));
  };
  const finish = () => persist({ ...progress, done: true });

  return {
    async load() {
      const [saved, count] = await Promise.all([store.load(), expeditionCount()]);
      progress = saved;
      expeditions = count;
      loaded = true;
    },
    expeditionStarted() {
      // One set off while loading may or may not be in the count already; leaving it out can only ask later, never early.
      if (loaded) expeditions += 1;
    },
    due() {
      const optedOut = isOptedOut();
      if (!loaded || optedOut === null || !feedbackDue(progress, expeditions)) return null;
      return { kind: 'feedback', expeditions, channel: optedOut ? 'email' : 'analytics' };
    },
    shown() {
      const impression = progress.impressions + 1;
      analytics.track({ name: 'feedback_shown', properties: { impression, expeditions } });
      persist({ ...progress, impressions: impression });
    },
    dismissed(how) {
      analytics.track({ name: 'feedback_dismissed', properties: { how, impression: progress.impressions } });
      if (how === 'swipe') finish();
    },
    rated(rating) {
      if (progress.done || isOptedOut() !== false) return false;
      analytics.track({ name: 'feedback_given', properties: { rating, expeditions, impression: progress.impressions } });
      finish();
      return true;
    },
    noted(rating, typed) {
      const note = noteOf(typed);
      if (note) analytics.track({ name: 'feedback_note', properties: { rating, note } });
    },
    emailed: finish,
    whenSaved: () => saving,
  };
}
