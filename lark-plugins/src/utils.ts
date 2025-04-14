import {
  bitable,
  IOpenCellValue,
  ViewType,
} from '@lark-opdev/block-bitable-api';
import { getRenderFunc } from './render_helper';

// ページネーションのインターフェース
export interface IPaginationParams {
  pageSize: number;
  current: number;
}

// テーブルデータの型定義
export interface ITableData {
  table: any;
  columns: any[];
  dataSource: Record<string, IOpenCellValue>[];
  total: number;
}

export const getTableData = async (pagination?: IPaginationParams): Promise<ITableData | null> => {
  try {
    console.log('データ取得開始...');
    
    // 获取 selection
    const selection = await bitable.base.getSelection();
    if (!selection.tableId) {
      console.log('テーブルが選択されていません');
      return null;
    }
    
    console.log(`選択されたテーブルID: ${selection.tableId}`);
    
    // 获取当前表
    const table = await bitable.base.getTableById(selection.tableId);
    
    // 获取视图列表，并取出第一个 grid 视图 meta
    const views = await table.getViewMetaList();
    console.log(`ビュー数: ${views.length}`);
    
    const GridViewMeta = views.find((view) => view.type === ViewType.Grid);
    if (!GridViewMeta) {
      console.log('グリッドビューが見つかりません');
      return null;
    }
    
    console.log(`選択されたビューID: ${GridViewMeta.id}`);
    
    const view = await table.getViewById(GridViewMeta.id);
    
    // 获取视图下的 records & fields
    console.log('全てのレコードIDを取得中...');
    const allRecords = await view.getVisibleRecordIdList();
    console.log(`取得したレコード数: ${allRecords.length}`);
    
    const fieldMetas = await view.getFieldMetaList();
    console.log(`フィールド数: ${fieldMetas.length}`);
    
    // ページネーションを使用せず、全てのレコードを取得
    const records = allRecords;
    
    // 获取每个单元格的值
    console.log('各レコードの値を取得中...');
    const recordValues = await Promise.all(
      records.filter(Boolean).map(async (recordId, index) => {
        if (!recordId) return;
        
        // 進捗状況をログに出力（大量のレコードがある場合に便利）
        if (index % 100 === 0) {
          console.log(`レコード処理中: ${index}/${records.length}`);
        }
        
        const recordValue: Record<string, IOpenCellValue> = {};
        await Promise.all(
          fieldMetas.map(async (fieldMeta) => {
            try {
              const cellValue = await table.getCellValue(fieldMeta.id, recordId);
              recordValue[fieldMeta.id] = cellValue;
              return cellValue;
            } catch (error) {
              console.error(`セル値の取得エラー: フィールド=${fieldMeta.id}, レコード=${recordId}`, error);
              return null;
            }
          })
        );
        recordValue['recordId'] = recordId;
        return recordValue;
      })
    );
    
    // 生成 表头配置
    const columns = fieldMetas.map((meta) => {
      return {
        title: meta.name,
        dataIndex: meta.id,
        // 获取渲染函数
        render: getRenderFunc({ meta, table }),
        meta: meta, // フィールドメタデータを列情報に追加
      };
    });
    
    // 生成表数据
    const dataSource = recordValues.filter(Boolean) as Record<
      string,
      IOpenCellValue
    >[];
    
    console.log(`データ取得完了: ${dataSource.length}件のレコード`);
    
    return {
      table,
      columns,
      dataSource,
      total: allRecords.length,
    };
  } catch (error) {
    console.error('データ取得エラー:', error);
    throw error;
  }
};
