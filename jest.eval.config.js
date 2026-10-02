// Feed quality evaluation against the real Wikipedia API (network). Prints cards; asserts nothing.
//   npm run eval:feeds   (loads .env.local)
const live = require('./jest.live.config');

// babel-preset-expo rewrites `process.env.EXPO_PUBLIC_*` for the app bundle, so the eval reads a plain name instead.
process.env.WIKI_API_CONTACT ??= process.env.EXPO_PUBLIC_WIKI_API_CONTACT;

module.exports = {
  ...live,
  testMatch: ['<rootDir>/scripts/**/*.eval.ts'],
};
