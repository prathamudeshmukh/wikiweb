const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// SPEC.md §15.9 — zod re-exports every one of its ~50 message locales (~270 KB) as `z.locales`, and Metro keeps them all.
// The app never reads `z.locales`; its English default is imported by zod straight from `locales/en.js`.
const ZOD_LOCALES_INDEX = /[\\/]node_modules[\\/]zod[\\/]v4[\\/]locales[\\/]index\.js$/;
const NO_ZOD_LOCALES = path.join(__dirname, 'metro', 'zodLocales.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolution = context.resolveRequest(context, moduleName, platform);
  if (resolution.type === 'sourceFile' && ZOD_LOCALES_INDEX.test(resolution.filePath)) {
    return { type: 'sourceFile', filePath: NO_ZOD_LOCALES };
  }
  return resolution;
};

module.exports = config;
