import { Field } from './types';

/**
 * フィールドIDから対象フィールドを取得する
 * @param fields フィールドリスト
 * @param fieldId フィールドID
 * @returns 対象フィールド（見つからない場合はundefined）
 */
export const getFieldById = (fields: Field[], fieldId: string): Field | undefined => {
  return fields.find(field => field.id === fieldId);
};
