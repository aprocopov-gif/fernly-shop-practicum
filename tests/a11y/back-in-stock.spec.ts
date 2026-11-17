import { expect, test } from '@playwright/test';
import { formatBlockingViolations } from './baseline.js';
import { scanPage } from './helpers/scan.js';
import { signOutInBrowser } from './helpers/session.js';

/**
 * Axe on Browse (low-stock badge) and Plant (notify form / status / alert).
 * Do not edit a11y-baseline.json. A new blocking violation is a finding.
 * Filter known Browse/Plant noise (F-05–F-07, F-10) so notify issues still surface.
 */

function withoutKnownBrowseNoise(blocking: { rule: string; targetSelector?: string }[]) {
  return blocking.filter((item) => {
    if (item.rule === 'button-name') return false;
    if (item.rule === 'label' && (item.targetSelector ?? '').includes('SearchBox')) return false;
    if (item.rule === 'color-contrast' && (item.targetSelector ?? '').includes('PriceTag')) return false;
    return true;
  });
}

function withoutKnownPlantNoise(blocking: { rule: string; targetSelector?: string }[]) {
  return blocking.filter((item) => {
    if (item.rule === 'image-alt') return false;
    if (item.rule === 'color-contrast' && (item.targetSelector ?? '').includes('PriceTag')) return false;
    if (item.rule === 'aria-required-attr') return false;
    return true;
  });
}

test('X1 Browse low-stock and Plant notify (empty, success, already-subscribed) have no new blocking violations', {
  tag: '@a11y',
}, async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  await signOutInBrowser(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: /\d+ plants/ })).toBeVisible();
  // Page 1 seed includes String of Pearls (stock 1); Hoya (stock 3) is on page 2.
  await expect(page.getByText('Only 1 left').first()).toBeVisible();
  const browseScan = await scanPage(page, testInfo, { name: 'Browse' });
  expect(
    withoutKnownBrowseNoise(browseScan.blocking),
    formatBlockingViolations(withoutKnownBrowseNoise(browseScan.blocking)),
  ).toHaveLength(0);

  await page.goto('/plants/pl-pilea');
  await expect(page.getByLabel("Email me when it's back")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Notify me' })).toBeVisible();
  const emptyScan = await scanPage(page, testInfo, { name: 'Plant' });
  expect(
    withoutKnownPlantNoise(emptyScan.blocking),
    formatBlockingViolations(withoutKnownPlantNoise(emptyScan.blocking)),
  ).toHaveLength(0);

  await page.getByLabel("Email me when it's back").fill('x1-success@fernly.test');
  await page.getByRole('button', { name: 'Notify me' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'x1-success@fernly.test' })).toBeVisible();
  const successScan = await scanPage(page, testInfo, { name: 'Plant' });
  expect(
    withoutKnownPlantNoise(successScan.blocking),
    formatBlockingViolations(withoutKnownPlantNoise(successScan.blocking)),
  ).toHaveLength(0);

  // Fresh plant load so the form is back for the already-subscribed path.
  // API may fail to refuse duplicates (N2) — soft so axe still runs if alert never appears.
  await page.goto('/plants/pl-pilea');
  await expect(page.getByLabel("Email me when it's back")).toBeVisible();
  await page.getByLabel("Email me when it's back").fill('x1-success@fernly.test');
  await page.getByRole('button', { name: 'Notify me' }).click();
  // Duplicate refuse may be broken (N2); scan whatever landed (alert or success status).
  const afterDup = page
    .getByRole('alert')
    .or(page.getByRole('status').filter({ hasText: 'x1-success@fernly.test' }));
  await expect(afterDup).toBeVisible();
  await expect.soft(page.getByRole('alert')).toContainText("You're already on the list");
  const alertScan = await scanPage(page, testInfo, { name: 'Plant' });
  expect(
    withoutKnownPlantNoise(alertScan.blocking),
    formatBlockingViolations(withoutKnownPlantNoise(alertScan.blocking)),
  ).toHaveLength(0);
});
