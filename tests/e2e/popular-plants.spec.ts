import { expect, test, type APIRequestContext } from '@playwright/test';
import { PlantPage } from '../pages/PlantPage';

/**
 * E1 — plant page Popular right now against the real API.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface PopularItem {
  id: string;
  name: string;
  unitsSold: number;
}

async function popularExcluding(
  request: APIRequestContext,
  plantId: string,
  take = 4,
): Promise<PopularItem[]> {
  const response = await request.get('/api/popular', { params: { limit: 5 } });
  expect(response.status()).toBe(200);
  const body: unknown = await response.json();
  if (!isRecord(body) || !Array.isArray(body.items)) {
    throw new Error('Expected PopularList');
  }
  const items: PopularItem[] = [];
  for (const entry of body.items) {
    if (!isRecord(entry)) continue;
    if (typeof entry.id !== 'string' || typeof entry.name !== 'string') continue;
    if (typeof entry.unitsSold !== 'number') continue;
    if (entry.id === plantId) continue;
    items.push({ id: entry.id, name: entry.name, unitsSold: entry.unitsSold });
  }
  return items.slice(0, take);
}

test('E1 plant page Popular right now matches GET /api/popular excluding the current plant', {
  tag: '@e2e',
}, async ({ page, request }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('fernly_token');
  });

  const expected = await popularExcluding(request, 'pl-aloe');
  expect(expected.length, 'API should leave enough plants after excluding pl-aloe').toBe(4);

  const plant = new PlantPage(page);
  await plant.open('pl-aloe');
  await expect(plant.plantNameHeading).toBeVisible();
  await expect(plant.popularHeading).toBeVisible();
  await expect(plant.popularLinks).toHaveCount(4);

  for (let i = 0; i < expected.length; i += 1) {
    const item = expected[i]!;
    const link = plant.popularLinks.nth(i);
    await expect(link).toHaveText(item.name);
    await expect(link).toHaveAttribute('href', `/plants/${item.id}`);
    await expect(plant.popularSoldText(`${item.unitsSold} sold this month`)).toBeVisible();
  }

  await expect(plant.popularRegion.getByRole('link', { name: 'Chinese Money Plant' })).toHaveCount(0);
});
