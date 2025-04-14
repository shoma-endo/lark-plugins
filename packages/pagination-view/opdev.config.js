// 環境変数から設定を読み込む
require('dotenv').config();

module.exports = {
  appId: process.env.appId || 'cli_a75d52e28bf8d02d',
  blockTypeId: process.env.blockTypeId || 'blk_67d7eeff2ac000228957f635',
  entry: './dist'
};
