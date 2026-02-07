import React, { useCallback, useEffect, useState } from 'react';
import { useAsyncCallback } from 'react-async-hook';
import { Table, Button, Typography } from '@douyinfe/semi-ui';
import { bitable } from '@lark-opdev/block-bitable-api';
import { Field, Record } from '@lark-plugins/core';

const { Title } = Typography;

const TableView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tableId, setTableId] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [records, setRecords] = useState<Record[]>([]);

  // 現在のテーブルとビューのIDを取得する
  const fetchTableAndViewIds = useCallback(async () => {
    setLoading(true);
    try {
      const selection = await bitable.base.getSelection();
      if (selection.tableId) {
        setTableId(selection.tableId);
      }
    } catch (error) {
      console.error('テーブルIDの取得に失敗しました:', error);
    }
  }, []);

  // フィールド情報を取得する
  const fetchFields = useCallback(async () => {
    if (!tableId) return;
    try {
      const table = await bitable.base.getTableById(tableId);
      const fieldMetaList = await table.getFieldMetaList();
      
      const fieldsData = fieldMetaList.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type as Field['type'],
        property: field.property,
      }));
      
      setFields(fieldsData);
    } catch (error) {
      console.error('フィールド情報の取得に失敗しました:', error);
    }
  }, [tableId]);

  // レコードデータを取得する
  const fetchRecords = useCallback(async () => {
    if (!tableId) return;
    try {
      const table = await bitable.base.getTableById(tableId);
      const recordList = await table.getRecordList({
        pageSize: 100,
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
  }, [tableId]);

  // データの再取得
  const refreshData = useAsyncCallback(async () => {
    setLoading(true);
    await fetchTableAndViewIds();
    await fetchFields();
    await fetchRecords();
    setLoading(false);
  });

  // 初期データ取得
  useEffect(() => {
    fetchTableAndViewIds();
  }, [fetchTableAndViewIds]);

  useEffect(() => {
    if (tableId) {
      fetchFields();
    }
  }, [tableId, fetchFields]);

  useEffect(() => {
    if (tableId && fields.length > 0) {
      fetchRecords();
    }
  }, [tableId, fields, fetchRecords]);

  // テーブル用のカラム設定を生成
  const columns = fields.map(field => ({
    title: field.name,
    dataIndex: ['fields', field.id],
    key: field.id,
    render: (value: unknown) => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    },
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title heading={3}>テーブルビュー</Title>
        <Button 
          type="primary" 
          onClick={refreshData.execute} 
          loading={refreshData.loading || loading}
        >
          更新
        </Button>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={records} 
        rowKey="recordId" 
        loading={loading} 
        pagination={{ 
          pageSize: 10,
          showTotal: true,
        }}
        size="small"
        empty="データがありません"
      />
    </div>
  );
};

export default TableView; 
