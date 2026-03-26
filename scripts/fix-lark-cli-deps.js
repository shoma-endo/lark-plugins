#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function getLarkCliDirs() {
  const pnpmDir = path.join(process.cwd(), 'node_modules', '.pnpm');

  if (!fs.existsSync(pnpmDir)) {
    return [];
  }

  return fs
    .readdirSync(pnpmDir)
    .filter(entry => entry.startsWith('@lark-opdev+cli@'))
    .map(entry => path.join(pnpmDir, entry, 'node_modules', '@lark-opdev', 'cli'))
    .filter(dir => fs.existsSync(dir));
}

function copyDirectoryContents(fromDir, toDir) {
  for (const entry of fs.readdirSync(fromDir)) {
    fs.cpSync(path.join(fromDir, entry), path.join(toDir, entry), {
      force: true,
      recursive: true,
    });
  }
}

function repairCliDeps(cliDir) {
  const tempModulesDir = path.join(cliDir, 'temp_modules');
  const nodeModulesDir = path.join(cliDir, 'node_modules');
  const requiredModulePath = path.join(nodeModulesDir, '@bdeefe', 'feishu-devtools-core');

  if (fs.existsSync(requiredModulePath)) {
    return false;
  }

  if (!fs.existsSync(tempModulesDir)) {
    return false;
  }

  fs.mkdirSync(nodeModulesDir, { recursive: true });
  copyDirectoryContents(tempModulesDir, nodeModulesDir);
  fs.rmSync(tempModulesDir, { force: true, recursive: true });
  return true;
}

function main() {
  const cliDirs = getLarkCliDirs();
  let repairedCount = 0;

  for (const cliDir of cliDirs) {
    if (repairCliDeps(cliDir)) {
      repairedCount += 1;
    }
  }

  if (repairedCount > 0) {
    console.log(`Repaired @lark-opdev/cli bundled dependencies in ${repairedCount} installation(s).`);
  }
}

main();
