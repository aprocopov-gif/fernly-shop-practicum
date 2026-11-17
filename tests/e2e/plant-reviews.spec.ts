import { expect, test, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { PlantPage } from '../pages/PlantPage';

/**
 * Plant page reviews with the real API.
 * Expectations from docs/features/plant-reviews.md and the approved test plan.
 * Exact empty-state / thanks strings are Q1–Q2 (assumed — ask); assert presence without pinning those.
 */

const AVA = {
  email: process.env.FERNLY_USER_EMAIL ?? 'ava@fernly.test',
  password: process.env.FERNLY_USER_PASSWORD ?? 'Fernly-Ava-2026',
};

const REVIEW_TEXT = 'Healthy leaves and easy care.';

async function signOut(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('fernly_token');
  });
}

async function signInAsAva(page: Page): Promise<void> {
  const login = new LoginPage(page);
  await login.open();
  await login.signInWith(AVA.email, AVA.password);
  await expect(login.signedInGreeting('Ava')).toBeVisible();
}

test('E1 signed-out pl-snake shows Reviews average, order, and sign-in prompt', { tag: '@e2e' }, async ({
  page,
}) => {
  await signOut(page);
  const plant = new PlantPage(page);
  await plant.open('pl-snake');

  await expect(plant.reviewsHeading).toBeVisible();
  // Documented average is 4.7 (halves up). Soft so author order / sign-in still run if rounding drifts.
  await expect.soft(plant.averageSummary('4.7 out of 5 · 3 reviews')).toBeVisible();
  await expect(plant.writeReviewHeading).toHaveCount(0);

  const section = page.locator('section').filter({ has: plant.reviewsHeading });
  await expect(section.getByText('Ben Moss')).toBeVisible();
  await expect(section.getByText('Omar K.')).toBeVisible();
  await expect(section.getByText('Grace L.')).toBeVisible();

  const body = await section.innerText();
  expect(body.indexOf('Ben Moss')).toBeLessThan(body.indexOf('Omar K.'));
  expect(body.indexOf('Omar K.')).toBeLessThan(body.indexOf('Grace L.'));

  const signIn = plant.signInToReviewLink();
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveAttribute('href', '/login?next=/plants/pl-snake');
  await expect(page.getByText(/to write a review/i)).toBeVisible();
});

test('E1 Ava posts on pl-fiddle, sees thanks and average 4.0 without reload', { tag: '@e2e' }, async ({
  page,
}) => {
  test.setTimeout(60_000);
  await signInAsAva(page);
  const plant = new PlantPage(page);
  await plant.open('pl-fiddle');

  await expect(plant.reviewsHeading).toBeVisible();
  await expect(plant.writeReviewHeading).toBeVisible();
  await plant.writeReview('4 stars', REVIEW_TEXT);

  const thanks = page.getByRole('status').filter({ hasText: /thank/i });
  await expect(thanks).toBeVisible();
  // Soft: list refresh may lag (invalidateQueries key) — still assert documented average.
  await expect.soft(plant.averageSummary(/4\.0 out of 5 · 1 review/)).toBeVisible();
  await expect.soft(page.getByText(REVIEW_TEXT)).toBeVisible();
});

test('E1 Ava second post on pl-fiddle is refused; first review remains once', { tag: '@e2e' }, async ({
  page,
}) => {
  test.setTimeout(60_000);
  await signInAsAva(page);
  const plant = new PlantPage(page);
  await plant.open('pl-fiddle');

  // After a full navigation the list comes from GET; the write form may still show (Q5).
  await expect(page.getByText(REVIEW_TEXT)).toBeVisible();
  await expect(plant.writeReviewHeading).toBeVisible();
  await plant.writeReview('5 stars', 'Another try at reviewing this fiddle leaf fig.');

  await expect
    .soft(page.getByRole('alert').or(page.locator('[aria-live="assertive"]')))
    .toBeVisible();
  await expect(page.getByText(REVIEW_TEXT)).toHaveCount(1);
  await expect(plant.averageSummary(/4\.0 out of 5 · 1 review/)).toBeVisible();
});

test('E1 signed out cannot submit a review form', { tag: '@e2e' }, async ({ page }) => {
  await signOut(page);
  const plant = new PlantPage(page);
  await plant.open('pl-snake');
  await expect(plant.writeReviewHeading).toHaveCount(0);
  await expect(plant.postReviewButton).toHaveCount(0);
});

test('E1 pl-pilea shows an empty invitation without an average line', { tag: '@e2e' }, async ({ page }) => {
  await signOut(page);
  const plant = new PlantPage(page);
  await plant.open('pl-pilea');
  await expect(plant.reviewsHeading).toBeVisible();
  const reviews = page.locator('section').filter({ has: plant.reviewsHeading });
  // Scope to the Reviews section so the plant hero rating cannot match.
  await expect(reviews.getByText(/out of 5/)).toHaveCount(0);
  // Q1 unresolved — do not pin exact empty copy; require invitation-ish text.
  await expect(reviews.getByText(/review/i).first()).toBeVisible();
});

test('E1 star group and Your review are reachable; label is visible', { tag: '@e2e' }, async ({ page }) => {
  test.setTimeout(60_000);
  await signInAsAva(page);
  const plant = new PlantPage(page);
  // Fresh reset per Playwright run; use a plant Ava has not reviewed in the e2e file.
  await plant.open('pl-zz');

  await expect(plant.writeReviewHeading).toBeVisible();
  await expect(plant.yourReview).toBeVisible();
  await expect(page.getByText('Your review', { exact: true })).toBeVisible();
  await expect(plant.ratingGroup).toBeVisible();

  await plant.starRadio('1 star').focus();
  // Keep documented keyboard expectation; a mismatch is a possible finding (same as C3).
  await expect(plant.starRadio('1 star')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(plant.starRadio('2 stars')).toBeFocused();
});
