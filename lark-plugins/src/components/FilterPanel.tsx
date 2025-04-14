import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Collapse, Select, Input, DatePicker, Checkbox, Button, Space, Typography, Toast } from '@douyinfe/semi-ui';
import { IconFilter, IconClose } from '@douyinfe/semi-icons';
import { FieldType, IFieldMeta, ISelectFieldMeta } from '@lark-opdev/block-bitable-api';

const { Text } = Typography;

// フィルタ条件の型定義
export interface IFilterCondition {
  fieldId: string;
  operator: string;
  value: any;
}

interface FilterPanelProps {
  fields: IFieldMeta[];
  onApplyFilters: (filters: IFilterCondition[]) => void;
}

// フィールドタイプごとの演算子オプション
const getOperatorsByFieldType = (fieldType: FieldType): { label: string; value: string }[] => {
  const commonOperators = [
    { label: '等しい', value: 'eq' },
    { label: '等しくない', value: 'neq' },
  ];

  const textOperators = [
    ...commonOperators,
    { label: '含む', value: 'contains' },
    { label: '含まない', value: 'not_contains' },
  ];

  const numberOperators = [
    ...commonOperators,
    { label: '以上', value: 'gte' },
    { label: '以下', value: 'lte' },
    { label: '超える', value: 'gt' },
    { label: '未満', value: 'lt' },
  ];

  const dateOperators = [
    ...commonOperators,
    { label: '以降', value: 'after' },
    { label: '以前', value: 'before' },
  ];

  const booleanOperators = [
    { label: '等しい', value: 'eq' },
  ];

  switch (fieldType) {
    case FieldType.Text:
    case FieldType.Url:
      return textOperators;
    case FieldType.Number:
    case FieldType.Currency:
    case FieldType.Rating:
      return numberOperators;
    case FieldType.DateTime:
    case FieldType.CreatedTime:
    case FieldType.ModifiedTime:
      return dateOperators;
    case FieldType.Checkbox:
      return booleanOperators;
    case FieldType.SingleSelect:
    case FieldType.MultiSelect:
      return commonOperators;
    case FieldType.User:
    case FieldType.CreatedUser:
    case FieldType.ModifiedUser:
      return commonOperators;
    default:
      return commonOperators;
  }
};

// フィールドタイプに基づいた入力コンポーネントを返す
const FilterValueInput: React.FC<{
  fieldType: FieldType;
  operator: string;
  value: any;
  onChange: (value: any) => void;
  fieldMeta: IFieldMeta;
}> = ({ fieldType, operator, value, onChange, fieldMeta }) => {
  switch (fieldType) {
    case FieldType.Text:
    case FieldType.Url:
      return (
        <Input
          placeholder="値を入力"
          value={value || ''}
          onChange={onChange}
        />
      );
    case FieldType.Number:
    case FieldType.Currency:
    case FieldType.Rating:
      return (
        <Input
          type="number"
          placeholder="数値を入力"
          value={value || ''}
          onChange={(val) => onChange(Number(val))}
        />
      );
    case FieldType.DateTime:
    case FieldType.CreatedTime:
    case FieldType.ModifiedTime:
      return (
        <DatePicker
          type="dateTime"
          value={value ? new Date(value) : undefined}
          onChange={(date) => {
            if (date) {
              // DateオブジェクトからUNIXタイムスタンプを取得
              const timestamp = date instanceof Date ? date.getTime() : null;
              onChange(timestamp);
            } else {
              onChange(null);
            }
          }}
        />
      );
    case FieldType.Checkbox:
      return (
        <Checkbox
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        >
          {value ? 'はい' : 'いいえ'}
        </Checkbox>
      );
    case FieldType.SingleSelect:
    case FieldType.MultiSelect:
      // 選択肢フィールドの場合、選択肢オプションを表示
      const selectFieldMeta = fieldMeta as ISelectFieldMeta;
      const options = (selectFieldMeta.property?.options || []).map((option: any) => ({
        label: option.name || option.text || option.id,
        value: option.id,
      }));
      
      // オプションがない場合のデバッグ情報
      if (options.length === 0) {
        console.log('選択肢オプションが見つかりません:', fieldMeta);
        // フィールドメタデータのプロパティを確認
        console.log('フィールドプロパティ:', selectFieldMeta.property);
      }
      
      return (
        <Select
          placeholder="選択してください"
          style={{ width: '100%' }}
          value={value}
          onChange={onChange}
          multiple={fieldType === FieldType.MultiSelect}
          optionList={options.length > 0 ? options : [{ label: 'オプションがありません', value: '' }]}
          emptyContent="選択肢がありません"
        />
      );
    default:
      return (
        <Input
          placeholder="値を入力"
          value={value || ''}
          onChange={onChange}
        />
      );
  }
};

export const FilterPanel: React.FC<FilterPanelProps> = ({ fields, onApplyFilters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<IFilterCondition[]>([]);
  const [availableFields, setAvailableFields] = useState<IFieldMeta[]>([]);

  // フィールドが変更されたときに利用可能なフィールドを更新
  useEffect(() => {
    if (fields && fields.length > 0) {
      console.log('利用可能なフィールド:', fields);
      setAvailableFields(fields);
    } else {
      console.log('利用可能なフィールドがありません');
      setAvailableFields([]);
    }
  }, [fields]);

  // フィールド選択オプション
  const fieldOptions = useMemo(() => {
    return availableFields.map((field) => ({
      label: field.name,
      value: field.id,
    }));
  }, [availableFields]);

  // フィールドIDからフィールドメタデータを取得
  const getFieldMetaById = useCallback(
    (fieldId: string) => {
      return availableFields.find((field) => field.id === fieldId);
    },
    [availableFields]
  );

  // フィルタ追加
  const addFilter = useCallback(() => {
    if (availableFields.length > 0) {
      // フィールドメタデータを取得し、適切なデフォルト値を設定
      const defaultField = availableFields[0];
      const defaultOperators = getOperatorsByFieldType(defaultField.type);
      
      // フィールドタイプに基づいたデフォルト値を設定
      let defaultValue = null;
      switch (defaultField.type) {
        case FieldType.Checkbox:
          defaultValue = false;
          break;
        case FieldType.Number:
        case FieldType.Currency:
        case FieldType.Rating:
          defaultValue = 0;
          break;
        case FieldType.Text:
        case FieldType.Url:
          defaultValue = '';
          break;
        // 他のフィールドタイプのデフォルト値も必要に応じて追加
      }
      
      const newFilter = {
        fieldId: defaultField.id,
        operator: defaultOperators[0].value,
        value: defaultValue,
      };
      
      console.log('フィルタを追加:', newFilter);
      setFilters([...filters, newFilter]);
    } else {
      Toast.warning({
        content: 'フィールドが利用できません',
        duration: 3,
      });
    }
  }, [filters, availableFields]);

  // フィルタ更新
  const updateFilter = useCallback(
    (index: number, key: keyof IFilterCondition, value: any) => {
      const newFilters = [...filters];
      
      // フィールドが変更された場合、演算子とフィルタ値をリセット
      if (key === 'fieldId') {
        const fieldMeta = getFieldMetaById(value);
        if (fieldMeta) {
          const operators = getOperatorsByFieldType(fieldMeta.type);
          newFilters[index] = {
            fieldId: value,
            operator: operators[0].value,
            value: null,
          };
        }
      } else {
        newFilters[index] = {
          ...newFilters[index],
          [key]: value,
        };
      }
      
      console.log('フィルタを更新:', newFilters[index]);
      setFilters(newFilters);
    },
    [filters, getFieldMetaById]
  );

  // フィルタ削除
  const removeFilter = useCallback(
    (index: number) => {
      const newFilters = [...filters];
      newFilters.splice(index, 1);
      setFilters(newFilters);
      console.log('フィルタを削除:', index);
    },
    [filters]
  );

  // フィルタ適用
  const applyFilters = useCallback(() => {
    console.log('フィルタを適用:', filters);
    onApplyFilters(filters);
    Toast.success({
      content: `${filters.length}件のフィルタを適用しました`,
      duration: 3,
    });
  }, [filters, onApplyFilters]);

  // フィルタクリア
  const clearFilters = useCallback(() => {
    setFilters([]);
    onApplyFilters([]);
    console.log('フィルタをクリア');
    Toast.info({
      content: 'フィルタをクリアしました',
      duration: 3,
    });
  }, [onApplyFilters]);

  return (
    <div style={{ marginBottom: 16 }}>
      <Button 
        icon={<IconFilter />} 
        onClick={() => setIsOpen(!isOpen)}
        style={{ marginBottom: 8 }}
      >
        フィルタ {filters.length > 0 && `(${filters.length})`}
      </Button>
      
      {isOpen && (
        <div style={{ padding: 16, border: '1px solid var(--semi-color-border)', borderRadius: 4 }}>
          {availableFields.length === 0 ? (
            <Text type="tertiary">フィールドが利用できません</Text>
          ) : filters.length === 0 ? (
            <Text type="tertiary">フィルタが設定されていません</Text>
          ) : (
            <div>
              {filters.map((filter, index) => {
                const fieldMeta = getFieldMetaById(filter.fieldId);
                const operators = fieldMeta ? getOperatorsByFieldType(fieldMeta.type) : [];
                
                return (
                  <div key={index} style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start' }}>
                    <Space vertical style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Text strong>フィルタ {index + 1}</Text>
                        <IconClose 
                          style={{ cursor: 'pointer' }} 
                          onClick={() => removeFilter(index)} 
                        />
                      </div>
                      
                      <Select
                        placeholder="フィールドを選択"
                        style={{ width: '100%' }}
                        value={filter.fieldId}
                        onChange={(value) => updateFilter(index, 'fieldId', value)}
                        optionList={fieldOptions}
                      />
                      
                      <Select
                        placeholder="演算子を選択"
                        style={{ width: '100%' }}
                        value={filter.operator}
                        onChange={(value) => updateFilter(index, 'operator', value)}
                        optionList={operators}
                      />
                      
                      {fieldMeta && (
                        <FilterValueInput
                          fieldType={fieldMeta.type}
                          operator={filter.operator}
                          value={filter.value}
                          onChange={(value) => updateFilter(index, 'value', value)}
                          fieldMeta={fieldMeta}
                        />
                      )}
                    </Space>
                  </div>
                );
              })}
            </div>
          )}
          
          <Space style={{ marginTop: 16 }}>
            <Button onClick={addFilter} disabled={availableFields.length === 0}>
              {availableFields.length > 0 ? 'フィルタを追加' : 'フィールドが利用できません'}
            </Button>
            <Button type="primary" onClick={applyFilters} disabled={filters.length === 0}>適用</Button>
            {filters.length > 0 && (
              <Button type="tertiary" onClick={clearFilters}>クリア</Button>
            )}
          </Space>
        </div>
      )}
    </div>
  );
};
