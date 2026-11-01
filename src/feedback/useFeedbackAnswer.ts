import { useCallback, useMemo, useState } from 'react';
import type { FeedbackRating } from '../analytics/events';
import { useAppServices } from '../services/AppServices';
import { openFeedbackMail } from './feedbackMail';

/** What answering the feedback card does (SPEC.md §3.10). `rating` is set while the note sheet is open. */
export interface FeedbackAnswer {
  rating: FeedbackRating | null;
  rate(rating: FeedbackRating): void;
  send(note: string): void;
  close(): void;
  email(): Promise<void>;
}

/** `onAnswered` takes the card off Home once it has been answered either way. */
export function useFeedbackAnswer(onAnswered: () => void): FeedbackAnswer {
  const { feedback } = useAppServices();
  const [rating, setRating] = useState<FeedbackRating | null>(null);

  const rate = useCallback(
    (next: FeedbackRating) => {
      const sent = feedback.rated(next);
      onAnswered();
      if (sent) setRating(next);
    },
    [feedback, onAnswered],
  );
  const close = useCallback(() => setRating(null), []);
  const send = useCallback(
    (note: string) => {
      if (rating) feedback.noted(rating, note);
      setRating(null);
    },
    [feedback, rating],
  );
  const email = useCallback(async () => {
    feedback.emailed();
    onAnswered();
    await openFeedbackMail();
  }, [feedback, onAnswered]);

  return useMemo(() => ({ rating, rate, send, close, email }), [rating, rate, send, close, email]);
}
