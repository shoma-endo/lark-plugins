import React, { useEffect, useState } from 'react';
import { useAsyncCallback } from 'react-async-hook';
import { Table, Button, Typography, Pagination, Select, Space } from '@douyinfe/semi-ui';
import { bitable } from '@lark-opdev/block-bitable-api';
import { Field, Record } from '@lark-plugins/core';
import { IconRefresh } from '@douyinfe/semi-icons';

const { Title } = Typography;
const { Option } = Select;

const PaginationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tableId, setTableId] = useState('');
  const [viewId, setViewId] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 現在のテーブルとビューのIDを取得する
  const fetchTableAndViewIds = async () => {
    setLoading(true);
    try {
      const selection = await bitable.base.getSelection();
      if (selection.tableId) {
        setTableId(selection.tableId);
      }
      if (selection.viewId) {
        setViewId(selection.viewId);
      }
    } catch (error) {
      console.error('テーブルIDの取得に失敗しました:', error);
    }
  };

  // フィールド情報を取得する
  const fetchFields = async () => {
    if (!tableId) return;
    try {
      const table = await bitable.base.getTableById(tableId);
      const fieldMetaList = await table.getFieldMetaList();
      
      const fieldsData = fieldMetaList.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type as any,
        property: field.property,
      }));
      
      setFields(fieldsData);
    } catch (error) {
      console.error('フィールド情報の取得に失敗しました:', error);
    }
  };

  // レコード総数を取得する
  const fetchRecordCount = async () => {
    if (!tableId) return;
    try {
      const table = await bitable.base.getTableById(tableId);
      const recordList = await table.getRecordList();
      setTotalRecords(recordList.total || 0);
    } catch (error) {
      console.error('レコード総数の取得に失敗しました:', error);
    }
  };

  // ページネーション付きでレコードデータを取得する
  const fetchRecords = async () => {
    if (!tableId) return;
    try {
      const table = await bitable.base.getTableById(tableId);
      const recordList = await table.getRecordList({
        pageSize: pageSize,
        pageToken: (currentPage > 1) ? String(currentPage) : undefined,
      });
      
      const recordsData = await Promise.all(
        recordList.records.map(async (record) => {
          const fields = await record.getCellValuesByFieldId();
          return {
            recordId: record.id,
            fields,
          };
        })
      );
      
      setRecords(recordsData);
      setLoading(false);
    } catch (error) {
      console.error('レコードデータの取得に失敗しました:', error);
      setLoading(false);
    }
  };

  // データの再取得
  const refreshData = useAsyncCallback(async () => {
    setLoading(true);
    await fetchTableAndViewIds();
    await fetchFields();
    await fetchRecordCount();
    await fetchRecords();
    setLoading(false);
  });

  // ページ変更ハンドラー
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // ページサイズ変更ハンドラー
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // ページサイズが変更されたら1ページ目に戻る
  };

  // 初期データ取得
  useEffect(() => {
    fetchTableAndViewIds();
  }, []);

  useEffect(() => {
    if (tableId) {
      fetchFields();
      fetchRecordCount();
    }
  }, [tableId]);

  useEffect(() => {
    if (tableId && fields.length > 0) {
      fetchRecords();
    }
  }, [tableId, fields, currentPage, pageSize]);

  // テーブル用のカラム設定を生成
  const columns = fields.map(field => ({
    title: field.name,
    dataIndex: ['fields', field.id],
    key: field.id,
    render: (value: any) => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    },
  }));

  // 総ページ数を計算
  const totalPages = Math.ceil(totalRecords / pageSize);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title heading={3}>ページネーションビュー</Title>
        <Button 
          type="primary" 
          icon={<IconRefresh />}
          onClick={refreshData.execute} 
          loading={refreshData.loading || loading}
        >
          更新
        </Button>
      </div>
      
      <div className="content-container">
        <Table 
          columns={columns} 
          dataSource={records} 
          rowKey="recordId" 
          loading={loading} 
          pagination={false} // カスタムページネーションを使用するため無効化
          size="small"
          empty="データがありません"
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
          />
          <Space>
            <span>表示件数:</span>
            <Select 
              value={pageSize} 
              onChange={handlePageSizeChange}
              style={{ width: 80 }}
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
