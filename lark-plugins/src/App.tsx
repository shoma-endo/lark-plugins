import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAsync } from 'react-async-hook';
import { Spin, Typography, Card, Divider, Toast } from '@douyinfe/semi-ui';
import { getTableData, IPaginationParams, ITableData } from './utils';
import { SearchBar } from './components/SearchBar';
import { FilterPanel, IFilterCondition } from './components/FilterPanel';
import { VirtualTable } from './components/VirtualTable';
import { searchRecords, filterRecords } from './utils/search';
import { debounce } from 'lodash-es';

const { Text } = Typography;

export const App = () => {
  // 検索とフィルタリングの状態
  const [searchText, setSearchText] = useState<string>('');
  const [filters, setFilters] = useState<IFilterCondition[]>([]);
  
  // ページネーション状態の管理（クライアント側でのみ使用）
  const [pagination, setPagination] = useState<IPaginationParams>({
    pageSize: 50, // 仮想スクロールを使用するため、ページサイズを大きくする
    current: 1,
  });

  // データ取得関数 - ページネーションを使用せず、全てのレコードを一度に取得
  const fetchData = async (): Promise<ITableData> => {
    try {
      console.log('全てのデータを取得中...');
      const result = await getTableData();
      if (!result) {
        console.log('データが取得できませんでした');
        // nullの場合は空のデータを返す
        return {
          table: null,
          columns: [],
          dataSource: [],
          total: 0
        };
      }
      console.log(`取得したデータ: ${result.dataSource.length}件のレコード`);
      return result;
    } catch (error) {
      console.error('データ取得エラー:', error);
      Toast.error({
        content: 'データの取得に失敗しました',
        duration: 3,
      });
      throw error;
    }
  };

  // データ取得
  const { loading, error, result, execute } = useAsync<ITableData>(fetchData, []);

  // 処理済みのデータ（検索・フィルタリング適用後）
  const processedData = useMemo(() => {
    if (!result) {
      return {
        columns: [],
        dataSource: [],
        total: 0
      };
    }

    const { columns, dataSource, total } = result;
    
    // フィールドメタデータを取得
    const fields = result.columns.map(col => {
      return col.meta || { id: col.dataIndex, name: col.title, type: 'Text' };
    });
    
    console.log(`処理前のデータ: ${dataSource.length}件`);
    
    // 検索とフィルタリングを適用
    let filteredData = dataSource;
    
    // フィルタリングを適用
    if (filters.length > 0) {
      console.log(`フィルタを適用: ${filters.length}件のフィルタ条件`);
      filteredData = filterRecords(filteredData, filters, fields);
      console.log(`フィルタ後のデータ: ${filteredData.length}件`);
    }
    
    // 検索を適用
    if (searchText) {
      console.log(`検索を適用: "${searchText}"`);
      // データの一部をログに出力して確認
      if (filteredData.length > 0) {
        console.log('検索対象データのサンプル:');
        const sampleRecord = filteredData[0];
        fields.forEach(field => {
          const value = sampleRecord[field.id];
          if (value !== null && value !== undefined) {
            console.log(`- ${field.name}: ${JSON.stringify(value)}`);
          }
        });
      }
      
      filteredData = searchRecords(filteredData, searchText, fields);
      console.log(`検索後のデータ: ${filteredData.length}件`);
    }
    
    return {
      columns,
      dataSource: filteredData,
      total: filteredData.length
    };
  }, [result, searchText, filters]);

  // ページネーション変更時の処理（クライアント側のみ）
  const handlePageChange = useCallback((currentPage: number) => {
    setPagination({
      ...pagination,
      current: currentPage,
    });
  }, [pagination]);

  // ページサイズ変更時の処理（クライアント側のみ）
  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination({
      ...pagination,
      pageSize: pageSize,
      current: 1, // ページサイズ変更時は1ページ目に戻る
    });
  }, [pagination]);

  // 検索処理
  const handleSearch = useCallback(debounce((text: string) => {
    console.log(`検索テキスト: "${text}"`);
    setSearchText(text);
  }, 300), []);

  // フィルタ適用処理
  const handleApplyFilters = useCallback((newFilters: IFilterCondition[]) => {
    console.log(`フィルタを適用: ${newFilters.length}件`);
    setFilters(newFilters);
  }, []);

  // ローディング中の表示
  if (loading && !result) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        <Spin size="large" tip="データを読み込み中..." />
      </div>
    );
  }

  // エラー時の表示
  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <Text type="danger">エラーが発生しました: {error.message}</Text>
        <div style={{ marginTop: '10px' }}>
          <button onClick={() => execute()}>再試行</button>
        </div>
      </div>
    );
  }

  // データがない場合
  if (!result) {
    return (
      <div style={{ padding: '20px' }}>
        <Text type="tertiary">データが見つかりません。テーブルを選択してください。</Text>
      </div>
    );
  }

  const { columns, dataSource } = processedData;
  const fields = result.columns.map(col => col.meta).filter(Boolean);

  return (
    <div style={{ padding: '16px' }}>
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <SearchBar onSearch={handleSearch} placeholder="テーブル内を検索..." />
          <FilterPanel fields={fields} onApplyFilters={handleApplyFilters} />
        </div>
        
        <Divider />
        
        {/* 検索・フィルタリング結果の表示 */}
        {searchText || filters.length > 0 ? (
          <div style={{ marginBottom: '16px' }}>
            <Text>
              {processedData.total}件のデータが見つかりました
              {searchText && ` (検索: "${searchText}")`}
              {filters.length > 0 && ` (フィルタ: ${filters.length}件)`}
            </Text>
          </div>
        ) : null}
        
        {/* 仮想テーブル */}
        <VirtualTable
          columns={columns}
          dataSource={dataSource}
          height={500}
          loading={loading}
          searchText={searchText}
          fields={fields}
        />
      </Card>
    </div>
  );
};
