const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite (web build) references a .wasm asset.
// Adding 'wasm' to assetExts lets Metro resolve it even on native targets.
config.resolver.assetExts.push('wasm');

module.exports = config;
