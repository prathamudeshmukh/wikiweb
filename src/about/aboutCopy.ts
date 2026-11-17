import { FEEDBACK } from '../config/constants';

/** The About & privacy page (SPEC.md §3.11). Every claim here must stay true of the code and the PostHog project. */
export const ABOUT_COPY = {
  intro: "Every article's links become the next column. Swipe left to follow one, right to come back, and see where you end up.",
  notAffiliated: 'Not affiliated with Wikipedia or the Wikimedia Foundation. Article text is from Wikipedia, CC BY-SA 4.0.',
  privacyHeading: 'What Tangent sends',
  sent:
    "Tangent sends anonymous usage stats: which cards you see, follow and read, including those articles' titles, " +
    'plus any rating or note you send from the feedback card. They help tune which articles come up.',
  notSent: "There's no account and Tangent never asks who you are. Your IP address isn't stored or used to locate you.",
  storage: {
    web: 'There are no cookies. Your browser keeps a random ID in local storage so visits can be counted together; it isn’t linked to you.',
    native: 'There are no cookies. The app keeps a random ID on your device so visits can be counted together; it isn’t linked to you.',
  },
  kept: 'Stats go to PostHog in the United States and are deleted after 12 months.',
  deleting: 'Because nothing ties them to you, we can’t single out your stats to delete them. Turn sharing off below and nothing new is sent.',
  switchNote: 'Includes the titles of articles you explore. Turning it off stops anything new being sent.',
  contact: `Questions or requests: ${FEEDBACK.email}`,
  credits: [
    { label: 'ARTICLES', text: 'Wikipedia, via the Wikimedia REST API. Text CC BY-SA 4.0; images under their own licences.' },
    { label: 'TYPE', text: 'Fraunces, Literata, IBM Plex Mono · SIL Open Font License' },
    { label: 'ICONS', text: 'Phosphor · MIT' },
    { label: 'STATS', text: 'PostHog' },
  ],
} as const;
