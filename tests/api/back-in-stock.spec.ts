import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { expectSchema } from '../helpers/schema';

/**
 * Back-in-stock notify against docs/features/back-in-stock.md and OpenAPI.
 * A mismatch with the running API is a failure to keep, not an assertion to edit.
 */

const AVA = {
  email: process.env.FERNLY_USER_EMAIL ?? 'ava@fernly.test',
  password: process.env.FERNLY_USER_PASSWORD ?? 'Fernly-Ava-2026',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function jsonBody(response: APIResponse): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

async function loginAva(request: APIRequestContext): Promise<{ Authorization: string }> {
  const response = await request.post('/api/auth/login', {
    data: { email: AVA.email, password: AVA.password },
  });
  expect(response.status(), 'login Ava').toBe(200);
  const body = await jsonBody(response);
  if (!isRecord(body) || typeof body.token !== 'string') {
    throw new Error('Login for Ava did not return a token');
  }
  return { Authorization: `Bearer ${body.token}` };
}

function assertErrorShape(
  body: unknown,
  expected: { detail?: string; rule?: string; noRule?: boolean },
): void {
  expect(isRecord(body), 'error body is an object').toBe(true);
  if (!isRecord(body)) return;
  expect(typeof body.detail, 'detail is a string').toBe('string');
  if (expected.detail !== undefined) {
    expect(body.detail, 'detail').toBe(expected.detail);
  }
  if (expected.noRule) {
    expect(body.rule, 'a 404 has no rule').toBeUndefined();
  }
  if (expected.rule !== undefined) {
    expect(body.rule, 'rule').toBe(expected.rule);
  }
}

test('P1 notify 201 returns only the caller email and plantId; no list endpoint', { tag: '@api' }, async ({
  request,
}) => {
  const first = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: 'privacy-ava@fernly.test' },
  });
  expect(first.status()).toBe(201);
  const firstBody = await jsonBody(first);
  expect(isRecord(firstBody)).toBe(true);
  if (!isRecord(firstBody)) return;
  expect(firstBody.email).toBe('privacy-ava@fernly.test');
  expect(firstBody.plantId).toBe('pl-pilea');
  expect(firstBody.status).toBe('subscribed');
  expect(JSON.stringify(firstBody), 'response must not leak other emails').not.toMatch(
    /privacy-ben@fernly\.test/i,
  );

  const second = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: 'privacy-ben@fernly.test' },
  });
  expect(second.status()).toBe(201);
  const secondBody = await jsonBody(second);
  expect(isRecord(secondBody)).toBe(true);
  if (!isRecord(secondBody)) return;
  expect(secondBody.email).toBe('privacy-ben@fernly.test');
  expect(secondBody.plantId).toBe('pl-pilea');
  expect(secondBody.status).toBe('subscribed');
  expect(JSON.stringify(secondBody), 'never echo Ava’s email to Ben').not.toMatch(
    /privacy-ava@fernly\.test/i,
  );

  const listGet = await request.get('/api/plants/pl-pilea/notify');
  expect([404, 405]).toContain(listGet.status());
});

test('S1 notify succeeds without Authorization and also with Ava’s bearer token', { tag: '@api' }, async ({
  request,
}) => {
  const signedOut = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: 's1-signed-out@fernly.test' },
  });
  expect(signedOut.status()).toBe(201);

  const headers = await loginAva(request);
  const signedIn = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: 's1-signed-in@fernly.test' },
    headers,
  });
  expect(signedIn.status()).toBe(201);
});

test('M1 out-of-stock notify returns 201 NotifyResult; trimmed email still subscribes', { tag: '@api' }, async ({
  request,
}) => {
  const response = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: 'ava@fernly.test' },
  });
  expect(response.status()).toBe(201);
  const body = await jsonBody(response);
  await expectSchema(request, body, 'NotifyResult');
  expect(isRecord(body)).toBe(true);
  if (!isRecord(body)) return;
  expect(body.status).toBe('subscribed');
  expect(body.plantId).toBe('pl-pilea');
  expect(body.email).toBe('ava@fernly.test');

  const trimmed = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: '  m1-trim@fernly.test  ' },
  });
  expect(trimmed.status()).toBe(201);
  const trimmedBody = await jsonBody(trimmed);
  expect(isRecord(trimmedBody)).toBe(true);
  if (!isRecord(trimmedBody)) return;
  expect(trimmedBody.email).toBe('m1-trim@fernly.test');
  expect(trimmedBody.status).toBe('subscribed');
});

test('M2 in-stock plants are refused with rule in_stock', { tag: '@api' }, async ({ request }) => {
  const pothos = await request.post('/api/plants/pl-pothos/notify', {
    data: { email: 'ava@fernly.test' },
  });
  expect(pothos.status()).toBe(400);
  const pothosBody = await jsonBody(pothos);
  assertErrorShape(pothosBody, { rule: 'in_stock' });

  const hoya = await request.post('/api/plants/pl-hoya/notify', {
    data: { email: 'ava@fernly.test' },
  });
  expect(hoya.status()).toBe(400);
  const hoyaBody = await jsonBody(hoya);
  assertErrorShape(hoyaBody, { rule: 'in_stock' });
});

test('N1 incomplete emails and missing email are 400; unknown plant is 404 without rule', {
  tag: '@api',
}, async ({ request }) => {
  for (const email of ['a@b', 'name@'] as const) {
    const response = await request.post('/api/plants/pl-pilea/notify', { data: { email } });
    expect(response.status(), `email ${email}`).toBe(400);
    const body = await jsonBody(response);
    expect(isRecord(body)).toBe(true);
    if (!isRecord(body)) continue;
    expect(typeof body.detail).toBe('string');
    // OpenAPI / APP-MAP: validation failures use validation_error (or equivalent).
    if (typeof body.rule === 'string') {
      expect(['validation_error', 'invalid_email']).toContain(body.rule);
    }
  }

  const empty = await request.post('/api/plants/pl-pilea/notify', { data: { email: '' } });
  expect(empty.status()).toBe(400);
  assertErrorShape(await jsonBody(empty), { rule: 'validation_error' });

  const missing = await request.post('/api/plants/pl-pilea/notify', { data: {} });
  expect(missing.status()).toBe(400);
  assertErrorShape(await jsonBody(missing), { rule: 'validation_error' });

  const unknown = await request.post('/api/plants/pl-no-such/notify', {
    data: { email: 'ava@fernly.test' },
  });
  expect(unknown.status()).toBe(404);
  assertErrorShape(await jsonBody(unknown), { noRule: true });
});

test('N2 one sign-up per email per plant; case ignored; other email still allowed', { tag: '@api' }, async ({
  request,
}) => {
  const first = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: 'n2-ava@fernly.test' },
  });
  expect(first.status()).toBe(201);

  const dup = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: 'n2-ava@fernly.test' },
  });
  expect(dup.status()).toBe(409);
  assertErrorShape(await jsonBody(dup), {
    rule: 'already_subscribed',
    detail: "You're already on the list",
  });

  const cased = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: 'N2-AVA@fernly.test' },
  });
  expect(cased.status()).toBe(409);
  assertErrorShape(await jsonBody(cased), {
    rule: 'already_subscribed',
    detail: "You're already on the list",
  });

  const other = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: 'n2-other@fernly.test' },
  });
  expect(other.status()).toBe(201);
});

test('SCH1 NotifyResult matches OpenAPI; 400/409 have detail+rule; 404 has detail only', {
  tag: '@api',
}, async ({ request }) => {
  const ok = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: 'sch1@fernly.test' },
  });
  expect(ok.status()).toBe(201);
  await expectSchema(request, await jsonBody(ok), 'NotifyResult');

  const inStock = await request.post('/api/plants/pl-pothos/notify', {
    data: { email: 'sch1@fernly.test' },
  });
  expect(inStock.status()).toBe(400);
  assertErrorShape(await jsonBody(inStock), { rule: 'in_stock' });

  const again = await request.post('/api/plants/pl-pilea/notify', {
    data: { email: 'sch1@fernly.test' },
  });
  expect(again.status()).toBe(409);
  assertErrorShape(await jsonBody(again), { rule: 'already_subscribed' });

  const missing = await request.post('/api/plants/pl-missing-sch1/notify', {
    data: { email: 'sch1@fernly.test' },
  });
  expect(missing.status()).toBe(404);
  assertErrorShape(await jsonBody(missing), { noRule: true });
});
