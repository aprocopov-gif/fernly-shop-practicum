import { expect, test, type Page } from '@playwright/test';
import { BrowsePage } from '../pages/BrowsePage';
import { PlantPage } from '../pages/PlantPage';

/**
 * Browse → out-of-stock plant → notify with the real API.
 * Expectations from docs/features/back-in-stock.md and the approved test plan.
 */

async function signOut(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('fernly_token');
  });
}

test('E1 browse badges, out-of-stock notify, refusals, and keyboard on Notify me', { tag: '@e2e' }, async ({
  page,
}) => {
  test.setTimeout(60_000);
  await signOut(page);

  const browse = new BrowsePage(page);
  await browse.open();
  await expect(browse.plantsCountHeading).toBeVisible();

  await browse.searchPlants('Hoya Carnosa');
  await expect(browse.plantsCountHeading).toBeVisible();
  await expect(browse.plantCardStockBadge('Hoya Carnosa', 'Only 3 left')).toBeVisible();

  await browse.searchPlants('Chinese Money Plant');
  await expect(browse.plantsCountHeading).toBeVisible();
  await expect(browse.plantCardOutOfStock('Chinese Money Plant')).toBeVisible();
  // Soft: StockBadge also renders "Only 0 left" (same defect as C1/U1) — keep asserting, continue the flow.
  await expect.soft(browse.plantCardByName('Chinese Money Plant').getByText('Only 0 left')).toHaveCount(0);

  const plant = new PlantPage(page);
  await plant.open('pl-pilea');
  await expect(plant.plantNameHeading).toContainText('Chinese Money Plant');
  await expect(plant.notifyEmail).toBeVisible();
  await expect(plant.notifyMeButton).toBeVisible();

  await plant.notifyEmail.focus();
  await expect(plant.notifyEmail).toBeFocused();
  await plant.notifyEmail.fill('e2e-ava@fernly.test');
  await plant.notifyMeButton.focus();
  await expect(plant.notifyMeButton).toBeFocused();
  await plant.notifyMeButton.click();
  await expect(plant.notifyConfirmation('e2e-ava@fernly.test')).toBeVisible();

  await plant.open('pl-pothos');
  await expect(plant.plantNameHeading).toContainText('Pothos');
  await expect(plant.notifyEmail).toHaveCount(0);
  await expect(plant.notifyMeButton).toHaveCount(0);

  await plant.open('pl-pilea');
  await plant.notifyWhenBack('a@b');
  await expect(plant.notifyConfirmation('a@b')).toHaveCount(0);
  await expect(plant.notifyAlert().or(plant.notifyEmail)).toBeVisible();

  await plant.notifyWhenBack('e2e-ava@fernly.test');
  await expect(plant.notifyAlert()).toContainText("You're already on the list");
});
