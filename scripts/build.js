#!/usr/bin/env node

const { execSync } = require('child_process');
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

// 実行コマンドを出力ありで実行
function exec(command, cwd) {
  console.log(`${colors.cyan}> ${command}${colors.reset}`);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: cwd || process.cwd(),
    });
    return true;
  } catch (error) {
    console.error(`${colors.red}コマンド実行エラー: ${command}${colors.reset}`);
    return false;
  }
}

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

// ビルド処理の実行
async function build() {
  console.log(`${colors.bright}${colors.green}Larkプラグインのビルドを開始します...${colors.reset}\n`);
  let hasFailure = false;

  // 1. まずコアライブラリをビルド
  console.log(`${colors.yellow}コアライブラリをビルドしています...${colors.reset}`);
  const corePath = path.join(process.cwd(), 'packages', 'core');
  const coreSuccess = exec('pnpm run build', corePath);
  
  if (!coreSuccess) {
    console.error(`${colors.red}コアライブラリのビルドに失敗しました。中断します。${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}コアライブラリのビルドが完了しました。${colors.reset}\n`);
  
  // 2. 各プラグインのビルド
  const packages = getPackages().filter(p => p.name !== 'core');
  
  for (const pkg of packages) {
    const pkgJsonPath = path.join(pkg.path, 'package.json');
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const hasBuildScript = pkgJson.scripts && pkgJson.scripts.build;

    if (!hasBuildScript) {
      console.log(`${colors.blue}${pkg.name}にはbuildスクリプトが定義されていません。スキップします。${colors.reset}\n`);
      continue;
    }

    console.log(`${colors.yellow}${pkg.name}をビルドしています...${colors.reset}`);
    const success = exec('pnpm run build', pkg.path);
    
    if (success) {
      console.log(`${colors.green}${pkg.name}のビルドが完了しました。${colors.reset}\n`);
    } else {
      console.error(`${colors.red}${pkg.name}のビルドに失敗しました。続行します。${colors.reset}\n`);
      hasFailure = true;
    }
  }

  if (hasFailure) {
    process.exit(1);
  }

  console.log(`${colors.bright}${colors.green}ビルドが完了しました！${colors.reset}`);
}

// スクリプト実行
build().catch(err => {
  console.error(`${colors.red}エラーが発生しました:${colors.reset}`, err);
  process.exit(1);
}); 
