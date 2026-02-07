# AGENTS.md

このファイルは、`/Users/shoma.endo/private/lark-plugins` 配下で作業するエージェント向けの実務ルールです。

## 基本方針

- 変更は最小単位で行う（無関係なファイルは触らない）。
- まず壊れている基盤（`lint` / `test` / `build`）を優先して直す。
- 既存のスクリプト・設定方針に合わせる。

## リポジトリ構成の要点

- モノレポ構成（`packages/*`, `configs/*`）。
- ルートスクリプト:
  - `pnpm run lint`
  - `pnpm run test`
  - `pnpm run build`
  - `pnpm run clean`

## ルートスクリプト対象ポリシー

- `scripts/build.js`, `scripts/test.js`, `scripts/clean.js` は以下を満たす package のみ対象:
  - `packages/<name>/package.json` が存在
  - `package.json` 内で `monorepo.rootScripts !== false`
- `packages/action-starter` は `monorepo.rootScripts: false` で除外されている。

## lint / TypeScript 運用

- ルート ESLint 設定は `/.eslintrc.cjs`。
- 共有 ESLint ルールは `configs/eslint-config/index.js`。
- `@typescript-eslint/no-unused-vars` は `_` 始まり引数を許容。
- 可能な限り `any` は使わず、`unknown` または具体型を使う。

## React 実装ルール（このリポジトリでの実務）

- `react-hooks/exhaustive-deps` 警告を残さない。
- `useEffect` から参照する関数は `useCallback` で安定化する。
- 未使用 state / import は削除する。

## 変更後の確認手順

1. `pnpm run lint`
2. `pnpm run test`
3. `pnpm run build`

warning を増やさないこと。エラーは 0 を維持すること。
