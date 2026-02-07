#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// カラー表示用
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// パッケージの一覧を取得
function getPackages() {
  const packagesDir = path.join(process.cwd(), 'packages');
  return fs
    .readdirSync(packagesDir)
    .map(dir => {
      const packagePath = path.join(packagesDir, dir);
      const packageJsonPath = path.join(packagePath, 'package.json');
      const packageJson = fs.existsSync(packageJsonPath)
        ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
        : null;
      const isIncluded = packageJson?.monorepo?.rootScripts !== false;
      return {
        name: dir,
        path: packagePath,
        packageJson,
        isIncluded,
      };
    })
    .filter(pkg => {
      return (
        fs.statSync(pkg.path).isDirectory() &&
        !!pkg.packageJson &&
        pkg.isIncluded
      );
    })
    .map(pkg => ({
      name: pkg.name,
      path: pkg.path,
    }));
}

// クリーン処理の実行
async function clean() {
  console.log(`${colors.bright}${colors.green}ビルド成果物をクリーンアップしています...${colors.reset}\n`);

  // 各パッケージのdistディレクトリを削除
  const packages = getPackages();
  
  for (const pkg of packages) {
    const distPath = path.join(pkg.path, 'dist');
    console.log(`${colors.yellow}${pkg.name} のdistディレクトリを削除しています...${colors.reset}`);
    
    try {
      if (fs.existsSync(distPath)) {
        fs.rmSync(distPath, { recursive: true, force: true });
        console.log(`${colors.green}${pkg.name} のdistディレクトリを削除しました。${colors.reset}`);
      } else {
        console.log(`${colors.blue}${pkg.name} にdistディレクトリが見つかりませんでした。${colors.reset}`);
      }
    } catch (error) {
      console.error(`${colors.red}${pkg.name} のdistディレクトリの削除に失敗しました:${colors.reset}`, error);
    }
  }

  console.log(`\n${colors.bright}${colors.green}クリーンアップが完了しました！${colors.reset}`);
}

// スクリプト実行
clean().catch(err => {
  console.error(`${colors.red}エラーが発生しました:${colors.reset}`, err);
  process.exit(1);
}); 
