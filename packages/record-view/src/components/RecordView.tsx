import React, { useCallback, useEffect, useState } from 'react';
import { useAsyncCallback } from 'react-async-hook';
import { Button, Typography, Card, Descriptions, Empty, Spin } from '@douyinfe/semi-ui';
import { bitable } from '@lark-opdev/block-bitable-api';
import { Field, Record, getFieldById } from '@lark-plugins/core';

const { Title } = Typography;

const RecordView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tableId, setTableId] = useState('');
  const [recordId, setRecordId] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [record, setRecord] = useState<Record | null>(null);

  // 現在のテーブルとレコードのIDを取得する
  const fetchTableAndRecordIds = useCallback(async () => {
    setLoading(true);
    try {
      const selection = await bitable.base.getSelection();
      if (selection.tableId) {
        setTableId(selection.tableId);
      }
      if (selection.recordId) {
        setRecordId(selection.recordId);
      }
    } catch (error) {
      console.error('テーブル/レコードIDの取得に失敗しました:', error);
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
  const fetchRecord = useCallback(async () => {
    if (!tableId || !recordId) return;
    try {
      const table = await bitable.base.getTableById(tableId);
      const record = await table.getRecordById(recordId);
      
      if (record) {
        const fields = await record.getCellValuesByFieldId();
        setRecord({
          recordId: record.id,
          fields,
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('レコードデータの取得に失敗しました:', error);
      setLoading(false);
    }
  }, [recordId, tableId]);

  // データの再取得
  const refreshData = useAsyncCallback(async () => {
    setLoading(true);
    await fetchTableAndRecordIds();
    await fetchFields();
    await fetchRecord();
    setLoading(false);
  });

  // レコード選択時のイベントリスナー
  const setupRecordSelectionListener = useCallback(async () => {
    try {
      bitable.base.onSelectionChange(async event => {
        setRecordId(event.data.recordId || '');
      });
    } catch (error) {
      console.error('レコード選択リスナーの設定に失敗しました:', error);
    }
  }, []);

  // 初期データ取得
  useEffect(() => {
    fetchTableAndRecordIds();
    setupRecordSelectionListener();
  }, [fetchTableAndRecordIds, setupRecordSelectionListener]);

  useEffect(() => {
    if (tableId) {
      fetchFields();
    }
  }, [tableId, fetchFields]);

  useEffect(() => {
    if (tableId && recordId && fields.length > 0) {
      fetchRecord();
    }
  }, [tableId, recordId, fields, fetchRecord]);

  // フィールド値を表示用にフォーマットする
  const formatFieldValue = (value: unknown, fieldId: string) => {
    if (value === null || value === undefined) return '-';
    
    const field = getFieldById(fields, fieldId);
    if (!field) return String(value);
    
    switch (field.type) {
      case 'checkbox':
        return value ? '✓' : '✗';
      case 'date':
        return new Date(value).toLocaleString();
      case 'select':
      case 'multiSelect':
        return Array.isArray(value) ? value.join(', ') : value;
      default:
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      );
    }
    
    if (!record) {
      return (
        <Empty
          image={<Empty.Image />}
          title="レコードが選択されていません"
          description="テーブルからレコードを選択してください"
        />
      );
    }
    
    return (
      <Card>
        <Descriptions
          data={fields.map(field => ({
            key: field.id,
            label: field.name,
            value: formatFieldValue(record.fields[field.id], field.id),
          }))}
          size="small"
          row
          layout="horizontal"
        />
      </Card>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title heading={3}>レコードビュー</Title>
        <Button 
          type="primary" 
          onClick={refreshData.execute} 
          loading={refreshData.loading}
        >
          更新
        </Button>
      </div>
      
      {renderContent()}
    </div>
  );
};

export default RecordView; 
