const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Reduce file watchers by excluding more directories
config.watchFolders = [__dirname];
config.resolver.blacklistRE =
  /(node_modules\/.*\/node_modules\/.*|\.expo\/.*|android\/.*|ios\/.*)/;

// Disable watching for certain file types
config.resolver.sourceExts = ["js", "jsx", "json", "ts", "tsx"];

module.exports = config;
