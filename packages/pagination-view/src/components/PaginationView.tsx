import React, { useEffect, useState, useCallback } from 'react';
import { useAsyncCallback } from 'react-async-hook';
import { Table, Button, Typography, Pagination, Select, Space, Toast } from '@douyinfe/semi-ui';
import { bitable } from '@lark-opdev/block-bitable-api';
import { IconRefresh } from '@douyinfe/semi-icons';

const { Title } = Typography;
const { Option } = Select;

// 型定義
interface Field {
  id: string;
  name: string;
  type: string;
  property: any;
}

interface Record {
  recordId: string;
  fields: { [key: string]: any };
}

/**
 * ページネーションビューコンポーネント
 * Larkのテーブルデータを取得し、ページネーション機能付きで表示する
 */
const PaginationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tableId, setTableId] = useState('');
  const [viewId, setViewId] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);

  /**
   * エラーハンドリング用のヘルパー関数
   */
  const handleError = useCallback((message: string, err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    setError(`${message}: ${errorMessage}`);
    Toast.error({
      content: `${message}: ${errorMessage}`,
      duration: 5,
    });
    setLoading(false);
  }, []);

  /**
   * 現在のテーブルとビューのIDを取得する
   */
  const fetchTableAndViewIds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const selection = await bitable.base.getSelection();
      if (selection.tableId) {
        setTableId(selection.tableId);
      } else {
        setError('テーブルが選択されていません');
        setLoading(false);
      }
      if (selection.viewId) {
        setViewId(selection.viewId);
      }
    } catch (err) {
      handleError('テーブルIDの取得に失敗しました', err);
    }
  }, [handleError]);

  /**
   * フィールド情報を取得する
   */
  const fetchFields = useCallback(async () => {
    if (!tableId) return;
    setError(null);
    try {
      const table = await bitable.base.getTableById(tableId);
      const fieldMetaList = await table.getFieldMetaList();
      
      const fieldsData = fieldMetaList.map(field => ({
        id: field.id,
        name: field.name,
        type: String(field.type),
        property: field.property,
      }));
      
      setFields(fieldsData);
    } catch (err) {
      handleError('フィールド情報の取得に失敗しました', err);
    }
  }, [tableId, handleError]);

  /**
   * レコード総数を取得する
   */
  const fetchRecordCount = useCallback(async () => {
    if (!tableId) return;
    setError(null);
    try {
      const table = await bitable.base.getTableById(tableId);
      // getRecordIdListを使用して総数を取得
      const recordIds = await table.getRecordIdList();
      setTotalRecords(recordIds.length || 0);
    } catch (err) {
      handleError('レコード総数の取得に失敗しました', err);
    }
  }, [tableId, handleError]);

  /**
   * ページネーション付きでレコードデータを取得する
   */
  const fetchRecords = useCallback(async () => {
    if (!tableId) return;
    setError(null);
    try {
      const table = await bitable.base.getTableById(tableId);
      // getRecordIdListを使用してレコードIDを取得
      const allRecordIds = await table.getRecordIdList();
      
      // ページネーション用にレコードIDをスライス
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, allRecordIds.length);
      const pageRecordIds = allRecordIds.slice(startIndex, endIndex);
      
      // 各レコードの詳細情報を取得
      const recordsData = await Promise.all(
        pageRecordIds.map(async (recordId: string) => {
          const record = await table.getRecordById(recordId);
          const fieldValues = await record.getCellValuesByFieldId();
          return {
            recordId: recordId,
            fields: fieldValues,
          };
        })
      );
      
      setRecords(recordsData);
      setLoading(false);
    } catch (err) {
      handleError('レコードデータの取得に失敗しました', err);
    }
  }, [tableId, pageSize, currentPage, handleError]);

  /**
   * データの再取得
   */
  const refreshData = useAsyncCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchTableAndViewIds();
    await fetchFields();
    await fetchRecordCount();
    await fetchRecords();
    setLoading(false);
  });

  /**
   * ページ変更ハンドラー
   */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /**
   * ページサイズ変更ハンドラー
   */
  const handlePageSizeChange = useCallback((value: any) => {
    const size = typeof value === 'string' ? parseInt(value, 10) : value;
    setPageSize(size);
    setCurrentPage(1); // ページサイズが変更されたら1ページ目に戻る
  }, []);

  // 初期データ取得
  useEffect(() => {
    fetchTableAndViewIds();
  }, [fetchTableAndViewIds]);

  useEffect(() => {
    if (tableId) {
      fetchFields();
      fetchRecordCount();
    }
  }, [tableId, fetchFields, fetchRecordCount]);

  useEffect(() => {
    if (tableId && fields.length > 0) {
      fetchRecords();
    }
  }, [tableId, fields, currentPage, pageSize, fetchRecords]);

  /**
   * テーブル用のカラム設定を生成
   */
  const columns = fields.map(field => ({
    title: field.name,
    dataIndex: 'fields',
    key: field.id,
    render: (fieldValues: any) => {
      const value = fieldValues ? fieldValues[field.id] : null;
      if (value === null || value === undefined) return '-';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    },
  }));

  // 総ページ数を計算
  const totalPages = Math.ceil(totalRecords / pageSize);

  return (
    <div style={{ padding: '20px' }} role="main" aria-label="ページネーションビュー">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title heading={3}>ページネーションビュー</Title>
        <Button 
          type="primary" 
          icon={<IconRefresh />}
          onClick={refreshData.execute} 
          loading={refreshData.loading || loading}
          aria-label="データを更新"
        >
          更新
        </Button>
      </div>
      
      {error && (
        <div role="alert" aria-live="assertive" style={{ color: 'red', marginBottom: '16px' }}>
          {error}
        </div>
      )}
      
      <div className="content-container">
        <Table 
          columns={columns} 
          dataSource={records} 
          rowKey="recordId" 
          loading={loading} 
          pagination={false} // カスタムページネーションを使用するため無効化
          size="small"
          empty="データがありません"
          aria-label="レコードテーブル"
        />
      </div>

      <div className="pagination-container">
        <div className="pagination-controls">
          <Pagination 
            currentPage={currentPage}
            pageSize={pageSize}
            total={totalRecords}
            showTotal={true}
            onPageChange={handlePageChange}
            aria-label="ページナビゲーション"
          />
          <Space>
            <label htmlFor="page-size-select">表示件数:</label>
            <Select 
              id="page-size-select"
              value={pageSize} 
              onChange={handlePageSizeChange}
              style={{ width: 80 }}
              aria-label="ページあたりの表示件数"
            >
              <Option value={5}>5</Option>
              <Option value={10}>10</Option>
              <Option value={20}>20</Option>
              <Option value={50}>50</Option>
              <Option value={100}>100</Option>
            </Select>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default PaginationView;
