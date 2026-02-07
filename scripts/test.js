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
      hasTests:
        fs.existsSync(path.join(pkg.path, 'src', '__tests__')) ||
        fs.existsSync(path.join(pkg.path, 'test')),
    }));
}

// テスト処理の実行
async function test() {
  console.log(`${colors.bright}${colors.green}Larkプラグインのテストを開始します...${colors.reset}\n`);
  let hasFailure = false;
  const packages = getPackages();

  // Lint実行
  console.log(`${colors.yellow}リントを実行しています...${colors.reset}`);
  const lintTargets = packages
    .map(pkg => path.join(pkg.path, 'src'))
    .filter(srcPath => fs.existsSync(srcPath));
  const lintCommand =
    lintTargets.length > 0
      ? `eslint ${lintTargets.join(' ')} --ext .ts,.tsx`
      : '';
  const lintSuccess = lintCommand ? exec(lintCommand) : true;
  
  if (!lintSuccess) {
    console.error(`${colors.red}リントでエラーが検出されました。${colors.reset}\n`);
    hasFailure = true;
  } else {
    console.log(`${colors.green}リントが完了しました。${colors.reset}\n`);
  }
  
  // 各パッケージのテスト実行
  const testPackages = packages.filter(p => p.hasTests);
  
  if (testPackages.length === 0) {
    console.log(`${colors.blue}テスト可能なパッケージが見つかりませんでした。${colors.reset}`);
    return;
  }
  
  for (const pkg of testPackages) {
    console.log(`${colors.yellow}${pkg.name}のテストを実行しています...${colors.reset}`);
    
    // package.jsonにテストスクリプトが定義されているか確認
    const pkgJsonPath = path.join(pkg.path, 'package.json');
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    
    if (pkgJson.scripts && pkgJson.scripts.test) {
      const success = exec('pnpm run test', pkg.path);
      
      if (success) {
        console.log(`${colors.green}${pkg.name}のテストが成功しました。${colors.reset}\n`);
      } else {
        console.error(`${colors.red}${pkg.name}のテストが失敗しました。続行します。${colors.reset}\n`);
        hasFailure = true;
      }
    } else {
      console.log(`${colors.blue}${pkg.name}にはテストスクリプトが定義されていません。スキップします。${colors.reset}\n`);
    }
  }

  if (hasFailure) {
    process.exit(1);
  }

  console.log(`${colors.bright}${colors.green}テストが完了しました！${colors.reset}`);
}

// スクリプト実行
test().catch(err => {
  console.error(`${colors.red}エラーが発生しました:${colors.reset}`, err);
  process.exit(1);
}); 
