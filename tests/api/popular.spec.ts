import { expect, test, type APIRequestContext } from '@playwright/test';
import { expectSchema } from '../helpers/schema';

/**
 * GET /api/popular — plan rows S1, P1, A1, A2, A3, SCH1.
 * Expectations from docs/features/popular-plants.md and OpenAPI.
 */

const PLANT_SUMMARY_KEYS = [
  'id',
  'name',
  'latinName',
  'price',
  'light',
  'careLevel',
  'petSafe',
  'stock',
  'rating',
  'imageUrl',
] as const;

const POPULAR_ITEM_KEYS = [...PLANT_SUMMARY_KEYS, 'unitsSold'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface PopularItem {
  id: string;
  name: string;
  unitsSold: number;
  stock: number;
  price: number;
}

function parsePopularList(body: unknown): { days: number; items: PopularItem[] } {
  if (!isRecord(body) || typeof body.days !== 'number' || !Array.isArray(body.items)) {
    throw new Error(`Expected PopularList, received ${JSON.stringify(body)}`);
  }
  const items = body.items.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`items[${index}] is not an object`);
    }
    if (typeof item.id !== 'string' || typeof item.name !== 'string') {
      throw new Error(`items[${index}] missing id or name`);
    }
    if (typeof item.unitsSold !== 'number' || typeof item.stock !== 'number') {
      throw new Error(`items[${index}] missing unitsSold or stock`);
    }
    if (typeof item.price !== 'number') {
      throw new Error(`items[${index}] missing price`);
    }
    return {
      id: item.id,
      name: item.name,
      unitsSold: item.unitsSold,
      stock: item.stock,
      price: item.price,
    };
  });
  return { days: body.days, items };
}

function collectStringValues(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectStringValues(entry, out);
    return out;
  }
  if (isRecord(value)) {
    for (const entry of Object.values(value)) collectStringValues(entry, out);
  }
  return out;
}

async function loginAva(request: APIRequestContext): Promise<{ Authorization: string }> {
  const email = process.env.FERNLY_USER_EMAIL ?? 'ava@fernly.test';
  const password = process.env.FERNLY_USER_PASSWORD ?? 'Fernly-Ava-2026';
  const response = await request.post('/api/auth/login', { data: { email, password } });
  expect(response.status(), 'Ava login').toBe(200);
  const body: unknown = await response.json();
  if (!isRecord(body) || typeof body.token !== 'string') {
    throw new Error('Login did not return a token');
  }
  return { Authorization: `Bearer ${body.token}` };
}

function isTwoDecimalDollars(price: number): boolean {
  return Number.isInteger(Math.round(price * 100)) && Math.abs(price * 100 - Math.round(price * 100)) < 1e-9;
}

test('S1 GET /api/popular works signed out and matches Ava’s bearer response', { tag: '@api' }, async ({
  request,
}) => {
  const signedOut = await request.get('/api/popular');
  expect(signedOut.status()).toBe(200);
  const signedOutBody: unknown = await signedOut.json();
  await expectSchema(request, signedOutBody, 'PopularList');
  const signedOutList = parsePopularList(signedOutBody);
  expect(signedOutList.days).toBe(30);
  expect(signedOutList.items).toHaveLength(4);

  const ava = await loginAva(request);
  const signedIn = await request.get('/api/popular', { headers: ava });
  expect(signedIn.status()).toBe(200);
  const signedInBody: unknown = await signedIn.json();
  const signedInList = parsePopularList(signedInBody);
  expect(signedInList.items.map((item) => ({ id: item.id, unitsSold: item.unitsSold }))).toEqual(
    signedOutList.items.map((item) => ({ id: item.id, unitsSold: item.unitsSold })),
  );
});

test('P1 GET /api/popular exposes only PlantSummary fields plus unitsSold', { tag: '@api' }, async ({
  request,
}) => {
  const response = await request.get('/api/popular', { params: { limit: 12 } });
  expect(response.status()).toBe(200);
  const body: unknown = await response.json();
  if (!isRecord(body) || !Array.isArray(body.items)) {
    throw new Error('Expected PopularList');
  }
  expect(Object.keys(body).sort()).toEqual(['days', 'items']);
  for (const [index, item] of body.items.entries()) {
    if (!isRecord(item)) throw new Error(`items[${index}] is not an object`);
    expect(Object.keys(item).sort(), `items[${index}] keys`).toEqual([...POPULAR_ITEM_KEYS].sort());
  }
  const strings = collectStringValues(body);
  for (const value of strings) {
    expect(value.startsWith('ord-'), `leaked order id in ${value}`).toBe(false);
    expect(value.includes('@'), `leaked email-like value in ${value}`).toBe(false);
  }
});

test('A1 GET /api/popular ranks by unitsSold descending with distinct ids', { tag: '@api' }, async ({
  request,
}) => {
  const response = await request.get('/api/popular', { params: { limit: 12 } });
  expect(response.status()).toBe(200);
  const body: unknown = await response.json();
  await expectSchema(request, body, 'PopularList');
  const list = parsePopularList(body);
  expect(list.days).toBe(30);
  expect(list.items).toHaveLength(12);

  const ids = list.items.map((item) => item.id);
  expect(new Set(ids).size).toBe(ids.length);

  for (let i = 0; i < list.items.length; i += 1) {
    const item = list.items[i]!;
    expect(Number.isInteger(item.unitsSold), `items[${i}].unitsSold integer`).toBe(true);
    expect(item.unitsSold, `items[${i}].unitsSold`).toBeGreaterThanOrEqual(0);
    if (i > 0) {
      const prev = list.items[i - 1]!;
      expect(item.unitsSold, `items[${i}] unitsSold never above previous`).toBeLessThanOrEqual(prev.unitsSold);
      if (item.unitsSold === prev.unitsSold) {
        expect(prev.name.localeCompare(item.name), 'tie break A to Z').toBeLessThanOrEqual(0);
      }
    }
  }

  const topFour = await request.get('/api/popular', { params: { limit: 4 } });
  expect(topFour.status()).toBe(200);
  const topFourList = parsePopularList(await topFour.json());
  expect(topFourList.items.map((item) => ({ id: item.id, unitsSold: item.unitsSold }))).toEqual(
    list.items.slice(0, 4).map((item) => ({ id: item.id, unitsSold: item.unitsSold })),
  );
});

test('A2 GET /api/popular leaves out out-of-stock plants including pl-pilea', { tag: '@api' }, async ({
  request,
}) => {
  const response = await request.get('/api/popular', { params: { limit: 12 } });
  expect(response.status()).toBe(200);
  const list = parsePopularList(await response.json());

  for (const item of list.items) {
    expect(item.stock, `${item.id} stock`).toBeGreaterThanOrEqual(1);
    const plant = await request.get(`/api/plants/${item.id}`);
    expect(plant.status(), `GET /api/plants/${item.id}`).toBe(200);
    const plantBody: unknown = await plant.json();
    if (!isRecord(plantBody) || typeof plantBody.stock !== 'number') {
      throw new Error(`Plant ${item.id} missing stock`);
    }
    expect(item.stock, `${item.id} stock matches plant detail`).toBe(plantBody.stock);
  }

  for (const limit of [1, 4, 5, 12]) {
    const limited = await request.get('/api/popular', { params: { limit } });
    expect(limited.status(), `limit=${limit}`).toBe(200);
    const limitedList = parsePopularList(await limited.json());
    expect(
      limitedList.items.some((item) => item.id === 'pl-pilea'),
      `pl-pilea absent at limit=${limit}`,
    ).toBe(false);
  }
});

test('A3 GET /api/popular limit defaults to 4 and rejects values outside 1–12', { tag: '@api' }, async ({
  request,
}) => {
  const noLimit = await request.get('/api/popular');
  expect(noLimit.status()).toBe(200);
  expect(parsePopularList(await noLimit.json()).items).toHaveLength(4);

  for (const [limit, expectedCount] of [
    [1, 1],
    [5, 5],
    [12, 12],
  ] as const) {
    const response = await request.get('/api/popular', { params: { limit } });
    expect(response.status(), `limit=${limit}`).toBe(200);
    expect(parsePopularList(await response.json()).items, `limit=${limit} length`).toHaveLength(
      expectedCount,
    );
  }

  for (const limit of ['0', '13', '-1', 'abc', '2.5']) {
    const response = await request.get(`/api/popular?limit=${limit}`);
    expect(response.status(), `limit=${limit} status`).toBe(400);
    expect(response.status(), `limit=${limit} not 500`).not.toBe(500);
    const body: unknown = await response.json();
    await expectSchema(request, body, 'Error');
    if (!isRecord(body) || typeof body.rule !== 'string') {
      throw new Error(`limit=${limit} missing rule`);
    }
    expect(body.rule, `limit=${limit} rule`).toBe('validation_error');
  }
});

test('SCH1 OpenAPI documents /api/popular and responses match PopularList / Error', { tag: '@api' }, async ({
  request,
}) => {
  const openapi = await request.get('/openapi.json');
  expect(openapi.status()).toBe(200);
  const doc: unknown = await openapi.json();
  if (!isRecord(doc) || !isRecord(doc.paths) || !isRecord(doc.paths['/api/popular'])) {
    throw new Error('OpenAPI missing /api/popular');
  }
  const pathItem = doc.paths['/api/popular'];
  if (!isRecord(pathItem) || !isRecord(pathItem.get)) {
    throw new Error('OpenAPI missing GET /api/popular');
  }
  const getOp = pathItem.get;
  if (!Array.isArray(getOp.parameters)) {
    throw new Error('GET /api/popular has no parameters');
  }
  const limitParam = getOp.parameters.find(
    (param) => isRecord(param) && param.name === 'limit' && param.in === 'query',
  );
  expect(limitParam, 'limit query parameter').toBeTruthy();
  if (!isRecord(limitParam) || !isRecord(limitParam.schema)) {
    throw new Error('limit parameter has no schema');
  }
  expect(limitParam.schema.type).toBe('integer');
  expect(limitParam.schema.minimum).toBe(1);
  expect(limitParam.schema.maximum).toBe(12);

  if (!isRecord(getOp.responses)) {
    throw new Error('GET /api/popular has no responses');
  }
  expect(getOp.responses['200'], '200 response').toBeTruthy();
  expect(getOp.responses['400'], '400 response').toBeTruthy();

  for (const params of [undefined, { limit: 1 }, { limit: 5 }, { limit: 12 }] as const) {
    const response = await request.get('/api/popular', params ? { params } : undefined);
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    await expectSchema(request, body, 'PopularList');
    if (!isRecord(body) || typeof body.days !== 'number' || !Array.isArray(body.items)) {
      throw new Error('Expected PopularList body');
    }
    expect(body.days).toBe(30);
    for (const [index, item] of body.items.entries()) {
      await expectSchema(request, item, 'PopularPlant');
      if (!isRecord(item) || typeof item.price !== 'number' || typeof item.id !== 'string') {
        throw new Error(`items[${index}] missing id or price`);
      }
      expect(isTwoDecimalDollars(item.price), `${item.id} price two-decimal dollars`).toBe(true);
    }
  }

  const bad = await request.get('/api/popular', { params: { limit: 13 } });
  expect(bad.status()).toBe(400);
  await expectSchema(request, await bad.json(), 'Error');
});
