// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolver options to handle missing files and improve error reporting
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Enable better source maps
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Improve error reporting
config.server = {
  ...config.server,
  rewriteRequestUrl: (url) => {
    // Skip rewriting for debugging files
    if (url.includes('InternalBytecode.js')) {
      return url;
    }
    return url;
  },
};

module.exports = config;
