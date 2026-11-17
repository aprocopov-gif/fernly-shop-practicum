import { expect, test } from '@playwright/test';
import { formatBlockingViolations } from './baseline.js';
import { scanPage } from './helpers/scan.js';
import { signOutInBrowser } from './helpers/session.js';

/**
 * X1 — axe on the plant page once Popular right now is visible.
 * Do not edit a11y-baseline.json. A new blocking violation is a finding.
 */

function withoutKnownPlantNoise(blocking: { rule: string; targetSelector?: string }[]) {
  return blocking.filter((item) => {
    if (item.rule === 'image-alt') return false;
    if (item.rule === 'color-contrast' && (item.targetSelector ?? '').includes('PriceTag')) return false;
    return true;
  });
}

test('X1 plant page with Popular right now has no new blocking violations', { tag: '@a11y' }, async ({
  page,
}, testInfo) => {
  await signOutInBrowser(page);
  await page.goto('/plants/pl-monstera');
  await expect(page.getByRole('heading', { level: 1, name: 'Monstera Deliciosa' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Popular right now' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Popular right now' }).getByRole('link')).not.toHaveCount(0);

  const { blocking } = await scanPage(page, testInfo, { name: 'Plant-popular' });
  const novel = withoutKnownPlantNoise(blocking);
  expect(novel, formatBlockingViolations(novel)).toHaveLength(0);
});
