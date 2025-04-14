const path = require('path');
const { getBaseConfig } = require('@lark-plugins/webpack-config');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const packageRoot = path.resolve(__dirname, '..');
const config = getBaseConfig(packageRoot);

// HTMLWebpackPluginのfavicon設定を削除
config.plugins = config.plugins.map(plugin => {
  if (plugin.constructor.name === 'HtmlWebpackPlugin') {
    return new HtmlWebpackPlugin({
      template: path.resolve(packageRoot, 'public/index.html'),
      // favicon行を削除
    });
  }
  return plugin;
});

module.exports = config;
