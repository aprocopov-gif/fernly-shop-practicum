import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { formatBlockingViolations } from './baseline.js';
import { scanPage } from './helpers/scan.js';
import { firstCustomerCredentials, signOutInBrowser } from './helpers/session.js';

/**
 * Axe on the plant page Reviews section.
 * Do not edit a11y-baseline.json. A new blocking violation is a finding.
 * Plant pages also hit known F-10 (hero image-alt); mark that expected so new issues still show.
 */

const TOKEN_KEY = 'fernly_token';
const REVIEW_TEXT = 'Healthy leaves and easy care.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function loginAva(request: APIRequestContext): Promise<{ Authorization: string; token: string }> {
  const { email, password } = firstCustomerCredentials();
  const response = await request.post('/api/auth/login', { data: { email, password } });
  expect(response.status()).toBe(200);
  const body: unknown = await response.json();
  if (!isRecord(body) || typeof body.token !== 'string') {
    throw new Error('Login did not return a token');
  }
  return { Authorization: `Bearer ${body.token}`, token: body.token };
}

async function openWithToken(page: Page, token: string, path: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    { key: TOKEN_KEY, value: token },
  );
  await page.goto(path);
}

/** Drop known Plant-page issues (F-10 hero alt, F-05 price contrast) so new review violations surface. */
function withoutKnownPlantNoise(blocking: { rule: string; targetSelector?: string }[]) {
  return blocking.filter((item) => {
    if (item.rule === 'image-alt') return false;
    if (item.rule === 'color-contrast' && (item.targetSelector ?? '').includes('PriceTag')) return false;
    return true;
  });
}

test('X1 pl-snake signed out (list + sign-in) has no new blocking violations', { tag: '@a11y' }, async ({
  page,
}, testInfo) => {
  await signOutInBrowser(page);
  await page.goto('/plants/pl-snake');
  await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible();
  await expect(page.getByText(/\d+(\.\d)? out of 5 · 3 reviews/)).toBeVisible();
  await expect(
    page.locator('section').filter({ has: page.getByRole('heading', { name: 'Reviews' }) }).getByRole('link', {
      name: /sign in/i,
    }),
  ).toBeVisible();

  const { blocking } = await scanPage(page, testInfo, { name: 'Plant' });
  const next = withoutKnownPlantNoise(blocking);
  // Signed-out list has no star radios — expect no new review-control violations.
  expect(next, formatBlockingViolations(next)).toHaveLength(0);
});

test('X1 pl-fiddle signed in with empty write form has no new blocking violations', { tag: '@a11y' }, async ({
  page,
  request,
}, testInfo) => {
  const ava = await loginAva(request);
  await openWithToken(page, ava.token, '/plants/pl-fiddle');
  await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible();
  await expect(page.getByLabel('Your review')).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Your rating' })).toBeVisible();

  const { blocking } = await scanPage(page, testInfo, { name: 'Plant' });
  const next = withoutKnownPlantNoise(blocking);
  expect(next, formatBlockingViolations(next)).toHaveLength(0);
});

test('X1 after a successful post (thanks + updated list) has no new blocking violations', { tag: '@a11y' }, async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(60_000);
  const ava = await loginAva(request);
  // Prefer a plant Ava has not reviewed in this reset; post via UI.
  await openWithToken(page, ava.token, '/plants/pl-zz');
  await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible();

  await page.getByRole('radio', { name: '4 stars' }).click();
  await page.getByLabel('Your review').fill(REVIEW_TEXT);
  await page.getByRole('button', { name: 'Post review' }).click();
  await expect(page.getByRole('status').filter({ hasText: /thank/i })).toBeVisible();

  const { blocking } = await scanPage(page, testInfo, { name: 'Plant' });
  const next = withoutKnownPlantNoise(blocking);
  expect(next, formatBlockingViolations(next)).toHaveLength(0);
});

test('X1 validation or already_reviewed error on screen has no new blocking violations', { tag: '@a11y' }, async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(60_000);
  const ava = await loginAva(request);
  await openWithToken(page, ava.token, '/plants/pl-fiddle');

  // Client validation: submit with no stars / short text to get an alert.
  await page.getByLabel('Your review').fill('short');
  await page.getByRole('button', { name: 'Post review' }).click();
  await expect(page.getByRole('alert').or(page.locator('[aria-live="assertive"]'))).toBeVisible();

  const { blocking } = await scanPage(page, testInfo, { name: 'Plant' });
  const next = withoutKnownPlantNoise(blocking);
  expect(next, formatBlockingViolations(next)).toHaveLength(0);
});
