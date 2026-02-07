import { Field, Record, View } from './types';
import { cloneDeep, isEqual } from 'lodash-es';

/**
 * フィールドIDから対象フィールドを取得する
 * @param fields フィールドリスト
 * @param fieldId フィールドID
 * @returns 対象フィールド（見つからない場合はundefined）
 */
export const getFieldById = (fields: Field[], fieldId: string): Field | undefined => {
  return fields.find(field => field.id === fieldId);
};

/**
 * フィールド名から対象フィールドを取得する
 * @param fields フィールドリスト
 * @param fieldName フィールド名
 * @returns 対象フィールド（見つからない場合はundefined）
 */
export const getFieldByName = (fields: Field[], fieldName: string): Field | undefined => {
  return fields.find(field => field.name === fieldName);
};

/**
 * ビューIDから対象ビューを取得する
 * @param views ビューリスト
 * @param viewId ビューID
 * @returns 対象ビュー（見つからない場合はundefined）
 */
export const getViewById = (views: View[], viewId: string): View | undefined => {
  return views.find(view => view.id === viewId);
};

/**
 * 2つのレコードを比較し、変更されたフィールドを取得する
 * @param oldRecord 変更前レコード
 * @param newRecord 変更後レコード
 * @returns 変更されたフィールドのIDリスト
 */
export const getChangedFields = (oldRecord: Record, newRecord: Record): string[] => {
  const changedFields: string[] = [];

  for (const fieldId in newRecord.fields) {
    if (!isEqual(oldRecord.fields[fieldId], newRecord.fields[fieldId])) {
      changedFields.push(fieldId);
    }
  }

  return changedFields;
};

/**
 * レコードの特定フィールドの値を取得する
 * @param record レコード
 * @param fieldId フィールドID
 * @returns フィールドの値
 */
export const getFieldValue = (record: Record, fieldId: string): unknown => {
  return record.fields[fieldId];
};

/**
 * レコードをディープコピーする
 * @param record コピー元レコード
 * @returns コピーされたレコード
 */
export const cloneRecord = (record: Record): Record => {
  return cloneDeep(record);
};

/**
 * 文字列をケバブケースに変換する
 * @param str 変換対象文字列
 * @returns ケバブケースに変換された文字列
 */
export const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

/**
 * 文字列をキャメルケースに変換する
 * @param str 変換対象文字列
 * @returns キャメルケースに変換された文字列
 */
export const toCamelCase = (str: string): string => {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, c => c.toLowerCase());
}; 
