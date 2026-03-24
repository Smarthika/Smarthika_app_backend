const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname);

// Add Node.js polyfills for React Native
config.resolver.extraNodeModules = {
  crypto: require.resolve('crypto-browserify'),
  stream: require.resolve('stream-browserify'),
};
 
module.exports = withNativeWind(config, { input: './global.css' });