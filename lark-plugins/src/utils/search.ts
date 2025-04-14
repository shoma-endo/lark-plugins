import { FieldType, IOpenCellValue, IFieldMeta } from '@lark-opdev/block-bitable-api';
import { IFilterCondition } from '../components/FilterPanel';

// セルの値をテキスト形式に変換する関数
export const cellValueToString = (value: IOpenCellValue, fieldType: FieldType): string => {
  if (value === null || value === undefined) {
    return '';
  }

  // 文字列型の場合は直接返す（最も一般的なケース）
  if (typeof value === 'string') {
    console.log(`文字列型の値: "${value}"`);
    return value;
  }

  // デバッグ用：変換前の値とフィールドタイプを出力
  console.log(`変換前の値: ${JSON.stringify(value)}, タイプ: ${typeof value}, フィールドタイプ: ${fieldType}`);
  
  let result = '';
  
  switch (fieldType) {
    case FieldType.Text:
    case FieldType.Url:
      result = String(value);
      break;
    case FieldType.Number:
    case FieldType.Currency:
    case FieldType.Rating:
      result = String(value);
      break;
    case FieldType.DateTime:
    case FieldType.CreatedTime:
    case FieldType.ModifiedTime:
      if (typeof value === 'number') {
        result = new Date(value).toLocaleString();
      }
      break;
    case FieldType.Checkbox:
      result = value ? 'はい' : 'いいえ';
      break;
    case FieldType.SingleSelect:
      // 単一選択の場合
      if (typeof value === 'object' && value !== null) {
        // オブジェクトの各プロパティを確認
        console.log('SingleSelect オブジェクトのプロパティ:', Object.keys(value));
        
        if ('name' in value) {
          result = String(value.name);
        } else if ('text' in value) {
          result = String(value.text);
        } else if ('value' in value) {
          result = String(value.value);
        } else if ('id' in value) {
          result = String(value.id);
        } else {
          // オブジェクトを文字列化
          result = JSON.stringify(value);
        }
      }
      break;
    case FieldType.MultiSelect:
      // 複数選択の場合
      if (Array.isArray(value)) {
        result = value.map(item => {
          if (typeof item === 'string') {
            return item;
          }
          if (typeof item === 'object' && item !== null) {
            if ('name' in item) {
              return String(item.name);
            } else if ('text' in item) {
              return String(item.text);
            } else if ('value' in item) {
              return String(item.value);
            } else if ('id' in item) {
              return String(item.id);
            }
          }
          return String(item);
        }).join(', ');
      }
      break;
    case FieldType.User:
    case FieldType.CreatedUser:
    case FieldType.ModifiedUser:
      // ユーザーフィールドの場合
      if (typeof value === 'object' && value !== null) {
        if ('name' in value) {
          result = String(value.name);
        } else if ('id' in value) {
          result = String(value.id);
        } else {
          result = JSON.stringify(value);
        }
      }
      if (Array.isArray(value)) {
        result = value.map(item => {
          if (typeof item === 'string') {
            return item;
          }
          if (typeof item === 'object' && item !== null) {
            if ('name' in item) {
              return String(item.name);
            } else if ('id' in item) {
              return String(item.id);
            }
          }
          return String(item);
        }).join(', ');
      }
      break;
    default:
      // その他のフィールドタイプは文字列に変換
      result = String(value);
  }
  
  // デバッグ用：変換後の値を出力
  console.log(`変換後の値: "${result}"`);
  return result;
};

// 正規表現のエスケープ処理
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// レコードを検索する関数
export const searchRecords = (
  records: Record<string, IOpenCellValue>[],
  searchText: string,
  fields: IFieldMeta[]
): Record<string, IOpenCellValue>[] => {
  if (!searchText) {
    return records;
  }

  // 検索テキストをトリムして小文字に変換（比較用）
  const lowerSearchText = searchText.toLowerCase().trim();
  console.log(`検索テキスト: "${lowerSearchText}", バイト長: ${new TextEncoder().encode(lowerSearchText).length}`);

  // 検索結果を格納する配列
  const results: Record<string, IOpenCellValue>[] = [];

  // 各レコードを検索
  records.forEach((record, recordIndex) => {
    let isMatch = false;
    let matchedFields: string[] = [];

    // 各フィールドの値を検索
    fields.forEach(field => {
      const value = record[field.id];
      if (value === null || value === undefined) {
        return; // このフィールドはスキップ
      }

      // フィールド値をテキストに変換
      const textValue = cellValueToString(value, field.type);
      
      // 大文字小文字を区別せずに比較（日本語にも対応）
      const lowerTextValue = textValue.toLowerCase();
      
      // 単純な文字列比較（includes）を使用して検索
      // 正規表現よりも日本語テキストの検索に適している
      if (lowerTextValue.includes(lowerSearchText)) {
        isMatch = true;
        matchedFields.push(`${field.name}="${textValue}"`);
      }
    });

    // マッチしたレコードを結果に追加
    if (isMatch) {
      console.log(`レコード #${recordIndex} が一致: ${matchedFields.join(', ')}`);
      results.push(record);
    }
  });

  console.log(`検索結果: ${results.length}件のレコードが見つかりました`);
  return results;
};

// フィルタ条件に基づいてレコードをフィルタリングする関数
export const filterRecords = (
  records: Record<string, IOpenCellValue>[],
  filters: IFilterCondition[],
  fields: IFieldMeta[]
): Record<string, IOpenCellValue>[] => {
  if (!filters || filters.length === 0) {
    return records;
  }

  return records.filter(record => {
    // すべてのフィルタ条件に一致するかどうかをチェック
    return filters.every(filter => {
      const { fieldId, operator, value } = filter;
      const fieldValue = record[fieldId];
      
      // フィールドメタデータを取得
      const fieldMeta = fields.find(f => f.id === fieldId);
      if (!fieldMeta) {
        return true; // フィールドが見つからない場合はスキップ
      }

      // 値が設定されていない場合はスキップ
      if (value === null || value === undefined) {
        return true;
      }

      // フィールドタイプに応じたフィルタリング
      switch (fieldMeta.type) {
        case FieldType.Text:
        case FieldType.Url:
          return filterTextValue(fieldValue, operator, value);
        case FieldType.Number:
        case FieldType.Currency:
        case FieldType.Rating:
          return filterNumberValue(fieldValue, operator, value);
        case FieldType.DateTime:
        case FieldType.CreatedTime:
        case FieldType.ModifiedTime:
          return filterDateValue(fieldValue, operator, value);
        case FieldType.Checkbox:
          return filterBooleanValue(fieldValue, operator, value);
        case FieldType.SingleSelect:
        case FieldType.MultiSelect:
          return filterSelectValue(fieldValue, operator, value);
        case FieldType.User:
        case FieldType.CreatedUser:
        case FieldType.ModifiedUser:
          return filterUserValue(fieldValue, operator, value);
        default:
          return true;
      }
    });
  });
};

// テキストフィールドのフィルタリング
const filterTextValue = (value: IOpenCellValue, operator: string, filterValue: string): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  const textValue = String(value).toLowerCase();
  const filterTextValue = String(filterValue).toLowerCase();

  switch (operator) {
    case 'eq':
      return textValue === filterTextValue;
    case 'neq':
      return textValue !== filterTextValue;
    case 'contains':
      return textValue.includes(filterTextValue);
    case 'not_contains':
      return !textValue.includes(filterTextValue);
    default:
      return true;
  }
};

// 数値フィールドのフィルタリング
const filterNumberValue = (value: IOpenCellValue, operator: string, filterValue: number): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    return false;
  }

  switch (operator) {
    case 'eq':
      return numValue === filterValue;
    case 'neq':
      return numValue !== filterValue;
    case 'gt':
      return numValue > filterValue;
    case 'lt':
      return numValue < filterValue;
    case 'gte':
      return numValue >= filterValue;
    case 'lte':
      return numValue <= filterValue;
    default:
      return true;
  }
};

// 日付フィールドのフィルタリング
const filterDateValue = (value: IOpenCellValue, operator: string, filterValue: number): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  const dateValue = Number(value);
  
  if (isNaN(dateValue)) {
    return false;
  }

  switch (operator) {
    case 'eq':
      // 同じ日付（時間は無視）
      const date1 = new Date(dateValue);
      const date2 = new Date(filterValue);
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    case 'neq':
      const date3 = new Date(dateValue);
      const date4 = new Date(filterValue);
      return !(
        date3.getFullYear() === date4.getFullYear() &&
        date3.getMonth() === date4.getMonth() &&
        date3.getDate() === date4.getDate()
      );
    case 'after':
      return dateValue > filterValue;
    case 'before':
      return dateValue < filterValue;
    default:
      return true;
  }
};

// ブール値フィールドのフィルタリング
const filterBooleanValue = (value: IOpenCellValue, operator: string, filterValue: boolean): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  const boolValue = Boolean(value);

  switch (operator) {
    case 'eq':
      return boolValue === filterValue;
    default:
      return true;
  }
};

// 選択肢フィールドのフィルタリング
const filterSelectValue = (value: IOpenCellValue, operator: string, filterValue: string | string[]): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  // 単一選択の場合
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const selectId = String(value.id);
    
    switch (operator) {
      case 'eq':
        if (Array.isArray(filterValue)) {
          return filterValue.includes(selectId);
        }
        return selectId === filterValue;
      case 'neq':
        if (Array.isArray(filterValue)) {
          return !filterValue.includes(selectId);
        }
        return selectId !== filterValue;
      default:
        return true;
    }
  }
  
  // 複数選択の場合
  if (Array.isArray(value)) {
    const selectIds = value
      .filter(item => typeof item === 'object' && item !== null && 'id' in item)
      .map(item => String((item as any).id));
    
    switch (operator) {
      case 'eq':
        if (Array.isArray(filterValue)) {
          // すべての選択肢が一致するかどうか
          return filterValue.every(id => selectIds.includes(id));
        }
        return selectIds.includes(String(filterValue));
      case 'neq':
        if (Array.isArray(filterValue)) {
          // すべての選択肢が一致しないかどうか
          return !filterValue.every(id => selectIds.includes(id));
        }
        return !selectIds.includes(String(filterValue));
      default:
        return true;
    }
  }
  
  return false;
};

// ユーザーフィールドのフィルタリング
const filterUserValue = (value: IOpenCellValue, operator: string, filterValue: string | string[]): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  // 単一ユーザーの場合
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const userId = String(value.id);
    
    switch (operator) {
      case 'eq':
        if (Array.isArray(filterValue)) {
          return filterValue.includes(userId);
        }
        return userId === filterValue;
      case 'neq':
        if (Array.isArray(filterValue)) {
          return !filterValue.includes(userId);
        }
        return userId !== filterValue;
      default:
        return true;
    }
  }
  
  // 複数ユーザーの場合
  if (Array.isArray(value)) {
    const userIds = value
      .filter(item => typeof item === 'object' && item !== null && 'id' in item)
      .map(item => String((item as any).id));
    
    switch (operator) {
      case 'eq':
        if (Array.isArray(filterValue)) {
          // すべてのユーザーが一致するかどうか
          return filterValue.every(id => userIds.includes(id));
        }
        return userIds.includes(String(filterValue));
      case 'neq':
        if (Array.isArray(filterValue)) {
          // すべてのユーザーが一致しないかどうか
          return !filterValue.every(id => userIds.includes(id));
        }
        return !userIds.includes(String(filterValue));
      default:
        return true;
    }
  }
  
  return false;
};
