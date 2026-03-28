#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'app.json');
const targetPath = path.join(rootDir, 'packages', 'app.json');

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing source app.json: ${sourcePath}`);
  process.exit(1);
}

const sourceContent = fs.readFileSync(sourcePath, 'utf8');
const sourceJson = JSON.parse(sourceContent);

if (!sourceJson.appId) {
  console.error(`app.json must contain "appId": ${sourcePath}`);
  process.exit(1);
}

const normalizedContent = `${JSON.stringify(sourceJson, null, 2)}\n`;
const currentContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : null;

if (currentContent === normalizedContent) {
  process.exit(0);
}

fs.writeFileSync(targetPath, normalizedContent);
