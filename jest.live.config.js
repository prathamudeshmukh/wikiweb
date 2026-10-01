// Live checks against the real Wikipedia API. Plain Node (real fetch) instead of the React Native preset.
//   WIKI_API_CONTACT=<url-or-email> npm run test:live
// babel-preset-expo ships inside expo's own dependencies; resolve it from there instead of adding a dependency.
const babelPresetExpo = require.resolve('babel-preset-expo', { paths: [require.resolve('expo/package.json')] });

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.smoke.test.ts'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: [babelPresetExpo] }] },
};
