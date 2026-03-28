import { basekit, Component, NextStep, ParamType, type Context } from '@lark-opdev/block-basekit-server-api';

type DeleteMode = 'single' | 'filter';

type DeleteRecordApiResponse = {
  code: number;
  msg?: string;
  message?: string;
};

type ListRecordsApiResponse = {
  code: number;
  msg?: string;
  message?: string;
  data?: {
    has_more?: boolean;
    page_token?: string;
    items?: Array<{
      record_id?: string;
      recordId?: string;
      id?: string;
    }>;
  };
};

type BatchDeleteRecordsApiResponse = {
  code: number;
  msg?: string;
  message?: string;
  data?: {
    records?: Array<{
      deleted?: boolean;
      record_id?: string;
      recordId?: string;
    }>;
  };
};

function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveOpenApiOrigin(appUrl: string): string {
  return appUrl.includes('feishu.cn')
    ? 'https://open.feishu.cn'
    : 'https://open.larksuite.com';
}

function resolveTargetIds(args: Record<string, unknown>, context: Context) {
  const tableIdFromArgs = normalizeValue(args.targetTableId);
  const recordIdFromArgs = normalizeValue(args.targetRecordId);

  return {
    tableId: tableIdFromArgs || context.app.trigger.tableID || '',
    recordId: recordIdFromArgs || context.app.trigger.recordID || '',
    usedTriggerRecord: !tableIdFromArgs && !recordIdFromArgs,
  };
}

function resolveDeleteMode(args: Record<string, unknown>): DeleteMode {
  return args.deleteMode === 'filter' ? 'filter' : 'single';
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const normalized = typeof value === 'number' ? value : Number(normalizeValue(value));

  if (!Number.isInteger(normalized) || normalized <= 0) {
    return fallback;
  }

  return normalized;
}

function buildDeleteRecordUrl(context: Context, tableId: string, recordId: string): string {
  const origin = resolveOpenApiOrigin(context.app.url);
  const appToken = encodeURIComponent(context.app.token);
  const encodedTableId = encodeURIComponent(tableId);
  const encodedRecordId = encodeURIComponent(recordId);

  return `${origin}/open-apis/bitable/v1/apps/${appToken}/tables/${encodedTableId}/records/${encodedRecordId}`;
}

function buildListRecordsUrl(context: Context, tableId: string, filterFormula: string, pageToken?: string): string {
  const origin = resolveOpenApiOrigin(context.app.url);
  const appToken = encodeURIComponent(context.app.token);
  const encodedTableId = encodeURIComponent(tableId);
  const query = new URLSearchParams({
    filter: filterFormula,
    page_size: '100',
  });

  if (pageToken) {
    query.set('page_token', pageToken);
  }

  return `${origin}/open-apis/bitable/v1/apps/${appToken}/tables/${encodedTableId}/records?${query.toString()}`;
}

function buildBatchDeleteRecordsUrl(context: Context, tableId: string): string {
  const origin = resolveOpenApiOrigin(context.app.url);
  const appToken = encodeURIComponent(context.app.token);
  const encodedTableId = encodeURIComponent(tableId);

  return `${origin}/open-apis/bitable/v1/apps/${appToken}/tables/${encodedTableId}/records/batch_delete`;
}

function extractRecordId(item: { record_id?: string; recordId?: string; id?: string }): string {
  return item.record_id || item.recordId || item.id || '';
}

function getFetchHeaders(context: Context) {
  return {
    Authorization: `Bearer ${context.tenantAccessToken}`,
    'Content-Type': 'application/json',
  };
}

async function deleteRecord(url: string, context: Context): Promise<DeleteRecordApiResponse> {
  const response = await context.fetch(url, {
    method: 'DELETE',
    headers: getFetchHeaders(context),
  });

  const body = (await response.json()) as DeleteRecordApiResponse;

  if (!response.ok || body.code !== 0) {
    throw new Error(body.msg || body.message || 'Failed to delete the record.');
  }

  return body;
}

async function listMatchingRecordIds(
  context: Context,
  tableId: string,
  filterFormula: string,
  maxDeleteCount: number
): Promise<{ matchedRecordIds: string[]; capped: boolean }> {
  const matchedRecordIds: string[] = [];
  let pageToken: string | undefined;
  let capped = false;

  do {
    const response = await context.fetch(buildListRecordsUrl(context, tableId, filterFormula, pageToken), {
      method: 'GET',
      headers: getFetchHeaders(context),
    });
    const body = (await response.json()) as ListRecordsApiResponse;

    if (!response.ok || body.code !== 0) {
      throw new Error(body.msg || body.message || 'Failed to list records for deletion.');
    }

    const items = body.data?.items ?? [];

    for (const item of items) {
      const recordId = extractRecordId(item);

      if (!recordId) {
        continue;
      }

      if (matchedRecordIds.length >= maxDeleteCount) {
        capped = true;
        break;
      }

      matchedRecordIds.push(recordId);
    }

    if (capped) {
      break;
    }

    pageToken = body.data?.has_more ? body.data.page_token : undefined;
  } while (pageToken);

  return {
    matchedRecordIds,
    capped,
  };
}

async function batchDeleteRecords(
  context: Context,
  tableId: string,
  recordIds: string[]
): Promise<string[]> {
  const deletedRecordIds: string[] = [];

  for (let index = 0; index < recordIds.length; index += 100) {
    const chunk = recordIds.slice(index, index + 100);
    const response = await context.fetch(buildBatchDeleteRecordsUrl(context, tableId), {
      method: 'POST',
      headers: getFetchHeaders(context),
      body: JSON.stringify({
        records: chunk,
      }),
    });
    const body = (await response.json()) as BatchDeleteRecordsApiResponse;

    if (!response.ok || body.code !== 0) {
      throw new Error(body.msg || body.message || 'Failed to delete matched records.');
    }

    const records = body.data?.records ?? [];

    for (const record of records) {
      if (record.deleted) {
        const recordId = record.record_id || record.recordId;

        if (recordId) {
          deletedRecordIds.push(recordId);
        }
      }
    }
  }

  return deletedRecordIds;
}

basekit.addAction({
  description: 'レコード ID を指定して Base のレコードを削除するか、現在のトリガー元レコードを削除します。',
  actionText: 'レコードを削除',
  permission: {
    type: 2,
  },
  useTenantAccessToken: true,
  formItems: [
    {
      itemId: 'deleteMode',
      label: '削除方法',
      required: true,
      component: Component.SingleSelect,
      componentProps: {
        options: [
          {
            label: '1件のレコード',
            value: 'single',
          },
          {
            label: 'フィルタ条件に一致するレコード',
            value: 'filter',
          },
        ],
      },
    },
    {
      itemId: 'targetTableId',
      label: 'テーブル ID',
      component: Component.Input,
      componentProps: {
        placeholder: '空欄の場合はトリガー元のテーブル ID を使います',
      },
      help: '未入力の場合は、現在の自動化トリガーのテーブル ID を使います。',
    },
    {
      itemId: 'targetRecordId',
      label: 'レコード ID',
      component: Component.Input,
      displayBy: 'deleteMode:single',
      componentProps: {
        placeholder: '空欄の場合はトリガー元のレコード ID を使います',
      },
      help: '未入力の場合は、この自動化を開始したレコードを削除します。',
    },
    {
      itemId: 'filterFormula',
      label: 'フィルタ式',
      component: Component.Input,
      displayBy: 'deleteMode:filter',
      componentProps: {
        mode: 'textarea',
        placeholder: '例: CurrentValue.[ステータス] = "完了"',
      },
      help: 'Bitable のフィルタ式を使って削除対象のレコードを絞り込みます。',
    },
    {
      itemId: 'maxDeleteCount',
      label: '削除上限件数',
      component: Component.Input,
      displayBy: 'deleteMode:filter',
      componentProps: {
        placeholder: '100',
      },
      help: '意図しない大量削除を避けるため、この件数に達したら停止します。',
    },
  ],
  execute: async function (args, context) {
    const deleteMode = resolveDeleteMode(args);
    const { tableId, recordId, usedTriggerRecord } = resolveTargetIds(args, context);

    if (!context.tenantAccessToken) {
      throw new Error('tenantAccessToken が必要です。このアクションでは useTenantAccessToken を有効にしてください。');
    }

    if (!tableId) {
      throw new Error('tableId が必要です。直接指定するか、レコード系トリガーから実行してください。');
    }

    if (deleteMode === 'single') {
      if (!recordId) {
        throw new Error('recordId が必要です。直接指定するか、レコード系トリガーから実行してください。');
      }

      const url = buildDeleteRecordUrl(context, tableId, recordId);
      await deleteRecord(url, context);

      return {
        success: true,
        deleteMode,
        deletedTableId: tableId,
        deletedRecordId: recordId,
        deletedCount: 1,
        matchedCount: 1,
        usedTriggerRecord,
        capped: false,
        message: 'レコードを削除しました。',
      };
    }

    const filterFormula = normalizeValue(args.filterFormula);
    const maxDeleteCount = normalizePositiveInteger(args.maxDeleteCount, 100);

    if (!filterFormula) {
      throw new Error('削除方法が「フィルタ条件に一致するレコード」の場合、filterFormula が必要です。');
    }

    const { matchedRecordIds, capped } = await listMatchingRecordIds(context, tableId, filterFormula, maxDeleteCount);

    if (matchedRecordIds.length === 0) {
      return {
        success: true,
        deleteMode,
        deletedTableId: tableId,
        deletedRecordId: '',
        deletedCount: 0,
        matchedCount: 0,
        usedTriggerRecord: false,
        capped: false,
        message: 'フィルタ条件に一致するレコードはありませんでした。',
      };
    }

    const deletedRecordIds = await batchDeleteRecords(context, tableId, matchedRecordIds);

    return {
      success: true,
      deleteMode,
      deletedTableId: tableId,
      deletedRecordId: deletedRecordIds[0] || '',
      deletedCount: deletedRecordIds.length,
      matchedCount: matchedRecordIds.length,
      usedTriggerRecord: false,
      capped,
      message: capped
        ? 'フィルタ条件に一致したレコードを、設定した上限件数まで削除しました。'
        : 'フィルタ条件に一致したレコードを削除しました。',
    };
  },
  resultType: {
    type: ParamType.Object,
    properties: {
      success: {
        type: ParamType.Boolean,
        label: '成功',
      },
      deleteMode: {
        type: ParamType.String,
        label: '削除方法',
      },
      deletedTableId: {
        type: ParamType.String,
        label: '削除対象テーブル ID',
      },
      deletedRecordId: {
        type: ParamType.String,
        label: '削除対象レコード ID',
      },
      deletedCount: {
        type: ParamType.Number,
        label: '削除件数',
      },
      matchedCount: {
        type: ParamType.Number,
        label: '一致件数',
      },
      usedTriggerRecord: {
        type: ParamType.Boolean,
        label: 'トリガーレコードを使用',
      },
      capped: {
        type: ParamType.Boolean,
        label: '上限到達',
      },
      message: {
        type: ParamType.String,
        label: 'メッセージ',
      },
    },
  },
  nextSteps: [NextStep.LarkMessage],
});

export { buildBatchDeleteRecordsUrl, buildDeleteRecordUrl, buildListRecordsUrl, resolveOpenApiOrigin, resolveTargetIds };
export default basekit;
