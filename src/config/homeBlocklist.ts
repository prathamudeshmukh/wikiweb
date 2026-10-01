// Home interest feed only (SPEC.md §3.2). Columns the user swipes into are never filtered by this list.
// Whole-word, case-insensitive match against the article title. Edit freely.
export const HOME_TITLE_BLOCKLIST: readonly string[] = [
  'sex',
  'sexual',
  'sexuality',
  'porn',
  'pornography',
  'pornographic',
  'erotic',
  'fetish',
  'genital',
  'genitalia',
  'vagina',
  'penis',
  'masturbation',
  'prostitution',
  'rape',
  'suicide',
];
