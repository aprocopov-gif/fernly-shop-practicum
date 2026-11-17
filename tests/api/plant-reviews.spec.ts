import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { expectSchema } from '../helpers/schema';

/**
 * Plant reviews against docs/features/plant-reviews.md, docs/PRODUCT.md, and OpenAPI.
 * A mismatch with the running API is a failure to keep, not an assertion to edit.
 *
 * Shared seed reviews on pl-snake are mutated by delete tests — keep this file ordered
 * so non-destructive cases run before Ben deletes rv-seed-3.
 */

const AVA = {
  email: process.env.FERNLY_USER_EMAIL ?? 'ava@fernly.test',
  password: process.env.FERNLY_USER_PASSWORD ?? 'Fernly-Ava-2026',
};
const BEN = {
  email: process.env.FERNLY_ALT_USER_EMAIL ?? 'ben@fernly.test',
  password: process.env.FERNLY_ALT_USER_PASSWORD ?? 'Fernly-Ben-2026',
};

const VALID_TEXT = 'Healthy leaves and easy care.';
const LONG_ENOUGH = 'Long enough text here.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function jsonBody(response: APIResponse): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<{ Authorization: string; name?: string }> {
  const response = await request.post('/api/auth/login', { data: { email, password } });
  expect(response.status(), `login ${email}`).toBe(200);
  const body = await jsonBody(response);
  if (!isRecord(body) || typeof body.token !== 'string') {
    throw new Error(`Login for ${email} did not return a token`);
  }
  const name = typeof body.name === 'string' ? body.name : undefined;
  return { Authorization: `Bearer ${body.token}`, name };
}

async function loginAva(request: APIRequestContext) {
  return login(request, AVA.email, AVA.password);
}

async function loginBen(request: APIRequestContext) {
  return login(request, BEN.email, BEN.password);
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

function reviewIds(body: unknown): string[] {
  if (!isRecord(body) || !Array.isArray(body.reviews)) {
    throw new Error(`Expected ReviewList with reviews array: ${JSON.stringify(body)}`);
  }
  return body.reviews.map((item, index) => {
    if (!isRecord(item) || typeof item.id !== 'string') {
      throw new Error(`Review at ${index} is missing id`);
    }
    return item.id;
  });
}

function assertNoUserId(body: unknown): void {
  const serialized = JSON.stringify(body);
  expect(serialized, 'response must not include userId').not.toContain('userId');
  if (isRecord(body) && Array.isArray(body.reviews)) {
    for (const item of body.reviews) {
      if (isRecord(item)) {
        expect(item, 'review object').not.toHaveProperty('userId');
      }
    }
  }
}

test('M1 GET pl-snake reviews returns average 4.7, count 3, newest first', { tag: '@api' }, async ({
  request,
}) => {
  const response = await request.get('/api/plants/pl-snake/reviews');
  expect(response.status()).toBe(200);
  const body = await jsonBody(response);
  await expectSchema(request, body, 'ReviewList');
  assertNoUserId(body);

  if (!isRecord(body)) throw new Error('ReviewList is not an object');
  expect(body.plantId).toBe('pl-snake');
  expect(body.count).toBe(3);
  // Documented halves-up average is 4.7; soft so author order still runs if rounding drifts.
  expect.soft(body.average, 'average halves up to 4.7').toBe(4.7);
  if (!Array.isArray(body.reviews) || body.reviews.length !== 3) {
    throw new Error(`Expected 3 reviews, got ${JSON.stringify(body.reviews)}`);
  }

  const authors = body.reviews.map((item) => {
    if (!isRecord(item)) throw new Error('review item is not an object');
    expect(typeof item.id).toBe('string');
    expect(typeof item.author).toBe('string');
    expect(typeof item.rating).toBe('number');
    expect(typeof item.text).toBe('string');
    expect(typeof item.createdAt).toBe('string');
    return item.author;
  });
  expect(authors[0]).toBe('Ben Moss');
  expect(authors[1]).toBe('Omar K.');
  expect(authors[2]).toBe('Grace L.');
  expect(String(body.reviews[0] && isRecord(body.reviews[0]) ? body.reviews[0].createdAt : '')).toMatch(
    /^2026-10-05/,
  );
});

test('M1 GET pl-pilea reviews is empty with average 0', { tag: '@api' }, async ({ request }) => {
  const response = await request.get('/api/plants/pl-pilea/reviews');
  expect(response.status()).toBe(200);
  const body = await jsonBody(response);
  await expectSchema(request, body, 'ReviewList');
  if (!isRecord(body)) throw new Error('ReviewList is not an object');
  expect(body.average).toBe(0);
  expect(body.count).toBe(0);
  expect(body.reviews).toEqual([]);
});

test('M1 GET pl-monstera reviews averages 4.5 with count 2', { tag: '@api' }, async ({ request }) => {
  const response = await request.get('/api/plants/pl-monstera/reviews');
  expect(response.status()).toBe(200);
  const body = await jsonBody(response);
  await expectSchema(request, body, 'ReviewList');
  if (!isRecord(body)) throw new Error('ReviewList is not an object');
  expect(body.average).toBe(4.5);
  expect(body.count).toBe(2);
});

test('S1 GET reviews is public; POST and DELETE without a token are auth_required', { tag: '@api' }, async ({
  request,
}) => {
  const before = await request.get('/api/plants/pl-snake/reviews');
  expect(before.status()).toBe(200);
  const beforeBody = await jsonBody(before);
  if (!isRecord(beforeBody)) throw new Error('expected ReviewList');
  expect(beforeBody.count).toBe(3);
  const beforeIds = reviewIds(beforeBody);

  const post = await request.post('/api/plants/pl-pothos/reviews', {
    data: { rating: 4, text: VALID_TEXT },
  });
  expect(post.status()).toBe(401);
  const postBody = await jsonBody(post);
  assertErrorShape(postBody, { rule: 'auth_required' });

  const del = await request.delete('/api/reviews/rv-seed-1');
  expect(del.status()).toBe(401);
  const delBody = await jsonBody(del);
  assertErrorShape(delBody, { rule: 'auth_required' });

  const after = await request.get('/api/plants/pl-snake/reviews');
  expect(after.status()).toBe(200);
  const afterBody = await jsonBody(after);
  if (!isRecord(afterBody)) throw new Error('expected ReviewList');
  expect(afterBody.count).toBe(3);
  expect(reviewIds(afterBody)).toEqual(beforeIds);
});

test('N1 invalid rating and text on pl-fiddle are validation_error', { tag: '@api' }, async ({ request }) => {
  const ava = await loginAva(request);
  const cases: unknown[] = [
    { rating: 0, text: LONG_ENOUGH },
    { rating: 6, text: LONG_ENOUGH },
    { rating: 3.5, text: LONG_ENOUGH },
    { rating: 3, text: 'too short' },
    { rating: 3, text: '' },
    { text: LONG_ENOUGH },
    { rating: 3 },
    { rating: 3, text: 'x'.repeat(501) },
  ];

  for (const data of cases) {
    const response = await request.post('/api/plants/pl-fiddle/reviews', {
      headers: ava,
      data,
    });
    expect(response.status(), `status for ${JSON.stringify(data)}`).toBe(400);
    const body = await jsonBody(response);
    assertErrorShape(body, { rule: 'validation_error' });
  }
});

test('N1 unknown plant reviews GET and POST are 404 without rule', { tag: '@api' }, async ({ request }) => {
  const ava = await loginAva(request);

  const get = await request.get('/api/plants/pl-no-such/reviews');
  expect(get.status()).toBe(404);
  assertErrorShape(await jsonBody(get), { noRule: true });

  const post = await request.post('/api/plants/pl-no-such/reviews', {
    headers: ava,
    data: { rating: 4, text: VALID_TEXT },
  });
  expect(post.status()).toBe(404);
  assertErrorShape(await jsonBody(post), { noRule: true });
});

test('N2 Ben cannot post a second review on pl-snake while his seed review exists', { tag: '@api' }, async ({
  request,
}) => {
  const ben = await loginBen(request);
  const before = await request.get('/api/plants/pl-snake/reviews');
  const beforeBody = await jsonBody(before);
  if (!isRecord(beforeBody)) throw new Error('expected ReviewList');
  expect(beforeBody.count).toBe(3);

  const post = await request.post('/api/plants/pl-snake/reviews', {
    headers: ben,
    data: { rating: 5, text: VALID_TEXT },
  });
  expect(post.status()).toBe(409);
  assertErrorShape(await jsonBody(post), { rule: 'already_reviewed' });

  const after = await request.get('/api/plants/pl-snake/reviews');
  const afterBody = await jsonBody(after);
  if (!isRecord(afterBody)) throw new Error('expected ReviewList');
  expect(afterBody.count).toBe(3);
});

test('M2 Ava posts a review on pl-fiddle and it leads the list', { tag: '@api' }, async ({ request }) => {
  const ava = await loginAva(request);
  const me = await request.get('/api/auth/me', { headers: ava });
  expect(me.status()).toBe(200);
  const meBody = await jsonBody(me);
  if (!isRecord(meBody) || typeof meBody.name !== 'string') {
    throw new Error('GET /api/auth/me did not return name');
  }

  const created = await request.post('/api/plants/pl-fiddle/reviews', {
    headers: ava,
    data: { rating: 4, text: VALID_TEXT },
  });
  expect(created.status()).toBe(201);
  const review = await jsonBody(created);
  await expectSchema(request, review, 'Review');
  if (!isRecord(review)) throw new Error('Review is not an object');
  expect(review.author).toBe(meBody.name);
  expect(review.rating).toBe(4);
  expect(review.text).toBe(VALID_TEXT);
  expect(typeof review.id).toBe('string');
  expect(typeof review.createdAt).toBe('string');
  expect(review).not.toHaveProperty('userId');

  const list = await request.get('/api/plants/pl-fiddle/reviews');
  expect(list.status()).toBe(200);
  const listBody = await jsonBody(list);
  await expectSchema(request, listBody, 'ReviewList');
  if (!isRecord(listBody)) throw new Error('ReviewList is not an object');
  expect(listBody.count).toBe(1);
  expect(listBody.average).toBe(4);
  if (!Array.isArray(listBody.reviews) || !isRecord(listBody.reviews[0])) {
    throw new Error('expected the new review first');
  }
  expect(listBody.reviews[0].id).toBe(review.id);
  expect(listBody.reviews[0].text).toBe(VALID_TEXT);
});

test('M2 text with surrounding spaces is stored trimmed', { tag: '@api' }, async ({ request }) => {
  const ava = await loginAva(request);
  const padded = `  ${VALID_TEXT}  `;
  const created = await request.post('/api/plants/pl-zz/reviews', {
    headers: ava,
    data: { rating: 5, text: padded },
  });
  expect(created.status()).toBe(201);
  const review = await jsonBody(created);
  await expectSchema(request, review, 'Review');
  if (!isRecord(review)) throw new Error('Review is not an object');
  expect(review.text).toBe(VALID_TEXT);
});

test('M3 unknown review id is 404 without rule', { tag: '@api' }, async ({ request }) => {
  const ava = await loginAva(request);
  const response = await request.delete('/api/reviews/rv-no-such', { headers: ava });
  expect(response.status()).toBe(404);
  assertErrorShape(await jsonBody(response), { noRule: true });
});

test('M3 Ben deletes rv-seed-3; list drops it and average becomes 4.5', { tag: '@api' }, async ({
  request,
}) => {
  const ben = await loginBen(request);
  const deleted = await request.delete('/api/reviews/rv-seed-3', { headers: ben });
  expect(deleted.status()).toBe(204);
  expect(await deleted.text()).toBe('');

  const list = await request.get('/api/plants/pl-snake/reviews');
  expect(list.status()).toBe(200);
  const body = await jsonBody(list);
  await expectSchema(request, body, 'ReviewList');
  if (!isRecord(body)) throw new Error('ReviewList is not an object');
  expect(body.count).toBe(2);
  expect(body.average).toBe(4.5);
  const ids = reviewIds(body);
  expect(ids).not.toContain('rv-seed-3');
  expect(ids).toEqual(expect.arrayContaining(['rv-seed-1', 'rv-seed-2']));
  assertNoUserId(body);
});

test('N2 after Ben deletes his seed review he may post again on pl-snake', { tag: '@api' }, async ({
  request,
}) => {
  const ben = await loginBen(request);
  const post = await request.post('/api/plants/pl-snake/reviews', {
    headers: ben,
    data: { rating: 5, text: 'Back again with another look at this plant.' },
  });
  expect(post.status()).toBe(201);
  await expectSchema(request, await jsonBody(post), 'Review');
});

test('N2 Ava may post on pl-snake while Ben still has a review', { tag: '@api' }, async ({ request }) => {
  // Runs after Ben re-posts, before P1 (which may delete others’ reviews when authorship is broken).
  const ava = await loginAva(request);
  const post = await request.post('/api/plants/pl-snake/reviews', {
    headers: ava,
    data: { rating: 4, text: VALID_TEXT },
  });
  expect(post.status()).toBe(201);
  const body = await jsonBody(post);
  await expectSchema(request, body, 'Review');
});

test('P1 Ava cannot delete Ben’s review or a guest review', { tag: '@api' }, async ({ request }) => {
  // After Ben re-posts and Ava also posts; authorship must still refuse non-author deletes.
  const ava = await loginAva(request);
  const list = await request.get('/api/plants/pl-snake/reviews');
  const listBody = await jsonBody(list);
  if (!isRecord(listBody) || !Array.isArray(listBody.reviews)) {
    throw new Error('expected ReviewList');
  }
  const benReview = listBody.reviews.find((item) => isRecord(item) && item.author === 'Ben Moss');
  if (!isRecord(benReview) || typeof benReview.id !== 'string') {
    throw new Error('Ben Moss review missing after re-post');
  }

  const asAva = await request.delete(`/api/reviews/${benReview.id}`, { headers: ava });
  expect.soft(asAva.status(), "Ava deleting Ben's review").toBe(404);
  if (asAva.status() === 404) {
    assertErrorShape(await jsonBody(asAva), { detail: 'Review not found', noRule: true });
  }

  const stillThere = await request.get('/api/plants/pl-snake/reviews');
  expect.soft(reviewIds(await jsonBody(stillThere)), 'Ben review remains').toContain(benReview.id);

  const guest = await request.delete('/api/reviews/rv-seed-1', { headers: ava });
  expect.soft(guest.status(), 'Ava deleting guest rv-seed-1').toBe(404);
  if (guest.status() === 404) {
    assertErrorShape(await jsonBody(guest), { detail: 'Review not found', noRule: true });
  }

  const guestStill = await request.get('/api/plants/pl-snake/reviews');
  expect.soft(reviewIds(await jsonBody(guestStill)), 'guest review remains').toContain('rv-seed-1');
  assertNoUserId(await jsonBody(guestStill));
});

test('SCH1 400/401/409 bodies include detail and rule; 404 has detail and no rule', { tag: '@api' }, async ({
  request,
}) => {
  const ava = await loginAva(request);

  const bad = await request.post('/api/plants/pl-hoya/reviews', {
    headers: ava,
    data: { rating: 0, text: LONG_ENOUGH },
  });
  expect(bad.status()).toBe(400);
  assertErrorShape(await jsonBody(bad), { rule: 'validation_error' });

  const unauth = await request.post('/api/plants/pl-hoya/reviews', {
    data: { rating: 4, text: VALID_TEXT },
  });
  expect(unauth.status()).toBe(401);
  assertErrorShape(await jsonBody(unauth), { rule: 'auth_required' });

  // Ava posted on pl-snake in the previous test.
  const conflict = await request.post('/api/plants/pl-snake/reviews', {
    headers: ava,
    data: { rating: 4, text: VALID_TEXT },
  });
  expect(conflict.status()).toBe(409);
  assertErrorShape(await jsonBody(conflict), { rule: 'already_reviewed' });

  const missing = await request.get('/api/plants/pl-no-such/reviews');
  expect(missing.status()).toBe(404);
  assertErrorShape(await jsonBody(missing), { noRule: true });
});
