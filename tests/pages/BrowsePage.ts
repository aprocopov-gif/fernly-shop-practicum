import type { Locator, Page } from '@playwright/test';

export class BrowsePage {
  readonly sortBy: Locator;
  readonly plantsCountHeading: Locator;
  readonly firstPlantCard: Locator;
  readonly firstPlantCardHeading: Locator;
  readonly firstPlantCardImage: Locator;
  /**
   * F-06: plant card save (heart) has no accessible name — found by role within its card article.
   */
  readonly firstPlantCardHeartButton: Locator;
  readonly searchForm: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;

  constructor(private readonly page: Page) {
    this.sortBy = page.getByLabel('Sort by');
    this.plantsCountHeading = page.getByRole('heading', { level: 2, name: /\d+ plants/ });
    this.firstPlantCard = page.getByRole('article').first();
    this.firstPlantCardHeading = this.firstPlantCard.getByRole('heading', { level: 3 });
    this.firstPlantCardImage = this.firstPlantCard.getByRole('img');
    this.firstPlantCardHeartButton = this.firstPlantCard.getByRole('button');
    this.searchForm = page.getByRole('search');
    this.searchInput = this.searchForm.getByRole('searchbox');
    this.searchButton = this.searchForm.getByRole('button', { name: 'Search', exact: true });
  }

  /** Catalog card for a plant by its display name. */
  plantCardByName(name: string): Locator {
    return this.page.getByRole('article').filter({
      has: this.page.getByRole('heading', { level: 3, name }),
    });
  }

  /** Decorative plant image inside a named catalog card. */
  plantCardImage(name: string): Locator {
    return this.plantCardByName(name).getByRole('img');
  }

  /** Low-stock badge text on a named catalog card (e.g. “Only 3 left”). */
  plantCardStockBadge(name: string, text: string | RegExp): Locator {
    return this.plantCardByName(name).getByText(text);
  }

  /** Out-of-stock overlay on a named catalog card. */
  plantCardOutOfStock(name: string): Locator {
    return this.plantCardByName(name).getByText('Out of stock');
  }

  /** Save (heart) control inside a named catalog card. */
  plantCardSaveButton(name: string): Locator {
    return this.plantCardByName(name).getByRole('button');
  }

  /**
   * Opens the catalog at `/`.
   * @returns This browse page.
   */
  async open(): Promise<BrowsePage> {
    await this.page.goto('/');
    return this;
  }

  /**
   * Sets the sort control (e.g. `price-desc`).
   * @param value Sort option value from the select.
   * @returns This browse page.
   */
  async selectSort(value: string): Promise<BrowsePage> {
    await this.sortBy.selectOption(value);
    return this;
  }

  /**
   * Runs a catalog search from the sidebar.
   * @param query Text to submit in the search form.
   * @returns This browse page.
   */
  async searchPlants(query: string): Promise<BrowsePage> {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    return this;
  }
}
