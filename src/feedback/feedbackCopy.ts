import type { FeedbackRating } from '../analytics/events';

/** The words on the feedback card and its note sheet (DESIGN.md §5.14, §8). Upper-casing is the components' job. */
export const FEEDBACK_COPY = {
  eyebrow: 'Two expeditions in',
  title: 'Enjoying Tangent?',
  label: 'Tangent beta',
  expeditions: (n: number) => `${n} expeditions`,
  body: "You've wandered a couple of times now. Tell us how it's going: it shapes what we build next.",
  emailBody: "You're not sharing usage data, so nothing is sent from here. If you'd like to tell us how it's going, an email reaches us directly.",
  up: '👍 Yes',
  down: '👎 Not yet',
  email: 'Send feedback by email →',
  skip: '→ Swipe right to skip',
  /** Screen-reader actions on the card. */
  actions: { up: 'Yes', down: 'Not yet', email: 'Send feedback by email', skip: 'Skip' },
} as const;

interface SheetCopy {
  thanks: string;
  title: string;
  placeholder: string;
}

export const SHEET_COPY: Record<FeedbackRating, SheetCopy> = {
  up: { thanks: 'Thanks: noted 👍', title: 'Anything to add?', placeholder: 'What do you like most?' },
  down: { thanks: 'Thanks: noted 👎', title: 'What would make it better?', placeholder: 'What would make it better?' },
};

export const SHEET_FINE_PRINT = "Sent anonymously · don't include personal details";
