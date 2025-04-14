import React, { useCallback, useMemo, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
import { Table, Typography } from '@douyinfe/semi-ui';
import { IOpenCellValue, IFieldMeta } from '@lark-opdev/block-bitable-api';
import { cellValueToString } from '../utils/search';
import { HighlightText } from './HighlightText';

const { Text } = Typography;

interface VirtualTableProps {
  columns: any[];
  dataSource: Record<string, IOpenCellValue>[];
  height?: number;
  itemSize?: number;
  loading?: boolean;
  searchText?: string;
  fields: IFieldMeta[];
}

export const VirtualTable: React.FC<VirtualTableProps> = ({
  columns,
  dataSource,
  height = 400,
  itemSize = 50,
  loading = false,
  searchText = '',
  fields,
}) => {
  // 行の高さを計算するための状態
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});

  // 行の高さを設定する関数
  const setRowHeight = useCallback((index: number, size: number) => {
    setRowHeights(prev => ({
      ...prev,
      [index]: size,
    }));
  }, []);

  // 行の高さを取得する関数
  const getRowHeight = useCallback(
    (index: number) => {
      return rowHeights[index] || itemSize;
    },
    [rowHeights, itemSize]
  );

  // テーブルヘッダーの描画
  const TableHeader = useMemo(() => {
    return (
      <div style={{ display: 'flex', borderBottom: '1px solid var(--semi-color-border)' }}>
        {columns.map((column, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {column.title}
          </div>
        ))}
      </div>
    );
  }, [columns]);

  // 行アイテムのレンダリング
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = dataSource[index];
      if (!item) return null;

      return (
        <div
          style={{
            ...style,
            display: 'flex',
            borderBottom: '1px solid var(--semi-color-border)',
            backgroundColor: index % 2 === 0 ? 'var(--semi-color-fill-0)' : 'white',
          }}
        >
          {columns.map((column, colIndex) => {
            const value = item[column.dataIndex];
            const fieldMeta = fields.find(f => f.id === column.dataIndex);
            
            // カスタムレンダラーがある場合はそれを使用
            if (column.render && typeof column.render === 'function') {
              return (
                <div
                  key={colIndex}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    overflow: 'hidden',
                  }}
                >
                  {column.render(value, item)}
                </div>
              );
            }
            
            // 通常のテキスト表示（検索ハイライト付き）
            const textValue = fieldMeta 
              ? cellValueToString(value, fieldMeta.type) 
              : String(value || '');
              
            return (
              <div
                key={colIndex}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {searchText ? (
                  <HighlightText text={textValue} highlight={searchText} />
                ) : (
                  <Text>{textValue}</Text>
                )}
              </div>
            );
          })}
        </div>
      );
    },
    [columns, dataSource, searchText, fields]
  );

  // データがない場合
  if (dataSource.length === 0) {
    return (
      <Table
        columns={columns}
        dataSource={[]}
        loading={loading}
        empty={<Text type="tertiary">データがありません</Text>}
      />
    );
  }

  return (
    <div style={{ height: height + 50 }}>
      {TableHeader}
      <List
        height={height}
        itemCount={dataSource.length}
        itemSize={getRowHeight}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
};
