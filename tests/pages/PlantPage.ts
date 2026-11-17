import type { Locator, Page } from '@playwright/test';

export class PlantPage {
  readonly plantNameHeading: Locator;
  readonly addToCartButton: Locator;
  readonly addedToCartStatus: Locator;
  readonly reviewsHeading: Locator;
  readonly writeReviewHeading: Locator;
  readonly yourReview: Locator;
  readonly postReviewButton: Locator;
  readonly ratingGroup: Locator;
  readonly notifyEmail: Locator;
  readonly notifyMeButton: Locator;

  constructor(private readonly page: Page) {
    this.plantNameHeading = page.getByRole('heading', { level: 1 });
    this.addToCartButton = page.getByRole('button', { name: 'Add to cart' });
    this.addedToCartStatus = page.getByRole('status');
    this.reviewsHeading = page.getByRole('heading', { name: 'Reviews' });
    this.writeReviewHeading = page.getByRole('heading', { name: 'Write a review' });
    this.yourReview = page.getByLabel('Your review');
    this.postReviewButton = page.getByRole('button', { name: 'Post review' });
    this.ratingGroup = page.getByRole('radiogroup', { name: 'Your rating' });
    this.notifyEmail = page.getByLabel("Email me when it's back");
    this.notifyMeButton = page.getByRole('button', { name: 'Notify me' });
  }

  /** Confirmation that a restock email will be sent to this address. */
  notifyConfirmation(email: string): Locator {
    return this.page.getByRole('status').filter({ hasText: email });
  }

  /** API / form refusal for notify (e.g. already subscribed). */
  notifyAlert(): Locator {
    return this.page.getByRole('alert');
  }

  /**
   * Signs up for a restock email without requiring an account.
   * @param email Full address to notify.
   * @returns This plant page.
   */
  async notifyWhenBack(email: string): Promise<PlantPage> {
    await this.notifyEmail.fill(email);
    await this.notifyMeButton.click();
    return this;
  }

  /** Average line in the Reviews section (e.g. “4.7 out of 5 · 3 reviews”). */
  averageSummary(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /** Sign-in link for writing a review (not the header nav). */
  signInToReviewLink(): Locator {
    return this.page
      .locator('section')
      .filter({ has: this.reviewsHeading })
      .getByRole('link', { name: /sign in/i });
  }

  /** Star radio by accessible name (e.g. “4 stars”). */
  starRadio(name: string): Locator {
    return this.ratingGroup.getByRole('radio', { name });
  }

  /**
   * Opens a plant detail page.
   * @param plantId Seed plant id (e.g. `pl-pothos`).
   * @returns This plant page.
   */
  async open(plantId: string): Promise<PlantPage> {
    await this.page.goto(`/plants/${plantId}`);
    return this;
  }

  /**
   * Clicks Add to cart with the current size and quantity.
   * @returns This plant page.
   */
  async addToCart(): Promise<PlantPage> {
    await this.addToCartButton.click();
    return this;
  }

  /**
   * Chooses a star rating and types review text, then posts.
   * @param stars Accessible name of the star radio (e.g. `4 stars`).
   * @param text Review body.
   * @returns This plant page.
   */
  async writeReview(stars: string, text: string): Promise<PlantPage> {
    await this.starRadio(stars).click();
    await this.yourReview.fill(text);
    await this.postReviewButton.click();
    return this;
  }
}
