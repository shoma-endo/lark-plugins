import assert from 'node:assert/strict';

import { createActionContext, testAction, TriggerType, type Context } from '@lark-opdev/block-basekit-server-api';

import '../src/register';

type FetchResponse = Awaited<ReturnType<Context['fetch']>>;

function createMockResponse(body: unknown): FetchResponse {
  return {
    ok: true,
    json: async () => body,
  } as FetchResponse;
}

async function testDeleteRecordWithTriggerFallback() {
  let calledUrl = '';
  let calledMethod = '';
  let authorizationHeader = '';

  const context = await createActionContext({
    tenantAccessToken: 'tenant-token',
    app: {
      logID: 'log-id',
      token: 'app_token',
      timeZone: 'Asia/Tokyo',
      url: 'https://base.larksuite.com/base/app_token',
      trigger: {
        type: TriggerType.AddRecord,
        tableID: 'tbl_trigger',
        recordID: 'rec_trigger',
      },
    },
    fetch: async (url, init) => {
      calledUrl = String(url);
      calledMethod = init?.method ?? '';

      if (init?.headers && !Array.isArray(init.headers)) {
        authorizationHeader = String((init.headers as Record<string, string>).Authorization || '');
      }

      return createMockResponse({ code: 0, msg: 'success' });
    },
  });

  const result = await testAction({}, context);

  assert.equal(calledMethod, 'DELETE');
  assert.equal(authorizationHeader, 'Bearer tenant-token');
  assert.equal(
    calledUrl,
    'https://open.larksuite.com/open-apis/bitable/v1/apps/app_token/tables/tbl_trigger/records/rec_trigger'
  );
  assert.deepEqual(result, {
    success: true,
    deleteMode: 'single',
    deletedTableId: 'tbl_trigger',
    deletedRecordId: 'rec_trigger',
    deletedCount: 1,
    matchedCount: 1,
    usedTriggerRecord: true,
    capped: false,
    message: 'レコードを削除しました。',
  });
}

async function testDeleteRecordWithExplicitArgs() {
  let calledUrl = '';

  const context = await createActionContext({
    tenantAccessToken: 'tenant-token',
    app: {
      logID: 'log-id',
      token: 'app_token',
      timeZone: 'Asia/Tokyo',
      url: 'https://base.feishu.cn/base/app_token',
      trigger: {
        type: TriggerType.Timer,
      },
    },
    fetch: async (url, _init) => {
      calledUrl = String(url);
      return createMockResponse({ code: 0, msg: 'success' });
    },
  });

  const result = await testAction(
    {
      targetTableId: 'tbl_manual',
      targetRecordId: 'rec_manual',
    },
    context
  );

  assert.equal(
    calledUrl,
    'https://open.feishu.cn/open-apis/bitable/v1/apps/app_token/tables/tbl_manual/records/rec_manual'
  );
  assert.deepEqual(result, {
    success: true,
    deleteMode: 'single',
    deletedTableId: 'tbl_manual',
    deletedRecordId: 'rec_manual',
    deletedCount: 1,
    matchedCount: 1,
    usedTriggerRecord: false,
    capped: false,
    message: 'レコードを削除しました。',
  });
}

async function testDeleteRecordsWithFilter() {
  const calls: Array<{ url: string; method: string; body?: string }> = [];

  const context = await createActionContext({
    tenantAccessToken: 'tenant-token',
    app: {
      logID: 'log-id',
      token: 'app_token',
      timeZone: 'Asia/Tokyo',
      url: 'https://base.larksuite.com/base/app_token',
      trigger: {
        type: TriggerType.Timer,
      },
    },
    fetch: async (url, init) => {
      const normalizedUrl = String(url);
      const method = init?.method ?? 'GET';
      const body = typeof init?.body === 'string' ? init.body : undefined;

      calls.push({
        url: normalizedUrl,
        method,
        body,
      });

      if (method === 'GET') {
        return createMockResponse({
          code: 0,
          data: {
            has_more: false,
            items: [{ record_id: 'rec_1' }, { record_id: 'rec_2' }],
          },
        });
      }

      return createMockResponse({
        code: 0,
        data: {
          records: [
            { deleted: true, record_id: 'rec_1' },
            { deleted: true, record_id: 'rec_2' },
          ],
        },
      });
    },
  });

  const result = await testAction(
    {
      deleteMode: 'filter',
      targetTableId: 'tbl_filter',
      filterFormula: 'CurrentValue.[Status] = "Done"',
      maxDeleteCount: '50',
    },
    context
  );

  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.method, 'GET');
  assert.match(calls[0]?.url || '', /\/tables\/tbl_filter\/records\?/);
  assert.match(calls[0]?.url || '', /filter=CurrentValue/);
  assert.equal(calls[1]?.method, 'POST');
  assert.equal(calls[1]?.url, 'https://open.larksuite.com/open-apis/bitable/v1/apps/app_token/tables/tbl_filter/records/batch_delete');
  assert.equal(calls[1]?.body, JSON.stringify({ records: ['rec_1', 'rec_2'] }));
  assert.deepEqual(result, {
    success: true,
    deleteMode: 'filter',
    deletedTableId: 'tbl_filter',
    deletedRecordId: 'rec_1',
    deletedCount: 2,
    matchedCount: 2,
    usedTriggerRecord: false,
    capped: false,
    message: 'フィルタ条件に一致したレコードを削除しました。',
  });
}

async function main() {
  await testDeleteRecordWithTriggerFallback();
  await testDeleteRecordWithExplicitArgs();
  await testDeleteRecordsWithFilter();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
