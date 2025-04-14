const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ビルドコマンドを実行
try {
  console.log('Building project...');
  // cross-envの代わりに直接環境変数を設定
  execSync('npx webpack --mode production --config ./config/webpack.config.js', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      // 環境変数でエラーを回避
      SKIP_FEISHU_DEVTOOLS: 'true'
    }
  });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

// アップロードコマンドを実行
try {
  console.log('Uploading to Lark Base...');
  execSync('npx @lark-opdev/cli upload ./dist', {
    stdio: 'inherit'
  });
  console.log('Upload completed successfully!');
} catch (error) {
  console.error('Upload failed:', error);
  process.exit(1);
}
