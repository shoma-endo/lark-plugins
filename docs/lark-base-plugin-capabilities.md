# Lark Base プラグイン開発: できること / できないこと整理

最終更新: 2026-02-07  
前提SDK: `@lark-opdev/block-bitable-api@0.1.9`

---

## 1. このドキュメントの目的

Lark Base（Bitable）向けプラグイン開発時に、実装前に判断すべき以下を整理する。

- 何を取得できるか
- 何を更新できるか
- 何が制限されるか（権限・型・件数・サイズ）
- 実装で先に確認すべきこと

---

## 2. まず押さえる前提（重要）

### 2.1 対象スコープは「現在の Base」

`getTableMetaList` / `getTableList` などは「現在の base 下」の情報を扱う前提。  
プラグイン内で任意の別Baseへ自由アクセスする設計にはなっていない。

### 2.2 「技術的に呼べる」≠「実行できる」

API呼び出し可能でも、実行可否は権限で決まる。  
`getPermission` で事前判定しないと、更新系は失敗しうる。

### 2.3 フィールド型ごとに可否が異なる

同じ `setCellValue` / `setRecord` でも、フィールド型によっては更新不可。  
（例: 作成日時・更新日時・作成者・更新者・数式・ルックアップ(参照) など）

---

## 3. できること（取得系）

### 3.1 コンテキスト・メタ情報取得

- 現在選択の `baseId/tableId/viewId/fieldId/recordId` 取得（`getSelection`）
- テーブル一覧・テーブルメタ取得（`getTableList`, `getTableMetaList`）
- フィールドメタ取得（`getFieldMetaById`, `getFieldMetaList`）
- ビューメタ取得（`getViewMetaById`, `getViewMetaList`）
- 表示中レコードID・可視フィールドID取得（`getVisibleRecordIdList`, `getVisibleFieldIdList`）

### 3.2 データ取得

- レコード単位取得（`getRecordById`）
- レコードID一覧取得（`getRecordIdList`）
- 単セル値取得（`getCellValue`）
- 文字列化値取得（`getCellString`）
- 列単位取得（`getFieldValueList`）
- 添付URL取得（`getAttachmentUrl`, `getCellAttachmentUrls`, `getCellThumbnailUrls`）

### 3.3 実行環境情報取得

- ユーザー/テナント/言語/ロケール/テーマ取得
- ブリッジの永続データ `getData` / `setData`

---

## 4. できること（更新系）

### 4.1 レコード・セル更新

- セル更新: `setCellValue`
- レコード追加: `addRecord`
- レコード更新: `setRecord`
- レコード削除: `deleteRecord`

### 4.2 フィールド操作

- フィールド追加: `addField`（対応型のみ）
- フィールド更新: `setField`（名称/プロパティ変更、型変更は限定）
- フィールド削除: `deleteField`（削除不可型あり）

### 4.3 添付ファイル

- ファイルアップロード（`uploadFile`, `batchUploadFile`）
- アップロードした `fileToken` を添付セル値として保存

---

## 5. できないこと / 制限されること（重要）

### 5.1 そのまま「上書きできない」代表例

`setCellValue` / `setRecord` では、以下は更新不可（公式に明記）:

- ルックアップ（Lookup）
- 数式（Formula）
- 作成日時（CreatedTime）
- 更新日時（ModifiedTime）
- 作成者（CreatedUser）
- 更新者（ModifiedUser）

### 5.2 フィールド追加・削除・型変更の制限

#### 追加不可（`addField`）

以下は追加不可と明記:

- 自動採番（AutoNumber）
- 作成日時 / 更新日時
- 作成者 / 更新者
- 数式（Formula）
- ルックアップ（Lookup）

#### 削除不可（`deleteField`）

以下は削除不可と明記:

- 自動採番（AutoNumber）
- 作成日時 / 更新日時
- 作成者 / 更新者
- 数式（Formula）
- ルックアップ（Lookup）

#### 型変更（`setField`）は限定的

型変更可能な組み合わせは限定される。  
また、該当フィールドが他のフィールドに参照されている場合は変更不可。

### 5.3 セル値の構造制約（`setCellValue`）

代表的な制約:

- 単方向リンク（関連レコード）は最大20件
- 選択肢フィールドは `id` または `text` 指定（空値は `null`）
- 日付フィールドは millisecond timestamp（null可）
- チェックボックスは `boolean`
- ユーザーフィールドは user id の配列
- 位置情報は `{location,address,pname,cityname,adname,name,full_address}`
- 添付ファイルは事前アップロードした `fileToken` が必要（URL文字列直書きは不可）

### 5.4 ファイルアップロード制限

`batchUploadFile` の制限:

- 1ファイルあたり最大 20MB
- 1リクエストあたり最大 50ファイル

### 5.5 権限依存

`getPermission` の対象:

- Base / Table / Record / Field / Cell
- `visible/editable/addable/deletable/...` 等の操作単位で判定

更新前に権限確認しない実装は失敗率が高い。

### 5.6 イベント運用上の注意

SDK型定義コメント上、`register*Event` は「同一eventにつき client で最大1つのlistener」前提。  
複数購読を前提にした設計は避ける。

---

## 6. 取得できるデータ / 取得しづらいデータ

### 6.1 取得しやすい

- テーブル/ビュー/フィールド/レコードの構造情報
- セル値（型付き）
- 可視レコードID・可視フィールドID
- 添付URL（token経由）

### 6.2 そのままは取得・変換できない/注意が必要

- `open_id` への変換（SDK型定義コメントで未対応）
- 可視外の情報は view API からは直接取れない（view API は可視範囲中心）
- 参照計算フィールドは「取得は可だが更新不可」

---

## 7. 実装前チェックリスト（推奨）

1. 対象 `tableId/viewId/recordId` を `getSelection` で確定
2. `getPermission` で更新可否を事前判定
3. 更新対象フィールド型を `getFieldMetaList` で判定
4. 更新不可型（Created/Modified/Formula/Lookup）を弾く
5. リンク件数・添付ファイルサイズ/件数制限を事前検証
6. 失敗時のフォールバック（ユーザー通知・リトライ）を実装

---

## 8. このリポジトリでの適用方針

- `table-view` / `record-view` の更新系処理追加時は、必ず権限チェックを先行する
- フィールド型ごとの `setCellValue` バリデーション関数を共通化する
- 将来のSDK更新時は、このドキュメントの「制限」章を先に差分確認する

---

## 9. 根拠（一次情報）

- `setCellValue` 制約（更新不可フィールド、型別入力、リンク上限）  
  https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/js-sdk/bitable/table/set-cell-value
- `setRecord` 制約（更新不可フィールド）  
  https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/js-sdk/bitable/table/set-record
- `addField` 制約（追加不可フィールド）  
  https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/js-sdk/bitable/table/add-field
- `deleteField` 制約（削除不可フィールド）  
  https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/js-sdk/bitable/table/delete-field
- `setField` 制約（型変更・参照制約）  
  https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/js-sdk/bitable/table/set-field
- `getPermission`（権限判定の対象と操作種別）  
  https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/js-sdk/bitable/base/get-permission
- `batchUploadFile`（20MB/50件制限）  
  https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/js-sdk/bitable/base/batch-upload-file
- SDK型定義（`@lark-opdev/block-bitable-api@0.1.9`）  
  `/Users/shoma.endo/private/lark-plugins/node_modules/.pnpm/@lark-opdev+block-bitable-api@0.1.9/node_modules/@lark-opdev/block-bitable-api/dist/index.d.ts`
